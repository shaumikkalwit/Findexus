'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import type { Session, User } from '@supabase/supabase-js';

export default function Header() {
    const [user, setUser] = useState<User | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isClient, setIsClient] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setIsClient(true);

        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
        };
        getSession();

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            authListener?.subscription.unsubscribe();
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setIsMenuOpen(false);
    };

    const userAvatarUrl = user?.user_metadata?.avatar_url;

    return (
        <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-20">
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Reduced header height from h-16 to h-14 */}
                <div className="flex items-center justify-between h-14">
                    <div className="flex items-center">
                        {/* Reduced font size from text-2xl to text-xl */}
                        <Link href="/" className="text-xl font-bold text-white hover:text-gray-300 transition-colors">
                            Findexus
                        </Link>
                    </div>
                    <div className="flex items-center">
                        {isClient && user && (
                            <div className="relative" ref={menuRef}>
                                <button 
                                    onClick={() => setIsMenuOpen(!isMenuOpen)} 
                                    // Reduced avatar size from w-10 h-10 to w-9 h-9
                                    className="flex items-center justify-center w-9 h-9 bg-gray-800 rounded-full hover:bg-gray-700 transition text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500"
                                >
                                    {userAvatarUrl ? (
                                        <img src={userAvatarUrl} alt="User Avatar" className="w-full h-full rounded-full" />
                                    ) : (
                                        <span className="font-semibold text-base">{user.email?.charAt(0).toUpperCase()}</span>
                                    )}
                                </button>
                                
                                {isMenuOpen && (
                                    <div 
                                        className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 z-10 transition ease-out duration-100"
                                        style={{ transform: isMenuOpen ? 'scale(1)' : 'scale(0.95)', opacity: isMenuOpen ? 1 : 0 }}
                                    >
                                        <div className="py-1">
                                            <div className="px-4 py-3 border-b border-gray-700">
                                                <p className="text-sm text-gray-400">Signed in as</p>
                                                <p className="text-sm font-medium text-white truncate">{user.email}</p>
                                            </div>
                                            <a
                                                onClick={handleLogout}
                                                className="flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-gray-700 hover:text-red-300 cursor-pointer transition-colors"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                                                </svg>
                                                Logout
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </nav>
        </header>
    );
}
