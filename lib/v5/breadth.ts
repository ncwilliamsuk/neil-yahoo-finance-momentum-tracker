import YahooFinance from 'yahoo-finance2';
import { SP500_TICKERS } from '@/lib/sp500-constituents';

// Create Yahoo Finance instance for v3.x
const yahooFinance = new YahooFinance();


/**
 * Calculate S&P 500 breadth (% above 20 DMA)
 */
export async function calculateSP500Breadth() {
  let above20DMA = 0;
  let total = 0;
  const errors: string[] = [];

  console.log(`Calculating breadth for ${SP500_TICKERS.length} stocks...`);

  for (const ticker of SP500_TICKERS) {
    try {
      // Fetch 30 days of data (need 20 for DMA + buffer)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 35);

      const history = await yahooFinance.historical(ticker, {
        period1: startDate,
        period2: endDate,
        interval: '1d'
      });

      if (!history || history.length < 20) {
        errors.push(`${ticker}: Insufficient data`);
        continue;
      }

      // Use adjusted close
      const prices = history.map(d => d.adjClose ?? d.close);
      const currentPrice = prices[prices.length - 1];

      // Calculate 20 DMA
      const last20 = prices.slice(-20);
      const dma20 = last20.reduce((sum, p) => sum + p, 0) / 20;

      if (currentPrice > dma20) {
        above20DMA++;
      }
      total++;

      // Log progress every 50 stocks
      if (total % 50 === 0) {
        console.log(`  Progress: ${total}/${SP500_TICKERS.length}`);
      }

    } catch (error) {
      errors.push(`${ticker}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Rate limiting - 200ms between requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  const percentage = total > 0 ? (above20DMA / total) * 100 : 0;

  console.log(`Breadth calculation complete: ${above20DMA}/${total} (${percentage.toFixed(1)}%)`);
  if (errors.length > 0) {
    console.warn(`Errors: ${errors.length}/${SP500_TICKERS.length}`);
  }

  return {
    percentage,
    above: above20DMA,
    total,
    status: getBreadthStatus(percentage),
    errors
  };
}

/**
 * Get breadth status interpretation
 */
function getBreadthStatus(pct: number): { color: string; label: string } {
  if (pct < 30) return {
    color: '#ef4444',
    label: 'Weak breadth - bearish internals'
  };
  if (pct < 50) return {
    color: '#f97316',
    label: 'Deteriorating breadth - caution'
  };
  if (pct < 70) return {
    color: '#fbbf24',
    label: 'Mixed breadth - neutral'
  };
  if (pct < 85) return {
    color: '#22c55e',
    label: 'Strong breadth - healthy internals'
  };
  return {
    color: '#22c55e',
    label: 'Exceptional breadth - very bullish'
  };
}