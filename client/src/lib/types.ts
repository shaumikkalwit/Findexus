export type FinancialData = {
  company_info: { name: string; ticker: string };
  periods: string[];
  data: {
    [concept:string]: {
        label: string;
        concept: string;
        values: { [period:string]: { display_value: string } };
        depth: number;
    }
  };
};

export type ComprehensiveData = {
    company_info: { name: string; ticker: string };
    periods: string[];
    income_statement: FinancialData['data'];
    balance_sheet: FinancialData['data'];
    cash_flow: FinancialData['data'];
    key_metrics: { [metric: string]: number };
};