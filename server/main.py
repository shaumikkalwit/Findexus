from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import pandas as pd
from edgar import *
from datetime import datetime
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
set_identity("shaumik.kalwit@gmail.com")

app = FastAPI(title="Financial Statements API", version="1.0.0")

# Add this CORS middleware section
origins = [
    "http://localhost:3000", # The origin of your Next.js app
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods (GET, POST, etc.)
    allow_headers=["*"], # Allows all headers
)

class FinancialResponse(BaseModel):
    company_info: Dict[str, Any]
    periods: List[str]
    data: Dict[str, Any]
    metadata: Dict[str, Any]

# --- NEW: Comprehensive Response Model ---
class ComprehensiveFinancialResponse(BaseModel):
    company_info: Dict[str, Any]
    periods: List[str]
    income_statement: Dict[str, Any]
    balance_sheet: Dict[str, Any]
    cash_flow: Dict[str, Any]
    key_metrics: Dict[str, Any]
    metadata: Dict[str, Any]

# --- Existing Endpoints ---

@app.get("/financial/{ticker}/income", response_model=FinancialResponse)
async def get_income_statement(
    ticker: str,
    years: int = Query(20, description="Number of periods", ge=5, le=20),
):
    """Get income statement data for multiple periods"""
    try:
        company = Company(ticker.upper())
        if not company.facts:
            raise HTTPException(status_code=404, detail=f"No financial data available for {ticker}")
        stmt = company.income_statement(periods=years, annual=True, concise_format=True)
        if not stmt:
            raise HTTPException(status_code=404, detail=f"No income statement data for {ticker}")
        response_data = {
            'company_info': {'name': company.name, 'ticker': ticker.upper(), 'shares_outstanding': company.shares_outstanding, 'public_float': company.public_float},
            'periods': stmt.periods,
            'data': _convert_statement_to_dict(stmt),
            'metadata': {'period_type': True, 'concise_format': True, 'total_items': len(list(stmt.iter_with_values()))}
        }
        return FinancialResponse(**response_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/financial/{ticker}/balance", response_model=FinancialResponse)  
async def get_balance_sheet(
    ticker: str,
    years: int = Query(20, description="Number of periods", ge=5, le=20),
):
    """Get balance sheet data for multiple periods"""
    try:
        company = Company(ticker.upper())
        if not company.facts:
            raise HTTPException(status_code=404, detail=f"No financial data available for {ticker}")
        stmt = company.balance_sheet(periods=years, annual=True, concise_format=True)
        if not stmt:
            raise HTTPException(status_code=404, detail=f"No balance sheet data for {ticker}")
        response_data = {
            'company_info': {'name': company.name, 'ticker': ticker.upper(), 'shares_outstanding': company.shares_outstanding, 'public_float': company.public_float},
            'periods': stmt.periods,
            'data': _convert_statement_to_dict(stmt),
            'metadata': {'period_type': True, 'concise_format': True, 'total_items': len(list(stmt.iter_with_values()))}
        }
        return FinancialResponse(**response_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/financial/{ticker}/cashflow", response_model=FinancialResponse)
async def get_cash_flow(
    ticker: str,
    years: int = Query(20, description="Number of years", ge=5, le=20),
):
    """Get cash flow statement data for multiple years"""
    try:
        company = Company(ticker.upper())
        if not company.facts:
            raise HTTPException(status_code=404, detail=f"No financial data available for {ticker}")
        stmt = company.cash_flow(periods=years, annual=True, concise_format=True)
        if not stmt:
            raise HTTPException(status_code=404, detail=f"No cash flow data for {ticker}")
        response_data = {
            'company_info': {'name': company.name, 'ticker': ticker.upper(), 'shares_outstanding': company.shares_outstanding, 'public_float': company.public_float},
            'periods': stmt.periods,
            'data': _convert_statement_to_dict(stmt),
            'metadata': {'period_type': True, 'concise_format': True, 'total_items': len(list(stmt.iter_with_values()))}
        }
        return FinancialResponse(**response_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- NEW: Comprehensive Endpoint ---
@app.get("/financial/{ticker}/comprehensive", response_model=ComprehensiveFinancialResponse)
async def get_comprehensive_financials(
    ticker: str,
    periods: int = Query(5, description="Number of periods", ge=1, le=10),
    annual: bool = Query(True, description="Annual (True) or Quarterly (False)"),
    concise_format: bool = Query(True, description="Use concise formatting"),
    include_ratios: bool = Query(True, description="Calculate financial ratios")
):
    """Get comprehensive financial data including all statements and key metrics"""
    try:
        company = Company(ticker.upper())

        if not company.facts:
            raise HTTPException(status_code=404, detail=f"No financial data available for {ticker}")

        # Get all three statements
        income_stmt = company.income_statement(periods=periods, annual=annual, concise_format=concise_format)
        balance_sheet = company.balance_sheet(periods=periods, annual=annual, concise_format=concise_format)
        cash_flow = company.cash_flow(periods=periods, annual=annual, concise_format=concise_format)

        available_periods = income_stmt.periods if income_stmt and income_stmt.periods else []

        if not available_periods:
            raise HTTPException(status_code=404, detail=f"No financial statement data available for {ticker}")

        key_metrics = {}
        if include_ratios and income_stmt and balance_sheet:
            key_metrics = _calculate_financial_ratios(income_stmt, balance_sheet, cash_flow)

        response_data = {
            'company_info': {'name': company.name, 'ticker': ticker.upper(), 'shares_outstanding': company.shares_outstanding, 'public_float': company.public_float},
            'periods': available_periods,
            'income_statement': _convert_statement_to_dict(income_stmt) if income_stmt else {},
            'balance_sheet': _convert_statement_to_dict(balance_sheet) if balance_sheet else {},
            'cash_flow': _convert_statement_to_dict(cash_flow) if cash_flow else {},
            'key_metrics': key_metrics,
            'metadata': {
                'period_type': 'annual' if annual else 'quarterly',
                'concise_format': concise_format,
                'statements_available': {'income_statement': bool(income_stmt), 'balance_sheet': bool(balance_sheet), 'cash_flow': bool(cash_flow)}
            }
        }
        return ComprehensiveFinancialResponse(**response_data)
    except Exception as e:
        logger.error(f"Error in comprehensive endpoint for {ticker}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

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

def _find_financial_item(statement, possible_names):
    """Helper function to find an item in a statement from a list of possible names."""
    for name in possible_names:
        item = statement.find_item(name)
        if item:
            return item
    return None

def _calculate_financial_ratios(income_stmt, balance_sheet, cash_flow):
    """Calculate key financial ratios from statements"""
    ratios = {}
    try:
        # Find the items once, more robustly
        revenue_item = _find_financial_item(income_stmt, ['Revenue', 'Revenues', 'SalesRevenueNet'])
        net_income_item = _find_financial_item(income_stmt, ['NetIncomeLoss'])
        assets_item = _find_financial_item(balance_sheet, ['Assets'])
        equity_item = _find_financial_item(balance_sheet, ['StockholdersEquity', 'LiabilitiesAndStockholdersEquity'])

        if not all([revenue_item, net_income_item, assets_item, equity_item]):
            logger.warning("Could not find all necessary items for ratio calculation.")
            return {}

        for period in income_stmt.periods:
            # Get values for the current period
            revenue = revenue_item.values.get(period)
            net_income = net_income_item.values.get(period)
            total_assets = assets_item.values.get(period)
            total_equity = equity_item.values.get(period)

            # Profitability Ratios
            if revenue and net_income and revenue != 0:
                ratios[f'profit_margin_{period}'] = net_income / revenue

            # Return Ratios
            if net_income and total_assets and total_assets != 0:
                ratios[f'return_on_assets_{period}'] = net_income / total_assets
            if net_income and total_equity and total_equity != 0:
                ratios[f'return_on_equity_{period}'] = net_income / total_equity
                
    except Exception as e:
        logger.error(f"Error calculating ratios: {e}", exc_info=True)
    return ratios