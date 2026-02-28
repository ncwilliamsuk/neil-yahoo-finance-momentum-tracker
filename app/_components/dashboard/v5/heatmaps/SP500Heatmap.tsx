'use client';
// app/_components/dashboard/v5/heatmaps/SP500Heatmap.tsx

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Treemap, ResponsiveContainer } from 'recharts';
import { Timeframe, getHeatmapColorHex, HEATMAP_LEGEND } from '@/lib/v5/sectors';

interface StockData {
  ticker:    string;
  name:      string;
  sector:    string;
  marketCap: number;
  returns:   Record<Timeframe, number>;
}

interface Props { stocks: StockData[]; }

const SECTOR_ORDER = [
  'Technology', 'Communication Services', 'Consumer Discretionary',
  'Financials', 'Healthcare', 'Industrials', 'Consumer Staples',
  'Energy', 'Materials', 'Real Estate', 'Utilities',
];

const TIMEFRAMES: Timeframe[] = ['1D', '1W', '1M', '3M', '6M', '12M'];
const LABEL_H = 18;

interface LabelRect    { name: string; x: number; y: number; width: number; height: number; }
interface TooltipState { ticker: string; ret: number; sector: string; nameFull: string; x: number; y: number; }

// Lookup map shared across renders — populated during Recharts layout pass
// Key: "x,y,w,h" won't work since coords vary; we store by ticker
const cellMap: Map<string, { x: number; y: number; w: number; h: number; ret: number; sector: string; nameFull: string }> = new Map();
const labelMap: Map<string, LabelRect> = new Map();

// Pure static renderer — no closures over component state, so Recharts
// never sees a new function reference and never redraws unnecessarily.
function StaticContent(props: any) {
  const { x = 0, y = 0, width = 0, height = 0, name, depth, ret, ticker } = props;

  if (depth === 1) {
    // Record sector label position
    if (!labelMap.has(name)) {
      labelMap.set(name, { name, x, y, width, height });
    }
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} fill="none" stroke="#0f172a" strokeWidth={2} />
      </g>
    );
  }

  if (depth === 2) {
    const retVal   = ret ?? 0;
    const fill     = getHeatmapColorHex(retVal);
    const textFill = '#ffffff';
    const showName = width > 40 && height > 28;
    const showRet  = width > 32 && height > 18;

    // Record cell bounds for hit-testing in onMouseMove
    cellMap.set(ticker, { x, y, w: width, h: height, ret: retVal, sector: props.sector, nameFull: props.nameFull });

    return (
      <g>
        <rect x={x+1} y={y+1} width={width-2} height={height-2} fill={fill} stroke="#0f172a" strokeWidth={0.5} rx={1} />
        {showName && (
          <text x={x+width/2} y={y+height/2-(showRet?6:0)} textAnchor="middle" fill={textFill} fontSize={Math.min(12,width/4)} fontWeight={700}>
            {name}
          </text>
        )}
        {showRet && (
          <text x={x+width/2} y={y+height/2+(showName?9:4)} textAnchor="middle" fill={textFill} fontSize={Math.min(10,width/5)}>
            {retVal>=0?'+':''}{retVal.toFixed(2)}%
          </text>
        )}
      </g>
    );
  }

  return null;
}

