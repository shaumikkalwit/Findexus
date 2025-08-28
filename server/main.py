from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import pandas as pd
from edgar import *
from datetime import datetime
import logging
import asyncio
import os
from datetime import datetime, timedelta, timezone
from supabase import create_client, Client
from dotenv import load_dotenv

# This line reads the SUPABASE_URL and SUPABASE_KEY from your .env file.
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
set_identity("shaumik.kalwit@gmail.com")

app = FastAPI(title="Financial Statements API", version="1.0.0")

# Load Supabase credentials from environment variables for security.
url: Optional[str] = os.environ.get("SUPABASE_URL")
key: Optional[str] = os.environ.get("SUPABASE_KEY")

if not url or not key:
    logger.warning("Supabase URL or Key not found. Caching will be disabled.")
    supabase: Optional[Client] = None
else:
    supabase: Client = create_client(url, key)
    logger.info("Successfully connected to Supabase.")

# Add this CORS middleware section
origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, # Allows info from origins listed
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods (GET, POST, etc.)
    allow_headers=["*"], # Allows all headers
)


# --- Define JSON responses my APIs send out ---
# 1. Ensure that returned data from endpoint matches the structure
# 2. Convert Python data from dictionaries/lists to a JSON format

class FinancialResponse(BaseModel):
    """Defines the response structure for an endpoint returning a single financial statement"""
    company_info: Dict[str, Any]
    periods: List[str]
    data: Dict[str, Any]
    metadata: Dict[str, Any]
 
class ComprehensiveFinancialResponse(BaseModel):
    """Defines the response for the comprehensive endpoint, including all statements and metrics"""
    company_info: Dict[str, Any]
    periods: List[str]
    income_statement: Dict[str, Any]
    balance_sheet: Dict[str, Any]
    cash_flow: Dict[str, Any]
    key_metrics: Dict[str, Any]
    metadata: Dict[str, Any]
    
class CompanyMetrics(BaseModel):
    """A nested model defining the structure for one company's data within a comparison"""
    ticker: str
    name: str
    metrics: Dict[str, Dict[str, float | None]]
    
class ComparisonResponse(BaseModel):
    """Defines the response structure for the company comparison endpoint"""
    periods: List[str]
    data: List[CompanyMetrics] # A list where each item follows the CompanyMetrics structure

@lru_cache(maxsize=128)
def get_company_financials_sync(ticker: str, periods: int):
    """
    Synchronous function to fetch all financial statements for a company.
    This is now only called when the cache is missed.
    """
    logger.info(f"CACHE MISS: Fetching fresh data for {ticker} from EDGAR API...")
    try:
        company = Company(ticker)
        if not company.facts:
            return None

        income_stmt = company.income_statement(periods=periods, annual=True, concise_format=True)
        balance_sheet = company.balance_sheet(periods=periods, annual=True, concise_format=True)
        cash_flow = company.cash_flow(periods=periods, annual=True, concise_format=True)
        
        # Convert statement objects to dictionaries for JSON serialization
        return {
            "company_info": {'name': company.name, 'ticker': ticker, 'shares_outstanding': company.shares_outstanding, 'public_float': company.public_float},
            "income_statement": _convert_statement_to_dict(income_stmt),
            "balance_sheet": _convert_statement_to_dict(balance_sheet),
            "cash_flow": _convert_statement_to_dict(cash_flow)
        }
    except Exception as e:
        logger.error(f"Failed to fetch data for {ticker} from EDGAR: {e}")
        return None

