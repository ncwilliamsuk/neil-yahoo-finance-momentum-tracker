'use client';

// app/_components/dashboard/v5/screener/ScreenerMainTable.tsx
// Sortable ETF rankings table.
// V5 additions vs V4:
//   - Sharpe 12M column (sortable, colour-coded)
//   - above200MA indicator on price cell
//   - full name tooltip on short name cell

import { useState }                         from 'react';
import { ETFData }                          from '@/lib/v5/etfTypes';
import { formatPercent, formatSharpe, parseLiquidity } from '@/lib/v5/etfCalculations';

interface ScreenerMainTableProps {
  etfs:             ETFData[];
  allETFs:          ETFData[];   // full unfiltered list — used for fixed rank calculation
  onSelectionChange:(selected: Set<string>) => void;
  selectedETFs:     Set<string>;
}

type SortColumn =
  | 'rank' | 'shortName' | 'category' | 'price' | 'ter'
  | 'return1M' | 'return3M' | 'return6M' | 'return12M'
  | 'sharpe12M' | 'label' | 'rsi' | 'liquidity' | 'score';

type SortDirection = 'asc' | 'desc';

export function ScreenerMainTable({
  etfs,
  allETFs,
  onSelectionChange,
  selectedETFs,
}: ScreenerMainTableProps) {
  const [sortColumn,    setSortColumn]    = useState<SortColumn>('score');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // ── Fixed momentum ranks across full universe ────────────────
  const rankMap = new Map<string, number>();
  [...allETFs]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .forEach((etf, i) => rankMap.set(etf.ticker, i + 1));

  // ── Sort handling ────────────────────────────────────────────
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection(column === 'rank' ? 'asc' : 'desc');
    }
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return <span className="text-slate-300 ml-0.5">↕</span>;
    return sortDirection === 'asc'
      ? <span className="text-blue-500 ml-0.5">↑</span>
      : <span className="text-blue-500 ml-0.5">↓</span>;
  };

  // ── Apply sort ───────────────────────────────────────────────
  const sortedETFs = [...etfs]
    .map(etf => ({ ...etf, momentumRank: rankMap.get(etf.ticker) ?? 999 }))
    .sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortColumn) {
        case 'rank':       aVal = a.momentumRank;                   bVal = b.momentumRank;                   break;
        case 'shortName':  aVal = a.shortName;                      bVal = b.shortName;                      break;
        case 'category':   aVal = a.category;                       bVal = b.category;                       break;
        case 'price':      aVal = a.price ?? 0;                     bVal = b.price ?? 0;                     break;
        case 'ter':        aVal = a.ter;                            bVal = b.ter;                            break;
        case 'return1M':   aVal = a.returns?.['1M']  ?? -Infinity;  bVal = b.returns?.['1M']  ?? -Infinity;  break;
        case 'return3M':   aVal = a.returns?.['3M']  ?? -Infinity;  bVal = b.returns?.['3M']  ?? -Infinity;  break;
        case 'return6M':   aVal = a.returns?.['6M']  ?? -Infinity;  bVal = b.returns?.['6M']  ?? -Infinity;  break;
        case 'return12M':  aVal = a.returns?.['12M'] ?? -Infinity;  bVal = b.returns?.['12M'] ?? -Infinity;  break;
        case 'sharpe12M':  aVal = a.sharpeRatios?.['12M'] ?? -Infinity; bVal = b.sharpeRatios?.['12M'] ?? -Infinity; break;
        case 'label':      aVal = a.label ?? '';                    bVal = b.label ?? '';                    break;
        case 'rsi':        aVal = a.rsi ?? 0;                       bVal = b.rsi ?? 0;                       break;
        case 'liquidity':  aVal = parseLiquidity(a.liquidity);      bVal = parseLiquidity(b.liquidity);      break;
        case 'score':
        default:           aVal = a.score ?? 0;                     bVal = b.score ?? 0;
      }

      if (typeof aVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      }
      return sortDirection === 'asc' ? (aVal - (bVal as number)) : ((bVal as number) - aVal);
    });

  // ── Checkbox ─────────────────────────────────────────────────
  const handleCheckboxChange = (ticker: string, checked: boolean) => {
    const next = new Set(selectedETFs);
    checked ? next.add(ticker) : next.delete(ticker);
    onSelectionChange(next);
  };

  // ── Column header helper ─────────────────────────────────────
  const Th = ({
    col, label, title, className = '',
  }: { col: SortColumn; label: string; title?: string; className?: string }) => (
    <th
      onClick={() => handleSort(col)}
      title={title}
      className={`text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-blue-600 transition-colors select-none whitespace-nowrap ${className}`}
    >
      {label}{getSortIcon(col)}
    </th>
  );

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-slate-900">
          ETF Rankings
        </h2>
        <span className="text-xs text-slate-400">
          {sortedETFs.length} ETF{sortedETFs.length !== 1 ? 's' : ''} shown
          {sortedETFs.length < allETFs.length && ` (${allETFs.length} total)`}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <Th col="rank"      label="Rank"     title="Overall momentum rank across full universe" />
              <th className="py-3 px-3 w-8">
                {/* Checkbox select-all */}
                <input
                  type="checkbox"
                  className="w-4 h-4 cursor-pointer"
                  checked={sortedETFs.length > 0 && sortedETFs.every(e => selectedETFs.has(e.ticker))}
                  onChange={e => {
                    const next = new Set(selectedETFs);
                    sortedETFs.forEach(etf => e.target.checked ? next.add(etf.ticker) : next.delete(etf.ticker));
                    onSelectionChange(next);
                  }}
                  title="Select / deselect all visible ETFs"
                />
              </th>
              <Th col="shortName"  label="Name"      title="Short name — hover for full name and ticker" />
              <Th col="category"   label="Category"  />
              <Th col="price"      label="Price (£)" title="Latest closing price in GBP" />
              <Th col="ter"        label="TER%"      title="Total Expense Ratio — annual fund cost %" />
              <Th col="return1M"   label="1M%"       title="1-month price return" />
              <Th col="return3M"   label="3M%"       title="3-month price return" />
              <Th col="return6M"   label="6M%"       title="6-month price return" />
              <Th col="return12M"  label="12M%"      title="12-month price return" />
              <Th col="sharpe12M"  label="Sharpe"    title="12-month Sharpe ratio: (12M return − SONIA) ÷ annualised volatility. Higher = better risk-adjusted return." />
              <Th col="label"      label="Label"     title="Momentum classification based on 1M, 3M and 12M return thresholds" />
              <Th col="rsi"        label="RSI"       title="14-day Relative Strength Index. Below 30 = oversold (green), above 70 = overbought (red)." />
              <Th col="liquidity"  label="Liq"       title="Average 30-day trading volume" />
              <Th col="score"      label="Score"     title="Composite momentum score (0–100) based on weighted percentile ranking" />
            </tr>
          </thead>
          <tbody>
            {sortedETFs.map(etf => (
              <tr
                key={etf.ticker}
                className={`border-b border-slate-100 transition-colors ${
                  selectedETFs.has(etf.ticker)
                    ? 'bg-orange-50 hover:bg-orange-100'
                    : 'hover:bg-slate-50'
                }`}
              >
                {/* Rank */}
                <td className="py-2.5 px-3 text-sm font-semibold text-slate-400">
                  #{etf.momentumRank}
                </td>

                {/* Checkbox */}
                <td className="py-2.5 px-3">
                  <input
                    type="checkbox"
                    checked={selectedETFs.has(etf.ticker)}
                    onChange={e => handleCheckboxChange(etf.ticker, e.target.checked)}
                    className="w-4 h-4 cursor-pointer"
                  />
                </td>

                {/* Name */}
                <td
                  className="py-2.5 px-3 text-sm font-semibold text-blue-600 whitespace-nowrap"
                  title={`${etf.ticker.replace('.L', '')} · ${etf.fullName}${etf.currencyNote ? ` · ${etf.currencyNote} listed` : ''}${etf.currencyNormalized ? ' · ⚠️ Currency normalised' : ''}`}
                >
                  {etf.shortName}
                  {etf.currencyNote === 'USD' && (
                    <span className="ml-1.5 text-[10px] font-bold text-slate-400 bg-slate-100 rounded px-1 py-0.5" title="US-listed ETF — no LSE equivalent available. Returns calculated in USD.">$</span>
                  )}
                  {etf.currencyNote === 'LSE-ETP' && (
                    <span className="ml-1.5 text-[10px] font-bold text-purple-500 bg-purple-50 rounded px-1 py-0.5" title="LSE-listed ETP (not a fund) — trades in GBP but structured differently">ETP</span>
                  )}
                  {etf.currencyNormalized && (
                    <span className="ml-1.5 text-xs text-orange-500" title="GBX↔GBP normalisation applied — verify data">⚠️</span>
                  )}
                </td>

                {/* Category */}
                <td className="py-2.5 px-3 text-sm text-slate-600 whitespace-nowrap">
                  {etf.category}
                </td>

                {/* Price + 200MA indicator */}
                <td className="py-2.5 px-3 text-sm text-slate-700 whitespace-nowrap">
                  {etf.price != null ? (
                    <span
                      title={
                        etf.above200MA === true  ? 'Trading above 200-day moving average' :
                        etf.above200MA === false ? 'Trading below 200-day moving average' :
                        'Insufficient data for 200-day MA'
                      }
                    >
                      {etf.above200MA === true  && <span className="mr-1 text-green-500 text-xs">▲</span>}
                      {etf.above200MA === false && <span className="mr-1 text-red-500   text-xs">▼</span>}
                      £{etf.price.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-slate-400">N/A</span>
                  )}
                </td>

                {/* TER */}
                <td className="py-2.5 px-3 text-sm text-slate-600">
                  {etf.ter.toFixed(2)}%
                </td>

                {/* Returns */}
                {(['1M', '3M', '6M', '12M'] as const).map(period => (
                  <td
                    key={period}
                    className={`py-2.5 px-3 text-sm font-semibold ${getReturnColor(etf.returns?.[period])}`}
                  >
                    {formatPercent(etf.returns?.[period] ?? null)}
                  </td>
                ))}

                {/* Sharpe 12M */}
                <td
                  className={`py-2.5 px-3 text-sm font-semibold ${getSharpeColor(etf.sharpeRatios?.['12M'])}`}
                  title={etf.sharpeRatios?.['12M'] != null
                    ? `12M Sharpe: ${etf.sharpeRatios['12M'].toFixed(3)}`
                    : 'Insufficient data for Sharpe calculation'}
                >
                  {formatSharpe(etf.sharpeRatios?.['12M'] ?? null)}
                </td>

                {/* Label */}
                <td className="py-2.5 px-3">
                  {etf.label ? (
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold uppercase ${getLabelColor(etf.label)}`}>
                      {etf.label}
                    </span>
                  ) : (
                    <span className="text-slate-300 text-xs">—</span>
                  )}
                </td>

                {/* RSI */}
                <td
                  className={`py-2.5 px-3 text-sm font-semibold ${getRSIColor(etf.rsi)}`}
                  title={
                    etf.rsi == null ? 'Insufficient data' :
                    etf.rsi < 30    ? 'Oversold (< 30)' :
                    etf.rsi > 70    ? 'Overbought (> 70)' :
                    'Neutral (30–70)'
                  }
                >
                  {etf.rsi ?? <span className="text-slate-300">N/A</span>}
                </td>

                {/* Liquidity */}
                <td className="py-2.5 px-3 text-sm text-slate-600">
                  {etf.liquidity}
                </td>

                {/* Score */}
                <td className="py-2.5 px-3 text-sm font-bold text-blue-600">
                  {etf.score?.toFixed(1) ?? '0.0'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedETFs.length === 0 && (
        <div className="text-center py-12 text-slate-400 text-sm">
          No ETFs match the current filters
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Colour helpers
// ─────────────────────────────────────────────────────────────

function getReturnColor(value: number | null | undefined): string {
  if (value == null) return 'text-slate-300';
  if (value >= 5)    return 'text-green-600';
  if (value > 0)     return 'text-green-500';
  if (value > -5)    return 'text-red-500';
  return                    'text-red-600';
}

function getSharpeColor(value: number | null | undefined): string {
  if (value == null) return 'text-slate-300';
  if (value >= 1)    return 'text-green-600';
  if (value >= 0)    return 'text-green-500';
  if (value >= -0.5) return 'text-red-500';
  return                    'text-red-600';
}

function getLabelColor(label: string): string {
  const map: Record<string, string> = {
    LEADER:     'bg-green-500  text-white',
    EMERGING:   'bg-blue-500   text-white',
    RECOVERING: 'bg-yellow-500 text-slate-900',
    FADING:     'bg-orange-500 text-white',
    LAGGARD:    'bg-red-500    text-white',
  };
  return map[label] ?? 'bg-slate-200 text-slate-700';
}

function getRSIColor(value: number | null | undefined): string {
  if (value == null) return 'text-slate-300';
  if (value < 30)    return 'text-green-600';  // oversold
  if (value > 70)    return 'text-red-600';    // overbought
  return                    'text-slate-700';
}
