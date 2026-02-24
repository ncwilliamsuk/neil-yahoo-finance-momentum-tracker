'use client';
// app/_components/dashboard/v5/heatmaps/ThematicHeatmap.tsx

import React, { useState, useMemo, useRef } from 'react';
import { Treemap, ResponsiveContainer } from 'recharts';
import { Timeframe, THEMATIC_ETFS, getHeatmapColorHex, HEATMAP_LEGEND } from '@/lib/v5/sectors';

interface Props { returns: Record<string, Record<Timeframe, number>>; }

const TIMEFRAMES: Timeframe[] = ['1D', '1W', '1M', '3M', '6M', '12M'];
const LABEL_H = 18;

const THEME_ORDER = [
  'AI', 'Robotics', 'Cloud', 'Semiconductors', 'Cybersecurity', 'Software',
  '5G/Telecom', 'Electric Vehicles', 'Clean Energy', 'Space',
  'Genomics/Biotech', 'Fintech', 'Defense/Aerospace', 'Transportation',
  'Consumer Goods', 'Cannabis', 'Gaming/Esports', 'Blockchain',
];

interface LabelRect    { name: string; x: number; y: number; width: number; avgRet: number; }
interface TooltipState { ticker: string; theme: string; ret: number; siblings: any[]; x: number; y: number; }

export default function ThematicHeatmap({ returns }: Props) {
  const [tf, setTf]           = useState<Timeframe>('1M');
  const [labels, setLabels]   = useState<LabelRect[]>([]);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const containerRef          = useRef<HTMLDivElement>(null);
  const capturedLabels        = useRef<LabelRect[]>([]);

  const treeData = useMemo(() => {
    return THEME_ORDER
      .filter(theme => THEMATIC_ETFS[theme])
      .map(theme => {
        const tickers = THEMATIC_ETFS[theme];
        const vals    = tickers.map(t => returns[t]?.[tf] ?? 0).filter(v => v !== 0);
        const avg     = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        return {
          name: theme, depth: 1, avgRet: avg,
          children: tickers.map(ticker => ({
            name: ticker, ticker, theme, size: 1,
            ret: returns[ticker]?.[tf] ?? 0, depth: 2,
          })),
        };
      });
  }, [returns, tf]);

  function CustomContent(props: any) {
    const { x = 0, y = 0, width = 0, height = 0, name, depth, ret, ticker, theme, avgRet } = props;

    if (depth === 1) {
      const already = capturedLabels.current.find(l => l.name === name);
      if (!already) {
        capturedLabels.current.push({ name, x, y, width, avgRet: avgRet ?? 0 });
        setTimeout(() => setLabels([...capturedLabels.current]), 0);
      }
      return <g><rect x={x} y={y} width={width} height={height} fill="none" stroke="#0f172a" strokeWidth={2} /></g>;
    }

    if (depth === 2) {
      const retVal   = ret ?? 0;
      const fill     = getHeatmapColorHex(retVal);
      const textFill = '#ffffff';
      const showName = width > 35 && height > 26;
      const showRet  = width > 28 && height > 16;

      return (
        <g
          style={{ cursor: 'pointer' }}
          onMouseEnter={e => {
            const rect   = (e.currentTarget as SVGElement).getBoundingClientRect();
            const parent = containerRef.current?.getBoundingClientRect();
            if (!parent) return;
            const themeNode = treeData.find(t => t.name === theme);
            setTooltip({
              ticker, theme, ret: retVal,
              siblings: themeNode?.children ?? [],
              x: rect.left - parent.left + rect.width / 2,
              y: rect.top  - parent.top,
            });
          }}
        >
          <rect x={x + 1} y={y + 1} width={width - 2} height={height - 2} fill={fill} stroke="#0f172a" strokeWidth={0.5} rx={1} />
          {showName && (
            <text x={x + width / 2} y={y + height / 2 - (showRet ? 6 : 0)}
              textAnchor="middle" fill={textFill} fontSize={Math.min(11, width / 4)} fontWeight={700}>
              {name}
            </text>
          )}
          {showRet && (
            <text x={x + width / 2} y={y + height / 2 + (showName ? 9 : 4)}
              textAnchor="middle" fill={textFill} fontSize={Math.min(10, width / 5)}>
              {retVal >= 0 ? '+' : ''}{retVal.toFixed(2)}%
            </text>
          )}
        </g>
      );
    }
    return null;
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm" style={{ position: 'relative' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Thematic ETF Heatmap</h2>
          <p className="text-xs text-slate-500 mt-0.5">18 investment themes · Equal weighted cells</p>
        </div>
        <div className="bg-slate-100 rounded-lg p-1 flex gap-1">
          {TIMEFRAMES.map(t => (
            <button key={t} onClick={() => { capturedLabels.current = []; setLabels([]); setTf(t); }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                tf === t ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {HEATMAP_LEGEND.map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: l.color }} />
            <span className="text-xs text-slate-500">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Treemap — onMouseLeave clears tooltip when leaving map area */}
      <div
        ref={containerRef}
        style={{ width: '100%', height: 560, position: 'relative' }}
        onMouseLeave={() => setTooltip(null)}
      >
        <ResponsiveContainer width="100%" height="100%">
          <Treemap data={treeData} dataKey="size" aspectRatio={4 / 3} content={<CustomContent />} />
        </ResponsiveContainer>

        {/* HTML label bars — always on top of SVG */}
        {labels.map((l, i) => {
          const bg        = getHeatmapColorHex(l.avgRet);
          const textColor = Math.abs(l.avgRet) >= 1 ? '#ffffff' : '#1e293b';
          return (
            <div key={`${l.name}-${i}`} style={{
              position: 'absolute', left: l.x, top: l.y, width: l.width, height: LABEL_H,
              backgroundColor: bg, display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', paddingLeft: 6, paddingRight: 6,
              pointerEvents: 'none', overflow: 'hidden', zIndex: 10,
            }}>
              <span style={{ color: textColor, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                {l.name}
              </span>
              {l.width > 80 && (
                <span style={{ color: textColor, fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {l.avgRet >= 0 ? '+' : ''}{l.avgRet.toFixed(2)}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Tooltip — outside container div so hovering it doesn't trigger onMouseLeave */}
      {tooltip && (
        <div style={{
          position: 'absolute', zIndex: 50, pointerEvents: 'none',
          left: tooltip.x, top: tooltip.y + 60,
          transform: 'translateX(-50%)',
          backgroundColor: '#0f172a', color: '#fff',
          borderRadius: 8, padding: '8px 12px',
          border: '1px solid #334155', whiteSpace: 'nowrap',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)', minWidth: 180,
        }}>
          <div style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, paddingBottom: 4, borderBottom: '1px solid #334155' }}>
            {tooltip.theme}
          </div>
          {tooltip.siblings.map((s: any) => (
            <div key={s.ticker} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '2px 0', fontWeight: s.ticker === tooltip.ticker ? 700 : 400, color: s.ticker === tooltip.ticker ? '#ffffff' : '#94a3b8' }}>
              <span>{s.ticker}</span>
              <span style={{ color: s.ret >= 0 ? '#4ade80' : '#f87171' }}>{s.ret >= 0 ? '+' : ''}{s.ret?.toFixed(2)}%</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
