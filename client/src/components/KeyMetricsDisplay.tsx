import { ComprehensiveData } from '@/lib/types';

// Helper to format the value for display
const formatMetricValue = (metricName: string, value: number): string => {
    const name = metricName.toLowerCase();
    if (name.includes('margin') || name.includes('equity') || name.includes('capex')) {
        return `${(value * 100).toFixed(2)}%`;
    }
    if (name.includes('years')) {
        return value.toFixed(2); // Just the number, "Years" is implied by the row
    }
    if (name.includes('income') || name.includes('earnings')) {
        if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
        if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
        return `$${value.toLocaleString()}`;
    }
    return value.toFixed(2);
};

const getMetricStyles = (metricName: string, value: number | null, prevValue: number | null): string => {
    const name = metricName.toLowerCase();
    let colorClass = 'text-gray-300';

    if (value === null || value === undefined) {
        return `p-3 border-b border-gray-600 text-left ${colorClass}`;
    }

    if (name.includes('net income') || name.includes('retained earnings') || name.includes('return on equity (roe)')) {
        if (prevValue !== null && prevValue !== undefined) {
            if (value > prevValue) {
                colorClass = 'text-green-400'; // Green if increasing
            } else if (value < prevValue) {
                colorClass = 'text-red-400'; // Red if decreasing
            }
        }
    } 
    else if (name.includes('gross margin')) {
        colorClass = value > 0.37 ? 'text-green-400' : 'text-red-400';
    } else if (name.includes('net margin')) {
        colorClass = value > 0.2 ? 'text-green-400' : 'text-red-400';
    } else if (name.includes('years to pay off debt')) {
        colorClass = value < 4 ? 'text-green-400' : 'text-red-400';
    } else if (name.includes('capex to net income')) {
        if (value < 0.25) colorClass = 'text-green-400';
        else if (value <= 0.5) colorClass = 'text-yellow-400';
        else colorClass = 'text-red-400';
    }
    
    return `p-3 border-b border-gray-600 text-left ${colorClass}`;
};

export default function KeyMetricsDisplay({ metrics, periods }: { metrics: ComprehensiveData['key_metrics'], periods: string[] }) {
    const metricItems = Object.entries(metrics);
    if (metricItems.length === 0) return <p className="text-gray-400 mt-4">No key metrics available.</p>;

    const metricOrder = [
        "Net Income",
        "Retained Earnings",
        "Gross Margin",
        "Net Margin",
        "Return on Equity (ROE)",
        "Years to Pay Off Debt",
        "Capex to Net Income",
    ];

    const sortedMetricItems = metricItems.sort(([a], [b]) => {
        const indexA = metricOrder.indexOf(a);
        const indexB = metricOrder.indexOf(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

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
                    {sortedMetricItems.map(([metricName, periodValues]) => (
                        <tr key={metricName} className="hover:bg-gray-700">
                            <td className="p-3 border-b border-gray-600 text-gray-300 font-medium">
                                {metricName}
                            </td>
                            {periods.map((period, index) => {
                                const currentValue = periodValues[period];
                                const prevPeriod = periods[index + 1];
                                const prevValue = prevPeriod ? periodValues[prevPeriod] : null;

                                return (
                                    <td key={period} className={getMetricStyles(metricName, currentValue ?? null, prevValue ?? null)}>
                                        {currentValue !== undefined && currentValue !== null ? formatMetricValue(metricName, currentValue) : '—'}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}