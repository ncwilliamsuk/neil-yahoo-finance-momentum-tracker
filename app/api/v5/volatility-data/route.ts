import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import {
  calculateCompositeVolatility,
  getVolatilityZone,
  getMetricStatus,
  type HistoricalVolatility
} from '@/lib/v5/volatility';
import { calculateSP500Breadth } from '@/lib/v5/breadth';

// Create Yahoo Finance instance for v3.x
const yahooFinance = new YahooFinance();


export async function GET() {
  try {
    console.log('=== Fetching volatility data ===');

    // Fetch current volatility metrics
    console.log('Fetching current metrics...');
    const [vixQuote, vix3mQuote, vvixQuote, moveQuote, skewQuote] = await Promise.all([
      yahooFinance.quote('^VIX'),
      yahooFinance.quote('^VIX3M'),
      yahooFinance.quote('^VVIX'),
      yahooFinance.quote('^MOVE'),
      yahooFinance.quote('^SKEW')
    ]);

    const vix = vixQuote.regularMarketPrice!;
    const vix3m = vix3mQuote.regularMarketPrice!;
    const vvix = vvixQuote.regularMarketPrice!;
    const move = moveQuote.regularMarketPrice!;
    const skew = skewQuote.regularMarketPrice!;

    console.log(`VIX: ${vix}, VIX3M: ${vix3m}, VVIX: ${vvix}, MOVE: ${move}, SKEW: ${skew}`);

    // Fetch 252 days of historical data for percentile calculations
    console.log('Fetching historical data (252 days)...');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 280); // Buffer for weekends

    const [vixHist, vix3mHist, vvixHist, moveHist, skewHist] = await Promise.all([
      yahooFinance.historical('^VIX', { period1: startDate, period2: endDate, interval: '1d' }),
      yahooFinance.historical('^VIX3M', { period1: startDate, period2: endDate, interval: '1d' }),
      yahooFinance.historical('^VVIX', { period1: startDate, period2: endDate, interval: '1d' }),
      yahooFinance.historical('^MOVE', { period1: startDate, period2: endDate, interval: '1d' }),
      yahooFinance.historical('^SKEW', { period1: startDate, period2: endDate, interval: '1d' })
    ]);

    // Combine historical data (last 252 days)
    const historicalData: HistoricalVolatility[] = vixHist.slice(-252).map((day, i) => ({
      date: day.date.toISOString(),
      vix: day.close,
      vix3m: vix3mHist.slice(-252)[i]?.close ?? 0,
      vvix: vvixHist.slice(-252)[i]?.close ?? 0,
      move: moveHist.slice(-252)[i]?.close ?? 0,
      skew: skewHist.slice(-252)[i]?.close ?? 0
    }));

    // Default weights
    const weights = { vix: 35, vix3m: 15, vvix: 20, move: 20, skew: 10 };

    // Calculate composite score
    console.log('Calculating composite score...');
    const compositeScore = calculateCompositeVolatility(
      vix, vix3m, vvix, move, skew,
      weights,
      historicalData
    );

    const zone = getVolatilityZone(compositeScore);

    // Get individual metric statuses
    const metrics = {
      VIX: { value: vix, ...getMetricStatus('VIX', vix) },
      VIX3M: { value: vix3m, ...getMetricStatus('VIX3M', vix3m) },
      VVIX: { value: vvix, ...getMetricStatus('VVIX', vvix) },
      MOVE: { value: move, ...getMetricStatus('MOVE', move) },
      SKEW: { value: skew, ...getMetricStatus('SKEW', skew) }
    };

    // Fetch S&P 500 chart data
    console.log('Fetching S&P 500 chart data...');
    const sp500Hist = await yahooFinance.historical('^GSPC', {
      period1: startDate,
      period2: endDate,
      interval: '1d'
    });

    const sp500Chart = sp500Hist.map(d => ({
      date: d.date.toISOString().split('T')[0],
      close: d.adjClose ?? d.close,
      volume: d.volume
    }));

    // Calculate 20 DMA and 50 DMA for SPY
    console.log('Calculating SPY moving averages...');
    const spyHist = await yahooFinance.historical('SPY', {
      period1: new Date(Date.now() - 70 * 24 * 60 * 60 * 1000),
      period2: endDate,
      interval: '1d'
    });

    const spyPrices = spyHist.map(d => d.adjClose ?? d.close);
    const currentSPY = spyPrices[spyPrices.length - 1];
    const dma20 = spyPrices.slice(-20).reduce((a, b) => a + b, 0) / 20;
    const dma50 = spyPrices.slice(-50).reduce((a, b) => a + b, 0) / 50;

    // Calculate S&P 500 breadth
    console.log('Calculating S&P 500 breadth (this will take ~2 minutes)...');
    const breadth = await calculateSP500Breadth();

    console.log('=== Volatility data fetch complete ===');

    return NextResponse.json({
      volatility: {
        vix: { value: vix },
        vix3m: { value: vix3m },
        vvix: { value: vvix },
        move: { value: move },
        skew: { value: skew }
      },
      composite: {
        score: compositeScore,
        zone: zone.zone,
        color: zone.color,
        interpretation: zone.interpretation
      },
      weights,
      metrics,
      sp500: {
        chart: sp500Chart,
        current: currentSPY,
        dma20,
        dma50
      },
      breadth: {
        percentage: breadth.percentage,
        above: breadth.above,
        total: breadth.total,
        status: breadth.status.label,
        color: breadth.status.color
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Volatility data fetch error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch volatility data', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}