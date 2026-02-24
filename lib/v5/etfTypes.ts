// lib/v5/etfTypes.ts
// Standalone types for Tab 5 ETF Screener — do not import from lib/etf/

/**
 * Core ETF metadata from the static list
 */
export interface ETFMetadata {
  ticker:           string;
  shortName:        string;
  fullName:         string;
  category:         string;
  ter:              number;
  // Extended universe fields (optional — not present on core ETFs)
  universe?:        'extended';  // absent = appears in both Core and Extended; 'extended' = Extended only
  isEsg?:           boolean;
  isHedged?:        boolean;
  distAlternative?: string;  // ticker of dist share class — reference only, never used by dashboard
  currencyNote?:    string;  // undefined=LSE £, 'USD'=US-listed no LSE equiv, 'LSE-ETP'=LSE ETP not ETF
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
 * Sharpe ratio data for different periods
 * Calculated as (return - risk_free_rate) / annualised_volatility
 * Risk-free rate sourced from SONIA (FRED series IUDSOIA)
 */
export interface SharpeRatios {
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
  alternateReturns: Returns;         // For "Remove Latest Month" mode
  rsi: number | null;
  liquidity: string;
  above200MA: boolean | null;
  volatility: Volatility;
  alternateVolatility: Volatility;
  sharpeRatios: SharpeRatios;        // True Sharpe using SONIA risk-free rate
  currencyNormalized?: boolean;      // Flag if GBX↔GBP normalisation was applied
  score?: number;                    // Calculated momentum score (0-100)
  label?: MomentumLabel | null;      // Calculated momentum label
}

/**
 * Momentum classification labels
 */
export type MomentumLabel = 'LEADER' | 'EMERGING' | 'RECOVERING' | 'FADING' | 'LAGGARD';

/**
 * ETF universe selection
 */
export type Universe = 'core' | 'extended';

/**
 * Category groups used in the V5 screener
 * Matches the category strings in etfList.ts exactly
 */
export type ScreenerCategory =
  | 'Countries'
  | 'Broad Regions'
  | 'Sectors US'
  | 'Sectors World'
  | 'Sectors Europe'
  | 'Factors'
  | 'Commodities'
  | 'Crypto'
  | 'Thematics'
  | 'Bonds';

/**
 * Rotation overview category groupings
 * Used by ScreenerRotationOverviewCard
 */
export type RotationCategory =
  | 'Factors'
  | 'Sectors'
  | 'Commodities'
  | 'Broad Regions'
  | 'Countries'
  | 'Bonds'
  | 'Crypto & Thematics';

/**
 * Screener dashboard state
 */
export interface ScreenerState {
  universe: Universe;
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