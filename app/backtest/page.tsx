'use client';

// app/backtest/page.tsx
// ETF Momentum Backtesting Engine — Phase 1 + Phase 2
// Phase 1: Single strategy — equity curve, stats, annual returns, rebalances
// Phase 2: Parameter sweep — 5×5 heatmap of entry/exit thresholds, coloured by CAGR/Sharpe/Sortino/Calmar

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface WeeklyPrices {
  dates:   string[];
  tickers: string[];
  prices:  Record<string, Record<string, number>>;
}

interface WeightSet {
  w1m:  number;
  w3m:  number;
  w6m:  number;
  w12m: number;
}

interface ETFMeta {
  shortName: string;
  fullName:  string;
  category:  string;
}

interface StrategyParams {
  entryTopN:        number;
  entryWeights:     WeightSet;
  exitTopN:         number;
  exitWeights:      WeightSet;
  holdingsN:        number;
  rebalanceMonthly: boolean;
  useCashProxy:     boolean;
  benchmarkTicker:  string;
  // Filters
  // Entry filters
  filterMaEntry:       boolean;  // ETF price > 40-week MA
  filterRsiEntry:      boolean;  // RSI(14) > 50
  filterBollEntry:     boolean;  // price > 20-week SMA (Bollinger mid band)
  // Exit filters
  filterMaExit:        boolean;  // ETF price < 40-week MA → force sell
  filterRsiExit:       boolean;  // RSI(14) < 40 → force sell
  filterBollExit:      boolean;  // price < Bollinger lower band → force sell
  // Regime filters
  filterMarketMA:      boolean;  // benchmark < 40-week MA → 100% cash
  filterSwdaVsSonia:   boolean;  // SWDA 12M return < SONIA 12M → 100% cash
  // Category concentration
  maxPerCategory:      number;   // 0 = off, 1-5 = max new entries per category per rebalance
  // Ranking mode
  useRiskAdj:          boolean;
  removeLatestMonth:   boolean;
  // Transaction costs
  bidAskSpread:        number;   // one-way spread %, e.g. 0.10 = 0.10% per leg
}

interface RebalanceEvent {
  date:     string;
  holdings: string[];
  entered:  string[];
  exited:   string[];
  cash:     number;
}

interface BacktestResult {
  equityCurve: { date: string; strategy: number; benchmark: number }[];
  rebalances:  RebalanceEvent[];
  stats:       BacktestStats;
}

interface BacktestStats {
  totalReturn:    number;
  cagr:           number;
  maxDrawdown:    number;
  sharpe:         number;
  sortino:        number;
  calmar:         number;
  winRate:        number;
  avgHoldWeeks:   number;
  totalTrades:    number;
  bestYear:       { year: number; return: number };
  worstYear:      { year: number; return: number };
  yearlyReturns:  { year: number; strategy: number; benchmark: number }[];
  benchmarkCAGR:  number;
  benchmarkMaxDD: number;
  benchmarkTotal: number;
}

// Sweep result for one cell in the threshold heatmap
interface SweepCell {
  entryTopN: number;
  exitTopN:  number;
  cagr:      number;
  sharpe:    number;
  sortino:   number;
  calmar:    number;
  maxDD:     number;
  totalReturn: number;
}

// Sweep result for one cell in the preset heatmap
interface PresetSweepCell {
  entryPreset: string;
  exitPreset:  string;
  cagr:        number;
  sharpe:      number;
  sortino:     number;
  calmar:      number;
  maxDD:       number;
  totalReturn: number;
}

type SweepMetric = 'cagr' | 'sharpe' | 'sortino' | 'calmar' | 'maxDD';

// ─────────────────────────────────────────────────────────────
// CSV Parser
// ─────────────────────────────────────────────────────────────

function parseCSV(text: string): WeeklyPrices {
  const lines   = text.trim().split('\n').filter(l => l.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  // Exclude utility columns from tradeable tickers
  const UTILITY = new Set(['ERNS', 'VAGS', 'SONIA']);
  const allHeaders = headers.slice(1);
  const tickers    = allHeaders.filter(t => !UTILITY.has(t));
  const prices:  Record<string, Record<string, number>> = {};
  for (const t of [...tickers, ...allHeaders.filter(t => UTILITY.has(t))]) prices[t] = {};
  const dates: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols    = lines[i].split(',');
    const rawDate = cols[0].trim().replace(/"/g, '');
    let isoDate: string;
    if (rawDate.includes('/')) {
      const [d, m, y] = rawDate.split('/');
      isoDate = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    } else {
      isoDate = rawDate;
    }
    dates.push(isoDate);
    for (let j = 1; j < cols.length; j++) {
      const val = parseFloat(cols[j].trim());
      if (!isNaN(val) && val > 0) prices[allHeaders[j - 1]][isoDate] = val;
    }
  }
  dates.sort();
  return { dates, tickers, prices };
}

// ─────────────────────────────────────────────────────────────
// Composite return score + ranking
// ─────────────────────────────────────────────────────────────

const LB = { w1m: 4, w3m: 13, w6m: 26, w12m: 52 } as const;
const LB_FRAC = { w1m: 1/12, w3m: 3/12, w6m: 6/12, w12m: 12/12 } as const;
const SKIP_WEEKS = 4; // weeks to skip for "remove latest month" mode

function compositeReturn(
  tickerPrices:      Record<string, number>,
  dates:             string[],
  dateIdx:           number,
  weights:           WeightSet,
  removeLatestMonth: boolean = false,
): number | null {
  const anchor = removeLatestMonth ? dateIdx - SKIP_WEEKS : dateIdx;
  let weightedSum = 0;
  let totalWeight = 0;
  for (const [key, weeks] of Object.entries(LB) as [keyof WeightSet, number][]) {
    const w = weights[key];
    if (w === 0) continue;
    const pastIdx = anchor - weeks;
    if (pastIdx < 0 || anchor < 0 || anchor >= dates.length) continue;
    const curr = tickerPrices[dates[anchor]];
    const past = tickerPrices[dates[pastIdx]];
    if (!curr || !past || past === 0) continue;
    weightedSum += ((curr - past) / past) * w;
    totalWeight += w;
  }
  return totalWeight > 0 ? weightedSum / totalWeight : null;
}

function compositeSharpe(
  tickerPrices:      Record<string, number>,
  dates:             string[],
  dateIdx:           number,
  weights:           WeightSet,
  soniaRate:         number,
  removeLatestMonth: boolean = false,
): number | null {
  const anchor = removeLatestMonth ? dateIdx - SKIP_WEEKS : dateIdx;
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [key, weeks] of Object.entries(LB) as [keyof WeightSet, number][]) {
    const w = weights[key];
    if (w === 0) continue;
    const pastIdx = anchor - weeks;
    if (pastIdx < 0 || anchor < 0 || anchor >= dates.length) continue;

    const curr = tickerPrices[dates[anchor]];
    const past = tickerPrices[dates[pastIdx]];
    if (!curr || !past || past === 0) continue;

    const periodReturn = ((curr - past) / past) * 100;

    const weeklyRets: number[] = [];
    for (let i = pastIdx + 1; i <= anchor; i++) {
      const p0 = tickerPrices[dates[i - 1]];
      const p1 = tickerPrices[dates[i]];
      if (p0 && p1 && p0 > 0) weeklyRets.push((p1 - p0) / p0);
    }
    if (weeklyRets.length < 4) continue;

    const mean     = weeklyRets.reduce((a, b) => a + b, 0) / weeklyRets.length;
    const variance = weeklyRets.reduce((a, b) => a + (b - mean) ** 2, 0) / weeklyRets.length;
    const weeklyStd = Math.sqrt(variance);
    if (weeklyStd === 0) continue;

    const frac          = LB_FRAC[key];
    const annualisedVol = weeklyStd * Math.sqrt(52) * 100;
    const periodVol     = annualisedVol * Math.sqrt(frac);
    const periodRF      = soniaRate * frac;

    const sharpe = (periodReturn - periodRF) / periodVol;
    weightedSum += sharpe * w;
    totalWeight += w;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : null;
}

function rankETFs(
  data:              WeeklyPrices,
  dateIdx:           number,
  weights:           WeightSet,
  useRiskAdj:        boolean = false,
  soniaRate:         number  = 0,
  removeLatestMonth: boolean = false,
): { ticker: string; score: number }[] {
  const ranked: { ticker: string; score: number }[] = [];
  for (const ticker of data.tickers) {
    const prices = data.prices[ticker] ?? {};
    const score  = useRiskAdj
      ? compositeSharpe(prices, data.dates, dateIdx, weights, soniaRate, removeLatestMonth)
      : compositeReturn(prices, data.dates, dateIdx, weights, removeLatestMonth);
    if (score !== null) ranked.push({ ticker, score });
  }
  return ranked.sort((a, b) => b.score - a.score);
}

// ─────────────────────────────────────────────────────────────
// 40-week MA filter helper
// Returns true if price is above MA, or if insufficient data (pass-through)
// ─────────────────────────────────────────────────────────────

const MA_PERIOD = 40;

function isAbove40WeekMA(
  tickerPrices: Record<string, number> | undefined,
  dates:        string[],
  dateIdx:      number,
): boolean {
  if (!tickerPrices) return true; // insufficient data → pass
  const price = tickerPrices[dates[dateIdx]];
  if (!price) return true;

  // Collect up to MA_PERIOD prior prices
  const priorPrices: number[] = [];
  for (let i = dateIdx - MA_PERIOD + 1; i <= dateIdx; i++) {
    if (i < 0) continue;
    const p = tickerPrices[dates[i]];
    if (p) priorPrices.push(p);
  }

  if (priorPrices.length < MA_PERIOD) return true; // insufficient data → pass

  const ma = priorPrices.reduce((a, b) => a + b, 0) / priorPrices.length;
  return price >= ma;
}

// RSI(14) on weekly prices. Returns null if insufficient data → caller passes through.
function calcRSI(
  tickerPrices: Record<string, number> | undefined,
  dates:        string[],
  dateIdx:      number,
  period:       number = 14,
): number | null {
  if (!tickerPrices) return null;
  const needed = period + 1;
  if (dateIdx < needed) return null;

  const prices: number[] = [];
  for (let i = dateIdx - needed; i <= dateIdx; i++) {
    const p = tickerPrices[dates[i]];
    if (p == null) return null; // gap in data → insufficient
    prices.push(p);
  }

  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) avgGain += change / prices[i - 1] * 100;
    else            avgLoss += Math.abs(change) / prices[i - 1] * 100;
  }
  avgGain /= period;
  avgLoss /= period;

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// Bollinger bands (20-week SMA ± 2 std).
// Returns { mid, lower } or null if insufficient data.
function calcBollinger(
  tickerPrices: Record<string, number> | undefined,
  dates:        string[],
  dateIdx:      number,
  period:       number = 20,
): { mid: number; lower: number } | null {
  if (!tickerPrices) return null;
  if (dateIdx < period) return null;

  const prices: number[] = [];
  for (let i = dateIdx - period + 1; i <= dateIdx; i++) {
    const p = tickerPrices[dates[i]];
    if (p == null) return null;
    prices.push(p);
  }

  const mid  = prices.reduce((a, b) => a + b, 0) / prices.length;
  const std  = Math.sqrt(prices.reduce((a, b) => a + (b - mid) ** 2, 0) / prices.length);
  return { mid, lower: mid - 2 * std };
}

// SWDA 12M return vs SONIA 12M equivalent.
// Returns true (regime OK) or false (go to cash). Passes through if data missing.
function isSwdaAboveSonia(
  swdaPrices: Record<string, number> | undefined,
  dates:      string[],
  dateIdx:    number,
  soniaRate:  number,
): boolean {
  if (!swdaPrices) return true; // SWDA not in CSV → ignore filter
  if (dateIdx < 52) return true; // need 12M of history

  const curr = swdaPrices[dates[dateIdx]];
  const past = swdaPrices[dates[dateIdx - 52]];
  if (!curr || !past || past === 0) return true;

  const swda12M  = (curr - past) / past;
  const sonia12M = soniaRate / 100; // annualised rate as decimal
  return swda12M >= sonia12M;
}

