// app/_components/dashboard/v5/MacroTab.tsx
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { YieldCurveChart } from './macro/YieldCurveChart';
import { MacroTable } from './macro/MacroTable';
import { RRGScatter } from './macro/RRGScatter';
import { RRGControls } from './macro/RRGControls';
import { RRGTable } from './macro/RRGTable';
import { RRGTimeline } from './macro/RRGTimeline';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function MacroTab() {
  const [region, setRegion] = useState<'US' | 'UK'>('US');
  const [rrgView, setRRGView] = useState<'sectors' | 'factors' | 'global'>('sectors');
  const [tailLength, setTailLength] = useState(2);
  const [hiddenTickers, setHiddenTickers] = useState<Set<string>>(new Set());
  const [timeOffset, setTimeOffset] = useState(0);
  
  // Fetch both US and UK data
  const { data: usData, error: usError, isLoading: usLoading } = useSWR('/api/v5/macro-data?region=US', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true
  });
  
  const { data: ukData, error: ukError, isLoading: ukLoading } = useSWR('/api/v5/macro-data?region=UK', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true
  });
  
  // Select data based on current region
  const data = region === 'US' ? usData : ukData;
  const error = region === 'US' ? usError : ukError;
  const isLoading = usLoading || ukLoading;

  const toggleTicker = (ticker: string) => {
    const newHidden = new Set(hiddenTickers);
    if (newHidden.has(ticker)) {
      newHidden.delete(ticker);
    } else {
      newHidden.add(ticker);
    }
    setHiddenTickers(newHidden);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading macro data...</p>
          <p className="text-sm text-slate-500 mt-2">
            Fetching US and UK data... This may take 2-3 minutes
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Failed to load macro data</h3>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data || !data.rrg || !data.rrg[rrgView]) return null;

  const currentRRGData = data.rrg[rrgView];

  return (
    <div className="space-y-6 p-6">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">Macro & Yields</h1>
        <p className="text-blue-100">Track economic indicators, yield curves, and relative market rotation</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <YieldCurveChart data={data.yieldCurve.data} region={region} onRegionChange={setRegion} />
        </div>
        <div className="lg:col-span-1">
          <MacroTable fred={data.macroTable.fred} marketIndicators={data.macroTable.marketIndicators} region={region} />
        </div>
      </div>

      <div className="space-y-6">
        <RRGControls
          currentView={rrgView}
          onViewChange={(view) => {
            setRRGView(view);
            setHiddenTickers(new Set());
            setTimeOffset(0);
          }}
          benchmark={currentRRGData.benchmark}
          tailLength={tailLength}
          onTailLengthChange={setTailLength}
        />

        <RRGTimeline
          timeOffset={timeOffset}
          onTimeOffsetChange={setTimeOffset}
          maxWeeksBack={52}
        />

        <RRGScatter
          key={`${rrgView}-${tailLength}-${timeOffset}`}
          positions={currentRRGData.positions}
          viewName={currentRRGData.name}
          benchmark={currentRRGData.benchmark}
          hiddenTickers={hiddenTickers}
          tailLength={tailLength}
          timeOffset={timeOffset}
        />

        <RRGTable 
          positions={currentRRGData.positions}
          view={rrgView}
          hiddenTickers={hiddenTickers}
          onToggleTicker={toggleTicker}
        />
      </div>
    </div>
  );
}
