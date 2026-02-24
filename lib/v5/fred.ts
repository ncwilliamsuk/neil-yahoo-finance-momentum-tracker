// lib/v5/fred.ts
// FRED API Integration for V5 Dashboard with US/UK Support

const FRED_API_KEY = process.env.FRED_API_KEY;
const FRED_BASE_URL = 'https://api.stlouisfed.org/fred';

export interface FREDObservation {
  date: string;
  value: string; // FRED returns strings, we'll convert to numbers
}

export interface FREDSeriesResponse {
  observations: FREDObservation[];
}

/**
 * Fetch observations for a single FRED series
 */
export async function fetchFREDSeries(
  seriesId: string,
  startDate: string,
  endDate?: string
): Promise<FREDObservation[]> {
  if (!FRED_API_KEY) {
    throw new Error('FRED_API_KEY not found in environment variables');
  }

  const end = endDate || new Date().toISOString().split('T')[0];
  
  const url = `${FRED_BASE_URL}/series/observations?series_id=${seriesId}&api_key=${FRED_API_KEY}&file_type=json&observation_start=${startDate}&observation_end=${end}`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`FRED API error: ${response.status} ${response.statusText}`);
    }

    const data: FREDSeriesResponse = await response.json();
    
    // Filter out missing values (FRED uses '.' for missing data)
    return data.observations.filter(obs => obs.value !== '.');
  } catch (error) {
    console.error(`Error fetching FRED series ${seriesId}:`, error);
    throw error;
  }
}

/**
 * Fetch multiple FRED series in parallel
 */
export async function fetchMultipleFREDSeries(
  seriesIds: Record<string, string>,
  startDate: string,
  endDate?: string
): Promise<Record<string, FREDObservation[]>> {
  const promises = Object.entries(seriesIds).map(async ([key, seriesId]) => {
    const data = await fetchFREDSeries(seriesId, startDate, endDate);
    return [key, data] as const;
  });

  const results = await Promise.all(promises);
  return Object.fromEntries(results);
}

/**
 * Get the most recent observation for a FRED series
 */
export async function getLatestFREDValue(seriesId: string): Promise<number | null> {
  // Fetch last 90 days to ensure we get recent data
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90);

  const observations = await fetchFREDSeries(
    seriesId,
    startDate.toISOString().split('T')[0],
    endDate.toISOString().split('T')[0]
  );

  if (observations.length === 0) return null;

  // Get the most recent observation
  const latest = observations[observations.length - 1];
  return parseFloat(latest.value);
}

/**
 * Calculate percentile rank for a value within a dataset
 */
export function calculatePercentile(
  value: number | null,
  allValues: (number | null)[]
): number {
  if (value === null || value === undefined) return 0;
  
  const validValues = allValues.filter(v => v !== null && v !== undefined) as number[];
  if (validValues.length === 0) return 50; // Default to middle if no data
  
  const sorted = validValues.sort((a, b) => a - b);
  const rank = sorted.filter(v => v <= value).length;
  
  return (rank / sorted.length) * 100;
}

/**
 * Calculate year-over-year percentage change from CPI index observations
 * CPI indices are base 100, need to convert to YoY % change
 */
export function calculateYoYChange(observations: FREDObservation[]): FREDObservation[] {
  const result: FREDObservation[] = [];
  
  for (let i = 12; i < observations.length; i++) {
    const current = parseFloat(observations[i].value);
    const yearAgo = parseFloat(observations[i - 12].value);
    
    if (!isNaN(current) && !isNaN(yearAgo) && yearAgo !== 0) {
      const yoyChange = ((current - yearAgo) / yearAgo) * 100;
      
      result.push({
        date: observations[i].date,
        value: yoyChange.toFixed(2)
      });
    }
  }
  
  return result;
}

/**
 * US FRED Series IDs for V5 Dashboard
 */
export const US_FRED_SERIES = {
  // Yields (for chart)
  yield_3m: 'DGS3MO',
  yield_2y: 'DGS2',
  yield_5y: 'DGS5',
  yield_10y: 'DGS10',
  yield_30y: 'DGS30',
  
  // Spreads (for chart)
  spread_10y2y: 'T10Y2Y',
  spread_10y3m: 'T10Y3M',
  
  // Policy & Rates (for chart + macro table)
  policy_rate: 'FEDFUNDS',
  fed_funds: 'FEDFUNDS',
  real_rate: 'DFII10', // 10-Year TIPS
  
  // Macro indicators (for macro table only)
  cpi: 'CPIAUCSL',
  unemployment: 'UNRATE',
  m2: 'M2SL',
  
  // NEW - Additional indicators
  breakeven_10y: 'T10YIE',
  credit_spread: 'BAMLH0A0HYM2',
  manufacturing: 'IPMAN',
  retail_sales: 'RSXFS',
  house_prices: 'CSUSHPINSA'
} as const;

/**
 * UK FRED Series IDs for V5 Dashboard
 */
