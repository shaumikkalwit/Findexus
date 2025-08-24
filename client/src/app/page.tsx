'use client'; 

import { useState } from 'react';
import { useRouter } from 'next/navigation'; 

export default function HomePage() {
  const [ticker, setTicker] = useState('');
  const router = useRouter(); 

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault(); 
    if (ticker.trim()) {
      router.push(`/financials/${ticker.trim().toLowerCase()}`);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-center text-white">
          Financial Statement Analysis
        </h1>
        <p className="text-center text-gray-400">
          Enter a stock ticker to get started (e.g., AAPL, MSFT, GOOGL).
        </p>
        <form onSubmit={handleSearch} className="space-y-4">
          <div>
            <label htmlFor="ticker-search" className="sr-only">
              Search Ticker
            </label>
            <input
              id="ticker-search"
              type="text"
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              placeholder="Enter stock ticker..."
              className="w-full px-4 py-2 text-gray-300 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 transition-colors duration-300"
          >
            Search
          </button>
        </form>
      </div>
    </main>
  );
}
