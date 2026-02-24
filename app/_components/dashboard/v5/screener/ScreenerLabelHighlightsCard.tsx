'use client';

// app/_components/dashboard/v5/screener/ScreenerLabelHighlightsCard.tsx
// Identical logic to V4 LabelHighlightsCard — updated imports only.

import { ETFData, MomentumLabel } from '@/lib/v5/etfTypes';
import { formatPercent }          from '@/lib/v5/etfCalculations';

interface ScreenerLabelHighlightsCardProps {
  allETFs: ETFData[];
}

const LABELS: MomentumLabel[] = ['LEADER', 'EMERGING', 'RECOVERING', 'FADING', 'LAGGARD'];

const LABEL_DEFINITIONS: Record<MomentumLabel, string> = {
  LEADER:     '12M > 15%, 3M > 5%, 1M > 1% — strong consistent uptrend across all timeframes',
  EMERGING:   '12M < 5%, 3M > 4%, 1M > 3% — new uptrend forming after weak long-term performance',
  RECOVERING: '12M < -10%, 3M > -1%, 1M > 2% — bouncing back from severe losses with recent positive momentum',
  FADING:     '12M > 10%, 3M < 2%, 1M < -2% — momentum weakening after a strong run, potential top',
  LAGGARD:    '12M < -5%, 3M < -3%, 1M < -1% — consistent downtrend across all timeframes',
};

const LABEL_HEADER_CLASS: Record<MomentumLabel, string> = {
  LEADER:     'bg-green-500  text-white',
  EMERGING:   'bg-blue-500   text-white',
  RECOVERING: 'bg-yellow-500 text-slate-900',
  FADING:     'bg-orange-500 text-white',
  LAGGARD:    'bg-red-500    text-white',
};

export function ScreenerLabelHighlightsCard({ allETFs }: ScreenerLabelHighlightsCardProps) {
  const classified: Record<MomentumLabel, ETFData[]> = {
    LEADER: [], EMERGING: [], RECOVERING: [], FADING: [], LAGGARD: [],
  };

  allETFs.forEach(etf => {
    if (etf.label && LABELS.includes(etf.label as MomentumLabel)) {
      classified[etf.label as MomentumLabel].push(etf);
    }
  });

  // Best-first for positive labels, worst-first for negative
  classified.LEADER.sort((a, b)     => (b.score ?? 0) - (a.score ?? 0));
  classified.EMERGING.sort((a, b)   => (b.score ?? 0) - (a.score ?? 0));
  classified.RECOVERING.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  classified.FADING.sort((a, b)     => (a.score ?? 0) - (b.score ?? 0));
  classified.LAGGARD.sort((a, b)    => (a.score ?? 0) - (b.score ?? 0));

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-base font-semibold text-slate-900">Label Highlights</h3>
        <span
          className="text-slate-400 text-sm cursor-help"
          title="Top 3 ETFs in each momentum label. Labels are assigned based on return thresholds across 1M, 3M and 12M periods."
        >
          ℹ️
        </span>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {LABELS.map(label => (
          <div key={label} className="flex flex-col gap-1.5">
            {/* Label header */}
            <div
              className={`text-center py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide cursor-help ${LABEL_HEADER_CLASS[label]}`}
              title={LABEL_DEFINITIONS[label]}
            >
              {label}
            </div>

            {/* Top 3 slots */}
            {[0, 1, 2].map(idx => {
              const etf = classified[label][idx];
              if (!etf) return <div key={idx} className="h-16" />;

              const ret     = etf.returns?.['12M'] ?? null;
              const tooltip = `${etf.ticker.replace('.L', '')} · ${etf.fullName} · Score: ${etf.score?.toFixed(1)} · ${LABEL_DEFINITIONS[label]}`;

              return (
                <div
                  key={idx}
                  className="bg-slate-50 p-2 rounded-md h-16 flex flex-col justify-center items-center cursor-help hover:bg-slate-100 transition-colors"
                  title={tooltip}
                >
                  <div className="text-xs font-semibold text-slate-900 truncate w-full text-center">
                    {etf.shortName}
                  </div>
                  <div className={`text-[11px] font-bold mt-0.5 ${ret != null && ret >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercent(ret)}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-slate-400 text-center">#1, #2, #3 in each category · 12M return shown</p>
    </div>
  );
}
