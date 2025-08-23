from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware # Import this
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

        # Get income statement
        stmt = company.income_statement(periods=years, annual=True, concise_format=True)

        if not stmt:
            raise HTTPException(status_code=404, detail=f"No income statement data for {ticker}")

        # Convert to API response format
        response_data = {
            'company_info': {
                'name': company.name,
                'ticker': ticker.upper(),
                'shares_outstanding': company.shares_outstanding,
                'public_float': company.public_float
            },
            'periods': stmt.periods,
            'data': _convert_statement_to_dict(stmt),
            'metadata': {
                'period_type': True,
                'concise_format': True,
                'total_items': len(list(stmt.iter_with_values()))
            }
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
            'company_info': {
                'name': company.name,
                'ticker': ticker.upper(),
                'shares_outstanding': company.shares_outstanding,
                'public_float': company.public_float
            },
            'periods': stmt.periods,
            'data': _convert_statement_to_dict(stmt),
            'metadata': {
                'period_type': True,
                'concise_format': True,
                'total_items': len(list(stmt.iter_with_values()))
            }
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
            'company_info': {
                'name': company.name,
                'ticker': ticker.upper(),
                'shares_outstanding': company.shares_outstanding,
                'public_float': company.public_float
            },
            'periods': stmt.periods,
            'data': _convert_statement_to_dict(stmt),
            'metadata': {
                'period_type': True,
                'concise_format': True,
                'total_items': len(list(stmt.iter_with_values()))
            }
        }

        return FinancialResponse(**response_data)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def _convert_statement_to_dict(stmt):
    """Convert statement to API-friendly dictionary format"""
    data = {}

    for item in stmt.iter_with_values():
        # Create item data with all periods
        item_data = {
            'label': item.label,
            'concept': item.concept,
            'values': {},
            'is_total': getattr(item, 'is_total', False),
            'depth': getattr(item, 'depth', 0)
        }

        # Add values for each period
        for period in stmt.periods:
            value = item.values.get(period)
            if value is not None:
                item_data['values'][period] = {
                    'raw_value': value,
                    'display_value': item.get_display_value(period)
                }

        data[item.concept] = item_data

    return data

# if __name__ == "__main__":
#     import uvicorn

#     uvicorn.run(
#         "main:app",
#         host="0.0.0.0",
#         port=8000,
#         reload=True
#     )