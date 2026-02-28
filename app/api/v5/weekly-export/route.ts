// app/api/v5/weekly-export/route.ts
//
// Fetches historical weekly/daily/monthly closing prices for all ETFs in
// backtestETFUniverse.ts plus three utility columns:
//   ERNS  — iShares £ Ultrashort Bond (SONIA proxy from Yahoo Finance)
//   VAGS  — Vanguard LifeStrategy 60% Equity (60/40 benchmark)
//   SONIA — Actual BOE SONIA rate from FRED IUDSOIA (annualised %, e.g. 4.75)
//
// Query parameters (all optional, passed from data-export page):
//   years      — years of history, 1–30, default 10
//   frequency  — 'daily' | 'weekly' | 'monthly', default 'weekly'
//
// Response JSON:
//   prices:    Record<ticker, Record<dateString, price>>
//   returns:   Record<ticker, Record<dateString, returnPct>>
//   sonia:     Record<dateString, annualisedRatePct>   ← raw SONIA rates
//   dates:     string[]     sorted date strings (YYYY-MM-DD)
//   tickers:   string[]     clean tickers (no .L), excludes utility tickers
//   meta:      Record<ticker, { shortName, fullName, category }>
//   stats:     { total, success, failed, failedTickers, dateRange, frequency }

import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import { BACKTEST_ETF_UNIVERSE } from '@/lib/v5/backtestETFUniverse';

export const dynamic    = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const maxDuration = 300;

// ─────────────────────────────────────────────────────────────
// Date helpers
// ─────────────────────────────────────────────────────────────

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

function toFriday(date: Date): Date {
  const d   = new Date(date);
  const day = d.getDay();
  if (day === 6) d.setDate(d.getDate() - 1);
  if (day === 0) d.setDate(d.getDate() - 2);
  return d;
}

function buildTargetDates(
  startDate: Date,
  endDate:   Date,
  frequency: 'daily' | 'weekly' | 'monthly'
): string[] {
  const dates: string[] = [];
  const d = new Date(startDate);

  if (frequency === 'daily') {
    while (d <= endDate) {
      const day = d.getDay();
      if (day !== 0 && day !== 6) dates.push(toDateString(d)); // weekdays only
      d.setDate(d.getDate() + 1);
    }

  } else if (frequency === 'weekly') {
    // Advance to first Friday
    while (d.getDay() !== 5) d.setDate(d.getDate() + 1);
    while (d <= endDate) {
      dates.push(toDateString(d));
      d.setDate(d.getDate() + 7);
    }

  } else { // monthly
    // Advance to first month-end Friday
    while (d.getDay() !== 5) d.setDate(d.getDate() + 1);
    while (d <= endDate) {
      // Find the last Friday of this month
      const month = d.getMonth();
      const candidate = new Date(d);
      // Walk forward week by week while still in same month
      while (true) {
        const next = new Date(candidate);
        next.setDate(next.getDate() + 7);
        if (next.getMonth() !== month || next > endDate) break;
        candidate.setDate(candidate.getDate() + 7);
      }
      dates.push(toDateString(candidate));
      // Jump to first Friday of next month
      d.setMonth(candidate.getMonth() + 1, 1);
      while (d.getDay() !== 5) d.setDate(d.getDate() + 1);
    }
  }

  return [...new Set(dates)].sort(); // deduplicate & sort
}

// ─────────────────────────────────────────────────────────────
// Single ETF price fetch
// ─────────────────────────────────────────────────────────────

