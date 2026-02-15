// app/_components/dashboard/LabelHighlightsCard.tsx

'use client';

import { ETFData, MomentumLabel } from '@/lib/etf/types';
import { formatPercent } from '@/lib/etf/calculations';

interface LabelHighlightsCardProps {
  allETFs: ETFData[];
}

const LABELS: MomentumLabel[] = ['LEADER', 'EMERGING', 'RECOVERING', 'FADING', 'LAGGARD'];

// Comprehensive label definitions
const LABEL_DEFINITIONS: Record<MomentumLabel, string> = {
  LEADER: 'Strong consistent uptrend across all timeframes. 12M > 15%, 3M > 5%, 1M > 1%. High momentum, sustained strength.',
  EMERGING: 'Recently gaining momentum after weak long-term performance. 12M < 5%, 3M > 4%, 1M > 3%. New uptrend starting.',
  RECOVERING: 'Bouncing back from severe losses with recent positive momentum. 12M < -10%, 3M > -1%, 1M > 2%. Oversold reversal.',
  FADING: 'Losing momentum after strong run. 12M > 10%, 3M < 2%, 1M < -2%. Trend weakening, potential top.',
  LAGGARD: 'Consistent downtrend across all timeframes. 12M < -5%, 3M < -3%, 1M < -1%. Weak momentum, sustained decline.'
};

export function LabelHighlightsCard({ allETFs }: LabelHighlightsCardProps) {
  // Classify all ETFs by label
  const classified: Record<MomentumLabel, ETFData[]> = {
    LEADER: [],
    EMERGING: [],
    RECOVERING: [],
    FADING: [],
    LAGGARD: []
  };

  allETFs.forEach(etf => {
    if (etf.label && LABELS.includes(etf.label)) {
      classified[etf.label].push(etf);
    }
  });

  // Sort each label group
  // LEADER, EMERGING, RECOVERING: DESC (highest score first)
  // FADING, LAGGARD: ASC (lowest score first - worst performers)
  classified.LEADER.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  classified.EMERGING.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  classified.RECOVERING.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  classified.FADING.sort((a, b) => (a.score ?? 0) - (b.score ?? 0));  // ASC!
  classified.LAGGARD.sort((a, b) => (a.score ?? 0) - (b.score ?? 0)); // ASC!

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-slate-900">
            Label Highlights
          </h3>
          <span 
            className="text-slate-400 text-sm cursor-help"
            title="Top 3 ETFs in each momentum label category. Labels classify ETFs based on their momentum trends across multiple timeframes."
          >
            ℹ️
          </span>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {LABELS.map(label => (
          <div key={label} className="flex flex-col gap-1.5">
            {/* Header with comprehensive tooltip */}
            <div 
              className={`text-center py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide cursor-help ${getLabelHeaderClass(label)}`}
              title={LABEL_DEFINITIONS[label]}
            >
              {label}
            </div>

            {/* Top 3 */}
            {[0, 1, 2].map(index => {
              const etf = classified[label][index];
              
              if (!etf) {
                return (
                  <div key={index} className="bg-transparent h-16" />
                );
              }

              const returnValue = etf.returns?.['12M'] ?? null;
              const tooltip = `${etf.ticker.replace('.L', '')} | ${etf.fullName} | Score: ${etf.score?.toFixed(1)} | ${LABEL_DEFINITIONS[label]}`;

              return (
                <div 
                  key={index}
                  className="bg-slate-50 p-2 rounded-md h-16 flex flex-col justify-center items-center cursor-help"
                  title={tooltip}
                >
                  <div className="text-xs font-semibold text-slate-900 truncate w-full text-center">
                    {etf.shortName}
                  </div>
                  <div className={`text-[11px] font-bold ${returnValue !== null && returnValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercent(returnValue)}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Row numbers on the left side */}
      <div className="mt-2 text-center">
        <p className="text-xs text-slate-400">#1, #2, #3 in each category</p>
      </div>
    </div>
  );
}

function getLabelHeaderClass(label: MomentumLabel): string {
  const classes = {
    LEADER: 'bg-green-500 text-white',
    EMERGING: 'bg-blue-500 text-white',
    RECOVERING: 'bg-yellow-500 text-slate-900',
    FADING: 'bg-orange-500 text-white',
    LAGGARD: 'bg-red-500 text-white'
  };
  return classes[label];
}