function runBacktest(
  data:      WeeklyPrices,
  params:    StrategyParams,
  soniaRate: number,
  meta:      Record<string, ETFMeta> = {},
): BacktestResult {
  const {
    entryTopN, entryWeights, exitTopN, exitWeights,
    holdingsN, rebalanceMonthly, useCashProxy, benchmarkTicker,
    filterMaEntry, filterMaExit, filterMarketMA,
    filterRsiEntry, filterRsiExit, filterBollEntry, filterBollExit,
    filterSwdaVsSonia, maxPerCategory,
    useRiskAdj, removeLatestMonth, bidAskSpread,
  } = params;
  const { dates } = data;

  const allWeightedPeriods = [
    entryWeights.w1m  > 0 ? LB.w1m  : 0,
    entryWeights.w3m  > 0 ? LB.w3m  : 0,
    entryWeights.w6m  > 0 ? LB.w6m  : 0,
    entryWeights.w12m > 0 ? LB.w12m : 0,
    exitWeights.w1m   > 0 ? LB.w1m  : 0,
    exitWeights.w3m   > 0 ? LB.w3m  : 0,
    exitWeights.w6m   > 0 ? LB.w6m  : 0,
    exitWeights.w12m  > 0 ? LB.w12m : 0,
  ];
  const minLookback = Math.max(...allWeightedPeriods, 4);

  const rebalanceDates = new Set(rebalanceMonthly ? getMonthlyRebalanceDates(dates) : dates);

  // SONIA column — historically accurate annualised rates from FRED IUDSOIA
  // Falls back to ERNS price returns, then flat soniaRate if neither available
  const soniaPrices = data.prices['SONIA'] ?? null;
  const ernsPrices  = data.prices['ERNS']  ?? null;
  const flatWeeklyRF = Math.pow(1 + soniaRate / 100, 1 / 52) - 1;

  // Get weekly risk-free return for a given date.
  // Priority: SONIA column (FRED rate) → ERNS price return → flat SONIA rate
  function getWeeklyRF(date: string, prevDate: string): number {
    // 1. SONIA column — convert annualised rate to weekly
    if (soniaPrices) {
      const rate = soniaPrices[date] ?? soniaPrices[prevDate];
      if (rate != null && !isNaN(rate)) {
        return Math.pow(1 + rate / 100, 1 / 52) - 1;
      }
    }
    // 2. ERNS price return
    if (ernsPrices) {
      const curr = ernsPrices[date];
      const prev = ernsPrices[prevDate];
      if (curr && prev && prev > 0) return (curr - prev) / prev;
    }
    // 3. Flat fallback
    return flatWeeklyRF;
  }

  let portfolioValue = 100;
  let benchmarkValue = 100;
  let holdings       = new Set<string>();

  const equityCurve:        BacktestResult['equityCurve'] = [];
  const rebalances:         RebalanceEvent[]              = [];
  const weeklyStratReturns: number[]                      = [];
  const holdDurations:      number[]                      = [];
  const holdEntryDates:     Record<string, string>        = {};
  let   totalTrades = 0;

  for (let di = minLookback; di < dates.length; di++) {
    const date     = dates[di];
    const prevDate = dates[di - 1];

    if (di > minLookback) {
      let sumRet = 0, heldCount = 0;
      for (const ticker of holdings) {
        const curr = data.prices[ticker]?.[date];
        const prev = data.prices[ticker]?.[prevDate];
        if (curr && prev && prev > 0) { sumRet += (curr - prev) / prev; heldCount++; }
      }
      const cashSlots = Math.max(0, holdingsN - heldCount);
      const cashFrac  = holdingsN > 0 ? cashSlots / holdingsN : 0;
      const eqRet     = heldCount > 0 ? sumRet / heldCount : 0;
      const cashRet   = useCashProxy ? getWeeklyRF(date, prevDate) : 0;
      const weekRet   = eqRet * (1 - cashFrac) + cashRet * cashFrac;
      portfolioValue *= (1 + weekRet);
      weeklyStratReturns.push(weekRet);
    }

    if (di > minLookback) {
      // Benchmark return
      {
        let benchRet: number;
        if (benchmarkTicker === 'SONIA') {
          // SONIA benchmark — use getWeeklyRF directly (converts annualised rate to weekly)
          benchRet = getWeeklyRF(date, prevDate);
        } else {
          const curr = data.prices[benchmarkTicker]?.[date];
          const prev = data.prices[benchmarkTicker]?.[prevDate];
          if (curr && prev && prev > 0) {
            benchRet = (curr - prev) / prev;
          } else {
            // No data for this date — fall back to SONIA rate
            benchRet = getWeeklyRF(date, prevDate);
          }
        }
        benchmarkValue *= (1 + benchRet);
      }
    }

    equityCurve.push({
      date,
      strategy:  parseFloat(portfolioValue.toFixed(2)),
      benchmark: parseFloat(benchmarkValue.toFixed(2)),
    });

    if (!rebalanceDates.has(date)) continue;

    // ── Market regime filter ─────────────────────────────
    // Regime filters — if either triggers, go 100% cash for this week
    const swdaPrices = data.prices['SWDA'];
    const regimeCash = (
      (filterMarketMA    && !isAbove40WeekMA(data.prices[benchmarkTicker], dates, di)) ||
      (filterSwdaVsSonia && !isSwdaAboveSonia(swdaPrices, dates, di, soniaRate))
    );

    if (regimeCash) {
      const prevHoldings = new Set(holdings);
      const exited = [...prevHoldings];
      for (const t of exited) {
        if (holdEntryDates[t]) {
          const entryIdx = dates.indexOf(holdEntryDates[t]);
          if (entryIdx >= 0 && di > entryIdx) holdDurations.push(di - entryIdx);
          delete holdEntryDates[t];
        }
      }
      totalTrades += exited.length;
      if (exited.length > 0) {
        rebalances.push({ date, holdings: [], entered: [], exited, cash: 1 });
      }
      holdings = new Set();
      continue;
    }

    const entryRanked = rankETFs(data, di, entryWeights, useRiskAdj, soniaRate, removeLatestMonth);
    const exitRanked  = rankETFs(data, di, exitWeights,  useRiskAdj, soniaRate, removeLatestMonth);
    if (entryRanked.length === 0) continue;

    const entryTopSet = new Set(entryRanked.slice(0, entryTopN).map(r => r.ticker));
    const exitTopSet  = new Set(exitRanked.slice(0, exitTopN).map(r => r.ticker));

    const prevHoldings = new Set(holdings);
    const newHoldings  = new Set<string>();

    // Keep existing holdings if still in exit top N AND passes all exit filters
    for (const ticker of prevHoldings) {
      if (!exitTopSet.has(ticker)) continue;
      if (filterMaExit   && !isAbove40WeekMA(data.prices[ticker], dates, di)) continue;
      if (filterRsiExit) {
        const rsi = calcRSI(data.prices[ticker], dates, di);
        if (rsi !== null && rsi < 40) continue; // null = insufficient data → pass
      }
      if (filterBollExit) {
        const boll = calcBollinger(data.prices[ticker], dates, di);
        const price = data.prices[ticker]?.[dates[di]];
        if (boll !== null && price != null && price < boll.lower) continue;
      }
      if (newHoldings.size < holdingsN) newHoldings.add(ticker);
    }

    // Count how many of each category are already held (existing, not new entries)
    const categoryCounts: Record<string, number> = {};
    for (const ticker of newHoldings) {
      const cat = meta[ticker]?.category ?? '__none__';
      categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
    }

    // Add new entries from entry top N, applying all entry filters + category cap
    for (const { ticker } of entryRanked) {
      if (newHoldings.size >= holdingsN) break;
      if (newHoldings.has(ticker) || !entryTopSet.has(ticker)) continue;
      if (filterMaEntry && !isAbove40WeekMA(data.prices[ticker], dates, di)) continue;
      if (filterRsiEntry) {
        const rsi = calcRSI(data.prices[ticker], dates, di);
        if (rsi !== null && rsi < 50) continue;
      }
      if (filterBollEntry) {
        const boll  = calcBollinger(data.prices[ticker], dates, di);
        const price = data.prices[ticker]?.[dates[di]];
        if (boll !== null && price != null && price < boll.mid) continue;
      }
      // Category cap — only applies to new entries, not existing holdings
      if (maxPerCategory > 0 && !prevHoldings.has(ticker)) {
        const cat      = meta[ticker]?.category ?? '__none__';
        const catCount = categoryCounts[cat] ?? 0;
        if (catCount >= maxPerCategory) continue;
        categoryCounts[cat] = catCount + 1;
      }
      newHoldings.add(ticker);
    }

    const entered = [...newHoldings].filter(t => !prevHoldings.has(t));
    const exited  = [...prevHoldings].filter(t => !newHoldings.has(t));

    // Apply bid-ask spread cost: one-way % on each leg (entry + exit)
    // Each trade costs bidAskSpread/100 of portfolio value
    if (bidAskSpread > 0 && (entered.length > 0 || exited.length > 0)) {
      const tradesCount   = entered.length + exited.length;
      const costPerTrade  = (bidAskSpread / 100) / holdingsN; // fraction of portfolio per trade
      const totalCost     = tradesCount * costPerTrade;
      portfolioValue     *= (1 - totalCost);
    }

    for (const t of entered) holdEntryDates[t] = date;
    for (const t of exited) {
      if (holdEntryDates[t]) {
        const entryIdx = dates.indexOf(holdEntryDates[t]);
        if (entryIdx >= 0 && di > entryIdx) holdDurations.push(di - entryIdx);
        delete holdEntryDates[t];
      }
    }
    totalTrades += entered.length + exited.length;

    if (entered.length > 0 || exited.length > 0 || rebalances.length === 0) {
      rebalances.push({
        date, holdings: [...newHoldings], entered, exited,
        cash: Math.max(0, (holdingsN - newHoldings.size) / holdingsN),
      });
    }
    holdings = newHoldings;
  }

  return {
    equityCurve,
    rebalances,
    stats: calcStats(equityCurve, weeklyStratReturns, totalTrades, holdDurations, soniaRate),
  };
}

// ─────────────────────────────────────────────────────────────
// Parameter sweep engine
// ─────────────────────────────────────────────────────────────

const SWEEP_ENTRY_OPTIONS = [3, 5, 10, 15, 20];
const SWEEP_EXIT_OPTIONS  = [10, 15, 20, 30, 50];

