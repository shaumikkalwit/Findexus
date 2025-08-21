import os
from edgar import *
from pathlib import Path
from edgar.xbrl import XBRLS
from dotenv import load_dotenv
from typing import List, Optional
from config import settings
import json
from fastapi.encoders import jsonable_encoder

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
            xb = filings.xbrl()
            statements = xb.statements
            # multi_financials = MultiFinancials.extract(filings)
            print("--- STEP 3: SUCCESS ---")
        except Exception as e:
            print(f"--- STEP 3: FAILED with error: {e} ---")
            raise
                

        # Create multi-period financials
        # multi_financials = MultiFinancials.extract(filings)

        # Access statements spanning multiple years
        self.balance_sheet = statements.balance_sheet()
        self.income_statement = statements.income_statement()
        self.cashflow_statement = statements.cashflow_statement()
        print(type(self.balance_sheet))
    
    def get_income_statement(self):
        # return self.income_statement.to_dict() if self.income_statement is not None else None
        return json.loads(self.income_statement.data.to_json(orient='split')) if self.income_statement is not None else None
    
    def get_balance_sheet(self):
        return json.dump(self.balance_sheet) if self.balance_sheet is not None else None
    
    def get_cashflow_statement(self):
        return json.dump(self.cashflow_statement) if self.cashflow_statement is not None else None
    
if __name__ == "__main__":
    set_identity("email.email@gmail.com")
    company = Company("AAPL")
    # stmt = company.income_statement(periods=4)
    # print(type(stmt))
    # # Basic iteration over all items
    # for item in stmt:
    #     print(f"{item.label}: {item.get_display_value(stmt.periods[0])}")

    # # Iterate with hierarchy information  
    # for item in stmt.iter_hierarchy():
    #     indent = "  " * item.depth
    #     parent_info = f" (parent: {item.parent.label})" if item.parent else ""
    #     print(f"{indent}{item.label}{parent_info}")

    # # Only items with values (skip empty rows)
    # for item in stmt.iter_with_values():
    #     values_summary = ", ".join([
    #         f"{period}: {item.get_display_value(period)}" 
    #         for period in stmt.periods 
    #         if item.values.get(period)
    #     ])
    #     print(f"{item.label} -> {values_summary}")

    # # Convert to web-friendly format
    # web_data = stmt.to_dict()
        # apple = Company("AAPL")
    # filings = apple.get_filings(form="10-K")
    # latest_10k = filings.latest()
    # tenk = latest_10k.obj()
    # income_stmt = tenk.income_statement
    # income_data_list = income_stmt.to_dict(orient="records")
    filings = company.get_filings(form="10-K").head(2)  # head does NOTHING here !!!!!!!!
    # income_statement = company.income_statement()
    # print(type(income_statement))

    # Create multi-period financials
    multi_financials = MultiFinancials.extract(filings)

    # Access statements spanning multiple years
    balance_sheet = multi_financials.balance_sheet()
    income_statement = multi_financials.income_statement()
    cash_flow = multi_financials.cashflow_statement()

    print("Multi-Year Income Statement:")
    df = income_statement.to_dataframe()
    print(jsonable_encoder(df.to_dict(orient="records")))
    # income_data_list = income_statement.to_dict(orient="records")
    # print(income_data_list)
    # print(type(income_data_list))

    # print("--- Running sec_data.py directly ---")
    # try:
    #     api = SECDataAPI("AAPL")
    #     # We need to print the email to be sure it's loaded
    #     print(f"Email used in direct script: {os.getenv('EMAIL')}")
    #     api.fetch_data()
    #     api.get_income_statement()
    #     print("--- Direct script finished successfully ---")
    # except Exception as e:
    #     print(f"Direct script failed with error: {e}")