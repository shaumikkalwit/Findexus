'use client';

import { useState } from 'react';
import { CompanyComparisonData } from '@/lib/types';

// Re-using helpers from your original design for consistency
const formatMetricValue = (metricName: string, value: number | null | undefined): string => {
    if (value === null || value === undefined) {
        return '—'; // Return a consistent placeholder for missing data.
    }

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
    rank: number,
    totalRanks: number,
    worstRank: number
): string => {
    // Added "metric-table-cell" as the base descriptive name
    const baseStyle = 'metric-table-cell p-3 text-left';

    if (value === null || value === undefined || totalRanks <= 1) {
        return `${baseStyle} text-gray-300`;
    }
    if (rank === 0) {
        return `${baseStyle} text-green-400 font-semibold`;
    }
    if (rank === worstRank) {
        return `${baseStyle} text-red-500`;
    }
    if (totalRanks >= 4) {
        if (rank === 1) {
            return `${baseStyle} text-green-600`;
        }
        if (rank === worstRank - 1) {
            return `${baseStyle} text-red-400`;
        }
    }
    return `${baseStyle} text-gray-300`;
};


interface MetricComparisonCardProps {
    metricName: string;
    periods: string[];
    data: CompanyComparisonData[]; // Array of company data
    onRemove: (ticker: string) => void;
}

export default function MetricComparisonCard({ metricName, periods, data, onRemove }: MetricComparisonCardProps) {
    const [isExpanded, setIsExpanded] = useState(true);
    const isYoYMetric = ['Net Income', 'Retained Earnings'].includes(metricName);

    return (
        <div className="metric-card bg-gray-800 border border-gray-700 rounded-lg">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="metric-card-header w-full flex justify-between items-center p-4 bg-gray-700/50 hover:bg-gray-700 transition"
            >
                <h3 className="metric-card-title text-lg font-bold text-white">{metricName}</h3>
                <svg className={`toggle-icon w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
            {isExpanded && (
                <div className="card-body p-4">
                    <div className="table-container overflow-x-auto">
                        <table className="metric-table min-w-full" style={{ tableLayout: 'fixed', width: '100%' }}>
                            <thead>
                                <tr>
                                    <th className="period-header-cell text-left font-semibold text-gray-300 p-2 w-1/4">Period</th>
                                    {data.map(company => (
                                        <th key={company.ticker} className="company-header-cell text-left font-semibold text-gray-300 p-2">
                                            <div className="ticker-header-content inline-flex items-center group">
                                                <span>{company.ticker}</span>
                                                <button
                                                    onClick={() => onRemove(company.ticker)}
                                                    className="remove-button ml-1.5 text-gray-500 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity text-lg leading-none"
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
                                {periods.map((period, periodIndex) => {
                                    const rankedData = data
                                        .map(company => ({ ticker: company.ticker, value: company.metrics[metricName]?.[period] }))
                                        .filter(item => item.value !== null && item.value !== undefined);

                                    const name = metricName.toLowerCase();
                                    const lowerIsBetter = ['years to pay off debt', 'capex to net income'].some(m => name.includes(m));
                                    
                                    rankedData.sort((a, b) => lowerIsBetter ? a.value! - b.value! : b.value! - a.value!);

                                    const rankMap = new Map<string, number>();
                                    let lastValue = NaN;
                                    let lastRank = -1;
                                    rankedData.forEach((item, index) => {
                                        if (item.value !== lastValue) { lastRank = index; }
                                        rankMap.set(item.ticker, lastRank);
                                        lastValue = item.value!;
                                    });
                                    
                                    const totalRanked = rankedData.length;
                                    const worstRank = totalRanked > 0 ? rankMap.get(rankedData[totalRanked - 1].ticker) : -1;

                                    return (
                                        <tr key={period} className="table-row border-t border-gray-700">
                                            <td className="period-data-cell p-2 font-medium">{period}</td>
                                            {data.map(company => {
                                                const currentValue = company.metrics[metricName]?.[period];

                                                if (isYoYMetric) {
                                                    const prevPeriod = periods[periodIndex + 1];
                                                    const previousValue = prevPeriod ? company.metrics[metricName]?.[prevPeriod] : undefined;
                                                    
                                                    let changeIndicator = null;
                                                    // Note: No need for a null check on currentValue here, as formatMetricValue now handles it.
                                                    if (currentValue != null && previousValue != null) {
                                                        if (currentValue > previousValue) {
                                                            changeIndicator = <span className="arrow-indicator ml-2 text-green-400">▲</span>;
                                                        } else if (currentValue < previousValue) {
                                                            changeIndicator = <span className="arrow-indicator ml-2 text-red-500">▼</span>;
                                                        }
                                                    }
                                                    
                                                    return (
                                                        <td key={company.ticker} className="metric-table-cell p-3 text-left text-gray-300">
                                                            <div className="value-container flex items-center">
                                                                <span>{formatMetricValue(metricName, currentValue)}</span>
                                                                {changeIndicator}
                                                            </div>
                                                        </td>
                                                    );
                                                }
                                                
                                                const rank = rankMap.get(company.ticker);
                                                return (
                                                    <td key={company.ticker} className={getComparisonMetricStyles(metricName, currentValue, rank ?? -1, totalRanked, worstRank ?? -1)}>
                                                        {formatMetricValue(metricName, currentValue)}
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