// app/dashboard-v5/page.tsx
'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import { CompositeGauge }    from '@/app/_components/dashboard/v5/volatility/CompositeGauge';
import { MetricsTable }      from '@/app/_components/dashboard/v5/volatility/MetricsTable';
import { SP500Chart }        from '@/app/_components/dashboard/v5/volatility/SP500Chart';
import { BreadthIndicator, type BreadthState } from '@/app/_components/dashboard/v5/volatility/BreadthIndicator';
import { MacroTab }          from '@/app/_components/dashboard/v5/MacroTab';
import { SectorFactorTab }   from '@/app/_components/dashboard/v5/sector/SectorFactorTab';
import MapsTab               from '@/app/_components/dashboard/v5/heatmaps/MapsTab';
import { ScreenerTab }       from '@/app/_components/dashboard/v5/screener/ScreenerTab';

const SWR_OPTS = {
  revalidateOnFocus:     false,
  revalidateOnReconnect: false,
  provider:              () => new Map(),
};

const fetcher = (url: string) => fetch(url).then(r => r.json());

// Client-side composite score recalculation.
// Replicates the server logic using pre-computed percentiles + raw values for regime checks.
function recalculateComposite(
  percentiles: Record<string, number>,
  rawValues:   Record<string, number>,
  weights:     Record<string, number>,
): { score: number; zone: string; color: string; interpretation: string } {
  const { vix, vix3m, vvix } = rawValues;

  let score =
    (percentiles.vix   * weights.vix   / 100) +
    (percentiles.vix3m * weights.vix3m / 100) +
    (percentiles.vvix  * weights.vvix  / 100) +
    (percentiles.move  * weights.move  / 100) +
    (percentiles.skew  * weights.skew  / 100);

  // Regime Adjustment 1: VVIX > 110 AND VIX < 20 = complacency / hidden tail risk
  if (vvix > 110 && vix < 20) score += 15;

  // Regime Adjustment 2: Inverted term structure — proportional to degree of inversion
  const inversion = vix - vix3m;
  if (inversion > 0) score += Math.min(15, inversion * 3);

  score = Math.max(0, Math.min(100, score));

  // Zone lookup
  if (score < 20) return { score, zone: 'COMPLACENT', color: '#22c55e', interpretation: 'Extremely low volatility. Markets calm, but complacency can precede sharp moves.' };
  if (score < 40) return { score, zone: 'NORMAL',     color: '#86efac', interpretation: 'Healthy volatility environment. Normal market conditions.' };
  if (score < 60) return { score, zone: 'ELEVATED',   color: '#fbbf24', interpretation: 'Rising uncertainty. Monitor for potential stress.' };
  if (score < 80) return { score, zone: 'HIGH',       color: '#f97316', interpretation: 'Significant volatility. Risk-off environment developing.' };
  return               { score, zone: 'EXTREME',      color: '#ef4444', interpretation: 'Crisis-level volatility. Extreme fear in markets.' };
}

