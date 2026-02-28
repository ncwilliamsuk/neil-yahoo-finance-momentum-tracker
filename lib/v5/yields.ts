import { FREDObservation } from './fred';

export interface YieldDataPoint {
  date: string;
  [key: string]: number | string; // Dynamic keys for each series
}

export interface MacroIndicator {
  name: string;
  current: number | null;
  percentile: number;
  status: {
    label: string;
    color: string;
  };
  interpretation: string;
  note?: string;
}

/**
 * Transform FRED observations into chart-ready format
 * Aligns all series by date (handles missing dates in some series)
 * @param seriesData - Object with series names as keys and observation arrays as values
 * @returns Array of data points with all series aligned by date
 */
export function transformToChartData(
  seriesData: Record<string, FREDObservation[]>
): YieldDataPoint[] {
  // Collect all unique dates
  const allDates = new Set<string>();
  Object.values(seriesData).forEach(observations => {
    observations.forEach(obs => allDates.add(obs.date));
  });

  // Sort dates
  const sortedDates = Array.from(allDates).sort();

  // Build data points for each date
  const chartData: YieldDataPoint[] = sortedDates.map(date => {
    const dataPoint: YieldDataPoint = { date };

    // Add values from each series for this date
    Object.entries(seriesData).forEach(([seriesKey, observations]) => {
      const observation = observations.find(obs => obs.date === date);
      if (observation && observation.value !== '.') {
        dataPoint[seriesKey] = parseFloat(observation.value);
      }
    });

    return dataPoint;
  });

  return chartData;
}

/**
 * Get U-shaped status for yield-based metrics
 * Very low OR very high = concerning
 * Middle range = healthy
 * 
 * @param percentile - Percentile rank (0-100)
 * @returns Status object with label and color
 */
export function getUShapedStatus(percentile: number): { label: string; color: string } {
  if (percentile <= 10 || percentile >= 90) {
    return { label: 'Extreme', color: '#ef4444' }; // Red
  } else if (percentile <= 25 || percentile >= 75) {
    return { label: 'Elevated', color: '#f59e0b' }; // Orange
  } else {
    return { label: 'Normal', color: '#10b981' }; // Green
  }
}

/**
 * Get linear status for metrics where higher is worse
 * (e.g., unemployment, inflation)
 * 
 * @param percentile - Percentile rank (0-100)
 * @returns Status object with label and color
 */
export function getLinearHighBadStatus(percentile: number): { label: string; color: string } {
  if (percentile >= 80) {
    return { label: 'Very High', color: '#ef4444' }; // Red
  } else if (percentile >= 60) {
    return { label: 'Elevated', color: '#f59e0b' }; // Orange
  } else if (percentile >= 40) {
    return { label: 'Moderate', color: '#fbbf24' }; // Yellow
  } else if (percentile >= 20) {
    return { label: 'Low', color: '#86efac' }; // Light green
  } else {
    return { label: 'Very Low', color: '#10b981' }; // Green
  }
}

/**
 * Get linear status for metrics where higher is better
 * (e.g., M2 growth in certain contexts)
 * 
 * @param percentile - Percentile rank (0-100)
 * @returns Status object with label and color
 */
export function getLinearHighGoodStatus(percentile: number): { label: string; color: string } {
  if (percentile >= 80) {
    return { label: 'Very High', color: '#10b981' }; // Green
  } else if (percentile >= 60) {
    return { label: 'Elevated', color: '#86efac' }; // Light green
  } else if (percentile >= 40) {
    return { label: 'Moderate', color: '#fbbf24' }; // Yellow
  } else if (percentile >= 20) {
    return { label: 'Low', color: '#f59e0b' }; // Orange
  } else {
    return { label: 'Very Low', color: '#ef4444' }; // Red
  }
}

/**
 * Get spread-specific status
 * Inverted yield curve (negative spread) = concerning
 * 
 * @param value - Actual spread value
 * @param percentile - Percentile rank (0-100)
 * @returns Status object with label and color
 */
export function getSpreadStatus(
  value: number,
  percentile: number
): { label: string; color: string } {
  // Negative spread = inverted curve = recession warning
  if (value < 0) {
    return { label: 'Inverted', color: '#ef4444' }; // Red
  } else if (value < 0.25) {
    return { label: 'Flattening', color: '#f59e0b' }; // Orange
  } else if (percentile >= 75) {
    return { label: 'Steep', color: '#10b981' }; // Green
  } else {
    return { label: 'Normal', color: '#86efac' }; // Light green
  }
}

/**
 * Create macro indicator object with percentile and status
 * 
 * @param name - Display name
 * @param current - Current value
 * @param percentile - Percentile rank
 * @param statusType - Type of status logic to apply
 * @returns MacroIndicator object
 */
