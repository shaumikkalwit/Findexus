'use client';

import { useState } from 'react';

interface AddCompanyModalProps {
    onAdd: (ticker: string) => void;
    onClose: () => void;
}

export default function AddCompanyModal({ onAdd, onClose }: AddCompanyModalProps) {
    const [ticker, setTicker] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (ticker.trim()) {
            onAdd(ticker.trim().toUpperCase());
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-sm">
                <h2 className="text-xl font-bold text-white mb-4">Add Company for Comparison</h2>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        value={ticker}
                        onChange={(e) => setTicker(e.target.value)}
                        placeholder="Enter ticker..."
                        className="w-full px-4 py-2 text-gray-300 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                    />
                    <div className="flex justify-end gap-4 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 font-semibold text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500 transition">
                            Cancel
                        </button>
                        <button type="submit" className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition">
                            Add
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
