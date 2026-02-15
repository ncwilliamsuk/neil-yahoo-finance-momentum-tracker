// app/_components/dashboard/Header.tsx

'use client';

interface HeaderProps {
  etfCount: number;
  lastUpdate: string;
  onRefresh?: () => void;
  onExport?: () => void;
}

export function Header({ etfCount, lastUpdate, onRefresh, onExport }: HeaderProps) {
  return (
    <div className="bg-white rounded-xl p-7 shadow-sm mb-5">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 mb-1.5">
            ETF Momentum Dashboard V4
          </h1>
          <p className="text-sm text-slate-500">
            Percentile-based ranking • {etfCount} ETFs • Updated {lastUpdate}
          </p>
        </div>

        <div className="flex gap-3">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
            >
              <span>🔄</span>
              Refresh Data
            </button>
          )}

          {onExport && (
            <button
              onClick={onExport}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
            >
              <span>📊</span>
              Export CSV
            </button>
          )}
        </div>
      </div>
    </div>
  );
}