// app/_components/dashboard/ControlsPanel.tsx

'use client';

import { getCategories } from '@/lib/etf/etfList';
import { useState, useEffect } from 'react';

interface ControlsPanelProps {
  weights: { m3: number; m6: number; m12: number };
  onWeightsChange: (weights: { m3: number; m6: number; m12: number }) => void;
  calculationMode: 'standard' | 'risk-adj';
  onCalculationModeChange: (mode: 'standard' | 'risk-adj') => void;
  removeLatestMonth: boolean;
  onRemoveLatestMonthChange: (remove: boolean) => void;
  maFilter: boolean;
  onMaFilterChange: (filter: boolean) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (category: string) => void;
  labelFilter: string;
  onLabelFilterChange: (label: string) => void;
  selectedCount: number;
  onCompareClick: () => void;
  compareMode?: boolean;
}

type WeightPreset = '33,33,34' | '0,0,100' | '20,30,50' | '50,30,20' | 'custom';

export function ControlsPanel({
  weights,
  onWeightsChange,
  calculationMode,
  onCalculationModeChange,
  removeLatestMonth,
  onRemoveLatestMonthChange,
  maFilter,
  onMaFilterChange,
  searchTerm,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  labelFilter,
  onLabelFilterChange,
  selectedCount,
  onCompareClick,
  compareMode = false
}: ControlsPanelProps) {
  const [activePreset, setActivePreset] = useState<WeightPreset>('33,33,34');
  const categories = getCategories();

  const handlePresetClick = (preset: WeightPreset) => {
    if (preset === 'custom') return;

    const [m3, m6, m12] = preset.split(',').map(Number);
    onWeightsChange({ m3, m6, m12 });
    setActivePreset(preset);
  };

  const handleSliderChange = (period: 'm3' | 'm6' | 'm12', value: number) => {
    const newWeights = { ...weights, [period]: value };
    
    // Auto-adjust other sliders to maintain sum of 100
    const total = newWeights.m3 + newWeights.m6 + newWeights.m12;
    if (total !== 100) {
      const diff = 100 - total;
      
      if (period === 'm3') {
        const otherTotal = newWeights.m6 + newWeights.m12;
        if (otherTotal > 0) {
          const ratio6 = newWeights.m6 / otherTotal;
          const ratio12 = newWeights.m12 / otherTotal;
          newWeights.m6 = Math.round(newWeights.m6 + (diff * ratio6));
          newWeights.m12 = Math.round(newWeights.m12 + (diff * ratio12));
          
          // Final adjustment
          const finalTotal = newWeights.m3 + newWeights.m6 + newWeights.m12;
          if (finalTotal !== 100) {
            newWeights.m12 += (100 - finalTotal);
          }
        }
      } else if (period === 'm6') {
        const otherTotal = newWeights.m3 + newWeights.m12;
        if (otherTotal > 0) {
          const ratio3 = newWeights.m3 / otherTotal;
          const ratio12 = newWeights.m12 / otherTotal;
          newWeights.m3 = Math.round(newWeights.m3 + (diff * ratio3));
          newWeights.m12 = Math.round(newWeights.m12 + (diff * ratio12));
          
          const finalTotal = newWeights.m3 + newWeights.m6 + newWeights.m12;
          if (finalTotal !== 100) {
            newWeights.m12 += (100 - finalTotal);
          }
        }
      } else {
        const otherTotal = newWeights.m3 + newWeights.m6;
        if (otherTotal > 0) {
          const ratio3 = newWeights.m3 / otherTotal;
          const ratio6 = newWeights.m6 / otherTotal;
          newWeights.m3 = Math.round(newWeights.m3 + (diff * ratio3));
          newWeights.m6 = Math.round(newWeights.m6 + (diff * ratio6));
          
          const finalTotal = newWeights.m3 + newWeights.m6 + newWeights.m12;
          if (finalTotal !== 100) {
            newWeights.m6 += (100 - finalTotal);
          }
        }
      }
    }
    
    onWeightsChange(newWeights);
    setActivePreset('custom');
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm mb-5">
      {/* Row 1: Toggle Controls */}
      <div className="grid grid-cols-5 gap-5 mb-5">
        {/* Calculation Mode */}
        <div className="flex flex-col">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Calculation Mode
          </label>
          <div className="flex gap-2 h-10">
            <button
              onClick={() => onCalculationModeChange('standard')}
              className={`flex-1 px-4 border rounded-lg text-sm font-medium transition-all ${
                calculationMode === 'standard'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Standard
            </button>
            <button
              onClick={() => onCalculationModeChange('risk-adj')}
              className={`flex-1 px-4 border rounded-lg text-sm font-medium transition-all ${
                calculationMode === 'risk-adj'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Risk-Adj
            </button>
          </div>
          <small className="mt-1.5 text-xs text-slate-400">
            {calculationMode === 'standard' ? 'Price-only percentiles' : 'Risk-adjusted (Sharpe ratio)'}
          </small>
        </div>

        {/* Remove Latest Month */}
        <div className="flex flex-col">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Remove Latest Month
          </label>
          <div className="flex gap-2 h-10">
            <button
              onClick={() => onRemoveLatestMonthChange(false)}
              className={`flex-1 px-4 border rounded-lg text-sm font-medium transition-all ${
                !removeLatestMonth
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Include All
            </button>
            <button
              onClick={() => onRemoveLatestMonthChange(true)}
              className={`flex-1 px-4 border rounded-lg text-sm font-medium transition-all ${
                removeLatestMonth
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Remove Latest
            </button>
          </div>
          <small className="mt-1.5 text-xs text-slate-400">
            {removeLatestMonth ? 'Using months 1-4, 1-7, 1-13' : 'Using months 0-3, 0-6, 0-12'}
          </small>
        </div>

        {/* 200-Day MA Filter */}
        <div className="flex flex-col">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            200-Day MA Filter
          </label>
          <div className="flex gap-2 h-10">
            <button
              onClick={() => onMaFilterChange(false)}
              className={`flex-1 px-4 border rounded-lg text-sm font-medium transition-all ${
                !maFilter
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Show All
            </button>
            <button
              onClick={() => onMaFilterChange(true)}
              className={`flex-1 px-4 border rounded-lg text-sm font-medium transition-all ${
                maFilter
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Apply Filter
            </button>
          </div>
          <small className="mt-1.5 text-xs text-slate-400">
            {maFilter ? 'Only ETFs above 200-day MA' : 'No filter applied'}
          </small>
        </div>

        {/* Search */}
        <div className="flex flex-col">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Search Symbol
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="e.g., CSP1, SWDA..."
            className="w-full h-10 px-4 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white transition-all focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          />
          <small className="mt-1.5 text-xs text-slate-400">
            {searchTerm ? `Filtering by "${searchTerm}"` : 'All ETFs'}
          </small>
        </div>

        {/* Compare Selected */}
        <div className="flex flex-col">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Compare Selected
          </label>
          <button
            onClick={onCompareClick}
            className={`w-full h-10 px-6 border-none rounded-lg text-sm font-semibold cursor-pointer transition-all shadow-sm ${
              compareMode
                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {compareMode ? 'Show All ETFs' : selectedCount > 0 ? `Compare (${selectedCount})` : 'Compare Selected'}
          </button>
          <small className="mt-1.5 text-xs text-slate-400">
            {compareMode ? 'Exit compare mode' : selectedCount > 0 ? `${selectedCount} selected` : 'Select ETFs below'}
          </small>
        </div>
      </div>

      {/* Row 2: Period Weights */}
      <div className="mb-5">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Period Weights
        </label>

        {/* Presets */}
        <div className="flex items-center mb-4">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mr-3">
            Presets:
          </span>
          <div className="flex gap-2 flex-wrap">
            {[
              { label: 'Equal (33/33/34)', value: '33,33,34' as WeightPreset },
              { label: '12M Only (0/0/100)', value: '0,0,100' as WeightPreset },
              { label: 'Trend (20/30/50)', value: '20,30,50' as WeightPreset },
              { label: 'Recent (50/30/20)', value: '50,30,20' as WeightPreset },
              { label: 'Custom', value: 'custom' as WeightPreset }
            ].map(preset => (
              <button
                key={preset.value}
                onClick={() => handlePresetClick(preset.value)}
                className={`px-3 py-1.5 border rounded-md text-xs font-medium transition-all ${
                  activePreset === preset.value
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sliders */}
        <div className="grid grid-cols-3 gap-6">
          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-600">3 Month</span>
              <span className="text-sm font-bold text-blue-600">{weights.m3}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={weights.m3}
              onChange={(e) => handleSliderChange('m3', parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-600">6 Month</span>
              <span className="text-sm font-bold text-blue-600">{weights.m6}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={weights.m6}
              onChange={(e) => handleSliderChange('m6', parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-600">12 Month</span>
              <span className="text-sm font-bold text-blue-600">{weights.m12}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={weights.m12}
              onChange={(e) => handleSliderChange('m12', parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>
        </div>

        <small className="block mt-2 text-xs text-slate-400">
          Scores recalculate in real-time
        </small>
      </div>

      {/* Row 3: Filters */}
      <div className="grid grid-cols-2 gap-5">
        <div className="flex flex-col">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Category
          </label>
          <select
            value={categoryFilter}
            onChange={(e) => onCategoryFilterChange(e.target.value)}
            className="w-full h-10 px-4 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white cursor-pointer transition-all focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <small className="mt-1.5 text-xs text-slate-400">
            {categoryFilter === 'all' ? 'All categories' : categoryFilter}
          </small>
        </div>

        <div className="flex flex-col">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Label
          </label>
          <select
            value={labelFilter}
            onChange={(e) => onLabelFilterChange(e.target.value)}
            className="w-full h-10 px-4 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white cursor-pointer transition-all focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">All Labels</option>
            <option value="LEADER">LEADER</option>
            <option value="EMERGING">EMERGING</option>
            <option value="RECOVERING">RECOVERING</option>
            <option value="FADING">FADING</option>
            <option value="LAGGARD">LAGGARD</option>
          </select>
          <small className="mt-1.5 text-xs text-slate-400">
            {labelFilter === 'all' ? 'All labels' : labelFilter}
          </small>
        </div>
      </div>
    </div>
  );
}