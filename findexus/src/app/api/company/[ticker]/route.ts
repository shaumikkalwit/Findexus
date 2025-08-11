// src/app/api/stock/[ticker]/route.ts
// This file handles GET requests to /api/stock/[ticker]

import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest, // The incoming request object
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params; // Get the ticker from the URL (e.g., 'AAPL' from /api/stock/AAPL)

  if (!ticker) {
    // If no ticker was provided in the URL, return a bad request error
    return NextResponse.json(
      { message: 'Stock ticker is required.' },
      { status: 400 }
    );
  }
}