async def get_company_financial_data(ticker: str, periods: int):
    """
    Main data fetching function with Supabase caching logic.
    """
    ticker = ticker.upper()
    
    if supabase:
        # 1. Check the database for a cached entry.
        response = supabase.table('financial_data_cache').select('*').eq('ticker', ticker).execute()
        
        if response.data:
            cached_data = response.data[0]
            last_updated_str = cached_data['last_updated']
            # Ensure the timestamp is timezone-aware for correct comparison
            last_updated = datetime.fromisoformat(last_updated_str).astimezone(timezone.utc)
            
            # 2. Check if the cached data is less than 30 days old.
            if datetime.now(timezone.utc) - last_updated < timedelta(days=30):
                logger.info(f"CACHE HIT: Returning cached data for {ticker}.")
                return cached_data['financial_data']

    # 3. If no cache or data is stale, fetch fresh data.
    loop = asyncio.get_event_loop()
    fresh_data = await loop.run_in_executor(None, get_company_financials_sync, ticker, periods)
    
    if not fresh_data:
        raise HTTPException(status_code=404, detail=f"No financial data available for {ticker}")

    if supabase:
        # 4. Save the fresh data to the Supabase cache.
        # 'upsert' will insert a new row or update an existing one.
        supabase.table('financial_data_cache').upsert({
            'ticker': ticker,
            'financial_data': fresh_data,
            'last_updated': datetime.now().isoformat()
        }).execute()
        logger.info(f"CACHE WRITE: Saved fresh data for {ticker} to Supabase.")

    return fresh_data

# --- Helper to reconstruct statement objects from cached data ---
def _reconstruct_statement(data: Dict[str, Any], periods: List[str]):
    """Helper to reconstruct a statement-like object from cached dictionary data."""
    if not data: return None
    from types import SimpleNamespace
    stmt = SimpleNamespace(periods=periods)
    items = []
    for concept, item_data in data.items():
        if 'values' in item_data and isinstance(item_data['values'], dict):
            values = {p: v['raw_value'] for p, v in item_data['values'].items() if 'raw_value' in v}
            item = SimpleNamespace(label=item_data['label'], concept=concept, values=values)
            items.append(item)
    
    def iter_with_values():
        yield from items
    stmt.iter_with_values = iter_with_values
    return stmt

# All endpoints use the central get_company_financial_data function.
@app.get("/financial/{ticker}/income", response_model=FinancialResponse)
async def get_income_statement(
    ticker: str,
    years: int = Query(20, description="Number of periods", ge=5, le=20),
):
    company_data = await get_company_financial_data(ticker, years)
    stmt_dict = company_data.get("income_statement", {})
    if not stmt_dict:
        raise HTTPException(status_code=404, detail=f"No income statement data for {ticker}")
    
    periods = list(next(iter(stmt_dict.values()))['values'].keys())
    return FinancialResponse(
        company_info=company_data['company_info'],
        periods=periods,
        data=stmt_dict,
        metadata={'period_type': 'annual', 'concise_format': True}
    )

@app.get("/financial/{ticker}/balance", response_model=FinancialResponse)  
async def get_balance_sheet(
    ticker: str,
    years: int = Query(20, description="Number of periods", ge=5, le=20),
):
    company_data = await get_company_financial_data(ticker, years)
    stmt_dict = company_data.get("balance_sheet", {})
    if not stmt_dict:
        raise HTTPException(status_code=404, detail=f"No balance sheet data for {ticker}")
        
    periods = list(next(iter(stmt_dict.values()))['values'].keys())
    return FinancialResponse(
        company_info=company_data['company_info'],
        periods=periods,
        data=stmt_dict,
        metadata={'period_type': 'annual', 'concise_format': True}
    )

@app.get("/financial/{ticker}/cashflow", response_model=FinancialResponse)
async def get_cash_flow(
    ticker: str,
    years: int = Query(20, description="Number of years", ge=5, le=20),
):
    company_data = await get_company_financial_data(ticker, years)
    stmt_dict = company_data.get("cash_flow", {})
    if not stmt_dict:
        raise HTTPException(status_code=404, detail=f"No cash flow data for {ticker}")
        
    periods = list(next(iter(stmt_dict.values()))['values'].keys())
    return FinancialResponse(
        company_info=company_data['company_info'],
        periods=periods,
        data=stmt_dict,
        metadata={'period_type': 'annual', 'concise_format': True}
    )

