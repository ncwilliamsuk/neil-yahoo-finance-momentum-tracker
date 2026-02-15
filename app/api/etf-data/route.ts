// app/api/etf-data/route.ts

import { NextResponse } from 'next/server';
import { ETF_LIST } from '@/lib/etf/etfList';
import { fetchAllETFData } from '@/lib/etf/fetcher';

export async function GET() {
  try {
    // Get all tickers (with .L suffix for Yahoo Finance)
    const tickers = ETF_LIST.map(etf => etf.ticker);

    // Fetch data for all ETFs
    const data = await fetchAllETFData(tickers);

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
      count: Object.keys(data).length
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
