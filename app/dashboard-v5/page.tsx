'use client';

import { useState } from 'react';
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
// Volatility Tab
// Fast fetch:  /api/v5/volatility  — fires immediately (~15s)
// Slow fetch:  /api/v5/breadth-data — fires only on button click (~2 min)
// ─────────────────────────────────────────────────────────────
function VolatilityTab() {
  const [breadthEnabled, setBreadthEnabled] = useState(false);

  // Fast — fires on mount
  const { data, error, isLoading } = useSWR('/api/v5/volatility-data', fetcher, SWR_OPTS);

  // Slow — fires only when user clicks Load Breadth Data
  const {
    data:      breadthData,
    error:     breadthError,
    isLoading: breadthLoading,
  } = useSWR(
    breadthEnabled ? '/api/v5/breadth-data' : null,
    fetcher,
    { ...SWR_OPTS, revalidateOnMount: true }
  );

  // Derive breadth UI state
  const breadthState: BreadthState =
    !breadthEnabled                      ? 'idle'    :
    breadthLoading                       ? 'loading' :
    breadthError || breadthData?.error   ? 'error'   :
    breadthData                          ? 'loaded'  : 'idle';

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
          <CompositeGauge
            score={data.composite.score}
            zone={data.composite.zone}
            color={data.composite.color}
            interpretation={data.composite.interpretation}
          />
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <MetricsTable
            metrics={data.metrics}
            weights={data.weights}
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
