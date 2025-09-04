'use client'; 

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; 
import { supabase } from '@/lib/supabaseClient'; // Import the Supabase client
import type { Session } from '@supabase/supabase-js';
import DisclaimerBanner from '@/components/DisclaimerBanner';

export default function HomePage() {
  const [ticker, setTicker] = useState('');
  const router = useRouter(); 
  
  // --- NEW: State to hold the user's session ---
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // --- NEW: Check for a logged-in user on component mount ---
  useEffect(() => {
    const getSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error getting session:", error);
      }
      setSession(data.session);
      setLoading(false);
    };

    getSession();

    // Listen for changes in authentication state (e.g., login, logout)
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // Clean up the listener when the component unmounts
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault(); 
    if (ticker.trim()) {
      router.push(`/financials/${ticker.trim().toLowerCase()}`);
    }
  };

  // --- NEW: Login and Logout Handlers ---
  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
  };
  
  // --- NEW: Conditional Rendering ---
  // Show a loading state while checking for a session
  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white">Loading...</div>
      </main>
    );
  }

  // If there is a logged-in user, show the search page
  if (session) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-lg relative">
          {/* The logout button that was here has been removed */}
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

  // If no user is logged in, show the login page
  return (
      <>
        <DisclaimerBanner />
        <main className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="w-full max-w-sm p-8 space-y-6 bg-gray-800 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-center text-white">
            Welcome to Findexus
          </h1>
          <p className="text-center text-gray-400">
            Please log in to continue.
          </p>
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 px-4 py-2 font-semibold text-white bg-gray-700 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-500 transition-colors duration-300"
          >
            <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z" /><path fill="#34A853" d="M24 46c5.94 0 10.92-1.96 14.56-5.32l-7.11-5.52c-1.96 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.38v5.7C7.88 41.13 15.4 46 24 46z" /><path fill="#FBBC05" d="M11.69 28.18c-.38-1.13-.6-2.33-.6-3.58s.22-2.45.6-3.58V15.32H4.38C2.9 18.21 2 21.5 2 25s.9 6.79 2.38 9.68l7.31-5.7z" /><path fill="#EA4335" d="M24 10.75c3.23 0 6.06 1.11 8.31 3.26l6.28-6.28C34.92 2.86 29.94 0 24 0 15.4 0 7.88 4.87 4.38 12.62l7.31 5.7c1.73-5.2 6.58-9.07 12.31-9.07z" /><path fill="none" d="M0 0h48v48H0z" /></svg>
            Log in with Google
          </button>
        </div>
        </main>
      </>
  );
}
