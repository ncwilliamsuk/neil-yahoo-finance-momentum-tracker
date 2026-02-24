// lib/v5/breadth.ts
// S&P 500 breadth calculations.
// Fetches a full year of price history per ticker — same fetch time as 35 days
// since the 200ms serial delay dominates, not data volume.
//
// Calculates:
//   - % above 20 DMA, 50 DMA, 200 DMA
//   - New highs/lows over 1M, 3M, 6M, 12M (count + % of total)

import YahooFinance from 'yahoo-finance2';
import { SP500_TICKERS } from '@/lib/sp500-constituents';

const yahooFinance = new YahooFinance();

// Trading day approximations for each timeframe
const TRADING_DAYS = {
  '1M':  21,
  '3M':  63,
  '6M':  126,
  '12M': 252,
};

export interface BreadthDMA {
  above:      number;
  total:      number;
  percentage: number;
}

export interface HiLoCount {
  highs:    number;
  lows:     number;
  highsPct: number;
  lowsPct:  number;
}

export interface ADLinePoint {
  date:        string;  // YYYY-MM-DD
  advancing:   number;  // stocks that closed higher than previous day
  declining:   number;  // stocks that closed lower than previous day
  unchanged:   number;  // stocks flat
  netAdvance:  number;  // advancing - declining
  cumulative:  number;  // running sum of netAdvance
}

export interface BreadthResult {
  // 20 DMA (primary — used for legacy status badge)
  percentage: number;
  above:      number;
  total:      number;
  status:     { color: string; label: string };

  // All three DMAs
  dma: {
    '20':  BreadthDMA;
    '50':  BreadthDMA;
    '200': BreadthDMA;
  };

  // New highs/lows per timeframe
  hiLo: {
    '1M':  HiLoCount;
    '3M':  HiLoCount;
    '6M':  HiLoCount;
    '12M': HiLoCount;
  };

  // A/D line — daily series for the past year
  adLine: ADLinePoint[];

  // Summary sentence generated server-side
  summary: string;

  errors: string[];
}

