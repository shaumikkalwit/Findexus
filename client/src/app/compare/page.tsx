'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import AddCompanyModal from '@/components/AddCompanyModal';
import ComparisonTable from '@/components/ComparisonTable';
import SkeletonTable from '@/components/SkeletonTable';
import { ComprehensiveData, CompanyComparisonData } from '@/lib/types';
import MainContent from '@/components/MainContent';
import { useQueries } from '@tanstack/react-query';

// Simple fetcher for one company, this gets called by useQueries for each ticker
const fetchCompanyData = async (ticker: string, years: number, session: Session | null) => {
    if (!session) throw new Error("Not authenticated");

    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
    const url = `${apiBaseUrl}/api/financial/${ticker}/comprehensive?periods=${years}`;

    const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`Failed to fetch data for ${ticker}: ${errorData.detail}`);
    }
    return res.json();
};


function ComparePageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // Basic state for auth and UI toggles
    const [session, setSession] = useState<Session | null>(null);
    const [loadingAuth, setLoadingAuth] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [years, setYears] = useState<number>(5);

    // Get the list of tickers to compare from the URL, e,g, ?tickers=AAPL,MSFT
    const tickers = useMemo(() => searchParams.get('tickers')?.toUpperCase().split(',') || [], [searchParams]);
    const [initialTicker] = useState<string>(tickers[0] || '');


    // Standard useEffect for handling user authentication
    useEffect(() => {
        const getSession = async () => {
            const { data } = await supabase.auth.getSession();
            setSession(data.session);
            setLoadingAuth(false);
        };
        getSession();

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (!session) router.push('/');
        });

        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, [router]);

    // This is the cool part, useQueries is for fetching a dynamic list of things
    const queryResults = useQueries({
        // Map over our list of tickers and create a query for each one
        queries: tickers.map(ticker => {
            return {
                queryKey: ['companyData', ticker, years],
                queryFn: () => fetchCompanyData(ticker, years, session),
                enabled: !!session, // Only run when the user is logged in
            }
        })
    });

    // Process the results from all the queries
    // If ANY of them are loading, the whole page is loading
    const isLoading = queryResults.some(result => result.isLoading);
    // Find the FIRST error if any of them failed
    const errorResult = queryResults.find(result => result.isError);
    
    // useMemo to format the successful data without re-calculating on every render
    const { comparisonData, periods } = useMemo(() => {
        // Filter out any queries that failed and just get the successful data
        const validData = queryResults
            .filter(result => result.isSuccess && result.data)
            .map(result => result.data as ComprehensiveData);

        const allPeriods = new Set<string>();
        const formattedData: CompanyComparisonData[] = validData.map(data => {
            data.periods.forEach(p => allPeriods.add(p));
            return {
                ticker: data.company_info.ticker,
                name: data.company_info.name,
                metrics: data.key_metrics,
            };
        });

        return {
            comparisonData: formattedData,
            periods: Array.from(allPeriods).sort().reverse()
        };
    }, [queryResults]);


    // Event handlers are way simpler now, they just update the URL
    // TanStack Query sees the URL change, the 'tickers' array updates, and it all re-fetches automatically
    const updateURL = (newTickers: string[]) => {
        const uniqueTickers = [...new Set(newTickers.map(t => t.toUpperCase()))];
        router.replace(`/compare?tickers=${uniqueTickers.join(',')}`, { scroll: false });
    }

    const handleAddCompany = (newTicker: string) => {
        const upperTicker = newTicker.toUpperCase();
        if (!tickers.includes(upperTicker)) {
            updateURL([...tickers, upperTicker]);
        }
        setIsModalOpen(false);
    };

    const handleRemoveCompany = (tickerToRemove: string) => {
        const newTickerList = tickers.filter(t => t.toUpperCase() !== tickerToRemove.toUpperCase());
        if (newTickerList.length === 0) {
            router.push('/');
        } else {
            updateURL(newTickerList);
        }
    };


    if (loadingAuth) {
        return <main className="flex items-center justify-center min-h-screen">Loading...</main>;
    }

    return (
        <MainContent>
            {isModalOpen && <AddCompanyModal onAdd={handleAddCompany} onClose={() => setIsModalOpen(false)} />}
            
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

            {/* Final render logic based on the combined state of all our queries */}
            <div className="mt-8">
                {isLoading && <SkeletonTable />}
                {errorResult && <p className="text-center text-red-400 p-4">{(errorResult.error as Error).message}</p>}
                {!isLoading && !errorResult && comparisonData.length > 0 && <ComparisonTable periods={periods} data={comparisonData} onRemove={handleRemoveCompany} />}
            </div>
        </MainContent>
    );
}

// This wrapper just helps with Next,js page loading stuff
export default function ComparePage() {
    return (
        <Suspense fallback={<div className="bg-gray-900 min-h-screen"></div>}>
            <ComparePageContent />
        </Suspense>
    );
}