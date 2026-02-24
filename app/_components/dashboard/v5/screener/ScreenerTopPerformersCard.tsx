'use client';

// app/_components/dashboard/v5/screener/ScreenerTopPerformersCard.tsx
// V5: updated imports and category names only. Logic unchanged from V4.

import { ETFData }      from '@/lib/v5/etfTypes';
import { formatPercent } from '@/lib/v5/etfCalculations';

interface ScreenerTopPerformersCardProps {
  allETFs: ETFData[];
}

const PERIODS = ['1M', '3M', '6M', '12M'] as const;

export function ScreenerTopPerformersCard({ allETFs }: ScreenerTopPerformersCardProps) {
  const topPerformers = PERIODS.map(period => {
    const sorted = [...allETFs]
      .filter(etf => etf.returns?.[period] != null)
      .sort((a, b) => (b.returns![period]! - a.returns![period]!));

    return { period, top3: sorted.slice(0, 3) };
  });

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-base font-semibold text-slate-900">Top Performers</h3>
        <span
          className="text-slate-400 text-sm cursor-help"
          title="Top 3 ETFs by raw return for each period. Unaffected by score weighting or calculation mode."
        >
          ℹ️
        </span>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {topPerformers.map(({ period, top3 }) => (
          <div key={period} className="flex flex-col gap-1.5">
            {/* Period header */}
            <div className="text-center py-2 rounded-lg bg-blue-600 text-white text-xs font-bold uppercase tracking-wide">
              {period}
            </div>

            {/* Top 3 */}
            {top3.map((etf, idx) => {
              const ret     = etf.returns?.[period] ?? null;
              const tooltip = `${etf.ticker.replace('.L', '')} · ${etf.fullName} · ${period}: ${ret?.toFixed(1)}%`;
              const bgClass = idx === 0
                ? 'bg-green-100 border-green-300'
                : idx === 1
                ? 'bg-green-50  border-green-200'
                : 'bg-slate-50  border-slate-200';

              return (
                <div
                  key={etf.ticker}
                  className={`p-2 rounded-md border flex flex-col justify-center cursor-help hover:brightness-95 transition-all ${bgClass}`}
                  title={tooltip}
                >
                  <div className="text-xs font-semibold text-slate-900 truncate">
                    {etf.shortName}
                  </div>
                  <div className="text-[11px] font-bold text-green-600 mt-0.5">
                    {formatPercent(ret)}
                  </div>
                </div>
              );
            })}

            {/* Fill empty slots */}
            {top3.length < 3 && Array.from({ length: 3 - top3.length }).map((_, i) => (
              <div key={`empty-${i}`} className="h-12 bg-slate-50 rounded-md border border-slate-100" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
