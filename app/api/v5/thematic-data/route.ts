// app/api/v5/thematic-data/route.ts
import { NextResponse } from 'next/server';
// @ts-ignore
import YahooFinance from 'yahoo-finance2';
import { ALL_THEMATIC_TICKERS, calcReturn, Timeframe } from '@/lib/v5/sectors';

export const dynamic    = 'force-dynamic';
export const fetchCache = 'force-no-store';

const TIMEFRAME_BARS: Record<Timeframe, number> = {
  '1D':  2,
  '1W':  6,
  '1M':  23,
  '3M':  66,
  '6M':  132,
  '12M': 252,
};

function getPeriod1(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  d.setDate(d.getDate() - 10);
  return d.toISOString().split('T')[0];
}

async function fetchPrices(ticker: string): Promise<number[]> {
  try {
    const yf = new YahooFinance({ suppressNotices: ['ripHistorical'] });
    const history = await yf.historical(ticker, {
      period1:  getPeriod1(),
      period2:  new Date(),
      interval: '1d',
    });
    if (!history || history.length === 0) return [];
    return history
      .filter((h: any) => h.close != null && !isNaN(h.close))
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((h: any) => h.close as number);
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const priceMap: Record<string, number[]> = {};

    for (const ticker of ALL_THEMATIC_TICKERS) {
      await new Promise(r => setTimeout(r, 200));
      priceMap[ticker] = await fetchPrices(ticker);
    }

    const returns: Record<string, Record<Timeframe, number>> = {};
    for (const ticker of ALL_THEMATIC_TICKERS) {
      const prices = priceMap[ticker] ?? [];
      returns[ticker] = {} as Record<Timeframe, number>;
      for (const [tf, bars] of Object.entries(TIMEFRAME_BARS) as [Timeframe, number][]) {
        const slice = prices.length >= 2 ? prices.slice(-Math.min(bars, prices.length)) : [];
        returns[ticker][tf] = calcReturn(slice);
      }
    }

    return NextResponse.json({ returns });
  } catch (err: any) {
    console.error('[thematic-data] error:', err?.message ?? err);
    return NextResponse.json({ error: 'Failed to fetch thematic data' }, { status: 500 });
  }
}
