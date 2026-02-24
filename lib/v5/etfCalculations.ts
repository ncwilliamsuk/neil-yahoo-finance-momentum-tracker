// lib/v5/etfCalculations.ts
// Standalone calculations for Tab 5 ETF Screener — do not import from lib/etf/
//
// Key changes from V4:
//   - calculateScore risk-adj mode now uses true Sharpe (excess return over SONIA)
//   - calculateSharpeRatios() is a new exported function used by the fetcher
//   - mergeETFData updated to include sharpeRatios field
//   - All imports reference lib/v5/etfTypes

import { ETFData, MomentumLabel, Returns, Volatility, SharpeRatios } from './etfTypes';

// ─────────────────────────────────────────────────────────────
// Percentile
// ─────────────────────────────────────────────────────────────

/**
 * Calculate percentile rank for a value within an array.
 * Returns 0 if value is null or no valid comparison values exist.
 */
export function calculatePercentile(
  value: number | null,
  allValues: (number | null)[]
): number {
  if (value === null || value === undefined) return 0;

  const validValues = allValues.filter(v => v !== null && v !== undefined) as number[];
  if (validValues.length === 0) return 0;

  const sorted = [...validValues].sort((a, b) => a - b);
  const rank = sorted.filter(v => v <= value).length;

  return (rank / sorted.length) * 100;
}

// ─────────────────────────────────────────────────────────────
// Sharpe Ratio
// ─────────────────────────────────────────────────────────────

/**
 * Calculate true Sharpe ratios for 3M, 6M and 12M periods.
 *
 * Formula: (periodReturn - riskFreeRate_for_period) / annualisedVolatility
 *
 * The SONIA rate passed in is already annualised (e.g. 5.19 for 5.19%).
 * We scale it to the period before subtracting:
 *   3M  → riskFreeRate * (3/12)
 *   6M  → riskFreeRate * (6/12)
 *   12M → riskFreeRate * (12/12)
 *
 * Volatility is already annualised from the fetcher.
 * We de-annualise it to match the period return:
 *   3M  → annualisedVol * sqrt(3/12)
 *   6M  → annualisedVol * sqrt(6/12)
 *   12M → annualisedVol * sqrt(12/12)  [= annualisedVol]
 *
 * Returns null for a period if either return or volatility is missing.
 */
export function calculateSharpeRatios(
  returns: Returns,
  volatility: Volatility,
  soniaRate: number  // annualised %, e.g. 5.19
): SharpeRatios {
  const rf3m  = soniaRate * (3 / 12);
  const rf6m  = soniaRate * (6 / 12);
  const rf12m = soniaRate;

  const calcSharpe = (
    ret: number | null,
    vol: number | null,
    rfForPeriod: number,
    periodFraction: number
  ): number | null => {
    if (ret === null || vol === null || vol === 0) return null;
    // De-annualise volatility to match period length
    const periodVol = vol * Math.sqrt(periodFraction);
    return (ret - rfForPeriod) / periodVol;
  };

  return {
    '3M':  calcSharpe(returns['3M'],  volatility['3M'],  rf3m,  3 / 12),
    '6M':  calcSharpe(returns['6M'],  volatility['6M'],  rf6m,  6 / 12),
    '12M': calcSharpe(returns['12M'], volatility['12M'], rf12m, 1),
  };
}

/**
 * Format a Sharpe ratio for display.
 * Shows two decimal places with sign; 'N/A' if null.
 */
