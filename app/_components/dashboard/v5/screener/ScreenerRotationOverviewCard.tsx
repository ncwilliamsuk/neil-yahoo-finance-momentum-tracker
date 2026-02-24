'use client';

// app/_components/dashboard/v5/screener/ScreenerRotationOverviewCard.tsx
// V5 changes vs V4:
//   - Category names updated to match V5 etfList renames
//   - Broad Regions split is now explicit (Countries vs Broad Regions are separate categories)
//   - Rotation groupings updated to reflect new category naming

import { ETFData }      from '@/lib/v5/etfTypes';
import { formatPercent } from '@/lib/v5/etfCalculations';

interface ScreenerRotationOverviewCardProps {
  allETFs: ETFData[];
}

const PERIODS = ['1M', '3M', '6M', '12M'] as const;

// Maps rotation display name → one or more V5 category names
// Because Countries and Broad Regions are now separate categories in V5,
// we no longer need the REGION_TICKERS hack from V4.
const ROTATION_GROUPS: Record<string, string[]> = {
  'Factors':          ['Factors'],
  'Sectors':          ['Sectors US', 'Sectors World', 'Sectors Europe'],
  'Broad Regions':    ['Broad Regions'],
  'Countries':        ['Countries'],
  'Fixed Income':     ['Bonds'],
  'Commodities':      ['Commodities'],
  'Crypto & Themes':  ['Crypto', 'Thematics'],
};

export function ScreenerRotationOverviewCard({ allETFs }: ScreenerRotationOverviewCardProps) {
  // Group ETFs by rotation category
  const grouped: Record<string, ETFData[]> = Object.fromEntries(
    Object.keys(ROTATION_GROUPS).map(name => [name, []])
  );

  allETFs.forEach(etf => {
    for (const [groupName, categoryNames] of Object.entries(ROTATION_GROUPS)) {
      if (categoryNames.includes(etf.category)) {
        grouped[groupName].push(etf);
        break;
      }
    }
  });

  const renderCell = (etfs: ETFData[], period: typeof PERIODS[number]) => {
    const withData = etfs
      .map(etf => ({
        ticker:    etf.ticker,
        shortName: etf.shortName,
        fullName:  etf.fullName,
        ret:       etf.returns?.[period] ?? null,
      }))
      .filter(e => e.ret !== null)
      .sort((a, b) => (b.ret ?? 0) - (a.ret ?? 0));

    if (withData.length === 0) {
      return <div className="p-2 text-center text-xs text-slate-300 italic">No data</div>;
    }

    const top3    = withData.slice(0, Math.min(3, withData.length));
    const bottom3 = withData.slice(-Math.min(3, withData.length)).reverse();

    // Avoid duplicates when the group is small
    const bottomFiltered = bottom3.filter(b => !top3.some(t => t.ticker === b.ticker));

    const topBg    = ['bg-green-400', 'bg-green-300', 'bg-green-200'];
    const bottomBg = ['bg-red-400',   'bg-red-300',   'bg-red-200'];

    return (
      <div className="p-2 flex flex-col gap-1">
        {top3.map((etf, i) => (
          <div
            key={`t-${etf.ticker}`}
            className={`${topBg[i]} px-2 py-1 rounded text-xs font-medium text-green-900 truncate`}
            title={`${etf.ticker.replace('.L', '')} · ${etf.fullName}`}
          >
            {etf.shortName} · {formatPercent(etf.ret)}
          </div>
        ))}
        {bottomFiltered.map((etf, i) => (
          <div
            key={`b-${etf.ticker}`}
            className={`${bottomBg[i]} px-2 py-1 rounded text-xs font-medium text-red-900 truncate`}
            title={`${etf.ticker.replace('.L', '')} · ${etf.fullName}`}
          >
            {etf.shortName} · {formatPercent(etf.ret)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-base font-semibold text-slate-900">Rotation & Performance Overview</h3>
        <span
          className="text-slate-400 text-sm cursor-help"
          title="Top 3 and bottom 3 performers within each asset group across timeframes. Helps identify rotation trends."
        >
          ℹ️
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Header */}
          <div className="grid grid-cols-5 border-b-2 border-slate-300 bg-slate-50">
            <div className="p-3 text-xs font-semibold text-slate-700 uppercase tracking-wide border-r border-slate-200">
              Group
            </div>
            {PERIODS.map(period => (
              <div
                key={period}
                className="p-3 text-xs font-semibold text-slate-700 uppercase tracking-wide text-center border-r border-slate-200 last:border-r-0"
              >
                {period}
              </div>
            ))}
          </div>

          {/* Rows */}
          {Object.entries(grouped).map(([groupName, etfs]) => (
            <div
              key={groupName}
              className="grid grid-cols-5 border-b border-slate-200 last:border-b-0"
            >
              <div className="p-3 text-sm font-semibold text-slate-900 bg-slate-50 border-r border-slate-200 flex items-center">
                <span title={`${etfs.length} ETFs`}>{groupName}</span>
                <span className="ml-1.5 text-xs text-slate-400 font-normal">({etfs.length})</span>
              </div>
              {PERIODS.map(period => (
                <div
                  key={period}
                  className="border-r border-slate-200 last:border-r-0 min-h-[100px]"
                >
                  {renderCell(etfs, period)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
