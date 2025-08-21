# import os
# from dotenv import load_dotenv
# from fastapi import FastAPI, HTTPException
# from typing import List, Dict, Any, Optional
# from edgar import *
# import pandas as pd
# from sec_data_api import SECDataAPI
# from pydantic import BaseModel
# import math

# # --- FastAPI App Initialization ---
# app = FastAPI(
#     title="Company Financials API (Raw Data)",
#     description="API to retrieve raw Income Statement, Balance Sheet, and Cash Flow Statement data for public companies directly from edgartools.",
#     version="0.0.0",
# )

# class TickerRequest(BaseModel):
#     ticker: str

# @app.post("/financials")
# def get_financials(request: TickerRequest):
#     try:
#         # Create an instance of your data fetching class
#         sec_api = SECDataAPI(request.ticker)
#         sec_api.fetch_data()

#         # --- New Individual Checks ---
#         try:
#             print("--- Getting Income Statement ---")
#             income_statement_dict = sec_api.get_income_statement()
#             print("--- Got Income Statement Successfully ---")
#         except Exception as e:
#             print(f"!!! FAILED to get Income Statement: {e}")
#             raise HTTPException(status_code=500, detail=f"Error processing Income Statement: {e}")

#         try:
#             print("--- Getting Balance Sheet ---")
#             balance_sheet_dict = sec_api.get_balance_sheet()
#             print("--- Got Balance Sheet Successfully ---")
#         except Exception as e:
#             print(f"!!! FAILED to get Balance Sheet: {e}")
#             raise HTTPException(status_code=500, detail=f"Error processing Balance Sheet: {e}")

#         try:
#             print("--- Getting Cashflow Statement ---")
#             cashflow_statement_dict = sec_api.get_cashflow_statement()
#             print("--- Got Cashflow Statement Successfully ---")
#         except Exception as e:
#             print(f"!!! FAILED to get Cashflow Statement: {e}")
#             raise HTTPException(status_code=500, detail=f"Error processing Cashflow Statement: {e}")
#         # --- End of Individual Checks ---

#         # Clean each dictionary before returning it
#         return {
#             "income_statement": income_statement_dict,
#             "balance_sheet": balance_sheet_dict,
#             "cashflow_statement": cashflow_statement_dict
#         }
#     except Exception as e:
#         # Raise an HTTP exception for clearer error handling on the client-side
#         raise HTTPException(status_code=400, detail=str(e))

from fastapi import FastAPI, HTTPException
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

class FinancialDataResponse(BaseModel):
    company_name: str
    ticker: str
    cik: str
    income_statements: List[Dict[str, Any]]
    balance_sheets: List[Dict[str, Any]]
    cash_flow_statements: List[Dict[str, Any]]
    years_available: int

class CompanyRequest(BaseModel):
    ticker: str
    years: Optional[int] = 20

