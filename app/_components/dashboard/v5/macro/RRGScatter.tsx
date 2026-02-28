// app/_components/dashboard/v5/macro/RRGScatter.tsx
'use client';

import { useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Label,
  ReferenceArea,
} from 'recharts';
import { RRGDataPoint } from '@/lib/v5/rrg';
import { determineQuadrant, getQuadrantColor } from '@/lib/v5/rrg';

interface RRGScatterProps {
  positions: RRGDataPoint[];
  viewName: string;
  benchmark: string;
  hiddenTickers: Set<string>;
  tailLength?: number; // 0-4 dots
  timeOffset?: number; // 0 = current, 2,4,6,8 = weeks ago
}

export function RRGScatter({ 
  positions, 
  viewName, 
  benchmark, 
  hiddenTickers, 
  tailLength = 4,
  timeOffset = 0
}: RRGScatterProps) {
  // Filter out hidden positions
  const visiblePositions = positions.filter(p => !hiddenTickers.has(p.ticker));

  // Adjust positions based on timeline offset
  const adjustedPositions = useMemo(() => {
    console.log('Timeline timeOffset:', timeOffset);
    
    if (timeOffset === 0) {
      // Current view - show as is
      return visiblePositions;
    }
    
    // Historical view - map timeOffset to trail index
    // Trail structure: [4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52] weeks ago
    // timeOffset 4 → trail[0], timeOffset 8 → trail[1], etc.
    const weeksBack = [4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52];
    const trailIndex = weeksBack.indexOf(timeOffset);
    
    console.log('Calculated trailIndex:', trailIndex, 'for timeOffset:', timeOffset);
    
    if (trailIndex === -1) {
      // Invalid timeOffset, return current
      console.warn('Invalid timeOffset:', timeOffset);
      return visiblePositions;
    }
    
    return visiblePositions.map(pos => {
      console.log(`${pos.ticker}: trail length = ${pos.trail?.length}, trailIndex = ${trailIndex}`);
      
      // Check if trail exists and has data at this index
      if (!pos.trail || trailIndex < 0 || trailIndex >= pos.trail.length) {
        // No historical data available, return current position
        console.log(`${pos.ticker}: No trail data at index ${trailIndex}`);
        return pos;
      }
      
      const historicalPoint = pos.trail[trailIndex];
      console.log(`${pos.ticker}: Using historical point:`, historicalPoint);
      
      // Double-check the historical point exists and has the required properties
      if (!historicalPoint || typeof historicalPoint.rsRatio !== 'number' || typeof historicalPoint.rsMomentum !== 'number') {
        console.warn(`Invalid historical data for ${pos.ticker} at offset ${timeOffset}`);
        return pos;
      }
      
      const historicalQuadrant = determineQuadrant(historicalPoint.rsRatio, historicalPoint.rsMomentum);
      
      return {
        ...pos,
        rsRatio: historicalPoint.rsRatio,
        rsMomentum: historicalPoint.rsMomentum,
        quadrant: historicalQuadrant,
        color: getQuadrantColor(historicalQuadrant),
        // Show trail from this historical point onwards (what came before it)
        trail: pos.trail.slice(trailIndex + 1)
      };
    });
  }, [visiblePositions, timeOffset]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload as RRGDataPoint;

    return (
      <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
        <p className="font-semibold text-slate-900 mb-2">
          {data.name} ({data.ticker})
        </p>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-slate-600">RS-Ratio:</span>
            <span className="font-medium text-slate-900">{data.rsRatio.toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-600">RS-Momentum:</span>
            <span className="font-medium text-slate-900">{data.rsMomentum.toFixed(2)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-600">Quadrant:</span>
            <span
              className="font-medium px-2 py-0.5 rounded text-white text-xs"
              style={{ backgroundColor: data.color }}
            >
              {data.quadrant}
            </span>
          </div>
         {data.weeklyChange !== undefined && (
            <div className="flex justify-between gap-4">
              <span className="text-slate-600">Week Chg:</span>
              <span className={`font-medium ${data.weeklyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {data.weeklyChange >= 0 ? '+' : ''}{data.weeklyChange.toFixed(2)}%
              </span>
            </div>
          )} 
        </div>
      </div>
    );
  };

  if (adjustedPositions.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          {viewName}
        </h3>
        <div className="flex items-center justify-center h-96 text-slate-500">
          No visible positions (all hidden or no data)
        </div>
      </div>
    );
  }

  // FIXED SCALING: 80-120 for X-axis, 50-150 for Y-axis (centered at 100)
  const minRatio = 80;
  const maxRatio = 120;
  const minMomentum = 50;
  const maxMomentum = 150;

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">
          {viewName}
          {timeOffset > 0 && (
            <span className="ml-2 text-sm font-normal text-slate-600">
              ({timeOffset} week{timeOffset !== 1 ? 's' : ''} ago)
            </span>
          )}
        </h3>
        <p className="text-sm text-slate-600 mt-1">
          Relative Rotation Graph vs {benchmark} benchmark
        </p>
      </div>

      <div className="relative">
        <ResponsiveContainer width="100%" height={600}>
          <ScatterChart margin={{ top: 40, right: 20, bottom: 60, left: 60 }}>
            {/* Quadrant backgrounds using ReferenceArea - renders INSIDE the plot area */}
            
            {/* Top-left: Improving (blue) */}
            <ReferenceArea
              x1={minRatio}
              x2={100}
              y1={100}
              y2={maxMomentum}
              fill="#60a5fa"
              fillOpacity={0.15}
              strokeOpacity={0}
            />
            
            {/* Top-right: Leading (green) */}
            <ReferenceArea
              x1={100}
              x2={maxRatio}
              y1={100}
              y2={maxMomentum}
              fill="#22c55e"
              fillOpacity={0.15}
              strokeOpacity={0}
            />
            
            {/* Bottom-left: Lagging (red) */}
            <ReferenceArea
              x1={minRatio}
              x2={100}
              y1={minMomentum}
              y2={100}
              fill="#ef4444"
              fillOpacity={0.15}
              strokeOpacity={0}
            />
            
            {/* Bottom-right: Weakening (yellow) */}
            <ReferenceArea
              x1={100}
              x2={maxRatio}
              y1={minMomentum}
              y2={100}
              fill="#fbbf24"
              fillOpacity={0.15}
              strokeOpacity={0}
            />

            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            
            <XAxis
              type="number"
              dataKey="rsRatio"
              domain={[minRatio, maxRatio]}
              ticks={[80, 90, 100, 110, 120]}
              stroke="#64748b"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => value.toFixed(0)}
            >
              <Label value="RS-Ratio →" position="insideBottom" offset={-15} style={{ fontSize: '14px', fill: '#475569' }} />
            </XAxis>
            
            <YAxis
              type="number"
              dataKey="rsMomentum"
              domain={[minMomentum, maxMomentum]}
              ticks={[50, 75, 100, 125, 150]}
              stroke="#64748b"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => value.toFixed(0)}
            >
              <Label value="RS-Momentum ↑" angle={-90} position="insideLeft" style={{ fontSize: '14px', fill: '#475569', textAnchor: 'middle' }} />
            </YAxis>

            {/* Center lines at 100,100 */}
            <ReferenceLine x={100} stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" />
            <ReferenceLine y={100} stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" />

            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />

            {/* Render each position with its trail */}
            {adjustedPositions.map((position) => {
              // Head data
              const headData = [{ ...position }];

              // Trail data - filtered by tailLength
              const trailData = position.trail ? position.trail.slice(0, tailLength) : [];

              return (
                <g key={position.ticker}>
                  {/* Render connecting lines between dots */}
                  {trailData.map((point, idx) => {
                    // Get current point
                    const currentPoint = point;
                    
                    // Get previous point (head if idx=0, otherwise previous trail dot)
                    const prevPoint = idx === 0 
                      ? { rsRatio: position.rsRatio, rsMomentum: position.rsMomentum }
                      : trailData[idx - 1];

                    // Create line data
                    const lineData = [
                      { rsRatio: prevPoint.rsRatio, rsMomentum: prevPoint.rsMomentum },
                      { rsRatio: currentPoint.rsRatio, rsMomentum: currentPoint.rsMomentum }
                    ];

                    return (
                      <Scatter
                        key={`line-${position.ticker}-${idx}`}
                        data={lineData}
                        line={{ stroke: position.color, strokeWidth: 3, strokeOpacity: 0.4 }}
                        shape={() => null}
                      />
                    );
                  })}

                  {/* Render tail dots */}
                  {trailData.map((point, idx) => {
                    const tailPoint = [{
                      rsRatio: point.rsRatio,
                      rsMomentum: point.rsMomentum
                    }];

                    return (
                      <Scatter
                        key={`tail-${position.ticker}-${idx}`}
                        data={tailPoint}
                        fill={position.color}
                        shape={(props: any) => {
                          const { cx, cy } = props;

                          return (
                            <circle
                              cx={cx}
                              cy={cy}
                              r={4}
                              fill={position.color}
                              fillOpacity={0.4 - idx * 0.08}
                            />
                          );
                        }}
                      />
                    );
                  })}

                  {/* Head (main dot with label) */}
                  <Scatter
                    data={headData}
                    fill={position.color}
                    shape={(props: any) => {
                      const { cx, cy } = props;
                      return (
                        <g>
                          <circle
                            cx={cx}
                            cy={cy}
                            r={8}
                            fill={position.color}
                          />
                          <text
                            x={cx}
                            y={cy - 15}
                            textAnchor="middle"
                            fill="#1e293b"
                            fontSize="12"
                            fontWeight="600"
                          >
                            {position.ticker}
                          </text>
                        </g>
                      );
                    }}
                  />
                </g>
              );
            })}
          </ScatterChart>
        </ResponsiveContainer>

        {/* Quadrant labels as overlay - positioned inside plot area */}
        <div className="absolute top-16 left-36 text-sm font-bold text-blue-700 pointer-events-none">
          Improving
        </div>
        <div className="absolute top-16 right-12 text-sm font-bold text-green-700 pointer-events-none">
          Leading
        </div>
        <div className="absolute bottom-28 left-36 text-sm font-bold text-red-700 pointer-events-none">
          Lagging
        </div>
        <div className="absolute bottom-28 right-12 text-sm font-bold text-amber-700 pointer-events-none">
          Weakening
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#22c55e' }} />
          <span className="text-slate-700">Leading</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#60a5fa' }} />
          <span className="text-slate-700">Improving</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#ef4444' }} />
          <span className="text-slate-700">Lagging</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: '#fbbf24' }} />
          <span className="text-slate-700">Weakening</span>
        </div>
      </div>
    </div>
  );
}
