'use client';

import { useState, useEffect, use, useRef } from 'react';
import Link from 'next/link';
import { FinancialData, ComprehensiveData } from '@/lib/types';
import SkeletonTable from '@/components/SkeletonTable';
import FinancialTable from '@/components/FinancialTable';
import ComprehensiveView from '@/components/ComprehensiveView';

export default function FinancialsPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = use(params);

  const [activeView, setActiveView] = useState<'overview' | 'financials'>('overview');
  const [statementType, setStatementType] = useState<string | null>(null);
  const [isFinancialsOpen, setIsFinancialsOpen] = useState(false);
  const financialsRef = useRef<HTMLDivElement>(null);
  
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [comprehensiveData, setComprehensiveData] = useState<ComprehensiveData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [years, setYears] = useState<number>(10);

  const clearDataStates = () => {
    setFinancialData(null);
    setComprehensiveData(null);
    setError(null);
  }

  const fetchSingleStatement = async (type: string, numYears: number) => {
    if (!ticker || !type) return;
    setStatementType(type);
    setIsLoading(true);
    clearDataStates();
    try {
      const res = await fetch(`http://127.0.0.1:8000/financial/${ticker}/${type}?years=${numYears}`);
      if (!res.ok) throw new Error((await res.json()).detail);
      const data = await res.json();
      setFinancialData(data);
    } catch (e: any) { setError(e.message); } 
    finally { setIsLoading(false); }
  };

  const fetchComprehensiveData = async (numYears: number) => {
    if (!ticker) return;
    setStatementType(null);
    setIsLoading(true);
    clearDataStates();
    try {
      const res = await fetch(`http://127.0.0.1:8000/financial/${ticker}/comprehensive?periods=${numYears}`);
      if (!res.ok) throw new Error((await res.json()).detail);
      const data = await res.json();
      setComprehensiveData(data);
      if(!companyName) setCompanyName(data.company_info.name);
    } catch (e: any) { setError(e.message); }
    finally { setIsLoading(false); }
  }
  
  useEffect(() => {
    fetchComprehensiveData(years);
  }, [ticker]);

  useEffect(() => {
    if (activeView === 'overview') {
        fetchComprehensiveData(years);
    } else if (statementType) {
        fetchSingleStatement(statementType, years);
    }
  }, [years]);

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (financialsRef.current && !financialsRef.current.contains(event.target as Node)) {
        setIsFinancialsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [financialsRef]);


  const handleStatementSelect = (type: string) => {
    setActiveView('financials');
    fetchSingleStatement(type, years);
    setIsFinancialsOpen(false); // Close dropdown after selection
  }

  return (
    <main className="p-4 md:p-8 bg-gray-900 text-gray-200 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
            <Link href="/" className="inline-flex items-center gap-2 text-blue-400 hover:underline text-sm font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                Back to Search
            </Link>
        </div>

        <h1 className="text-3xl font-bold mb-2 text-white">{companyName || ticker.toUpperCase()}</h1>
        <p className="text-lg text-gray-400 mb-6">Select a view to analyze the company's financial data.</p>

        <div className="flex flex-wrap items-center gap-4 border-b border-gray-700 pb-4">
          <button onClick={() => { setActiveView('overview'); fetchComprehensiveData(years); }} className={`px-4 py-2 font-semibold rounded-md transition-colors duration-200 ${activeView === 'overview' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>Overview</button>
          
          {/* Financials Dropdown Button */}
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
            <label htmlFor="years-select" className="sr-only">Number of Years</label>
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

        <div className="mt-8">
            {isLoading && <SkeletonTable />}
            {error && <p className="text-center text-red-400 p-4 bg-red-900 bg-opacity-30 rounded-lg">Error: {error}</p>}
            {comprehensiveData && activeView === 'overview' && <ComprehensiveView data={comprehensiveData} />}
            {financialData && activeView === 'financials' && <FinancialTable data={financialData} />}
        </div>
      </div>
    </main>
  );
}