import { FinancialData } from '@/lib/types';

export default function FinancialTable({ data }: { data: FinancialData }) {
    const dataItems = Object.values(data.data);
    return (
        <div className="overflow-x-auto mt-6">
            <table className="min-w-full bg-gray-800 border border-gray-700 rounded-lg shadow-sm">
                <thead className="bg-gray-700">
                    <tr>
                        <th className="text-left font-semibold text-gray-300 p-3 border-b border-gray-600">Metric</th>
                        {data.periods.map((period) => (
                            <th key={period} className="text-left font-semibold text-gray-300 p-3 border-b border-gray-600">
                                {period}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {dataItems.map((item) => (
                        <tr key={item.concept} className="hover:bg-gray-700">
                            <td className="p-3 border-b border-gray-600 text-gray-300 font-medium text-left">
                                {item.label}
                            </td>
                            {data.periods.map((period) => (
                                <td key={period} className="p-3 border-b border-gray-600 text-gray-300 text-left font-mono">
                                    {item.values[period]?.display_value ?? '—'}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
