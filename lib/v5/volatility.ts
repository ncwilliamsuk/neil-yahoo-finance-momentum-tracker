import { calculatePercentile } from '@/lib/etf/calculations';

export interface HistoricalVolatility {
  date: string;
  vix: number;
  vix3m: number;
  vvix: number;
  move: number;
  skew: number;
}

export interface VolatilityWeights {
  vix: number;
  vix3m: number;
  vvix: number;
  move: number;
  skew: number;
}

/**
 * Calculate composite volatility score (0-100)
 * Uses percentile ranking + regime adjustments
 */
export function calculateCompositeVolatility(
  vix: number,
  vix3m: number,
  vvix: number,
  move: number,
  skew: number,
  weights: VolatilityWeights,
  historicalData: HistoricalVolatility[]
): number {
  // Extract historical values for each metric
  const vixHistory = historicalData.map(d => d.vix);
  const vix3mHistory = historicalData.map(d => d.vix3m);
  const vvixHistory = historicalData.map(d => d.vvix);
  const moveHistory = historicalData.map(d => d.move);
  const skewHistory = historicalData.map(d => d.skew);

  // Calculate percentiles (include today's value)
  const vixPercentile = calculatePercentile(vix, [...vixHistory, vix]);
  const vix3mPercentile = calculatePercentile(vix3m, [...vix3mHistory, vix3m]);
  const vvixPercentile = calculatePercentile(vvix, [...vvixHistory, vvix]);
  const movePercentile = calculatePercentile(move, [...moveHistory, move]);
  const skewPercentile = calculatePercentile(skew, [...skewHistory, skew]);

  // Apply weights (sum to 100)
  let score =
    (vixPercentile * weights.vix / 100) +
    (vix3mPercentile * weights.vix3m / 100) +
    (vvixPercentile * weights.vvix / 100) +
    (movePercentile * weights.move / 100) +
    (skewPercentile * weights.skew / 100);

  // Regime Adjustment 1: VVIX > 110 AND VIX < 20 = Complacent
  if (vvix > 110 && vix < 20) {
    score += 25;
  }

  // Regime Adjustment 2: VIX > VIX3M = Immediate fear
  if (vix > vix3m) {
    score = Math.max(score, 70);
  }

  // Clamp to 0-100
  return Math.max(0, Math.min(100, score));
}

/**
 * Get zone interpretation for composite score
 */
export function getVolatilityZone(score: number): {
  zone: string;
  color: string;
  interpretation: string;
} {
  if (score < 20) return {
    zone: 'COMPLACENT',
    color: '#22c55e',
    interpretation: 'Extremely low volatility. Markets calm, but complacency can precede sharp moves.'
  };

  if (score < 40) return {
    zone: 'NORMAL',
    color: '#86efac',
    interpretation: 'Healthy volatility environment. Normal market conditions.'
  };

  if (score < 60) return {
    zone: 'ELEVATED',
    color: '#fbbf24',
    interpretation: 'Rising uncertainty. Monitor for potential stress.'
  };

  if (score < 80) return {
    zone: 'HIGH',
    color: '#f97316',
    interpretation: 'Significant volatility. Risk-off environment developing.'
  };

  return {
    zone: 'EXTREME',
    color: '#ef4444',
    interpretation: 'Crisis-level volatility. Extreme fear in markets.'
  };
}

/**
 * Get status for individual volatility metric
 */
export function getMetricStatus(metric: string, value: number): {
  status: string;
  color: string;
  interpretation: string;
} {
  const thresholds: Record<string, { low: number; normal: number; elevated: number; high: number }> = {
    VIX: { low: 12, normal: 20, elevated: 30, high: 40 },
    VIX3M: { low: 15, normal: 22, elevated: 32, high: 42 },
    VVIX: { low: 80, normal: 100, elevated: 120, high: 140 },
    MOVE: { low: 70, normal: 90, elevated: 110, high: 130 },
    SKEW: { low: 120, normal: 135, elevated: 145, high: 155 }
  };

  const t = thresholds[metric];
  if (!t) return { status: 'Unknown', color: '#94a3b8', interpretation: 'Unknown metric' };

  const interpretations: Record<string, Record<string, string>> = {
    VIX: {
      veryLow: 'Extreme complacency - monitor for sharp reversals',
      low: 'Calm conditions - healthy low volatility',
      normal: 'Moderate volatility - normal market environment',
      elevated: 'Rising uncertainty - caution warranted',
      high: 'Crisis-level fear - extreme market stress'
    },
    VIX3M: {
      veryLow: 'Term structure flat - sustained calm expected',
      low: 'Normal term structure - no fear priced in',
      normal: 'Elevated term vol - uncertainty building',
      elevated: 'High term vol - prolonged stress expected',
      high: 'Extreme term vol - crisis expectations'
    },
    VVIX: {
      veryLow: 'Options market complacent - hedging minimal',
      low: 'Normal options volatility - standard hedging',
      normal: 'Elevated options vol - active hedging',
      elevated: 'High options vol - heavy hedging activity',
      high: 'Extreme vol-of-vol - panic hedging'
    },
    MOVE: {
      veryLow: 'Bond market calm - no fixed income stress',
      low: 'Normal bond volatility - stable rates',
      normal: 'Moderate bond vol - rate uncertainty',
      elevated: 'High bond vol - rate volatility rising',
      high: 'Extreme bond vol - fixed income distress'
    },
    SKEW: {
      veryLow: 'Low tail risk pricing - no crash concerns',
      low: 'Normal tail risk - standard crash protection',
      normal: 'Moderate tail risk - increased crash hedging',
      elevated: 'High tail risk - significant crash fears',
      high: 'Extreme tail risk - severe crash protection'
    }
  };

  const metricInterps = interpretations[metric] || interpretations.VIX;

  if (value < t.low) return {
    status: 'Very Low',
    color: '#22c55e',
    interpretation: metricInterps.veryLow
  };

  if (value < t.normal) return {
    status: 'Low',
    color: '#86efac',
    interpretation: metricInterps.low
  };

  if (value < t.elevated) return {
    status: 'Normal',
    color: '#fbbf24',
    interpretation: metricInterps.normal
  };

  if (value < t.high) return {
    status: 'Elevated',
    color: '#f97316',
    interpretation: metricInterps.elevated
  };

  return {
    status: 'High',
    color: '#ef4444',
    interpretation: metricInterps.high
  };
}