@app.get("/financial/{ticker}/comprehensive", response_model=ComprehensiveFinancialResponse)
async def get_comprehensive_financials(
    ticker: str,
    periods: int = Query(10, description="Number of periods", ge=1, le=20),
):
    company_data = await get_company_financial_data(ticker, periods)
    
    income_stmt_dict = company_data.get("income_statement", {})
    balance_sheet_dict = company_data.get("balance_sheet", {})
    cash_flow_dict = company_data.get("cash_flow", {})

    if not income_stmt_dict:
        raise HTTPException(status_code=404, detail=f"No financial statement data available for {ticker}")

    try:
        available_periods = list(next(iter(income_stmt_dict.values()))['values'].keys())
    except (StopIteration, KeyError):
        available_periods = []

    income_stmt = _reconstruct_statement(income_stmt_dict, available_periods)
    balance_sheet = _reconstruct_statement(balance_sheet_dict, available_periods)
    cash_flow = _reconstruct_statement(cash_flow_dict, available_periods)

    key_metrics = _calculate_financial_ratios(income_stmt, balance_sheet, cash_flow)

    return ComprehensiveFinancialResponse(
        company_info=company_data['company_info'],
        periods=available_periods,
        income_statement=income_stmt_dict,
        balance_sheet=balance_sheet_dict,
        cash_flow=cash_flow_dict,
        key_metrics=key_metrics,
        metadata={'period_type': 'annual', 'concise_format': True}
    )

@app.post("/financials/compare", response_model=ComparisonResponse)
async def compare_companies_ratios(
    tickers: List[str],
    periods: int = Query(10, description="Number of periods", ge=1, le=20)
):
    """Compare financial ratios across multiple companies."""
    tasks = [get_company_financial_data(ticker, periods) for ticker in tickers]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    comparison_data = []
    all_periods = set()

    for result in results:
        if isinstance(result, Exception):
            logger.error(f"Failed to fetch data for a company during comparison: {result}")
            continue
        
        company_data = result
        income_stmt_dict = company_data.get("income_statement", {})
        if not income_stmt_dict: continue

        try:
            available_periods = list(next(iter(income_stmt_dict.values()))['values'].keys())
            for p in available_periods: all_periods.add(p)

            income_stmt = _reconstruct_statement(income_stmt_dict, available_periods)
            balance_sheet = _reconstruct_statement(company_data.get("balance_sheet", {}), available_periods)
            cash_flow = _reconstruct_statement(company_data.get("cash_flow", {}), available_periods)

            metrics = _calculate_financial_ratios(income_stmt, balance_sheet, cash_flow)
            
            comparison_data.append(CompanyMetrics(
                ticker=company_data['company_info']['ticker'],
                name=company_data['company_info']['name'],
                metrics=metrics
            ))
        except (StopIteration, KeyError):
            logger.error(f"Could not process periods for ticker {company_data['company_info']['ticker']}")
            continue

    if not comparison_data:
        raise HTTPException(status_code=404, detail="Could not retrieve data for any of the provided tickers.")

    sorted_periods = sorted(list(all_periods), reverse=True)
    
    for company_metrics in comparison_data:
        for metric_values in company_metrics.metrics.values():
            for period in sorted_periods:
                if period not in metric_values:
                    metric_values[period] = None

    return ComparisonResponse(periods=sorted_periods, data=comparison_data)

# --- Helper Functions ---

def _convert_statement_to_dict(stmt):
    """Convert statement to API-friendly dictionary format"""
    if not stmt: return {}
    data = {}
    for item in stmt.iter_with_values():
        item_data = {
            'label': item.label,
            'concept': item.concept,
            'values': {},
            'is_total': getattr(item, 'is_total', False),
            'depth': getattr(item, 'depth', 0)
        }
        for period in stmt.periods:
            value = item.values.get(period)
            if value is not None:
                item_data['values'][period] = {'raw_value': value, 'display_value': item.get_display_value(period)}
        data[item.concept] = item_data
    return data

