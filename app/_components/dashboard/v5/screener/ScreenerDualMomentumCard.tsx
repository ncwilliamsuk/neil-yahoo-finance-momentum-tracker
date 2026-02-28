'use client';

// app/_components/dashboard/v5/screener/ScreenerDualMomentumCard.tsx
// V5 changes vs V4:
//   - soniaRate prop replaces CSH2-derived risk-free rate calculation
//   - Bottom line reads "UK Risk-Free Rate (SONIA)" instead of "(estimated)"
//   - soniaRate null-safe (shows dash while loading)

import { ETFData }      from '@/lib/v5/etfTypes';
import { formatPercent } from '@/lib/v5/etfCalculations';
import { DUAL_MOMENTUM_TICKERS } from '@/lib/v5/etfList';

interface ScreenerDualMomentumCardProps {
  allETFs:   ETFData[];
  soniaRate: number | null;
}

const PERIODS = ['1M', '3M', '6M', '12M'] as const;

export function ScreenerDualMomentumCard({ allETFs, soniaRate }: ScreenerDualMomentumCardProps) {
  // Always uses the full unfiltered universe — compare mode doesn't affect this card
  const dualETFs = allETFs.filter(etf => DUAL_MOMENTUM_TICKERS.includes(etf.ticker));

  const topPerformers: { period: string; etf: ETFData | null; returnValue: number }[] = PERIODS.map(period => {
    let topETF: ETFData | null = null;
    let topReturn = -Infinity;

    dualETFs.forEach(etf => {
      const r = etf.returns?.[period];
      if (r != null && r > topReturn) {
        topReturn = r;
        topETF    = etf;
      }
    });

    return { period, etf: topETF, returnValue: topReturn };
  });

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-base font-semibold text-slate-900">Dual Momentum</h3>
        <span
          className="text-slate-400 text-sm cursor-help"
          title="Compares 4 core assets across each time period: CSH2 (UK Cash), CSP1 (S&P 500), XMWX (World ex-US), IGLT (UK Gilts). Shows the highest-returning asset for each period."
        >
          ℹ️
        </span>
      </div>

      <div className="space-y-3">
        {topPerformers.map(({ period, etf, returnValue }) => (
          <div
            key={period}
            className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-b-0"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-500 min-w-[35px]">
                {period}:
              </span>
              <span className={`text-lg font-bold ${returnValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercent(returnValue === -Infinity ? null : returnValue)}
              </span>
            </div>
            <span
              className="text-xs text-slate-600 font-medium"
              title={etf ? `${etf.ticker.replace('.L', '')} · ${etf.fullName}` : undefined}
            >
              {etf ? `${etf.shortName} · ${etf.ticker.replace('.L', '')}` : 'N/A'}
            </span>
          </div>
        ))}
      </div>

      {/* SONIA rate — live from FRED, no longer estimated */}
      <div className="mt-4 pt-4 border-t border-slate-200">
        <p className="text-xs text-slate-600">
          UK Risk-Free Rate (SONIA):{' '}
          <span className="font-semibold text-slate-900">
            {soniaRate != null ? `${soniaRate.toFixed(2)}%` : '—'}
          </span>
          <span
            className="ml-1 text-slate-400 cursor-help"
            title="Sterling Overnight Index Average (SONIA) sourced from FRED. Used as the risk-free rate in Sharpe ratio calculations."
          >
            ℹ️
          </span>
        </p>
      </div>
    </div>
  );
}
