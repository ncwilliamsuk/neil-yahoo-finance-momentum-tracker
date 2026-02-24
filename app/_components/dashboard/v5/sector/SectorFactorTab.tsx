'use client';

// app/_components/dashboard/v5/sector/SectorFactorTab.tsx
// Tab 3: Sector & Factor Analysis

import { useState } from 'react';
import useSWR from 'swr';
import { SectorTable } from './SectorTable';
import { BusinessCycleGauge } from './BusinessCycleGauge';
import { CDRatioPanel } from './CDRatioPanel';
import { FactorMatrixPanel } from './FactorMatrix';
import { RatioTrendsPanel } from './RatioTrendsPanel';
import { Timeframe } from '@/lib/v5/sectors';

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const TIMEFRAMES: Timeframe[] = ['1D', '1W', '1M', '3M', '6M', '12M'];

export function SectorFactorTab() {
  const [timeframe, setTimeframe] = useState<Timeframe>('1M');

  // Fetch 1: sectors + C/D ratios (33 tickers, ~5s)
  const { data: sectorData, error: sectorError, isLoading: sectorLoading } = useSWR(
    '/api/v5/sector-data',
    fetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false, provider: () => new Map() },
  );

  // Fetch 2: factor matrix (18 US tickers, ~3s) — fires independently
  const { data: factorData, isLoading: factorLoading } = useSWR(
    '/api/v5/factor-data',
    fetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false, provider: () => new Map() },
  );

  // Fetch 3: ratio trends (26 tickers, ~5s) — fires independently
  const { data: ratioData, isLoading: ratioLoading } = useSWR(
    '/api/v5/ratio-data',
    fetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false, provider: () => new Map() },
  );

  // Only extract once data is confirmed present
  const sectorsUS    = sectorData?.sectors?.US;
  const sectorsWorld = sectorData?.sectors?.World;
  const sectorsEU    = sectorData?.sectors?.EU;
  const cdRatios     = sectorData?.cdRatios;

  const usSectors    = sectorsUS?.[timeframe]    ?? [];
  const worldSectors = sectorsWorld?.[timeframe] ?? [];
  const euSectors    = sectorsEU?.[timeframe]    ?? [];

  return (
    <div className="space-y-6 p-6">

      {/* Page header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">Sector &amp; Factor Analysis</h1>
        <p className="text-blue-100">
          Sector rotation and factor performance across US, World and European markets
        </p>
      </div>

      {/* ── Sector Performance ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Sector Performance</h2>
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 rounded-md text-sm font-semibold transition ${
                  timeframe === tf
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {sectorError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-5">
            <p className="text-red-700 text-sm font-medium">
              Failed to load sector data. Please try refreshing.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <SectorTable title="US Sectors"    sectors={usSectors}    timeframe={timeframe} isLoading={sectorLoading} />
          <SectorTable title="World Sectors" sectors={worldSectors} timeframe={timeframe} isLoading={sectorLoading} />
          <SectorTable title="EU Sectors"    sectors={euSectors}    timeframe={timeframe} isLoading={sectorLoading} />
        </div>

        {sectorData?.timestamp && (
          <p className="text-xs text-slate-400 mt-3 text-right">
            Data as of {new Date(sectorData.timestamp).toLocaleTimeString()}
          </p>
        )}
      </div>

      {/* ── Business Cycle Gauge — only render once data is present ───────── */}
      {sectorsUS && sectorsWorld && sectorsEU && (
        <BusinessCycleGauge
          usSectors={sectorsUS}
          worldSectors={sectorsWorld}
          euSectors={sectorsEU}
        />
      )}

      {/* ── C/D Ratio Panel — only render once data is present ────────────── */}
      {cdRatios?.US && cdRatios?.World && cdRatios?.EU && (
        <CDRatioPanel
          us={cdRatios.US}
          world={cdRatios.World}
          eu={cdRatios.EU}
        />
      )}

      {/* ── S&P 500 Divergence Check ───────────────────────────────────────── */}
      {sectorData?.divergenceCheck && (
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <p className="text-sm text-slate-600 leading-relaxed">
            {sectorData.divergenceCheck}
          </p>
        </div>
      )}

      {/* ── Factor Matrix ──────────────────────────────────────────────────── */}
      {factorLoading ? (
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Factor Matrix</h2>
          <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
            Loading factor data…
          </div>
        </div>
      ) : factorData?.factorMatrices ? (
        <FactorMatrixPanel matrices={factorData.factorMatrices} />
      ) : null}

      {/* ── Ratio Trends ──────────────────────────────────────────────────────── */}
      {ratioLoading ? (
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Ratio Trends — Risk Appetite Analysis</h2>
          <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
            Loading ratio data…
          </div>
        </div>
      ) : ratioData?.ratios && ratioData?.riskAppetite ? (
        <RatioTrendsPanel
          ratios={ratioData.ratios}
          riskAppetite={ratioData.riskAppetite}
        />
      ) : null}

    </div>
  );
}
