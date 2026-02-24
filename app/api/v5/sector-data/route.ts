// app/api/v5/sector-data/route.ts
// Fetches sector performance (all timeframes) + C/D ratio data
// All tickers fetched in one serial pass to avoid Yahoo Finance rate limiting

import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
import YahooFinance from 'yahoo-finance2';
import {
  US_SECTORS,
  WORLD_SECTORS,
  EU_SECTORS,
  SectorETF,
  SectorReturn,
  Timeframe,
  calcReturn,
  rankSectors,
  buildEqualWeightedIndex,
  calcCDRatio,
} from '@/lib/v5/sectors';

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

async function fetchPricesWithDates(ticker: string): Promise<{ date: string; price: number }[]> {
  try {
    // Fresh instance per call to prevent module-level response caching
    const yf = new YahooFinance({ suppressNotices: ['ripHistorical'] });
    const history = await yf.historical(ticker, {
      period1:  getPeriod1(),
      period2:  new Date(),
      interval: '1d',
    });
    if (!history || history.length < 5) {
      console.log(`[sector-data] ${ticker}: got ${history?.length ?? 0} bars (insufficient)`);
      return [];
    }
    const result = history
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(d => ({
        date:  d.date.toISOString().split('T')[0],
        price: (d.adjClose ?? d.close) ?? 0,
      }))
      .filter(p => p.price > 0);

    console.log(`[sector-data] ${ticker}: ${result.length} bars, latest=${result.at(-1)?.price}`);
    return result;
  } catch (e) {
    console.error(`[sector-data] ${ticker}: fetch error`, e);
    return [];
  }
}

function buildSectorReturns(
  sectors:    SectorETF[],
  pricesOnly: Record<string, number[]>,
): Record<Timeframe, SectorReturn[]> {
  const timeframes: Timeframe[] = ['1D', '1W', '1M', '3M', '6M', '12M'];
  const result = {} as Record<Timeframe, SectorReturn[]>;

  for (const tf of timeframes) {
    const bars = TIMEFRAME_BARS[tf];
    const rows = sectors.map(sector => {
      const prices = pricesOnly[sector.ticker] ?? [];
      const slice  = prices.length >= 2 ? prices.slice(-Math.min(bars, prices.length)) : [];
      return {
        ticker: sector.ticker,
        name:   sector.name,
        type:   sector.type,
        return: calcReturn(slice),
      };
    });
    result[tf] = rankSectors(rows);
  }

  return result;
}

function buildDivergenceCheck(
  spyReturn: number,
  usCD:      ReturnType<typeof calcCDRatio>,
): string {
  const pct       = spyReturn.toFixed(1);
  const dir       = spyReturn >= 0 ? 'up' : 'down';
  const absReturn = Math.abs(spyReturn).toFixed(1);
  const cdTrend   = usCD.trend;
  const cdAbove50 = usCD.above50MA;

  if (spyReturn >= 0 && cdTrend === 'rising') {
    return `S&P 500 divergence check: The index is ${dir} ${absReturn}% over 3M while the US C/D ratio is rising, indicating healthy breadth with cyclical sectors participating in the rally. No concerning divergence detected.`;
  }
  if (spyReturn >= 0 && cdTrend === 'falling') {
    return `S&P 500 divergence check: The index is ${dir} ${absReturn}% over 3M but the US C/D ratio is falling — defensives are leading the rally. This is a potential divergence warning; breadth may be narrowing.`;
  }
  if (spyReturn >= 0 && cdTrend === 'flat' && cdAbove50) {
    return `S&P 500 divergence check: The index is ${dir} ${absReturn}% over 3M with the C/D ratio flat but above its 50-day MA. Cyclical participation is holding steady; no significant divergence detected.`;
  }
  if (spyReturn >= 0 && cdTrend === 'flat' && !cdAbove50) {
    return `S&P 500 divergence check: The index is ${dir} ${absReturn}% over 3M but the C/D ratio is flat and below its 50-day MA. Defensive sectors are keeping pace with cyclicals; watch for further deterioration in breadth.`;
  }
  if (spyReturn < 0 && cdTrend === 'rising') {
    return `S&P 500 divergence check: The index is ${dir} ${absReturn}% over 3M, yet the C/D ratio is rising — cyclicals are outperforming defensives within the decline, suggesting rotation rather than broad risk-off.`;
  }
  if (spyReturn < 0 && cdTrend === 'falling') {
    return `S&P 500 divergence check: The index is ${dir} ${absReturn}% over 3M and the C/D ratio is falling. Defensives are leading in a down market — a consistent broad risk-off signal.`;
  }
  // flat / edge case
  return `S&P 500 divergence check: The index is ${dir} ${absReturn}% over 3M with the C/D ratio relatively flat. No clear divergence signal at this time.`;
}

export async function GET() {
  try {
    const allSectors = [...US_SECTORS, ...WORLD_SECTORS, ...EU_SECTORS];

    // Single serial pass — no parallelism, no rate limiting issues
    const withDates:  Record<string, { date: string; price: number }[]> = {};
    const pricesOnly: Record<string, number[]>                          = {};

    for (const sector of allSectors) {
      await new Promise(r => setTimeout(r, 200));
      const series              = await fetchPricesWithDates(sector.ticker);
      withDates[sector.ticker]  = series;
      pricesOnly[sector.ticker] = series.map(p => p.price);
    }

    // Fetch SPY separately for divergence check
    await new Promise(r => setTimeout(r, 200));
    const spySeries = await fetchPricesWithDates('SPY');
    const spyPrices = spySeries.map(p => p.price);

    // Sector returns
    const usSectors    = buildSectorReturns(US_SECTORS,    pricesOnly);
    const worldSectors = buildSectorReturns(WORLD_SECTORS, pricesOnly);
    const euSectors    = buildSectorReturns(EU_SECTORS,    pricesOnly);

    // C/D ratios
    const buildIndex = (sectors: SectorETF[], type: 'cyclical' | 'defensive') =>
      buildEqualWeightedIndex(
        withDates,
        sectors.filter(s => s.type === type).map(s => s.ticker),
      );

    const cdRatios = {
      US:    calcCDRatio(buildIndex(US_SECTORS, 'cyclical'),    buildIndex(US_SECTORS, 'defensive'),    'US',    withDates),
      World: calcCDRatio(buildIndex(WORLD_SECTORS, 'cyclical'), buildIndex(WORLD_SECTORS, 'defensive'), 'World', withDates),
      EU:    calcCDRatio(buildIndex(EU_SECTORS, 'cyclical'),    buildIndex(EU_SECTORS, 'defensive'),    'EU',    withDates),
    };

    // S&P 500 divergence check (fixed 3M window)
    const spy3MBars  = 65;
    const spy3MSlice = spyPrices.length >= 2 ? spyPrices.slice(-Math.min(spy3MBars, spyPrices.length)) : [];
    const spy3MReturn = calcReturn(spy3MSlice);
    const divergenceCheck = buildDivergenceCheck(spy3MReturn, cdRatios.US);

    return NextResponse.json({
      sectors: {
        US:    usSectors,
        World: worldSectors,
        EU:    euSectors,
      },
      cdRatios,
      divergenceCheck,
      timestamp: new Date().toISOString(),
    });

  } catch (error: unknown) {
    console.error('Sector data API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch sector data', details: message },
      { status: 500 },
    );
  }
}