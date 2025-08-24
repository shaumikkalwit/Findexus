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