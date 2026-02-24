// app/api/v5/factor-data/route.ts
// Fetches factor matrix data (18 US-listed ETFs, all timeframes)
// Kept separate from sector-data to avoid timeout from too many serial fetches

import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import {
  ALL_FACTOR_TICKERS,
  Timeframe,
  FactorMatrix,
  calcReturn,
  buildFactorMatrix,
} from '@/lib/v5/sectors';

const yahooFinance = new YahooFinance();

const FETCH_DAYS = 420;

const TIMEFRAME_BARS: Record<Timeframe, number> = {
  '1D':  2,
  '1W':  6,
  '1M':  23,
  '3M':  65,
  '6M':  130,
  '12M': 252,
};

function getPeriod1(): string {
  const d = new Date();
  d.setDate(d.getDate() - FETCH_DAYS);
  return d.toISOString().split('T')[0];
}

async function fetchPrices(ticker: string): Promise<number[]> {
  try {
    const history = await yahooFinance.historical(ticker, {
      period1:  getPeriod1(),
      period2:  new Date(),
      interval: '1d',
    });
    if (!history || history.length < 5) return [];

    return history
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(d => (d.adjClose ?? d.close) ?? 0)
      .filter(p => p > 0);
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    // 18 tickers × 150ms = ~2.7s — well within timeout
    const priceMap: Record<string, number[]> = {};

    for (const ticker of ALL_FACTOR_TICKERS) {
      await new Promise(r => setTimeout(r, 150));
      priceMap[ticker] = await fetchPrices(ticker);
    }

    // Build matrix for all 6 timeframes from the single price fetch
    const timeframes: Timeframe[] = ['1D', '1W', '1M', '3M', '6M', '12M'];
    const factorMatrices: Record<Timeframe, FactorMatrix> = {} as Record<Timeframe, FactorMatrix>;

    for (const tf of timeframes) {
      factorMatrices[tf] = buildFactorMatrix(priceMap, TIMEFRAME_BARS[tf]);
    }

    return NextResponse.json({
      factorMatrices,
      timestamp: new Date().toISOString(),
    });

  } catch (error: unknown) {
    console.error('Factor data API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch factor data', details: message },
      { status: 500 },
    );
  }
}