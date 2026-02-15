// lib/etf/calculations.ts

import { ETFData, MomentumLabel, Returns, Volatility } from './types';

/**
 * Calculate percentile rank for a value within an array
 * @param value - Value to rank
 * @param allValues - Array of all values
 * @returns Percentile (0-100)
 */
export function calculatePercentile(value: number | null, allValues: (number | null)[]): number {
  if (value === null || value === undefined) return 0;
  
  const validValues = allValues.filter(v => v !== null && v !== undefined) as number[];
  const sorted = validValues.sort((a, b) => a - b);
  const rank = sorted.filter(v => v <= value).length;
  
  return (rank / sorted.length) * 100;
}

/**
 * Calculate momentum score using weighted percentiles
 * @param etf - ETF with returns data
 * @param allETFs - All ETFs for percentile calculation
 * @param weights - Weight object {m3, m6, m12}
 * @param mode - 'standard' or 'risk-adj'
 * @param removeLatestMonth - Whether to use alternate returns
 * @returns Score (0-100)
 */
export function calculateScore(
  etf: ETFData,
  allETFs: ETFData[],
  weights: { m3: number; m6: number; m12: number },
  mode: 'standard' | 'risk-adj' = 'standard',
  removeLatestMonth: boolean = false
): number {
  if (!etf.returns) return 0;

  // Choose which returns to use
  const returnsToUse = removeLatestMonth && etf.alternateReturns ? etf.alternateReturns : etf.returns;
  const volatilityToUse = removeLatestMonth && etf.alternateVolatility ? etf.alternateVolatility : etf.volatility;

  if (mode === 'standard') {
    // Standard mode: Just use raw returns
    const allReturns = {
      m3: allETFs.map(e => {
        const rets = removeLatestMonth && e.alternateReturns ? e.alternateReturns : e.returns;
        return rets?.['3M'] ?? null;
      }),
      m6: allETFs.map(e => {
        const rets = removeLatestMonth && e.alternateReturns ? e.alternateReturns : e.returns;
        return rets?.['6M'] ?? null;
      }),
      m12: allETFs.map(e => {
        const rets = removeLatestMonth && e.alternateReturns ? e.alternateReturns : e.returns;
        return rets?.['12M'] ?? null;
      })
    };

    const p3m = calculatePercentile(returnsToUse['3M'], allReturns.m3);
    const p6m = calculatePercentile(returnsToUse['6M'], allReturns.m6);
    const p12m = calculatePercentile(returnsToUse['12M'], allReturns.m12);

    return (p3m * weights.m3 + p6m * weights.m6 + p12m * weights.m12) / 100;

  } else {
    // Risk-adjusted mode: Use Sharpe ratios (return / volatility)
    if (!volatilityToUse) return 0;

    const sharpe3m = returnsToUse['3M'] && volatilityToUse['3M'] 
      ? returnsToUse['3M'] / volatilityToUse['3M'] 
      : null;
    const sharpe6m = returnsToUse['6M'] && volatilityToUse['6M']
      ? returnsToUse['6M'] / volatilityToUse['6M']
      : null;
    const sharpe12m = returnsToUse['12M'] && volatilityToUse['12M']
      ? returnsToUse['12M'] / volatilityToUse['12M']
      : null;

    const allSharpes = {
      m3: allETFs.map(e => {
        const rets = removeLatestMonth && e.alternateReturns ? e.alternateReturns : e.returns;
        const vols = removeLatestMonth && e.alternateVolatility ? e.alternateVolatility : e.volatility;
        return rets?.['3M'] && vols?.['3M'] ? rets['3M'] / vols['3M'] : null;
      }),
      m6: allETFs.map(e => {
        const rets = removeLatestMonth && e.alternateReturns ? e.alternateReturns : e.returns;
        const vols = removeLatestMonth && e.alternateVolatility ? e.alternateVolatility : e.volatility;
        return rets?.['6M'] && vols?.['6M'] ? rets['6M'] / vols['6M'] : null;
      }),
      m12: allETFs.map(e => {
        const rets = removeLatestMonth && e.alternateReturns ? e.alternateReturns : e.returns;
        const vols = removeLatestMonth && e.alternateVolatility ? e.alternateVolatility : e.volatility;
        return rets?.['12M'] && vols?.['12M'] ? rets['12M'] / vols['12M'] : null;
      })
    };

    const p3m = calculatePercentile(sharpe3m, allSharpes.m3);
    const p6m = calculatePercentile(sharpe6m, allSharpes.m6);
    const p12m = calculatePercentile(sharpe12m, allSharpes.m12);

    return (p3m * weights.m3 + p6m * weights.m6 + p12m * weights.m12) / 100;
  }
}

