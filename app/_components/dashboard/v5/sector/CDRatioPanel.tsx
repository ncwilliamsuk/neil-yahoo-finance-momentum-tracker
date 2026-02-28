'use client';

// app/_components/dashboard/v5/sector/CDRatioPanel.tsx
// Cyclical/Defensive ratio panel — includes signal badges, sparklines and
// cross-regional summary at the bottom

import { useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  YAxis,
  ReferenceLine,
  Tooltip as RechartsTooltip,
} from 'recharts';
import {
  CDRatioData,
  regionSignal,
  signalLabel,
  signalBadgeClass,
  signalDotClass,
  generateCrossRegionalSummary,
  SummaryTone,
} from '@/lib/v5/sectors';

interface CDRatioPanelProps {
  us:    CDRatioData;
  world: CDRatioData;
  eu:    CDRatioData;
}

// ─── Info tooltip ─────────────────────────────────────────────────────────────

function InfoTooltip({ text }: { text: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="relative inline-block ml-1">
      <span
        className="cursor-help text-slate-400 hover:text-slate-600 text-xs font-bold
                   border border-slate-300 rounded-full w-4 h-4 inline-flex
                   items-center justify-center leading-none"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
      >
        ?
      </span>
      {visible && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2
                         w-56 bg-slate-800 text-white text-xs rounded-lg px-3 py-2
                         shadow-xl pointer-events-none">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4
                           border-transparent border-t-slate-800" />
        </span>
      )}
    </span>
  );
}

// ─── Trend arrow ──────────────────────────────────────────────────────────────

function TrendArrow({ trend }: { trend: 'rising' | 'falling' | 'flat' }) {
  if (trend === 'rising')  return <span className="text-green-500 text-xl font-bold">↑</span>;
  if (trend === 'falling') return <span className="text-red-500 text-xl font-bold">↓</span>;
  return <span className="text-slate-400 text-xl font-bold">→</span>;
}

// ─── MA badge ─────────────────────────────────────────────────────────────────

