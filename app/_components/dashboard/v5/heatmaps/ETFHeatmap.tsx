'use client';
// app/_components/dashboard/v5/heatmaps/ETFHeatmap.tsx

import React, { useState, useMemo, useRef } from 'react';
import { Treemap, ResponsiveContainer } from 'recharts';
import { Timeframe, ETF_CATEGORIES, getHeatmapColorHex, HEATMAP_LEGEND } from '@/lib/v5/sectors';

interface Props {
  returns: Record<string, Record<Timeframe, number>>;
}

const TIMEFRAMES: Timeframe[] = ['1D', '1W', '1M', '3M', '6M', '12M'];
const REGION_ORDER = ['US', 'International', 'Other'];
const LABEL_H = 18;

const REGION_COLORS: Record<string, string> = {
  US:            '#1d4ed8',
  International: '#6d28d9',
  Other:         '#b45309',
};

interface LabelRect  { name: string; x: number; y: number; width: number; isRegion: boolean; region?: string; }
interface TooltipState { ticker: string; category: string; region: string; ret: number; siblings: any[]; x: number; y: number; }

export default function ETFHeatmap({ returns }: Props) {
  const [tf, setTf]           = useState<Timeframe>('1M');
  const [labels, setLabels]   = useState<LabelRect[]>([]);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const containerRef          = useRef<HTMLDivElement>(null);
  const capturedLabels        = useRef<LabelRect[]>([]);

  const treeData = useMemo(() => {
    return REGION_ORDER
      .filter(region => ETF_CATEGORIES[region])
      .map(region => ({
        name:  region,
        depth: 1,
        children: Object.entries(ETF_CATEGORIES[region]).map(([catName, tickers]) => ({
          name:  catName,
          depth: 2,
          children: tickers.map(ticker => ({
            name:     ticker,
            ticker,
            category: catName,
            region,
            size:     1,
            ret:      returns[ticker]?.[tf] ?? 0,
            depth:    3,
          })),
        })),
      }));
  }, [returns, tf]);

  function CustomContent(props: any) {
    const { x = 0, y = 0, width = 0, height = 0, name, depth, ret, ticker, category, region } = props;

    // ── Depth 1: Region block ──────────────────────────────────────────────
    if (depth === 1) {
      const already = capturedLabels.current.find(l => l.name === name && l.isRegion);
      if (!already) {
        capturedLabels.current.push({ name, x, y, width, isRegion: true });
        setTimeout(() => setLabels([...capturedLabels.current]), 0);
      }
      return <g><rect x={x} y={y} width={width} height={height} fill="none" stroke="#0f172a" strokeWidth={2} /></g>;
    }

    // ── Depth 2: Category block ────────────────────────────────────────────
    if (depth === 2) {
      const already = capturedLabels.current.find(l => l.name === name && !l.isRegion);
      if (!already) {
        capturedLabels.current.push({ name, x, y, width, isRegion: false, region });
        setTimeout(() => setLabels([...capturedLabels.current]), 0);
      }
      return <g><rect x={x} y={y} width={width} height={height} fill="none" stroke="#0f172a" strokeWidth={1} /></g>;
    }

    // ── Depth 3: Individual ETF cell ───────────────────────────────────────
    if (depth === 3) {
      const retVal = ret ?? 0;
      const fill   = getHeatmapColorHex(retVal);
      const textFill = '#ffffff';

      // Offset cell down by LABEL_H so it never sits under the category label bar
      const adjustedY      = y + LABEL_H;
      const adjustedHeight = height - LABEL_H;

      if (adjustedHeight < 4) return null;

      const showName = width > 35 && adjustedHeight > 26;
      const showRet  = width > 28 && adjustedHeight > 16;

      return (
        <g
          style={{ cursor: 'pointer' }}
          onMouseEnter={e => {
            const rect   = (e.currentTarget as SVGElement).getBoundingClientRect();
            const parent = containerRef.current?.getBoundingClientRect();
            if (!parent) return;
            const regionNode   = treeData.find(r => r.name === region);
            const categoryNode = regionNode?.children?.find((c: any) => c.name === category);
            setTooltip({
              ticker, category, region, ret: retVal,
              siblings: categoryNode?.children ?? [],
              x: rect.left - parent.left + rect.width / 2,
              y: rect.top  - parent.top,
            });
          }}
          onMouseLeave={() => setTooltip(null)}
        >
          <rect
            x={x + 1}
            y={adjustedY + 1}
            width={width - 2}
            height={adjustedHeight - 2}
            fill={fill}
            stroke="#0f172a"
            strokeWidth={0.5}
            rx={1}
          />
          {showName && (
            <text
              x={x + width / 2}
              y={adjustedY + adjustedHeight / 2 - (showRet ? 6 : 0)}
              textAnchor="middle" fill={textFill}
              fontSize={Math.min(11, width / 4)} fontWeight={700}
            >
              {name}
            </text>
          )}
          {showRet && (
            <text
              x={x + width / 2}
              y={adjustedY + adjustedHeight / 2 + (showName ? 9 : 4)}
              textAnchor="middle" fill={textFill}
              fontSize={Math.min(10, width / 5)}
            >
              {retVal >= 0 ? '+' : ''}{retVal.toFixed(2)}%
            </text>
          )}
        </g>
      );
    }

    return null;
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">ETF Heatmap</h2>
          <p className="text-xs text-slate-500 mt-0.5">Sectors, styles, factors, fixed income, commodities &amp; more</p>
        </div>
        <div className="bg-slate-100 rounded-lg p-1 flex gap-1">
          {TIMEFRAMES.map(t => (
            <button
              key={t}
              onClick={() => { capturedLabels.current = []; setLabels([]); setTf(t); }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                tf === t ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-4">
        {HEATMAP_LEGEND.map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: l.color }} />
            <span className="text-xs text-slate-500">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Treemap + overlay — onMouseLeave on container clears tooltip */}
      <div
        ref={containerRef}
        style={{ width: '100%', height: 640, position: 'relative' }}
        onMouseLeave={() => setTooltip(null)}
      >
        <ResponsiveContainer width="100%" height="100%">
          <Treemap data={treeData} dataKey="size" aspectRatio={4 / 3} content={<CustomContent />} />
        </ResponsiveContainer>

        {/* HTML label bars — always rendered on top of SVG */}
        {labels.map((l, i) => (
          <div
            key={`${l.name}-${i}`}
            style={{
              position:        'absolute',
              left:            l.x,
              top:             l.y,
              width:           l.width,
              height:          LABEL_H,
              backgroundColor: l.isRegion ? (REGION_COLORS[l.name] ?? '#1e293b') : '#1e293b',
              display:         'flex',
              alignItems:      'center',
              paddingLeft:     6,
              pointerEvents:   'none',
              overflow:        'hidden',
              zIndex:          10,
            }}
          >
            <span style={{
              color:         '#ffffff',
              fontSize:      l.isRegion ? 11 : 9,
              fontWeight:    700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              whiteSpace:    'nowrap',
            }}>
              {l.name}
            </span>
          </div>
        ))}

        {/* Tooltip */}
        {tooltip && (
          <div style={{
            position:        'absolute',
            zIndex:          50,
            pointerEvents:   'none',
            left:            tooltip.x,
            top:             Math.max(4, tooltip.y - 10),
            transform:       'translateX(-50%)',
            backgroundColor: '#0f172a',
            color:           '#fff',
            borderRadius:    8,
            padding:         '8px 12px',
            border:          '1px solid #334155',
            whiteSpace:      'nowrap',
            boxShadow:       '0 4px 24px rgba(0,0,0,0.5)',
            minWidth:        200,
          }}>
            <div style={{ color: '#64748b', fontSize: 10, marginBottom: 2 }}>{tooltip.region}</div>
            <div style={{ color: '#94a3b8', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, paddingBottom: 4, borderBottom: '1px solid #334155' }}>
              {tooltip.category}
            </div>
            {tooltip.siblings.map((s: any) => (
              <div key={s.ticker} style={{
                display:        'flex',
                justifyContent: 'space-between',
                gap:            16,
                padding:        '2px 0',
                fontWeight:     s.ticker === tooltip.ticker ? 700 : 400,
                color:          s.ticker === tooltip.ticker ? '#ffffff' : '#94a3b8',
              }}>
                <span>{s.ticker}</span>
                <span style={{ color: s.ret >= 0 ? '#4ade80' : '#f87171' }}>
                  {s.ret >= 0 ? '+' : ''}{s.ret?.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
