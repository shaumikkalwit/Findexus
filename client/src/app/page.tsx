'use client'; // This directive makes it a Client Component

import { useState } from 'react';
import { useRouter } from 'next/navigation'; // Use this for navigation

export default function HomePage() {
  const [ticker, setTicker] = useState('');
  const router = useRouter(); // Hook to control routing

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault(); // Prevent the form from reloading the page
    if (ticker.trim()) {
      // Navigate to the dynamic page with the entered ticker
      router.push(`/financials/${ticker.trim().toLowerCase()}`);
    }
  };

  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-800">
          Financial Statement Analysis
        </h1>
        <p className="text-center text-gray-500">
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
              className="w-full px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-300"
          >
            Search
          </button>
        </form>
      </div>
    </main>
  );
}