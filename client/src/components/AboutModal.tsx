'use client';

import { useEffect } from 'react';

interface AboutModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
    // Effect to handle closing the modal with the Escape key
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEsc);
        return () => {
            window.removeEventListener('keydown', handleEsc);
        };
    }, [onClose]);

    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 transition-opacity duration-300"
            onClick={onClose} // Close modal on overlay click
        >
            <div 
                className="bg-gray-800 rounded-lg shadow-2xl p-8 w-full max-w-2xl mx-4 transform transition-all duration-300"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">About Findexus</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <div className="text-gray-300 space-y-4">
                    <h3 className="text-lg font-semibold text-gray-100">Motivation</h3>
                    <p>
                        I've always been interested in stocks and investing. ETFs and index funds have always been my go-to form
                        of investing, but recently I wanted to also put money into individual companies I feel like would grow over
                        the long-term. <br></br>
                    </p>
                    <p>
                        In doing so, this came with a good amount of reading the financial documents of the company.
                        A lot of these financial documents were hard to access <em>and</em> time-consuming to read for multiple years. I tried searching
                        for alternatives but the best thing I found was viewing them in the past five years, while anything longer and you had to pay. <br></br>
                    </p>
                    <p>
                        So, <b>I decided to fix this.</b>
                    </p>
                    <p>
                        Here, you simply have to login with your Gmail, and you have access to companies'
                        income statements, balance sheets, and cashflow statements until 2009.
                    </p>
                    <img src="./public/placeholderimg.jpeg" alt="Financials"/>

                    <p>
                        You can also access common ratios I used for valuation when looking at these companies.
                    </p>
                    <img src="./public/placeholderimg.jpeg" alt="Overview"/>

                    <p>
                        And, you can also compare companies with each other.
                    </p>
                    <img src="./public/placeholderimg.jpeg" alt="Compare"/>
                </div>
            </div>
        </div>
    );
}