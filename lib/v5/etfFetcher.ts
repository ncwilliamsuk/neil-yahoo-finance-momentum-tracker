// lib/v5/etfFetcher.ts
// Standalone fetcher for Tab 5 ETF Screener — do not import from lib/etf/
//
// Key changes from V4:
//   - V5 Yahoo Finance rules applied: fresh instance per call, explicit period2,
//     suppressNotices, serial fetching with 200ms delays
//   - SONIA rate fetched once from FRED (series IUDSOIA) before ETF loop
//   - calculateSharpeRatios() called per ETF using live SONIA rate
//   - Rate limit delay reduced from 500ms to 200ms (V5 convention)
//   - fetchAllETFData accepts a soniaRate parameter (fetched by API route)

import YahooFinance from 'yahoo-finance2';
import { Returns, Volatility, SharpeRatios } from './etfTypes';
import { calculateSharpeRatios } from './etfCalculations';
import { getLatestFREDValue } from './fred';

// SONIA FRED series ID — Sterling Overnight Index Average
const SONIA_SERIES_ID = 'IUDSOIA';

// CSH2 ticker — used as fallback if FRED is unavailable
const CSH2_TICKER = 'CSH2.L';

// Hard fallback only if both FRED and CSH2 fail
const SONIA_HARD_FALLBACK = 4.75;

// ─────────────────────────────────────────────────────────────
// SONIA fetch
// ─────────────────────────────────────────────────────────────

/**
 * Derive an annualised risk-free rate from CSH2.L price history.
 * Calculates the 1-month return and compounds it to annual.
 * This mirrors the existing macro-data route CSH2 calculation.
 */
