// app/api/v5/volatility-data/route.ts
// Fast route — volatility metrics + market indices + SPY MAs.
// Breadth data removed — now fetched separately via /api/v5/breadth-data on demand.

import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import {
  calculateCompositeVolatility,
  getVolatilityZone,
  getMetricStatus,
  type HistoricalVolatility
} from '@/lib/v5/volatility';

export const dynamic    = 'force-dynamic';
export const fetchCache = 'force-no-store';

const yahooFinance = new YahooFinance();

const INDICES = {
  sp500:  { ticker: '^GSPC',    name: 'S&P 500' },
  russell:{ ticker: '^RUT',     name: 'Russell 2000' },
  nasdaq: { ticker: '^IXIC',    name: 'Nasdaq Composite' },
  dow:    { ticker: '^DJI',     name: 'Dow Jones' },
  ftse:   { ticker: '^FTSE',    name: 'FTSE 100' },
  dax:    { ticker: '^GDAXI',   name: 'DAX' },
  nikkei: { ticker: '^N225',    name: 'Nikkei 225' },
  eafe:   { ticker: 'EFA',      name: 'MSCI EAFE' },
  gold:   { ticker: 'GC=F',     name: 'Gold' },
  oil:    { ticker: 'CL=F',     name: 'WTI Crude' },
  btc:    { ticker: 'BTC-USD',  name: 'Bitcoin' },
  dxy:    { ticker: 'DX-Y.NYB', name: 'US Dollar Index' },
  eurusd: { ticker: 'EURUSD=X', name: 'EUR/USD' },
  usdjpy: { ticker: 'JPY=X',    name: 'USD/JPY' },
  vix:    { ticker: '^VIX',     name: 'VIX (Volatility Index)' },
};

