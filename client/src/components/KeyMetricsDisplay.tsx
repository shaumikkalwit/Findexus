import { ComprehensiveData } from '@/lib/types';

export default function KeyMetricsDisplay({ metrics, periods }: { metrics: ComprehensiveData['key_metrics'], periods: string[] }) {
    const metricItems = Object.entries(metrics);
    if (metricItems.length === 0) return <p className="text-gray-400 mt-4">No key metrics available.</p>;

    return (
        <div className="overflow-x-auto mt-2">
            <table className="min-w-full bg-gray-800 border border-gray-700 rounded-lg shadow-sm">
                <thead className="bg-gray-700">
                    <tr>
                        <th className="text-left font-semibold text-gray-300 p-3 border-b border-gray-600">Metric</th>
                        {periods.map((period) => (
                            <th key={period} className="text-left font-semibold text-gray-300 p-3 border-b border-gray-600">
                                {period}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {metricItems.map(([metricName, periodValues]) => (
                        <tr key={metricName} className="hover:bg-gray-700">
                            <td className="p-3 border-b border-gray-600 text-gray-300 font-medium">
                                {metricName}
                            </td>
                            {periods.map((period) => (
                                <td key={period} className="p-3 border-b border-gray-600 text-gray-300" style={{ textAlign: 'left' }}>
                                    {periodValues[period] ? `${(periodValues[period] * 100).toFixed(2)}%` : '—'}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}