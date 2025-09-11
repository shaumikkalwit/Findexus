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
                        of investing, but recently I wanted to also put money into individual companies. Going based off how I like
                        to invest, I wanted to pick companies that I thought would grow over the long-term, ones with a consistent history
                        of growing.<br></br>
                    </p>
                    <p>
                        In doing so, this came with a good amount of reading the financial documents of the company.
                        A lot of these financial documents were hard to access <em>and</em> time-consuming to pull common valuation ratios for multiple years. I tried searching
                        for alternatives but the best thing I found was viewing them in the past five years, while anything longer and you had to pay. <br></br>
                    </p>
                    <p>
                        So, <b>I decided to fix this.</b>
                    </p>

                     <h3 className="text-lg font-semibold text-gray-100">How It Works</h3>
                    <p>
                        IF you want to use this, simply login with your Gmail, and you have access to companies'
                        income statements, balance sheets, and cashflow statements until 2009 
                        (This is because __chatgpt fill in this part and explain why my data only goes until 2009___).
                    </p>
                    <img src="./public/placeholderimg.jpeg" alt="Financials"/>

                    <p>
                        You can also access common ratios I used for valuation when looking at these companies.<br></br>
                    </p>
                    <img src="./public/placeholderimg.jpeg" alt="Overview"/>
                    <p>
                        The numbers/ratios I have are Net Income, Retained Earnings, Gross Margin, Net Margin, Return On Equity (ROE),
                        Years to Pay off Debt, and Capex to Net Income.<br></br>

                        <em>Net Income</em> = Total Revenue - Total Expenses, is green/red if it increased/decreased from the previous year respectively.<br></br>

                        <em>Retained Earnings</em> = Beginning Retained Earnings + Net Income - Dividends Paid, is responsible for showing how much the company reinvests its earnings.<br></br>

                        <em>Gross Margin</em> = Total Gross Profit/Revenue, helps show the business' scalability, bigger the business, bigger the margin. I usually look for
                        around 40% gross margin. So, if it is greater than or equal to 40%, it will appear green.<br></br>

                        <em>Net Margin</em> = Net Income/Total Revenue, is a financial ratio that shows the percentage of revenue that remains as profit after all expenses. I look for 
                        greater than or equal to 20%, which is when it'll appear green.<br></br>

                        <em>Return On Equity (ROE)</em> = Net Income/Total Equity, measures how effectively a company generates profits from the money invested by its shareholders. 
                        I look for steady increases over time.<br></br>

                        <em>Years to Pay off Debt</em> = Long Term Debt/Net Income, an exceptional business seldom requires a lot of debt to expand. Ideally, it should be able to 
                        use its strong cashflow. This should be less than four years.<br></br>

                        <em>Retained Earnings</em>, Total Revenue - Total <br></br>
                    </p>

                    <p>
                        And, you can also compare companies with each other.
                    </p>
                    <img src="./public/placeholderimg.jpeg" alt="Compare"/>
                </div>
            </div>
        </div>
    );
}