export default function DashboardV5Page() {
  const [activeTab, setActiveTab] = useState('screener');
  const [lastRefresh, setLastRefresh] = useState<Record<string, Date | null>>({
    volatility:   null,
    macro:        null,
    sectorFactor: null,
    heatmaps:     null,
    screener:     null,
  });

  const tabs = [
    { id: 'volatility',   label: 'Volatility & Market Health', icon: '📊' },
    { id: 'macro',        label: 'Macro & Yields',             icon: '⚙️' },
    { id: 'sectorFactor', label: 'Sector & Factor Analysis',   icon: '📈' },
    { id: 'heatmaps',     label: 'Heatmaps',                   icon: '🗺️' },
    { id: 'screener',     label: 'Screener',                   icon: '🔍' },
  ];

  const refreshCurrentTab = () => {
    setLastRefresh(prev => ({ ...prev, [activeTab]: new Date() }));
  };

  return (
    <div className="min-h-screen bg-gray-100 p-5">
      <div className="max-w-[1600px] mx-auto">

        {/* Header */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-5 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">ETF Dashboard V5</h1>
            {lastRefresh[activeTab] && (
              <p className="text-sm text-slate-500 mt-1">
                Last refresh: {lastRefresh[activeTab]?.toLocaleTimeString()}
              </p>
            )}
          </div>
          <button
            onClick={refreshCurrentTab}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl p-2 shadow-sm flex gap-2 mb-5">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-1 px-6 py-3 rounded-lg font-semibold text-sm transition
                ${activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-transparent text-slate-600 hover:bg-slate-100'
                }
              `}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'volatility'   && <VolatilityTab />}
          {activeTab === 'macro'        && <MacroTab />}
          {activeTab === 'sectorFactor' && <SectorFactorTab />}
          {activeTab === 'heatmaps'     && <MapsTab />}
          {activeTab === 'screener'     && <ScreenerTab />}
        </div>

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Gauge tooltip explaining the scoring methodology
// ─────────────────────────────────────────────────────────────
const GAUGE_TOOLTIP = `Composite Volatility Score (0–100)

Inputs & default weights:
  • VIX (35%)    — 30-day S&P 500 implied vol
  • VIX3M (15%) — 90-day implied vol
  • VVIX (20%)  — volatility of VIX itself
  • MOVE (20%)  — bond market implied vol
  • SKEW (10%)  — crash protection demand

Scoring method:
Each metric is percentile-ranked within the past 12 months of data, then combined using the weights above. This means the score reflects how elevated each metric is RELATIVE TO RECENT HISTORY — not absolute levels. A VIX of 18 can score highly if the past year has been mostly below 15.

Regime adjustments:
  • Inverted term structure (VIX > VIX3M): adds up to +15pts proportional to the degree of inversion — signals acute near-term fear
  • Hidden tail risk (VVIX > 110 & VIX < 20): adds +15pts — complacency with active hedging underneath

Click any weight % in the table to adjust the scoring.`;

// ─────────────────────────────────────────────────────────────
// Volatility Tab
// ─────────────────────────────────────────────────────────────
function VolatilityTab() {
  const [breadthEnabled, setBreadthEnabled] = useState(false);
  // Local weights state for client-side recalculation
  const [weights, setWeights] = useState<Record<string, number> | null>(null);

  const { data, error, isLoading } = useSWR('/api/v5/volatility-data', fetcher, SWR_OPTS);

  const {
    data:      breadthData,
    error:     breadthError,
    isLoading: breadthLoading,
  } = useSWR(
    breadthEnabled ? '/api/v5/breadth-data' : null,
    fetcher,
    { ...SWR_OPTS, revalidateOnMount: true }
  );

  const breadthState: BreadthState =
    !breadthEnabled                      ? 'idle'    :
    breadthLoading                       ? 'loading' :
    breadthError || breadthData?.error   ? 'error'   :
    breadthData                          ? 'loaded'  : 'idle';

  // Initialise local weights from API data on first load
  const effectiveWeights = weights ?? data?.weights ?? { vix: 35, vix3m: 15, vvix: 20, move: 20, skew: 10 };

  // Recalculate composite score client-side when weights change
  const composite = useMemo(() => {
    if (!data?.percentiles || !data?.rawValues) return data?.composite ?? null;
    const totalWeight = Object.values(effectiveWeights).reduce((a: number, b: number) => a + b, 0);
    // Only recalculate if weights sum to 100
    if (totalWeight !== 100) return data?.composite ?? null;
    return recalculateComposite(data.percentiles, data.rawValues, effectiveWeights);
  }, [data, effectiveWeights]);

  const handleWeightsChange = (newWeights: Record<string, number>) => {
    setWeights(newWeights);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
            <p className="text-slate-600 font-medium">Loading volatility data…</p>
            <p className="text-sm text-slate-500 mt-2">Usually takes 10–20 seconds</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-900 mb-2">Error Loading Data</h3>
          <p className="text-red-700">{error.message ?? 'Failed to fetch volatility data'}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">

      {/* Gauge + Metrics */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          {/* Gauge title with methodology tooltip */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-xs text-slate-400 cursor-help"
              title={GAUGE_TOOLTIP}
            >
              ⓘ How is this score calculated?
            </span>
          </div>
          <CompositeGauge
            score={composite?.score ?? data.composite.score}
            zone={composite?.zone ?? data.composite.zone}
            color={composite?.color ?? data.composite.color}
            interpretation={composite?.interpretation ?? data.composite.interpretation}
          />
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <MetricsTable
            metrics={data.metrics}
            weights={effectiveWeights}
            onWeightsChange={handleWeightsChange}
          />
        </div>
      </div>

      {/* Chart + Breadth */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <SP500Chart
          chartData={data.chartData}
          indices={data.indices}
          spy={data.spy}
          adLine={breadthData?.adLine}
        />

        <BreadthIndicator
          state={breadthState}
          onLoad={() => setBreadthEnabled(true)}
          total={breadthData?.total}
          dma={breadthData?.dma}
          hiLo={breadthData?.hiLo}
          summary={breadthData?.summary}
          error={breadthError?.message ?? breadthData?.error}
        />
      </div>

    </div>
  );
}
