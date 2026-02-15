// lib/etf/types.ts

/**
 * Core ETF metadata from the static list
 */
export interface ETFMetadata {
  ticker: string;
  shortName: string;
  fullName: string;
  category: string;
  ter: number;
}

/**
 * Return data for different time periods
 */
export interface Returns {
  '1M': number | null;
  '3M': number | null;
  '6M': number | null;
  '12M': number | null;
}

/**
 * Volatility data for different periods (annualized %)
 */
export interface Volatility {
  '3M': number | null;
  '6M': number | null;
  '12M': number | null;
}

/**
 * Complete ETF data (metadata + market data)
 */
export interface ETFData extends ETFMetadata {
  price: number | null;
  returns: Returns;
  alternateReturns: Returns; // For "Remove Latest Month" mode
  rsi: number | null;
  liquidity: string;
  above200MA: boolean | null;
  volatility: Volatility;
  alternateVolatility: Volatility;
  currencyNormalized?: boolean;  // NEW: Flag if prices were normalized
  score?: number; // Calculated momentum score
  label?: MomentumLabel | null; // Calculated label
}

/**
 * Momentum classification labels
 */
export type MomentumLabel = 'LEADER' | 'EMERGING' | 'RECOVERING' | 'FADING' | 'LAGGARD';

/**
 * Category groups for rotation overview
 */
export type CategoryGroup = 
  | 'Factor'
  | 'GICS Sectors'
  | 'Commodities'
  | 'Regions'
  | 'Countries'
  | 'Asset Class'
  | 'Crypto + Thematic';

/**
 * Dashboard state for filters and settings
 */
export interface DashboardState {
  weights: {
    m3: number;
    m6: number;
    m12: number;
  };
  filters: {
    category: string;
    label: string;
    search: string;
  };
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  selectedETFs: Set<string>;
  calculationMode: 'standard' | 'risk-adj';
  removeLatestMonth: boolean;
  maFilter: boolean;
  compareMode: boolean;
}