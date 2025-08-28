from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import pandas as pd
from edgar import *
from datetime import datetime
import logging
import asyncio

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
set_identity("shaumik.kalwit@gmail.com")

app = FastAPI(title="Financial Statements API", version="1.0.0")

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

# --- Existing Endpoints ---
@lru_cache(maxsize=128)
def get_company_financials_sync(ticker: str, periods: int):
    """
    Synchronous, cached function to fetch all financial statements for a company
    This is the single point of contact with the EDGAR API
    """
    logger.info(f"Fetching fresh data for {ticker} from EDGAR API...")
    try:
        company = Company(ticker)
        if not company.facts:
            return None # Return None if company data is not found

        income_stmt = company.income_statement(periods=periods, annual=True, concise_format=True)
        balance_sheet = company.balance_sheet(periods=periods, annual=True, concise_format=True)
        cash_flow = company.cash_flow(periods=periods, annual=True, concise_format=True)
        
        return {
            "company_info": {'name': company.name, 'ticker': ticker, 'shares_outstanding': company.shares_outstanding, 'public_float': company.public_float},
            "income_statement": income_stmt,
            "balance_sheet": balance_sheet,
            "cash_flow": cash_flow
        }
    except Exception as e:
        logger.error(f"Failed to fetch data for {ticker} from EDGAR: {e}")
        return None

async def get_company_financial_data(ticker: str, periods: int):
    """
    Asynchronous wrapper that runs the synchronous, cached fetching function
    in a separate thread to avoid blocking the server.
    """
    loop = asyncio.get_event_loop()
    # Run the synchronous, blocking function in a thread pool.
    data = await loop.run_in_executor(None, get_company_financials_sync, ticker.upper(), periods)
    if not data:
        raise HTTPException(status_code=404, detail=f"No financial data available for {ticker}")
    return data

# All endpoints use the central get_company_financial_data function.
@app.get("/financial/{ticker}/income", response_model=FinancialResponse)
async def get_income_statement(
    ticker: str,
    years: int = Query(20, description="Number of periods", ge=5, le=20),
):
    """Get income statement data for multiple periods"""
    company_data = await get_company_financial_data(ticker, years)
    stmt = company_data["income_statement"]
    if not stmt:
        raise HTTPException(status_code=404, detail=f"No income statement data for {ticker}")
    
    return FinancialResponse(
        company_info=company_data['company_info'],
        periods=stmt.periods,
        data=_convert_statement_to_dict(stmt),
        metadata={'period_type': True, 'concise_format': True}
    )

@app.get("/financial/{ticker}/balance", response_model=FinancialResponse)  
async def get_balance_sheet(
    ticker: str,
    years: int = Query(20, description="Number of periods", ge=5, le=20),
):
    """Get balance sheet data for multiple periods"""
    company_data = await get_company_financial_data(ticker, years)
    stmt = company_data["balance_sheet"]
    if not stmt:
        raise HTTPException(status_code=404, detail=f"No balance sheet data for {ticker}")
        
    return FinancialResponse(
        company_info=company_data['company_info'],
        periods=stmt.periods,
        data=_convert_statement_to_dict(stmt),
        metadata={'period_type': True, 'concise_format': True}
    )

@app.get("/financial/{ticker}/cashflow", response_model=FinancialResponse)
async def get_cash_flow(
    ticker: str,
    years: int = Query(20, description="Number of years", ge=5, le=20),
):
    """Get cash flow statement data for multiple years"""
    company_data = await get_company_financial_data(ticker, years)
    stmt = company_data["cash_flow"]
    if not stmt:
        raise HTTPException(status_code=404, detail=f"No cash flow data for {ticker}")
        
    return FinancialResponse(
        company_info=company_data['company_info'],
        periods=stmt.periods,
        data=_convert_statement_to_dict(stmt),
        metadata={'period_type': True, 'concise_format': True}
    )

@app.get("/financial/{ticker}/comprehensive", response_model=ComprehensiveFinancialResponse)
async def get_comprehensive_financials(
    ticker: str,
    periods: int = Query(10, description="Number of periods", ge=1, le=20),
):
    """Get comprehensive financial data including all statements and key metrics"""
    company_data = await get_company_financial_data(ticker, periods)
    
    income_stmt = company_data["income_statement"]
    balance_sheet = company_data["balance_sheet"]
    cash_flow = company_data["cash_flow"]

    if not income_stmt or not income_stmt.periods:
        raise HTTPException(status_code=404, detail=f"No financial statement data available for {ticker}")

    key_metrics = _calculate_financial_ratios(income_stmt, balance_sheet, cash_flow)

    return ComprehensiveFinancialResponse(
        company_info=company_data['company_info'],
        periods=income_stmt.periods,
        income_statement=_convert_statement_to_dict(income_stmt),
        balance_sheet=_convert_statement_to_dict(balance_sheet),
        cash_flow=_convert_statement_to_dict(cash_flow),
        key_metrics=key_metrics,
        metadata={'period_type': 'annual', 'concise_format': True}
    )

@app.post("/financials/compare", response_model=ComparisonResponse)
async def compare_companies_ratios(
    tickers: List[str],
    periods: int = Query(10, description="Number of periods", ge=1, le=20)
):
    """Compare financial ratios across multiple companies."""
    comparison_data = []
    all_periods = set()
    
    # Use asyncio.gather to fetch data for all companies concurrently.
    tasks = [get_company_financial_data(ticker, periods) for ticker in tickers]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    for result in results:
        if isinstance(result, Exception):
            # Log the error but continue, so one failed ticker doesn't break the whole comparison.
            logger.error(f"Failed to fetch data for a company during comparison: {result}")
            continue
        
        company_data = result
        income_stmt = company_data["income_statement"]
        balance_sheet = company_data["balance_sheet"]
        cash_flow = company_data["cash_flow"]

        if not income_stmt: continue
        
        for p in income_stmt.periods: all_periods.add(p)

        metrics = _calculate_financial_ratios(income_stmt, balance_sheet, cash_flow)
        
        comparison_data.append(CompanyMetrics(
            ticker=company_data['company_info']['ticker'],
            name=company_data['company_info']['name'],
            metrics=metrics
        ))

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