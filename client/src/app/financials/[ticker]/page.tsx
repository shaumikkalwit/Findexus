'use client';

import { useState, useEffect, use } from 'react';

// Define the type for our financial data (same as before)
type FinancialData = {
  company_info: { name: string; ticker: string };
  periods: string[];
  data: {
    [concept:string]: {
        label: string;
        concept: string;
        values: { [period:string]: { display_value: string } };
        depth: number;
    }
  };
};

// A reusable component to display the financial table
function FinancialTable({ data }: { data: FinancialData }) {
    const dataItems = Object.values(data.data);
    return (
        <div className="overflow-x-auto mt-6">
            <table className="min-w-full bg-white border rounded-lg shadow-sm">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="text-left font-semibold p-3 border-b">Metric</th>
                        {data.periods.map((period) => (
                            <th key={period} className="text-right font-semibold p-3 border-b">
                                {period}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {dataItems.map((item) => (
                        <tr key={item.concept} className="hover:bg-gray-50">
                            <td className="p-3 border-b font-medium" style={{ paddingLeft: `${item.depth * 1.5 + 1}rem` }}>
                                {item.label}
                            </td>
                            {data.periods.map((period) => (
                                <td key={period} className="p-3 border-b text-right font-mono">
                                    {item.values[period]?.display_value ?? '—'}
                                T</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}


export default function FinancialsPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = use(params);

  const [statementType, setStatementType] = useState<string | null>(null);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');

  const fetchFinancialData = async (type: string) => {
    if (!ticker) return;

    setStatementType(type);
    setIsLoading(true);
    setError(null);
    setFinancialData(null); // Clear previous data

    try {
      const res = await fetch(`http://127.0.0.1:8000/financial/${ticker}/${type}`);
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || `Failed to fetch ${type} data.`);
      }

      const data = await res.json();
      setFinancialData(data);
      setCompanyName(data.company_info.name); // Store company name
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch company name once on initial load for the header
  useEffect(() => {
    const fetchCompanyName = async () => {
        try {
            const res = await fetch(`http://127.0.0.1:8000/financial/${ticker}/income?years=5`);
            if (res.ok) {
                const data = await res.json();
                setCompanyName(data.company_info.name);
            }
        } catch (e) {
            console.error("Could not pre-fetch company name.");
        }
    };
    fetchCompanyName();
  }, [ticker]);


  return (
    <main className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-gray-800">
          {companyName || ticker.toUpperCase()}
        </h1>
        <p className="text-lg text-gray-500 mb-6">Select a financial statement to view.</p>

        <div className="flex space-x-4">
          <button onClick={() => fetchFinancialData('income')} className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition">Income Statement</button>
          <button onClick={() => fetchFinancialData('balance')} className="px-4 py-2 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 transition">Balance Sheet</button>
          <button onClick={() => fetchFinancialData('cashflow')} className="px-4 py-2 font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition">Cash Flow</button>
        </div>

        <div className="mt-8">
            {isLoading && <p className="text-center">Loading...</p>}
            {error && <p className="text-center text-red-500">Error: {error}</p>}
            {financialData && <FinancialTable data={financialData} />}
        </div>
      </div>
    </main>
  );
}
