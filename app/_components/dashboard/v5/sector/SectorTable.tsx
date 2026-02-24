'use client';

// app/_components/dashboard/v5/sector/SectorTable.tsx
// Displays one region's sector performance — used three times side by side

import { SectorReturn, Timeframe, getReturnColorClass } from '@/lib/v5/sectors';

interface SectorTableProps {
  title: string;
  sectors: SectorReturn[];
  timeframe: Timeframe;
  isLoading?: boolean;
}

export function SectorTable({ title, sectors, timeframe, isLoading }: SectorTableProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col">

      {/* Table title */}
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
          {title}
        </h3>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-400 uppercase border-b border-slate-100">
              <th className="px-3 py-2 text-left w-7">#</th>
              <th className="px-3 py-2 text-left">Sector</th>
              <th className="px-3 py-2 text-center">Type</th>
              <th className="px-3 py-2 text-right">Return</th>
            </tr>
          </thead>
          <tbody>
            {sectors.map((sector) => (
              <tr
                key={sector.ticker}
                className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
              >
                {/* Rank */}
                <td className="px-3 py-2.5 text-slate-400 font-mono text-xs">
                  {sector.rank}
                </td>

                {/* Sector name — hover reveals ticker */}
                <td className="px-3 py-2.5">
                  <span
                    title={sector.ticker}
                    className="text-slate-800 font-medium cursor-default"
                  >
                    {sector.name}
                  </span>
                </td>

                {/* Type badge */}
                <td className="px-3 py-2.5 text-center">
                  <span
                    className={`
                      inline-block px-2 py-0.5 rounded-full text-xs font-semibold
                      ${sector.type === 'cyclical'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-orange-100 text-orange-700'
                      }
                    `}
                  >
                    {sector.type === 'cyclical' ? 'Cyc' : 'Def'}
                  </span>
                </td>

                {/* Return — colour coded by magnitude */}
                <td className="px-3 py-2.5 text-right">
                  <span
                    className={`
                      inline-block px-2 py-0.5 rounded text-xs font-bold tabular-nums
                      ${getReturnColorClass(sector.return, timeframe)}
                    `}
                  >
                    {sector.return >= 0 ? '+' : ''}
                    {sector.return.toFixed(2)}%
                  </span>
                </td>
              </tr>
            ))}

            {sectors.length === 0 && !isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-sm">
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
