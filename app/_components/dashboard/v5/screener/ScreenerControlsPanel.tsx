'use client';

// app/_components/dashboard/v5/screener/ScreenerControlsPanel.tsx

import { useState }          from 'react';
import { Universe }          from '@/lib/v5/etfTypes';
import { getCategories }     from '@/lib/v5/etfList';

interface ScreenerControlsPanelProps {
  universe:                Universe;
  weights:                 { m3: number; m6: number; m12: number };
  onWeightsChange:         (weights: { m3: number; m6: number; m12: number }) => void;
  calculationMode:         'standard' | 'risk-adj';
  onCalculationModeChange: (mode: 'standard' | 'risk-adj') => void;
  removeLatestMonth:       boolean;
  onRemoveLatestMonthChange:(remove: boolean) => void;
  maFilter:                boolean;
  onMaFilterChange:        (filter: boolean) => void;
  searchTerm:              string;
  onSearchChange:          (term: string) => void;
  categoryFilter:          string;
  onCategoryFilterChange:  (category: string) => void;
  labelFilter:             string;
  onLabelFilterChange:     (label: string) => void;
  selectedCount:           number;
  onCompareClick:          () => void;
  compareMode:             boolean;
}

// All presets including the new 1M Only
type WeightPreset = '33,33,34' | '100,0,0' | '0,0,100' | '20,30,50' | '50,30,20' | 'custom';

const PRESETS: { label: string; value: WeightPreset; tooltip: string }[] = [
  {
    label:   'Equal',
    value:   '33,33,34',
    tooltip: 'Equal weighting across 3M, 6M and 12M periods (33/33/34)',
  },
  {
    label:   '3M Only',
    value:   '100,0,0',
    tooltip: 'Full weight on the 3-month period — emphasises very recent momentum',
  },
  {
    label:   '12M Only',
    value:   '0,0,100',
    tooltip: 'Full weight on the 12-month period — classic long-term momentum',
  },
  {
    label:   'Trend',
    value:   '20,30,50',
    tooltip: 'Trend-following bias: heavier weight on longer periods (20/30/50)',
  },
  {
    label:   'Recent',
    value:   '50,30,20',
    tooltip: 'Recency bias: heavier weight on shorter periods (50/30/20)',
  },
  {
    label:   'Custom',
    value:   'custom',
    tooltip: 'Manually drag the sliders below to set your own weighting',
  },
];

