// app/_components/dashboard/v5/macro/RRGControls.tsx
'use client';

interface RRGControlsProps {
  currentView: 'sectors' | 'factors' | 'global';
  onViewChange: (view: 'sectors' | 'factors' | 'global') => void;
  benchmark: string;
  tailLength: number;
  onTailLengthChange: (length: number) => void;
}

export function RRGControls({ 
  currentView, 
  onViewChange, 
  benchmark,
  tailLength,
  onTailLengthChange
}: RRGControlsProps) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* View Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-slate-700">View:</span>
          <div className="flex gap-2">
            <button
              onClick={() => onViewChange('sectors')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentView === 'sectors'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Sectors
            </button>
            <button
              onClick={() => onViewChange('factors')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentView === 'factors'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Factors
            </button>
            <button
              onClick={() => onViewChange('global')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentView === 'global'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Global
            </button>
          </div>
        </div>

        {/* Tail Length Selector */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-700">Tail Length:</span>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0"
              max="4"
              value={tailLength}
              onChange={(e) => onTailLengthChange(parseInt(e.target.value))}
              className="w-32"
            />
            <span className="text-sm font-semibold text-slate-900 w-16">
              {tailLength} {tailLength === 1 ? 'dot' : 'dots'}
            </span>
          </div>
        </div>

        {/* Benchmark Display */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Benchmark:</span>
          <span className="px-3 py-1 bg-slate-100 rounded-lg text-sm font-semibold text-slate-900">
            {benchmark}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="mt-3 pt-3 border-t border-slate-200">
        <p className="text-xs text-slate-600">
          {currentView === 'sectors' ? (
            <>
              <span className="font-semibold">Sector Rotation:</span> Tracks 11 US sector ETFs classified as 
              Cyclical (XLY, XLC, XLI, XLB, XLE) or Defensive (XLP, XLV, XLU, XLRE, XLK, XLF) to identify 
              which sectors are leading or lagging the market.
            </>
          ) : currentView === 'factors' ? (
            <>
              <span className="font-semibold">Factor Rotation:</span> Tracks style factors (Value, Growth, Momentum, Quality, Low Volatility, Dividend) 
              to identify which investment styles are gaining or losing relative strength.
            </>
          ) : (
            <>
              <span className="font-semibold">Global Rotation:</span> Tracks global market segments (Equal Weight, Small Cap, Developed Markets, 
              Emerging Markets, Commodities, Real Estate) to identify regional rotation trends.
            </>
          )}
        </p>
      </div>
    </div>
  );
}
