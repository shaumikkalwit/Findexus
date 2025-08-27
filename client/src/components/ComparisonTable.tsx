'use client';

import MetricComparisonCard from './MetricComparisonCard';

interface ComparisonTableProps {
    periods: string[];
    data: any[]; // Array of company data
    onRemove: (ticker: string) => void;
}

export default function ComparisonTable({ periods, data, onRemove }: ComparisonTableProps) {
    if (!data || data.length === 0) return null;

    const metrics = Object.keys(data[0].metrics);

    return (
        <div className="space-y-4">
            {metrics.map(metricName => (
                <MetricComparisonCard
                    key={metricName}
                    metricName={metricName}
                    periods={periods}
                    data={data}
                    onRemove={onRemove}
                />
            ))}
        </div>
    );
}
