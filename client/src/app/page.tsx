'use client'; 

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; 
import { supabase } from '@/lib/supabaseClient';
import type { Session } from '@supabase/supabase-js';
import DisclaimerBanner from '@/components/DisclaimerBanner';

export default function HomePage() {
  const [ticker, setTicker] = useState('');
  const router = useRouter(); 
  
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [disclaimerAcknowledged, setDisclaimerAcknowledged] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('disclaimerAcknowledged') === 'true';
    }
    return false;
  });
  const [showBanner, setShowBanner] = useState(false);
  
  const [showAcknowledgeMessage, setShowAcknowledgeMessage] = useState(false);

  useEffect(() => {
    if (!disclaimerAcknowledged) {
      setShowBanner(true);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);
  
  useEffect(() => {
    if (showAcknowledgeMessage) {
      const timer = setTimeout(() => {
        setShowAcknowledgeMessage(false);
      }, 3000); 
      return () => clearTimeout(timer);
    }
  }, [showAcknowledgeMessage]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault(); 
    if (ticker.trim()) {
      router.push(`/financials/${ticker.trim().toLowerCase()}`);
    }
  };

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
  };
  
  const handleLoginClick = () => {
    if (!disclaimerAcknowledged) {
      setShowAcknowledgeMessage(true);
    } else {
      handleLogin();
    }
  };
  
  const handleAcknowledge = () => {
    localStorage.setItem('disclaimerAcknowledged', 'true');
    setShowBanner(false);
    setDisclaimerAcknowledged(true);
  };

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white">Loading...</div>
      </main>
    );
  }

  if (session) {
    return (
      <main className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-lg relative">
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

  return (
      <main className="flex items-center justify-center min-h-screen bg-gray-900">
        <DisclaimerBanner show={showBanner} onAcknowledge={handleAcknowledge} />
        <div className="w-full max-w-sm p-8 space-y-6 bg-gray-800 rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold text-center text-white">
                Welcome to Findexus
            </h1>
            <p className="text-center text-gray-400">
                Please acknowledge the disclaimer to log in.
            </p>
            <div>
              <div onClick={handleLoginClick} className="cursor-pointer">
                <button
                  className={`
                    w-full flex items-center justify-center gap-3 px-4 py-2 font-semibold text-white bg-gray-700 rounded-md 
                    hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 
                    focus:ring-gray-500 transition-colors duration-300 
                    ${!disclaimerAcknowledged ? 'bg-gray-600 opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/><path fill="#34A853" d="M24 46c5.94 0 10.92-1.96 14.56-5.32l-7.11-5.52c-1.96 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.38v5.7C7.88 41.13 15.4 46 24 46z"/><path fill="#FBBC05" d="M11.69 28.18c-.38-1.13-.6-2.33-.6-3.58s.22-2.45.6-3.58V15.32H4.38C2.9 18.21 2 21.5 2 25s.9 6.79 2.38 9.68l7.31-5.7z"/><path fill="#EA4335" d="M24 10.75c3.23 0 6.06 1.11 8.31 3.26l6.28-6.28C34.92 2.86 29.94 0 24 0 15.4 0 7.88 4.87 4.38 12.62l7.31 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/><path fill="none" d="M0 0h48v48H0z"/></svg>
                  Log in with Google
                </button>
              </div>
              <div 
                className={`
                  text-center overflow-hidden transition-all duration-300 ease-in-out
                  ${showAcknowledgeMessage ? 'max-h-10 mt-4' : 'max-h-0'} 
                `}
              >
                <p className="text-sm text-yellow-400 animate-pulse">
                  Please acknowledge the disclaimer first.
                </p>
              </div>
            </div>
        </div>
      </main>
  );
}

