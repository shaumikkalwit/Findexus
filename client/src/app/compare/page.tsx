'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AddCompanyModal from '@/components/AddCompanyModal';
import ComparisonTable from '@/components/ComparisonTable';
import SkeletonTable from '@/components/SkeletonTable';

// A wrapper component is needed to use useSearchParams within a Client Component
function ComparePageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // Get the initial list of tickers from the URL when the component first loads
    const getTickersFromURL = () => searchParams.get('tickers')?.split(',') || [];

    const [tickers, setTickers] = useState<string[]>(getTickersFromURL);
    // Store the very first ticker from the URL and never change it
    const [initialTicker] = useState<string>(getTickersFromURL()[0] || '');

    const [comparisonData, setComparisonData] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [years, setYears] = useState<number>(5);

    const fetchComparisonData = async (tickersToFetch: string[], numYears: number) => {
        if (tickersToFetch.length === 0) {
            setComparisonData(null);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`http://127.0.0.1:8000/financials/compare?periods=${numYears}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tickersToFetch)
            });
            if (!res.ok) throw new Error((await res.json()).detail);
            const data = await res.json();
            setComparisonData(data);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchComparisonData(tickers, years);
    }, [tickers, years]);

    const updateTickers = (newTickers: string[]) => {
        setTickers(newTickers);
        const newQuery = newTickers.join(',');
        // We use router.replace to avoid polluting the browser history
        router.replace(`/compare?tickers=${newQuery}`);
    }

    const handleAddCompany = (newTicker: string) => {
        if (!tickers.includes(newTicker)) {
            updateTickers([...tickers, newTicker]);
        }
        setIsModalOpen(false);
    };

    const handleRemoveCompany = (tickerToRemove: string) => {
        const newTickerList = tickers.filter(t => t !== tickerToRemove);
        if (newTickerList.length === 0) {
            router.push('/');
        } else {
            updateTickers(newTickerList);
        }
    };

    return (
        <main className="p-4 md:p-8 bg-gray-900 text-gray-200 min-h-screen">
            {isModalOpen && <AddCompanyModal onAdd={handleAddCompany} onClose={() => setIsModalOpen(false)} />}
            <div className="max-w-7xl mx-auto">
                <div className="mb-6 flex justify-between items-center">
                    <Link href="/" className="inline-flex items-center gap-2 text-blue-400 hover:underline text-sm font-medium">
                        &larr; Back to Search
                    </Link>
                    {initialTicker && (
                        <Link href={`/financials/${initialTicker.toLowerCase()}`} className="px-3 py-1 text-sm font-semibold text-white bg-gray-700 rounded-md hover:bg-gray-600 transition">
                           Back to {initialTicker} Overview
                        </Link>
                    )}
                </div>
                <div className="flex items-center gap-4 mb-6">
                    <h1 className="text-3xl font-bold text-white">Company Comparison</h1>
                    <button 
                        onClick={() => setIsModalOpen(true)} 
                        className="flex items-center justify-center w-8 h-8 bg-gray-700 rounded-full hover:bg-blue-600 transition text-white"
                        aria-label="Add Company"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                    </button>
                    <div className="relative ml-auto">
                        <select 
                            id="years-select"
                            value={years}
                            onChange={(e) => setYears(Number(e.target.value))}
                            className="appearance-none bg-gray-700 border border-gray-600 rounded-md py-2 pl-3 pr-8 text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="5">5 Years</option>
                            <option value="10">10 Years</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                           <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                        </div>
                    </div>
                </div>

                <div className="mt-8">
                    {isLoading && <SkeletonTable />}
                    {error && <p className="text-center text-red-400 p-4">{error}</p>}
                    {comparisonData && <ComparisonTable periods={comparisonData.periods} data={comparisonData.data} onRemove={handleRemoveCompany} />}
                </div>
            </div>
        </main>
    );
}

export default function ComparePage() {
    return (
        <Suspense fallback={<div className="bg-gray-900 min-h-screen"></div>}>
            <ComparePageContent />
        </Suspense>
    );
}