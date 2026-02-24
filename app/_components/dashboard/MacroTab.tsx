// app/_components/dashboard/v5/MacroTab.tsx
'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { YieldCurveChart } from './macro/YieldCurveChart';
import { MacroTable } from './macro/MacroTable';
import { RRGScatter } from './macro/RRGScatter';
import { RRGControls } from './macro/RRGControls';
import { RRGTable } from './macro/RRGTable';

const fetcher = (url: string) => fetch(url).then(r => r.json());

export function MacroTab() {
  const [rrgView, setRRGView] = useState<'factors' | 'global'>('factors');
  
  const { data, error, isLoading } = useSWR('/api/v5/macro-data', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading macro data...</p>
          <p className="text-sm text-slate-500 mt-2">This may take 30-60 seconds</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Failed to load macro data
          </h3>
          <p className="text-sm text-slate-600 mb-4">
            {error.message || 'An unknown error occurred'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const currentRRGData = data.rrg[rrgView];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white shadow-lg">
        <h1 className="text-3xl font-bold mb-2">Macro & Yields</h1>
        <p className="text-blue-100">
          Track economic indicators, yield curves, and relative market rotation
        </p>
      </div>

      {/* Yield Curve Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <YieldCurveChart data={data.yieldCurve.data} />
        </div>
        <div className="lg:col-span-1">
          <MacroTable 
            fred={data.macroTable.fred}
            commodities={data.macroTable.commodities}
          />
        </div>
      </div>

      {/* RRG Section */}
      <div className="space-y-6">
        <RRGControls
          currentView={rrgView}
          onViewChange={setRRGView}
          benchmark={currentRRGData.benchmark}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RRGScatter
              positions={currentRRGData.positions}
              viewName={currentRRGData.name}
              benchmark={currentRRGData.benchmark}
            />
          </div>
          <div className="lg:col-span-1">
            <RRGTable positions={currentRRGData.positions} />
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600">
        <p>
          <span className="font-semibold">Data Sources:</span> FRED (Federal Reserve Economic Data) for yields and macro indicators, 
          Yahoo Finance for commodities and RRG calculations. 
          Data updated: {new Date(data.timestamp).toLocaleString('en-GB', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </p>
      </div>
    </div>
  );
}
