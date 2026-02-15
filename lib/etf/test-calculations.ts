// lib/etf/test-calculations.ts
import { calculatePercentile, calculateScore, classifyLabel, formatPercent, mergeETFData } from './calculations';
import { ETF_LIST } from './etfList';
import { MOCK_DATA } from './mockData';
import { ETFData } from './types';

// Test 1: Percentile calculation
console.log('=== Test 1: Percentile ===');
const values = [10, 20, 30, 40, 50];
console.log('Values:', values);
console.log('30 is at percentile:', calculatePercentile(30, values)); // Should be 60%

// Test 2: Merge ETF data
console.log('\n=== Test 2: Merge Data ===');
const csp1Metadata = ETF_LIST.find(e => e.ticker === 'CSP1.L')!;
const csp1Market = MOCK_DATA['CSP1.L'];
const csp1Full = mergeETFData(csp1Metadata, csp1Market);
console.log('CSP1 merged:', {
  ticker: csp1Full.ticker,
  shortName: csp1Full.shortName,
  price: csp1Full.price,
  returns: csp1Full.returns
});

// Test 3: Label classification
console.log('\n=== Test 3: Labels ===');
console.log('CSP1 label:', classifyLabel(csp1Full)); // Should be LEADER
const nucg = mergeETFData(
  ETF_LIST.find(e => e.ticker === 'NUCG.L')!,
  MOCK_DATA['NUCG.L']
);
console.log('NUCG label:', classifyLabel(nucg)); // Should be LAGGARD

// Test 4: Score calculation
console.log('\n=== Test 4: Scores ===');
const allETFs: ETFData[] = ETF_LIST
  .filter(e => MOCK_DATA[e.ticker])
  .map(e => mergeETFData(e, MOCK_DATA[e.ticker]));

const weights = { m3: 33, m6: 33, m12: 34 };
const csp1Score = calculateScore(csp1Full, allETFs, weights, 'standard', false);
const csh2 = mergeETFData(
  ETF_LIST.find(e => e.ticker === 'CSH2.L')!,
  MOCK_DATA['CSH2.L']
);
const csh2Score = calculateScore(csh2, allETFs, weights, 'standard', false);

console.log('CSP1 score (standard):', csp1Score.toFixed(1));
console.log('CSH2 score (standard):', csh2Score.toFixed(1));
console.log('CSP1 should rank higher than CSH2:', csp1Score > csh2Score);

// Test 5: Formatting
console.log('\n=== Test 5: Formatting ===');
console.log('35.6 formatted:', formatPercent(35.6));
console.log('-12.3 formatted:', formatPercent(-12.3));
console.log('null formatted:', formatPercent(null));