async function fetchPrices(
  ticker:    string,
  startDate: Date,
  endDate:   Date,
  targetDates: string[],
  frequency: 'daily' | 'weekly' | 'monthly'
): Promise<Record<string, number> | null> {
  try {
    const yf = new YahooFinance({ suppressNotices: ['ripHistorical'] });

    const history = await yf.historical(ticker, {
      period1:  toDateString(startDate),
      period2:  endDate,
      interval: '1d', // always fetch daily, we sample to target dates
    });

    if (!history || history.length < 10) {
      console.warn(`  ⚠ ${ticker}: insufficient history (${history?.length ?? 0} days)`);
      return null;
    }

    // Build daily price map
    const dailyMap: Record<string, number> = {};
    for (const day of history) {
      const price = day.adjClose ?? day.close;
      if (price != null) dailyMap[toDateString(new Date(day.date))] = price;
    }

    // GBX ↔ GBP currency normalisation
    const sortedDates = Object.keys(dailyMap).sort();
    for (let i = 1; i < sortedDates.length; i++) {
      const prev  = dailyMap[sortedDates[i - 1]];
      const curr  = dailyMap[sortedDates[i]];
      if (!prev || !curr) continue;
      const ratio = curr / prev;
      if (ratio > 50) {
        for (let j = i; j < sortedDates.length; j++)
          dailyMap[sortedDates[j]] /= 100;
      } else if (ratio < 0.02) {
        for (let j = 0; j < i; j++)
          dailyMap[sortedDates[j]] /= 100;
      }
    }

    // Sample to target dates — for each target date, try that date then look back
    // up to 4 days (handles weekends, bank holidays)
    const lookbackDays = frequency === 'monthly' ? 7 : 4;
    const result: Record<string, number> = {};

    for (const target of targetDates) {
      const targetDate = new Date(target);
      for (let offset = 0; offset <= lookbackDays; offset++) {
        const tryDate = new Date(targetDate);
        tryDate.setDate(tryDate.getDate() - offset);
        const key = toDateString(tryDate);
        if (dailyMap[key] != null) {
          result[target] = parseFloat(dailyMap[key].toFixed(6));
          break;
        }
      }
    }

    const count = Object.keys(result).length;
    if (count < 10) {
      console.warn(`  ⚠ ${ticker}: only ${count} prices mapped to target dates`);
      return null;
    }

    console.log(`  ✓ ${ticker}: ${count} prices`);
    return result;

  } catch (error) {
    console.error(`  ✗ ${ticker}:`, error instanceof Error ? error.message : error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// FRED SONIA fetch
// Fetches IUDSOIA daily series, returns map of date → annualised rate %
// ─────────────────────────────────────────────────────────────

async function fetchFREDSonia(
  startDate:   Date,
  endDate:     Date,
  targetDates: string[]
): Promise<Record<string, number>> {
  try {
    const FRED_API_KEY = process.env.FRED_API_KEY ?? '';
    const start  = toDateString(startDate);
    const end    = toDateString(endDate);
    const url    = `https://api.stlouisfed.org/fred/series/observations`
                 + `?series_id=IUDSOIA&observation_start=${start}&observation_end=${end}`
                 + `&api_key=${FRED_API_KEY}&file_type=json`;

    const res  = await fetch(url);
    const json = await res.json() as { observations?: { date: string; value: string }[] };

    if (!json.observations || json.observations.length === 0) {
      console.warn('  ⚠ FRED SONIA: no observations returned');
      return {};
    }

    // Build daily map of date → rate (skip missing values marked as '.')
    const dailyMap: Record<string, number> = {};
    for (const obs of json.observations) {
      const val = parseFloat(obs.value);
      if (!isNaN(val)) dailyMap[obs.date] = val;
    }

    console.log(`  ✓ FRED SONIA: ${Object.keys(dailyMap).length} daily observations`);

    // Sample to target dates — try date, then look back up to 7 days
    // (SONIA has gaps for weekends and bank holidays)
    const result: Record<string, number> = {};
    for (const target of targetDates) {
      const targetDate = new Date(target);
      for (let offset = 0; offset <= 7; offset++) {
        const tryDate = new Date(targetDate);
        tryDate.setDate(tryDate.getDate() - offset);
        const key = toDateString(tryDate);
        if (dailyMap[key] != null) {
          result[target] = dailyMap[key]; // store raw annualised rate, e.g. 4.75
          break;
        }
      }
    }

    console.log(`  ✓ FRED SONIA: ${Object.keys(result).length} values mapped to target dates`);
    return result;

  } catch (error) {
    console.error('  ✗ FRED SONIA fetch failed:', error instanceof Error ? error.message : error);
    return {};
  }
}

// ─────────────────────────────────────────────────────────────
// Weekly returns calculator
// ─────────────────────────────────────────────────────────────

function calcReturns(
  prices:      Record<string, number>,
  targetDates: string[]
): Record<string, number> {
  const returns: Record<string, number> = {};
  const sorted = targetDates.filter(d => prices[d] != null).sort();
  for (let i = 1; i < sorted.length; i++) {
    const curr = prices[sorted[i]];
    const prev = prices[sorted[i - 1]];
    if (curr && prev && prev > 0) {
      returns[sorted[i]] = parseFloat((((curr - prev) / prev) * 100).toFixed(6));
    }
  }
  return returns;
}

// ─────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const params    = request.nextUrl.searchParams;
    const yearsBack = Math.min(30, Math.max(1, parseInt(params.get('years') ?? '10')));
    const frequency = (['daily','weekly','monthly'].includes(params.get('frequency') ?? ''))
      ? params.get('frequency') as 'daily' | 'weekly' | 'monthly'
      : 'weekly';

    const endDate   = frequency === 'weekly' ? toFriday(new Date()) : new Date();
    const startDate = new Date(endDate);
    startDate.setFullYear(startDate.getFullYear() - yearsBack);

    console.log(`\n── Weekly Export ────────────────────────────────`);
    console.log(`Range:     ${toDateString(startDate)} → ${toDateString(endDate)}`);
    console.log(`Years:     ${yearsBack}`);
    console.log(`Frequency: ${frequency}`);

    const targetDates = buildTargetDates(startDate, endDate, frequency);
    console.log(`Target dates: ${targetDates.length}\n`);

    // ── Main ETF universe ────────────────────────────────────
    const priceMap:  Record<string, Record<string, number>> = {};
    const returnMap: Record<string, Record<string, number>> = {};
    const failedTickers: string[] = [];

    for (let i = 0; i < BACKTEST_ETF_UNIVERSE.length; i++) {
      const etf         = BACKTEST_ETF_UNIVERSE[i];
      const cleanTicker = etf.ticker.replace('.L', '');
      console.log(`[${i + 1}/${BACKTEST_ETF_UNIVERSE.length}] ${etf.ticker}`);
      if (i > 0) await new Promise(r => setTimeout(r, 200));

      const prices = await fetchPrices(etf.ticker, startDate, endDate, targetDates, frequency);
      if (prices) {
        priceMap[cleanTicker]  = prices;
        returnMap[cleanTicker] = calcReturns(prices, targetDates);
      } else {
        failedTickers.push(cleanTicker);
      }
    }

    // ── Utility tickers ──────────────────────────────────────
    // ERNS — SONIA proxy from Yahoo Finance
    console.log(`\n── Utility tickers ──────────────────────────────`);
    await new Promise(r => setTimeout(r, 200));
    console.log(`[ERNS] ERNS.L`);
    const ernsPrices = await fetchPrices('ERNS.L', startDate, endDate, targetDates, frequency);
    if (ernsPrices) {
      priceMap['ERNS']  = ernsPrices;
      returnMap['ERNS'] = calcReturns(ernsPrices, targetDates);
      console.log(`  ✓ ERNS included`);
    } else {
      console.warn(`  ⚠ ERNS fetch failed`);
    }

    // VAGS — Vanguard LifeStrategy 60 (60/40 benchmark)
    await new Promise(r => setTimeout(r, 200));
    console.log(`[VAGS] VAGS.L`);
    const vagsPrices = await fetchPrices('VAGS.L', startDate, endDate, targetDates, frequency);
    if (vagsPrices) {
      priceMap['VAGS']  = vagsPrices;
      returnMap['VAGS'] = calcReturns(vagsPrices, targetDates);
      console.log(`  ✓ VAGS included`);
    } else {
      console.warn(`  ⚠ VAGS fetch failed`);
    }

    // SWDA — iShares Core MSCI World (used for regime filter: SWDA 12M vs SONIA)
    await new Promise(r => setTimeout(r, 200));
    console.log(`[SWDA] SWDA.L`);
    const swdaPrices = await fetchPrices('SWDA.L', startDate, endDate, targetDates, frequency);
    if (swdaPrices) {
      priceMap['SWDA']  = swdaPrices;
      returnMap['SWDA'] = calcReturns(swdaPrices, targetDates);
      console.log(`  ✓ SWDA included`);
    } else {
      console.warn(`  ⚠ SWDA fetch failed`);
    }

    // SONIA — FRED IUDSOIA historical rates
    await new Promise(r => setTimeout(r, 200));
    console.log(`[SONIA] FRED IUDSOIA`);
    const soniaMap = await fetchFREDSonia(startDate, endDate, targetDates);
    const soniaCount = Object.keys(soniaMap).length;
    console.log(`  ${soniaCount > 0 ? '✓' : '⚠'} SONIA: ${soniaCount} values`);

    // ── Build unified date list ───────────────────────────────
    const allDatesSet = new Set<string>();
    for (const prices of Object.values(priceMap)) {
      for (const d of Object.keys(prices)) allDatesSet.add(d);
    }
    const allDates = Array.from(allDatesSet).sort();

    // ── Build metadata map ────────────────────────────────────
    const meta: Record<string, { shortName: string; fullName: string; category: string }> = {};
    for (const etf of BACKTEST_ETF_UNIVERSE) {
      const cleanTicker = etf.ticker.replace('.L', '');
      if (priceMap[cleanTicker]) {
        meta[cleanTicker] = {
          shortName: etf.shortName,
          fullName:  etf.fullName,
          category:  etf.category,
        };
      }
    }

    const UTILITY_TICKERS = ['ERNS', 'VAGS', 'SWDA'];
    const successCount = Object.keys(priceMap).filter(t => !UTILITY_TICKERS.includes(t)).length;
    const failCount    = failedTickers.length;

    console.log(`\n── Export complete ──────────────────────────────`);
    console.log(`✓ ETFs: ${successCount}  ✗ Failed: ${failCount}`);
    console.log(`Dates: ${allDates.length}`);
    if (failedTickers.length > 0) console.log(`Failed: ${failedTickers.join(', ')}`);

    return NextResponse.json({
      success:   true,
      prices:    priceMap,
      returns:   returnMap,
      sonia:     soniaMap,
      dates:     allDates,
      tickers: Object.keys(priceMap).filter(t => t !== 'ERNS' && t !== 'SONIA'),
      meta,
      stats: {
        total:     BACKTEST_ETF_UNIVERSE.length,
        success:   successCount,
        failed:    failCount,
        failedTickers,
        frequency,
        ernsOk:    !!priceMap['ERNS'],
        vagsOk:    !!priceMap['VAGS'],
        swdaOk:    !!priceMap['SWDA'],
        soniaOk:   soniaCount > 0,
        dateRange: {
          start: toDateString(startDate),
          end:   toDateString(endDate),
          count: allDates.length,
        },
      },
    });

  } catch (error) {
    console.error('Weekly export error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}