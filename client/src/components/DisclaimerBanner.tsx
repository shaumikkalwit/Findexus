'use client';

// This component no longer needs its own state hooks.

interface DisclaimerBannerProps {
    show: boolean; // NEW: The parent now tells this component whether to be visible.
    onAcknowledge: () => void;
}

export default function DisclaimerBanner({ show, onAcknowledge }: DisclaimerBannerProps) {
    // If the parent says not to show, render nothing.
    if (!show) {
        return null;
    }

    // The handleClose function is simpler now, it just calls the parent's function.
    const handleClose = () => {
        onAcknowledge();
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 p-4 shadow-lg z-50 animate-fade-in-up">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-gray-300">
                    <p>
                        <strong className="font-semibold text-white">Disclaimer:</strong> Data is obtained from public SEC filings.
                    While we strive for accuracy, this information is for informational purposes only and may contain inaccuracies or
                    omissions due to errors while obtaining the information. This is also NOT telling your what to invest it, nor is it investment advice.
                    Always verify information and conduct your own research before making any financial decisions.
                    </p>
                </div>
                <button 
                    onClick={handleClose}
                    className="flex-shrink-0 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition"
                >
                    Acknowledge
                </button>
            </div>
        </div>
    );
}
