import os
from edgar import *
from edgar.xbrl import XBRLS
from dotenv import load_dotenv
from typing import List, Optional

# Env setup
load_dotenv()
EMAIL_ADDRESS = os.getenv("EMAIL")

set_identity(EMAIL_ADDRESS)

ticker = "AAPL"
start_date = "2009-01-01"

# Get multiple filings for trend analysis
company = Company('AAPL')
filings = company.get_filings(form="10-K").head(12)  # Get the last 3 annual reports

# Create multi-period financials
multi_financials = MultiFinancials.extract(filings)

# Access statements spanning multiple years
balance_sheet = multi_financials.balance_sheet()
income_statement = multi_financials.income_statement()
cash_flow = multi_financials.cashflow_statement()

print("Multi-Year Income Statement:")
print(income_statement)