interface BreadthIndicatorProps {
  percentage: number;
  above: number;
  total: number;
  status: string;
  color: string;
}

export function BreadthIndicator({ percentage, above, total, status, color }: BreadthIndicatorProps) {
  return (
    <div className="mt-6 p-4 bg-slate-50 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-slate-700">
          S&P 500 Market Breadth
        </h4>
        <span className="text-sm text-slate-600">
          {above} of {total} stocks above 20 DMA
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-8 bg-slate-200 rounded-full overflow-hidden mb-2">
        <div
          className="h-full flex items-center justify-center text-sm font-bold text-white transition-all duration-500"
          style={{
            width: `${percentage}%`,
            backgroundColor: color
          }}
        >
          {percentage.toFixed(1)}%
        </div>
      </div>

      {/* Status label */}
      <p className="text-sm font-medium" style={{ color }}>
        {status}
      </p>
    </div>
  );
}