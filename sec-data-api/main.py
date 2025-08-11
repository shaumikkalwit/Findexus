import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from typing import List, Dict, Any, Optional
from edgar import *
import pandas as pd
from sec_data_api import SECDataAPI
from pydantic import BaseModel
import math

# --- FastAPI App Initialization ---
app = FastAPI(
    title="Company Financials API (Raw Data)",
    description="API to retrieve raw Income Statement, Balance Sheet, and Cash Flow Statement data for public companies directly from edgartools.",
    version="0.0.0",
)

class TickerRequest(BaseModel):
    ticker: str

@app.post("/financials")
def get_financials(request: TickerRequest):
    try:
        # Create an instance of your data fetching class
        sec_api = SECDataAPI(request.ticker)
        sec_api.fetch_data()

        # --- New Individual Checks ---
        try:
            print("--- Getting Income Statement ---")
            income_statement_dict = sec_api.get_income_statement()
            print("--- Got Income Statement Successfully ---")
        except Exception as e:
            print(f"!!! FAILED to get Income Statement: {e}")
            raise HTTPException(status_code=500, detail=f"Error processing Income Statement: {e}")

        try:
            print("--- Getting Balance Sheet ---")
            balance_sheet_dict = sec_api.get_balance_sheet()
            print("--- Got Balance Sheet Successfully ---")
        except Exception as e:
            print(f"!!! FAILED to get Balance Sheet: {e}")
            raise HTTPException(status_code=500, detail=f"Error processing Balance Sheet: {e}")

        try:
            print("--- Getting Cashflow Statement ---")
            cashflow_statement_dict = sec_api.get_cashflow_statement()
            print("--- Got Cashflow Statement Successfully ---")
        except Exception as e:
            print(f"!!! FAILED to get Cashflow Statement: {e}")
            raise HTTPException(status_code=500, detail=f"Error processing Cashflow Statement: {e}")
        # --- End of Individual Checks ---

        # Clean each dictionary before returning it
        return {
            "income_statement": income_statement_dict,
            "balance_sheet": balance_sheet_dict,
            "cashflow_statement": cashflow_statement_dict
        }
    except Exception as e:
        # Raise an HTTP exception for clearer error handling on the client-side
        raise HTTPException(status_code=400, detail=str(e))