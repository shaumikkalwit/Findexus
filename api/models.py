from pydantic import BaseModel
from typing import List, Dict, Any

# Pydantic Response Models
class FinancialResponse(BaseModel):
    company_info: Dict[str, Any]
    periods: List[str]
    data: Dict[str, Any]
    metadata: Dict[str, Any]

class ComprehensiveFinancialResponse(BaseModel):
    company_info: Dict[str, Any]
    periods: List[str]
    income_statement: Dict[str, Any]
    balance_sheet: Dict[str, Any]
    cash_flow: Dict[str, Any]
    key_metrics: Dict[str, Any]
    metadata: Dict[str, Any]
    
class CompanyMetrics(BaseModel):
    ticker: str
    name: str
    metrics: Dict[str, Dict[str, float | None]]
    
class ComparisonResponse(BaseModel):
    periods: List[str]
    data: List[CompanyMetrics]