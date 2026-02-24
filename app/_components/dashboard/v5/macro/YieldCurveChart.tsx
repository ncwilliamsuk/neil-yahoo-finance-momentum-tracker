// app/_components/dashboard/v5/macro/YieldCurveChart.tsx
'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { getSeriesNames } from '@/lib/v5/fred';

interface YieldCurveChartProps {
  data: Array<{
    date: string;
    [key: string]: number | string;
  }>;
  region: 'US' | 'UK';
  onRegionChange: (region: 'US' | 'UK') => void;
}

// Color definitions for all series
const SERIES_COLORS: Record<string, string> = {
  // Yields
  yield_3m: '#64748b',
  yield_2y: '#0ea5e9',
  yield_5y: '#8b5cf6',
  yield_10y: '#3b82f6',
  yield_30y: '#06b6d4',
  real_rate: '#10b981',
  
  // Spreads
  spread_10y3m: '#f59e0b',
  spread_10y2y: '#f97316',
  
  // NEW indicators
  breakeven_10y: '#14b8a6',  // Teal
  credit_spread: '#f43f5e',  // Rose
  manufacturing: '#3b82f6',   // Blue
  retail_sales: '#a855f7',    // Purple
  house_prices: '#f59e0b',    // Amber
};

export function YieldCurveChart({ data, region, onRegionChange }: YieldCurveChartProps) {
  // Initialize visible series - NEW indicators default to OFF
  const [visibleSeries, setVisibleSeries] = useState<Set<string>>(
    new Set(['yield_3m', 'yield_10y', 'real_rate'])
  );

  const toggleSeries = (seriesKey: string) => {
    const newVisible = new Set(visibleSeries);
    if (newVisible.has(seriesKey)) {
      newVisible.delete(seriesKey);
    } else {
      newVisible.add(seriesKey);
    }
    setVisibleSeries(newVisible);
  };

  const seriesNames = getSeriesNames(region);

  // Format date for axis (DD MMM)
  const formatDateAxis = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-GB', { month: 'short' });
    return `${day} ${month}`;
  };

  // Format date for tooltip (DD/MM/YYYY)
  const formatDateTooltip = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Custom tooltip - ONLY show visible series
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const visiblePayload = payload.filter((entry: any) => visibleSeries.has(entry.dataKey));

    if (visiblePayload.length === 0) return null;

    return (
      <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
        <p className="font-semibold text-slate-900 mb-2">
          {formatDateTooltip(label)}
        </p>
        {visiblePayload.map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-slate-600">{seriesNames[entry.dataKey]}:</span>
            <span className="font-medium text-slate-900">
              {entry.value != null ? entry.value.toFixed(2) : 'N/A'}%
            </span>
          </div>
        ))}
      </div>
    );
  };

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          Yield Curve
        </h3>
        <div className="flex items-center justify-center h-64 text-slate-500">
          No data available
        </div>
      </div>
    );
  }

  // All available series keys
  const allSeriesKeys = Object.keys(SERIES_COLORS);

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            {region} Yield Curve & Economic Indicators
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            Treasury yields, spreads, and economic data (1 year history)
          </p>
        </div>

        {/* US/UK Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => onRegionChange('US')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              region === 'US'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            🇺🇸 US
          </button>
          <button
            onClick={() => onRegionChange('UK')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              region === 'UK'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            🇬🇧 UK
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          
          <XAxis
            dataKey="date"
            tickFormatter={formatDateAxis}
            stroke="#64748b"
            style={{ fontSize: '12px' }}
            interval="preserveStart"
            ticks={data
              .filter((d) => {
                const date = new Date(d.date);
                return date.getDate() === 1;
              })
              .map(d => d.date)
            }
          />
          
          <YAxis
            stroke="#64748b"
            style={{ fontSize: '12px' }}
            tickFormatter={(value) => `${value.toFixed(1)}%`}
          />
          
          <Tooltip content={<CustomTooltip />} />
          
          {/* Render lines for all series */}
          {allSeriesKeys.map((seriesKey) => {
            const hasData = data.some(d => d[seriesKey] !== undefined && d[seriesKey] !== null);
            const isVisible = visibleSeries.has(seriesKey);
            
            if (!hasData) return null;
            
            return (
              <Line
                key={seriesKey}
                type="monotone"
                dataKey={seriesKey}
                stroke={SERIES_COLORS[seriesKey]}
                strokeWidth={isVisible ? 2 : 0}
                dot={false}
                connectNulls
                hide={!isVisible}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>

      {/* GROUPED CHECKBOXES */}
      <div className="flex flex-wrap gap-6 mb-2 text-sm border-t border-slate-200 pt-4 mt-4">
        
        {/* GROUP 1: YIELDS */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mr-1">Yields:</span>
          
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input 
              type="checkbox" 
              checked={visibleSeries.has('yield_3m')} 
              onChange={() => toggleSeries('yield_3m')} 
              className="w-3.5 h-3.5 rounded" 
            />
            <span className="text-slate-700">3M</span>
          </label>
          
          {region === 'US' && (
            <>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={visibleSeries.has('yield_2y')} 
                  onChange={() => toggleSeries('yield_2y')} 
                  className="w-3.5 h-3.5 rounded" 
                />
                <span className="text-slate-700">2Y</span>
              </label>
              
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={visibleSeries.has('yield_5y')} 
                  onChange={() => toggleSeries('yield_5y')} 
                  className="w-3.5 h-3.5 rounded" 
                />
                <span className="text-slate-700">5Y</span>
              </label>
              
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={visibleSeries.has('yield_30y')} 
                  onChange={() => toggleSeries('yield_30y')} 
                  className="w-3.5 h-3.5 rounded" 
                />
                <span className="text-slate-700">30Y</span>
              </label>
            </>
          )}
          
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input 
              type="checkbox" 
              checked={visibleSeries.has('yield_10y')} 
              onChange={() => toggleSeries('yield_10y')} 
              className="w-3.5 h-3.5 rounded" 
            />
            <span className="text-slate-700">10Y</span>
          </label>
          
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input 
              type="checkbox" 
              checked={visibleSeries.has('real_rate')} 
              onChange={() => toggleSeries('real_rate')} 
              className="w-3.5 h-3.5 rounded" 
            />
            <span className="text-emerald-700 font-medium">Real Rate</span>
          </label>
          
          {/* NEW */}
          {data.some(d => d.breakeven_10y !== undefined) && (
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input 
                type="checkbox" 
                checked={visibleSeries.has('breakeven_10y')} 
                onChange={() => toggleSeries('breakeven_10y')} 
                className="w-3.5 h-3.5 rounded" 
              />
              <span className="text-teal-700 font-medium">10Y Breakeven</span>
            </label>
          )}
        </div>
        
        {/* Separator */}
        <div className="w-px h-6 bg-slate-300" />
        
        {/* GROUP 2: SPREADS */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mr-1">Spreads:</span>
          
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input 
              type="checkbox" 
              checked={visibleSeries.has('spread_10y3m')} 
              onChange={() => toggleSeries('spread_10y3m')} 
              className="w-3.5 h-3.5 rounded" 
            />
            <span className="text-slate-700">10Y-3M</span>
          </label>
          
          {region === 'US' && (
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input 
                type="checkbox" 
                checked={visibleSeries.has('spread_10y2y')} 
                onChange={() => toggleSeries('spread_10y2y')} 
                className="w-3.5 h-3.5 rounded" 
              />
              <span className="text-slate-700">10Y-2Y</span>
            </label>
          )}
          
          {/* NEW */}
          {data.some(d => d.credit_spread !== undefined) && (
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input 
                type="checkbox" 
                checked={visibleSeries.has('credit_spread')} 
                onChange={() => toggleSeries('credit_spread')} 
                className="w-3.5 h-3.5 rounded" 
              />
              <span className="text-rose-700 font-medium">Credit Spread</span>
            </label>
          )}
        </div>
        
        {/* Separator */}
        <div className="w-px h-6 bg-slate-300" />
        
        {/* GROUP 3: ECONOMIC INDICATORS */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mr-1">Economic:</span>
          
          {/* NEW */}
          {data.some(d => d.manufacturing !== undefined) && (
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input 
                type="checkbox" 
                checked={visibleSeries.has('manufacturing')} 
                onChange={() => toggleSeries('manufacturing')} 
                className="w-3.5 h-3.5 rounded" 
              />
              <span className="text-blue-700 font-medium">Manufacturing</span>
            </label>
          )}
          
          {data.some(d => d.retail_sales !== undefined) && (
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input 
                type="checkbox" 
                checked={visibleSeries.has('retail_sales')} 
                onChange={() => toggleSeries('retail_sales')} 
                className="w-3.5 h-3.5 rounded" 
              />
              <span className="text-purple-700 font-medium">Retail Sales</span>
            </label>
          )}
          
          {data.some(d => d.house_prices !== undefined) && (
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input 
                type="checkbox" 
                checked={visibleSeries.has('house_prices')} 
                onChange={() => toggleSeries('house_prices')} 
                className="w-3.5 h-3.5 rounded" 
              />
              <span className="text-amber-700 font-medium">House Prices</span>
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
