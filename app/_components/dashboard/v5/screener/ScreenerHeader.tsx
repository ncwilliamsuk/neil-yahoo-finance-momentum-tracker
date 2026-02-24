'use client';

// app/_components/dashboard/v5/screener/ScreenerHeader.tsx

import { Universe } from '@/lib/v5/etfTypes';

interface ScreenerHeaderProps {
  universe:        Universe;
  onUniverseChange:(universe: Universe) => void;
  etfCount:        number;
  successCount:    number;
  failCount:       number;
  soniaRate:       number | null;
  soniaSource:     string;
  lastUpdated:     string;
  onRefresh:       () => void;
  onExport:        () => void;
}

export function ScreenerHeader({
  universe,
  onUniverseChange,
  etfCount,
  successCount,
  failCount,
  soniaRate,
  soniaSource,
  lastUpdated,
  onRefresh,
  onExport,
}: ScreenerHeaderProps) {
  return (
    <div className="bg-white rounded-xl p-7 shadow-sm">
      <div className="flex justify-between items-start">

        {/* Left — title + meta */}
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 mb-1.5">
            ETF Momentum Screener
          </h1>
          <p className="text-sm text-slate-500 mb-3">
            Percentile-based ranking &bull; {etfCount} ETFs &bull; Updated {lastUpdated}
          </p>

          {/* Data quality + SONIA row */}
          <div className="flex items-center gap-4 flex-wrap">

            {/* ETF load count */}
            <span className="text-xs text-slate-500">
              {successCount > 0 && (
                <>
                  <span className="text-green-600 font-semibold">{successCount} loaded</span>
                  {failCount > 0 && (
                    <span className="text-yellow-600 font-semibold ml-1">· {failCount} failed</span>
                  )}
                </>
              )}
            </span>

            {/* SONIA rate */}
            {soniaRate !== null && (
              <span
                className="text-xs text-slate-500 cursor-help"
                title={`Source: ${soniaSource}. Used as the risk-free rate in Sharpe ratio calculations.`}
              >
                SONIA:{' '}
                <span className="font-semibold text-slate-700">
                  {soniaRate.toFixed(2)}%
                </span>
                {soniaSource !== 'FRED IUDSOIA' && (
                  <span className="ml-1 text-amber-500">⚠️</span>
                )}
              </span>
            )}

          </div>
        </div>

        {/* Right — universe toggle + action buttons */}
        <div className="flex flex-col items-end gap-3">

          {/* Universe toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mr-1">
              Universe:
            </span>
            <button
              onClick={() => onUniverseChange('core')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                universe === 'core'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
              title="Core universe — 115 LSE-traded ETFs. Loads in ~1 minute."
            >
              Core
            </button>
            <button
              onClick={() => onUniverseChange('extended')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                universe === 'extended'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
              title="Extended universe — ~188 curated ETFs covering all major categories. Loads in ~1 minute."
            >
              Extended
              <span className="ml-1.5 text-xs opacity-70">⏱</span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={onRefresh}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
            >
              <span>🔄</span>
              Refresh Data
            </button>
            <button
              onClick={onExport}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
            >
              <span>📥</span>
              Export CSV
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
