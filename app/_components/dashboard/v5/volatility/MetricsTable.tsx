// app/_components/dashboard/v5/volatility/MetricsTable.tsx
'use client';

import { useState } from 'react';

interface Metric {
  value: number;
  status: string;
  color: string;
  interpretation: string;
}

interface MetricsTableProps {
  metrics: Record<string, Metric>;
  weights: Record<string, number>;
  onWeightsChange?: (weights: Record<string, number>) => void;
}

// Tooltip content for each metric
const METRIC_TOOLTIPS: Record<string, string> = {
  VIX:   'CBOE Volatility Index — measures 30-day implied volatility of S&P 500 options. Often called the "fear gauge". Below 20 = calm; above 30 = stress; above 40 = crisis.',
  VIX3M: '3-Month VIX — measures 90-day implied volatility. If VIX > VIX3M the term structure is inverted, signalling acute near-term fear rather than longer-term concern.',
  VVIX:  'Volatility of VIX — measures how fast VIX itself is moving. High VVIX (>110) while VIX is low signals hidden tail risk and complacency. Think of it as the "fear of fear" index.',
  MOVE:  'Merrill Lynch Option Volatility Estimate — the bond market equivalent of VIX. Measures implied volatility of US Treasury options. High MOVE signals rate uncertainty and fixed income stress.',
  SKEW:  'CBOE SKEW Index — measures the cost of far out-of-the-money puts vs calls. High SKEW (>140) means investors are paying up for crash protection, signalling elevated tail risk even when VIX appears calm.',
};

export function MetricsTable({ metrics, weights, onWeightsChange }: MetricsTableProps) {
  const metricOrder = ['VIX', 'VIX3M', 'VVIX', 'MOVE', 'SKEW'];

  // Local editable weight state
  const [localWeights, setLocalWeights] = useState<Record<string, number>>(weights);
  // Track which cell is being edited
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');

  const totalWeight = Object.values(localWeights).reduce((a, b) => a + b, 0);
  const isValid = totalWeight === 100;

  const handleEditStart = (key: string) => {
    setEditingKey(key);
    setEditingValue(String(localWeights[key]));
  };

  const handleEditCommit = (key: string) => {
    const parsed = parseInt(editingValue, 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed <= 100) {
      const updated = { ...localWeights, [key]: parsed };
      setLocalWeights(updated);
      onWeightsChange?.(updated);
    }
    setEditingKey(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent, key: string) => {
    if (e.key === 'Enter') handleEditCommit(key);
    if (e.key === 'Escape') setEditingKey(null);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-semibold text-slate-900">
          Individual Volatility Metrics
        </h3>
        <span
          className="text-xs text-slate-400 cursor-help"
          title="Click any weight % to edit it. Weights must sum to 100% for the composite score to recalculate."
        >
          ⓘ
        </span>
      </div>

      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-slate-200">
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
              Weight (%)
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
              Metric
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
              Value
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
              Interpretation
            </th>
          </tr>
        </thead>
        <tbody>
          {metricOrder.map(key => {
            const metric = metrics[key];
            if (!metric) return null;

            const weightKey = key.toLowerCase().replace('_', '');
            const isEditing = editingKey === weightKey;

            return (
              <tr key={key} className="border-b border-slate-100 hover:bg-slate-50">

                {/* Editable weight cell */}
                <td className="px-4 py-3">
                  {isEditing ? (
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={editingValue}
                      onChange={e => setEditingValue(e.target.value)}
                      onBlur={() => handleEditCommit(weightKey)}
                      onKeyDown={e => handleKeyDown(e, weightKey)}
                      autoFocus
                      className="w-14 text-sm font-medium text-slate-700 border border-blue-400 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  ) : (
                    <button
                      onClick={() => handleEditStart(weightKey)}
                      className={`text-sm font-medium px-2 py-0.5 rounded transition-colors hover:bg-blue-50 hover:text-blue-700 ${
                        isValid ? 'text-slate-700' : 'text-red-500'
                      }`}
                      title="Click to edit weight"
                    >
                      {localWeights[weightKey]}%
                    </button>
                  )}
                </td>

                {/* Metric name with dotted underline tooltip */}
                <td className="px-4 py-3">
                  <span
                    className="font-semibold text-slate-900 cursor-help border-b border-dotted border-slate-400"
                    title={METRIC_TOOLTIPS[key]}
                  >
                    {key}
                  </span>
                </td>

                <td className="px-4 py-3 text-slate-900">{metric.value.toFixed(1)}</td>

                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: metric.color }}
                    />
                    <span className="text-sm font-medium" style={{ color: metric.color }}>
                      {metric.status}
                    </span>
                  </div>
                </td>

                <td className="px-4 py-3 text-sm text-slate-600">
                  {metric.interpretation}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Total weight footer */}
      <div className="mt-4 border-t-2 border-slate-200 pt-3">
        <div className="px-4 py-2 flex items-center gap-3">
          <div className="w-[100px]">
            <span className={`text-lg font-bold ${isValid ? 'text-green-600' : 'text-red-600'}`}>
              {totalWeight}%
            </span>
          </div>
          <div className="flex-1">
            <span className={`text-sm font-medium ${isValid ? 'text-slate-700' : 'text-red-600'}`}>
              Total Weight {isValid ? '✓' : '⚠️ Must equal 100% to update score'}
            </span>
          </div>
          {!isValid && (
            <button
              onClick={() => {
                setLocalWeights(weights);
                onWeightsChange?.(weights);
              }}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Reset defaults
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