function runSweep(
  data:      WeeklyPrices,
  params:    StrategyParams,  // used for weights, holdingsN, rebalance etc — only thresholds vary
  soniaRate: number,
  metaData:  Record<string, any> = {},
): SweepCell[] {
  const results: SweepCell[] = [];

  for (const entryTopN of SWEEP_ENTRY_OPTIONS) {
    for (const exitTopN of SWEEP_EXIT_OPTIONS) {
      // Skip invalid combos where exit <= entry (would immediately sell everything)
      if (exitTopN < entryTopN) {
        results.push({ entryTopN, exitTopN, cagr: 0, sharpe: 0, sortino: 0, calmar: 0, maxDD: 0, totalReturn: 0 });
        continue;
      }

      const sweepParams = { ...params, entryTopN, exitTopN };
      const result = runBacktest(data, sweepParams, soniaRate, metaData);
      const s = result.stats;

      results.push({
        entryTopN,
        exitTopN,
        cagr:        s.cagr,
        sharpe:      s.sharpe,
        sortino:     s.sortino,
        calmar:      s.calmar,
        maxDD:       s.maxDrawdown,
        totalReturn: s.totalReturn,
      });
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────
// Preset sweep engine (7×7 = 49 combinations)
// Thresholds fixed at entryTopN/exitTopN from params
// ─────────────────────────────────────────────────────────────

function runPresetSweep(
  data:      WeeklyPrices,
  params:    StrategyParams,
  soniaRate: number,
  metaData:  Record<string, any> = {},
): PresetSweepCell[] {
  const results: PresetSweepCell[] = [];

  for (const entryPreset of PRESETS) {
    for (const exitPreset of PRESETS) {
      const sweepParams = {
        ...params,
        entryWeights: entryPreset.w,
        exitWeights:  exitPreset.w,
      };
      const result = runBacktest(data, sweepParams, soniaRate, metaData);
      const s = result.stats;
      results.push({
        entryPreset: entryPreset.label,
        exitPreset:  exitPreset.label,
        cagr:        s.cagr,
        sharpe:      s.sharpe,
        sortino:     s.sortino,
        calmar:      s.calmar,
        maxDD:       s.maxDrawdown,
        totalReturn: s.totalReturn,
      });
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────
// Stress test engine
// ─────────────────────────────────────────────────────────────

const STRESS_MIN_COVERAGE = 0.80;

function runStressTests(
  data:      WeeklyPrices,
  params:    StrategyParams,
  soniaRate: number,
  metaData:  Record<string, ETFMeta> = {},
): StressResult[] {
  const results: StressResult[] = [];
  const allDates = data.dates;
  if (allDates.length === 0) return results;

  const dataStart = allDates[0];
  const dataEnd   = allDates[allDates.length - 1];

  for (const period of STRESS_PERIODS) {
    const effectiveStart = period.start > dataStart ? period.start : dataStart;
    const effectiveEnd   = period.end   < dataEnd   ? period.end   : dataEnd;

    const periodDates = allDates.filter(d => d >= effectiveStart && d <= effectiveEnd);
    if (periodDates.length === 0) continue;

    if (period.id !== 'full') {
      const requestedWeeks = Math.round(
        (new Date(period.end).getTime() - new Date(period.start).getTime()) / (7 * 24 * 60 * 60 * 1000)
      );
      const coverage = requestedWeeks > 0 ? periodDates.length / requestedWeeks : 0;
      if (coverage < STRESS_MIN_COVERAGE) continue;
    }

    const startIdx = allDates.indexOf(periodDates[0]);
    const endIdx   = allDates.indexOf(periodDates[periodDates.length - 1]);
    if (startIdx < 0 || endIdx < 0) continue;

    // Include lookback buffer before period for MA + momentum calculation
    const lookbackBuffer = 60;
    const sliceStart     = Math.max(0, startIdx - lookbackBuffer);
    const slicedDates    = allDates.slice(sliceStart);
    const slicedPrices: Record<string, Record<string, number>> = {};
    for (const ticker of data.tickers) {
      slicedPrices[ticker] = {};
      for (const d of slicedDates) {
        if (data.prices[ticker]?.[d]) slicedPrices[ticker][d] = data.prices[ticker][d];
      }
    }
    const slicedData: WeeklyPrices = { dates: slicedDates, tickers: data.tickers, prices: slicedPrices };

    const fullResult  = runBacktest(slicedData, params, soniaRate, metaData);
    const periodCurve = fullResult.equityCurve.filter(pt => pt.date >= effectiveStart && pt.date <= effectiveEnd);
    if (periodCurve.length < 4) continue;

    // Re-normalise to 100 at period start
    const sv = periodCurve[0].strategy;
    const bv = periodCurve[0].benchmark;
    const normCurve = periodCurve.map(pt => ({
      date:      pt.date,
      strategy:  parseFloat(((pt.strategy  / sv) * 100).toFixed(2)),
      benchmark: parseFloat(((pt.benchmark / bv) * 100).toFixed(2)),
    }));

    const weeks = normCurve.length;
    const years = weeks / 52;
    const se    = normCurve[normCurve.length - 1].strategy;
    const be    = normCurve[normCurve.length - 1].benchmark;

    const totalReturn    = (se / 100 - 1) * 100;
    const cagr           = years > 0 ? (Math.pow(se / 100, 1 / years) - 1) * 100 : 0;
    const benchmarkTotal = (be / 100 - 1) * 100;
    const benchmarkCAGR  = years > 0 ? (Math.pow(be / 100, 1 / years) - 1) * 100 : 0;

    let peak = 100, maxDD = 0, bPeak = 100, benchMaxDD = 0;
    const weeklyRets: number[] = [];
    for (let i = 1; i < normCurve.length; i++) {
      const curr = normCurve[i].strategy;
      const prev = normCurve[i - 1].strategy;
      if (curr > peak) peak = curr;
      maxDD = Math.max(maxDD, (peak - curr) / peak);
      if (normCurve[i].benchmark > bPeak) bPeak = normCurve[i].benchmark;
      benchMaxDD = Math.max(benchMaxDD, (bPeak - normCurve[i].benchmark) / bPeak);
      if (prev > 0) weeklyRets.push((curr - prev) / prev);
    }

    const n    = weeklyRets.length || 1;
    const mean = weeklyRets.reduce((a, b) => a + b, 0) / n;
    const std  = Math.sqrt(weeklyRets.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
    const dStd = Math.sqrt(weeklyRets.reduce((a, b) => a + (b < 0 ? b * b : 0), 0) / n);
    const sharpe    = std  > 0 ? (mean / std)  * Math.sqrt(52) : 0;
    const sortino   = dStd > 0 ? (mean / dStd) * Math.sqrt(52) : 0;
    const maxDDPct  = maxDD * 100;
    const calmar    = maxDDPct > 0 ? cagr / maxDDPct : 0;
    const winRate   = (weeklyRets.filter(r => r > 0).length / n) * 100;

    results.push({
      period, weeks, cagr, totalReturn,
      maxDrawdown: maxDDPct, sharpe, sortino, calmar, winRate,
      benchmarkCAGR, benchmarkTotal, benchmarkMaxDD: benchMaxDD * 100,
      alpha: cagr - benchmarkCAGR,
      equityCurve: normCurve,
    });
  }

  return results;
}

function getMonthlyRebalanceDates(dates: string[]): string[] {
  const result: string[] = [];
  let lastMonth = '';
  for (const d of dates) {
    const m = d.substring(0, 7);
    if (m !== lastMonth) { result.push(d); lastMonth = m; }
  }
  return result;
}

function calcStats(
  curve:         BacktestResult['equityCurve'],
  weeklyReturns: number[],
  totalTrades:   number,
  holdDurations: number[],
  soniaRate:     number,  // annualised %, e.g. 4.75 — used for Sharpe/Sortino RFR
): BacktestStats {
  const empty: BacktestStats = {
    totalReturn: 0, cagr: 0, maxDrawdown: 0, sharpe: 0, sortino: 0,
    calmar: 0, winRate: 0, avgHoldWeeks: 0, totalTrades: 0,
    bestYear: { year: 0, return: 0 }, worstYear: { year: 0, return: 0 },
    yearlyReturns: [], benchmarkCAGR: 0, benchmarkMaxDD: 0, benchmarkTotal: 0,
  };
  if (curve.length < 2) return empty;

  const sv = curve[0].strategy,  ev = curve[curve.length - 1].strategy;
  const bv = curve[0].benchmark, be = curve[curve.length - 1].benchmark;
  const years = curve.length / 52;

  const totalReturn = (ev / sv - 1) * 100;
  const cagr        = (Math.pow(ev / sv, 1 / years) - 1) * 100;

  let peak = sv, maxDD = 0;
  for (const pt of curve) {
    if (pt.strategy > peak) peak = pt.strategy;
    maxDD = Math.max(maxDD, (peak - pt.strategy) / peak);
  }
  maxDD *= 100;

  const benchTotal = (be / bv - 1) * 100;
  const benchCAGR  = (Math.pow(be / bv, 1 / years) - 1) * 100;
  let   bPeak = bv, benchMaxDD = 0;
  for (const pt of curve) {
    if (pt.benchmark > bPeak) bPeak = pt.benchmark;
    benchMaxDD = Math.max(benchMaxDD, (bPeak - pt.benchmark) / bPeak);
  }
  benchMaxDD *= 100;

  const n    = weeklyReturns.length || 1;
  const mean = weeklyReturns.reduce((a, b) => a + b, 0) / n;
  const std  = Math.sqrt(weeklyReturns.reduce((a, b) => a + (b - mean) ** 2, 0) / n);

  // Weekly risk-free rate from annualised SONIA (matches etfCalculations.ts)
  const weeklyRF = Math.pow(1 + soniaRate / 100, 1 / 52) - 1;
  const excess   = mean - weeklyRF;
  const dStd     = Math.sqrt(weeklyReturns.reduce((a, b) => a + (b < weeklyRF ? (b - weeklyRF) ** 2 : 0), 0) / n);

  const sharpe  = std  > 0 ? (excess / std)  * Math.sqrt(52) : 0;
  const sortino = dStd > 0 ? (excess / dStd) * Math.sqrt(52) : 0;
  const calmar  = maxDD > 0 ? cagr / maxDD : 0;
  const winRate = (weeklyReturns.filter(r => r > 0).length / n) * 100;
  const avgHoldWeeks = holdDurations.length > 0
    ? holdDurations.reduce((a, b) => a + b, 0) / holdDurations.length : 0;

  const yearMap: Record<number, { ss: number; se: number; bs: number; be: number }> = {};
  for (const pt of curve) {
    const yr = parseInt(pt.date.substring(0, 4));
    if (!yearMap[yr]) yearMap[yr] = { ss: pt.strategy, se: pt.strategy, bs: pt.benchmark, be: pt.benchmark };
    yearMap[yr].se = pt.strategy;
    yearMap[yr].be = pt.benchmark;
  }
  const yearlyReturns = Object.entries(yearMap).map(([yr, v]) => ({
    year:      parseInt(yr),
    strategy:  parseFloat(((v.se / v.ss - 1) * 100).toFixed(1)),
    benchmark: parseFloat(((v.be / v.bs - 1) * 100).toFixed(1)),
  }));

  const best  = yearlyReturns.reduce((a, b) => b.strategy > a.strategy ? b : a, yearlyReturns[0]);
  const worst = yearlyReturns.reduce((a, b) => b.strategy < a.strategy ? b : a, yearlyReturns[0]);

  return {
    totalReturn, cagr, maxDrawdown: maxDD, sharpe, sortino, calmar,
    winRate, avgHoldWeeks, totalTrades,
    bestYear:  { year: best?.year  ?? 0, return: best?.strategy  ?? 0 },
    worstYear: { year: worst?.year ?? 0, return: worst?.strategy ?? 0 },
    yearlyReturns,
    benchmarkCAGR: benchCAGR, benchmarkMaxDD: benchMaxDD, benchmarkTotal: benchTotal,
  };
}

// ─────────────────────────────────────────────────────────────
// Heatmap colour scale
// green (#16a34a) → neutral (#475569) → red (#dc2626)
// ─────────────────────────────────────────────────────────────

function heatmapColor(value: number, min: number, max: number, invertScale = false): string {
  if (max === min) return '#475569';
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const s = invertScale ? 1 - t : t; // invert for maxDD (lower is better)

  // s=0 → red, s=0.5 → slate, s=1 → green
  if (s >= 0.5) {
    const f = (s - 0.5) * 2;
    const r = Math.round(71  + (22  - 71)  * f);
    const g = Math.round(85  + (163 - 85)  * f);
    const b = Math.round(105 + (74  - 105) * f);
    return `rgb(${r},${g},${b})`;
  } else {
    const f = s * 2;
    const r = Math.round(220 + (71  - 220) * f);
    const g = Math.round(38  + (85  - 38)  * f);
    const b = Math.round(38  + (105 - 38)  * f);
    return `rgb(${r},${g},${b})`;
  }
}

// ─────────────────────────────────────────────────────────────
// Formatting
// ─────────────────────────────────────────────────────────────

const fmt1      = (n: number) => n.toFixed(1);
const fmt2      = (n: number) => n.toFixed(2);
const fmtPct    = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`;
const fmtPctAbs = (n: number) => `${n.toFixed(1)}%`;

// Column header tooltips — used in stress test + sweep ranked tables
const COL_TIPS: Record<string, string> = {
  'CAGR':       'Compound Annual Growth Rate — annualised return of the strategy over the period.',
  'Bmk CAGR':   'Benchmark CAGR — annualised return of the selected benchmark over the same period.',
  'Alpha':       'CAGR minus Benchmark CAGR. Positive = strategy outperformed the benchmark.',
  'Max DD':      'Maximum Drawdown — largest peak-to-trough decline of the strategy during the period.',
  'Bmk DD':      'Maximum Drawdown of the benchmark over the same period.',
  'Sharpe':      'Sharpe Ratio — annualised excess return over SONIA divided by annualised volatility. Uses SONIA as risk-free rate. Higher is better; >1 is considered good.',
  'Sortino':     'Sortino Ratio — like Sharpe but only penalises downside volatility (returns below the SONIA risk-free rate). Higher is better; >1 is considered good.',
  'Calmar':      'Calmar Ratio — CAGR divided by Maximum Drawdown %. Higher is better; >1 means annual gain exceeds worst drawdown.',
  'Win %':       'Percentage of weeks with a positive strategy return.',
  'Total Return':'Total % gain over the full period (not annualised).',
  'Weeks':       'Number of weekly data points in the period.',
  'Entry':       'Entry threshold — strategy enters ETFs ranking in the top N by entry signal.',
  'Exit':        'Exit threshold — strategy holds ETFs ranking within the top N by exit signal; sells outside.',
  'Rank':        'Rank by CAGR across all valid combinations.',
};

function ColTip({ label }: { label: string }) {
  const tip = COL_TIPS[label];
  if (!tip) return <span>{label}</span>;
  return (
    <span className="relative group/tip cursor-help inline-flex items-center gap-1">
      {label}
      <span className="text-slate-600 text-[10px]">ⓘ</span>
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-slate-800 border border-slate-600 rounded-xl p-2.5 text-xs text-slate-300 shadow-2xl z-50 leading-relaxed hidden group-hover/tip:block font-normal normal-case tracking-normal whitespace-normal">
        {tip}
      </span>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Stat card tooltips
// ─────────────────────────────────────────────────────────────

const TIPS: Record<string, string> = {
  'Total Return':
    'Overall percentage gain/loss over the full backtest period starting from 100. ' +
    'Benchmark shown for comparison. A large gap between strategy and benchmark is the primary goal.',
  'CAGR':
    'Compound Annual Growth Rate — the annualised return assuming profits reinvested each year. ' +
    'More useful than total return for comparing strategies of different lengths. ' +
    'A CAGR above ~7% historically beats a buy-and-hold world tracker.',
  'Max Drawdown':
    'Largest peak-to-trough portfolio decline over the backtest period. ' +
    'Measures downside risk — how much you could have lost buying at the worst possible time. ' +
    'Lower is better. A strategy with high CAGR but very high drawdown may be hard to hold in practice.',
  'Sharpe':
    'Annualised return divided by annualised volatility (standard deviation of all weekly returns). ' +
    'Measures return per unit of total risk. Above 1.0 is good, above 2.0 is excellent. ' +
    'Penalises upside and downside volatility equally — see Sortino for a fairer measure.',
  'Sortino':
    'Similar to Sharpe but only penalises downside volatility (negative weeks). ' +
    'Generally a better measure for momentum strategies since large positive weeks are desirable. ' +
    'A Sortino significantly higher than Sharpe suggests the strategy has positive skew.',
  'Calmar':
    'CAGR divided by Max Drawdown. Answers: how much annual return did you earn per unit of worst-case pain? ' +
    'Above 1.0 means annual return exceeded worst drawdown. Above 2.0 is strong.',
  'Win Rate':
    'Percentage of weeks where the portfolio had a positive return. ' +
    'Momentum strategies typically achieve 55–65%. ' +
    'A high win rate combined with good Sortino suggests consistent gains rather than a few large wins masking many losses.',
  'Avg Hold':
    'Average number of weeks an ETF position was held before being sold. ' +
    'Longer holds generally mean lower transaction costs and smoother returns. ' +
    'Very short holds (under 4 weeks) suggest the strategy may be over-trading.',
};

// ─────────────────────────────────────────────────────────────
// Weight Panel
// ─────────────────────────────────────────────────────────────

const PRESETS = [
  { label: '1M',     w: { w1m: 100, w3m: 0,   w6m: 0,   w12m: 0   } },
  { label: '3M',     w: { w1m: 0,   w3m: 100, w6m: 0,   w12m: 0   } },
  { label: '6M',     w: { w1m: 0,   w3m: 0,   w6m: 100, w12m: 0   } },
  { label: 'Recent', w: { w1m: 0,   w3m: 50,  w6m: 30,  w12m: 20  } },
  { label: 'Equal',  w: { w1m: 25,  w3m: 25,  w6m: 25,  w12m: 25  } },
  { label: 'Trend',  w: { w1m: 0,   w3m: 20,  w6m: 30,  w12m: 50  } },
  { label: '12M',    w: { w1m: 0,   w3m: 0,   w6m: 0,   w12m: 100 } },
];

const PERIODS: { key: keyof WeightSet; label: string }[] = [
  { key: 'w1m',  label: '1M'  },
  { key: 'w3m',  label: '3M'  },
  { key: 'w6m',  label: '6M'  },
  { key: 'w12m', label: '12M' },
];

function WeightPanel({
  title, tip, weights, onChange,
}: {
  title: string; tip: string; weights: WeightSet; onChange: (w: WeightSet) => void;
}) {
  const handleSlider = (key: keyof WeightSet, value: number) => {
    const nw = { ...weights, [key]: value };
    const others = PERIODS.map(p => p.key).filter(k => k !== key);
    const remaining  = 100 - value;
    const otherTotal = others.reduce((s, k) => s + weights[k], 0);
    if (otherTotal > 0) {
      for (const k of others) nw[k] = Math.round((weights[k] / otherTotal) * remaining);
      const sum = Object.values(nw).reduce((a, b) => a + b, 0);
      if (sum !== 100) nw[others[others.length - 1]] += 100 - sum;
    } else {
      const each = Math.floor(remaining / others.length);
      others.forEach((k, i) => { nw[k] = i === others.length - 1 ? remaining - each * (others.length - 1) : each; });
    }
    onChange(nw);
  };

  const isPreset = (pw: WeightSet) => PERIODS.every(p => pw[p.key] === weights[p.key]);

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">{title}</span>
        <span className="text-slate-500 text-xs cursor-help" title={tip}>ⓘ</span>
      </div>
      <div className="flex flex-wrap gap-1 mb-4">
        {PRESETS.map(p => (
          <button key={p.label} onClick={() => onChange(p.w)}
            className={`px-2 py-1 rounded text-xs font-medium border transition-all ${
              isPreset(p.w)
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-slate-700 border-slate-600 text-slate-300 hover:border-slate-500'
            }`}
          >{p.label}</button>
        ))}
      </div>
      <div className="space-y-3">
        {PERIODS.map(({ key, label }) => (
          <div key={key}>
            <div className="flex justify-between mb-1">
              <span className="text-xs text-slate-400">{label}</span>
              <span className="text-xs font-bold text-blue-400">{weights[key]}%</span>
            </div>
            <input type="range" min={0} max={100} value={weights[key]}
              onChange={e => handleSlider(key, parseInt(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer accent-blue-500"
              style={{ background: `linear-gradient(to right, #3b82f6 ${weights[key]}%, #334155 ${weights[key]}%)` }}
            />
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500 mt-2">
        Sum: <span className={Object.values(weights).reduce((a,b)=>a+b,0) === 100 ? 'text-green-400' : 'text-red-400'}>
          {Object.values(weights).reduce((a,b)=>a+b,0)}%
        </span>
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Stat Card
// ─────────────────────────────────────────────────────────────

function StatCard({ label, val, sub, highlight }: {
  label: string; val: string; sub: string; highlight: boolean;
}) {
  const [show, setShow] = useState(false);
  const tip = TIPS[label];
  return (
    <div className={`relative rounded-xl p-4 border ${highlight ? 'bg-green-950/40 border-green-800/50' : 'bg-slate-900 border-slate-800'}`}>
      <div className="flex items-center gap-1 mb-1">
        <p className="text-xs text-slate-400">{label}</p>
        {tip && (
          <span className="text-slate-600 text-xs cursor-help hover:text-slate-400 transition-colors"
            onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>ⓘ</span>
        )}
      </div>
      <p className={`text-xl font-bold ${highlight ? 'text-green-400' : 'text-white'}`}>{val}</p>
      <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
      {show && tip && (
        <div className="absolute bottom-full left-0 mb-2 w-72 bg-slate-800 border border-slate-600 rounded-xl p-3 text-xs text-slate-300 shadow-2xl z-50 leading-relaxed">
          <p className="font-semibold text-white mb-1">{label}</p>
          {tip}
          <div className="absolute top-full left-4 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-600 w-0 h-0" />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Chart Tooltip
// ─────────────────────────────────────────────────────────────

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-slate-400 mb-2">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {p.value?.toFixed(1)}
        </p>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sweep Heatmap component
// ─────────────────────────────────────────────────────────────

const METRIC_OPTIONS: { key: SweepMetric; label: string; fmt: (n: number) => string; invert: boolean }[] = [
  { key: 'cagr',    label: 'CAGR',        fmt: n => `${n.toFixed(1)}%`, invert: false },
  { key: 'sharpe',  label: 'Sharpe',       fmt: n => n.toFixed(2),       invert: false },
  { key: 'sortino', label: 'Sortino',      fmt: n => n.toFixed(2),       invert: false },
  { key: 'calmar',  label: 'Calmar',       fmt: n => n.toFixed(2),       invert: false },
  { key: 'maxDD',   label: 'Max Drawdown', fmt: n => `-${n.toFixed(1)}%`,invert: true  },
];

function SweepHeatmap({
  cells,
  metric,
  onCellClick,
  selectedCell,
}: {
  cells:        SweepCell[];
  metric:       SweepMetric;
  onCellClick:  (cell: SweepCell) => void;
  selectedCell: SweepCell | null;
}) {
  const metricDef = METRIC_OPTIONS.find(m => m.key === metric)!;

  // Get min/max for colour scale (excluding invalid cells with value=0 due to skipped combos)
  const validValues = cells.filter(c => c.entryTopN <= c.exitTopN).map(c => c[metric]);
  const minVal = Math.min(...validValues);
  const maxVal = Math.max(...validValues);

  return (
    <div>
      {/* Y-axis label */}
      <div className="flex">
        <div className="flex flex-col items-center justify-center w-10 mr-2">
          <span className="text-xs text-slate-500 -rotate-90 whitespace-nowrap">Exit top N →</span>
        </div>

        <div className="flex-1">
          {/* X-axis labels */}
          <div className="flex mb-1 ml-12">
            {SWEEP_ENTRY_OPTIONS.map(n => (
              <div key={n} className="flex-1 text-center text-xs text-slate-500 font-medium">{n}</div>
            ))}
          </div>

          {/* Grid */}
          {SWEEP_EXIT_OPTIONS.map(exitN => (
            <div key={exitN} className="flex items-center mb-1">
              <div className="w-12 text-xs text-slate-500 text-right pr-2 shrink-0">{exitN}</div>
              {SWEEP_ENTRY_OPTIONS.map(entryN => {
                const cell = cells.find(c => c.entryTopN === entryN && c.exitTopN === exitN);
                const invalid = !cell || entryN > exitN;
                const isSelected = selectedCell?.entryTopN === entryN && selectedCell?.exitTopN === exitN;
                const value = cell?.[metric] ?? 0;
                const bg = invalid ? '#1e293b' : heatmapColor(value, minVal, maxVal, metricDef.invert);

                return (
                  <div
                    key={entryN}
                    onClick={() => !invalid && cell && onCellClick(cell)}
                    style={{ backgroundColor: bg }}
                    className={`flex-1 mx-0.5 rounded-lg h-14 flex flex-col items-center justify-center cursor-pointer transition-all ${
                      isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-950' : 'hover:opacity-90'
                    } ${invalid ? 'cursor-not-allowed opacity-30' : ''}`}
                  >
                    {!invalid && cell && (
                      <>
                        <span className="text-white text-xs font-bold leading-tight">
                          {metricDef.fmt(value)}
                        </span>
                        <span className="text-white/60 text-[10px] leading-tight">
                          {entryN}→{exitN}
                        </span>
                      </>
                    )}
                    {invalid && (
                      <span className="text-slate-600 text-xs">—</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {/* X-axis label */}
          <div className="text-center text-xs text-slate-500 mt-2">Entry top N →</div>
        </div>
      </div>

      {/* Colour scale legend */}
      <div className="flex items-center gap-3 mt-4 justify-center">
        <span className="text-xs text-slate-500">{metricDef.invert ? 'Higher (worse)' : 'Lower (worse)'}</span>
        <div className="h-2 w-48 rounded-full" style={{
          background: metricDef.invert
            ? 'linear-gradient(to right, #16a34a, #475569, #dc2626)'
            : 'linear-gradient(to right, #dc2626, #475569, #16a34a)'
        }} />
        <span className="text-xs text-slate-500">{metricDef.invert ? 'Lower (better)' : 'Higher (better)'}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Preset Heatmap component (7×7)
// ─────────────────────────────────────────────────────────────

function PresetHeatmap({
  cells,
  metric,
  onCellClick,
  selectedCell,
}: {
  cells:        PresetSweepCell[];
  metric:       SweepMetric;
  onCellClick:  (cell: PresetSweepCell) => void;
  selectedCell: PresetSweepCell | null;
}) {
  const metricDef  = METRIC_OPTIONS.find(m => m.key === metric)!;
  const presetLabels = PRESETS.map(p => p.label);

  const validValues = cells.map(c => c[metric]);
  const minVal = Math.min(...validValues);
  const maxVal = Math.max(...validValues);

  return (
    <div>
      <div className="flex">
        <div className="flex flex-col items-center justify-center w-10 mr-2">
          <span className="text-xs text-slate-500 -rotate-90 whitespace-nowrap">Exit weights →</span>
        </div>

        <div className="flex-1">
          {/* X-axis labels */}
          <div className="flex mb-1 ml-16">
            {presetLabels.map(label => (
              <div key={label} className="flex-1 text-center text-xs text-slate-500 font-medium">{label}</div>
            ))}
          </div>

          {/* Grid */}
          {presetLabels.map(exitLabel => (
            <div key={exitLabel} className="flex items-center mb-1">
              <div className="w-16 text-xs text-slate-500 text-right pr-2 shrink-0">{exitLabel}</div>
              {presetLabels.map(entryLabel => {
                const cell = cells.find(c => c.entryPreset === entryLabel && c.exitPreset === exitLabel);
                const value = cell?.[metric] ?? 0;
                const bg = heatmapColor(value, minVal, maxVal, metricDef.invert);
                const isSelected = selectedCell?.entryPreset === entryLabel && selectedCell?.exitPreset === exitLabel;

                return (
                  <div
                    key={entryLabel}
                    onClick={() => cell && onCellClick(cell)}
                    style={{ backgroundColor: bg }}
                    className={`flex-1 mx-0.5 rounded-lg h-12 flex flex-col items-center justify-center cursor-pointer transition-all ${
                      isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-950' : 'hover:opacity-90'
                    }`}
                  >
                    {cell && (
                      <>
                        <span className="text-white text-xs font-bold leading-tight">
                          {metricDef.fmt(value)}
                        </span>
                        <span className="text-white/50 text-[9px] leading-tight">
                          {entryLabel}→{exitLabel}
                        </span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {/* X-axis label */}
          <div className="text-center text-xs text-slate-500 mt-2">Entry weights →</div>
        </div>
      </div>

      {/* Colour scale */}
      <div className="flex items-center gap-3 mt-4 justify-center">
        <span className="text-xs text-slate-500">{metricDef.invert ? 'Higher (worse)' : 'Lower (worse)'}</span>
        <div className="h-2 w-48 rounded-full" style={{
          background: metricDef.invert
            ? 'linear-gradient(to right, #16a34a, #475569, #dc2626)'
            : 'linear-gradient(to right, #dc2626, #475569, #16a34a)'
        }} />
        <span className="text-xs text-slate-500">{metricDef.invert ? 'Lower (better)' : 'Higher (better)'}</span>
      </div>
    </div>
  );
}

const BENCHMARKS = [
  { label: 'SWDA (World)',       ticker: 'SWDA'  },
  { label: 'CSP1 (S&P 500)',    ticker: 'CSP1'  },
  { label: 'VFEG (Em Mkts)',    ticker: 'VFEG'  },
  { label: 'IGLT (UK Gilts)',   ticker: 'IGLT'  },
  { label: 'VAGS (60/40)',      ticker: 'VAGS'  },
  { label: 'Cash (SONIA)',      ticker: 'SONIA' },
];

const DEFAULT_ENTRY: WeightSet = { w1m: 0,  w3m: 20, w6m: 30, w12m: 50 }; // Trend
const DEFAULT_EXIT:  WeightSet = { w1m: 0,  w3m: 50, w6m: 30, w12m: 20 }; // Recent

type PageTab = 'single' | 'sweep' | 'stress';

// ─────────────────────────────────────────────────────────────
// Stress test periods + types
// ─────────────────────────────────────────────────────────────

interface StressPeriod {
  id:    string;
  label: string;
  desc:  string;
  start: string; // YYYY-MM-DD
  end:   string;
}

interface StressResult {
  period:        StressPeriod;
  weeks:         number;
  cagr:          number;
  totalReturn:   number;
  maxDrawdown:   number;
  sharpe:        number;
  sortino:       number;
  calmar:        number;
  winRate:       number;
  benchmarkCAGR: number;
  benchmarkTotal:number;
  benchmarkMaxDD:number;
  alpha:         number; // CAGR - benchmarkCAGR
  equityCurve:   { date: string; strategy: number; benchmark: number }[];
}

const STRESS_PERIODS: StressPeriod[] = [
  { id: 'dotcom-bubble', label: 'Dot-com Bubble',    desc: 'Huge run-up, momentum thrived',       start: '1995-01-01', end: '2000-03-31' },
  { id: 'dotcom-bust',   label: 'Dot-com Bust',      desc: '-50% drawdown over 2.5 years',        start: '2000-03-01', end: '2002-10-31' },
  { id: 'mid2000s-bull', label: 'Mid-2000s Bull',    desc: 'Steady recovery bull market',         start: '2002-10-01', end: '2007-10-31' },
  { id: 'gfc-crash',     label: 'GFC Crash',         desc: '-55% peak to trough',                 start: '2007-10-01', end: '2009-03-31' },
  { id: 'gfc-recovery',  label: 'GFC Recovery',      desc: 'Strong momentum environment',         start: '2009-03-01', end: '2013-12-31' },
  { id: 'low-vol-bull',  label: 'Low Vol Bull',      desc: 'Steady grind up, low volatility',     start: '2014-01-01', end: '2018-12-31' },
  { id: 'q4-correction', label: 'Q4 2018 Correction',desc: 'Sharp -20% then quick recovery',     start: '2018-09-01', end: '2019-06-30' },
  { id: 'covid',         label: 'COVID Crash',       desc: 'Crash + V-shape recovery',            start: '2020-01-01', end: '2020-12-31' },
  { id: 'rates-rising',  label: 'Rates Rising',      desc: 'Inflation + rate shock bear market',  start: '2021-01-01', end: '2022-12-31' },
  { id: 'post-rate',     label: 'Post-rate Recovery',desc: 'Recovery phase',                      start: '2023-01-01', end: '2024-12-31' },
  { id: 'full',          label: 'Full Period',        desc: 'Entire available dataset',            start: '1900-01-01', end: '2099-12-31' },
];

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────

export default function BacktestPage() {
  const [csvData,     setCsvData]     = useState<WeeklyPrices | null>(null);
  const [metaData,    setMetaData]    = useState<Record<string, ETFMeta>>({});
  const [fileName,    setFileName]    = useState('');
  const [metaFileName,setMetaFileName]= useState('');
  const [isDragging,  setIsDragging]  = useState(false);
  const [soniaRate,   setSoniaRate]   = useState(4.75);
  const [soniaSource, setSoniaSource] = useState('default fallback');
  const [activeTab,   setActiveTab]   = useState<PageTab>('single');
  const [params,      setParams]      = useState<StrategyParams>({
    entryTopN:        5,
    entryWeights:     DEFAULT_ENTRY,
    exitTopN:         20,
    exitWeights:      DEFAULT_EXIT,
    holdingsN:        5,
    rebalanceMonthly: true,
    useCashProxy:     true,
    benchmarkTicker:  'SWDA',
    filterMaEntry:       false,
    filterRsiEntry:      false,
    filterBollEntry:     false,
    filterMaExit:        false,
    filterRsiExit:       false,
    filterBollExit:      false,
    filterMarketMA:      false,
    filterSwdaVsSonia:   false,
    maxPerCategory:      0,
    useRiskAdj:       false,
    removeLatestMonth: false,
    bidAskSpread:      0.10,
  });

  // Phase 1
  const [result,    setResult]    = useState<BacktestResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Phase 2 — threshold sweep
  const [sweepCells,    setSweepCells]    = useState<SweepCell[] | null>(null);
  const [isSweeping,    setIsSweeping]    = useState(false);
  const [sweepMetric,   setSweepMetric]   = useState<SweepMetric>('cagr');
  const [selectedCell,  setSelectedCell]  = useState<SweepCell | null>(null);
  const [sweepDetail,   setSweepDetail]   = useState<BacktestResult | null>(null);
  const [sweepProgress, setSweepProgress] = useState(0);

  // Phase 2 — preset sweep
  const [presetCells,         setPresetCells]         = useState<PresetSweepCell[] | null>(null);
  const [isPresetSweeping,    setIsPresetSweeping]    = useState(false);
  const [presetProgress,      setPresetProgress]      = useState(0);
  const [selectedPresetCell,  setSelectedPresetCell]  = useState<PresetSweepCell | null>(null);
  const [presetDetail,        setPresetDetail]        = useState<BacktestResult | null>(null);

  // Phase 3 — stress testing
  const [stressResults,  setStressResults]  = useState<StressResult[] | null>(null);
  const [isStressing,    setIsStressing]    = useState(false);
  const [stressProgress, setStressProgress] = useState(0);
  const [stressExpanded, setStressExpanded] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  // Fetch SONIA
  useEffect(() => {
    fetch('/api/v5/etf-screener?universe=core')
      .then(r => r.json())
      .then(d => {
        if (d?.soniaRate) { setSoniaRate(d.soniaRate); setSoniaSource(d.soniaSource ?? 'FRED'); }
      })
      .catch(() => {});
  }, []);

  // Auto-run when both files are loaded
  useEffect(() => {
    if (csvData && Object.keys(metaData).length > 0 && !isRunning) {
      setIsRunning(true);
      setTimeout(() => {
        try { setResult(runBacktest(csvData, params, soniaRate, metaData)); }
        catch (err) { console.error(err); }
        finally { setIsRunning(false); }
      }, 50);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [csvData, metaData]);
  const parseMetaCSV = useCallback((text: string): Record<string, ETFMeta> => {
    const lines = text.trim().split('\n').filter(l => l.trim());
    const result: Record<string, ETFMeta> = {};
    for (let i = 1; i < lines.length; i++) {
      // Handle quoted fields
      const cols = lines[i].match(/(".*?"|[^,]+)(?=,|$)/g)?.map(c => c.replace(/^"|"$/g, '').trim()) ?? [];
      if (cols.length >= 4) {
        result[cols[0]] = { shortName: cols[1], fullName: cols[2], category: cols[3] };
      }
    }
    return result;
  }, []);

  const processFile = useCallback((file: File) => {
    const isMetaFile = file.name.includes('metadata') || file.name.includes('meta');
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      try {
        if (isMetaFile) {
          const parsed = parseMetaCSV(text);
          setMetaData(parsed);
          setMetaFileName(file.name);
        } else {
          const parsed = parseCSV(text);
          setCsvData(parsed);
          setFileName(file.name);
          setResult(null);
          setSweepCells(null);
          setSelectedCell(null);
          setSweepDetail(null);
        }
      } catch {
        alert(`Failed to parse ${file.name}. Please upload the correct CSV from /data-export.`);
      }
    };
    reader.readAsText(file);
  }, [parseMetaCSV]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    for (const f of files) processFile(f);
  }, [processFile]);

  // Phase 1 run
  const handleRun = () => {
    if (!csvData) return;
    setIsRunning(true);
    setTimeout(() => {
      try { setResult(runBacktest(csvData, params, soniaRate, metaData)); }
      catch (err) { console.error(err); alert('Backtest failed — check console.'); }
      finally { setIsRunning(false); }
    }, 50);
  };

  // Phase 2 sweep — runs all 25 combinations
  const handleSweep = () => {
    if (!csvData) return;
    setIsSweeping(true);
    setSweepCells(null);
    setSelectedCell(null);
    setSweepDetail(null);
    setSweepProgress(0);

    // Run in chunks via setTimeout to keep UI responsive and show progress
    const total = SWEEP_ENTRY_OPTIONS.length * SWEEP_EXIT_OPTIONS.length;
    const cells: SweepCell[] = [];
    let idx = 0;

    const runNext = () => {
      const entryN = SWEEP_ENTRY_OPTIONS[Math.floor(idx / SWEEP_EXIT_OPTIONS.length)];
      const exitN  = SWEEP_EXIT_OPTIONS[idx % SWEEP_EXIT_OPTIONS.length];

      if (exitN >= entryN) {
        const sweepParams = { ...params, entryTopN: entryN, exitTopN: exitN };
        const r = runBacktest(csvData!, sweepParams, soniaRate, metaData);
        cells.push({
          entryTopN: entryN, exitTopN: exitN,
          cagr: r.stats.cagr, sharpe: r.stats.sharpe, sortino: r.stats.sortino,
          calmar: r.stats.calmar, maxDD: r.stats.maxDrawdown, totalReturn: r.stats.totalReturn,
        });
      } else {
        cells.push({ entryTopN: entryN, exitTopN: exitN, cagr: 0, sharpe: 0, sortino: 0, calmar: 0, maxDD: 0, totalReturn: 0 });
      }

      idx++;
      setSweepProgress(Math.round((idx / total) * 100));

      if (idx < total) {
        setTimeout(runNext, 0); // yield to UI between each run
      } else {
        setSweepCells(cells);
        setIsSweeping(false);
      }
    };

    setTimeout(runNext, 50);
  };

  // Phase 2 preset sweep — runs all 49 preset combinations
  const handlePresetSweep = () => {
    if (!csvData) return;
    setIsPresetSweeping(true);
    setPresetCells(null);
    setSelectedPresetCell(null);
    setPresetDetail(null);
    setPresetProgress(0);

    const total = PRESETS.length * PRESETS.length;
    const cells: PresetSweepCell[] = [];
    let idx = 0;

    const runNext = () => {
      const entryPreset = PRESETS[Math.floor(idx / PRESETS.length)];
      const exitPreset  = PRESETS[idx % PRESETS.length];

      const sweepParams = { ...params, entryWeights: entryPreset.w, exitWeights: exitPreset.w };
      const r = runBacktest(csvData!, sweepParams, soniaRate, metaData);
      cells.push({
        entryPreset: entryPreset.label,
        exitPreset:  exitPreset.label,
        cagr:        r.stats.cagr,
        sharpe:      r.stats.sharpe,
        sortino:     r.stats.sortino,
        calmar:      r.stats.calmar,
        maxDD:       r.stats.maxDrawdown,
        totalReturn: r.stats.totalReturn,
      });

      idx++;
      setPresetProgress(Math.round((idx / total) * 100));

      if (idx < total) {
        setTimeout(runNext, 0);
      } else {
        setPresetCells(cells);
        setIsPresetSweeping(false);
      }
    };

    setTimeout(runNext, 50);
  };

  // When a preset cell is clicked
  const handlePresetCellClick = (cell: PresetSweepCell) => {
    if (!csvData) return;
    setSelectedPresetCell(cell);
    const entryW = PRESETS.find(p => p.label === cell.entryPreset)?.w ?? params.entryWeights;
    const exitW  = PRESETS.find(p => p.label === cell.exitPreset)?.w  ?? params.exitWeights;
    const sweepParams = { ...params, entryWeights: entryW, exitWeights: exitW };
    setPresetDetail(runBacktest(csvData, sweepParams, soniaRate, metaData));
    setParams(prev => ({ ...prev, entryWeights: entryW, exitWeights: exitW }));
    setResult(null);
  };

  // When a threshold heatmap cell is clicked
  // Phase 3 — stress test: runs each period sequentially
  const handleStress = () => {
    if (!csvData) return;
    setIsStressing(true);
    setStressResults(null);
    setStressProgress(0);
    setStressExpanded(null);

    setTimeout(() => {
      try {
        const results = runStressTests(csvData, params, soniaRate, metaData);
        setStressResults(results);
      } catch (err) {
        console.error(err);
        alert('Stress test failed — check console.');
      } finally {
        setIsStressing(false);
        setStressProgress(100);
      }
    }, 50);
  };

  const handleCellClick = (cell: SweepCell) => {
    if (!csvData) return;
    setSelectedCell(cell);
    const sweepParams = { ...params, entryTopN: cell.entryTopN, exitTopN: cell.exitTopN };
    setSweepDetail(runBacktest(csvData, sweepParams, soniaRate, metaData));
  };

  // Also sync thresholds back to single-strategy tab
  const handleCellClickWithSync = (cell: SweepCell) => {
    handleCellClick(cell);
    setParams(prev => ({ ...prev, entryTopN: cell.entryTopN, exitTopN: cell.exitTopN }));
    setResult(null);
  };

  const setParam = <K extends keyof StrategyParams>(k: K, v: StrategyParams[K]) => {
    setParams(prev => ({ ...prev, [k]: v }));
    setResult(null);
    setSweepCells(null);
    setSelectedCell(null);
    setSweepDetail(null);
    setPresetCells(null);
    setSelectedPresetCell(null);
    setPresetDetail(null);
    setStressResults(null);
  };

  const chartData = useMemo(() => {
    if (!result) return [];
    const c = result.equityCurve;
    if (c.length <= 260) return c;
    const step = Math.ceil(c.length / 260);
    return c.filter((_, i) => i % step === 0 || i === c.length - 1);
  }, [result]);

  const sweepDetailChartData = useMemo(() => {
    if (!sweepDetail) return [];
    const c = sweepDetail.equityCurve;
    if (c.length <= 260) return c;
    const step = Math.ceil(c.length / 260);
    return c.filter((_, i) => i % step === 0 || i === c.length - 1);
  }, [sweepDetail]);

  const stats      = result?.stats;
  const yearlyData = stats?.yearlyReturns ?? [];

  return (
    <BacktestPageInner
      csvData={csvData} metaData={metaData} fileName={fileName} metaFileName={metaFileName} isDragging={isDragging} setIsDragging={setIsDragging}
      soniaRate={soniaRate} soniaSource={soniaSource}
      activeTab={activeTab} setActiveTab={setActiveTab}
      params={params} setParam={setParam}
      result={result} stats={stats} yearlyData={yearlyData}
      chartData={chartData} sweepDetailChartData={sweepDetailChartData}
      isRunning={isRunning} handleRun={handleRun}
      sweepCells={sweepCells} isSweeping={isSweeping}
      sweepMetric={sweepMetric} setSweepMetric={setSweepMetric}
      selectedCell={selectedCell} sweepDetail={sweepDetail}
      sweepProgress={sweepProgress} handleSweep={handleSweep}
      handleCellClickWithSync={handleCellClickWithSync}
      presetCells={presetCells} isPresetSweeping={isPresetSweeping}
      presetProgress={presetProgress} selectedPresetCell={selectedPresetCell}
      presetDetail={presetDetail}
      handlePresetSweep={handlePresetSweep}
      handlePresetCellClick={handlePresetCellClick}
      setCsvData={setCsvData} setResult={setResult}
      setSweepCells={setSweepCells} setFileName={setFileName}
      fileRef={fileRef} processFile={processFile}
      onDrop={onDrop}
      stressResults={stressResults} isStressing={isStressing}
      stressProgress={stressProgress} stressExpanded={stressExpanded}
      setStressExpanded={setStressExpanded} handleStress={handleStress}
    />
  );
}

// ─────────────────────────────────────────────────────────────
// Inner render component (extracted to avoid Next.js parse error
// with component-inside-component pattern)
// ─────────────────────────────────────────────────────────────

interface InnerProps {
  csvData:                WeeklyPrices | null;
  metaData:               Record<string, ETFMeta>;
  fileName:               string;
  metaFileName:           string;
  isDragging:             boolean;
  setIsDragging:          (v: boolean) => void;
  soniaRate:              number;
  soniaSource:            string;
  activeTab:              PageTab;
  setActiveTab:           (t: PageTab) => void;
  params:                 StrategyParams;
  setParam:               <K extends keyof StrategyParams>(k: K, v: StrategyParams[K]) => void;
  result:                 BacktestResult | null;
  stats:                  BacktestStats | undefined;
  yearlyData:             { year: number; strategy: number; benchmark: number }[];
  chartData:              { date: string; strategy: number; benchmark: number }[];
  sweepDetailChartData:   { date: string; strategy: number; benchmark: number }[];
  isRunning:              boolean;
  handleRun:              () => void;
  sweepCells:             SweepCell[] | null;
  isSweeping:             boolean;
  sweepMetric:            SweepMetric;
  setSweepMetric:         (m: SweepMetric) => void;
  selectedCell:           SweepCell | null;
  sweepDetail:            BacktestResult | null;
  sweepProgress:          number;
  handleSweep:            () => void;
  handleCellClickWithSync:(cell: SweepCell) => void;
  presetCells:            PresetSweepCell[] | null;
  isPresetSweeping:       boolean;
  presetProgress:         number;
  selectedPresetCell:     PresetSweepCell | null;
  presetDetail:           BacktestResult | null;
  handlePresetSweep:      () => void;
  handlePresetCellClick:  (cell: PresetSweepCell) => void;
  setCsvData:             (d: WeeklyPrices | null) => void;
  setResult:              (r: BacktestResult | null) => void;
  setSweepCells:          (c: SweepCell[] | null) => void;
  setFileName:            (f: string) => void;
  fileRef:    RefObject<HTMLInputElement | null>;
  processFile:            (f: File) => void;
  onDrop:                 (e: React.DragEvent) => void;
  // Stress test
  stressResults:          StressResult[] | null;
  isStressing:            boolean;
  stressProgress:         number;
  stressExpanded:         string | null;
  setStressExpanded:      (id: string | null) => void;
  handleStress:           () => void;
}

function BacktestPageInner({
  csvData, metaData, fileName, metaFileName, isDragging, setIsDragging, soniaRate, soniaSource,
  activeTab, setActiveTab, params, setParam,
  result, stats, yearlyData, chartData, sweepDetailChartData,
  isRunning, handleRun,
  sweepCells, isSweeping, sweepMetric, setSweepMetric,
  selectedCell, sweepDetail, sweepProgress, handleSweep, handleCellClickWithSync,
  presetCells, isPresetSweeping, presetProgress, selectedPresetCell,
  presetDetail, handlePresetSweep, handlePresetCellClick,
  setCsvData, setResult, setSweepCells, setFileName,
  fileRef, processFile, onDrop,
  stressResults, isStressing, stressProgress,
  stressExpanded, setStressExpanded, handleStress,
}: InnerProps) {

  // Params panel rendered as JSX block (not a sub-component) to avoid
  // re-mount on every render — fine here since it's inside a proper component
  const paramsPanel = (
    <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">Strategy Parameters</h2>
        <button onClick={() => { setCsvData(null); setResult(null); setSweepCells(null); setFileName(''); }}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors">✕ Change file</button>
      </div>

      {/* Weight panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WeightPanel
          title="Entry Signal Weights"
          tip="Composite return weights for deciding which ETFs to BUY. Default is long-term biased (heavy 12M)."
          weights={params.entryWeights}
          onChange={w => setParam('entryWeights', w)}
        />
        <WeightPanel
          title="Exit Signal Weights"
          tip="Composite return weights for deciding which ETFs to SELL. Default is short-term biased (heavy 1M/3M) — exits early when recent momentum fades."
          weights={params.exitWeights}
          onChange={w => setParam('exitWeights', w)}
        />
      </div>

      {/* Thresholds row — only shown in single tab (sweep overrides these) */}
      {activeTab === 'single' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 pt-4 border-t border-slate-800">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Entry — Top N
              <span className="ml-1 font-normal normal-case text-slate-600 cursor-help"
                title="Buy an ETF if its entry score ranks it within the top N on that rebalance date.">ⓘ</span>
            </label>
            <div className="flex gap-1 flex-wrap">
              {[3,5,10,15,20].map(n => (
                <button key={n} onClick={() => setParam('entryTopN', n)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    params.entryTopN === n ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}>{n}</button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1.5">Buy if entry score in top {params.entryTopN}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Exit — Outside Top N
              <span className="ml-1 font-normal normal-case text-slate-600 cursor-help"
                title="Sell if exit score drops outside the top N. Uses separate exit weights.">ⓘ</span>
            </label>
            <div className="flex gap-1 flex-wrap">
              {[10,15,20,30,50].map(n => (
                <button key={n} onClick={() => setParam('exitTopN', n)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    params.exitTopN === n ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}>{n}</button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1.5">Sell if exit score outside top {params.exitTopN}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Max Holdings
              <span className="ml-1 font-normal normal-case text-slate-600 cursor-help"
                title="Maximum simultaneous positions. Remaining slots earn SONIA rate if cash proxy enabled.">ⓘ</span>
            </label>
            <div className="flex gap-1 flex-wrap">
              {[1,3,5,10,15].map(n => (
                <button key={n} onClick={() => setParam('holdingsN', n)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    params.holdingsN === n ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}>{n}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Benchmark</label>
            <div className="flex gap-1 flex-wrap">
              {BENCHMARKS.map(b => (
                <button key={b.ticker} onClick={() => setParam('benchmarkTicker', b.ticker)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    params.benchmarkTicker === b.ticker ? 'bg-slate-600 border-slate-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}>{b.label}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sweep tab: show holdings/benchmark/rebalance only (thresholds swept automatically) */}
      {activeTab === 'sweep' && (
        <div className="grid grid-cols-3 gap-5 pt-4 border-t border-slate-800">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Max Holdings
              <span className="ml-1 font-normal normal-case text-slate-600 cursor-help"
                title="Fixed for the sweep. Entry/exit thresholds are swept automatically across all combinations.">ⓘ</span>
            </label>
            <div className="flex gap-1 flex-wrap">
              {[1,3,5,10,15].map(n => (
                <button key={n} onClick={() => setParam('holdingsN', n)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    params.holdingsN === n ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}>{n}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Benchmark</label>
            <div className="flex gap-1 flex-wrap">
              {BENCHMARKS.map(b => (
                <button key={b.ticker} onClick={() => setParam('benchmarkTicker', b.ticker)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    params.benchmarkTicker === b.ticker ? 'bg-slate-600 border-slate-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}>{b.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Rebalance</label>
            <div className="flex gap-2">
              {[{ label: 'Monthly', val: true }, { label: 'Weekly', val: false }].map(o => (
                <button key={String(o.val)} onClick={() => setParam('rebalanceMonthly', o.val)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                    params.rebalanceMonthly === o.val ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}>{o.label}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters — three columns: Entry | Regime | Exit */}
      <div className="pt-4 border-t border-slate-800">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Filters</span>
          <span className="text-slate-600 text-xs cursor-help"
            title="All filters use weekly prices. MA = 40-week simple moving average. RSI = 14-week RSI. Bollinger = 20-week bands (2 std). If an ETF has insufficient history for a filter at a rebalance date, that filter is ignored for that ETF (pass-through).">ⓘ</span>
        </div>
        <div className="grid grid-cols-3 gap-4">

          {/* ── LEFT: Entry filters ───────────────────────── */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wide mb-2">Entry Filters</p>
            <p className="text-xs text-slate-600 mb-3">Block new buys if condition fails</p>

            {/* ETF > 40-week MA */}
            {[
              { key: 'filterMaEntry'   as const, icon: '📈', label: 'ETF > 40-week MA',       desc: 'Only buy if price above 40W MA',  tip: 'At each rebalance, skips any ETF whose current price is below its 40-week simple moving average. Only applies to new entries — existing holdings are unaffected unless the Exit filter is also on.' },
              { key: 'filterRsiEntry'  as const, icon: '〰️', label: 'RSI(14) > 50',            desc: 'Only buy if 14-week RSI above 50', tip: 'Blocks entry into any ETF with a 14-week RSI below 50. RSI above 50 indicates positive medium-term momentum. Uses weekly closing prices. If fewer than 15 weeks of data, filter is ignored.' },
              { key: 'filterBollEntry' as const, icon: '📊', label: 'Price > Bollinger Mid',   desc: 'Only buy if above 20-week SMA',   tip: 'Blocks entry if the ETF price is below its 20-week simple moving average (Bollinger middle band). A gentler trend filter than the 40-week MA. If fewer than 20 weeks of data, filter is ignored.' },
            ].map(({ key, icon, label, desc, tip }) => (
              <div key={key} className="relative group">
                <button
                  onClick={() => setParam(key, !params[key])}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                    params[key] ? 'bg-emerald-900/40 border-emerald-700/60' : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  <span className={`mt-0.5 text-base leading-none ${params[key] ? 'opacity-100' : 'opacity-30'}`}>{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${params[key] ? 'text-emerald-300' : 'text-slate-300'}`}>{label}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-snug">{desc}</p>
                  </div>
                  <span className={`text-xs font-bold shrink-0 ${params[key] ? 'text-emerald-400' : 'text-slate-600'}`}>
                    {params[key] ? 'ON' : 'OFF'}
                  </span>
                </button>
                <div className="absolute bottom-full left-0 mb-2 w-72 bg-slate-800 border border-slate-600 rounded-xl p-3 text-xs text-slate-300 shadow-2xl z-50 leading-relaxed hidden group-hover:block">
                  {tip}
                </div>
              </div>
            ))}
          </div>

          {/* ── MIDDLE: Regime filters ────────────────────── */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide mb-2">Regime Filters</p>
            <p className="text-xs text-slate-600 mb-3">Liquidate all → 100% cash if triggers</p>

            {/* Market MA */}
            {[
              { key: 'filterMarketMA'    as const, icon: '🌍', label: `Market < 40-week MA`,      desc: `${params.benchmarkTicker} below its 40W MA → cash`, tip: `If the selected benchmark (${params.benchmarkTicker}) is below its 40-week MA at a rebalance date, liquidates all holdings and goes 100% to cash. No new entries until the benchmark recovers. In 2022 SWDA crossed below in January and didn't recover until late 2023.` },
              { key: 'filterSwdaVsSonia' as const, icon: '💷', label: 'SWDA 12M < SONIA',         desc: 'Global equities trailing cash → cash', tip: `If SWDA's 12-month return is below the SONIA annual rate at a rebalance date, liquidates all holdings and goes 100% to cash. Checks whether global equities are outperforming cash on a rolling 12-month basis. If SWDA not in CSV, this filter is ignored.` },
            ].map(({ key, icon, label, desc, tip }) => (
              <div key={key} className="relative group">
                <button
                  onClick={() => setParam(key, !params[key])}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                    params[key] ? 'bg-amber-900/40 border-amber-700/60' : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  <span className={`mt-0.5 text-base leading-none ${params[key] ? 'opacity-100' : 'opacity-30'}`}>{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${params[key] ? 'text-amber-300' : 'text-slate-300'}`}>{label}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-snug">{desc}</p>
                  </div>
                  <span className={`text-xs font-bold shrink-0 ${params[key] ? 'text-amber-400' : 'text-slate-600'}`}>
                    {params[key] ? 'ON' : 'OFF'}
                  </span>
                </button>
                <div className="absolute bottom-full left-0 mb-2 w-72 bg-slate-800 border border-slate-600 rounded-xl p-3 text-xs text-slate-300 shadow-2xl z-50 leading-relaxed hidden group-hover:block">
                  {tip}
                </div>
              </div>
            ))}

            {/* Max per category slider */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setParam('maxPerCategory', params.maxPerCategory === 0 ? 3 : 0)}
                    className={`text-base leading-none ${params.maxPerCategory > 0 ? 'opacity-100' : 'opacity-30'}`}
                  >🗂️</button>
                  <p className={`text-xs font-semibold ${params.maxPerCategory > 0 ? 'text-amber-300' : 'text-slate-300'}`}>
                    Max per Category
                  </p>
                  <span className="text-slate-600 text-xs cursor-help"
                    title="Limits the number of new entries from any single category at each rebalance. Existing holdings are always kept regardless of their category count — only new additions are capped. Uses the category column from the metadata CSV. Set to 0 (or toggle off) to disable.">ⓘ</span>
                </div>
                <span className={`text-xs font-bold ${params.maxPerCategory > 0 ? 'text-amber-400' : 'text-slate-600'}`}>
                  {params.maxPerCategory === 0 ? 'OFF' : params.maxPerCategory}
                </span>
              </div>
              <input
                type="range" min={0} max={5} step={1}
                value={params.maxPerCategory}
                onChange={e => setParam('maxPerCategory', parseInt(e.target.value))}
                className={`w-full ${params.maxPerCategory > 0 ? 'accent-amber-500' : 'accent-slate-600'}`}
              />
              <div className="flex justify-between text-xs text-slate-600 mt-1">
                <span>Off</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Exit filters ───────────────────────── */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-rose-500 uppercase tracking-wide mb-2">Exit Filters</p>
            <p className="text-xs text-slate-600 mb-3">Force sell current holdings if condition fails</p>

            {[
              { key: 'filterMaExit'   as const, icon: '📉', label: 'ETF < 40-week MA',       desc: 'Force sell if price below 40W MA',  tip: 'Forces an immediate sell of any currently held ETF whose price drops below its 40-week MA at a rebalance date, regardless of its momentum rank. Can be used without the Entry filter — exit-only lets positions enter freely but cuts them when the trend breaks.' },
              { key: 'filterRsiExit'  as const, icon: '〰️', label: 'RSI(14) < 40',            desc: 'Force sell if 14-week RSI below 40', tip: 'Forces an exit from any held ETF with a 14-week RSI below 40. Using 40 rather than 50 adds a buffer to avoid churning positions hovering near neutral. RSI below 40 indicates meaningful negative momentum. If fewer than 15 weeks of data, filter is ignored.' },
              { key: 'filterBollExit' as const, icon: '📊', label: 'Price < Bollinger Lower', desc: 'Force sell if below lower band',      tip: 'Forces an exit from any held ETF whose price has broken below the lower Bollinger band (20-week SMA minus 2 standard deviations). A breakdown below the lower band indicates a significant move against the position. If fewer than 20 weeks of data, filter is ignored.' },
            ].map(({ key, icon, label, desc, tip }) => (
              <div key={key} className="relative group">
                <button
                  onClick={() => setParam(key, !params[key])}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                    params[key] ? 'bg-rose-900/40 border-rose-700/60' : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  <span className={`mt-0.5 text-base leading-none ${params[key] ? 'opacity-100' : 'opacity-30'}`}>{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-semibold ${params[key] ? 'text-rose-300' : 'text-slate-300'}`}>{label}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-snug">{desc}</p>
                  </div>
                  <span className={`text-xs font-bold shrink-0 ${params[key] ? 'text-rose-400' : 'text-slate-600'}`}>
                    {params[key] ? 'ON' : 'OFF'}
                  </span>
                </button>
                <div className="absolute bottom-full left-0 mb-2 w-72 bg-slate-800 border border-slate-600 rounded-xl p-3 text-xs text-slate-300 shadow-2xl z-50 leading-relaxed hidden group-hover:block">
                  {tip}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* Ranking mode */}
      <div className="pt-4 border-t border-slate-800">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Ranking Signal</span>
          <span className="text-slate-600 text-xs cursor-help"
            title="Controls what metric is used to rank ETFs for entry and exit decisions. Raw Return ranks by price performance over each lookback window. Risk-Adjusted ranks by Sharpe ratio (excess return over SONIA divided by volatility), penalising volatile ETFs even if they have high returns.">ⓘ</span>
        </div>
        <div className="flex gap-2 mb-3">
          {[
            {
              val:   false,
              label: 'Raw Return',
              icon:  '📈',
              desc:  'Rank by price return over each lookback window',
              tip:   'Standard momentum — ranks ETFs purely by how much they have gone up over 1M/3M/6M/12M windows. Weighted composite of the selected lookback periods.',
            },
            {
              val:   true,
              label: 'Risk-Adjusted (Sharpe)',
              icon:  '⚖️',
              desc:  'Rank by Sharpe ratio — excess return over SONIA ÷ volatility',
              tip:   `Matches Tab 5 risk-adj mode exactly. Formula: (periodReturn − SONIA×fraction) ÷ (annualisedVol × √fraction). Penalises volatile ETFs even if they have high raw returns. Uses SONIA at ${soniaRate.toFixed(2)}% as risk-free rate.`,
            },
          ].map(o => (
            <div key={String(o.val)} className="relative group flex-1">
              <button
                onClick={() => setParam('useRiskAdj', o.val)}
                className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                  params.useRiskAdj === o.val
                    ? 'bg-violet-900/40 border-violet-700/60'
                    : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
                }`}
              >
                <span className={`mt-0.5 text-lg leading-none ${params.useRiskAdj === o.val ? 'opacity-100' : 'opacity-30'}`}>{o.icon}</span>
                <div className="flex-1">
                  <p className={`text-xs font-semibold ${params.useRiskAdj === o.val ? 'text-violet-300' : 'text-slate-300'}`}>{o.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-snug">{o.desc}</p>
                </div>
                {params.useRiskAdj === o.val && (
                  <span className="text-xs font-bold text-violet-400 shrink-0">●</span>
                )}
              </button>
              <div className="absolute bottom-full left-0 mb-2 w-80 bg-slate-800 border border-slate-600 rounded-xl p-3 text-xs text-slate-300 shadow-2xl z-50 leading-relaxed hidden group-hover:block">
                <p className="font-semibold text-white mb-1">{o.label}</p>
                {o.tip}
              </div>
            </div>
          ))}
        </div>

        {/* Remove latest month — sits below the two ranking mode cards */}
        <div className="relative group">
          <button
            onClick={() => setParam('removeLatestMonth', !params.removeLatestMonth)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
              params.removeLatestMonth
                ? 'bg-sky-900/40 border-sky-700/60'
                : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
            }`}
          >
            <span className={`text-lg leading-none ${params.removeLatestMonth ? 'opacity-100' : 'opacity-30'}`}>⏪</span>
            <div className="flex-1">
              <p className={`text-xs font-semibold ${params.removeLatestMonth ? 'text-sky-300' : 'text-slate-300'}`}>
                Remove Latest Month
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Shift all lookbacks back 4 weeks — score uses weeks 4→56 instead of 0→52 etc.
              </p>
            </div>
            <span className={`text-xs font-bold shrink-0 ${params.removeLatestMonth ? 'text-sky-400' : 'text-slate-600'}`}>
              {params.removeLatestMonth ? 'ON' : 'OFF'}
            </span>
          </button>
          <div className="absolute bottom-full left-0 mb-2 w-80 bg-slate-800 border border-slate-600 rounded-xl p-3 text-xs text-slate-300 shadow-2xl z-50 leading-relaxed hidden group-hover:block">
            <p className="font-semibold text-white mb-1">Remove Latest Month</p>
            Matches the Tab 5 screener "Remove Latest Month" toggle. Shifts the anchor point back 4 weeks so the most recent month of price data is excluded from all return and volatility calculations. Avoids the short-term reversal effect — very recent performance can be noisy and mean-reverting, so skipping it often gives a cleaner underlying trend signal. For example, the 12M window becomes weeks 4→56 back instead of 0→52 back.
          </div>
        </div>
      </div>

      {/* Toggles — always shown */}
      <div className="grid grid-cols-2 gap-5 pt-4 border-t border-slate-800">
        {activeTab === 'single' && (
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Rebalance Frequency</label>
            <div className="flex gap-2">
              {[{ label: 'Monthly', val: true }, { label: 'Weekly', val: false }].map(o => (
                <button key={String(o.val)} onClick={() => setParam('rebalanceMonthly', o.val)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                    params.rebalanceMonthly === o.val ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}>{o.label}</button>
              ))}
            </div>
          </div>
        )}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
            Uninvested Cash
            <span className="ml-1 font-normal normal-case text-slate-600 cursor-help"
              title={`Cash earns ${soniaRate.toFixed(2)}% annualised (SONIA). Source: ${soniaSource}.`}>ⓘ</span>
          </label>
          <div className="flex gap-2">
            {[
              { label: `SONIA proxy (${soniaRate.toFixed(1)}%)`, val: true  },
              { label: '0% (idle)',                              val: false },
            ].map(o => (
              <button key={String(o.val)} onClick={() => setParam('useCashProxy', o.val)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${
                  params.useCashProxy === o.val ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                }`}>{o.label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Bid-ask spread */}
      <div className="pt-4 border-t border-slate-800">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Bid-Ask Spread</span>
            <span className="text-slate-600 text-xs cursor-help"
              title="One-way transaction cost applied on each buy and sell. A 0.10% spread means each entry costs 0.10% and each exit costs 0.10% — 0.20% round trip per position. Applied to strategy only, not the benchmark. Typical range for large LSE ETFs: 0.05–0.15%.">ⓘ</span>
          </div>
          <span className="text-xs font-bold text-slate-200">
            {params.bidAskSpread.toFixed(2)}% per leg
            <span className="text-slate-500 font-normal ml-1">({(params.bidAskSpread * 2).toFixed(2)}% round trip)</span>
          </span>
        </div>
        <input
          type="range"
          min={0} max={0.5} step={0.01}
          value={params.bidAskSpread}
          onChange={e => setParam('bidAskSpread', parseFloat(e.target.value))}
          className="w-full accent-slate-400"
        />
        <div className="flex justify-between text-xs text-slate-600 mt-1">
          <span>0% (none)</span>
          <span>0.10% (default)</span>
          <span>0.25%</span>
          <span>0.50%</span>
        </div>
      </div>

      {/* Action button */}
      <div className="pt-4 border-t border-slate-800 flex items-center gap-4">
        {activeTab === 'single' ? (
          <>
            <button onClick={handleRun} disabled={isRunning}
              className={`px-8 py-3 rounded-xl font-semibold text-sm transition-all shadow-lg ${
                isRunning ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}>
              {isRunning ? '⏳ Running...' : '▶ Run Backtest'}
            </button>
            <p className="text-xs text-slate-500">
              Entry top {params.entryTopN} · Exit outside top {params.exitTopN} · {params.holdingsN} holdings · {params.rebalanceMonthly ? 'Monthly' : 'Weekly'}
            </p>
          </>
        ) : (
          <>
            <button onClick={handleSweep} disabled={isSweeping}
              className={`px-8 py-3 rounded-xl font-semibold text-sm transition-all shadow-lg ${
                isSweeping ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-500 text-white'
              }`}>
              {isSweeping ? `⏳ Running ${sweepProgress}%...` : '⚡ Run Parameter Sweep'}
            </button>
            <p className="text-xs text-slate-500">
              25 combinations · Entry {SWEEP_ENTRY_OPTIONS.join('/')} × Exit {SWEEP_EXIT_OPTIONS.join('/')} · {params.holdingsN} holdings fixed
            </p>
          </>
        )}
      </div>

      {/* Progress bar for sweep */}
      {isSweeping && (
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-500 rounded-full transition-all duration-200"
            style={{ width: `${sweepProgress}%` }}
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">ETF Momentum Backtester</h1>
            <p className="text-slate-400 text-sm mt-0.5">Dual weighted ranking · Independent entry / exit signals</p>
          </div>
          <div className="text-right text-xs">
            <p className="text-slate-400">
              SONIA: <span className="text-slate-200 font-semibold">{soniaRate.toFixed(2)}%</span>
              <span className="text-slate-600 ml-1">({soniaSource})</span>
            </p>
            {csvData && (
              <div className="mt-1 text-slate-500">
                <p className="text-slate-300 font-medium">{fileName}</p>
                <p>{csvData.tickers.length} ETFs · {csvData.dates.length} weeks</p>
                <p>{csvData.dates[0]} → {csvData.dates[csvData.dates.length - 1]}</p>
              </div>
            )}
          </div>
        </div>

        {/* Upload — both files needed */}
        {(!csvData || Object.keys(metaData).length === 0) && (
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
              isDragging ? 'border-blue-400 bg-blue-950/30' : 'border-slate-700 bg-slate-900/50 hover:border-slate-500 hover:bg-slate-900'
            }`}
          >
            <input ref={fileRef} type="file" accept=".csv" multiple
              onChange={e => { const files = Array.from(e.target.files ?? []); files.forEach(processFile); }}
              className="hidden" />
            <div className="text-4xl mb-3">📂</div>
            <p className="text-slate-300 font-semibold text-lg mb-1">Drop both CSV files here to begin</p>
            <p className="text-slate-500 text-sm mb-5">
              You can drop both at once or one at a time in any order.{' '}
              Export both from <a href="/data-export" className="text-blue-400 hover:underline" onClick={e => e.stopPropagation()}>/data-export</a>.
            </p>

            {/* File status */}
            <div className="flex gap-3 justify-center">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                csvData ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700' : 'bg-slate-800 text-slate-500 border border-slate-700'
              }`}>
                {csvData ? '✓' : '○'} Prices CSV
                {csvData && <span className="text-emerald-500 text-xs ml-1 font-normal truncate max-w-32">{fileName}</span>}
              </div>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                Object.keys(metaData).length > 0 ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700' : 'bg-slate-800 text-slate-500 border border-slate-700'
              }`}>
                {Object.keys(metaData).length > 0 ? '✓' : '○'} Metadata CSV
                {Object.keys(metaData).length > 0 && <span className="text-emerald-500 text-xs ml-1 font-normal truncate max-w-32">{metaFileName}</span>}
              </div>
            </div>

            {(csvData || Object.keys(metaData).length > 0) && (
              <p className="mt-3 text-slate-500 text-xs">
                {!csvData ? 'Waiting for prices CSV (etf-prices-*.csv)…' : 'Waiting for metadata CSV (etf-metadata-*.csv)…'}
              </p>
            )}
          </div>
        )}

        {csvData && Object.keys(metaData).length > 0 && (
          <>
            {/* Tab bar */}
            <div className="flex gap-2 bg-slate-900 rounded-xl p-1 border border-slate-800 w-fit">
              {[
                { id: 'single' as PageTab, label: '📈 Single Strategy', desc: 'Equity curve & full stats'   },
                { id: 'sweep'  as PageTab, label: '🔥 Parameter Sweep',  desc: 'Heatmap of 25 combinations' },
                { id: 'stress' as PageTab, label: '📊 Stress Test',      desc: 'Performance by regime'      },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === tab.id
                      ? 'bg-slate-700 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                  <span className="ml-2 text-xs font-normal opacity-60">{tab.desc}</span>
                </button>
              ))}
            </div>

            {/* Shared params panel */}
            {paramsPanel}

            {/* ── Single strategy results ────────────────── */}
            {activeTab === 'single' && result && stats && (
              <div className="space-y-5">
                <div className="grid grid-cols-4 gap-4 md:grid-cols-8">
                  {[
                    { label: 'Total Return', val: fmtPct(stats.totalReturn),          sub: `Benchmark: ${fmtPct(stats.benchmarkTotal)}`,     highlight: stats.totalReturn > stats.benchmarkTotal },
                    { label: 'CAGR',         val: fmtPct(stats.cagr),                 sub: `Benchmark: ${fmtPct(stats.benchmarkCAGR)}`,      highlight: stats.cagr > stats.benchmarkCAGR         },
                    { label: 'Max Drawdown', val: `-${fmtPctAbs(stats.maxDrawdown)}`, sub: `Benchmark: -${fmtPctAbs(stats.benchmarkMaxDD)}`, highlight: stats.maxDrawdown < stats.benchmarkMaxDD  },
                    { label: 'Sharpe',       val: fmt2(stats.sharpe),                 sub: 'Annualised',                                     highlight: stats.sharpe  > 1                         },
                    { label: 'Sortino',      val: fmt2(stats.sortino),                sub: 'Downside only',                                  highlight: stats.sortino > 1                         },
                    { label: 'Calmar',       val: fmt2(stats.calmar),                 sub: 'CAGR / Max DD',                                  highlight: stats.calmar  > 1                         },
                    { label: 'Win Rate',     val: fmtPctAbs(stats.winRate),           sub: '% positive weeks',                               highlight: stats.winRate > 55                        },
                    { label: 'Avg Hold',     val: `${fmt1(stats.avgHoldWeeks)}w`,     sub: `${stats.totalTrades} total trades`,              highlight: false                                     },
                  ].map(s => <StatCard key={s.label} {...s} />)}
                </div>

                <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
                  <h2 className="text-sm font-semibold text-white mb-4">Equity Curve — Growth of 100</h2>
                  <ResponsiveContainer width="100%" height={340}>
                    <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }}
                        tickFormatter={d => d.substring(0, 7)} interval={Math.floor(chartData.length / 8)} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                      <RechartsTooltip content={<ChartTip />} />
                      <Legend formatter={v => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>} />
                      <ReferenceLine y={100} stroke="#334155" strokeDasharray="4 4" />
                      <Line type="monotone" dataKey="strategy" name="Strategy" stroke="#3b82f6" dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="benchmark" name={`Benchmark (${params.benchmarkTicker})`}
                        stroke="#f59e0b" dot={false} strokeWidth={1.5} strokeDasharray="5 3" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
                  <h2 className="text-sm font-semibold text-white mb-4">Annual Returns</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-800">
                          {['Year','Strategy','Benchmark','Alpha'].map(h => (
                            <th key={h} className={`py-2 text-xs font-semibold text-slate-400 uppercase ${h==='Year'?'text-left pr-4':'text-right px-4'}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {yearlyData.map(row => {
                          const alpha = row.strategy - row.benchmark;
                          return (
                            <tr key={row.year} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                              <td className="py-2 pr-4 font-semibold text-slate-300">{row.year}</td>
                              <td className={`py-2 px-4 text-right font-bold ${row.strategy>=0?'text-green-400':'text-red-400'}`}>{fmtPct(row.strategy)}</td>
                              <td className={`py-2 px-4 text-right ${row.benchmark>=0?'text-green-600':'text-red-600'}`}>{fmtPct(row.benchmark)}</td>
                              <td className={`py-2 px-4 text-right font-semibold ${alpha>=0?'text-blue-400':'text-orange-400'}`}>{fmtPct(alpha)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
                  <h2 className="text-sm font-semibold text-white mb-4">Recent Rebalances (last 12)</h2>
                  <div className="space-y-2 text-xs">
                    {result.rebalances.slice(-12).reverse().map(r => (
                      <div key={r.date} className="flex items-start gap-4 py-2 border-b border-slate-800/50">
                        <span className="text-slate-400 font-mono w-24 shrink-0">{r.date}</span>
                        <div className="flex flex-wrap gap-1.5 flex-1">
                          {r.holdings.map(t => (
                            <span key={t} className="px-2 py-0.5 bg-blue-900/50 text-blue-300 rounded font-medium border border-blue-800/50">{t}</span>
                          ))}
                          {r.cash > 0 && (
                            <span className={`px-2 py-0.5 rounded border font-medium ${
                              r.cash === 1
                                ? 'bg-amber-900/40 text-amber-300 border-amber-700/50'
                                : 'bg-slate-700/50 text-slate-400 border-slate-600/50'
                            }`}>
                              {r.cash === 1 ? '🌍 Regime — 100% Cash' : `Cash ${(r.cash * 100).toFixed(0)}%`}
                            </span>
                          )}
                        </div>
                        {(r.entered.length > 0 || r.exited.length > 0) && (
                          <div className="shrink-0 flex gap-2">
                            {r.entered.map(t => <span key={t} className="text-green-400">▲{t}</span>)}
                            {r.exited.map(t  => <span key={t} className="text-red-400">▼{t}</span>)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Parameter sweep results ────────────────── */}
            {activeTab === 'sweep' && sweepCells && (
              <div className="space-y-5">

                {/* Metric toggle + heatmap */}
                <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-sm font-semibold text-white">Parameter Sweep Heatmap</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Entry top N (x) × Exit top N (y) · {params.holdingsN} holdings · {params.rebalanceMonthly ? 'Monthly' : 'Weekly'} rebalance
                        · Click any cell for full detail
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {METRIC_OPTIONS.map(m => (
                        <button key={m.key} onClick={() => setSweepMetric(m.key)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            sweepMetric === m.key
                              ? 'bg-purple-600 border-purple-500 text-white'
                              : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                          }`}>{m.label}</button>
                      ))}
                    </div>
                  </div>

                  <SweepHeatmap
                    cells={sweepCells}
                    metric={sweepMetric}
                    onCellClick={handleCellClickWithSync}
                    selectedCell={selectedCell}
                  />
                </div>

                {/* Summary table of all valid cells */}
                <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
                  <h2 className="text-sm font-semibold text-white mb-4">All Combinations — Ranked by CAGR</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-800">
                          {['Rank','Entry N','Exit N','CAGR','Sharpe','Sortino','Calmar','Max DD'].map(h => (
                            <th key={h} className={`py-2 text-xs font-semibold text-slate-400 uppercase ${h==='Rank'||h==='Entry N'||h==='Exit N'?'text-left pr-4':'text-right px-3'}`}>
                              <ColTip label={h === 'Entry N' ? 'Entry' : h === 'Exit N' ? 'Exit' : h} />
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...sweepCells]
                          .filter(c => c.entryTopN <= c.exitTopN)
                          .sort((a, b) => b.cagr - a.cagr)
                          .map((c, i) => {
                            const isSelected = selectedCell?.entryTopN === c.entryTopN && selectedCell?.exitTopN === c.exitTopN;
                            return (
                              <tr
                                key={`${c.entryTopN}-${c.exitTopN}`}
                                onClick={() => handleCellClickWithSync(c)}
                                className={`border-b border-slate-800/50 cursor-pointer transition-colors ${
                                  isSelected ? 'bg-purple-900/30 border-purple-800/50' : 'hover:bg-slate-800/30'
                                }`}
                              >
                                <td className="py-2 pr-4 font-semibold text-slate-400">{i + 1}</td>
                                <td className="py-2 pr-4 text-slate-300">{c.entryTopN}</td>
                                <td className="py-2 pr-4 text-slate-300">{c.exitTopN}</td>
                                <td className={`py-2 px-3 text-right font-bold ${c.cagr >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtPct(c.cagr)}</td>
                                <td className={`py-2 px-3 text-right ${c.sharpe >= 1 ? 'text-green-400' : 'text-slate-300'}`}>{fmt2(c.sharpe)}</td>
                                <td className={`py-2 px-3 text-right ${c.sortino >= 1 ? 'text-green-400' : 'text-slate-300'}`}>{fmt2(c.sortino)}</td>
                                <td className={`py-2 px-3 text-right ${c.calmar >= 1 ? 'text-green-400' : 'text-slate-300'}`}>{fmt2(c.calmar)}</td>
                                <td className="py-2 px-3 text-right text-red-400">-{fmtPctAbs(c.maxDD)}</td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Preset sweep heatmap */}
                <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h2 className="text-sm font-semibold text-white">Timeframe Weight Sweep</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Entry weights (x) × Exit weights (y) · Thresholds fixed at entry top{' '}
                        {selectedCell?.entryTopN ?? params.entryTopN} / exit top{' '}
                        {selectedCell?.exitTopN ?? params.exitTopN} · Click any cell for detail
                      </p>
                    </div>
                    <button
                      onClick={handlePresetSweep}
                      disabled={isPresetSweeping}
                      className={`px-5 py-2 rounded-xl font-semibold text-xs transition-all shadow-lg ${
                        isPresetSweeping
                          ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                          : 'bg-teal-600 hover:bg-teal-500 text-white'
                      }`}
                    >
                      {isPresetSweeping ? `⏳ ${presetProgress}%...` : '⚡ Run Weight Sweep'}
                    </button>
                  </div>

                  {isPresetSweeping && (
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-4">
                      <div className="h-full bg-teal-500 rounded-full transition-all duration-200"
                        style={{ width: `${presetProgress}%` }} />
                    </div>
                  )}

                  {presetCells ? (
                    <PresetHeatmap
                      cells={presetCells}
                      metric={sweepMetric}
                      onCellClick={handlePresetCellClick}
                      selectedCell={selectedPresetCell}
                    />
                  ) : (
                    !isPresetSweeping && (
                      <div className="h-32 flex items-center justify-center text-slate-500 text-sm">
                        Click "Run Weight Sweep" to test all 49 entry/exit weight combinations
                      </div>
                    )
                  )}
                </div>

                {/* Preset ranked table */}
                {presetCells && (
                  <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
                    <h2 className="text-sm font-semibold text-white mb-4">Weight Combinations — Ranked by CAGR</h2>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-800">
                            {['Rank','Entry','Exit','CAGR','Sharpe','Sortino','Calmar','Max DD'].map(h => (
                              <th key={h} className={`py-2 text-xs font-semibold text-slate-400 uppercase ${
                                ['Rank','Entry','Exit'].includes(h) ? 'text-left pr-4' : 'text-right px-3'
                              }`}><ColTip label={h} /></th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[...presetCells]
                            .sort((a, b) => b.cagr - a.cagr)
                            .map((c, i) => {
                              const isSelected = selectedPresetCell?.entryPreset === c.entryPreset && selectedPresetCell?.exitPreset === c.exitPreset;
                              return (
                                <tr
                                  key={`${c.entryPreset}-${c.exitPreset}`}
                                  onClick={() => handlePresetCellClick(c)}
                                  className={`border-b border-slate-800/50 cursor-pointer transition-colors ${
                                    isSelected ? 'bg-teal-900/30 border-teal-800/50' : 'hover:bg-slate-800/30'
                                  }`}
                                >
                                  <td className="py-2 pr-4 font-semibold text-slate-400">{i + 1}</td>
                                  <td className="py-2 pr-4 text-slate-300 font-medium">{c.entryPreset}</td>
                                  <td className="py-2 pr-4 text-slate-300 font-medium">{c.exitPreset}</td>
                                  <td className={`py-2 px-3 text-right font-bold ${c.cagr >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmtPct(c.cagr)}</td>
                                  <td className={`py-2 px-3 text-right ${c.sharpe  >= 1 ? 'text-green-400' : 'text-slate-300'}`}>{fmt2(c.sharpe)}</td>
                                  <td className={`py-2 px-3 text-right ${c.sortino >= 1 ? 'text-green-400' : 'text-slate-300'}`}>{fmt2(c.sortino)}</td>
                                  <td className={`py-2 px-3 text-right ${c.calmar  >= 1 ? 'text-green-400' : 'text-slate-300'}`}>{fmt2(c.calmar)}</td>
                                  <td className="py-2 px-3 text-right text-red-400">-{fmtPctAbs(c.maxDD)}</td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Preset detail panel */}
                {selectedPresetCell && presetDetail && (
                  <div className="space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-slate-800" />
                      <span className="text-xs text-slate-500 font-medium px-3">
                        Weight Detail: Entry "{selectedPresetCell.entryPreset}" / Exit "{selectedPresetCell.exitPreset}"
                        · Thresholds: entry top {selectedCell?.entryTopN ?? params.entryTopN} / exit top {selectedCell?.exitTopN ?? params.exitTopN}
                      </span>
                      <div className="h-px flex-1 bg-slate-800" />
                    </div>

                    <div className="grid grid-cols-4 gap-4 md:grid-cols-8">
                      {[
                        { label: 'Total Return', val: fmtPct(presetDetail.stats.totalReturn),          sub: `Benchmark: ${fmtPct(presetDetail.stats.benchmarkTotal)}`,     highlight: presetDetail.stats.totalReturn > presetDetail.stats.benchmarkTotal },
                        { label: 'CAGR',         val: fmtPct(presetDetail.stats.cagr),                 sub: `Benchmark: ${fmtPct(presetDetail.stats.benchmarkCAGR)}`,      highlight: presetDetail.stats.cagr > presetDetail.stats.benchmarkCAGR         },
                        { label: 'Max Drawdown', val: `-${fmtPctAbs(presetDetail.stats.maxDrawdown)}`, sub: `Benchmark: -${fmtPctAbs(presetDetail.stats.benchmarkMaxDD)}`, highlight: presetDetail.stats.maxDrawdown < presetDetail.stats.benchmarkMaxDD  },
                        { label: 'Sharpe',       val: fmt2(presetDetail.stats.sharpe),                 sub: 'Annualised',                                                  highlight: presetDetail.stats.sharpe  > 1                                     },
                        { label: 'Sortino',      val: fmt2(presetDetail.stats.sortino),                sub: 'Downside only',                                               highlight: presetDetail.stats.sortino > 1                                     },
                        { label: 'Calmar',       val: fmt2(presetDetail.stats.calmar),                 sub: 'CAGR / Max DD',                                               highlight: presetDetail.stats.calmar  > 1                                     },
                        { label: 'Win Rate',     val: fmtPctAbs(presetDetail.stats.winRate),           sub: '% positive weeks',                                            highlight: presetDetail.stats.winRate > 55                                    },
                        { label: 'Avg Hold',     val: `${fmt1(presetDetail.stats.avgHoldWeeks)}w`,     sub: `${presetDetail.stats.totalTrades} trades`,                    highlight: false                                                              },
                      ].map(s => <StatCard key={s.label} {...s} />)}
                    </div>

                    <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
                      <h2 className="text-sm font-semibold text-white mb-4">
                        Equity Curve — Entry "{selectedPresetCell.entryPreset}" / Exit "{selectedPresetCell.exitPreset}"
                      </h2>
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={presetDetail.equityCurve.filter((_, i) => i % Math.ceil(presetDetail.equityCurve.length / 260) === 0)} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }}
                            tickFormatter={d => d.substring(0, 7)}
                            interval={Math.floor(presetDetail.equityCurve.length / 260 / 8) || 8} />
                          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                          <RechartsTooltip content={<ChartTip />} />
                          <Legend formatter={v => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>} />
                          <ReferenceLine y={100} stroke="#334155" strokeDasharray="4 4" />
                          <Line type="monotone" dataKey="strategy" name="Strategy" stroke="#14b8a6" dot={false} strokeWidth={2} />
                          <Line type="monotone" dataKey="benchmark" name={`Benchmark (${params.benchmarkTicker})`}
                            stroke="#f59e0b" dot={false} strokeWidth={1.5} strokeDasharray="5 3" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Detail panel for selected threshold cell */}
                {selectedCell && sweepDetail && (
                  <div className="space-y-5">
                    <div className="flex items-center gap-3">
                      <div className="h-px flex-1 bg-slate-800" />
                      <span className="text-xs text-slate-500 font-medium px-3">
                        Detail: Entry top {selectedCell.entryTopN} · Exit outside top {selectedCell.exitTopN}
                      </span>
                      <div className="h-px flex-1 bg-slate-800" />
                    </div>

                    <div className="grid grid-cols-4 gap-4 md:grid-cols-8">
                      {[
                        { label: 'Total Return', val: fmtPct(sweepDetail.stats.totalReturn),          sub: `Benchmark: ${fmtPct(sweepDetail.stats.benchmarkTotal)}`,     highlight: sweepDetail.stats.totalReturn > sweepDetail.stats.benchmarkTotal },
                        { label: 'CAGR',         val: fmtPct(sweepDetail.stats.cagr),                 sub: `Benchmark: ${fmtPct(sweepDetail.stats.benchmarkCAGR)}`,      highlight: sweepDetail.stats.cagr > sweepDetail.stats.benchmarkCAGR         },
                        { label: 'Max Drawdown', val: `-${fmtPctAbs(sweepDetail.stats.maxDrawdown)}`, sub: `Benchmark: -${fmtPctAbs(sweepDetail.stats.benchmarkMaxDD)}`, highlight: sweepDetail.stats.maxDrawdown < sweepDetail.stats.benchmarkMaxDD  },
                        { label: 'Sharpe',       val: fmt2(sweepDetail.stats.sharpe),                 sub: 'Annualised',                                                  highlight: sweepDetail.stats.sharpe  > 1                                     },
                        { label: 'Sortino',      val: fmt2(sweepDetail.stats.sortino),                sub: 'Downside only',                                               highlight: sweepDetail.stats.sortino > 1                                     },
                        { label: 'Calmar',       val: fmt2(sweepDetail.stats.calmar),                 sub: 'CAGR / Max DD',                                               highlight: sweepDetail.stats.calmar  > 1                                     },
                        { label: 'Win Rate',     val: fmtPctAbs(sweepDetail.stats.winRate),           sub: '% positive weeks',                                            highlight: sweepDetail.stats.winRate > 55                                    },
                        { label: 'Avg Hold',     val: `${fmt1(sweepDetail.stats.avgHoldWeeks)}w`,     sub: `${sweepDetail.stats.totalTrades} trades`,                     highlight: false                                                             },
                      ].map(s => <StatCard key={s.label} {...s} />)}
                    </div>

                    <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
                      <h2 className="text-sm font-semibold text-white mb-4">
                        Equity Curve — Entry {selectedCell.entryTopN} / Exit {selectedCell.exitTopN}
                      </h2>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={sweepDetailChartData} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }}
                            tickFormatter={d => d.substring(0, 7)} interval={Math.floor(sweepDetailChartData.length / 8)} />
                          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                          <RechartsTooltip content={<ChartTip />} />
                          <Legend formatter={v => <span style={{ color: '#94a3b8', fontSize: 12 }}>{v}</span>} />
                          <ReferenceLine y={100} stroke="#334155" strokeDasharray="4 4" />
                          <Line type="monotone" dataKey="strategy" name="Strategy" stroke="#a855f7" dot={false} strokeWidth={2} />
                          <Line type="monotone" dataKey="benchmark" name={`Benchmark (${params.benchmarkTicker})`}
                            stroke="#f59e0b" dot={false} strokeWidth={1.5} strokeDasharray="5 3" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Annual returns for selected cell */}
                    <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
                      <h2 className="text-sm font-semibold text-white mb-4">
                        Annual Returns — Entry {selectedCell.entryTopN} / Exit {selectedCell.exitTopN}
                      </h2>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-800">
                              {['Year','Strategy','Benchmark','Alpha'].map(h => (
                                <th key={h} className={`py-2 text-xs font-semibold text-slate-400 uppercase ${h==='Year'?'text-left pr-4':'text-right px-4'}`}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sweepDetail.stats.yearlyReturns.map(row => {
                              const alpha = row.strategy - row.benchmark;
                              return (
                                <tr key={row.year} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                                  <td className="py-2 pr-4 font-semibold text-slate-300">{row.year}</td>
                                  <td className={`py-2 px-4 text-right font-bold ${row.strategy>=0?'text-green-400':'text-red-400'}`}>{fmtPct(row.strategy)}</td>
                                  <td className={`py-2 px-4 text-right ${row.benchmark>=0?'text-green-600':'text-red-600'}`}>{fmtPct(row.benchmark)}</td>
                                  <td className={`py-2 px-4 text-right font-semibold ${alpha>=0?'text-blue-400':'text-orange-400'}`}>{fmtPct(alpha)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* ── Stress test tab ────────────────── */}
            {activeTab === 'stress' && (
              <div className="space-y-5">

                {/* Run button + info */}
                <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h2 className="text-base font-semibold text-white">Sub-period Stress Test</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Runs the current strategy across up to {STRESS_PERIODS.length - 1} historical regimes.
                        Periods with less than 80% data coverage are silently skipped.
                        All current parameters and filters apply.
                      </p>
                    </div>
                    <button
                      onClick={handleStress}
                      disabled={isStressing}
                      className={`px-8 py-3 rounded-xl font-semibold text-sm transition-all shadow-lg shrink-0 ${
                        isStressing
                          ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                          : 'bg-orange-600 hover:bg-orange-500 text-white'
                      }`}
                    >
                      {isStressing ? '⏳ Running...' : '▶ Run Stress Test'}
                    </button>
                  </div>
                  {isStressing && (
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mt-3">
                      <div className="h-full bg-orange-500 rounded-full transition-all duration-300 w-full animate-pulse" />
                    </div>
                  )}
                </div>

                {stressResults && stressResults.length === 0 && (
                  <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 text-center text-slate-500 text-sm">
                    No periods had sufficient data coverage. Your dataset may be too short.
                  </div>
                )}

                {stressResults && stressResults.length > 0 && (
                  <>
                    {/* Summary comparison table */}
                    <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
                      <h2 className="text-sm font-semibold text-white mb-4">
                        Performance Across Regimes — {params.benchmarkTicker} benchmark
                      </h2>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-800">
                              <th className="py-2 text-left pr-3 text-slate-400 uppercase font-semibold text-xs w-40">Period</th>
                              {['Weeks','CAGR','Bmk CAGR','Alpha','Max DD','Bmk DD','Sharpe','Sortino','Calmar','Win %'].map(h => (
                                <th key={h} className="py-2 text-right px-2 text-slate-400 uppercase font-semibold text-xs">
                                  <ColTip label={h} />
                                </th>
                              ))}
                              <th className="py-2 text-right px-2 text-slate-400 uppercase font-semibold text-xs">Chart</th>
                            </tr>
                          </thead>
                          <tbody>
                            {stressResults.map(r => {
                              const isExpanded = stressExpanded === r.period.id;
                              const isFull     = r.period.id === 'full';
                              return (
                                <>
                                  <tr
                                    key={r.period.id}
                                    className={`border-b cursor-pointer transition-colors ${
                                      isFull
                                        ? 'border-slate-700 bg-slate-800/30 hover:bg-slate-800/50'
                                        : isExpanded
                                          ? 'border-orange-800/50 bg-orange-950/20'
                                          : 'border-slate-800/50 hover:bg-slate-800/30'
                                    }`}
                                    onClick={() => setStressExpanded(isExpanded ? null : r.period.id)}
                                  >
                                    <td className="py-2.5 pr-3">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-slate-500 text-xs">{isExpanded ? '▼' : '▶'}</span>
                                        <div>
                                          <p className={`font-semibold ${isFull ? 'text-slate-200' : 'text-slate-300'}`}>
                                            {r.period.label}
                                          </p>
                                          <p className="text-slate-600 text-[10px] leading-tight">{r.period.desc}</p>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="py-2.5 px-2 text-right text-slate-400">{r.weeks}</td>
                                    <td className={`py-2.5 px-2 text-right font-bold ${r.cagr >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                      {fmtPct(r.cagr)}
                                    </td>
                                    <td className={`py-2.5 px-2 text-right ${r.benchmarkCAGR >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                      {fmtPct(r.benchmarkCAGR)}
                                    </td>
                                    <td className={`py-2.5 px-2 text-right font-semibold ${r.alpha >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                                      {fmtPct(r.alpha)}
                                    </td>
                                    <td className="py-2.5 px-2 text-right text-red-400">-{fmtPctAbs(r.maxDrawdown)}</td>
                                    <td className="py-2.5 px-2 text-right text-red-700">-{fmtPctAbs(r.benchmarkMaxDD)}</td>
                                    <td className={`py-2.5 px-2 text-right ${r.sharpe  >= 1 ? 'text-green-400' : 'text-slate-300'}`}>{fmt2(r.sharpe)}</td>
                                    <td className={`py-2.5 px-2 text-right ${r.sortino >= 1 ? 'text-green-400' : 'text-slate-300'}`}>{fmt2(r.sortino)}</td>
                                    <td className={`py-2.5 px-2 text-right ${r.calmar  >= 1 ? 'text-green-400' : 'text-slate-300'}`}>{fmt2(r.calmar)}</td>
                                    <td className={`py-2.5 px-2 text-right ${r.winRate >= 55 ? 'text-green-400' : 'text-slate-300'}`}>{fmtPctAbs(r.winRate)}</td>
                                    <td className="py-2.5 px-2 text-right text-slate-500 text-[10px]">click</td>
                                  </tr>

                                  {/* Expanded equity curve row */}
                                  {isExpanded && (
                                    <tr key={`${r.period.id}-chart`} className="border-b border-orange-800/30 bg-orange-950/10">
                                      <td colSpan={12} className="px-4 py-4">
                                        <div className="flex items-center gap-3 mb-3">
                                          <h3 className="text-sm font-semibold text-orange-300">{r.period.label}</h3>
                                          <span className="text-xs text-slate-500">{r.period.desc}</span>
                                          <span className="text-xs text-slate-600">
                                            {r.equityCurve[0]?.date} → {r.equityCurve[r.equityCurve.length - 1]?.date}
                                          </span>
                                        </div>
                                        <ResponsiveContainer width="100%" height={220}>
                                          <LineChart
                                            data={r.equityCurve.filter((_, i) => i % Math.max(1, Math.ceil(r.equityCurve.length / 200)) === 0)}
                                            margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
                                          >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }}
                                              tickFormatter={d => d.substring(0, 7)}
                                              interval={Math.floor(r.equityCurve.length / 6)} />
                                            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                                            <RechartsTooltip content={<ChartTip />} />
                                            <Legend formatter={v => <span style={{ color: '#94a3b8', fontSize: 11 }}>{v}</span>} />
                                            <ReferenceLine y={100} stroke="#334155" strokeDasharray="4 4" />
                                            <Line type="monotone" dataKey="strategy" name="Strategy"
                                              stroke="#f97316" dot={false} strokeWidth={2} />
                                            <Line type="monotone" dataKey="benchmark"
                                              name={`${params.benchmarkTicker}`}
                                              stroke="#f59e0b" dot={false} strokeWidth={1.5} strokeDasharray="5 3" />
                                          </LineChart>
                                        </ResponsiveContainer>
                                      </td>
                                    </tr>
                                  )}
                                </>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-xs text-slate-600 mt-3">
                        Click any row to expand its equity curve. All curves normalised to 100 at period start.
                        Periods skipped where data covers less than 80% of the window.
                      </p>
                    </div>

                    {/* Regime scorecard — quick summary of best/worst */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {(() => {
                        const nonFull = stressResults.filter(r => r.period.id !== 'full');
                        const bestAlpha  = nonFull.reduce((a, b) => b.alpha  > a.alpha  ? b : a, nonFull[0]);
                        const worstAlpha = nonFull.reduce((a, b) => b.alpha  < a.alpha  ? b : a, nonFull[0]);
                        const bestDD     = nonFull.reduce((a, b) => b.maxDrawdown < a.maxDrawdown ? b : a, nonFull[0]);
                        const worstDD    = nonFull.reduce((a, b) => b.maxDrawdown > a.maxDrawdown ? b : a, nonFull[0]);
                        const full       = stressResults.find(r => r.period.id === 'full');
                        return [
                          { label: 'Best Alpha Period',   val: bestAlpha?.period.label  ?? '—', sub: bestAlpha  ? `+${bestAlpha.alpha.toFixed(1)}% vs benchmark`  : '', highlight: true  },
                          { label: 'Worst Alpha Period',  val: worstAlpha?.period.label ?? '—', sub: worstAlpha ? `${worstAlpha.alpha.toFixed(1)}% vs benchmark` : '', highlight: false },
                          { label: 'Lowest Drawdown',     val: bestDD?.period.label     ?? '—', sub: bestDD     ? `-${bestDD.maxDrawdown.toFixed(1)}%`              : '', highlight: true  },
                          { label: 'Highest Drawdown',    val: worstDD?.period.label    ?? '—', sub: worstDD    ? `-${worstDD.maxDrawdown.toFixed(1)}%`             : '', highlight: false },
                        ].map(s => (
                          <div key={s.label} className={`rounded-xl p-4 border ${s.highlight ? 'bg-green-950/40 border-green-800/50' : 'bg-red-950/20 border-red-900/30'}`}>
                            <p className="text-xs text-slate-400 mb-1">{s.label}</p>
                            <p className={`text-base font-bold ${s.highlight ? 'text-green-400' : 'text-red-400'}`}>{s.val}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{s.sub}</p>
                          </div>
                        ));
                      })()}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
