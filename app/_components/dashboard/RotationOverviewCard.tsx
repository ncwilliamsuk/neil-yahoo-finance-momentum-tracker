// app/_components/dashboard/RotationOverviewCard.tsx

'use client';

import { ETFData } from '@/lib/etf/types';
import { formatPercent } from '@/lib/etf/calculations';

interface RotationOverviewCardProps {
  allETFs: ETFData[];
}

// Category groupings for rotation analysis
const ROTATION_CATEGORIES = {
  'Factor': 'Style/Factor ETFs',
  'GICS Sector': ['US GICS Sectors', 'World Sectors', 'Europe Sectors'],
  'Commodity': 'Precious Metals & Commodities',
  'Region': ['Countries & Broad Regions'], // Will filter to regions only
  'Country': ['Countries & Broad Regions'], // Will filter to countries only
  'Fixed Income': 'Bonds',
  'Crypto + Thematic': ['Crypto & Blockchain', 'Thematic']
};

// Region tickers (broad geographic areas)
const REGION_TICKERS = ['VUKG.L', 'VERX.L', 'VFEG.L', 'HMFD.L', 'SWDA.L', 'XMWX.L', 'VAPX.L'];

const PERIODS = ['1M', '3M', '6M', '12M'] as const;

export function RotationOverviewCard({ allETFs }: RotationOverviewCardProps) {
  // Categorize ETFs for rotation analysis
const categorizeForRotation = () => {
  const categories: Record<string, ETFData[]> = {
    'Factor': [],
    'GICS Sector': [],
    'Commodity': [],
    'Region': [],
    'Country': [],
    'Fixed Income': [],
    'Crypto + Thematic': []
  };

  allETFs.forEach(etf => {
    // Factor
    if (etf.category === 'Style/Factor ETFs') {
      categories['Factor'].push(etf);
    }
    // GICS Sector (combine US, World, Europe)
    else if (['US GICS Sectors', 'World Sectors', 'Europe Sectors'].includes(etf.category)) {
      categories['GICS Sector'].push(etf);
    }
    // Commodity
    else if (etf.category === 'Precious Metals & Commodities') {
      categories['Commodity'].push(etf);
    }
    // Region vs Country
    else if (etf.category === 'Countries & Broad Regions') {
      if (REGION_TICKERS.includes(etf.ticker)) {
        categories['Region'].push(etf);
      } else {
        categories['Country'].push(etf);
      }
    }
    // Fixed Income (Bonds)
    else if (etf.category === 'Bonds') {
      categories['Fixed Income'].push(etf);
    }
    // Crypto + Thematic
    else if (['Crypto & Blockchain', 'Thematic'].includes(etf.category)) {
      categories['Crypto + Thematic'].push(etf);
    }
  });

  return categories;
};

  const renderCell = (etfs: ETFData[], period: typeof PERIODS[number]) => {
    // Get ETFs with data for this period
    const etfsWithData = etfs
      .map(etf => ({
        ticker: etf.ticker,
        shortName: etf.shortName,
        fullName: etf.fullName,
        return: etf.returns?.[period] ?? null
      }))
      .filter(e => e.return !== null);

    if (etfsWithData.length === 0) {
      return (
        <div className="p-2 text-center text-xs text-slate-400 italic">
          No data
        </div>
      );
    }

    // Sort by return (highest first)
    etfsWithData.sort((a, b) => (b.return ?? 0) - (a.return ?? 0));

    // Get top 3 and bottom 3
    const top3 = etfsWithData.slice(0, Math.min(3, etfsWithData.length));
    const bottom3 = etfsWithData.slice(-Math.min(3, etfsWithData.length)).reverse();

    return (
      <div className="p-2 flex flex-col gap-1">
        {/* Top 3 */}
        {top3.map((etf, index) => {
          const bgColor = index === 0 ? 'bg-green-400' : index === 1 ? 'bg-green-300' : 'bg-green-200';
          return (
            <div
              key={`top-${etf.ticker}`}
              className={`${bgColor} px-2 py-1 rounded text-xs font-medium text-green-900`}
              title={`${etf.ticker.replace('.L', '')} | ${etf.fullName}`}
            >
              {etf.shortName} | {formatPercent(etf.return)}
            </div>
          );
        })}

        {/* Bottom 3 */}
        {bottom3.map((etf, index) => {
          const bgColor = index === 0 ? 'bg-red-400' : index === 1 ? 'bg-red-300' : 'bg-red-200';
          return (
            <div
              key={`bottom-${etf.ticker}`}
              className={`${bgColor} px-2 py-1 rounded text-xs font-medium text-red-900`}
              title={`${etf.ticker.replace('.L', '')} | ${etf.fullName}`}
            >
              {etf.shortName} | {formatPercent(etf.return)}
            </div>
          );
        })}
      </div>
    );
  };

  const categorized = categorizeForRotation();

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-slate-900">
            Rotation & Performance Overview
          </h3>
          <span 
            className="text-slate-400 text-sm cursor-help"
            title="Top 3 and bottom 3 performers within each category across different timeframes. Helps identify sector rotation patterns."
          >
            ℹ️
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Header Row */}
          <div className="grid grid-cols-5 gap-0 border-b-2 border-slate-300 bg-slate-50">
            <div className="p-3 text-xs font-semibold text-slate-700 uppercase tracking-wide border-r border-slate-200">
              Category
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

          {/* Data Rows */}
          {Object.entries(categorized).map(([categoryName, etfs]) => (
            <div
              key={categoryName}
              className="grid grid-cols-5 gap-0 border-b border-slate-200 last:border-b-0"
            >
              <div className="p-3 text-sm font-semibold text-slate-900 bg-slate-50 border-r border-slate-200 flex items-center">
                {categoryName}
              </div>
              {PERIODS.map(period => (
                <div
                  key={period}
                  className="border-r border-slate-200 last:border-r-0 min-h-[120px]"
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