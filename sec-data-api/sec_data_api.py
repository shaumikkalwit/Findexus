import os
from edgar import *
from pathlib import Path
from edgar.xbrl import XBRLS
from dotenv import load_dotenv
from typing import List, Optional
from config import settings
import json

class SECDataAPI:
    def __init__(self, ticker):
        try:
            print("--- STEP 1: Setting identity ---")
            set_identity("shaumik.kalwit@gmail.com") # <-- Put your real email here
            print("--- STEP 1: SUCCESS ---")
        except Exception as e:
            print(f"--- STEP 1: FAILED with error: {e} ---")
            raise  # Re-raise the exception to stop execution

        self.company = Company(ticker)
        self.balance_sheet = None
        self.income_statement = None
        self.cashflow_statement = None
        
    def fetch_data(self):
        try:
            print("--- STEP 2: Getting filings ---")
            filings = self.company.get_filings(form="10-K").head(1) # Using head(1) for speed
            print("--- STEP 2: SUCCESS ---")
        except Exception as e:
            print(f"--- STEP 2: FAILED with error: {e} ---")
            raise

        try:
            print("--- STEP 3: Extracting financials ---")
            multi_financials = MultiFinancials.extract(filings)
            print("--- STEP 3: SUCCESS ---")
        except Exception as e:
            print(f"--- STEP 3: FAILED with error: {e} ---")
            raise
                

        # Create multi-period financials
        # multi_financials = MultiFinancials.extract(filings)

        # Access statements spanning multiple years
        self.balance_sheet = multi_financials.balance_sheet()
        self.income_statement = multi_financials.income_statement()
        self.cashflow_statement = multi_financials.cashflow_statement()
    
    def get_income_statement(self):
        # return self.income_statement.to_dict() if self.income_statement is not None else None
        return json.dump(self.income_statement) if self.income_statement is not None else None
    
    def get_balance_sheet(self):
        return json.dump(self.balance_sheet) if self.balance_sheet is not None else None
    
    def get_cashflow_statement(self):
        return json.dump(self.cashflow_statement) if self.cashflow_statement is not None else None
    
if __name__ == "__main__":
    print("--- Running sec_data.py directly ---")
    try:
        api = SECDataAPI("AAPL")
        # We need to print the email to be sure it's loaded
        print(f"Email used in direct script: {os.getenv('EMAIL')}")
        api.fetch_data()
        print("--- Direct script finished successfully ---")
    except Exception as e:
        print(f"Direct script failed with error: {e}")