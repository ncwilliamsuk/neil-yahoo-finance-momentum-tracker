// app/_components/dashboard/MainTable.tsx

'use client';

import { ETFData } from '@/lib/etf/types';
import { formatPercent } from '@/lib/etf/calculations';
import { useState } from 'react';

interface MainTableProps {
  etfs: ETFData[];
  allETFs: ETFData[];
  onSelectionChange: (selected: Set<string>) => void;
  selectedETFs: Set<string>;
}

type SortColumn = 
  | 'rank'
  | 'shortName' 
  | 'category' 
  | 'price' 
  | 'ter' 
  | 'return1M' 
  | 'return3M' 
  | 'return6M' 
  | 'return12M' 
  | 'label' 
  | 'rsi' 
  | 'liquidity' 
  | 'score';

type SortDirection = 'asc' | 'desc';

export function MainTable({ etfs, allETFs, onSelectionChange, selectedETFs }: MainTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('score');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection(column === 'rank' ? 'asc' : 'desc');
    }
  };

  const handleCheckboxChange = (ticker: string, checked: boolean) => {
    const newSelected = new Set(selectedETFs);
    if (checked) {
      newSelected.add(ticker);
    } else {
      newSelected.delete(ticker);
    }
    onSelectionChange(newSelected);
  };

  // Calculate fixed momentum ranks for ALL ETFs
  const rankedAllETFs = [...allETFs].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  const rankMap = new Map<string, number>();
  rankedAllETFs.forEach((etf, index) => {
    rankMap.set(etf.ticker, index + 1);
  });

  // Add rank to filtered ETFs
  const etfsWithRank = etfs.map(etf => ({
    ...etf,
    momentumRank: rankMap.get(etf.ticker) ?? 999
  }));

  // Sort ETFs
  const sortedETFs = [...etfsWithRank].sort((a, b) => {
    let aVal: any;
    let bVal: any;

    switch (sortColumn) {
      case 'rank':
        aVal = a.momentumRank;
        bVal = b.momentumRank;
        break;
      case 'shortName':
        aVal = a.shortName;
        bVal = b.shortName;
        break;
      case 'category':
        aVal = a.category;
        bVal = b.category;
        break;
      case 'price':
        aVal = a.price ?? 0;
        bVal = b.price ?? 0;
        break;
      case 'ter':
        aVal = a.ter;
        bVal = b.ter;
        break;
      case 'return1M':
        aVal = a.returns?.['1M'] ?? -Infinity;
        bVal = b.returns?.['1M'] ?? -Infinity;
        break;
      case 'return3M':
        aVal = a.returns?.['3M'] ?? -Infinity;
        bVal = b.returns?.['3M'] ?? -Infinity;
        break;
      case 'return6M':
        aVal = a.returns?.['6M'] ?? -Infinity;
        bVal = b.returns?.['6M'] ?? -Infinity;
        break;
      case 'return12M':
        aVal = a.returns?.['12M'] ?? -Infinity;
        bVal = b.returns?.['12M'] ?? -Infinity;
        break;
      case 'label':
        aVal = a.label || '';
        bVal = b.label || '';
        break;
      case 'rsi':
        aVal = a.rsi ?? 0;
        bVal = b.rsi ?? 0;
        break;
      case 'liquidity':
        aVal = parseLiquidityForSort(a.liquidity);
        bVal = parseLiquidityForSort(b.liquidity);
        break;
      case 'score':
      default:
        aVal = a.score ?? 0;
        bVal = b.score ?? 0;
    }

    if (typeof aVal === 'string') {
      return sortDirection === 'asc' 
        ? aVal.localeCompare(bVal) 
        : bVal.localeCompare(aVal);
    }

    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
  });

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return '';
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm mb-5">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">
        ETF Rankings
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th 
                onClick={() => handleSort('rank')}
                className="text-left py-3 px-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-blue-600 transition-colors"
              >
                RANK{getSortIcon('rank')}
              </th>
              <th className="text-left py-3 px-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide w-10">
                ☆
              </th>
              <th 
                onClick={() => handleSort('shortName')}
                className="text-left py-3 px-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-blue-600 transition-colors"
              >
                SHORT NAME{getSortIcon('shortName')}
              </th>
              <th 
                onClick={() => handleSort('category')}
                className="text-left py-3 px-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-blue-600 transition-colors"
              >
                CATEGORY{getSortIcon('category')}
              </th>
              <th 
                onClick={() => handleSort('price')}
                className="text-left py-3 px-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-blue-600 transition-colors"
              >
                PRICE (£){getSortIcon('price')}
              </th>
              <th 
                onClick={() => handleSort('ter')}
                className="text-left py-3 px-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-blue-600 transition-colors"
              >
                TER%{getSortIcon('ter')}
              </th>
              <th 
                onClick={() => handleSort('return1M')}
                className="text-left py-3 px-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-blue-600 transition-colors"
              >
                1M%{getSortIcon('return1M')}
              </th>
              <th 
                onClick={() => handleSort('return3M')}
                className="text-left py-3 px-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-blue-600 transition-colors"
              >
                3M%{getSortIcon('return3M')}
              </th>
              <th 
                onClick={() => handleSort('return6M')}
                className="text-left py-3 px-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-blue-600 transition-colors"
              >
                6M%{getSortIcon('return6M')}
              </th>
              <th 
                onClick={() => handleSort('return12M')}
                className="text-left py-3 px-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-blue-600 transition-colors"
              >
                12M%{getSortIcon('return12M')}
              </th>
              <th 
                onClick={() => handleSort('label')}
                className="text-left py-3 px-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-blue-600 transition-colors"
              >
                LABEL{getSortIcon('label')}
              </th>
              <th 
                onClick={() => handleSort('rsi')}
                className="text-left py-3 px-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-blue-600 transition-colors"
              >
                RSI{getSortIcon('rsi')}
              </th>
              <th 
                onClick={() => handleSort('liquidity')}
                className="text-left py-3 px-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-blue-600 transition-colors"
              >
                LIQ{getSortIcon('liquidity')}
              </th>
              <th 
                onClick={() => handleSort('score')}
                className="text-left py-3 px-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-blue-600 transition-colors"
              >
                SCORE{getSortIcon('score')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedETFs.map((etf) => (
              <tr 
                key={etf.ticker}
                className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
              >
                <td className="py-3 px-3.5 text-sm font-semibold text-slate-500">
                  #{etf.momentumRank}
                </td>
                <td className="py-3 px-3.5">
                  <input
                    type="checkbox"
                    checked={selectedETFs.has(etf.ticker)}
                    onChange={(e) => handleCheckboxChange(etf.ticker, e.target.checked)}
                    className="w-4 h-4 cursor-pointer"
                  />
                </td>
                <td 
                  className="py-3 px-3.5 text-sm font-semibold text-blue-600 cursor-pointer hover:underline"
                  title={`${etf.ticker} | ${etf.fullName}${etf.currencyNormalized ? ' | ⚠️ Currency normalized' : ''}`}
                >
                  {etf.shortName}
                  {etf.currencyNormalized && (
                    <span 
                      className="ml-2 text-xs text-orange-600 font-bold"
                      title="Currency unit was normalized (GBX↔GBP). Verify data accuracy."
                    >
                      ⚠️
                    </span>
                  )}
                </td>
                <td className="py-3 px-3.5 text-sm text-slate-700">
                  {etf.category}
                </td>
                <td className="py-3 px-3.5 text-sm text-slate-700">
                  {etf.price ? `£${etf.price.toFixed(2)}` : 'N/A'}
                </td>
                <td className="py-3 px-3.5 text-sm text-slate-700">
                  {etf.ter.toFixed(2)}%
                </td>
                <td className={`py-3 px-3.5 text-sm font-semibold ${getReturnColorClass(etf.returns?.['1M'])}`}>
                  {formatPercent(etf.returns?.['1M'] ?? null)}
                </td>
                <td className={`py-3 px-3.5 text-sm font-semibold ${getReturnColorClass(etf.returns?.['3M'])}`}>
                  {formatPercent(etf.returns?.['3M'] ?? null)}
                </td>
                <td className={`py-3 px-3.5 text-sm font-semibold ${getReturnColorClass(etf.returns?.['6M'])}`}>
                  {formatPercent(etf.returns?.['6M'] ?? null)}
                </td>
                <td className={`py-3 px-3.5 text-sm font-semibold ${getReturnColorClass(etf.returns?.['12M'])}`}>
                  {formatPercent(etf.returns?.['12M'] ?? null)}
                </td>
                <td className="py-3 px-3.5 text-sm">
                  {etf.label && (
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold uppercase ${getLabelColorClass(etf.label)}`}>
                      {etf.label}
                    </span>
                  )}
                </td>
                <td className={`py-3 px-3.5 text-sm font-semibold ${getRSIColorClass(etf.rsi)}`}>
                  {etf.rsi ?? 'N/A'}
                </td>
                <td className="py-3 px-3.5 text-sm text-slate-700">
                  {etf.liquidity}
                </td>
                <td className="py-3 px-3.5 text-sm font-bold text-blue-600">
                  {etf.score?.toFixed(1) ?? '0.0'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedETFs.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          No ETFs match the current filters
        </div>
      )}
    </div>
  );
}

// Helper functions
function getReturnColorClass(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'text-slate-400';
  return value >= 0 ? 'text-green-600' : 'text-red-600';
}

function getLabelColorClass(label: string): string {
  const colors = {
    LEADER: 'bg-green-500 text-white',
    EMERGING: 'bg-blue-500 text-white',
    RECOVERING: 'bg-yellow-500 text-slate-900',
    FADING: 'bg-orange-500 text-white',
    LAGGARD: 'bg-red-500 text-white'
  };
  return colors[label as keyof typeof colors] || 'bg-slate-200 text-slate-700';
}

function getRSIColorClass(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'text-slate-400';
  if (value < 30) return 'text-green-600'; // Oversold
  if (value > 70) return 'text-red-600';   // Overbought
  return 'text-slate-700';
}

function parseLiquidityForSort(value: string | number | null): number {
  if (!value || value === 'N/A') return 0;
  if (typeof value === 'number') return value;

  const str = value.toString().toUpperCase();
  const num = parseFloat(str);

  if (str.includes('B')) return num * 1e9;
  if (str.includes('M')) return num * 1e6;
  if (str.includes('K')) return num * 1e3;

  return num || 0;
}