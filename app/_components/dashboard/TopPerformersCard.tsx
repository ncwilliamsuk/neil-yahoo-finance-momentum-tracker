// app/_components/dashboard/TopPerformersCard.tsx

'use client';

import { ETFData } from '@/lib/etf/types';
import { formatPercent } from '@/lib/etf/calculations';

interface TopPerformersCardProps {
  allETFs: ETFData[];
}

const PERIODS: ('1M' | '3M' | '6M' | '12M')[] = ['1M', '3M', '6M', '12M'];

export function TopPerformersCard({ allETFs }: TopPerformersCardProps) {
  // For each period, get top 3 performers by raw return
  const topPerformersByPeriod = PERIODS.map(period => {
    const ranked = allETFs
      .map(etf => ({
        etf,
        return: etf.returns?.[period] ?? -Infinity
      }))
      .filter(item => item.return !== -Infinity)
      .sort((a, b) => b.return - a.return)
      .slice(0, 3);

    return { period, performers: ranked };
  });

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-slate-900">
            Top Performers by Period
          </h3>
          <span 
            className="text-slate-400 text-sm cursor-help"
            title="Top 3 ETFs by raw return in each time period"
          >
            ℹ️
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {topPerformersByPeriod.map(({ period, performers }) => (
          <div key={period} className="flex flex-col gap-1.5">
            {/* Header */}
            <h4 className="text-xs font-semibold text-slate-500 uppercase text-center mb-1">
              {period}
            </h4>

            {/* Top 3 */}
            {performers.map((item, index) => {
              const rankClass = index === 0 
                ? 'bg-green-200' 
                : index === 1 
                ? 'bg-green-100' 
                : 'bg-green-50';

              const tooltip = `${item.etf.ticker.replace('.L', '')} | ${item.etf.fullName}`;

              return (
                <div
                  key={item.etf.ticker}
                  className={`${rankClass} p-2.5 rounded-lg h-14 flex flex-col justify-center items-center`}
                  title={tooltip}
                >
                  <div className="text-xs font-semibold text-slate-900 truncate w-full text-center">
                    {item.etf.shortName}
                  </div>
                  <div className="text-[11px] font-bold text-green-700">
                    {formatPercent(item.return)}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-3 text-center">
        <p className="text-xs text-slate-400">#1 (darkest), #2, #3 (lightest)</p>
      </div>
    </div>
  );
}
