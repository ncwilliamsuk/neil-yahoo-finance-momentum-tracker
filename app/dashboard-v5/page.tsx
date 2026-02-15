'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { CompositeGauge } from '@/app/_components/dashboard/v5/volatility/CompositeGauge';
import { MetricsTable } from '@/app/_components/dashboard/v5/volatility/MetricsTable';
import { SP500Chart } from '@/app/_components/dashboard/v5/volatility/SP500Chart';
import { BreadthIndicator } from '@/app/_components/dashboard/v5/volatility/BreadthIndicator';

export default function DashboardV5Page() {
  const [activeTab, setActiveTab] = useState('volatility');
  const [lastRefresh, setLastRefresh] = useState<Record<string, Date | null>>({
    volatility: null,
    macro: null,
    sectorFactor: null,
    heatmaps: null,
    screener: null
  });

  const tabs = [
    { id: 'volatility', label: 'Volatility & Market Health', icon: '📊' },
    { id: 'macro', label: 'Macro & Yields', icon: '⚙️' },
    { id: 'sectorFactor', label: 'Sector & Factor Analysis', icon: '📈' },
    { id: 'heatmaps', label: 'Heatmaps', icon: '🗺️' },
    { id: 'screener', label: 'Screener', icon: '🔍' }
  ];

  const refreshCurrentTab = () => {
    setLastRefresh(prev => ({
      ...prev,
      [activeTab]: new Date()
    }));
    console.log(`Refreshing ${activeTab} tab...`);
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
          {activeTab === 'volatility' && <VolatilityTab />}

          {activeTab === 'macro' && (
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                ⚙️ Macro & Yields
              </h2>
              <p className="text-slate-600">
                Tab 2 will be implemented in Phase 3. This tab will show:
              </p>
              <ul className="mt-4 space-y-2 text-slate-600">
                <li>• US yield curve with toggles</li>
                <li>• Macro indicators table with percentile bars</li>
                <li>• RRG scatter plot (Sectors/Factors/Global)</li>
                <li>• Time slider and tail controls</li>
              </ul>
            </div>
          )}

          {activeTab === 'sectorFactor' && (
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                📈 Sector & Factor Analysis
              </h2>
              <p className="text-slate-600">
                Tab 3 will be implemented in Phase 4. This tab will show:
              </p>
              <ul className="mt-4 space-y-2 text-slate-600">
                <li>• US/World/EU sector performance tables</li>
                <li>• Business cycle gauge</li>
                <li>• C/D ratio analysis (3 regions)</li>
                <li>• Factor matrix heatmap</li>
                <li>• 12 ratio trends chart</li>
              </ul>
            </div>
          )}

          {activeTab === 'heatmaps' && (
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                🗺️ Heatmaps
              </h2>
              <p className="text-slate-600">
                Tab 4 will be implemented in Phase 5. This tab will show:
              </p>
              <ul className="mt-4 space-y-2 text-slate-600">
                <li>• Map 1: S&P 500 treemap (market cap weighted)</li>
                <li>• Map 2: ETF universe grid (~150 ETFs)</li>
                <li>• Map 3: Thematic ETFs grid (~69 ETFs)</li>
                <li>• Map 4: World geographic map</li>
              </ul>
            </div>
          )}

          {activeTab === 'screener' && (
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                🔍 Screener
              </h2>
              <p className="text-slate-600">
                Tab 5 will be implemented in Phase 6. This tab will show:
              </p>
              <ul className="mt-4 space-y-2 text-slate-600">
                <li>• V4 ETF momentum screener (integrated with V5 styling)</li>
                <li>• All V4 features preserved</li>
              </ul>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// Volatility Tab Component
function VolatilityTab() {
  const fetcher = (url: string) => fetch(url).then(r => r.json());
  const { data, error, isLoading } = useSWR('/api/v5/volatility-data', fetcher);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-slate-600 font-medium">Loading volatility data...</p>
            <p className="text-sm text-slate-500 mt-2">This may take 2-3 minutes (calculating breadth for 500 stocks)</p>
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
          <p className="text-red-700">{error.message || 'Failed to fetch volatility data'}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Top Section: Gauge + Metrics Table */}
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

      {/* Bottom Section: S&P 500 Chart + Breadth */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <SP500Chart
          data={data.sp500.chart}
          dma20={data.sp500.dma20}
          dma50={data.sp500.dma50}
        />
        
        <BreadthIndicator
          percentage={data.breadth.percentage}
          above={data.breadth.above}
          total={data.breadth.total}
          status={data.breadth.status}
          color={data.breadth.color}
        />
      </div>
    </div>
  );
}