function MABadge({ above, label }: { above: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold
      ${above ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
      {above ? '▲' : '▼'} {label}
    </span>
  );
}

// ─── Sparkline ────────────────────────────────────────────────────────────────

function CDSparkline({ series }: {
  series: { date: string; ratio: number; ma50: number | null; ma200: number | null }[];
}) {
  if (!series || series.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-slate-400">
        No chart data
      </div>
    );
  }

  const allValues = series.flatMap(s => [
    s.ratio,
    s.ma50  ?? s.ratio,
    s.ma200 ?? s.ratio,
  ]);
  const dataMin = Math.min(...allValues);
  const dataMax = Math.max(...allValues);
  const padding = (dataMax - dataMin) * 0.20;

  // Always include y=1 in the visible range
  const yMin = Math.min(dataMin - padding, 0.995);
  const yMax = Math.max(dataMax + padding, 1.005);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={series} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
        <YAxis domain={[yMin, yMax]} hide={true} />
        <ReferenceLine y={1} stroke="#94a3b8" strokeWidth={1} />
        <RechartsTooltip
          contentStyle={{
            background: '#1e293b',
            border: 'none',
            borderRadius: '8px',
            color: '#f1f5f9',
            fontSize: '11px',
            padding: '6px 10px',
          }}
          formatter={(value: number | undefined, name: string) => {
            const labels: Record<string, string> = {
              ratio: 'C/D Ratio',
              ma50:  '50-day MA',
              ma200: '200-day MA',
            };
            return [value?.toFixed(4), labels[name] ?? name];
          }}
          labelFormatter={(label) => label}
        />
        <Line type="monotone" dataKey="ma50"  stroke="#f97316" strokeWidth={1.5}
              strokeDasharray="4 2" dot={false} activeDot={false} connectNulls={false} />
        <Line type="monotone" dataKey="ma200" stroke="#6366f1" strokeWidth={1.5}
              strokeDasharray="4 2" dot={false} activeDot={false} connectNulls={false} />
        <Line type="monotone" dataKey="ratio" stroke="#2563eb" strokeWidth={2}
              dot={false} activeDot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ─── Summary tone styling ─────────────────────────────────────────────────────

function summaryBorder(tone: SummaryTone): string {
  switch (tone) {
    case 'positive': return 'border-l-4 border-green-400 bg-green-50';
    case 'negative': return 'border-l-4 border-red-400 bg-red-50';
    case 'mixed':    return 'border-l-4 border-orange-400 bg-orange-50';
    case 'neutral':  return 'border-l-4 border-slate-300 bg-slate-50';
  }
}

function summaryHeadlineColor(tone: SummaryTone): string {
  switch (tone) {
    case 'positive': return 'text-green-800';
    case 'negative': return 'text-red-800';
    case 'mixed':    return 'text-orange-800';
    case 'neutral':  return 'text-slate-700';
  }
}

function summaryDetailColor(tone: SummaryTone): string {
  switch (tone) {
    case 'positive': return 'text-green-700';
    case 'negative': return 'text-red-700';
    case 'mixed':    return 'text-orange-700';
    case 'neutral':  return 'text-slate-600';
  }
}

// ─── Single region card ───────────────────────────────────────────────────────

function RegionCard({ data }: { data: CDRatioData }) {
  const regionLabel =
    data.region === 'US'    ? 'US Market' :
    data.region === 'World' ? 'World'     : 'Europe';

  const signal = regionSignal(data);

  return (
    <div className="bg-slate-50 rounded-xl p-4">

      {/* Region title + signal badge */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1">
          <span className="text-sm font-bold text-slate-700">{regionLabel}</span>
          <InfoTooltip text="Equal-weighted cyclical sector index ÷ equal-weighted defensive sector index. Rising = cyclicals leading = risk-on. The neutral line at 1 shows where cyclicals and defensives are in balance." />
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${signalBadgeClass(signal)}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${signalDotClass(signal)}`} />
          {signalLabel(signal)}
        </span>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-3">

        {/* Left third — stats */}
        <div className="flex flex-col gap-3 justify-center" style={{ minWidth: '110px', width: '33%' }}>
          <div>
            <div className="flex items-center gap-0.5">
              <span className="text-xs text-slate-400">C/D Ratio</span>
              <InfoTooltip text="Current value of the cyclical/defensive ratio. Both indices normalised to 1 at series start — values above 1 mean cyclicals have outperformed defensives cumulatively." />
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xl font-bold text-slate-900 tabular-nums">
                {data.current.toFixed(4)}
              </span>
              <TrendArrow trend={data.trend} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1">
              <MABadge above={data.above50MA} label="50-day MA" />
              <InfoTooltip text="Is the C/D ratio above its 50-day moving average? Above = short-term cyclical momentum intact." />
            </div>
            <div className="flex items-center gap-1">
              <MABadge above={data.above200MA} label="200-day MA" />
              <InfoTooltip text="Is the C/D ratio above its 200-day moving average? Above = long-term cyclical trend intact." />
            </div>
          </div>
        </div>

        {/* Right two thirds — sparkline */}
        <div className="flex flex-col flex-1">
          <div style={{ height: '130px' }}>
            <CDSparkline series={data.series} />
          </div>
          <div className="flex gap-3 mt-1.5 justify-center">
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <span className="inline-block w-4 border-t-2 border-blue-600" /> Ratio
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <span className="inline-block w-4 border-t-2 border-dashed border-orange-500" /> 50MA
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <span className="inline-block w-4 border-t-2 border-dashed border-indigo-500" /> 200MA
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <span className="inline-block w-4 border-t border-slate-400" /> Neutral
            </span>
          </div>
        </div>
      </div>

      {/* Secondary ratio */}
      <div className="mt-3 pt-3 border-t border-slate-200">
        {data.secondaryRatio.available ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-slate-500">
                {data.secondaryRatio.name}
              </span>
              <InfoTooltip text="Consumer Discretionary vs Consumer Staples — normalised ratio so currency differences are removed. Rising = consumers spending on wants not just needs = risk-on signal." />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 tabular-nums">
                {data.secondaryRatio.current.toFixed(4)}
              </span>
              <TrendArrow trend={data.secondaryRatio.trend} />
              <div className="flex items-center gap-1">
                <MABadge above={data.secondaryRatio.above50MA} label="50MA" />
                <InfoTooltip text="Is the Discretionary/Staples ratio above its 50-day MA? Above = short-term consumer risk appetite improving." />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold text-slate-500">
              {data.secondaryRatio.name || 'Disc / Staples'}
            </span>
            <span className="text-xs text-slate-400 ml-1">— data unavailable</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CDRatioPanel({ us, world, eu }: CDRatioPanelProps) {
  if (!us || !world || !eu) return null;
  const summary = generateCrossRegionalSummary(us, world, eu);

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <h2 className="text-lg font-semibold text-slate-900">
          Cyclical / Defensive Ratio
        </h2>
        <InfoTooltip text="Compares equal-weighted cyclical sectors against equal-weighted defensive sectors. Rising = risk-on. Falling = defensive rotation." />
      </div>
      <p className="text-xs text-slate-400 mb-5">
        Equal-weighted cyclical sectors ÷ equal-weighted defensive sectors.
        Rising ratio signals risk-on conditions; falling signals defensive rotation.
      </p>

      {/* Three region cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <RegionCard data={us}    />
        <RegionCard data={world} />
        <RegionCard data={eu}    />
      </div>

      {/* Cross-regional summary */}
      <div className={`rounded-lg px-5 py-4 ${summaryBorder(summary.tone)}`}>
        <p className={`text-sm font-bold mb-1.5 ${summaryHeadlineColor(summary.tone)}`}>
          {summary.headline}
        </p>
        <p className={`text-xs leading-relaxed ${summaryDetailColor(summary.tone)}`}>
          {summary.detail}
        </p>
      </div>
    </div>
  );
}
