// app/_components/dashboard/DualMomentumCard.tsx

'use client';

import { ETFData } from '@/lib/etf/types';
import { formatPercent, calculateRiskFreeRate } from '@/lib/etf/calculations';

interface DualMomentumCardProps {
  allETFs: ETFData[];
}

// The 4 core dual momentum assets
const DUAL_MOMENTUM_TICKERS = ['CSH2.L', 'CSP1.L', 'XMWX.L', 'IGLT.L'];

export function DualMomentumCard({ allETFs }: DualMomentumCardProps) {
  // Filter to only the 4 dual momentum ETFs
  const dualMomentumETFs = allETFs.filter(etf => 
    DUAL_MOMENTUM_TICKERS.includes(etf.ticker)
  );

  // Find top performer for each period
  const periods: ('1M' | '3M' | '6M' | '12M')[] = ['1M', '3M', '6M', '12M'];
  
  const topPerformers = periods.map(period => {
    let topETF: ETFData | null = null;
    let topReturn = -Infinity;

    dualMomentumETFs.forEach(etf => {
      const returnValue = etf.returns?.[period];
      if (returnValue !== null && returnValue !== undefined && returnValue > topReturn) {
        topReturn = returnValue;
        topETF = etf;
      }
    });

    return { period, etf: topETF, return: topReturn };
  });

  // Calculate risk-free rate from CSH2
  const csh2 = allETFs.find(etf => etf.ticker === 'CSH2.L');
  const riskFreeRate = csh2?.returns?.['1M'] 
    ? calculateRiskFreeRate(csh2.returns['1M'])
    : 4.08;

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-slate-900">
            Dual Momentum
          </h3>
          <span 
            className="text-slate-400 text-sm cursor-help"
            title="Compares 4 core assets (CSH2 UK Cash, CSP1 S&P 500, XMWX World ex-US, IGLT UK Gilts) across different time periods. Shows which asset has the highest return for each period."
          >
            ℹ️
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {topPerformers.map(({ period, etf, return: returnValue }) => (
          <div 
            key={period}
            className="flex justify-between items-center py-2.5 border-b border-slate-100 last:border-b-0"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-slate-500 min-w-[35px]">
                {period}:
              </span>
              <span className={`text-lg font-bold ${returnValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercent(returnValue)}
              </span>
            </div>
            <span className="text-xs text-slate-600 font-medium">
              {etf ? `${etf.shortName} - ${etf.ticker.replace('.L', '')}` : 'N/A'}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-200">
        <p className="text-xs text-slate-600">
          UK Risk-Free Rate (estimated): <span className="font-semibold text-slate-900">{riskFreeRate.toFixed(2)}%</span>
          <span 
            className="ml-1 text-slate-400 cursor-help"
            title="Calculated from CSH2 1-month return, compounded annually"
          >
            ℹ️
          </span>
        </p>
      </div>
    </div>
  );
}