def get_financial_statements(company: Company, years: int = 20):
    """
    Extract financial statements from a company's filings
    """
    try:
        # Get only 10-K filings (annual reports only)
        recent_filings = company.get_filings(form=['10-K']).latest(years)
        
        income_statements = []
        balance_sheets = []
        cash_flows = []
        
        for filing in recent_filings:
            try:
                # Get XBRL data from the filing
                xbrl = filing.xbrl()
                if xbrl is None:
                    continue
                
                # Extract financial statements
                # Income Statement
                income_stmt = xbrl.get_facts(concept=['Revenues', 'Revenue', 'SalesRevenueNet', 'TotalRevenues',
                                                    'NetIncomeLoss', 'NetIncome', 'CostOfRevenue', 'CostOfGoodsSold',
                                                    'OperatingIncomeLoss', 'OperatingExpenses', 'GrossProfit'])
                
                # Balance Sheet
                balance_sheet = xbrl.get_facts(concept=['Assets', 'TotalAssets', 'Liabilities', 'TotalLiabilities',
                                                      'StockholdersEquity', 'TotalStockholdersEquity',
                                                      'CurrentAssets', 'CurrentLiabilities', 'Cash',
                                                      'CashAndCashEquivalents'])
                
                # Cash Flow Statement
                cash_flow = xbrl.get_facts(concept=['NetCashProvidedByUsedInOperatingActivities',
                                                  'NetCashProvidedByUsedInInvestingActivities',
                                                  'NetCashProvidedByUsedInFinancingActivities',
                                                  'CashAndCashEquivalentsAtCarryingValue'])
                
                # Process and structure the data
                filing_data = {
                    'filing_date': filing.filing_date,
                    'period_end_date': filing.period_end_date,
                    'form_type': filing.form,
                    'fiscal_year': filing.fiscal_year,
                    'fiscal_period': filing.fiscal_period
                }
                
                if income_stmt and len(income_stmt) > 0:
                    income_data = filing_data.copy()
                    for fact in income_stmt:
                        income_data[fact.concept] = {
                            'value': fact.value,
                            'units': fact.units,
                            'period': str(fact.period)
                        }
                    income_statements.append(income_data)
                
                if balance_sheet and len(balance_sheet) > 0:
                    balance_data = filing_data.copy()
                    for fact in balance_sheet:
                        balance_data[fact.concept] = {
                            'value': fact.value,
                            'units': fact.units,
                            'period': str(fact.period)
                        }
                    balance_sheets.append(balance_data)
                
                if cash_flow and len(cash_flow) > 0:
                    cf_data = filing_data.copy()
                    for fact in cash_flow:
                        cf_data[fact.concept] = {
                            'value': fact.value,
                            'units': fact.units,
                            'period': str(fact.period)
                        }
                    cash_flows.append(cf_data)
                    
            except Exception as e:
                logger.warning(f"Error processing filing {filing.accession_number}: {str(e)}")
                continue
        
        return income_statements, balance_sheets, cash_flows
    
    except Exception as e:
        logger.error(f"Error getting financial statements: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error retrieving financial data: {str(e)}")

@app.get("/")
def read_root():
    return {"message": "Financial Statements API", "version": "1.0.0"}

@app.post("/financial-data", response_model=FinancialDataResponse)
async def get_company_financials(request: CompanyRequest):
    """
    Get financial statements for a company by ticker symbol
    """
    try:
        # Find the company by ticker
        companies = find(request.ticker)
        
        if not companies:
            raise HTTPException(status_code=404, detail=f"Company with ticker '{request.ticker}' not found")
        
        # Get the first matching company
        company = companies[0]
        
        # Convert to Company object if needed
        if hasattr(company, 'get_company'):
            company = company.get_company()
        elif not hasattr(company, 'get_filings'):
            # If it's an Entity, convert to Company
            company = Company(company.cik)
        logger.info(f"Found company: {company.name} (CIK: {company.cik})")
        
        # Convert to Company object if needed
        if hasattr(company, 'get_company'):
            company = company.get_company()
        elif not hasattr(company, 'get_filings'):
            # If it's an Entity, convert to Company
            company = Company(company.cik)
        
        # Get financial statements
        income_statements, balance_sheets, cash_flows = get_financial_statements(company, request.years)
        
        return FinancialDataResponse(
            company_name=company.name,
            ticker=request.ticker,
            cik=company.cik,
            income_statements=income_statements,
            balance_sheets=balance_sheets,
            cash_flow_statements=cash_flows,
            years_available=len(set([stmt.get('fiscal_year') for stmt in income_statements if stmt.get('fiscal_year')]))
        )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.get("/company/{ticker}/filings")
async def get_company_filings(ticker: str, limit: int = 10):
    """
    Get recent filings for a company
    """
    try:
        companies = find(ticker)
        if not companies:
            raise HTTPException(status_code=404, detail=f"Company with ticker '{ticker}' not found")
        
        company = companies[0]
        filings = company.get_filings(form=['10-K']).latest(limit)
        
        filings_data = []
        for filing in filings:
            filings_data.append({
                'accession_number': filing.accession_number,
                'filing_date': filing.filing_date,
                'form_type': filing.form,
                'fiscal_year': filing.fiscal_year,
                'fiscal_period': filing.fiscal_period,
                'period_end_date': filing.period_end_date
            })
        
        return {
            'company_name': company.name,
            'ticker': ticker,
            'filings': filings_data
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving filings: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)