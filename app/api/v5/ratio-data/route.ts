// app/api/v5/ratio-data/route.ts
// Fetches all ratio trend data for the Ratio Trends panel (Tab 3, Section 5)
// 15 ratios across Sector, Global, Size & Style, Commodity, Credit, Themes

import { NextResponse } from 'next/server';
export const dynamic   = 'force-dynamic';
export const fetchCache = 'force-no-store';

import YahooFinance from 'yahoo-finance2';
import {
  ALL_RATIO_TICKERS,
  RATIO_DEFINITIONS,
  buildRatioSeries,
  RatioSeries,
} from '@/lib/v5/sectors';

const FETCH_DAYS = 420;

function getPeriod1(): string {
  const d = new Date();
  d.setDate(d.getDate() - FETCH_DAYS);
  return d.toISOString().split('T')[0];
}

async function fetchPrices(ticker: string): Promise<{ date: string; price: number }[]> {
  try {
    const yf = new YahooFinance({ suppressNotices: ['ripHistorical'] });
    const history = await yf.historical(ticker, {
      period1:  getPeriod1(),
      period2:  new Date(),
      interval: '1d',
    });
    if (!history || history.length < 10) return [];

    return history
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(d => ({
        date:  d.date.toISOString().split('T')[0],
        price: (d.adjClose ?? d.close) ?? 0,
      }))
      .filter(p => p.price > 0);
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    // Serial fetch of all unique tickers
    const priceMap: Record<string, { date: string; price: number }[]> = {};

    for (const ticker of ALL_RATIO_TICKERS) {
      await new Promise(r => setTimeout(r, 200));
      priceMap[ticker] = await fetchPrices(ticker);
    }

    // Build all 15 ratio series
    const ratios: RatioSeries[] = RATIO_DEFINITIONS.map(def =>
      buildRatioSeries(priceMap, def)
    );

    // Risk appetite summary — count risk-on signals
    const riskOnCount  = ratios.filter(r => r.signal === 'risk-on').length;
    const total        = ratios.length;
    const riskOnRatio  = riskOnCount / total;

    const appetiteLabel =
      riskOnRatio >= 0.75 ? 'Strong risk appetite' :
      riskOnRatio >= 0.58 ? 'Moderate risk appetite' :
      riskOnRatio >= 0.42 ? 'Mixed signals' :
      riskOnRatio >= 0.25 ? 'Cautious' :
      'Risk-off environment';

    const appetiteDetail = buildAppetiteDetail(ratios, riskOnCount, total);

    return NextResponse.json({
      ratios,
      riskAppetite: {
        riskOnCount,
        total,
        label:  appetiteLabel,
        detail: appetiteDetail,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error: unknown) {
    console.error('Ratio data API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch ratio data', details: message },
      { status: 500 },
    );
  }
}

function buildAppetiteDetail(ratios: RatioSeries[], riskOnCount: number, total: number): string {
  const riskOnRatios  = ratios.filter(r => r.signal === 'risk-on').map(r => r.guide);
  const riskOffRatios = ratios.filter(r => r.signal === 'risk-off').map(r => r.guide);
  const riskOnRatio   = riskOnCount / total;

  if (riskOnRatio >= 0.75) {
    return `Pro-risk signals dominate across ${riskOnCount} of ${total} ratios (${riskOnRatios.slice(0, 3).join(', ')} and others), indicating broad-based risk appetite across style, size, and sector factors.`;
  }
  if (riskOnRatio >= 0.58) {
    return `A majority of ratios (${riskOnCount} of ${total}) favour risk-on positioning, led by ${riskOnRatios.slice(0, 2).join(' and ')}. Some caution remains in ${riskOffRatios.slice(0, 2).join(' and ')}.`;
  }
  if (riskOnRatio >= 0.42) {
    return `Mixed signals with ${riskOnCount} of ${total} ratios risk-on. Markets are showing divergence — ${riskOnRatios.slice(0, 2).join(' and ')} favour risk, while ${riskOffRatios.slice(0, 2).join(' and ')} remain defensive.`;
  }
  if (riskOnRatio >= 0.25) {
    return `Defensive positioning dominates with only ${riskOnCount} of ${total} ratios risk-on. ${riskOffRatios.slice(0, 3).join(', ')} are all signalling caution.`;
  }
  return `Broad risk-off environment with ${riskOnCount} of ${total} ratios favouring risk assets. Defensive and low-volatility assets are leading across most categories.`;
}