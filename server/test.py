import os
from edgar import *
from pathlib import Path
from edgar.xbrl import XBRLS
from dotenv import load_dotenv
from typing import List, Optional
from config import settings
import json
from datetime import datetime
    
set_identity("shaumik.kalwit@gmail.com")

def get_company_info(
    years_back: 5
):
    ticker = "AAPL"
    company = Company(ticker)
    company_facts_dataframe = get_company_facts(company)
    frames = generate_filing_periods(years_back)
    output = generate_output(ticker, company_facts_dataframe, frames)
    return output


def get_company_facts(companies: dict) -> list:
    facts_of_companies = {company.get_facts() for company in companies.values()}
    company_facts_dataframe = [fact.to_pandas() for fact in facts_of_companies]
    return company_facts_dataframe


def generate_filing_periods(years_back: int) -> list[str]:
    current_year = datetime.now().year
    frames = [
        f"CY{year}Q{quarter}{suffix}"
        for year in range(current_year - years_back, current_year + 1)
        for quarter in range(1, 5)
        for suffix in ["", "I"]
    ] + [f"CY{year}" for year in range(current_year - years_back, current_year + 1)]
    return frames


def generate_output(
    tickers: list[str], company_facts_dataframe: list, frames: list
) -> dict:
    my_facts = [
        "EarningsPerShareBasic",
        "GrossProfit",
        "OperatingExpenses",
        "Assets",
        "Liabilities",
        "CommonStockValue",
    ]
    output = {
        ticker: {
            fact: dict(
                company_df.loc[
                    (company_df["fact"] == fact) & (company_df["frame"].isin(frames)),
                    ["frame", "val"],
                ].values
            )
            for fact in my_facts
        }
        for ticker, company_df in zip(tickers, company_facts_dataframe)
    }
    removed_empty_values = remove_empty_facts(output)
    cleaned_output = remove_trailing_I_from_frames(removed_empty_values)
    return cleaned_output


def remove_trailing_I_from_frames(output: dict) -> dict:
    return {
        ticker: {
            fact: {frame.rstrip("I"): value for frame, value in values.items()}
            for fact, values in company.items()
        }
        for ticker, company in output.items()
    }


def remove_empty_facts(data: dict) -> dict:
    return {
        ticker: {fact: values for fact, values in company.items() if values}
        for ticker, company in data.items()
    }
    
print(get_company_info(years_back=5))