/**
 * Classify ETF into momentum label
 * @param etf - ETF with returns data
 * @returns Label name or null
 */
export function classifyLabel(etf: ETFData): MomentumLabel | null {
  if (!etf.returns) return null;

  const m1 = etf.returns['1M'];
  const m3 = etf.returns['3M'];
  const m12 = etf.returns['12M'];

  if (m1 === null || m3 === null || m12 === null) return null;

  // All thresholds must be met
  if (m12 > 15 && m3 > 5 && m1 > 1) return 'LEADER';
  if (m12 > 10 && m3 < 2 && m1 < -2) return 'FADING';
  if (m12 < 5 && m3 > 4 && m1 > 3) return 'EMERGING';
  if (m12 < -5 && m3 < -3 && m1 < -1) return 'LAGGARD';
  if (m12 < -10 && m3 > -1 && m1 > 2) return 'RECOVERING';  // CHANGED: was m3 > 0

  return null;
}

/**
 * Format percentage for display
 * @param value - Percentage value
 * @returns Formatted percentage
 */
export function formatPercent(value: number | null): string {
  if (value === null || value === undefined) return 'N/A';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

/**
 * Format number with appropriate suffix (K, M, B)
 * @param value - Number or string to format
 * @returns Formatted number
 */
export function formatLiquidity(value: string | number | null): string {
  if (!value) return 'N/A';
  if (typeof value === 'string') return value;

  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toString();
}

/**
 * Parse liquidity string to number for sorting
 * @param value - Liquidity string like "61.2M" or "12.1B"
 * @returns Numeric value
 */
export function parseLiquidity(value: string | number | null): number {
  if (!value || value === 'N/A') return 0;
  if (typeof value === 'number') return value;

  const str = value.toString().toUpperCase();
  const num = parseFloat(str);

  if (str.includes('B')) return num * 1e9;
  if (str.includes('M')) return num * 1e6;
  if (str.includes('K')) return num * 1e3;

  return num || 0;
}

/**
 * Calculate UK risk-free rate from CSH2 1M return (compound annualization)
 * @param csh2MonthlyReturn - CSH2 1-month return as percentage
 * @returns Annualized rate
 */
export function calculateRiskFreeRate(csh2MonthlyReturn: number | null): number {
  if (!csh2MonthlyReturn) return 4.08; // Default fallback

  const monthlyReturn = csh2MonthlyReturn / 100;
  const annualizedRate = (Math.pow(1 + monthlyReturn, 12) - 1) * 100;
  return annualizedRate;
}

/**
 * Merge ETF metadata with market data
 * @param metadata - Static ETF metadata
 * @param marketData - Market data (returns, price, etc)
 * @returns Complete ETF data object
 */
export function mergeETFData(
  metadata: { ticker: string; shortName: string; fullName: string; category: string; ter: number },
  marketData: Omit<ETFData, 'ticker' | 'shortName' | 'fullName' | 'category' | 'ter'> | null
): ETFData {
  if (!marketData) {
    // Return ETF with null market data
    return {
      ...metadata,
      price: null,
      returns: { '1M': null, '3M': null, '6M': null, '12M': null },
      alternateReturns: { '1M': null, '3M': null, '6M': null, '12M': null },
      rsi: null,
      liquidity: 'N/A',
      above200MA: null,
      volatility: { '3M': null, '6M': null, '12M': null },
      alternateVolatility: { '3M': null, '6M': null, '12M': null },
      currencyNormalized: false
    };
  }

  return {
    ...metadata,
    ...marketData
  };
}