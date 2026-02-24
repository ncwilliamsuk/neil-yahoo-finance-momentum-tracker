// app/_components/dashboard/v5/macro/RRGTimeline.tsx
'use client';

import { useMemo } from 'react';

interface RRGTimelineProps {
  timeOffset: number; // weeks back from current (0 = current, 52 = 1 year ago)
  onTimeOffsetChange: (offset: number) => void;
  maxWeeksBack?: number; // maximum history available
}

export function RRGTimeline({ 
  timeOffset, 
  onTimeOffsetChange,
  maxWeeksBack = 52  // Changed to 52 weeks (1 year)
}: RRGTimelineProps) {
  // Calculate the date for the current offset
  const displayDate = useMemo(() => {
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() - (timeOffset * 7));
    
    if (timeOffset === 0) {
      return 'Current';
    }
    
    // Show month and year for longer timeframes
    return targetDate.toLocaleDateString('en-US', { 
      month: 'short', 
      year: 'numeric'
    });
  }, [timeOffset]);

  // Markers for every 4 weeks (13 positions over 52 weeks)
  const markers = useMemo(() => {
    const weeksBack = [0, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52];
    return weeksBack.map(weeks => {
      if (weeks === 0) return { weeks, label: 'Now' };
      
      const date = new Date();
      date.setDate(date.getDate() - (weeks * 7));
      
      // Show month abbreviation for markers
      return {
        weeks,
        label: date.toLocaleDateString('en-US', { month: 'short' })
      };
    });
  }, []);

  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 shadow-sm border border-blue-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">📅 Timeline:</span>
          <span className="text-sm text-slate-600">View RRG as of</span>
          <span className="px-3 py-1 bg-white rounded-lg text-sm font-bold text-blue-600 shadow-sm">
            {displayDate}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Info text moved here */}
          <p className="text-xs text-slate-600">
            {timeOffset === 0 ? (
              <>Current positions with full trail history</>
            ) : (
              <>Historical snapshot from {displayDate} ({timeOffset} week{timeOffset !== 1 ? 's' : ''} ago)</>
            )}
          </p>
          
          {timeOffset > 0 && (
            <button
              onClick={() => onTimeOffsetChange(0)}
              className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Reset to Current
            </button>
          )}
        </div>
      </div>

      {/* Slider */}
      <div className="relative">
        {/* Slider track with gradient */}
        <div className="relative h-2 bg-gradient-to-r from-blue-400 via-blue-200 to-slate-300 rounded-full mb-6">
          {/* Custom slider thumb */}
          <input
            type="range"
            min="0"
            max={maxWeeksBack}
            step={4}
            value={maxWeeksBack - timeOffset}
            onChange={(e) => onTimeOffsetChange(maxWeeksBack - parseInt(e.target.value))}
            className="absolute top-0 left-0 w-full h-2 opacity-0 cursor-pointer z-10"
          />
          {/* Visual thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-blue-600 border-2 border-white rounded-full shadow-lg transition-all pointer-events-none"
            style={{ 
              left: `calc(${((maxWeeksBack - timeOffset) / maxWeeksBack) * 100}% - 10px)`,
            }}
          />
        </div>

        {/* Time markers */}
        <div className="relative -mt-4">
          {markers.map((marker) => (
            <div
              key={marker.weeks}
              className="absolute -translate-x-1/2"
              style={{ left: `${((maxWeeksBack - marker.weeks) / maxWeeksBack) * 100}%` }}
            >
              {/* Tick mark */}
              <div className="w-px h-3 bg-slate-400 mx-auto mb-1" />
              {/* Label */}
              <span className="text-xs text-slate-600 whitespace-nowrap">
                {marker.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
