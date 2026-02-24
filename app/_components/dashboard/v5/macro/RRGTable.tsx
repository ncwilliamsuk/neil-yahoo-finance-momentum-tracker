// app/_components/dashboard/v5/macro/RRGTable.tsx
'use client';

import { useState } from 'react';
import { RRGDataPoint } from '@/lib/v5/rrg';

interface RRGTableProps {
  positions: RRGDataPoint[];
  view: 'sectors' | 'factors' | 'global';
  hiddenTickers: Set<string>;
  onToggleTicker: (ticker: string) => void;
}

type SortKey = 'ticker' | 'name' | 'type' | 'quadrant' | 'weeklyChange';
type SortDirection = 'asc' | 'desc';

export function RRGTable({ positions, view, hiddenTickers, onToggleTicker }: RRGTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('quadrant');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  // Quadrant order for sorting
  const quadrantOrder = { Leading: 1, Improving: 2, Weakening: 3, Lagging: 4 };

  const sortedPositions = [...positions].sort((a, b) => {
    let aVal: any, bVal: any;

    switch (sortKey) {
      case 'ticker':
        aVal = a.ticker;
        bVal = b.ticker;
        break;
      case 'name':
        aVal = a.name;
        bVal = b.name;
        break;
      case 'type':
        aVal = a.type || '';
        bVal = b.type || '';
        break;
      case 'weeklyChange':
        aVal = a.weeklyChange;
        bVal = b.weeklyChange;
        break;
      case 'quadrant':
        aVal = quadrantOrder[a.quadrant];
        bVal = quadrantOrder[b.quadrant];
        break;
    }

    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) {
      return <span className="text-slate-400">⇅</span>;
    }
    return <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  const showTypeColumn = view === 'sectors';

  // Color coding for Type column
  const getTypeColor = (type: string) => {
    if (type === 'Cyc') return '#3b82f6'; // Blue
    if (type === 'Def') return '#f97316'; // Orange
    return '#94a3b8'; // Gray default
  };

  const getTypeBgColor = (type: string) => {
    if (type === 'Cyc') return '#dbeafe'; // Light blue
    if (type === 'Def') return '#fed7aa'; // Light orange
    return '#f1f5f9'; // Light gray default
  };

  if (positions.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          RRG Positions
        </h3>
        <div className="text-center py-8 text-slate-500">
          No positions available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        RRG Positions
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              {/* Checkbox */}
              <th className="text-left py-3 px-2 font-semibold text-slate-700 w-12">
                Show
              </th>
              
              {/* Symbol */}
              <th
                className="text-left py-3 px-4 font-semibold text-slate-700 cursor-pointer hover:bg-slate-50"
                onClick={() => handleSort('ticker')}
              >
                <div className="flex items-center gap-2">
                  Symbol <SortIcon columnKey="ticker" />
                </div>
              </th>
              
              {/* Name */}
              <th
                className="text-left py-3 px-4 font-semibold text-slate-700 cursor-pointer hover:bg-slate-50"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-2">
                  Name <SortIcon columnKey="name" />
                </div>
              </th>
              
              {/* Type (only for sectors) */}
              {showTypeColumn && (
                <th
                  className="text-center py-3 px-4 font-semibold text-slate-700 cursor-pointer hover:bg-slate-50 w-20"
                  onClick={() => handleSort('type')}
                >
                  <div className="flex items-center justify-center gap-2">
                    Type <SortIcon columnKey="type" />
                  </div>
                </th>
              )}
              
              {/* Quadrant */}
              <th
                className="text-center py-3 px-4 font-semibold text-slate-700 cursor-pointer hover:bg-slate-50"
                onClick={() => handleSort('quadrant')}
              >
                <div className="flex items-center justify-center gap-2">
                  Quadrant <SortIcon columnKey="quadrant" />
                </div>
              </th>
              
              {/* % Change */}
              <th
                className="text-right py-3 px-4 font-semibold text-slate-700 cursor-pointer hover:bg-slate-50 w-24"
                onClick={() => handleSort('weeklyChange')}
              >
                <div className="flex items-center justify-end gap-2">
                  % Chg <SortIcon columnKey="weeklyChange" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedPositions.map((position) => {
              const isHidden = hiddenTickers.has(position.ticker);
              const quadrantBgColor = position.color + '33'; // 20% opacity

              return (
                <tr
                  key={position.ticker}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  style={{ backgroundColor: isHidden ? '#f1f5f9' : 'transparent' }}
                >
                  {/* Checkbox */}
                  <td className="py-3 px-2">
                    <input
                      type="checkbox"
                      checked={!isHidden}
                      onChange={() => onToggleTicker(position.ticker)}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </td>
                  
                  {/* Symbol */}
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-900">
                      {position.ticker}
                    </span>
                  </td>
                  
                  {/* Name */}
                  <td className="py-3 px-4 text-slate-700">
                    {position.name}
                  </td>
                  
                  {/* Type with color coding */}
                  {showTypeColumn && (
                    <td className="py-3 px-4 text-center">
                      {position.type && (
                        <span
                          className="inline-block px-2 py-1 rounded text-xs font-semibold"
                          style={{
                            backgroundColor: getTypeBgColor(position.type),
                            color: getTypeColor(position.type)
                          }}
                        >
                          {position.type}
                        </span>
                      )}
                    </td>
                  )}
                  
                  {/* Quadrant */}
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: position.color }}
                      />
                      <span
                        className="inline-block px-3 py-1 rounded text-xs font-semibold"
                        style={{ 
                          backgroundColor: quadrantBgColor,
                          color: position.color
                        }}
                      >
                        {position.quadrant}
                      </span>
                    </div>
                  </td>
                  
                  {/* % Change */}
                  <td className="py-3 px-4 text-right">
                    <span className={`font-medium ${
                      position.weeklyChange >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {position.weeklyChange >= 0 ? '+' : ''}{position.weeklyChange.toFixed(2)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Stats */}
      <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-4 gap-4 text-center">
        {(['Leading', 'Improving', 'Lagging', 'Weakening'] as const).map((quadrant) => {
          const count = positions.filter(p => p.quadrant === quadrant).length;
          const color = positions.find(p => p.quadrant === quadrant)?.color || '#94a3b8';
          
          return (
            <div key={quadrant}>
              <div className="text-2xl font-bold" style={{ color }}>
                {count}
              </div>
              <div className="text-xs text-slate-600">{quadrant}</div>
            </div>
          );
        })}
      </div>

      {/* Color Legend for Sectors */}
      {showTypeColumn && (
        <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3b82f6' }} />
            <span className="text-slate-700">Cyclical</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: '#f97316' }} />
            <span className="text-slate-700">Defensive</span>
          </div>
        </div>
      )}
    </div>
  );
}
