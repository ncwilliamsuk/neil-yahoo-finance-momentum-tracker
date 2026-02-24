'use client';

// app/_components/dashboard/v5/sector/FactorMatrix.tsx
// 3×6 Factor Matrix Heatmap: Large/Mid/Small × Blend/Quality/Value/Momentum/Growth/Low Vol

import { useState } from 'react';
import {
  FactorMatrix as FactorMatrixType,
  FactorSize,
  FactorStyle,
  FACTOR_SIZES,
  FACTOR_STYLES,
  Timeframe,
  getFactorCellClass,
} from '@/lib/v5/sectors';

interface FactorMatrixProps {
  matrices: Record<Timeframe, FactorMatrixType>;
}

const TIMEFRAMES: Timeframe[] = ['1D', '1W', '1M', '3M', '6M', '12M'];

// Short column labels to save space
const STYLE_LABELS: Record<FactorStyle, string> = {
  Blend:    'Blend',
  Quality:  'Quality',
  Value:    'Value',
  Momentum: 'Momentum',
  Growth:   'Growth',
  'Low Vol':'Low Vol',
};

export function FactorMatrixPanel({ matrices }: FactorMatrixProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('1M');

  const matrix = matrices?.[timeframe];

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      {/* Header + toggle */}
      <div className="flex items-center justify-between mb-1 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Factor Matrix</h2>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition
                ${timeframe === tf
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200'}`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-400 mb-5">
        US equity factor performance by size and style. Colour shows rank across all 18 cells
        for the selected timeframe — green = top performers, red = bottom performers.
      </p>

      {!matrix ? (
        <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
          Loading factor data…
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {/* Empty corner cell */}
                <th className="w-16 pb-2" />
                {FACTOR_STYLES.map(style => (
                  <th
                    key={style}
                    className="pb-2 text-xs font-semibold text-slate-500 text-center px-1"
                  >
                    {STYLE_LABELS[style]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FACTOR_SIZES.map(size => (
                <tr key={size}>
                  {/* Row label */}
                  <td className="pr-3 py-1.5 text-xs font-bold text-slate-600 text-right whitespace-nowrap">
                    {size} Cap
                  </td>

                  {FACTOR_STYLES.map(style => {
                    const cell = matrix[size]?.[style];
                    if (!cell) {
                      return (
                        <td key={style} className="px-1 py-1.5">
                          <div className="rounded-lg bg-slate-100 h-14 flex items-center justify-center">
                            <span className="text-xs text-slate-400">—</span>
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td key={style} className="px-1 py-1.5">
                        <div
                          className={`rounded-lg h-14 flex flex-col items-center justify-center
                            cursor-default transition-opacity hover:opacity-80
                            ${getFactorCellClass(cell.percentile)}`}
                          title={`${cell.ticker}: ${cell.return >= 0 ? '+' : ''}${cell.return.toFixed(2)}%`}
                        >
                          <span className="text-xs font-bold tabular-nums">
                            {cell.return >= 0 ? '+' : ''}{cell.return.toFixed(2)}%
                          </span>
                          <span className="text-xs opacity-75 mt-0.5">
                            {cell.ticker}
                          </span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Colour legend */}
      <div className="flex items-center gap-2 mt-4 justify-end">
        <span className="text-xs text-slate-400">Rank:</span>
        {[
          { label: 'Bottom', cls: 'bg-red-800' },
          { label: '',       cls: 'bg-red-400' },
          { label: 'Mid',    cls: 'bg-yellow-100 border border-slate-200' },
          { label: '',       cls: 'bg-green-400' },
          { label: 'Top',    cls: 'bg-green-700' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className={`w-4 h-4 rounded ${item.cls}`} />
            {item.label && <span className="text-xs text-slate-400">{item.label}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
