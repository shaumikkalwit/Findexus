'use client';

import { useForm, ValidationError } from '@formspree/react';
import { useEffect } from 'react';

interface ContactModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ContactModal({ isOpen, onClose }: ContactModalProps) {
    // IMPORTANT: Replace this placeholder with your actual Form ID from Formspree
    const [state, handleSubmit] = useForm("mwpnwvoo");

    // Effect to handle closing the modal after successful submission
    useEffect(() => {
        if (state.succeeded) {
            setTimeout(() => {
                onClose();
                // Note: The form will reset automatically on close/reopen
            }, 3000); // Close after 3 seconds
        }
    }, [state.succeeded, onClose]);

    if (!isOpen) return null;

    if (state.succeeded) {
        return (
            <div 
                className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
            >
                <div 
                    className="bg-gray-800 rounded-lg shadow-2xl p-8 w-full max-w-lg mx-4 text-center"
                >
                    <h2 className="text-2xl font-bold text-white">Thanks for your message!</h2>
                    <p className="text-gray-300 mt-2">I'll get back to you soon.</p>
                </div>
            </div>
        );
    }

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 transition-opacity duration-300"
            onClick={onClose}
        >
            <div 
                className="bg-gray-800 rounded-lg shadow-2xl p-8 w-full max-w-lg mx-4 transform transition-all duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">Contact Us</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Your Email</label>
                        <input
                            id="email"
                            type="email"
                            name="email"
                            required
                            className="w-full px-3 py-2 text-gray-200 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <ValidationError 
                            prefix="Email" 
                            field="email"
                            errors={state.errors}
                            className="text-red-400 text-sm mt-1"
                        />
                    </div>
                    <div>
                        <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-1">Message</label>
                        <textarea
                            id="message"
                            name="message"
                            required
                            rows={4}
                            className="w-full px-3 py-2 text-gray-200 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <ValidationError 
                            prefix="Message" 
                            field="message"
                            errors={state.errors}
                            className="text-red-400 text-sm mt-1"
                        />
                    </div>
                    <div className="flex justify-end items-center pt-2">
                         {state.errors && (
                            <p className="text-sm text-red-400 mr-4">Please fix the errors above.</p>
                         )}
                        <button 
                            type="submit"
                            disabled={state.submitting}
                            className="px-5 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition disabled:bg-gray-500 disabled:cursor-not-allowed"
                        >
                            {state.submitting ? 'Sending...' : 'Send'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

