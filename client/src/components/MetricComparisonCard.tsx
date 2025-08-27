'use client';

import { useState } from 'react';

// Re-using helpers from your original design for consistency
const formatMetricValue = (metricName: string, value: number): string => {
    const name = metricName.toLowerCase();
    if (name.includes('margin') || name.includes('equity') || name.includes('capex')) return `${(value * 100).toFixed(2)}%`;
    if (name.includes('years')) return value.toFixed(2);
    if (name.includes('income') || name.includes('earnings')) {
        if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
        if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
        return `$${value.toLocaleString()}`;
    }
    return value.toFixed(2);
};

const getMetricStyles = (metricName: string, value: number | null): string => {
    const name = metricName.toLowerCase();
    let colorClass = 'text-gray-300';
    // Corrected this line to use text-left for alignment consistency
    if (value === null || value === undefined) return `p-3 text-left ${colorClass}`;

    if (name.includes('gross margin')) colorClass = value > 0.4 ? 'text-green-400' : 'text-red-400';
    else if (name.includes('net margin')) colorClass = value > 0.2 ? 'text-green-400' : 'text-red-400';
    else if (name.includes('years to pay off debt')) colorClass = value < 4 ? 'text-green-400' : 'text-red-400';
    else if (name.includes('capex to net income')) {
        if (value < 0.25) colorClass = 'text-green-400';
        else if (value <= 0.5) colorClass = 'text-yellow-400';
        else colorClass = 'text-red-400';
    }
    return `p-3 text-left ${colorClass}`;
};


interface MetricComparisonCardProps {
    metricName: string;
    periods: string[];
    data: any[]; // Array of company data
    onRemove: (ticker: string) => void;
}

export default function MetricComparisonCard({ metricName, periods, data, onRemove }: MetricComparisonCardProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex justify-between items-center p-4 bg-gray-700/50 hover:bg-gray-700 transition"
            >
                <h3 className="text-lg font-bold text-white">{metricName}</h3>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            {isExpanded && (
                <div className="p-4">
                    <div className="overflow-x-auto">
                        <table className="min-w-full" style={{ tableLayout: 'fixed', width: '100%' }}>
                            <thead>
                                <tr>
                                    <th className="text-left font-semibold text-gray-300 p-2 w-1/4">Period</th>
                                    {data.map(company => (
                                        <th key={company.ticker} className="text-left font-semibold text-gray-300 p-2">
                                            <div className="flex items-center justify-between">
                                                <span>{company.ticker}</span>
                                                <button onClick={() => onRemove(company.ticker)} className="ml-2 text-gray-500 hover:text-red-400">&times;</button>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {periods.map(period => (
                                    <tr key={period} className="border-t border-gray-700">
                                        <td className="p-2 font-medium">{period}</td>
                                        {data.map(company => (
                                            <td key={company.ticker} className={getMetricStyles(metricName, company.metrics[metricName]?.[period])}>
                                                {company.metrics[metricName]?.[period] !== null && company.metrics[metricName]?.[period] !== undefined
                                                    ? formatMetricValue(metricName, company.metrics[metricName][period])
                                                    : '—'}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}