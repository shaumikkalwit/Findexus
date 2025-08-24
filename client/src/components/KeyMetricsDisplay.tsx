export default function KeyMetricsDisplay({ metrics }: { metrics: { [key: string]: number }}) {
    const metricItems = Object.entries(metrics);
    if (metricItems.length === 0) return <p className="text-gray-400 mt-4">No key metrics available.</p>;

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-2">
            {metricItems.map(([key, value]) => (
                <div key={key} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                    <p className="text-sm text-gray-400 capitalize">{key.replace(/_/g, ' ')}</p>
                    {/* Display ratios as percentages */}
                    <p className="text-xl font-semibold text-white">{(value * 100).toFixed(2)}%</p>
                </div>
            ))}
        </div>
    )
}
