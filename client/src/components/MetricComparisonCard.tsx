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

// Determines cell style based on performance rank among all companies for a given period
const getComparisonMetricStyles = (
    metricName: string,
    value: number | null,
    rank: number,      // 0 is best, 1 is second best, etc
    totalRanks: number, // The number of companies being ranked
    worstRank: number   // The rank of the worst-performing company
): string => {
    const baseStyle = 'p-3 text-left';
    // Default style for null values or when there's nothing to compare
    if (value === null || value === undefined || totalRanks <= 1) {
        return `${baseStyle} text-gray-300`;
    }

    // Apply colors based on rank. Rank 0 is always the best
    if (rank === 0) { // Best performer
        return `${baseStyle} text-green-400 font-semibold`;
    }
    // For the worst performer, use a strong red. This applies in all cases (2, 3, 4+ companies)
    if (rank === worstRank) { // Worst performer
        return `${baseStyle} text-red-500`; // A strong, readable red
    }
    // Only apply second-tier colors if there are enough companies to justify it (4+)
    if (totalRanks >= 4) {
        if (rank === 1) { // Second best
            return `${baseStyle} text-green-600`; // Keeping this a darker green to contrast with the best
        }
        // Check for second-to-last rank, ensuring it's not the same as the worst rank (handles ties)
        if (rank === worstRank - 1) { // Second worst
            return `${baseStyle} text-red-400`; // A lighter red for the second-to-last performer
        }
    }

    // Default style for all middle-tier values
    return `${baseStyle} text-gray-300`;
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
                                            <div className="inline-flex items-center group">
                                                <span>{company.ticker}</span>
                                                <button
                                                    onClick={() => onRemove(company.ticker)}
                                                    className="ml-1.5 text-gray-500 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity text-lg leading-none"
                                                    aria-label={`Remove ${company.ticker}`}
                                                >
                                                    &times;
                                                </button>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {periods.map(period => {
                                    const rankedData = data
                                        .map(company => ({
                                            ticker: company.ticker,
                                            value: company.metrics[metricName]?.[period]
                                        }))
                                        .filter(item => item.value !== null && item.value !== undefined);

                                    const name = metricName.toLowerCase();
                                    const lowerIsBetter = ['years to pay off debt', 'capex to net income'].some(m => name.includes(m));
                                    
                                    rankedData.sort((a, b) => lowerIsBetter ? a.value! - b.value! : b.value! - a.value!);

                                    const rankMap = new Map<string, number>();
                                    let lastValue = NaN;
                                    let lastRank = -1;
                                    rankedData.forEach((item, index) => {
                                        if (item.value !== lastValue) {
                                            lastRank = index;
                                        }
                                        rankMap.set(item.ticker, lastRank);
                                        lastValue = item.value!;
                                    });
                                    
                                    const totalRanked = rankedData.length;
                                    const worstRank = totalRanked > 0 ? rankMap.get(rankedData[totalRanked - 1].ticker) : -1;

                                    return (
                                        <tr key={period} className="border-t border-gray-700">
                                            <td className="p-2 font-medium">{period}</td>
                                            {data.map(company => {
                                                const currentValue = company.metrics[metricName]?.[period];
                                                const rank = rankMap.get(company.ticker);
                                                
                                                return (
                                                    <td key={company.ticker} className={getComparisonMetricStyles(metricName, currentValue, rank ?? -1, totalRanked, worstRank ?? -1)}>
                                                        {currentValue !== null && currentValue !== undefined
                                                            ? formatMetricValue(metricName, currentValue)
                                                            : '—'}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}