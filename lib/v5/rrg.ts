// lib/v5/rrg.ts
// Relative Rotation Graph (RRG) Calculations for V5 Dashboard
// Based on Julius de Kempenaer's methodology
// UPDATED: Changed lookback period from 10 to 14 weeks

export interface RRGDataPoint {
  ticker: string;
  name: string;
  type?: string;            // "Cyc" | "Def" for sectors, blank for others
  rsRatio: number;          // Relative strength ratio vs benchmark
  rsMomentum: number;       // Rate of change of RS-Ratio
  quadrant: 'Leading' | 'Weakening' | 'Lagging' | 'Improving';
  color: string;
  weeklyChange: number;     // Week-over-week price change %
  trail?: RRGTrailPoint[];  // Historical positions for tail
}

export interface RRGTrailPoint {
  rsRatio: number;
  rsMomentum: number;
  weeksAgo: number;
}

export interface RRGHistoricalPoint {
  date: string;
  ticker: string;
  rsRatio: number;
  rsMomentum: number;
}

/**
 * ETF configurations for RRG views
 */
export const RRG_CONFIGURATIONS = {
  sectors: {
    name: 'Sector Rotation',
    benchmark: 'SPY',
    etfs: [
      // Cyclical
      { ticker: 'XLY', name: 'Consumer Discretionary', type: 'Cyc' },
      { ticker: 'XLC', name: 'Communication Services', type: 'Cyc' },
      { ticker: 'XLI', name: 'Industrials', type: 'Cyc' },
      { ticker: 'XLB', name: 'Materials', type: 'Cyc' },
      { ticker: 'XLE', name: 'Energy', type: 'Cyc' },
      // Defensive
      { ticker: 'XLP', name: 'Consumer Staples', type: 'Def' },
      { ticker: 'XLV', name: 'Healthcare', type: 'Def' },
      { ticker: 'XLU', name: 'Utilities', type: 'Def' },
      { ticker: 'XLRE', name: 'Real Estate', type: 'Def' },
      { ticker: 'XLK', name: 'Technology', type: 'Def' },
      { ticker: 'XLF', name: 'Financials', type: 'Def' }
    ]
  },
  factors: {
    name: 'Factor Rotation',
    benchmark: 'SPY',
    etfs: [
      { ticker: 'RPV', name: 'Value', type: '' },
      { ticker: 'RPG', name: 'Growth', type: '' },
      { ticker: 'MTUM', name: 'Momentum', type: '' },
      { ticker: 'SPLV', name: 'Low Volatility', type: '' },
      { ticker: 'QUAL', name: 'Quality', type: '' },
      { ticker: 'SCHD', name: 'Dividend', type: '' }
    ]
  },
  global: {
    name: 'Global Rotation',
    benchmark: 'SPY',
    etfs: [
      { ticker: 'RSP', name: 'Equal Weight', type: '' },
      { ticker: 'IWM', name: 'Small Cap', type: '' },
      { ticker: 'EFA', name: 'Developed Markets', type: '' },
      { ticker: 'EEM', name: 'Emerging Markets', type: '' },
      { ticker: 'DBC', name: 'Commodities', type: '' },
      { ticker: 'VNQ', name: 'Real Estate', type: '' },
      { ticker: 'MGK', name: 'Mega Cap Growth', type: 'US Large' }
    ]
  }
} as const;

/**
 * Calculate simple moving average
 */
function calculateSMA(values: number[], period: number): number[] {
  const sma: number[] = [];
  
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      sma.push(NaN); // Not enough data yet
    } else {
      const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
  }
  
  return sma;
}

/**
 * Calculate RS-Ratio (Relative Strength Ratio)
 * RS-Ratio = (ETF Price / Benchmark Price) * 100
 * Then normalize to 100 using a moving average
 * UPDATED: Default period changed from 10 to 14 weeks
 */
export function calculateRSRatio(
  etfPrices: number[],
  benchmarkPrices: number[],
  period: number = 14
): number[] {
  // Validate inputs
  if (etfPrices.length !== benchmarkPrices.length) {
    console.warn('ETF and benchmark price arrays must have same length');
    return etfPrices.map(() => NaN);
  }

  // Calculate raw ratio
  const rawRatio = etfPrices.map((price, i) => {
    if (benchmarkPrices[i] === 0 || benchmarkPrices[i] === null || benchmarkPrices[i] === undefined) {
      return NaN;
    }
    return (price / benchmarkPrices[i]) * 100;
  });
  
  // Calculate moving average for normalization
  const ma = calculateSMA(rawRatio, period);
  
  // Normalize: (Raw Ratio / MA) * 100
  const rsRatio = rawRatio.map((ratio, i) => {
    if (isNaN(ma[i]) || ma[i] === 0 || isNaN(ratio)) {
      return NaN;
    }
    return (ratio / ma[i]) * 100;
  });
  
  return rsRatio;
}

