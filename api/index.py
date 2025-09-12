from fastapi import FastAPI, HTTPException, Query, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from edgar import *
from datetime import datetime, timedelta, timezone
import logging
import os
import asyncio
from functools import lru_cache
from supabase import create_client, Client
from dotenv import load_dotenv
import pickle
from fastapi.security import HTTPBearer

# --- Import from other modules ---
from helpers import _convert_statement_to_dict, _calculate_financial_ratios
from models import FinancialResponse, ComprehensiveFinancialResponse, ComparisonResponse, CompanyMetrics

# --- Load Environment Variables ---
load_dotenv()

# --- Basic Setup ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
set_identity("Findexus Financial App contact@findexus.com")

app = FastAPI(title="Financial Statements API", version="1.0.0")

# --- Supabase Setup ---
url: str | None = os.environ.get("SUPABASE_URL")
key: str | None = os.environ.get("SUPABASE_KEY")

if not url or not key:
    logger.warning("Supabase URL or Key not found. Caching will be disabled.")
    supabase: Client | None = None
else:
    supabase: Client = create_client(url, key)
    logger.info("Successfully connected to Supabase.")

# --- CORS Middleware ---
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
origins = [FRONTEND_URL, "https://findexus.vercel.app"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
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
@app.get("/api/financial/{ticker}/income", response_model=FinancialResponse)
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

@app.get("/api/financial/{ticker}/balance", response_model=FinancialResponse)  
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

@app.get("/api/financial/{ticker}/cashflow", response_model=FinancialResponse)
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

@app.get("/api/financial/{ticker}/comprehensive", response_model=ComprehensiveFinancialResponse)
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

@app.post("/api/financials/compare", response_model=ComparisonResponse)
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