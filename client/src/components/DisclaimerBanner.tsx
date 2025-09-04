'use client';

import { useState, useEffect } from 'react';

export default function DisclaimerBanner() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // This effect runs only once on the client-side when the component mounts.
        // It checks if the user has previously dismissed the banner.
        const dismissed = localStorage.getItem('disclaimerDismissed');
        if (!dismissed) {
            setIsVisible(true);
        }
    }, []);

    const handleDismiss = () => {
        // Hide the banner and save the preference in localStorage.
        setIsVisible(false);
        localStorage.setItem('disclaimerDismissed', 'true');
    };

    if (!isVisible) {
        return null;
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 p-4 z-50 animate-fade-in-up">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
                <p className="text-sm text-gray-300 text-center sm:text-left">
                    <span className="font-bold text-yellow-400">Disclaimer:</span> Data is obtained from public SEC filings.
                    While we strive for accuracy, this information is for informational purposes only and may contain inaccuracies or
                    omissions due to errors while obtaining the information. It is not investment advice.
                    Always verify information and conduct your own research before making any financial decisions.
                </p>
                <button
                    onClick={handleDismiss}
                    className="px-4 py-2 text-sm font-semibold bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors flex-shrink-0"
                >
                    Acknowledge
                </button>
            </div>
        </div>
    );
}

