'use client';
// app/_components/dashboard/v5/heatmaps/MapsTab.tsx

import React, { useState } from 'react';
import useSWR from 'swr';
import dynamic from 'next/dynamic';



import SP500Heatmap   from './SP500Heatmap';
import ETFHeatmap     from './ETFHeatmap';
import ThematicHeatmap from './ThematicHeatmap';

// Dynamically import WorldMap to avoid SSR issues with react-simple-maps
const WorldMap = dynamic(() => import('./WorldMap'), { ssr: false });

const fetcher = (url: string) => fetch(url).then(r => r.json());

const SWR_OPTS = {
  revalidateOnFocus:     false,
  revalidateOnReconnect: false,
  provider:              () => new Map(),
};

type MapId = 'sp500' | 'etf' | 'thematic' | 'world';

const MAP_TABS: { id: MapId; label: string }[] = [
  { id: 'sp500',    label: 'S&P 500'   },
  { id: 'etf',      label: 'ETF Map'   },
  { id: 'thematic', label: 'Thematic'  },
  { id: 'world',    label: 'World Map' },
];

function LoadingCard({ label }: { label: string }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <div className="h-32 flex items-center justify-center text-slate-400 text-sm">
        Loading {label} data…
      </div>
    </div>
  );
}

function ErrorCard({ label }: { label: string }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <div className="h-32 flex items-center justify-center text-red-400 text-sm">
        Failed to load {label} data. Please try refreshing.
      </div>
    </div>
  );
}

export default function MapsTab() {
  const [activeMap, setActiveMap] = useState<MapId>('sp500');

  // Four independent SWR fetches — only the active one is shown but all fire on mount
  const { data: sp500Data,    error: sp500Err    } = useSWR('/api/v5/sp500-data',   fetcher, SWR_OPTS);
  const { data: etfData,      error: etfErr      } = useSWR('/api/v5/etf-map-data', fetcher, SWR_OPTS);
  const { data: thematicData, error: thematicErr } = useSWR('/api/v5/thematic-data',fetcher, SWR_OPTS);
  const { data: countryData,  error: countryErr  } = useSWR('/api/v5/country-data', fetcher, SWR_OPTS);

  return (
    <div className="space-y-5">
      {/* Map selector */}
      <div className="bg-white rounded-xl p-3 shadow-sm">
        <div className="flex gap-2">
          {MAP_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveMap(tab.id)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                activeMap === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Map 1: S&P 500 */}
      {activeMap === 'sp500' && (
        sp500Err    ? <ErrorCard label="S&P 500" />  :
        !sp500Data  ? <LoadingCard label="S&P 500" /> :
        <SP500Heatmap stocks={sp500Data.stocks} />
      )}

      {/* Map 2: ETF Categories */}
      {activeMap === 'etf' && (
        etfErr    ? <ErrorCard label="ETF Map" />  :
        !etfData  ? <LoadingCard label="ETF Map" /> :
        <ETFHeatmap returns={etfData.returns} />
      )}

      {/* Map 3: Thematic */}
      {activeMap === 'thematic' && (
        thematicErr    ? <ErrorCard label="Thematic" />  :
        !thematicData  ? <LoadingCard label="Thematic" /> :
        <ThematicHeatmap returns={thematicData.returns} />
      )}

      {/* Map 4: World */}
      {activeMap === 'world' && (
        countryErr    ? <ErrorCard label="World Map" />  :
        !countryData  ? <LoadingCard label="World Map" /> :
        <WorldMap
          countryReturns={countryData.countryReturns}
          tickerReturns={countryData.tickerReturns}
        />
      )}
    </div>
  );
}