export async function calculateSP500Breadth(): Promise<BreadthResult> {
  // Counters for DMA
  let above20 = 0;
  let above50 = 0;
  let above200 = 0;
  let total = 0;

  // Counters for hi/lo per timeframe
  const hiLoCounts: Record<string, { highs: number; lows: number }> = {
    '1M':  { highs: 0, lows: 0 },
    '3M':  { highs: 0, lows: 0 },
    '6M':  { highs: 0, lows: 0 },
    '12M': { highs: 0, lows: 0 },
  };

  // A/D line — map of date string → { advancing, declining, unchanged }
  const adDailyMap = new Map<string, { advancing: number; declining: number; unchanged: number }>();

  const errors: string[] = [];

  // Fetch a full year + buffer — negligible extra time vs 35 days
  const endDate   = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 400); // 252 trading days + buffer

  console.log(`Calculating breadth for ${SP500_TICKERS.length} stocks (full year)...`);

  for (const ticker of SP500_TICKERS) {
    try {
      const history = await yahooFinance.historical(ticker, {
        period1:  startDate,
        period2:  endDate,
        interval: '1d',
      });

      if (!history || history.length < 22) {
        errors.push(`${ticker}: Insufficient data (${history?.length ?? 0} days)`);
        continue;
      }

      const prices = history
        .filter((d: any) => d.close != null)
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map((d: any) => d.adjClose ?? d.close);

      const current = prices[prices.length - 1];
      const n       = prices.length;

      // ── DMA calculations ────────────────────────────────────
      const dma20  = n >= 20  ? prices.slice(-20).reduce( (s: number, p: number) => s + p, 0) / 20  : null;
      const dma50  = n >= 50  ? prices.slice(-50).reduce( (s: number, p: number) => s + p, 0) / 50  : null;
      const dma200 = n >= 200 ? prices.slice(-200).reduce((s: number, p: number) => s + p, 0) / 200 : null;

      if (dma20  !== null && current > dma20)  above20++;
      if (dma50  !== null && current > dma50)  above50++;
      if (dma200 !== null && current > dma200) above200++;
      total++;

      // ── A/D line — count advancing/declining per day ────────
      // Compare each day's close to the previous day's close
      for (let i = 1; i < prices.length; i++) {
        const dateStr = history[i].date.toISOString().split('T')[0];
        if (!adDailyMap.has(dateStr)) {
          adDailyMap.set(dateStr, { advancing: 0, declining: 0, unchanged: 0 });
        }
        const day = adDailyMap.get(dateStr)!;
        const prev = prices[i - 1];
        const curr = prices[i];
        if (curr > prev)      day.advancing++;
        else if (curr < prev) day.declining++;
        else                  day.unchanged++;
      }

      // ── Hi/Lo calculations ──────────────────────────────────
      for (const [tf, days] of Object.entries(TRADING_DAYS) as [string, number][]) {
        if (n < days + 1) continue;

        // Window excludes the current day (look back `days` bars before today)
        const window = prices.slice(-(days + 1), -1);
        const windowHigh = Math.max(...window);
        const windowLow  = Math.min(...window);

        // "New high" = current price exceeds the high of the prior window
        // "New low"  = current price is below the low of the prior window
        if (current > windowHigh) hiLoCounts[tf].highs++;
        if (current < windowLow)  hiLoCounts[tf].lows++;
      }

      if (total % 50 === 0) {
        console.log(`  Progress: ${total}/${SP500_TICKERS.length}`);
      }

    } catch (err) {
      errors.push(`${ticker}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    // Rate limiting — 200ms between requests (Yahoo Finance requirement)
    await new Promise(r => setTimeout(r, 200));
  }

  // ── Build A/D line series ────────────────────────────────────
  const adLine: ADLinePoint[] = Array.from(adDailyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .reduce<ADLinePoint[]>((acc, [date, { advancing, declining, unchanged }]) => {
      const prev       = acc[acc.length - 1];
      const netAdvance = advancing - declining;
      const cumulative = (prev?.cumulative ?? 0) + netAdvance;
      acc.push({ date, advancing, declining, unchanged, netAdvance, cumulative });
      return acc;
    }, []);

  // ── Build result ─────────────────────────────────────────────
  const pct20  = total > 0 ? (above20  / total) * 100 : 0;
  const pct50  = total > 0 ? (above50  / total) * 100 : 0;
  const pct200 = total > 0 ? (above200 / total) * 100 : 0;

  const hiLo: BreadthResult['hiLo'] = {} as BreadthResult['hiLo'];
  for (const tf of ['1M', '3M', '6M', '12M'] as const) {
    const { highs, lows } = hiLoCounts[tf];
    hiLo[tf] = {
      highs,
      lows,
      highsPct: total > 0 ? (highs / total) * 100 : 0,
      lowsPct:  total > 0 ? (lows  / total) * 100 : 0,
    };
  }

  const summary = generateSummary(pct20, pct200, hiLo['12M']);

  console.log(`Breadth complete: 20DMA=${pct20.toFixed(1)}% 50DMA=${pct50.toFixed(1)}% 200DMA=${pct200.toFixed(1)}%`);
  if (errors.length > 0) console.warn(`Errors: ${errors.length}/${SP500_TICKERS.length}`);

  return {
    percentage: pct20,
    above:      above20,
    total,
    status:     getBreadthStatus(pct20),
    dma: {
      '20':  { above: above20,  total, percentage: pct20  },
      '50':  { above: above50,  total, percentage: pct50  },
      '200': { above: above200, total, percentage: pct200 },
    },
    hiLo,
    adLine,
    summary,
    errors,
  };
}

// ── Status badge (used by legacy BreadthIndicator colour) ───────
function getBreadthStatus(pct: number): { color: string; label: string } {
  if (pct >= 80) return { color: '#15803d', label: 'Exceptional breadth — very bullish' };
  if (pct >= 60) return { color: '#22c55e', label: 'Strong breadth — healthy internals' };
  if (pct >= 40) return { color: '#f59e0b', label: 'Mixed breadth — neutral' };
  if (pct >= 20) return { color: '#f87171', label: 'Deteriorating breadth — caution' };
  return           { color: '#dc2626', label: 'Weak breadth — bearish internals' };
}

// ── Summary sentence ─────────────────────────────────────────────
// Uses 200 DMA (long-term trend), 20 DMA (short-term), and 12M hi/lo (confirmation)
function generateSummary(pct20: number, pct200: number, hiLo12M: HiLoCount): string {
  const highsDominant = hiLo12M.highs > hiLo12M.lows * 2;
  const lowsDominant  = hiLo12M.lows  > hiLo12M.highs * 2;
  const hiLoMixed     = !highsDominant && !lowsDominant;

  // Long-term trend (200 DMA)
  const longTermBull  = pct200 >= 70;
  const longTermBear  = pct200 < 40;
  const longTermMixed = !longTermBull && !longTermBear;

  // Short-term momentum (20 DMA)
  const shortTermStrong = pct20 >= 60;
  const shortTermWeak   = pct20 < 40;
  const divergence      = pct200 - pct20; // positive = short-term weaker than long-term

  // ── Generate sentence ──────────────────────────────────────
  if (longTermBull && shortTermStrong && highsDominant) {
    return `Breadth is broadly healthy. Most stocks are in long-term uptrends and short-term participation remains strong. New 12-month highs significantly outnumber lows, confirming the bullish picture.`;
  }

  if (longTermBull && shortTermWeak && divergence > 25) {
    return `Short-term breadth has narrowed sharply but long-term trends remain intact — ${pct200.toFixed(0)}% of stocks are above their 200 DMA. This looks like a pullback within a broader uptrend rather than a structural breakdown${highsDominant ? ', supported by 12-month highs still outnumbering lows' : ''}.`;
  }

  if (longTermBull && shortTermWeak && lowsDominant) {
    return `A warning sign: short-term breadth has deteriorated significantly and 12-month lows are beginning to outnumber highs despite most stocks still above their 200 DMA. Watch whether long-term trends hold or follow short-term weakness lower.`;
  }

  if (longTermMixed && shortTermWeak) {
    return `Breadth is deteriorating across timeframes. Both short and medium-term participation are weak. New 12-month lows ${lowsDominant ? 'are outnumbering highs, adding to the bearish picture' : 'and highs are broadly balanced — no clear directional conviction'}.`;
  }

  if (longTermBear && shortTermWeak && lowsDominant) {
    return `Breadth is broadly weak. The majority of stocks are below their 200 DMA, short-term momentum is poor, and new 12-month lows significantly outnumber highs. Conditions favour caution and defensive positioning.`;
  }

  if (longTermBear && shortTermStrong) {
    return `An interesting divergence: short-term breadth has recovered (${pct20.toFixed(0)}% above 20 DMA) but most stocks remain below their 200 DMA. This may be a bear market rally — watch whether the recovery can extend to longer-term moving averages.`;
  }

  if (longTermMixed && hiLoMixed) {
    return `Mixed breadth conditions. Long-term participation is moderate at ${pct200.toFixed(0)}% above the 200 DMA, with no strong signal from new highs or lows. The market lacks clear directional conviction — selectivity matters more than broad exposure.`;
  }

  // Fallback
  return `Breadth shows ${pct200.toFixed(0)}% of stocks above their 200 DMA (long-term) and ${pct20.toFixed(0)}% above their 20 DMA (short-term). New 12-month highs: ${hiLo12M.highs} stocks (${hiLo12M.highsPct.toFixed(1)}%), new lows: ${hiLo12M.lows} stocks (${hiLo12M.lowsPct.toFixed(1)}%).`;
}