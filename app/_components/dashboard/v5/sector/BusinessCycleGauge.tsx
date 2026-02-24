'use client';

// app/_components/dashboard/v5/sector/BusinessCycleGauge.tsx
// Business Cycle Gauge — driven by sector performance data already fetched
// Main gauge uses US data; World and EU shown below for reference

import { SectorReturn, Timeframe } from '@/lib/v5/sectors';

interface BusinessCycleGaugeProps {
  usSectors:    Record<Timeframe, SectorReturn[]>;
  worldSectors: Record<Timeframe, SectorReturn[]>;
  euSectors:    Record<Timeframe, SectorReturn[]>;
}

// Timeframe weights from handover spec
const TF_WEIGHTS: Record<string, number> = {
  '1M':  0.15,
  '3M':  0.35,
  '6M':  0.35,
  '12M': 0.15,
};

// Score range is roughly -6 to +6 based on the weighting maths
// (max 3 sectors × 3 points × weight, positive or negative)
const SCORE_MIN = -6;
const SCORE_MAX =  6;

interface CycleResult {
  score: number;       // raw weighted score
  zone:  string;       // label
  pct:   number;       // 0-100 position on the bar
}

/**
 * Calculate the business cycle score for one region's sectors.
 * For each timeframe: rank sectors by return, award points to top 3.
 * Cyclical in top 3 = positive points, Defensive in top 3 = negative points.
 */
function calcCycleScore(sectors: Record<Timeframe, SectorReturn[]>): CycleResult {
  const timeframes = ['1M', '3M', '6M', '12M'] as Timeframe[];
  let totalScore = 0;

  for (const tf of timeframes) {
    const weight = TF_WEIGHTS[tf];
    const sorted = [...(sectors[tf] ?? [])].sort((a, b) => b.return - a.return);
    const top3   = sorted.slice(0, 3);

    let tfScore = 0;
    top3.forEach((sector, i) => {
      const points     = [3, 2, 1][i];
      const multiplier = sector.type === 'cyclical' ? 1 : -1;
      tfScore += points * multiplier;
    });

    totalScore += tfScore * weight;
  }

  const zone = getZone(totalScore);

  // Convert score to 0-100 percentage for bar position
  const pct = Math.min(100, Math.max(0,
    ((totalScore - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * 100
  ));

  return { score: totalScore, zone, pct };
}

function getZone(score: number): string {
  if (score >=  2.0) return 'Mid Expansion';
  if (score >=  0.5) return 'Early Recovery';
  if (score >= -0.5) return 'Late Cycle';
  return 'Contraction';
}

function getZoneColor(zone: string): string {
  switch (zone) {
    case 'Mid Expansion':  return 'text-green-600';
    case 'Early Recovery': return 'text-yellow-600';
    case 'Late Cycle':     return 'text-orange-600';
    case 'Contraction':    return 'text-red-600';
    default:               return 'text-slate-600';
  }
}

function getZoneBg(zone: string): string {
  switch (zone) {
    case 'Mid Expansion':  return 'bg-green-100 text-green-800';
    case 'Early Recovery': return 'bg-yellow-100 text-yellow-800';
    case 'Late Cycle':     return 'bg-orange-100 text-orange-800';
    case 'Contraction':    return 'bg-red-100 text-red-800';
    default:               return 'bg-slate-100 text-slate-800';
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface GaugeBarProps {
  result:    CycleResult;
  size?:     'large' | 'small';
  label?:    string;
}

function GaugeBar({ result, size = 'large', label }: GaugeBarProps) {
  const { pct, zone, score } = result;
  const isLarge = size === 'large';

  return (
    <div className={isLarge ? 'w-full' : 'w-full'}>
      {/* Label row */}
      {label && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            {label}
          </span>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold ${getZoneColor(zone)}`}>
              {zone}
            </span>
            <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${getZoneBg(zone)}`}>
              {score >= 0 ? '+' : ''}{score.toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* The gradient bar */}
      <div className={`relative w-full ${isLarge ? 'h-6' : 'h-3'} rounded-full overflow-visible`}>
        {/* Gradient track */}
        <div
          className={`absolute inset-0 rounded-full ${isLarge ? 'h-6' : 'h-3'}`}
          style={{
            background: 'linear-gradient(to right, #991b1b, #ef4444, #f97316, #fbbf24, #86efac, #22c55e, #166534)',
          }}
        />

        {/* Zone divider lines */}
        {[16.7, 50, 83.3].map((pos) => (
          <div
            key={pos}
            className="absolute top-0 bottom-0 w-px bg-white/40"
            style={{ left: `${pos}%` }}
          />
        ))}

        {/* Marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
          style={{ left: `${pct}%` }}
        >
          <div
            className={`
              rounded-full border-2 border-white shadow-lg bg-slate-900
              ${isLarge ? 'w-5 h-5' : 'w-3 h-3'}
            `}
          />
        </div>
      </div>

      {/* Zone labels below bar — large only */}
      {isLarge && (
        <div className="flex justify-between mt-1.5 px-1">
          <span className="text-xs text-red-600 font-medium">Contraction</span>
          <span className="text-xs text-orange-500 font-medium">Late Cycle</span>
          <span className="text-xs text-yellow-600 font-medium">Early Recovery</span>
          <span className="text-xs text-green-600 font-medium">Mid Expansion</span>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function BusinessCycleGauge({ usSectors, worldSectors, euSectors }: BusinessCycleGaugeProps) {
  const usResult    = calcCycleScore(usSectors);
  const worldResult = calcCycleScore(worldSectors);
  const euResult    = calcCycleScore(euSectors);

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900 mb-1">Business Cycle Gauge</h2>
      <p className="text-xs text-slate-400 mb-6">
        Driven by cyclical vs defensive sector leadership. Positive score = cyclicals leading = expansion.
      </p>

      {/* Main US gauge */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-slate-700">US Market</span>
          <span className={`text-lg font-bold ${getZoneColor(usResult.zone)}`}>
            {usResult.zone}
          </span>
        </div>
        <GaugeBar result={usResult} size="large" />
      </div>

      {/* Divider */}
      <div className="border-t border-slate-100 pt-4">
        <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-3">
          For reference
        </p>
        <div className="space-y-4">
          <GaugeBar result={worldResult} size="small" label="World" />
          <GaugeBar result={euResult}    size="small" label="EU" />
        </div>
      </div>
    </div>
  );
}
