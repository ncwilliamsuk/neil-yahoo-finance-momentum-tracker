// lib/etf/fetcher.ts

import YahooFinance from 'yahoo-finance2';
import { Returns, Volatility } from './types';

// Create instance
const yahooFinance = new YahooFinance();

/**
 * Calculate percentage return between two prices
 */
function calculateReturn(current: number, past: number): number | null {
  if (!current || !past || past === 0) return null;
  return ((current - past) / past) * 100;
}

/**
 * Calculate RSI (Relative Strength Index)
 */
function calculateRSI(prices: number[], period: number = 14): number | null {
  if (prices.length < period + 1) return null;

  const changes = prices.slice(1).map((price, i) => price - prices[i]);
  const gains = changes.map(c => c > 0 ? c : 0);
  const losses = changes.map(c => c < 0 ? Math.abs(c) : 0);

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

/**
 * Calculate annualized volatility from daily returns
 */
function calculateVolatility(prices: number[]): number | null {
  if (prices.length < 2) return null;

  const returns = prices.slice(1).map((price, i) => (price - prices[i]) / prices[i]);
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  // Annualize (multiply by sqrt of 252 trading days)
  return stdDev * Math.sqrt(252) * 100;
}

/**
 * Format liquidity number to string
 */
function formatLiquidity(volume: number): string {
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`;
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(0)}K`;
  return volume.toString();
}

/**
 * Get price at specific trading days offset
 */
function getPriceAtOffset(prices: number[], offset: number): number | null {
  const idx = prices.length - 1 - offset;
  return idx >= 0 && idx < prices.length ? prices[idx] : null;
}

/**
 * Detect and normalize currency unit changes (e.g., GBX to GBP or vice versa)
 * Yahoo Finance sometimes changes price units mid-series without adjusting historical data
 * This detects large jumps (>50x or <0.02x) and normalizes to the most recent price unit
 * 
 * @returns Object with normalized prices and whether adjustment was applied
 */
function normalizeCurrencyUnit(prices: number[], ticker: string): { 
  normalized: number[], 
  wasNormalized: boolean 
} {
  if (prices.length < 2) return { normalized: prices, wasNormalized: false };

  const normalized = [...prices];
  let adjustmentApplied = false;

  // Scan from most recent backwards to find ALL currency unit changes
  for (let i = prices.length - 1; i > 0; i--) {
    const ratio = prices[i] / prices[i - 1];
    
    // Detect large jumps indicating currency unit change
    if (ratio > 50 || ratio < 0.02) {
      console.warn(`  ⚠️  ${ticker}: Detected currency unit change at index ${i}`);
      console.warn(`      Price jump: ${prices[i - 1].toFixed(2)} → ${prices[i].toFixed(2)} (${ratio.toFixed(3)}x)`);
      
      if (ratio < 0.02) {
        // GBX→GBP: Older prices are in pence, newer are in pounds
        // Divide old prices by 100 to convert to pounds
        console.warn(`      Dividing older prices by 100 (GBX→GBP)`);
        for (let j = 0; j < i; j++) {
          normalized[j] = normalized[j] / 100;  // Use normalized[j] not prices[j]!
        }
      } else {
        // GBP→GBX: Older prices are in pounds, newer are in pence  
        // Divide newer prices by 100 to convert to pounds
        console.warn(`      Dividing newer prices by 100 (GBP→GBX)`);
        for (let j = i; j < prices.length; j++) {
          normalized[j] = normalized[j] / 100;  // Use normalized[j] not prices[j]!
        }
      }
      
      adjustmentApplied = true;
      // REMOVED break; - continue checking for more jumps!
    }
  }

  if (adjustmentApplied) {
    console.warn(`      ✓ Normalized: ${normalized[0].toFixed(2)} ... ${normalized[normalized.length - 1].toFixed(2)}`);
  }

  return { normalized, wasNormalized: adjustmentApplied };
}

/**
 * Fetch data for a single ETF from Yahoo Finance
 */
export async function fetchETFData(ticker: string) {
  try {
    console.log(`Fetching ${ticker}...`);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 450); // ~15 months

    // Fetch historical data
    const result = await yahooFinance.historical(ticker, {
      period1: startDate,
      period2: endDate,
      interval: '1d'
    });

    if (!result || result.length < 30) {
      console.warn(`  ⚠️ Insufficient data for ${ticker}`);
      return null;
    }

    // Use adjClose for all calculations (includes dividends & splits)
    let closePrices = result.map(day => day.adjClose ?? day.close);
    
    // CRITICAL: Detect and fix currency unit changes (GBX ↔ GBP)
    const { normalized, wasNormalized } = normalizeCurrencyUnit(closePrices, ticker);
    closePrices = normalized;
    
    const volumes = result.map(day => day.volume);
    const currentPrice = closePrices[closePrices.length - 1];

    // Approximate trading days for each period
    const price1MthAgo = getPriceAtOffset(closePrices, 21);   // ~1 month = 21 trading days
    const price3MthAgo = getPriceAtOffset(closePrices, 63);   // ~3 months = 63 trading days
    const price6MthAgo = getPriceAtOffset(closePrices, 126);  // ~6 months = 126 trading days
    const price12MthAgo = getPriceAtOffset(closePrices, 252); // ~12 months = 252 trading days

    // For "Remove Latest Month" alternate calculations
    const price4MthAgo = getPriceAtOffset(closePrices, 84);   // ~4 months
    const price7MthAgo = getPriceAtOffset(closePrices, 147);  // ~7 months
    const price13MthAgo = getPriceAtOffset(closePrices, 273); // ~13 months

    // Calculate normal returns
    const returns: Returns = {
      '1M': calculateReturn(currentPrice, price1MthAgo ?? 0),
      '3M': calculateReturn(currentPrice, price3MthAgo ?? 0),
      '6M': calculateReturn(currentPrice, price6MthAgo ?? 0),
      '12M': calculateReturn(currentPrice, price12MthAgo ?? 0)
    };

    // Calculate alternate returns (for "Remove Latest Month" mode)
    const alternateReturns: Returns = {
      '1M': null,
      '3M': calculateReturn(price1MthAgo ?? 0, price4MthAgo ?? 0),
      '6M': calculateReturn(price1MthAgo ?? 0, price7MthAgo ?? 0),
      '12M': calculateReturn(price1MthAgo ?? 0, price13MthAgo ?? 0)
    };

    // Calculate volatility for different periods
    const volatility: Volatility = {
      '3M': closePrices.length >= 63 ? calculateVolatility(closePrices.slice(-63)) : null,
      '6M': closePrices.length >= 126 ? calculateVolatility(closePrices.slice(-126)) : null,
      '12M': closePrices.length >= 252 ? calculateVolatility(closePrices.slice(-252)) : null
    };

    // Calculate alternate volatility (for "Remove Latest Month" + "Risk-Adj")
    const alternateVolatility: Volatility = {
      '3M': closePrices.length >= 84 ? calculateVolatility(closePrices.slice(-84, -21)) : null,
      '6M': closePrices.length >= 147 ? calculateVolatility(closePrices.slice(-147, -21)) : null,
      '12M': closePrices.length >= 273 ? calculateVolatility(closePrices.slice(-273, -21)) : null
    };

    // Calculate RSI
    const rsi = calculateRSI(closePrices);

    // Calculate 200-day MA
    const ma200Prices = closePrices.slice(-200);
    const ma200 = ma200Prices.length === 200
      ? ma200Prices.reduce((a, b) => a + b, 0) / 200
      : null;
    const above200MA = ma200 ? currentPrice > ma200 : null;

    // Calculate average volume
    const avgVolume = volumes.slice(-30).reduce((a, b) => a + b, 0) / 30;

    const data = {
      price: parseFloat(currentPrice.toFixed(2)),
      returns,
      alternateReturns,
      rsi: rsi ? Math.round(rsi) : null,
      liquidity: formatLiquidity(avgVolume),
      above200MA,
      volatility,
      alternateVolatility,
      currencyNormalized: wasNormalized  // Flag if currency was normalized
    };

    console.log(`  ✓ ${ticker}: £${currentPrice.toFixed(2)}, 12M: ${returns['12M']?.toFixed(1)}%`);
    return data;

  } catch (error) {
    console.error(`  ✗ Error fetching ${ticker}:`, error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * Fetch data for all ETFs with rate limiting
 */
export async function fetchAllETFData(tickers: string[]) {
  console.log(`Fetching data for ${tickers.length} ETFs...`);
  
  const results: Record<string, any> = {};
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];
    console.log(`[${i + 1}/${tickers.length}] Fetching ${ticker}...`);

    const data = await fetchETFData(ticker);
    
    if (data) {
      // Remove .L suffix for storage
      const cleanTicker = ticker.replace('.L', '');
      results[cleanTicker] = data;
      successCount++;
    } else {
      failCount++;
    }

    // Rate limiting - wait 500ms between requests
    if (i < tickers.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log(`\n✓ Successfully fetched: ${successCount} ETFs`);
  console.log(`✗ Failed: ${failCount} ETFs`);

  return results;
}