export function createMacroIndicator(
  name: string,
  current: number | null,
  percentile: number,
  statusType: 'u-shaped' | 'linear-high-bad' | 'linear-high-good' | 'spread',
  spreadValue?: number
): MacroIndicator {
  let status: { label: string; color: string };
  let interpretation: string;

  switch (statusType) {
    case 'u-shaped':
      status = getUShapedStatus(percentile);
      interpretation = getYieldInterpretation(percentile, current);
      break;
    case 'linear-high-bad':
      status = getLinearHighBadStatus(percentile);
      interpretation = getHighBadInterpretation(name, percentile, current);
      break;
    case 'linear-high-good':
      status = getLinearHighGoodStatus(percentile);
      interpretation = getHighGoodInterpretation(name, percentile, current);
      break;
    case 'spread':
      status = getSpreadStatus(spreadValue || current || 0, percentile);
      interpretation = getSpreadInterpretation(spreadValue || current || 0, percentile);
      break;
  }

  return {
    name,
    current,
    percentile,
    status,
    interpretation
  };
}

/**
 * Generate interpretation text for yield-based metrics (U-shaped)
 */
function getYieldInterpretation(percentile: number, value: number | null): string {
  if (value === null) return 'No data available';
  
  if (percentile <= 10) {
    return 'Historically low yields - may signal growth concerns or excessive easing';
  } else if (percentile >= 90) {
    return 'Historically high yields - may signal inflation concerns or tight policy';
  } else if (percentile >= 25 && percentile <= 75) {
    return 'Yields in normal historical range';
  } else if (percentile < 25) {
    return 'Below average yields - accommodative conditions';
  } else {
    return 'Above average yields - tightening conditions';
  }
}

/**
 * Generate interpretation for metrics where high is bad (unemployment, CPI)
 */
function getHighBadInterpretation(name: string, percentile: number, value: number | null): string {
  if (value === null) return 'No data available';
  
  if (name.toLowerCase().includes('unemployment')) {
    if (percentile >= 80) {
      return 'Very high unemployment - significant labor market weakness';
    } else if (percentile >= 60) {
      return 'Elevated unemployment - some labor market slack';
    } else if (percentile <= 20) {
      return 'Very low unemployment - tight labor market';
    } else {
      return 'Moderate unemployment - balanced labor market';
    }
  } else if (name.toLowerCase().includes('cpi') || name.toLowerCase().includes('inflation')) {
    if (percentile >= 80) {
      return 'Very high inflation - significant price pressures';
    } else if (percentile >= 60) {
      return 'Elevated inflation - above target';
    } else if (percentile <= 20) {
      return 'Low inflation - potential deflationary concerns';
    } else {
      return 'Moderate inflation - near target range';
    }
  }
  
  return percentile >= 60 ? 'Elevated levels' : 'Normal levels';
}

/**
 * Generate interpretation for metrics where high is good (M2 growth)
 */
function getHighGoodInterpretation(name: string, percentile: number, value: number | null): string {
  if (value === null) return 'No data available';
  
  if (percentile >= 80) {
    return 'Strong growth - ample liquidity';
  } else if (percentile >= 60) {
    return 'Above average growth - healthy expansion';
  } else if (percentile <= 20) {
    return 'Weak growth - tightening liquidity';
  } else {
    return 'Moderate growth - neutral conditions';
  }
}

/**
 * Generate interpretation for spread metrics
 */
function getSpreadInterpretation(value: number, percentile: number): string {
  if (value < 0) {
    return 'Inverted yield curve - historical recession indicator';
  } else if (value < 0.25) {
    return 'Flat yield curve - potential growth concerns';
  } else if (percentile >= 75) {
    return 'Steep yield curve - strong growth expectations';
  } else {
    return 'Normal yield curve - balanced growth outlook';
  }
}

/**
 * Calculate percentile from observations
 * @param current - Current value
 * @param observations - Historical observations
 * @returns Percentile rank (0-100)
 */
export function calculatePercentileFromObservations(
  current: number | null,
  observations: FREDObservation[]
): number {
  if (current === null) return 0;
  
  const values = observations
    .map(obs => parseFloat(obs.value))
    .filter(v => !isNaN(v));
  
  if (values.length === 0) return 50;
  
  const sorted = values.sort((a, b) => a - b);
  const rank = sorted.filter(v => v <= current).length;
  
  return (rank / sorted.length) * 100;
}

/**
 * Get the lookback period start date
 * @param years - Number of years to look back (default 1 year = 252 trading days)
 * @returns Date string in YYYY-MM-DD format
 */
export function getLookbackStartDate(years: number = 1): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date.toISOString().split('T')[0];
}