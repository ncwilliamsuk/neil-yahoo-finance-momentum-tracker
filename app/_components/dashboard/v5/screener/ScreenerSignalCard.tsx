'use client';

// app/_components/dashboard/v5/screener/ScreenerSignalCard.tsx
//
// Momentum Strategy Signal card for Tab 5.
// Reads already-calculated scores from etfsWithScores — no extra fetching.
// Reflects whatever weights/calculationMode/removeLatestMonth are set on the
// main screener controls. Card-specific controls: Top N, entry filters,
// regime filters, category cap.

import { useState, useMemo } from 'react';
import { ETFData }           from '@/lib/v5/etfTypes';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface Props {
  etfsWithScores:    ETFData[];          // full scored list from ScreenerTab
  soniaRate:         number | null;
  calculationMode:   'standard' | 'risk-adj';
  removeLatestMonth: boolean;
  weights:           { m3: number; m6: number; m12: number };
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function fmt(v: number | null | undefined, dp = 1): string {
  if (v == null) return '—';
  return (v >= 0 ? '+' : '') + v.toFixed(dp) + '%';
}

function retColor(v: number | null | undefined): string {
  if (v == null) return 'text-slate-400';
  if (v >= 5)  return 'text-emerald-600 font-semibold';
  if (v >= 0)  return 'text-emerald-500';
  if (v >= -5) return 'text-red-400';
  return 'text-red-600 font-semibold';
}

const TOP_N_OPTIONS = [3, 5, 10, 15];

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export function ScreenerSignalCard({
  etfsWithScores,
  soniaRate,
  calculationMode,
  removeLatestMonth,
  weights,
}: Props) {

  // ── Card-specific controls ───────────────────────────────────
  const [topN,            setTopN]            = useState(5);
  const [filterMaEntry,   setFilterMaEntry]   = useState(false);
  const [filterRsiEntry,  setFilterRsiEntry]  = useState(false);
  const [filterSwdaMA,    setFilterSwdaMA]    = useState(false);
  const [filterSwdaSonia, setFilterSwdaSonia] = useState(false);
  const [maxPerCat,       setMaxPerCat]       = useState(0);
  const [filtersOpen,     setFiltersOpen]     = useState(false);

  // ── Regime checks ────────────────────────────────────────────
  // Find SWDA in the scored list — ticker is 'SWDA.L'
  const swdaETF = useMemo(
    () => etfsWithScores.find(e => e.ticker === 'SWDA.L'),
    [etfsWithScores]
  );

  const regimeCash = useMemo(() => {
    if (filterSwdaMA && swdaETF?.above200MA === false) return {
      active: true,
      reason: `SWDA is below its 200-day MA (${swdaETF.returns?.['12M'] != null ? fmt(swdaETF.returns['12M']) : '—'} 12M). Market in downtrend.`,
    };
    if (filterSwdaSonia && swdaETF && soniaRate != null) {
      const swda12M = swdaETF.returns?.['12M'] ?? null;
      if (swda12M != null && swda12M < soniaRate) return {
        active: true,
        reason: `SWDA 12M return (${fmt(swda12M)}) is below SONIA (${soniaRate.toFixed(2)}%). Equities underperforming cash.`,
      };
    }
    return { active: false, reason: '' };
  }, [filterSwdaMA, filterSwdaSonia, swdaETF, soniaRate]);

  // ── Signal calculation ───────────────────────────────────────
  // Sort by score desc, apply entry filters, apply category cap (new entries only)
  const { holdings, watchlist } = useMemo(() => {
    if (regimeCash.active) return { holdings: [], watchlist: [] };

    // Sort by score descending — already calculated by ScreenerTab
    const ranked = [...etfsWithScores]
      .filter(e => e.score != null)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    const holdings: ETFData[]  = [];
    const watchlist: ETFData[] = [];
    const catCounts: Record<string, number> = {};

    for (const etf of ranked) {
      const inHoldings = holdings.length < topN;

      // Entry filters
      if (filterMaEntry  && etf.above200MA === false) { if (inHoldings) watchlist.push(etf); continue; }
      if (filterRsiEntry && etf.rsi != null && etf.rsi < 50) { if (inHoldings) watchlist.push(etf); continue; }

      // Category cap
      if (maxPerCat > 0) {
        const cat = etf.category ?? '__none__';
        const count = catCounts[cat] ?? 0;
        if (count >= maxPerCat) { if (inHoldings) watchlist.push(etf); continue; }
        catCounts[cat] = count + 1;
      }

      if (holdings.length < topN) {
        holdings.push(etf);
      } else if (watchlist.length < 5) {
        watchlist.push(etf);
      } else {
        break;
      }
    }

    return { holdings, watchlist };
  }, [etfsWithScores, topN, filterMaEntry, filterRsiEntry, maxPerCat, regimeCash.active]);

  // ── Active filter count ──────────────────────────────────────
  const activeFilterCount = [filterMaEntry, filterRsiEntry, filterSwdaMA, filterSwdaSonia, maxPerCat > 0]
    .filter(Boolean).length;

  // ── Mode summary text ────────────────────────────────────────
  const modeSummary = [
    calculationMode === 'risk-adj' ? 'Risk-Adjusted' : 'Raw Return',
    removeLatestMonth ? 'Skip Last Month' : null,
    `${weights.m3}/${weights.m6}/${weights.m12} (3M/6M/12M)`,
  ].filter(Boolean).join(' · ');

  // ── Last updated ─────────────────────────────────────────────
  const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <span className="text-lg">🎯</span>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Momentum Strategy Signal</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live signal based on current screener rankings · {modeSummary}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Updated {now}</span>
          <a href="/data-export" target="_blank"
            className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors">
            🔗 Export
          </a>
          <a href="/backtest" target="_blank"
            className="px-3 py-1.5 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors">
            🔗 Backtest
          </a>
        </div>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-4 px-5 py-3 bg-slate-50 border-b border-slate-100 flex-wrap">

        {/* Top N */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Top N</span>
          <div className="flex gap-1">
            {TOP_N_OPTIONS.map(n => (
              <button key={n} onClick={() => setTopN(n)}
                className={`w-8 h-7 rounded text-xs font-semibold transition-colors ${
                  topN === n
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300'
                }`}
              >{n}</button>
            ))}
          </div>
        </div>

        <div className="h-5 w-px bg-slate-200" />

        {/* Filters toggle */}
        <button
          onClick={() => setFiltersOpen(o => !o)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            activeFilterCount > 0
              ? 'bg-amber-50 border-amber-300 text-amber-700'
              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
          }`}
        >
          ⚙️ Filters
          {activeFilterCount > 0 && (
            <span className="bg-amber-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold">
              {activeFilterCount}
            </span>
          )}
          <span className="ml-0.5">{filtersOpen ? '▲' : '▼'}</span>
        </button>

      </div>

      {/* Filters panel — expandable */}
      {filtersOpen && (
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-3 flex-wrap">

            {/* Entry filters */}
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Entry</span>
            {[
              { label: '📈 > 200MA',  active: filterMaEntry,   set: setFilterMaEntry,   tip: 'Only include ETFs trading above their 200-day moving average' },
              { label: '〰️ RSI > 50', active: filterRsiEntry,  set: setFilterRsiEntry,  tip: 'Only include ETFs with RSI above 50 (positive momentum)' },
            ].map(({ label, active, set, tip }) => (
              <button key={label} onClick={() => set(!active)} title={tip}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  active
                    ? 'bg-emerald-100 border-emerald-400 text-emerald-700'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-emerald-300'
                }`}
              >
                {label} <span className="ml-1 font-bold">{active ? 'ON' : 'OFF'}</span>
              </button>
            ))}

            <div className="h-5 w-px bg-slate-200" />

            {/* Regime filters */}
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Regime</span>
            {[
              { label: '🌍 SWDA > 200MA',    active: filterSwdaMA,    set: setFilterSwdaMA,    tip: 'Go 100% cash if SWDA (MSCI World) is below its 200-day MA' },
              { label: '💷 SWDA > SONIA',    active: filterSwdaSonia, set: setFilterSwdaSonia, tip: `Go 100% cash if SWDA 12M return is below SONIA rate (${soniaRate?.toFixed(2) ?? '—'}%)` },
            ].map(({ label, active, set, tip }) => (
              <button key={label} onClick={() => set(!active)} title={tip}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  active
                    ? 'bg-amber-100 border-amber-400 text-amber-700'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-amber-300'
                }`}
              >
                {label} <span className="ml-1 font-bold">{active ? 'ON' : 'OFF'}</span>
              </button>
            ))}

            <div className="h-5 w-px bg-slate-200" />

            {/* Max per category */}
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Max/Cat</span>
            <div className="flex items-center gap-2">
              {[0, 1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setMaxPerCat(n)}
                  className={`w-8 h-7 rounded text-xs font-semibold transition-colors ${
                    maxPerCat === n
                      ? 'bg-slate-700 text-white'
                      : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-400'
                  }`}
                >{n === 0 ? 'Off' : n}</button>
              ))}
            </div>

          </div>
        </div>
      )}

      {/* Regime warning */}
      {regimeCash.active && (
        <div className="mx-5 mt-4 mb-1 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-xl mt-0.5">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-amber-800">Regime filter active — strategy is 100% cash</p>
            <p className="text-xs text-amber-700 mt-0.5">{regimeCash.reason}</p>
          </div>
        </div>
      )}

      {/* Signal table */}
      {!regimeCash.active && (
        <div className="px-5 pb-5 pt-4">

          {/* Holdings header */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Current Signal — {holdings.length} holding{holdings.length !== 1 ? 's' : ''}
            </p>
          </div>

          {holdings.length === 0 ? (
            <p className="text-sm text-slate-400 py-4 text-center">
              No ETFs pass the current filters. Try relaxing entry conditions.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 px-2 text-xs font-semibold text-slate-400 w-8">#</th>
                    <th className="text-left py-2 px-2 text-xs font-semibold text-slate-400 w-16">Ticker</th>
                    <th className="text-left py-2 px-2 text-xs font-semibold text-slate-400">Name</th>
                    <th className="text-left py-2 px-2 text-xs font-semibold text-slate-400">Category</th>
                    <th className="text-right py-2 px-2 text-xs font-semibold text-slate-400 w-16">Price</th>
                    <th className="text-right py-2 px-2 text-xs font-semibold text-slate-400 w-12">TER%</th>
                    <th className="text-right py-2 px-2 text-xs font-semibold text-slate-400 w-16">1M</th>
                    <th className="text-right py-2 px-2 text-xs font-semibold text-slate-400 w-16">3M</th>
                    <th className="text-right py-2 px-2 text-xs font-semibold text-slate-400 w-16">6M</th>
                    <th className="text-right py-2 px-2 text-xs font-semibold text-slate-400 w-16">12M</th>
                    <th className="text-center py-2 px-2 text-xs font-semibold text-slate-400 w-10">MA</th>
                    <th className="text-right py-2 px-2 text-xs font-semibold text-slate-400 w-16">Sharpe</th>
                    <th className="text-right py-2 px-2 text-xs font-semibold text-slate-400 w-12">RSI</th>
                    <th className="text-right py-2 px-2 text-xs font-semibold text-slate-400 w-16">Liq</th>
                    <th className="text-right py-2 px-2 text-xs font-semibold text-slate-400 w-16">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((etf, i) => (
                    <tr key={etf.ticker}
                      className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                        i === 0 ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <td className="py-2.5 px-2 text-xs font-bold text-slate-400">{i + 1}</td>
                      <td className="py-2.5 px-2 text-xs font-bold text-slate-700 font-mono">
                        {etf.ticker.replace('.L', '')}
                      </td>
                      <td className="py-2.5 px-2 text-sm font-medium text-slate-800 whitespace-nowrap">
                        {etf.shortName}
                      </td>
                      <td className="py-2.5 px-2 text-xs text-slate-500 whitespace-nowrap">
                        {etf.category}
                      </td>
                      <td className="py-2.5 px-2 text-right text-xs text-slate-600">
                        {etf.price != null ? `£${etf.price.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-2.5 px-2 text-right text-xs text-slate-500">
                        {etf.ter != null ? etf.ter.toFixed(2) : '—'}
                      </td>
                      {(['1M','3M','6M','12M'] as const).map(p => (
                        <td key={p} className={`py-2.5 px-2 text-right text-xs ${retColor(etf.returns?.[p])}`}>
                          {fmt(etf.returns?.[p])}
                        </td>
                      ))}
                      <td className="py-2.5 px-2 text-center text-xs">
                        {etf.above200MA === true  && <span className="text-emerald-500" title="Above 200MA">▲</span>}
                        {etf.above200MA === false && <span className="text-red-400"     title="Below 200MA">▼</span>}
                        {etf.above200MA == null   && <span className="text-slate-300">—</span>}
                      </td>
                      <td className={`py-2.5 px-2 text-right text-xs font-medium ${
                        etf.sharpeRatios?.['12M'] == null ? 'text-slate-300' :
                        etf.sharpeRatios['12M'] >= 1      ? 'text-emerald-600' :
                        etf.sharpeRatios['12M'] >= 0      ? 'text-slate-600'   :
                                                             'text-red-400'
                      }`}>
                        {etf.sharpeRatios?.['12M'] != null ? etf.sharpeRatios['12M'].toFixed(2) : '—'}
                      </td>
                      <td className={`py-2.5 px-2 text-right text-xs font-medium ${
                        etf.rsi == null  ? 'text-slate-300'   :
                        etf.rsi > 70     ? 'text-red-500'     :
                        etf.rsi < 30     ? 'text-emerald-500' :
                                           'text-slate-600'
                      }`}>
                        {etf.rsi?.toFixed(0) ?? '—'}
                      </td>
                      <td className="py-2.5 px-2 text-right text-xs text-slate-500">
                        {etf.liquidity ?? '—'}
                      </td>
                      <td className="py-2.5 px-2 text-right text-sm font-bold text-blue-600">
                        {etf.score?.toFixed(1) ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Watchlist */}
          {watchlist.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide mr-2">
                Watchlist
              </span>
              {watchlist.slice(0, 5).map((etf, i) => (
                <span key={etf.ticker} className="text-xs text-slate-500">
                  {etf.shortName}
                  <span className="text-slate-400"> ({etf.ticker.replace('.L', '')})</span>
                  {i < Math.min(watchlist.length, 5) - 1 && <span className="mx-1.5 text-slate-300">·</span>}
                </span>
              ))}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
