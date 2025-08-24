export default function SkeletonTable() {
    return (
        <div className="overflow-x-auto mt-6 animate-pulse">
            <div className="w-full bg-gray-800 border border-gray-700 rounded-lg shadow-sm">
                <div className="bg-gray-700 h-12 rounded-t-lg"></div>
                {[...Array(15)].map((_, i) => (
                    <div key={i} className="flex items-center p-3 border-b border-gray-700">
                        <div className="h-4 bg-gray-600 rounded w-1/4"></div>
                        <div className="flex-1 flex justify-end space-x-4">
                            <div className="h-4 bg-gray-600 rounded w-16"></div>
                            <div className="h-4 bg-gray-600 rounded w-16"></div>
                            <div className="h-4 bg-gray-600 rounded w-16"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