export function formatSharpe(value: number | null): string {
  if (value === null || value === undefined) return 'N/A';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}`;
}

// ─────────────────────────────────────────────────────────────
// Momentum Score
// ─────────────────────────────────────────────────────────────

/**
 * Calculate momentum score using weighted percentiles (0–100).
 *
 * Standard mode:  ranks raw returns vs all ETFs in the universe.
 * Risk-adj mode:  ranks true Sharpe ratios (12M Sharpe from sharpeRatios field)
 *                 vs all ETFs — uses pre-calculated sharpeRatios so SONIA is
 *                 already baked in, no need to pass it here again.
 */
export function calculateScore(
  etf: ETFData,
  allETFs: ETFData[],
  weights: { m3: number; m6: number; m12: number },
  mode: 'standard' | 'risk-adj' = 'standard',
  removeLatestMonth: boolean = false
): number {
  if (!etf.returns) return 0;

  const returnsToUse     = removeLatestMonth && etf.alternateReturns   ? etf.alternateReturns   : etf.returns;
  const volatilityToUse  = removeLatestMonth && etf.alternateVolatility ? etf.alternateVolatility : etf.volatility;

  if (mode === 'standard') {
    const allR = {
      m3:  allETFs.map(e => (removeLatestMonth && e.alternateReturns ? e.alternateReturns : e.returns)?.['3M']  ?? null),
      m6:  allETFs.map(e => (removeLatestMonth && e.alternateReturns ? e.alternateReturns : e.returns)?.['6M']  ?? null),
      m12: allETFs.map(e => (removeLatestMonth && e.alternateReturns ? e.alternateReturns : e.returns)?.['12M'] ?? null),
    };

    const p3m  = calculatePercentile(returnsToUse['3M'],  allR.m3);
    const p6m  = calculatePercentile(returnsToUse['6M'],  allR.m6);
    const p12m = calculatePercentile(returnsToUse['12M'], allR.m12);

    return (p3m * weights.m3 + p6m * weights.m6 + p12m * weights.m12) / 100;

  } else {
    // Risk-adjusted mode — use pre-calculated true Sharpe ratios
    // Fall back to return/vol ratio if sharpeRatios not yet populated
    const getSharpe = (e: ETFData, period: '3M' | '6M' | '12M'): number | null => {
      if (e.sharpeRatios?.[period] !== undefined) return e.sharpeRatios[period];
      // Fallback: raw return / vol (should not happen in normal operation)
      const rets = removeLatestMonth && e.alternateReturns   ? e.alternateReturns   : e.returns;
      const vols = removeLatestMonth && e.alternateVolatility ? e.alternateVolatility : e.volatility;
      const r = rets?.[period];
      const v = vols?.[period];
      return r != null && v != null && v !== 0 ? r / v : null;
    };

    const mySharpe3m  = etf.sharpeRatios?.['3M']  ?? getSharpe(etf, '3M');
    const mySharpe6m  = etf.sharpeRatios?.['6M']  ?? getSharpe(etf, '6M');
    const mySharpe12m = etf.sharpeRatios?.['12M'] ?? getSharpe(etf, '12M');

    const allS = {
      m3:  allETFs.map(e => getSharpe(e, '3M')),
      m6:  allETFs.map(e => getSharpe(e, '6M')),
      m12: allETFs.map(e => getSharpe(e, '12M')),
    };

    const p3m  = calculatePercentile(mySharpe3m,  allS.m3);
    const p6m  = calculatePercentile(mySharpe6m,  allS.m6);
    const p12m = calculatePercentile(mySharpe12m, allS.m12);

    return (p3m * weights.m3 + p6m * weights.m6 + p12m * weights.m12) / 100;
  }
}

// ─────────────────────────────────────────────────────────────
// Momentum Label
// ─────────────────────────────────────────────────────────────

/**
 * Classify an ETF into a momentum label based on its returns.
 * Returns null if the ETF doesn't meet any label's criteria.
 *
 * Thresholds (unchanged from V4):
 *   LEADER:    12M > 15%,  3M > 5%,   1M > 1%
 *   FADING:    12M > 10%,  3M < 2%,   1M < -2%
 *   EMERGING:  12M < 5%,   3M > 4%,   1M > 3%
 *   LAGGARD:   12M < -5%,  3M < -3%,  1M < -1%
 *   RECOVERING:12M < -10%, 3M > -1%,  1M > 2%
 */
export function classifyLabel(etf: ETFData): MomentumLabel | null {
  if (!etf.returns) return null;

  const m1  = etf.returns['1M'];
  const m3  = etf.returns['3M'];
  const m12 = etf.returns['12M'];

  if (m1 === null || m3 === null || m12 === null) return null;

  if (m12 > 15  && m3 > 5   && m1 > 1)  return 'LEADER';
  if (m12 > 10  && m3 < 2   && m1 < -2) return 'FADING';
  if (m12 < 5   && m3 > 4   && m1 > 3)  return 'EMERGING';
  if (m12 < -5  && m3 < -3  && m1 < -1) return 'LAGGARD';
  if (m12 < -10 && m3 > -1  && m1 > 2)  return 'RECOVERING';

  return null;
}

// ─────────────────────────────────────────────────────────────
// Formatting helpers
// ─────────────────────────────────────────────────────────────

export function formatPercent(value: number | null): string {
  if (value === null || value === undefined) return 'N/A';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}%`;
}

export function formatLiquidity(value: string | number | null): string {
  if (!value) return 'N/A';
  if (typeof value === 'string') return value;
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return Math.round(value).toString();
}

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

// ─────────────────────────────────────────────────────────────
// Data merging
// ─────────────────────────────────────────────────────────────

/**
 * Merge static ETF metadata with fetched market data.
 * Returns an ETFData object with null market fields if no market data available.
 */
export function mergeETFData(
  metadata: { ticker: string; shortName: string; fullName: string; category: string; ter: number },
  marketData: Omit<ETFData, 'ticker' | 'shortName' | 'fullName' | 'category' | 'ter'> | null
): ETFData {
  if (!marketData) {
    return {
      ...metadata,
      price:              null,
      returns:            { '1M': null, '3M': null, '6M': null, '12M': null },
      alternateReturns:   { '1M': null, '3M': null, '6M': null, '12M': null },
      rsi:                null,
      liquidity:          'N/A',
      above200MA:         null,
      volatility:         { '3M': null, '6M': null, '12M': null },
      alternateVolatility:{ '3M': null, '6M': null, '12M': null },
      sharpeRatios:       { '3M': null, '6M': null, '12M': null },
      currencyNormalized: false,
    };
  }

  return { ...metadata, ...marketData };
}