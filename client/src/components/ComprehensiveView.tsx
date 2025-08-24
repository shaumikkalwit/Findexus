import { ComprehensiveData } from '@/lib/types';
import FinancialTable from './FinancialTable';
import KeyMetricsDisplay from './KeyMetricsDisplay';

export default function ComprehensiveView({ data }: { data: ComprehensiveData }) {
    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-white border-b border-gray-700 pb-2 mb-4">Key Metrics</h2>
                <KeyMetricsDisplay metrics={data.key_metrics} />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-white border-b border-gray-700 pb-2 mb-4">Income Statement</h2>
                <FinancialTable data={{ data: data.income_statement, periods: data.periods, company_info: data.company_info }} />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-white border-b border-gray-700 pb-2 mb-4">Balance Sheet</h2>
                <FinancialTable data={{ data: data.balance_sheet, periods: data.periods, company_info: data.company_info }} />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-white border-b border-gray-700 pb-2 mb-4">Cash Flow</h2>
                <FinancialTable data={{ data: data.cash_flow, periods: data.periods, company_info: data.company_info }} />
            </div>
        </div>
    );
}