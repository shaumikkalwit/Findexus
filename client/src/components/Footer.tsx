'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AboutModal from './AboutModal';
import ContactModal from './ContactModal';
import { supabase } from '@/lib/supabaseClient'; 
import type { Session } from '@supabase/supabase-js'; 

// A simple component for the social/link icons
const IconLink = ({ href, children }: { href: string, children: React.ReactNode }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="social-icon-link text-gray-400 hover:text-white transition-colors">
        {children}
    </a>
);

export default function Footer() {
    const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);
    
    const [session, setSession] = useState<Session | null>(null);
    const [showSignInToast, setShowSignInToast] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (showSignInToast) {
            const timer = setTimeout(() => {
                setShowSignInToast(false);
            }, 3000); // Hide after 3 seconds
            return () => clearTimeout(timer);
        }
    }, [showSignInToast]);

    const handleContactClick = () => {
        if (session) {
            setIsContactModalOpen(true);
        } else {
            setShowSignInToast(true);
        }
    };

    return (
        <>
            <ContactModal 
                isOpen={isContactModalOpen} 
                onClose={() => setIsContactModalOpen(false)}
                userEmail={session?.user?.email}
            />
            <AboutModal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} />

            {showSignInToast && (
                <div className="toast-container fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white py-2 px-5 rounded-full shadow-lg border border-slate-700 z-50 flex items-center gap-2 animate-fade-in-up">
                    <svg className="toast-icon w-4 h-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                    </svg>
                    <p className="toast-text text-sm">Please sign in to view.</p>
                </div>
            )}
            
            <footer className="site-footer bg-gray-800 border-t border-gray-700 mt-auto">
                <div className="footer-content-container max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                    <div className="footer-grid grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                        {/* Column 1: Profile Info */}
                        <div className="profile-container flex-1 flex justify-start">
                            <div className="profile-card flex items-center gap-4">
                                <img 
                                    className="profile-image h-12 w-12 rounded-full object-cover" 
                                    src="https://placehold.co/64x64/2D3748/E2E8F0?text=SK" // Placeholder for the profile image
                                    alt="Shaumik Kalwit" 
                                />
                                <div className="profile-text">
                                    <h3 className="profile-name text-base font-semibold text-white">Shaumik Kalwit</h3>
                                    <p className="profile-title text-xs text-gray-400">Software Engineer</p>
                                    <div className="social-links flex items-center gap-3 mt-1">
                                        <IconLink href="https://github.com/shaumikkalwit">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.168 6.839 9.49.5.092.682-.217.682-.482 0-.237-.009-.868-.014-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.031-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.378.203 2.398.1 2.651.64.7 1.03 1.595 1.03 2.688 0 3.848-2.338 4.695-4.566 4.943.359.308.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.001 10.001 0 0022 12c0-5.523-4.477-10-10-10z" clipRule="evenodd" /></svg>
                                        </IconLink>
                                        <IconLink href="https://linkedin.com/in/shaumikkalwit/">
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                                        </IconLink>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Column 2: Copyright */}
                        <div className="copyright-container text-center text-sm text-gray-400">
                            <p className="copyright-text">© 2025 Findexus. All Rights Reserved.</p>
                        </div>

                        {/* Column 3: Links */}
                        <div className="footer-links-container flex-1 flex justify-end">
                            <nav className="footer-navigation flex items-center justify-center md:justify-end gap-6">
                                <Link href="/privacy" className="footer-nav-link text-sm text-gray-400 hover:text-white transition-colors">Privacy Policy</Link>
                                <button onClick={handleContactClick} className="footer-nav-link text-sm text-gray-400 hover:text-white transition-colors">Contact</button>
                                <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="footer-nav-link text-sm text-gray-400 hover:text-white transition-colors">GitHub</a>
                                <button onClick={() => setIsAboutModalOpen(true)} className="footer-nav-link text-sm text-gray-400 hover:text-white transition-colors">About</button>
                            </nav>
                        </div>
                    </div>
                </div>
            </footer>
        </>
    );
}

