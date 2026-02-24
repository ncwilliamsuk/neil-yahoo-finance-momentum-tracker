'use client';

// app/_components/dashboard/v5/volatility/BreadthIndicator.tsx
// S&P 500 breadth card — loaded on demand via button.
// Shows % above 20/50/200 DMA + new highs/lows table + summary sentence.

export type BreadthState = 'idle' | 'loading' | 'loaded' | 'error';

interface DMAData {
  above:      number;
  total:      number;
  percentage: number;
}

interface HiLoData {
  highs:    number;
  lows:     number;
  highsPct: number;
  lowsPct:  number;
}

interface BreadthIndicatorProps {
  state:   BreadthState;
  onLoad:  () => void;
  error?:  string;
  // Loaded data
  total?:   number;
  dma?: {
    '20':  DMAData;
    '50':  DMAData;
    '200': DMAData;
  };
  hiLo?: {
    '1M':  HiLoData;
    '3M':  HiLoData;
    '6M':  HiLoData;
    '12M': HiLoData;
  };
  summary?: string;
}

// ── Colour band for a breadth percentage ─────────────────────
function getBandColor(pct: number): string {
  if (pct >= 80) return '#15803d';  // dark green
  if (pct >= 60) return '#22c55e';  // light green
  if (pct >= 40) return '#f59e0b';  // amber
  if (pct >= 20) return '#f87171';  // light red
  return                '#dc2626';  // dark red
}

function getBandLabel(pct: number): string {
  if (pct >= 80) return 'Very strong';
  if (pct >= 60) return 'Healthy';
  if (pct >= 40) return 'Mixed';
  if (pct >= 20) return 'Weak';
  return                'Very weak';
}

// ── Single DMA progress bar ───────────────────────────────────
function DMABar({ label, pct }: { label: string; pct: number }) {
  const color = getBandColor(pct);
  const band  = getBandLabel(pct);
  return (
    <div className="flex items-center gap-3 mb-2">
      <span className="text-xs font-semibold text-slate-500 w-14 flex-shrink-0">{label}</span>
      <div className="flex-1 h-6 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full flex items-center justify-center text-xs font-bold text-white transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color, minWidth: '2.5rem' }}
        >
          {pct.toFixed(1)}%
        </div>
      </div>
      <span className="text-xs font-semibold w-20 flex-shrink-0" style={{ color }}>
        {band}
      </span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export function BreadthIndicator({
  state, onLoad, error,
  total, dma, hiLo, summary,
}: BreadthIndicatorProps) {

  return (
    <div className="mt-6 p-5 bg-slate-50 rounded-xl border border-slate-100">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-1">
        <div>
          <h4 className="text-sm font-bold text-slate-800">S&amp;P 500 Market Breadth</h4>
          <p className="text-xs text-slate-400">All 500 constituents · full year of price history</p>
        </div>
        {state === 'idle' && (
          <button
            onClick={onLoad}
            className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
          >
            📊 Load Breadth Data
          </button>
        )}
        {state === 'loading' && (
          <span className="text-xs text-slate-400 italic">Fetching ~500 stocks — ~2 min…</span>
        )}
        {state === 'error' && (
          <button
            onClick={onLoad}
            className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-bold rounded-lg hover:bg-red-200 transition"
          >
            Retry
          </button>
        )}
        {state === 'loaded' && total && (
          <span className="text-xs text-slate-400">{total} stocks analysed</span>
        )}
      </div>

      {/* ── Idle ── */}
      {state === 'idle' && (
        <p className="text-sm text-slate-400 italic mt-3">
          Breadth data is not loaded automatically. Click above to fetch all 500 S&amp;P 500 constituents — takes approximately 2 minutes.
        </p>
      )}

      {/* ── Loading ── */}
      {state === 'loading' && (
        <div className="flex items-center gap-3 mt-4 py-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 flex-shrink-0" />
          <p className="text-sm text-slate-500">
            Fetching a full year of price history for ~500 stocks from Yahoo Finance…
          </p>
        </div>
      )}

      {/* ── Error ── */}
      {state === 'error' && (
        <p className="text-sm text-red-600 mt-3">
          {error ?? 'Failed to fetch breadth data. Please retry.'}
        </p>
      )}

      {/* ── Loaded ── */}
      {state === 'loaded' && dma && hiLo && (
        <>
          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-4 mb-4">
            {[
              { color: '#15803d', label: '>80% Very strong'  },
              { color: '#22c55e', label: '60–80% Healthy'    },
              { color: '#f59e0b', label: '40–60% Mixed'      },
              { color: '#f87171', label: '20–40% Weak'       },
              { color: '#dc2626', label: '<20% Very weak'    },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span className="text-xs text-slate-500">{label}</span>
              </div>
            ))}
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-2 gap-6">

            {/* Left — DMA bars */}
            <div>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3">
                % of stocks above moving average
              </p>
              <DMABar label="20 DMA"  pct={dma['20'].percentage}  />
              <DMABar label="50 DMA"  pct={dma['50'].percentage}  />
              <DMABar label="200 DMA" pct={dma['200'].percentage} />
            </div>

            {/* Right — Hi/Lo table */}
            <div>
              <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-3">
                New highs / new lows
              </p>
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left text-slate-400 font-semibold pb-2 w-16"> </th>
                    {(['1M','3M','6M','12M'] as const).map(tf => (
                      <th key={tf} className="text-center text-slate-400 font-semibold pb-2">{tf}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="text-slate-500 font-semibold py-1.5">Highs</td>
                    {(['1M','3M','6M','12M'] as const).map(tf => (
                      <td key={tf} className="text-center font-bold py-1.5" style={{ color: '#15803d' }}>
                        {hiLo[tf].highs}
                        <span className="font-normal text-slate-400"> ({hiLo[tf].highsPct.toFixed(0)}%)</span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="text-slate-500 font-semibold py-1.5">Lows</td>
                    {(['1M','3M','6M','12M'] as const).map(tf => (
                      <td key={tf} className="text-center font-bold py-1.5" style={{ color: '#dc2626' }}>
                        {hiLo[tf].lows}
                        <span className="font-normal text-slate-400"> ({hiLo[tf].lowsPct.toFixed(0)}%)</span>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

          </div>

          {/* Summary sentence */}
          {summary && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <p className="text-sm text-slate-600 leading-relaxed italic">{summary}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
