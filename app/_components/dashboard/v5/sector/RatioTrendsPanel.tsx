'use client';

// app/_components/dashboard/v5/sector/RatioTrendsPanel.tsx
// Section 5: Ratio Trends — sparkline cards with tab filter + risk appetite summary

import React, { useState } from 'react';
import { RatioSeries, RatioTab } from '@/lib/v5/sectors';

const TABS: RatioTab[] = ['All', 'Sector', 'Global', 'Size & Style', 'Commodity', 'Credit', 'Themes'];

interface Props {
  ratios: RatioSeries[];
  riskAppetite: {
    riskOnCount: number;
    total:       number;
    label:       string;
    detail:      string;
  };
}

function SignalBadge({ signal }: { signal: RatioSeries['signal'] }) {
  if (signal === 'risk-on') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
        Risk-On
      </span>
    );
  }
  if (signal === 'risk-off') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
        Risk-Off
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700">
      <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" />
      Neutral
    </span>
  );
}

function TrendArrow({ trend }: { trend: RatioSeries['trend'] }) {
  const label =
    trend === 'rising'  ? 'Trending up over last 20 days' :
    trend === 'falling' ? 'Trending down over last 20 days' :
    'Flat trend over last 20 days';
  const icon =
    trend === 'rising'  ? <span className="text-green-500 font-bold">↑</span> :
    trend === 'falling' ? <span className="text-red-500 font-bold">↓</span> :
    <span className="text-slate-400">→</span>;
  return (
    <span className="relative group cursor-default">
      {icon}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-slate-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        {label}
      </span>
    </span>
  );
}

function SvgSparkline({ series, color }: { series: { date: string; value: number }[]; color: string }) {
  const W = 400;
  const H = 40;
  const PAD = 6;

  const values = series.map(p => p.value);
  const minV   = Math.min(...values);
  const maxV   = Math.max(...values);
  const range  = maxV - minV || 0.001;

  const toX = (i: number) => PAD + (i / (values.length - 1)) * (W - PAD * 2);
  const toY = (v: number) => H - PAD - ((v - minV) / range) * (H - PAD * 2);

  const points = values.map((v, i) => `${toX(i)},${toY(v)}`).join(' ');

  // baseline y=1 line
  const baselineY = toY(1);

  // Tooltip state
  const [tooltip, setTooltip] = React.useState<{ x: number; y: number; date: string; value: number } | null>(null);

  return (
    <div style={{ position: 'relative', width: '100%', height: H }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="none"
        style={{ display: 'block' }}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Baseline y=1 */}
        {baselineY >= PAD && baselineY <= H - PAD && (
          <line x1={PAD} y1={baselineY} x2={W - PAD} y2={baselineY}
            stroke="#cbd5e1" strokeDasharray="4 3" strokeWidth={1} />
        )}
        {/* Sparkline */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Invisible hit areas for tooltip */}
        {values.map((v, i) => (
          <circle
            key={i}
            cx={toX(i)}
            cy={toY(v)}
            r={12}
            fill="transparent"
            onMouseEnter={() => setTooltip({ x: toX(i), y: toY(v), date: series[i].date, value: v })}
          />
        ))}
        {/* Dot on hover */}
        {tooltip && (
          <circle cx={tooltip.x} cy={tooltip.y} r={4} fill={color} stroke="white" strokeWidth={1.5} />
        )}
      </svg>
      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            top: Math.max(0, (tooltip.y / H) * 100 - 30) + '%',
            left: Math.min(75, (tooltip.x / W) * 100) + '%',
            transform: 'translateX(-50%)',
            pointerEvents: 'none',
          }}
          className="bg-slate-800 text-white text-xs px-2 py-1 rounded shadow whitespace-nowrap z-10"
        >
          {tooltip.date.slice(0, 7)}: {tooltip.value.toFixed(3)}
        </div>
      )}
    </div>
  );
}

function RatioCard({ ratio }: { ratio: RatioSeries }) {
  const lineColor =
    ratio.signal === 'risk-on'  ? '#22c55e' :
    ratio.signal === 'risk-off' ? '#ef4444' : '#94a3b8';

  const hasData = ratio.series.length > 1;

  return (
    <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-sm font-bold text-slate-900">{ratio.label}</p>
          <p className="text-xs text-slate-500">{ratio.guide}</p>
        </div>
        <SignalBadge signal={ratio.signal} />
      </div>

      {/* Sparkline */}
      <div className="my-3">
        {hasData ? (
          <SvgSparkline series={ratio.series} color={lineColor} />
        ) : (
          <div className="flex items-center justify-center text-slate-300 text-xs" style={{height: 120}}>
            No data
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-slate-600">
          <span className="font-semibold">{ratio.current.toFixed(3)}</span>
          <TrendArrow trend={ratio.trend} />
        </div>
        <div className={`text-xs ${ratio.aboveMa50 ? 'text-green-600' : 'text-red-500'}`}>
          {ratio.aboveMa50 ? '▲' : '▼'} 50MA&nbsp;
          <span className="text-slate-400">{ratio.ma50.toFixed(3)}</span>
        </div>
      </div>
    </div>
  );
}

function AppetiteSummary({ riskAppetite }: { riskAppetite: Props['riskAppetite'] }) {
  const { riskOnCount, total, label, detail } = riskAppetite;
  const pct       = riskOnCount / total;
  const isStrong  = pct >= 0.75;
  const isMod     = pct >= 0.58;
  const isMixed   = pct >= 0.42;
  const isCautious= pct >= 0.25;

  const bgClass =
    isStrong  ? 'bg-green-50 border-green-200' :
    isMod     ? 'bg-green-50 border-green-100' :
    isMixed   ? 'bg-yellow-50 border-yellow-200' :
    isCautious? 'bg-red-50 border-red-100' :
                'bg-red-50 border-red-200';

  const textClass =
    isStrong || isMod ? 'text-green-700' :
    isMixed           ? 'text-yellow-700' :
                        'text-red-700';

  return (
    <div className={`rounded-xl border p-5 mt-4 ${bgClass}`}>
      <p className="text-sm font-semibold text-slate-700 mb-1">Risk Appetite Summary</p>
      <p className={`text-base font-bold mb-2 ${textClass}`}>
        {riskOnCount} of {total} ratios favour risk-on → {label}
      </p>
      <p className="text-sm text-slate-600 leading-relaxed">{detail}</p>
    </div>
  );
}

export function RatioTrendsPanel({ ratios, riskAppetite }: Props) {
  const [activeTab, setActiveTab] = useState<RatioTab>('Sector');

  const filtered = activeTab === 'All'
    ? ratios
    : ratios.filter(r => r.tab === activeTab);

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Ratio Trends — Risk Appetite Analysis</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            12-month normalised ratio trends. Rising ratio = numerator outperforming.
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 mb-5">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition ${
              activeTab === tab
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="text-center text-slate-400 text-sm py-8">No ratios in this category yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(ratio => (
            <RatioCard key={ratio.id} ratio={ratio} />
          ))}
        </div>
      )}

      {/* Risk appetite summary — always shown */}
      <AppetiteSummary riskAppetite={riskAppetite} />
    </div>
  );
}