export default function SP500Heatmap({ stocks }: Props) {
  const [tf, setTf]           = useState<Timeframe>('1M');
  const [labels, setLabels]   = useState<LabelRect[]>([]);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const containerRef          = useRef<HTMLDivElement>(null);
  const labelsReady           = useRef(false);

  const treeData = useMemo(() => {
    // Clear maps when data changes
    cellMap.clear();
    labelMap.clear();
    labelsReady.current = false;

    const bySector: Record<string, any[]> = {};
    for (const s of stocks) {
      if (!bySector[s.sector]) bySector[s.sector] = [];
      bySector[s.sector].push({
        name: s.ticker, ticker: s.ticker, nameFull: s.name,
        sector: s.sector, size: s.marketCap, ret: s.returns[tf] ?? 0, depth: 2,
      });
    }
    return SECTOR_ORDER
      .filter(s => bySector[s]?.length > 0)
      .map(sector => ({ name: sector, depth: 1, children: bySector[sector] }));
  }, [stocks, tf]);

  // After Recharts renders, flush labelMap to state (one-time per tf change)
  useEffect(() => {
    if (labelsReady.current) return;
    const timer = setTimeout(() => {
      const captured = Array.from(labelMap.values());
      if (captured.length > 0) {
        setLabels(captured);
        labelsReady.current = true;
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [treeData]);

  // Document-level mousemove: hit-test against cellMap to show tooltip,
  // clear if outside container
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;
      const cRect = container.getBoundingClientRect();

      // Mouse outside container — clear tooltip
      if (e.clientX < cRect.left || e.clientX > cRect.right ||
          e.clientY < cRect.top  || e.clientY > cRect.bottom) {
        setTooltip(null);
        return;
      }

      // Mouse position relative to SVG
      const mx = e.clientX - cRect.left;
      const my = e.clientY - cRect.top;

      // Hit-test cellMap
      let found: TooltipState | null = null;
      for (const [ticker, cell] of cellMap.entries()) {
        if (mx >= cell.x && mx <= cell.x + cell.w &&
            my >= cell.y && my <= cell.y + cell.h) {
          found = { ticker, ret: cell.ret, sector: (cell as any).sector ?? '', nameFull: (cell as any).nameFull ?? '', x: mx, y: my };
          break;
        }
      }
      setTooltip(found);
    };

    document.addEventListener('mousemove', handler);
    return () => document.removeEventListener('mousemove', handler);
  }, []);

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm" style={{ position: 'relative' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">S&amp;P 500 Heatmap</h2>
          <p className="text-xs text-slate-500 mt-0.5">Top 100 stocks · Grouped by sector · Size = market cap</p>
        </div>
        <div className="bg-slate-100 rounded-lg p-1 flex gap-1">
          {TIMEFRAMES.map(t => (
            <button key={t} onClick={() => { setLabels([]); setTooltip(null); setTf(t); }}
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
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: l.color }} />
            <span className="text-xs text-slate-500">{l.label}</span>
          </div>
        ))}
      </div>

      <div ref={containerRef} style={{ width: '100%', height: 580, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <Treemap data={treeData} dataKey="size" aspectRatio={4/3} content={<StaticContent />} />
        </ResponsiveContainer>

        {/* HTML label bars — always on top */}
        {labels.map(l => (
          <div key={l.name} style={{
            position: 'absolute', left: l.x, top: l.y, width: l.width, height: LABEL_H,
            backgroundColor: '#0f172a', display: 'flex', alignItems: 'center',
            paddingLeft: 6, pointerEvents: 'none', overflow: 'hidden', zIndex: 10,
          }}>
            <span style={{ color: '#e2e8f0', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
              {l.name}
            </span>
          </div>
        ))}
      </div>

      {/* Simple tooltip — ticker + return only */}
      {tooltip && (
        <div style={{
          position: 'absolute', zIndex: 50, pointerEvents: 'none',
          left: tooltip.x, top: tooltip.y + 70,
          transform: 'translateX(-50%)',
          backgroundColor: '#0f172a', color: '#fff',
          borderRadius: 8, padding: '6px 12px',
          border: '1px solid #334155', whiteSpace: 'nowrap',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        }}>
          <div style={{ fontWeight: 700, fontSize: 13 }}>{tooltip.ticker} <span style={{ color: tooltip.ret >= 0 ? '#4ade80' : '#f87171', marginLeft: 6 }}>{tooltip.ret >= 0 ? '+' : ''}{tooltip.ret.toFixed(2)}%</span></div>
          <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>{tooltip.nameFull}</div>
          <div style={{ color: '#64748b', fontSize: 10, marginTop: 1 }}>{tooltip.sector}</div>
        </div>
      )}
    </div>
  );
}
