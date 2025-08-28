'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AddCompanyModal from '@/components/AddCompanyModal';
import ComparisonTable from '@/components/ComparisonTable';
import SkeletonTable from '@/components/SkeletonTable';
import { ComprehensiveData } from '@/lib/types';

// A helper type for the data structure we'll store in state
type CompanyComparisonData = {
    ticker: string;
    name: string;
    metrics: ComprehensiveData['key_metrics'];
};

function ComparePageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // This function is now only used for the initial setup
    const getTickersFromURL = () => searchParams.get('tickers')?.split(',') || [];

    // This state tracks the tickers in the URL for updating it
    const [tickers, setTickers] = useState<string[]>(getTickersFromURL);
    const [initialTicker] = useState<string>(getTickersFromURL()[0] || '');

    // This state will hold the actual financial data for the companies
    const [comparisonData, setComparisonData] = useState<CompanyComparisonData[]>([]);
    const [periods, setPeriods] = useState<string[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [years, setYears] = useState<number>(5);

    const fetchInitialData = async (tickersToFetch: string[], numYears: number) => {
        if (tickersToFetch.length === 0) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError(null);
        
        try {
            // Fetch all companies' comprehensive data concurrently
            const promises = tickersToFetch.map(ticker =>
                fetch(`http://127.0.0.1:8000/financial/${ticker}/comprehensive?periods=${numYears}`)
                    .then(res => {
                        if (!res.ok) throw new Error(`Failed to fetch data for ${ticker}`);
                        return res.json();
                    })
            );

            const results: ComprehensiveData[] = await Promise.all(promises);
            
            const allPeriods = new Set<string>();
            const formattedData: CompanyComparisonData[] = results.map(data => {
                data.periods.forEach(p => allPeriods.add(p));
                return {
                    ticker: data.company_info.ticker,
                    name: data.company_info.name,
                    metrics: data.key_metrics,
                };
            });

            setPeriods(Array.from(allPeriods).sort().reverse());
            setComparisonData(formattedData);

        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(false);
        }
    };

    // This effect runs only when the component first mounts or if the years change
    // It no longer depends on the 'tickers' state
    useEffect(() => {
        const initialTickers = getTickersFromURL();
        fetchInitialData(initialTickers, years);
    }, [years]); // We keep 'years' so the user can refetch data for a different time period

    const updateURL = (newTickers: string[]) => {
        const uniqueTickers = [...new Set(newTickers.map(t => t.toUpperCase()))];
        setTickers(uniqueTickers); // Keep this to track the current URL state
        router.replace(`/compare?tickers=${uniqueTickers.join(',')}`);
    }

    const handleAddCompany = async (newTicker: string) => {
        const upperTicker = newTicker.toUpperCase();
        if (comparisonData.some(c => c.ticker === upperTicker)) {
            setIsModalOpen(false);
            return; // Don't add if it already exists
        }

        // Set a more specific loading state to avoid showing the full skeleton
        const originalLoadingState = isLoading;
        setIsLoading(true);
        try {
            const res = await fetch(`http://127.0.0.1:8000/financial/${upperTicker}/comprehensive?periods=${years}`);
            if (!res.ok) throw new Error((await res.json()).detail);
            const data: ComprehensiveData = await res.json();

            // Add the new company data to the existing state
            const newData: CompanyComparisonData = {
                ticker: data.company_info.ticker,
                name: data.company_info.name,
                metrics: data.key_metrics,
            };
            
            // Update periods if the new company has different ones
            const newPeriods = new Set([...periods, ...data.periods]);
            setPeriods(Array.from(newPeriods).sort().reverse());
            
            setComparisonData(prevData => [...prevData, newData]);
            
            // Update the URL to reflect the new state
            updateURL([...tickers, upperTicker]);

        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsLoading(originalLoadingState);
            setIsModalOpen(false);
        }
    };

    const handleRemoveCompany = (tickerToRemove: string) => {
        // Remove from the data state instantly (no API call)
        const newComparisonData = comparisonData.filter(c => c.ticker !== tickerToRemove);
        setComparisonData(newComparisonData);

        // Update the URL
        const newTickerList = tickers.filter(t => t !== tickerToRemove);
        if (newTickerList.length === 0) {
            router.push('/');
        } else {
            updateURL(newTickerList);
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
                    {comparisonData.length > 0 && <ComparisonTable periods={periods} data={comparisonData} onRemove={handleRemoveCompany} />}
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
