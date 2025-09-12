'use client';

import { useEffect } from 'react';
import Image from 'next/image'; // Import the Next.js Image component for optimization

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
                // --- FIX: Added max-h-[80vh] to constrain the modal's height ---
                className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-2xl mx-4 transform transition-all duration-300 flex flex-col max-h-[80vh] border border-slate-700"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
            >
                <div className="flex-shrink-0 p-6 border-b border-slate-700">
                    <div className="flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-white">About Findexus</h2>
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>
                </div>

                {/* --- FIX: Made this content area scrollable --- */}
                <div className="flex-grow p-6 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
                    <p>
                        <b>DISCLAIMER: </b> Data is obtained from public SEC filings.
                    While we strive for accuracy, this information is for informational purposes only and may contain inaccuracies or
                    omissions due to errors while obtaining the information. Common errors are showing quarterly numbers instead of annual, especially around/before 2019 (but most of the ratios still are somewhat accurate). This is also NOT telling you what to invest in, nor is it investment advice.
                    Always verify information and conduct your own research before making any financial decisions.
                    </p>
                    <h3 className="text-lg font-semibold text-slate-100">Motivation</h3>
                    <p>
                        I've always been interested in stocks and investing. ETFs and index funds have always been my go-to form
                        of investing. But as I grew more interested in investing in individual companies for the long term,
                        I ran into a common problem. I wanted to find businesses with a durable competitive advantage.
                    </p>
                    <p>
                        I followed the principles in the book <em>Warren Buffett and the Interpretation of Financial Statements: 
                            The Search for the Company with a Durable Competitive Advantage </em> 
                            written by Mary Buffett and David Clark. While the author's name might raise an eyebrow, 
                            the book is highly regarded for its practical approach. Co-authored by his former daughter-in-law, 
                            Mary Buffett, who had over a decade of firsthand exposure to his principles, and David Clark,
                            a noted portfolio manager, it excels at one thing: demystifying the complex world of financial statements.
                    </p>
                    <p>
                        In trying to implement the practices in this book, required digging through years of financial documents, 
                        a process that was both time-consuming and frustrating. Accessing more than five years of historical data 
                        and key ratios was surprisingly difficult, and most tools that offered it were hidden behind a paywall.
                    </p>
                    <p>
                        So, <b>I decided to fix this.</b> This tool aims to automate Buffett's alleged philosophy from the book, into a clear, quantitative framework for finding companies with a durable 
                        competitive advantage.
                    </p>

                     <h3 className="text-lg font-semibold text-slate-100">How It Works</h3>
                    <p>
                        If you want to use this, simply login with your Gmail, and you have access to companies'
                        income statements, balance sheets, and cashflow statements until 2009. The SEC's EDGAR database, which this tool uses, generally provides comprehensive digital data starting from around that time.
                    </p>
                    {/* <div className="relative w-full h-48 rounded-lg overflow-hidden my-4">
                        <Image src="/placeholderimg.jpeg" alt="Financials" layout="fill" objectFit="cover" />
                    </div> */}

                    <p>
                        You can also access common ratios I used for valuation when looking at these companies.
                    </p>
                     <div className="relative w-full h-96 rounded-lg overflow-hidden my-4">
                        <Image src="/Overview.png" alt="Overview" layout="fill" objectFit="contain" />
                    </div>
                    <p>
                        The numbers/ratios I have are Net Income, Retained Earnings, Gross Margin, Net Margin, Return On Equity (ROE),
                        Years to Pay off Debt, and Capex to Net Income.
                    </p>
                    
                    <ul className="list-disc list-inside space-y-2 text-slate-300">
                        <li><b>Net Income:</b> Total Revenue - Total Expenses, is green/red if it increased/decreased from the previous year respectively.</li>
                        <li><b>Retained Earnings:</b> Beginning Retained Earnings + Net Income - Dividends Paid, is responsible for showing how much the company reinvests its earnings.</li>
                        <li><b>Gross Margin:</b> Total Gross Profit/Revenue, helps show the business' scalability, bigger the business, bigger the margin. I usually look for around 40% gross margin. So, if it is greater than or equal to 40%, it will appear green.</li>
                        <li><b>Net Margin:</b> Net Income/Total Revenue, is a financial ratio that shows the percentage of revenue that remains as profit after all expenses. I look for greater than or equal to 20%, which is when it'll appear green.</li>
                        <li><b>Return On Equity (ROE):</b> Net Income/Total Equity, measures how effectively a company generates profits from the money invested by its shareholders. I look for steady increases over time.</li>
                        <li><b>Years to Pay off Debt:</b> Total Debt/Net Income, to measure debt. An exceptional business seldom requires a lot of debt to expand. Ideally, it should be able to use its strong cashflow. This should be less than four years.</li>
                        <li><b>Capex to Net Income:</b> Capital Expenditures/Net Income, is money being spent on properties, equipments, plans, etc. Should be less than 25% over a period of time, even 50% is acceptable.</li>
                    </ul>

                    <p>
                        And, you can also compare companies with each other.
                    </p>
                    <div className="relative w-full h-96 rounded-lg overflow-hidden my-4">
                        <Image src="/CompanyComparison.png" alt="Compare" layout="fill" objectFit="contain" />
                    </div>
                </div>
            </div>
        </div>
    );
}