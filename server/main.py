from fastapi import FastAPI, HTTPException, Query, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from edgar import *
from datetime import datetime, timedelta, timezone
import logging
import os
import asyncio
from functools import lru_cache
from supabase import create_client, Client
from dotenv import load_dotenv
import pickle
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# --- Load Environment Variables ---
load_dotenv()

# --- Basic Setup ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
set_identity("Findexus Financial App contact@findexus.com")

app = FastAPI(title="Financial Statements API", version="1.0.0")

# --- Supabase Setup ---
url: Optional[str] = os.environ.get("SUPABASE_URL")
key: Optional[str] = os.environ.get("SUPABASE_KEY")

if not url or not key:
    logger.warning("Supabase URL or Key not found. Caching will be disabled.")
    supabase: Optional[Client] = None
else:
    supabase: Client = create_client(url, key)
    logger.info("Successfully connected to Supabase.")

# --- CORS Middleware ---
origins = [
    "http://localhost:3000",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

token_auth_scheme = HTTPBearer()

async def get_current_user(request: Request):
    """
    Dependency to validate the user's Supabase JWT.
    Creates a fresh Supabase client for each request to avoid race conditions.
    """
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        # Create a new, isolated Supabase client for this single authentication check
        auth_supabase: Client = create_client(url, key)
        user_response = auth_supabase.auth.get_user(token)
        return user_response.user
    except Exception as e:
        logger.error(f"Authentication failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid credentials")

# --- Pydantic Response Models ---
class FinancialResponse(BaseModel):
    company_info: Dict[str, Any]
    periods: List[str]
    data: Dict[str, Any]
    metadata: Dict[str, Any]

class ComprehensiveFinancialResponse(BaseModel):
    company_info: Dict[str, Any]
    periods: List[str]
    income_statement: Dict[str, Any]
    balance_sheet: Dict[str, Any]
    cash_flow: Dict[str, Any]
    key_metrics: Dict[str, Any]
    metadata: Dict[str, Any]
    
class CompanyMetrics(BaseModel):
    ticker: str
    name: str
    metrics: Dict[str, Dict[str, float | None]]
    
class ComparisonResponse(BaseModel):
    periods: List[str]
    data: List[CompanyMetrics]

# --- Helper Functions ---

def _convert_statement_to_dict(stmt):
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
    if not income_stmt or not hasattr(income_stmt, 'periods'): return {}
    try:
        revenue_item = _find_item_contains(income_stmt, 'Revenue')
        gross_profit_item = _find_item_contains(income_stmt, 'Gross Profit')
        net_income_item = _find_item_contains(income_stmt, 'Net Income')
        equity_item = _find_item_contains(balance_sheet, 'Equity')
        long_term_debt_item = _find_item_contains(balance_sheet, 'Long-Term Debt')
        retained_earnings_item = _find_item_contains(balance_sheet, 'Retained Earnings')
        capex_item = _find_item_contains(cash_flow, 'property, plant, and equipment')

        for period in income_stmt.periods:
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
    except Exception as e:
        logger.error(f"Error calculating ratios: {e}", exc_info=True)
    return {k: v for k, v in ratios.items() if v}

# --- Core Data Fetching and Caching Logic ---

@lru_cache(maxsize=128)
def get_company_financials_sync(ticker: str):
    """
    Synchronous function to fetch all available financial statements (up to 20 years).
    This is the only function that communicates with the EDGAR API.
    """
    logger.info(f"CACHE MISS: Fetching fresh data for {ticker} from EDGAR API...")
    try:
        company = Company(ticker)
        if not company.facts: return None

        income_stmt = company.income_statement(periods=20, annual=True, concise_format=True)
        balance_sheet = company.balance_sheet(periods=20, annual=True, concise_format=True)
        cash_flow = company.cash_flow(periods=20, annual=True, concise_format=True)
        
        if not income_stmt or not income_stmt.periods: return None

        # Return the raw objects along with company info
        return {
            "company_info": {'name': company.name, 'ticker': ticker, 'shares_outstanding': company.shares_outstanding, 'public_float': company.public_float},
            "income_statement": income_stmt,
            "balance_sheet": balance_sheet,
            "cash_flow": cash_flow
        }
    except Exception as e:
        logger.error(f"Failed to fetch data for {ticker} from EDGAR: {e}")
        return None

async def get_company_financial_data(ticker: str):
    """
    Main data fetching function with Supabase caching.
    It now caches the pickled raw objects.
    """
    ticker = ticker.upper()
    
    if supabase:
        response = supabase.table('financial_data_cache').select('financial_data, last_updated').eq('ticker', ticker).execute()
        if response.data:
            cached_data = response.data[0]
            last_updated = datetime.fromisoformat(cached_data['last_updated']).astimezone(timezone.utc)
            if datetime.now(timezone.utc) - last_updated < timedelta(days=180):
                logger.info(f"CACHE HIT: Returning cached data for {ticker}.")
                # Unpickle the data from the database
                return pickle.loads(bytes.fromhex(cached_data['financial_data']))

    loop = asyncio.get_event_loop()
    full_data = await loop.run_in_executor(None, get_company_financials_sync, ticker)
    
    if not full_data:
        raise HTTPException(status_code=404, detail=f"No financial data available for {ticker}")

    if supabase:
        # Pickle the raw objects and store them as a hex string
        pickled_data = pickle.dumps(full_data).hex()
        supabase.table('financial_data_cache').upsert({
            'ticker': ticker,
            'financial_data': pickled_data,
            'last_updated': datetime.now().isoformat()
        }).execute()
        logger.info(f"CACHE WRITE: Saved fresh data for {ticker} to Supabase.")

    return full_data

# --- API Endpoints ---

@app.get("/financial/{ticker}/income", response_model=FinancialResponse)
async def get_income_statement(
    ticker: str,
    years: int = Query(20, description="Number of periods", ge=1, le=20),
    user: dict = Depends(get_current_user)
):
    company_data = await get_company_financial_data(ticker)
    stmt = company_data['income_statement']
    stmt.periods = sorted(stmt.periods, reverse=True)[:years]
    
    return FinancialResponse(
        company_info=company_data['company_info'],
        periods=stmt.periods,
        data=_convert_statement_to_dict(stmt),
        metadata={'period_type': 'annual', 'concise_format': True}
    )

@app.get("/financial/{ticker}/balance", response_model=FinancialResponse)  
async def get_balance_sheet(
    ticker: str,
    years: int = Query(20, description="Number of periods", ge=1, le=20),
    user: dict = Depends(get_current_user)
):
    company_data = await get_company_financial_data(ticker)
    stmt = company_data['balance_sheet']
    stmt.periods = sorted(stmt.periods, reverse=True)[:years]
    
    return FinancialResponse(
        company_info=company_data['company_info'],
        periods=stmt.periods,
        data=_convert_statement_to_dict(stmt),
        metadata={'period_type': 'annual', 'concise_format': True}
    )

@app.get("/financial/{ticker}/cashflow", response_model=FinancialResponse)
async def get_cash_flow(
    ticker: str,
    years: int = Query(20, description="Number of years", ge=1, le=20),
    user: dict = Depends(get_current_user)
):
    company_data = await get_company_financial_data(ticker)
    stmt = company_data['cash_flow']
    stmt.periods = sorted(stmt.periods, reverse=True)[:years]
    
    return FinancialResponse(
        company_info=company_data['company_info'],
        periods=stmt.periods,
        data=_convert_statement_to_dict(stmt),
        metadata={'period_type': 'annual', 'concise_format': True}
    )

@app.get("/financial/{ticker}/comprehensive", response_model=ComprehensiveFinancialResponse)
async def get_comprehensive_financials(
    ticker: str,
    periods: int = Query(10, description="Number of periods", ge=1, le=20),
    user: dict = Depends(get_current_user)
):
    company_data = await get_company_financial_data(ticker)
    
    income_stmt = company_data['income_statement']
    balance_sheet = company_data['balance_sheet']
    cash_flow = company_data['cash_flow']
    
    # Trim the periods for this specific request
    periods_to_keep = sorted(income_stmt.periods, reverse=True)[:periods]
    income_stmt.periods = periods_to_keep
    balance_sheet.periods = periods_to_keep
    cash_flow.periods = periods_to_keep
    
    key_metrics = _calculate_financial_ratios(income_stmt, balance_sheet, cash_flow)

    return ComprehensiveFinancialResponse(
        company_info=company_data['company_info'],
        periods=periods_to_keep,
        income_statement=_convert_statement_to_dict(income_stmt),
        balance_sheet=_convert_statement_to_dict(balance_sheet),
        cash_flow=_convert_statement_to_dict(cash_flow),
        key_metrics=key_metrics,
        metadata={'period_type': 'annual', 'concise_format': True}
    )

@app.post("/financials/compare", response_model=ComparisonResponse)
async def compare_companies_ratios(
    tickers: List[str],
    periods: int = Query(10, description="Number of periods", ge=1, le=20),
    user: dict = Depends(get_current_user)
):
    tasks = [get_company_financial_data(ticker) for ticker in tickers]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    comparison_data = []
    all_periods = set()

    for result in results:
        if isinstance(result, Exception):
            logger.error(f"Failed to fetch data for a company during comparison: {result}")
            continue
        
        company_data = result
        
        income_stmt = company_data['income_statement']
        balance_sheet = company_data['balance_sheet']
        cash_flow = company_data['cash_flow']
        
        periods_to_keep = sorted(income_stmt.periods, reverse=True)[:periods]
        for p in periods_to_keep: all_periods.add(p)

        income_stmt.periods = periods_to_keep
        balance_sheet.periods = periods_to_keep
        cash_flow.periods = periods_to_keep

        metrics = _calculate_financial_ratios(income_stmt, balance_sheet, cash_flow)
        
        comparison_data.append(CompanyMetrics(
            ticker=company_data['company_info']['ticker'],
            name=company_data['company_info']['name'],
            metrics=metrics
        ))

    if not comparison_data:
        raise HTTPException(status_code=404, detail="Could not retrieve data for any of the provided tickers.")

    final_periods = sorted(list(all_periods), reverse=True)

    # Final trim of metrics to ensure consistency
    for company_metrics in comparison_data:
        for metric_name, metric_values in company_metrics.metrics.items():
            company_metrics.metrics[metric_name] = {p: metric_values.get(p) for p in final_periods}

    return ComparisonResponse(periods=final_periods, data=comparison_data)