async function fetchSONIAFromCSH2(): Promise<number | null> {
  try {
    const yf = new YahooFinance({ suppressNotices: ['ripHistorical'] });

    const endDate   = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 60); // 2 months of history is enough

    const history = await yf.historical(CSH2_TICKER, {
      period1:  startDate.toISOString().split('T')[0],
      period2:  endDate,
      interval: '1d',
    });

    if (!history || history.length < 22) {
      console.warn(`⚠️ CSH2.L: insufficient history for rate calculation (${history?.length ?? 0} days)`);
      return null;
    }

    const prices       = history.map(d => d.adjClose ?? d.close).filter(p => p != null) as number[];
    const currentPrice = prices[prices.length - 1];
    const price21dAgo  = prices[prices.length - 22]; // ~21 trading days = 1 month

    if (!currentPrice || !price21dAgo || price21dAgo === 0) return null;

    // 1-month return compounded to annual
    const monthlyReturn  = (currentPrice - price21dAgo) / price21dAgo;
    const annualisedRate = (Math.pow(1 + monthlyReturn, 12) - 1) * 100;

    console.warn(`⚠️ Using CSH2.L-derived rate as SONIA proxy: ${annualisedRate.toFixed(4)}%`);
    return annualisedRate;

  } catch (error) {
    console.error('✗ CSH2.L fallback fetch failed:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Fetch the latest SONIA rate.
 *
 * Priority:
 *   1. FRED IUDSOIA  — live, accurate, ~2 day lag
 *   2. CSH2.L        — derived from Yahoo Finance price history if FRED unavailable
 *   3. Hard fallback — 4.75% constant if both above fail (warns loudly)
 */
export async function fetchSONIARate(): Promise<{ rate: number; source: string }> {
  // 1. Try FRED
  try {
    const rate = await getLatestFREDValue(SONIA_SERIES_ID);
    if (rate !== null && !isNaN(rate)) {
      console.log(`✓ SONIA from FRED: ${rate.toFixed(4)}%`);
      return { rate, source: 'FRED IUDSOIA' };
    }
  } catch (fredError) {
    console.warn('⚠️ FRED SONIA fetch failed, trying CSH2.L fallback...', fredError);
  }

  // 2. Try CSH2.L
  await new Promise(r => setTimeout(r, 200)); // brief pause before Yahoo call
  const csh2Rate = await fetchSONIAFromCSH2();
  if (csh2Rate !== null) {
    console.warn(`⚠️ SONIA sourced from CSH2.L (FRED unavailable): ${csh2Rate.toFixed(4)}%`);
    return { rate: csh2Rate, source: 'CSH2.L (FRED unavailable)' };
  }

  // 3. Hard fallback
  console.warn(`⚠️ Both FRED and CSH2.L failed — using hard fallback ${SONIA_HARD_FALLBACK}%. Sharpe ratios will be approximate.`);
  return { rate: SONIA_HARD_FALLBACK, source: `hard fallback (${SONIA_HARD_FALLBACK}%)` };
}

// ─────────────────────────────────────────────────────────────
// Internal calculation helpers
// ─────────────────────────────────────────────────────────────

function calculateReturn(current: number, past: number): number | null {
  if (!current || !past || past === 0) return null;
  return ((current - past) / past) * 100;
}

function calculateRSI(prices: number[], period: number = 14): number | null {
  if (prices.length < period + 1) return null;

  const changes = prices.slice(1).map((price, i) => price - prices[i]);
  const gains   = changes.map(c => c > 0 ? c : 0);
  const losses  = changes.map(c => c < 0 ? Math.abs(c) : 0);

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < changes.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateVolatility(prices: number[]): number | null {
  if (prices.length < 2) return null;

  const returns  = prices.slice(1).map((price, i) => (price - prices[i]) / prices[i]);
  const mean     = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  const stdDev   = Math.sqrt(variance);

  // Annualise (sqrt of 252 trading days)
  return stdDev * Math.sqrt(252) * 100;
}

function formatLiquidityStr(volume: number): string {
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`;
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(0)}K`;
  return Math.round(volume).toString();
}

function getPriceAtOffset(prices: number[], offset: number): number | null {
  const idx = prices.length - 1 - offset;
  return idx >= 0 && idx < prices.length ? prices[idx] : null;
}

/**
 * Detect and fix GBX ↔ GBP currency unit changes mid-series.
 * Yahoo Finance occasionally changes price units without adjusting history.
 * Detects jumps >50x or <0.02x and normalises to most recent unit (GBP).
 */
function normalizeCurrencyUnit(
  prices: number[],
  ticker: string
): { normalized: number[]; wasNormalized: boolean } {
  if (prices.length < 2) return { normalized: prices, wasNormalized: false };

  const normalized = [...prices];
  let adjustmentApplied = false;

  for (let i = prices.length - 1; i > 0; i--) {
    const ratio = prices[i] / prices[i - 1];

    if (ratio > 50 || ratio < 0.02) {
      console.warn(`  ⚠️  ${ticker}: Currency unit change at index ${i} (${prices[i - 1].toFixed(2)} → ${prices[i].toFixed(2)}, ${ratio.toFixed(3)}x)`);

      if (ratio < 0.02) {
        // GBX→GBP: older prices in pence — divide by 100
        for (let j = 0; j < i; j++) normalized[j] = normalized[j] / 100;
        console.warn(`      Normalised older prices ÷100 (GBX→GBP)`);
      } else {
        // GBP→GBX: newer prices in pence — divide by 100
        for (let j = i; j < prices.length; j++) normalized[j] = normalized[j] / 100;
        console.warn(`      Normalised newer prices ÷100 (GBP→GBX)`);
      }

      adjustmentApplied = true;
      // Do NOT break — check for multiple jumps
    }
  }

  if (adjustmentApplied) {
    console.warn(`      ✓ Final range: ${normalized[0].toFixed(2)} … ${normalized[normalized.length - 1].toFixed(2)}`);
  }

  return { normalized, wasNormalized: adjustmentApplied };
}

// ─────────────────────────────────────────────────────────────
// Single ETF fetch
// ─────────────────────────────────────────────────────────────

/**
 * Fetch market data for a single ETF ticker.
 * soniaRate is passed in from the outer loop (fetched once per batch).
 *
 * V5 Yahoo Finance rules applied:
 *   1. Fresh YahooFinance instance per call
 *   2. suppressNotices: ['ripHistorical']
 *   3. Explicit period2
 */
export async function fetchETFData(ticker: string, soniaRate: number) {
  try {
    // Rule 1 & 2: fresh instance with suppressed notices
    const yf = new YahooFinance({ suppressNotices: ['ripHistorical'] });

    const endDate   = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 450); // ~15 months of history

    const period1 = startDate.toISOString().split('T')[0];

    // Rule 3: explicit period2
    const result = await yf.historical(ticker, {
      period1,
      period2:  endDate,
      interval: '1d',
    });

    if (!result || result.length < 30) {
      console.warn(`  ⚠️ Insufficient data for ${ticker} (${result?.length ?? 0} days)`);
      return null;
    }

    // Always use adjClose — includes dividends & splits
    let closePrices = result.map(day => day.adjClose ?? day.close) as number[];

    // Fix GBX ↔ GBP unit changes
    const { normalized, wasNormalized } = normalizeCurrencyUnit(closePrices, ticker);
    closePrices = normalized;

    const volumes      = result.map(day => day.volume ?? 0);
    const currentPrice = closePrices[closePrices.length - 1];

    // Price offsets (approximate trading days)
    const price1MthAgo  = getPriceAtOffset(closePrices, 21);   // 1M  ≈ 21 days
    const price3MthAgo  = getPriceAtOffset(closePrices, 63);   // 3M  ≈ 63 days
    const price6MthAgo  = getPriceAtOffset(closePrices, 126);  // 6M  ≈ 126 days
    const price12MthAgo = getPriceAtOffset(closePrices, 252);  // 12M ≈ 252 days

    // Alternate offsets for "Remove Latest Month" mode
    const price4MthAgo  = getPriceAtOffset(closePrices, 84);   // 4M  ≈ 84 days
    const price7MthAgo  = getPriceAtOffset(closePrices, 147);  // 7M  ≈ 147 days
    const price13MthAgo = getPriceAtOffset(closePrices, 273);  // 13M ≈ 273 days

    // Standard returns
    const returns: Returns = {
      '1M':  calculateReturn(currentPrice, price1MthAgo  ?? 0),
      '3M':  calculateReturn(currentPrice, price3MthAgo  ?? 0),
      '6M':  calculateReturn(currentPrice, price6MthAgo  ?? 0),
      '12M': calculateReturn(currentPrice, price12MthAgo ?? 0),
    };

    // Alternate returns (Remove Latest Month mode)
    const alternateReturns: Returns = {
      '1M':  null,
      '3M':  calculateReturn(price1MthAgo ?? 0, price4MthAgo  ?? 0),
      '6M':  calculateReturn(price1MthAgo ?? 0, price7MthAgo  ?? 0),
      '12M': calculateReturn(price1MthAgo ?? 0, price13MthAgo ?? 0),
    };

    // Annualised volatility
    const volatility: Volatility = {
      '3M':  closePrices.length >= 63  ? calculateVolatility(closePrices.slice(-63))  : null,
      '6M':  closePrices.length >= 126 ? calculateVolatility(closePrices.slice(-126)) : null,
      '12M': closePrices.length >= 252 ? calculateVolatility(closePrices.slice(-252)) : null,
    };

    // Alternate volatility (Remove Latest Month + Risk-Adj)
    const alternateVolatility: Volatility = {
      '3M':  closePrices.length >= 84  ? calculateVolatility(closePrices.slice(-84,  -21)) : null,
      '6M':  closePrices.length >= 147 ? calculateVolatility(closePrices.slice(-147, -21)) : null,
      '12M': closePrices.length >= 273 ? calculateVolatility(closePrices.slice(-273, -21)) : null,
    };

    // True Sharpe ratios using live SONIA rate
    const sharpeRatios: SharpeRatios = calculateSharpeRatios(returns, volatility, soniaRate);

    // RSI (14-period)
    const rsi = calculateRSI(closePrices);

    // 200-day MA
    const ma200Prices = closePrices.slice(-200);
    const ma200       = ma200Prices.length === 200
      ? ma200Prices.reduce((a, b) => a + b, 0) / 200
      : null;
    const above200MA  = ma200 !== null ? currentPrice > ma200 : null;

    // Average 30-day volume
    const avgVolume = volumes.slice(-30).reduce((a, b) => a + b, 0) / 30;

    console.log(`  ✓ ${ticker}: £${currentPrice.toFixed(2)}, 12M: ${returns['12M']?.toFixed(1)}%, Sharpe12M: ${sharpeRatios['12M']?.toFixed(2) ?? 'N/A'}`);

    return {
      price:               parseFloat(currentPrice.toFixed(2)),
      returns,
      alternateReturns,
      rsi:                 rsi ? Math.round(rsi) : null,
      liquidity:           formatLiquidityStr(avgVolume),
      above200MA,
      volatility,
      alternateVolatility,
      sharpeRatios,
      currencyNormalized:  wasNormalized,
    };

  } catch (error) {
    console.error(`  ✗ Error fetching ${ticker}:`, error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Batch fetch
// ─────────────────────────────────────────────────────────────

/**
 * Fetch market data for all tickers serially with 200ms delays.
 * SONIA is fetched once before the loop and passed to each individual fetch.
 *
 * V5 rule: serial fetching with 200ms delays — parallel causes Yahoo rate limiting.
 *
 * Returns:
 *   { data: Record<cleanTicker, marketData>, soniaRate, soniaSource, successCount, failCount }
 */
export async function fetchAllETFData(tickers: string[]) {
  console.log(`\n── ETF Screener Fetch ──────────────────────────`);
  console.log(`Tickers: ${tickers.length}`);

  // Fetch SONIA once before the ETF loop
  const { rate: soniaRate, source: soniaSource } = await fetchSONIARate();
  console.log(`SONIA: ${soniaRate.toFixed(4)}% (${soniaSource})\n`);

  const data: Record<string, any> = {};
  let successCount = 0;
  let failCount    = 0;

  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];
    console.log(`[${i + 1}/${tickers.length}] ${ticker}`);

    // Rule 4: 200ms delay between requests (skip delay before first)
    if (i > 0) {
      await new Promise(r => setTimeout(r, 200));
    }

    const etfData = await fetchETFData(ticker, soniaRate);

    if (etfData) {
      const cleanTicker  = ticker.replace('.L', '');
      data[cleanTicker]  = etfData;
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log(`\n── Fetch complete ──────────────────────────────`);
  console.log(`✓ Success: ${successCount}  ✗ Failed: ${failCount}`);

  return { data, soniaRate, soniaSource, successCount, failCount };
}
