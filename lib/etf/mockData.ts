// lib/etf/mockData.ts

import { ETFData } from './types';

/**
 * Mock market data for testing
 * Covers different scenarios:
 * - LEADER: Strong performance across all periods
 * - LAGGARD: Poor performance across all periods
 * - RECOVERING: Was bad, now improving
 * - FADING: Was good, now declining
 * - EMERGING: Short-term strength
 * - Various volatility levels for risk-adjusted testing
 */
export const MOCK_DATA: Record<string, Omit<ETFData, 'ticker' | 'shortName' | 'fullName' | 'category' | 'ter'>> = {
  // LEADER - Strong across all periods, HIGH volatility
  'CSP1.L': {
    price: 85.20,
    returns: { '1M': 4.8, '3M': 11.2, '6M': 20.1, '12M': 35.6 },
    alternateReturns: { '1M': null, '3M': 8.5, '6M': 18.2, '12M': 32.1 },
    rsi: 75,
    liquidity: '61.2M',
    above200MA: true,
    volatility: { '3M': 18.5, '6M': 19.2, '12M': 20.1 },
    alternateVolatility: { '3M': 17.8, '6M': 18.5, '12M': 19.3 }
  },

  // LEADER - Tech strong, HIGH volatility (will drop in risk-adjusted)
  'IITU.L': {
    price: 142.50,
    returns: { '1M': 5.2, '3M': 12.8, '6M': 22.4, '12M': 38.9 },
    alternateReturns: { '1M': null, '3M': 9.1, '6M': 19.5, '12M': 35.2 },
    rsi: 72,
    liquidity: '6.2M',
    above200MA: true,
    volatility: { '3M': 22.3, '6M': 23.1, '12M': 24.5 },
    alternateVolatility: { '3M': 21.5, '6M': 22.3, '12M': 23.7 }
  },

  // Precious metal - moderate returns, MODERATE volatility
  // Latest month was STRONG (8.2%) - removing it will hurt ranking
  'SGLN.L': {
    price: 38.90,
    returns: { '1M': 8.2, '3M': 4.5, '6M': 6.8, '12M': 12.3 },
    alternateReturns: { '1M': null, '3M': 0.8, '6M': 3.2, '12M': 8.5 },
    rsi: 68,
    liquidity: '29.2B',
    above200MA: true,
    volatility: { '3M': 12.2, '6M': 13.5, '12M': 14.8 },
    alternateVolatility: { '3M': 11.5, '6M': 12.8, '12M': 14.1 }
  },

  // Bond - low returns but VERY LOW volatility (will rank HIGHER in risk-adjusted)
  'VGVA.L': {
    price: 48.90,
    returns: { '1M': 0.2, '3M': -1.5, '6M': -2.8, '12M': 1.2 },
    alternateReturns: { '1M': null, '3M': -1.8, '6M': -3.1, '12M': 0.8 },
    rsi: 42,
    liquidity: '169K',
    above200MA: false,
    volatility: { '3M': 2.1, '6M': 2.3, '12M': 2.5 },
    alternateVolatility: { '3M': 2.0, '6M': 2.2, '12M': 2.4 }
  },

  // RECOVERING - was bad, now improving, MODERATE volatility
  // Latest month was GOOD (3.5%) - removing it shows recovery less clearly
  'INRG.L': {
    price: 12.40,
    returns: { '1M': 3.5, '3M': 2.8, '6M': -8.2, '12M': -12.5 },
    alternateReturns: { '1M': null, '3M': -1.2, '6M': -10.5, '12M': -14.8 },
    rsi: 38,
    liquidity: '2.1B',
    above200MA: false,
    volatility: { '3M': 15.2, '6M': 16.8, '12M': 18.3 },
    alternateVolatility: { '3M': 14.5, '6M': 16.0, '12M': 17.5 }
  },

  // LAGGARD - terrible performance, EXTREME volatility
  'NUCG.L': {
    price: 8.40,
    returns: { '1M': -10.2, '3M': -20.8, '6M': -35.6, '12M': -52.4 },
    alternateReturns: { '1M': null, '3M': -14.5, '6M': -30.2, '12M': -48.8 },
    rsi: 18,
    liquidity: '115K',
    above200MA: false,
    volatility: { '3M': 35.2, '6M': 38.5, '12M': 42.1 },
    alternateVolatility: { '3M': 34.0, '6M': 37.2, '12M': 40.8 }
  },

  // Cash - ultra low returns but MINIMAL volatility (will rank MUCH HIGHER in risk-adjusted)
  'CSH2.L': {
    price: 100.00,
    returns: { '1M': 0.34, '3M': 1.02, '6M': 2.04, '12M': 4.08 },
    alternateReturns: { '1M': null, '3M': 0.68, '6M': 1.70, '12M': 3.74 },
    rsi: 50,
    liquidity: '12.1B',
    above200MA: true,
    volatility: { '3M': 0.1, '6M': 0.1, '12M': 0.1 },
    alternateVolatility: { '3M': 0.1, '6M': 0.1, '12M': 0.1 }
  },

  // World - solid all around, LOW volatility (will rank HIGHER in risk-adjusted)
  'SWDA.L': {
    price: 92.30,
    returns: { '1M': 3.5, '3M': 9.8, '6M': 15.3, '12M': 28.2 },
    alternateReturns: { '1M': null, '3M': 7.5, '6M': 13.8, '12M': 26.1 },
    rsi: 65,
    liquidity: '54.2B',
    above200MA: true,
    volatility: { '3M': 8.5, '6M': 9.2, '12M': 10.1 },
    alternateVolatility: { '3M': 8.0, '6M': 8.7, '12M': 9.5 }
  },

  // Ex-US - good but lower, MODERATE volatility
  'XMWX.L': {
    price: 68.40,
    returns: { '1M': 2.1, '3M': 7.5, '6M': 15.2, '12M': 22.8 },
    alternateReturns: { '1M': null, '3M': 6.2, '6M': 14.1, '12M': 21.5 },
    rsi: 58,
    liquidity: '4.0B',
    above200MA: true,
    volatility: { '3M': 11.2, '6M': 12.1, '12M': 13.5 },
    alternateVolatility: { '3M': 10.5, '6M': 11.4, '12M': 12.8 }
  },

  // FADING - was great, now declining, HIGH volatility
  // Latest month was TERRIBLE (-3.5%) - removing it will actually HELP ranking!
  'SSLN.L': {
    price: 22.10,
    returns: { '1M': -3.5, '3M': 1.8, '6M': 8.1, '12M': 16.8 },
    alternateReturns: { '1M': null, '3M': 6.2, '6M': 10.5, '12M': 18.5 },
    rsi: 62,
    liquidity: '1.5B',
    above200MA: false,
    volatility: { '3M': 16.5, '6M': 17.2, '12M': 18.9 },
    alternateVolatility: { '3M': 15.8, '6M': 16.5, '12M': 18.1 }
  },

  // Gilts - stable bonds, VERY LOW volatility (will rank HIGHER in risk-adjusted)
  'IGLT.L': {
    price: 52.30,
    returns: { '1M': 0.5, '3M': -0.8, '6M': -1.2, '12M': 2.5 },
    alternateReturns: { '1M': null, '3M': -1.2, '6M': -1.5, '12M': 2.1 },
    rsi: 48,
    liquidity: '4.2B',
    above200MA: true,
    volatility: { '3M': 3.2, '6M': 3.5, '12M': 3.8 },
    alternateVolatility: { '3M': 3.0, '6M': 3.3, '12M': 3.6 }
  }
};

/**
 * Get mock data for an ETF ticker
 */
export function getMockData(ticker: string) {
  return MOCK_DATA[ticker] || null;
}

/**
 * Check if mock data exists for a ticker
 */
export function hasMockData(ticker: string): boolean {
  return ticker in MOCK_DATA;
}