def _reconstruct_statement(data: Dict[str, Any], periods: List[str]):
    """Helper to reconstruct a statement-like object from cached dictionary data."""
    if not data: return None
    # This is a simplified reconstruction for the purpose of ratio calculation.
    # We create a mock object that has the necessary attributes.
    from types import SimpleNamespace
    stmt = SimpleNamespace(periods=periods)
    items = []
    for concept, item_data in data.items():
        # Ensure 'values' key exists and is a dictionary before proceeding
        if 'values' in item_data and isinstance(item_data['values'], dict):
            values = {p: v['raw_value'] for p, v in item_data['values'].items() if 'raw_value' in v}
            item = SimpleNamespace(label=item_data['label'], concept=concept, values=values)
            items.append(item)
    
    # Add a simple iterator to mimic the original statement object's behavior
    def iter_with_values():
        yield from items
    stmt.iter_with_values = iter_with_values
    return stmt

def _find_item_contains(statement, keyword):
    if not statement: return None
    for item in statement.iter_with_values():
        if keyword.lower() in item.label.lower():
            return item
    return None

def _calculate_financial_ratios(income_stmt, balance_sheet, cash_flow):
    ratios = {
        "Net Income": {}, "Retained Earnings": {}, "Gross Margin": {},
        "Net Margin": {}, "Return on Equity (ROE)": {}, "Years to Pay Off Debt": {},
        "Capex to Net Income": {}
    }
    try:
        revenue_item = _find_item_contains(income_stmt, 'Revenue')
        gross_profit_item = _find_item_contains(income_stmt, 'Gross Profit')
        net_income_item = _find_item_contains(income_stmt, 'Net Income')
        equity_item = _find_item_contains(balance_sheet, 'Equity')
        long_term_debt_item = _find_item_contains(balance_sheet, 'Long-Term Debt')
        retained_earnings_item = _find_item_contains(balance_sheet, 'Retained Earnings')
        capex_item = _find_item_contains(cash_flow, 'property, plant, and equipment')

        for i, period in enumerate(income_stmt.periods):
            revenue = revenue_item.values.get(period) if revenue_item else None
            gross_profit = gross_profit_item.values.get(period) if gross_profit_item else None
            net_income = net_income_item.values.get(period) if net_income_item else None
            total_equity = equity_item.values.get(period) if equity_item else None
            long_term_debt = long_term_debt_item.values.get(period) if long_term_debt_item else 0
            retained_earnings = retained_earnings_item.values.get(period) if retained_earnings_item else None
            capex = capex_item.values.get(period) if capex_item else None

            if net_income is not None: ratios["Net Income"][period] = net_income
            if retained_earnings is not None: ratios["Retained Earnings"][period] = retained_earnings
            if revenue and gross_profit and revenue != 0: ratios["Gross Margin"][period] = gross_profit / revenue
            if revenue and net_income and revenue != 0: ratios["Net Margin"][period] = net_income / revenue
            if net_income and total_equity and total_equity != 0: ratios["Return on Equity (ROE)"][period] = net_income / total_equity
            if net_income and net_income != 0: ratios["Years to Pay Off Debt"][period] = long_term_debt / net_income
            if net_income and capex and net_income != 0: ratios["Capex to Net Income"][period] = abs(capex) / net_income

            # Calculate YoY growth for each metric
            if i < len(income_stmt.periods) - 1:
                prev_period = income_stmt.periods[i+1]
                for metric, values in ratios.items():
                    current_value = values.get(period)
                    prev_value = values.get(prev_period)
                    if current_value is not None and prev_value is not None and prev_value != 0:
                        growth = (current_value - prev_value) / abs(prev_value)
                        if f"{metric} YoY Growth" not in ratios:
                            ratios[f"{metric} YoY Growth"] = {}
                        ratios[f"{metric} YoY Growth"][period] = growth

    except Exception as e:
        logger.error(f"Error calculating ratios: {e}", exc_info=True)
    return {k: v for k, v in ratios.items() if v}