export function ScreenerControlsPanel({
  universe,
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
  compareMode,
}: ScreenerControlsPanelProps) {
  const [activePreset, setActivePreset] = useState<WeightPreset>('33,33,34');

  // Categories come from the V5 list for the current universe
  const categories = getCategories(universe);

  const handlePresetClick = (preset: WeightPreset) => {
    if (preset === 'custom') {
      setActivePreset('custom');
      return;
    }
    const [m3, m6, m12] = preset.split(',').map(Number);
    onWeightsChange({ m3, m6, m12 });
    setActivePreset(preset);
  };

  const handleSliderChange = (period: 'm3' | 'm6' | 'm12', value: number) => {
    const newWeights = { ...weights, [period]: value };

    // Auto-balance the other two sliders proportionally to maintain sum = 100
    const total = newWeights.m3 + newWeights.m6 + newWeights.m12;
    if (total !== 100) {
      const diff = 100 - total;

      if (period === 'm3') {
        const otherTotal = newWeights.m6 + newWeights.m12;
        if (otherTotal > 0) {
          const r6  = newWeights.m6  / otherTotal;
          const r12 = newWeights.m12 / otherTotal;
          newWeights.m6  = Math.round(newWeights.m6  + diff * r6);
          newWeights.m12 = Math.round(newWeights.m12 + diff * r12);
          const ft = newWeights.m3 + newWeights.m6 + newWeights.m12;
          if (ft !== 100) newWeights.m12 += (100 - ft);
        }
      } else if (period === 'm6') {
        const otherTotal = newWeights.m3 + newWeights.m12;
        if (otherTotal > 0) {
          const r3  = newWeights.m3  / otherTotal;
          const r12 = newWeights.m12 / otherTotal;
          newWeights.m3  = Math.round(newWeights.m3  + diff * r3);
          newWeights.m12 = Math.round(newWeights.m12 + diff * r12);
          const ft = newWeights.m3 + newWeights.m6 + newWeights.m12;
          if (ft !== 100) newWeights.m12 += (100 - ft);
        }
      } else {
        const otherTotal = newWeights.m3 + newWeights.m6;
        if (otherTotal > 0) {
          const r3 = newWeights.m3 / otherTotal;
          const r6 = newWeights.m6 / otherTotal;
          newWeights.m3 = Math.round(newWeights.m3 + diff * r3);
          newWeights.m6 = Math.round(newWeights.m6 + diff * r6);
          const ft = newWeights.m3 + newWeights.m6 + newWeights.m12;
          if (ft !== 100) newWeights.m6 += (100 - ft);
        }
      }
    }

    onWeightsChange(newWeights);
    setActivePreset('custom');
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">

      {/* Row 1: Toggle controls */}
      <div className="grid grid-cols-5 gap-5 mb-5">

        {/* Calculation Mode */}
        <div className="flex flex-col">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Calculation Mode
          </label>
          <div className="flex gap-2 h-10">
            <button
              onClick={() => onCalculationModeChange('standard')}
              title="Rank ETFs by raw percentile returns across the selected periods"
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
              title="Rank ETFs by true Sharpe ratio (excess return over SONIA ÷ volatility). Favours consistent returns over volatile ones."
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
            {calculationMode === 'standard'
              ? 'Raw return percentiles'
              : 'Sharpe ratio percentiles (SONIA)'}
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
              title="Use standard periods: 0–3M, 0–6M, 0–12M"
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
              title="Skip the most recent month to reduce noise from very recent price moves. Uses periods: 1–4M, 1–7M, 1–13M"
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
            {removeLatestMonth ? 'Periods: 1–4M, 1–7M, 1–13M' : 'Periods: 0–3M, 0–6M, 0–12M'}
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
              title="Show all ETFs regardless of their position relative to the 200-day moving average"
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
              title="Only show ETFs currently trading above their 200-day moving average — a common trend-following filter"
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
            {maFilter ? 'Only ETFs above 200-day MA' : 'No MA filter applied'}
          </small>
        </div>

        {/* Search */}
        <div className="flex flex-col">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Search
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Ticker or name..."
            className="w-full h-10 px-4 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
          />
          <small className="mt-1.5 text-xs text-slate-400">
            {searchTerm ? `Filtering by "${searchTerm}"` : 'Search all ETFs'}
          </small>
        </div>

        {/* Compare Selected */}
        <div className="flex flex-col">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Compare Selected
          </label>
          <button
            onClick={onCompareClick}
            title={
              compareMode
                ? 'Exit compare mode and show all ETFs'
                : selectedCount > 0
                ? `Compare ${selectedCount} selected ETFs side by side`
                : 'Select ETFs using the checkboxes in the table below'
            }
            className={`w-full h-10 px-6 rounded-lg text-sm font-semibold transition-all shadow-sm ${
              compareMode
                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {compareMode
              ? 'Show All ETFs'
              : selectedCount > 0
              ? `Compare (${selectedCount})`
              : 'Compare Selected'}
          </button>
          <small className="mt-1.5 text-xs text-slate-400">
            {compareMode
              ? 'Exit compare mode'
              : selectedCount > 0
              ? `${selectedCount} selected`
              : 'Select ETFs below'}
          </small>
        </div>

      </div>

      {/* Row 2: Period Weights */}
      <div className="mb-5">
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
          Period Weights
        </label>

        {/* Presets */}
        <div className="flex items-center mb-4 flex-wrap gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide mr-1">
            Presets:
          </span>
          {PRESETS.map(preset => (
            <button
              key={preset.value}
              onClick={() => handlePresetClick(preset.value)}
              title={preset.tooltip}
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

        {/* Sliders */}
        <div className="grid grid-cols-3 gap-6">
          {(
            [
              { key: 'm3',  label: '3 Month',  tooltip: 'Weight applied to the 3-month return when calculating the momentum score' },
              { key: 'm6',  label: '6 Month',  tooltip: 'Weight applied to the 6-month return when calculating the momentum score' },
              { key: 'm12', label: '12 Month', tooltip: 'Weight applied to the 12-month return when calculating the momentum score' },
            ] as const
          ).map(({ key, label, tooltip }) => (
            <div key={key} className="flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <span
                  className="text-sm font-medium text-slate-600 cursor-help"
                  title={tooltip}
                >
                  {label}
                </span>
                <span className="text-sm font-bold text-blue-600">{weights[key]}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={weights[key]}
                onChange={e => handleSliderChange(key, parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
          ))}
        </div>

        <small className="block mt-2 text-xs text-slate-400">
          Weights must sum to 100% — adjusting one slider auto-balances the others
        </small>
      </div>

      {/* Row 3: Filters */}
      <div className="grid grid-cols-2 gap-5">

        {/* Category */}
        <div className="flex flex-col">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Category
          </label>
          <select
            value={categoryFilter}
            onChange={e => onCategoryFilterChange(e.target.value)}
            className="w-full h-10 px-4 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white cursor-pointer focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <small className="mt-1.5 text-xs text-slate-400">
            {categoryFilter === 'all' ? 'All categories shown' : `Filtering: ${categoryFilter}`}
          </small>
        </div>

        {/* Label */}
        <div className="flex flex-col">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Momentum Label
          </label>
          <select
            value={labelFilter}
            onChange={e => onLabelFilterChange(e.target.value)}
            className="w-full h-10 px-4 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white cursor-pointer focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
          >
            <option value="all">All Labels</option>
            <option value="LEADER"    title="12M > 15%, 3M > 5%, 1M > 1% — strong consistent uptrend">LEADER</option>
            <option value="EMERGING"  title="12M < 5%, 3M > 4%, 1M > 3% — new uptrend after weak long-term">EMERGING</option>
            <option value="RECOVERING"title="12M < -10%, 3M > -1%, 1M > 2% — bouncing from severe losses">RECOVERING</option>
            <option value="FADING"    title="12M > 10%, 3M < 2%, 1M < -2% — momentum weakening after strong run">FADING</option>
            <option value="LAGGARD"   title="12M < -5%, 3M < -3%, 1M < -1% — consistent downtrend">LAGGARD</option>
          </select>
          <small className="mt-1.5 text-xs text-slate-400">
            {labelFilter === 'all' ? 'All labels shown' : `Filtering: ${labelFilter}`}
          </small>
        </div>

      </div>
    </div>
  );
}