export async function GET() {
  try {
    console.log('=== Fetching volatility & market data ===');

    const endDate   = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 380);

    // Volatility quotes
    console.log('Fetching volatility metrics...');
    const [vixQuote, vix3mQuote, vvixQuote, moveQuote, skewQuote] = await Promise.all([
      yahooFinance.quote('^VIX'),
      yahooFinance.quote('^VIX3M'),
      yahooFinance.quote('^VVIX'),
      yahooFinance.quote('^MOVE'),
      yahooFinance.quote('^SKEW'),
    ]);

    const vix  = vixQuote.regularMarketPrice!;
    const vix3m = vix3mQuote.regularMarketPrice!;
    const vvix = vvixQuote.regularMarketPrice!;
    const move = moveQuote.regularMarketPrice!;
    const skew = skewQuote.regularMarketPrice!;

    // Volatility history
    console.log('Fetching volatility history...');
    const [vixHist, vix3mHist, vvixHist, moveHist, skewHist] = await Promise.all([
      yahooFinance.historical('^VIX',   { period1: startDate, period2: endDate, interval: '1d' }),
      yahooFinance.historical('^VIX3M', { period1: startDate, period2: endDate, interval: '1d' }),
      yahooFinance.historical('^VVIX',  { period1: startDate, period2: endDate, interval: '1d' }),
      yahooFinance.historical('^MOVE',  { period1: startDate, period2: endDate, interval: '1d' }),
      yahooFinance.historical('^SKEW',  { period1: startDate, period2: endDate, interval: '1d' }),
    ]);

    const historicalData: HistoricalVolatility[] = vixHist.slice(-252).map((day, i) => ({
      date:  day.date.toISOString(),
      vix:   day.close,
      vix3m: vix3mHist.slice(-252)[i]?.close ?? 0,
      vvix:  vvixHist.slice(-252)[i]?.close ?? 0,
      move:  moveHist.slice(-252)[i]?.close ?? 0,
      skew:  skewHist.slice(-252)[i]?.close ?? 0,
    }));

    const weights = { vix: 35, vix3m: 15, vvix: 20, move: 20, skew: 10 };
    const compositeScore = calculateCompositeVolatility(vix, vix3m, vvix, move, skew, weights, historicalData);
    const zone = getVolatilityZone(compositeScore);

    const metrics = {
      VIX:   { value: vix,   ...getMetricStatus('VIX',   vix)   },
      VIX3M: { value: vix3m, ...getMetricStatus('VIX3M', vix3m) },
      VVIX:  { value: vvix,  ...getMetricStatus('VVIX',  vvix)  },
      MOVE:  { value: move,  ...getMetricStatus('MOVE',  move)  },
      SKEW:  { value: skew,  ...getMetricStatus('SKEW',  skew)  },
    };

    // Market indices — batched parallel fetches
    console.log('Fetching market indices...');
    const [sp500Hist, russellHist, nasdaqHist, dowHist] = await Promise.all([
      yahooFinance.historical(INDICES.sp500.ticker,  { period1: startDate, period2: endDate, interval: '1d' }),
      yahooFinance.historical(INDICES.russell.ticker,{ period1: startDate, period2: endDate, interval: '1d' }),
      yahooFinance.historical(INDICES.nasdaq.ticker, { period1: startDate, period2: endDate, interval: '1d' }),
      yahooFinance.historical(INDICES.dow.ticker,    { period1: startDate, period2: endDate, interval: '1d' }),
    ]);

    const [ftseHist, daxHist, nikkeiHist, eafeHist] = await Promise.all([
      yahooFinance.historical(INDICES.ftse.ticker,  { period1: startDate, period2: endDate, interval: '1d' }),
      yahooFinance.historical(INDICES.dax.ticker,   { period1: startDate, period2: endDate, interval: '1d' }),
      yahooFinance.historical(INDICES.nikkei.ticker,{ period1: startDate, period2: endDate, interval: '1d' }),
      yahooFinance.historical(INDICES.eafe.ticker,  { period1: startDate, period2: endDate, interval: '1d' }),
    ]);

    const [goldHist, oilHist, btcHist] = await Promise.all([
      yahooFinance.historical(INDICES.gold.ticker, { period1: startDate, period2: endDate, interval: '1d' }),
      yahooFinance.historical(INDICES.oil.ticker,  { period1: startDate, period2: endDate, interval: '1d' }),
      yahooFinance.historical(INDICES.btc.ticker,  { period1: startDate, period2: endDate, interval: '1d' }),
    ]);

    const [dxyHist, eurusdHist, usdjpyHist] = await Promise.all([
      yahooFinance.historical(INDICES.dxy.ticker,   { period1: startDate, period2: endDate, interval: '1d' }),
      yahooFinance.historical(INDICES.eurusd.ticker,{ period1: startDate, period2: endDate, interval: '1d' }),
      yahooFinance.historical(INDICES.usdjpy.ticker,{ period1: startDate, period2: endDate, interval: '1d' }),
    ]);

    const toChart = (hist: any[]) => hist.map(d => ({
      date:   d.date.toISOString().split('T')[0],
      open:   d.open,
      high:   d.high,
      low:    d.low,
      close:  d.adjClose ?? d.close,
      volume: d.volume || 0,
    }));

    const chartData = {
      sp500:   toChart(sp500Hist),
      russell: toChart(russellHist),
      nasdaq:  toChart(nasdaqHist),
      dow:     toChart(dowHist),
      ftse:    toChart(ftseHist),
      dax:     toChart(daxHist),
      nikkei:  toChart(nikkeiHist),
      eafe:    toChart(eafeHist),
      gold:    toChart(goldHist),
      oil:     toChart(oilHist),
      btc:     toChart(btcHist),
      dxy:     toChart(dxyHist),
      eurusd:  toChart(eurusdHist),
      usdjpy:  toChart(usdjpyHist),
      vix:     toChart(vixHist),
    };

    // SPY moving averages
    console.log('Fetching SPY moving averages...');
    const spyHist = await yahooFinance.historical('SPY', {
      period1:  new Date(Date.now() - 220 * 24 * 60 * 60 * 1000),
      period2:  endDate,
      interval: '1d',
    });
    const spyPrices  = spyHist.map((d: any) => d.adjClose ?? d.close);
    const currentSPY = spyPrices[spyPrices.length - 1];
    const dma20      = spyPrices.slice(-20).reduce((a: number, b: number)  => a + b, 0) / 20;
    const dma50      = spyPrices.slice(-50).reduce((a: number, b: number)  => a + b, 0) / 50;
    const dma200     = spyPrices.slice(-200).reduce((a: number, b: number) => a + b, 0) / 200;

    console.log('=== Volatility fetch complete (breadth excluded) ===');

    return NextResponse.json({
      volatility: { vix: { value: vix }, vix3m: { value: vix3m }, vvix: { value: vvix }, move: { value: move }, skew: { value: skew } },
      composite:  { score: compositeScore, zone: zone.zone, color: zone.color, interpretation: zone.interpretation },
      weights,
      metrics,
      indices: INDICES,
      chartData,
      spy: { current: currentSPY, dma20, dma50, dma200 },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Volatility data fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch volatility data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}