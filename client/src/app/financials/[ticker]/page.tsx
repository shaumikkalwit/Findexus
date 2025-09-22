'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import { FinancialData, ComprehensiveData } from '@/lib/types';
import SkeletonTable from '@/components/SkeletonTable';
import FinancialTable from '@/components/FinancialTable';
import ComprehensiveView from '@/components/ComprehensiveView';
import AddCompanyModal from '@/components/AddCompanyModal';
import MainContent from '@/components/MainContent';
import { useQuery } from '@tanstack/react-query';

// Main fetcher function for TanStack Query to call
const fetchFinancialData = async ({ queryKey, session }: { queryKey: (string | number)[], session: Session | null }) => {
  const [_key, ticker, type, years] = queryKey;

  // Basic checks before we even try to fetch
  if (!session) throw new Error("Not authenticated");
  if (!ticker) throw new Error("Ticker is required");

  let url = '';
  if (type === 'overview') {
    url = `/api/financial/${ticker}/comprehensive?periods=${years}`;
  } else {
    url = `/api/financial/${ticker}/${type}?years=${years}`;
  }
  
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
  const fullUrl = `${apiBaseUrl}${url}`;

  const res = await fetch(fullUrl, {
    headers: { 'Authorization': `Bearer ${session.access_token}` }
  });

  // If the fetch fails, throw an error so useQuery can catch it
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.detail || "An error occurred while fetching data.");
  }
  return res.json();
};

export default function FinancialsPage() {
  const router = useRouter();
  const params = useParams();
  const ticker = params.ticker as string; // Grabs the ticker from the url, like 'aapl'

  // State for auth and general UI stuff
  const [session, setSession] = useState<Session | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [activeView, setActiveView] = useState<'overview' | 'financials'>('overview');
  const [statementType, setStatementType] = useState<string>('overview');
  const [isFinancialsOpen, setIsFinancialsOpen] = useState(false);
  const financialsRef = useRef<HTMLDivElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [years, setYears] = useState<number>(10);

  // useEffect to handle user authentication
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

  // Another useEffect to close the financials dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (financialsRef.current && !financialsRef.current.contains(event.target as Node)) {
        setIsFinancialsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [financialsRef]);

  // The main TanStack Query hook that handles all our data fetching
  const { data, isLoading, isError, error } = useQuery({
    // This key is crucial, if any part changes, the data re-fetches automatically
    queryKey: ['financialData', ticker, statementType, years], 
    queryFn: () => fetchFinancialData({ queryKey: ['financialData', ticker, statementType, years], session }),
    // Don't run the query until we have the session and ticker
    enabled: !!session && !!ticker,
  });

  // Click handlers for the various buttons
  const handleAddCompany = (newTicker: string) => {
    router.push(`/compare?tickers=${ticker.toUpperCase()},${newTicker.toUpperCase()}`);
    setIsModalOpen(false);
  };
  
  const handleViewChange = (view: 'overview' | 'financials') => {
    setActiveView(view);
    if (view === 'overview') {
      setStatementType('overview');
    }
  };

  const handleStatementSelect = (type: string) => {
    setActiveView('financials');
    setStatementType(type); // Changing this state triggers the re-fetch
    setIsFinancialsOpen(false);
  };

  // Show a loading screen while auth is being checked
  if (loadingAuth) {
    return <main className="flex items-center justify-center min-h-screen">Loading...</main>;
  }
  
  // Use the fetched data for the company name, or fallback to the ticker
  const companyName = data?.company_info?.name || ticker?.toUpperCase();

  return (
    <MainContent>
      {isModalOpen && <AddCompanyModal onAdd={handleAddCompany} onClose={() => setIsModalOpen(false)} />}
      
      <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-blue-400 hover:underline text-sm font-medium">
              &larr; Back to Search
          </Link>
      </div>
      
      <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold text-white">{companyName}</h1>
          <button onClick={() => setIsModalOpen(true)} className="text-blue-400 hover:text-blue-300 font-semibold text-sm flex items-center gap-1">
              [+ Add to Compare]
          </button>
      </div>
      <p className="text-lg text-gray-400 mt-2 mb-6">Select a view to analyze financial data</p>

      <div className="flex flex-wrap items-center gap-4 border-b border-gray-700 pb-4">
          <button onClick={() => handleViewChange('overview')} className={`px-4 py-2 font-semibold rounded-md ${activeView === 'overview' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>Overview</button>
          
          <div className="relative" ref={financialsRef}>
              <button onClick={() => setIsFinancialsOpen(!isFinancialsOpen)} className={`px-4 py-2 font-semibold rounded-md transition-colors duration-200 flex items-center gap-2 ${activeView === 'financials' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
              Financials
              <svg className={`w-4 h-4 transition-transform ${isFinancialsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </button>
              {isFinancialsOpen && (
              <div className="absolute top-full mt-2 w-48 bg-gray-700 border border-gray-600 rounded-md shadow-lg z-10">
                  <a onClick={() => handleStatementSelect('income')} className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-600 cursor-pointer">Income Statement</a>
                  <a onClick={() => handleStatementSelect('balance')} className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-600 cursor-pointer">Balance Sheet</a>
                  <a onClick={() => handleStatementSelect('cashflow')} className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-600 cursor-pointer">Cash Flow</a>
              </div>
              )}
          </div>
          
          <div className="relative ml-auto">
              <select 
                  id="years-select"
                  value={years}
                  onChange={(e) => setYears(Number(e.target.value))}
                  className="appearance-none bg-gray-700 border border-gray-600 rounded-md py-2 pl-3 pr-8 text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                  <option value="5">5 Years</option>
                  <option value="10">10 Years</option>
                  {activeView === 'financials' && <option value="15">15 Years</option>}
                  {activeView === 'financials' && <option value="20">20 Years</option>}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
          </div>
      </div>

      {/* Render loading, error, or the correct data table based on the query state */}
      <div className="mt-8">
          {isLoading && <SkeletonTable />}
          {isError && <p className="text-center text-red-400 p-4">{error.message}</p>}
          
          {activeView === 'overview' && data && <ComprehensiveView data={data as ComprehensiveData} />}
          {activeView === 'financials' && data && <FinancialTable data={data as FinancialData} />}
      </div>
    </MainContent>
  );
}