export const UK_FRED_SERIES = {
  // Yields (for chart) - LIMITED AVAILABILITY
  yield_3m: 'IUDSOIA',     // 3-Month Treasury Bill
  yield_10y: 'IRLTLT01GBM156N',    // 10-Year Gilt
  
  // Note: 2Y, 5Y, 30Y not available in FRED - will fetch from Yahoo Finance
  // Note: policy_rate fetched from Yahoo Finance (VASTMGA.L - Vanguard UK MMF)
  
  // Macro indicators (for macro table only)
  cpi: 'GBRCPIALLMINMEI',          // UK CPI All Items
  unemployment: 'LRHUTTTTGBM156N', // Harmonised Unemployment Rate
  
  // NEW - Additional indicators
  // breakeven_10y: Not available in FRED for UK
  // credit_spread: Will calculate from Yahoo Finance (IHYG.L vs IGLT.L)
  manufacturing: 'GBRPRMNTO01GYSAQ',
  retail_sales: 'CP0410GBM086NEST',
  house_prices: 'QGBN628BIS'
} as const;

/**
 * Yahoo Finance tickers for UK Gilts (not in FRED)
 * Note: Using UK government bond ETFs as proxies since direct gilt futures don't work well
 */
export const UK_YAHOO_GILTS = {
  yield_2y: '^GB2Y',   // Vanguard UK Gilt 0-5 Year UCITS ETF (2Y proxy)
  yield_5y: '^GB5Y',   // Same as 2Y (will use same data)
  yield_30y: '^GB30Y'   // Vanguard UK Long Duration Gilt UCITS ETF (30Y proxy)
} as const;

/**
 * Get series that should be displayed on yield curve chart
 */
export const YIELD_CURVE_SERIES = [
  'yield_3m',
  'yield_2y', 
  'yield_5y',
  'yield_10y',
  'yield_30y',
  'spread_10y2y',
  'spread_10y3m',
  'policy_rate', // fed_funds for US, policy_rate for UK
  'real_rate'    // US only
] as const;

/**
 * Default checked series for yield curve chart
 */
export const DEFAULT_CHECKED_SERIES = [
  'yield_2y',
  'yield_10y',
  'policy_rate',
  'spread_10y2y',
  'spread_10y3m'
] as const;

/**
 * Macro table only series (not on chart)
 */
export const MACRO_TABLE_ONLY_SERIES = [
  'cpi',
  'unemployment',
  'm2',
  'breakeven_10y',
  'credit_spread',
  'manufacturing',
  'retail_sales',
  'house_prices'
] as const;

/**
 * Friendly names for display (US)
 */
export const US_SERIES_NAMES: Record<string, string> = {
  yield_3m: '3 Month',
  yield_2y: '2 Year',
  yield_5y: '5 Year',
  yield_10y: '10 Year',
  yield_30y: '30 Year',
  spread_10y2y: '10Y-2Y Spread',
  spread_10y3m: '10Y-3M Spread',
  policy_rate: 'Fed Funds',
  fed_funds: 'Fed Funds',
  real_rate: 'Real Rate (10Y TIPS)',
  cpi: 'CPI (YoY %)',
  unemployment: 'Unemployment Rate',
  m2: 'M2 Money Supply',
  breakeven_10y: '10Y Breakeven Inflation',
  credit_spread: 'Credit Spread (HY)',
  manufacturing: 'Manufacturing Production',
  retail_sales: 'Retail Sales',
  house_prices: 'House Prices'
};

/**
 * Friendly names for display (UK)
 */
export const UK_SERIES_NAMES: Record<string, string> = {
  yield_3m: 'SONIA',
  yield_2y: '2 Year',
  yield_5y: '5 Year',
  yield_10y: '10 Year',
  yield_30y: '30 Year',
  spread_10y2y: '10Y-2Y Spread',
  spread_10y3m: '10Y-3M Spread',
  policy_rate: 'BOE Base Rate',
  real_rate: 'Real Rate (10Y-CPI)',
  cpi: 'CPI (YoY %)',
  unemployment: 'Unemployment Rate',
  m2: 'M2 Money Supply (US)',
  breakeven_10y: '10Y Breakeven Inflation',
  credit_spread: 'Credit Spread',
  manufacturing: 'Manufacturing Production',
  retail_sales: 'Retail Sales',
  house_prices: 'House Prices'
};

/**
 * Series colors for chart visualization
 */
export const SERIES_COLORS: Record<string, string> = {
  yield_3m: '#94a3b8',   // Slate
  yield_2y: '#3b82f6',   // Blue
  yield_5y: '#8b5cf6',   // Purple
  yield_10y: '#f59e0b',  // Amber
  yield_30y: '#ef4444',  // Red
  spread_10y2y: '#10b981', // Green
  spread_10y3m: '#06b6d4', // Cyan
  policy_rate: '#ec4899',  // Pink
  fed_funds: '#ec4899',    // Pink
  real_rate: '#6366f1'     // Indigo
};

/**
 * Get series names based on region
 */
export function getSeriesNames(region: 'US' | 'UK'): Record<string, string> {
  return region === 'US' ? US_SERIES_NAMES : UK_SERIES_NAMES;
}

/**
 * Get available series for a region
 */
export function getAvailableSeries(region: 'US' | 'UK'): string[] {
  if (region === 'US') {
    return [
      'yield_3m', 'yield_2y', 'yield_5y', 'yield_10y', 'yield_30y',
      'spread_10y2y', 'spread_10y3m', 'policy_rate', 'real_rate'
    ];
  } else {
    return [
      'yield_3m', 'yield_2y', 'yield_5y', 'yield_10y', 'yield_30y',
      'spread_10y2y', 'spread_10y3m', 'policy_rate'
      // Note: real_rate not available for UK
    ];
  }
}