/**
 * Calculate RS-Momentum (Rate of change of RS-Ratio)
 * Uses z-score normalization for better distribution and less capping
 * UPDATED: Changed from MA normalization to z-score normalization
 */
export function calculateRSMomentum(
  rsRatio: number[],
  period: number = 14
): number[] {
  // Calculate rate of change
  const roc = rsRatio.map((value, i) => {
    if (i < period || isNaN(value) || isNaN(rsRatio[i - period]) || rsRatio[i - period] === 0) {
      return NaN;
    }
    return ((value / rsRatio[i - period]) - 1) * 100;
  });
  
  // Filter valid ROC values
  const validROC = roc.filter(v => !isNaN(v) && isFinite(v));
  
  const minRequired = Math.max(period, 20);
  if (validROC.length < minRequired) {
    console.warn(`Not enough valid ROC values for momentum: ${validROC.length} < ${minRequired}`);
    return rsRatio.map(() => NaN);
  }
  
  // Calculate mean of ROC
  const mean = validROC.reduce((sum, val) => sum + val, 0) / validROC.length;
  
  // Calculate standard deviation of ROC
  const squaredDiffs = validROC.map(val => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / validROC.length;
  const stdDev = Math.sqrt(variance);
  
  // Prevent division by zero - if stdDev is too small, all values are similar
  const safeStdDev = stdDev < 0.01 ? 0.01 : stdDev;
  
  // Create result array
  const rsMomentum: number[] = new Array(rsRatio.length).fill(NaN);
  
  // Calculate z-score for each ROC value and normalize to 100-centered scale
  roc.forEach((rocValue, index) => {
    if (!isNaN(rocValue) && isFinite(rocValue)) {
      // Calculate z-score: (value - mean) / stdDev
      const zScore = (rocValue - mean) / safeStdDev;
      
      // Scale z-score to center around 100
      // ±3 std devs maps to ±50 points (so 50 to 150 range)
      // Scale factor: 50 / 3 = 16.67
      let momentum = 100 + (zScore * 16.67);
      
      // CAP at ±150 (which represents ~3 standard deviations)
      if (momentum > 150) momentum = 150;
      if (momentum < 50) momentum = 50; // Note: using 50 as lower bound to match ±50 range
      
      if (isFinite(momentum)) {
        rsMomentum[index] = momentum;
      }
    }
  });
  
  return rsMomentum;
}

/**
 * Determine which quadrant a point falls into
 * NOTE: Quadrant positions based on handover specs
 */
export function determineQuadrant(
  rsRatio: number,
  rsMomentum: number
): 'Leading' | 'Weakening' | 'Lagging' | 'Improving' {
  // Top-right: Leading (high ratio, high momentum)
  if (rsRatio >= 100 && rsMomentum >= 100) return 'Leading';
  // Top-left: Improving (low ratio, high momentum)  
  if (rsRatio < 100 && rsMomentum >= 100) return 'Improving';
  // Bottom-left: Lagging (low ratio, low momentum)
  if (rsRatio < 100 && rsMomentum < 100) return 'Lagging';
  // Bottom-right: Weakening (high ratio, low momentum)
  return 'Weakening';
}

/**
 * Get color for quadrant - using exact colors from handover doc
 */
export function getQuadrantColor(quadrant: 'Leading' | 'Weakening' | 'Lagging' | 'Improving'): string {
  const colors = {
    Leading: '#22c55e',    // Green
    Weakening: '#fbbf24',  // Yellow
    Lagging: '#ef4444',    // Red
    Improving: '#60a5fa'   // Blue
  };
  return colors[quadrant];
}

/**
 * Calculate trail points (historical positions)
 * Returns positions at 2, 4, 6, 8 weeks back from current
 */
export function calculateTrailPoints(
  rsRatioSeries: number[],
  rsMomentumSeries: number[],
  tailLength: number = 4 // 0-4 dots
): RRGTrailPoint[] {
  if (tailLength === 0) return [];
  
  const trail: RRGTrailPoint[] = [];
  const weeksBack = [4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52]; // Every 4 weeks for 1 year
  
  for (let i = 0; i < Math.min(tailLength, weeksBack.length); i++) {
    const weeksAgo = weeksBack[i];
    const index = rsRatioSeries.length - 1 - weeksAgo;
    
    if (index >= 0 && !isNaN(rsRatioSeries[index]) && !isNaN(rsMomentumSeries[index])) {
      trail.push({
        rsRatio: rsRatioSeries[index],
        rsMomentum: rsMomentumSeries[index],
        weeksAgo
      });
    }
  }
  
  return trail;
}

/**
 * Calculate RRG position for a single ETF with trail
 * UPDATED: Minimum data requirement increased to 40 weeks (from 30) for 14-week lookback
 */
export function calculateRRGPosition(
  etfPrices: number[],
  benchmarkPrices: number[],
  ticker: string,
  name: string,
  type: string = '',
  tailLength: number = 4
): RRGDataPoint | null {
  // Validate input lengths - need at least 40 weeks for reliable RRG with 14-week lookback
  if (etfPrices.length < 40 || benchmarkPrices.length < 40) {
    console.warn(`Not enough data for ${ticker}: ETF=${etfPrices.length}, Benchmark=${benchmarkPrices.length} (need 40+ weeks)`);
    return null;
  }

  // Validate all prices are valid numbers
  const hasInvalidETF = etfPrices.some(p => p === null || p === undefined || isNaN(p) || p <= 0);
  const hasInvalidBenchmark = benchmarkPrices.some(p => p === null || p === undefined || isNaN(p) || p <= 0);
  
  if (hasInvalidETF || hasInvalidBenchmark) {
    console.warn(`Invalid price data for ${ticker}`);
    return null;
  }

  try {
    // Calculate RS-Ratio
    const rsRatio = calculateRSRatio(etfPrices, benchmarkPrices);
    
    // Calculate RS-Momentum
    const rsMomentum = calculateRSMomentum(rsRatio);
    
    // Get the most recent valid values
    let currentRSRatio = NaN;
    let currentRSMomentum = NaN;
    
    // Search backwards for valid values
    for (let i = rsRatio.length - 1; i >= 0; i--) {
      if (!isNaN(rsRatio[i]) && isFinite(rsRatio[i])) {
        currentRSRatio = rsRatio[i];
        break;
      }
    }
    
    for (let i = rsMomentum.length - 1; i >= 0; i--) {
      if (!isNaN(rsMomentum[i]) && isFinite(rsMomentum[i])) {
        currentRSMomentum = rsMomentum[i];
        break;
      }
    }
    
    if (isNaN(currentRSRatio) || isNaN(currentRSMomentum) || !isFinite(currentRSRatio) || !isFinite(currentRSMomentum)) {
      console.warn(`Invalid RRG values for ${ticker}: Ratio=${currentRSRatio}, Momentum=${currentRSMomentum}`);
      return null;
    }
    
    // Calculate weekly price change (current week vs last week)
    const currentPrice = etfPrices[etfPrices.length - 1];
    const lastWeekPrice = etfPrices[etfPrices.length - 2];
    const weeklyChange = ((currentPrice - lastWeekPrice) / lastWeekPrice) * 100;
    
    const quadrant = determineQuadrant(currentRSRatio, currentRSMomentum);
    const color = getQuadrantColor(quadrant);
    
    // Calculate trail
    const trail = calculateTrailPoints(rsRatio, rsMomentum, tailLength);
    
    return {
      ticker,
      name,
      type,
      rsRatio: currentRSRatio,
      rsMomentum: currentRSMomentum,
      quadrant,
      color,
      weeklyChange,
      trail
    };
  } catch (error) {
    console.error(`Error calculating RRG position for ${ticker}:`, error);
    return null;
  }
}

/**
 * Process weekly price data from daily data
 */
export function convertToWeeklyData(
  dailyPrices: Array<{ date: string; close: number }>
): { dates: string[]; prices: number[] } {
  const weeklyData: Array<{ date: string; close: number }> = [];
  
  // Group by week (ISO week: Monday to Sunday)
  const weekMap = new Map<string, { date: string; close: number }>();
  
  dailyPrices.forEach(({ date, close }) => {
    const dateObj = new Date(date);
    // Get the Monday of this week
    const dayOfWeek = dateObj.getDay();
    const diff = dateObj.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(dateObj.setDate(diff));
    const weekKey = monday.toISOString().split('T')[0];
    
    // Keep the latest (Friday) close for each week
    if (!weekMap.has(weekKey) || new Date(date) > new Date(weekMap.get(weekKey)!.date)) {
      weekMap.set(weekKey, { date, close });
    }
  });
  
  // Convert map to sorted array
  const sortedWeeks = Array.from(weekMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([_, data]) => data);
  
  return {
    dates: sortedWeeks.map(w => w.date),
    prices: sortedWeeks.map(w => w.close)
  };
}

/**
 * Get all tickers needed for a specific RRG view
 */
export function getRRGTickers(view: 'sectors' | 'factors' | 'global'): string[] {
  const config = RRG_CONFIGURATIONS[view];
  return [config.benchmark, ...config.etfs.map(e => e.ticker)];
}

/**
 * Get display name for a ticker in RRG context
 */
export function getRRGDisplayName(ticker: string, view: 'sectors' | 'factors' | 'global'): string {
  const config = RRG_CONFIGURATIONS[view];
  const etf = config.etfs.find(e => e.ticker === ticker);
  return etf ? etf.name : ticker;
}

/**
 * Get type for a ticker (only sectors have types)
 */
export function getRRGType(ticker: string, view: 'sectors' | 'factors' | 'global'): string {
  const config = RRG_CONFIGURATIONS[view];
  const etf = config.etfs.find(e => e.ticker === ticker);
  return etf?.type || '';
}
