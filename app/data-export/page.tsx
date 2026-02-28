'use client';

// app/data-export/page.tsx

import { useState } from 'react';

type Frequency = 'daily' | 'weekly' | 'monthly';
type Status    = 'idle' | 'fetching' | 'done' | 'error';

interface ExportStats {
  total:     number;
  success:   number;
  failed:    number;
  failedTickers: string[];
  frequency: Frequency;
  ernsOk:    boolean;
  vagsOk:    boolean;
  swdaOk:    boolean;
  soniaOk:   boolean;
  dateRange: { start: string; end: string; count: number };
}

interface ExportResponse {
  success:  boolean;
  prices:   Record<string, Record<string, number>>;
  returns:  Record<string, Record<string, number>>;
  sonia:    Record<string, number>;
  dates:    string[];
  tickers:  string[];
  meta:     Record<string, { shortName: string; fullName: string; category: string }>;
  stats:    ExportStats;
  error?:   string;
}

// ─────────────────────────────────────────────────────────────
// CSV builders
// ─────────────────────────────────────────────────────────────

function buildPricesCSV(data: ExportResponse, tickers: string[]): string {
  const rows: string[] = [];
  rows.push(['Date', ...tickers].join(','));
  for (const date of data.dates) {
    const row = [date];
    for (const t of tickers) {
      const p = t === 'SONIA' ? data.sonia[date] : data.prices[t]?.[date];
      row.push(p != null ? p.toString() : '');
    }
    rows.push(row.join(','));
  }
  return rows.join('\n');
}

function buildReturnsCSV(data: ExportResponse, tickers: string[]): string {
  const rows: string[] = [];
  // Returns CSV excludes SONIA (it's a rate, not a price — no return to calculate)
  const retTickers = tickers.filter(t => t !== 'SONIA');
  rows.push(['Date', ...retTickers].join(','));
  const returnDates = data.dates.slice(1);
  for (const date of returnDates) {
    const row = [date];
    for (const t of retTickers) {
      const r = data.returns[t]?.[date];
      row.push(r != null ? r.toString() : '');
    }
    rows.push(row.join(','));
  }
  return rows.join('\n');
}

function buildMetaCSV(data: ExportResponse, tickers: string[]): string {
  const rows: string[] = [];
  rows.push(['Ticker', 'Short Name', 'Full Name', 'Category'].join(','));
  for (const t of tickers) {
    const m = data.meta[t];
    if (m) {
      rows.push([t, `"${m.shortName}"`, `"${m.fullName}"`, `"${m.category}"`].join(','));
    }
  }
  return rows.join('\n');
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────
// Estimates
// ─────────────────────────────────────────────────────────────

function estimateTime(years: number, freq: Frequency): string {
  // ~175 ETFs × 200ms delay = ~35s base, plus Yahoo latency ~1-2s per ticker
  const base = 175 * 1.5; // seconds
  const multiplier = freq === 'daily' ? 1.3 : freq === 'weekly' ? 1.0 : 0.9;
  const yearFactor = Math.max(1, years / 10);
  const secs = Math.round(base * multiplier * yearFactor);
  if (secs < 60) return `~${secs}s`;
  return `~${Math.floor(secs / 60)}–${Math.ceil(secs / 60) + 1} min`;
}

function estimateRows(years: number, freq: Frequency): string {
  const weeks   = Math.round(years * 52);
  const days    = Math.round(years * 252);
  const months  = Math.round(years * 12);
  const n = freq === 'daily' ? days : freq === 'weekly' ? weeks : months;
  return n.toLocaleString();
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export default function DataExportPage() {
  const [status,    setStatus]    = useState<Status>('idle');
  const [data,      setData]      = useState<ExportResponse | null>(null);
  const [error,     setError]     = useState<string | null>(null);
  const [elapsed,   setElapsed]   = useState<number>(0);
  const [years,     setYears]     = useState<number>(10);
  const [frequency, setFrequency] = useState<Frequency>('weekly');

  const handleFetch = async () => {
    setStatus('fetching');
    setData(null);
    setError(null);
    setElapsed(0);

    const startTime = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);

    try {
      const res    = await fetch(`/api/v5/weekly-export?years=${years}&frequency=${frequency}`);
      const result = await res.json() as ExportResponse;
      clearInterval(timer);
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
      if (result.success) { setData(result); setStatus('done'); }
      else { setError(result.error ?? 'Unknown error'); setStatus('error'); }
    } catch (err) {
      clearInterval(timer);
      setError(err instanceof Error ? err.message : 'Network error');
      setStatus('error');
    }
  };

  const handleDownload = () => {
    if (!data) return;

    // ETF tickers sorted by category then alpha, utility columns pinned at end
    const etfTickers = [...data.tickers].sort((a, b) => {
      const catA = data.meta[a]?.category ?? '';
      const catB = data.meta[b]?.category ?? '';
      if (catA !== catB) return catA.localeCompare(catB);
      return a.localeCompare(b);
    });

    // Utility columns: ERNS, VAGS pinned before SONIA
    const utilityTickers: string[] = [];
    if (data.prices['ERNS'])          utilityTickers.push('ERNS');
    if (data.prices['VAGS'])          utilityTickers.push('VAGS');
    if (Object.keys(data.sonia).length > 0) utilityTickers.push('SONIA');

    const allTickers = [...etfTickers, ...utilityTickers];
    const dateStr    = new Date().toISOString().split('T')[0];
    const suffix     = `${data.stats.frequency}-${years}yr-${dateStr}`;

    downloadCSV(buildPricesCSV(data, allTickers),  `etf-prices-${suffix}.csv`);
    setTimeout(() => downloadCSV(buildReturnsCSV(data, allTickers), `etf-returns-${suffix}.csv`),  500);
    setTimeout(() => downloadCSV(buildMetaCSV(data, etfTickers),    `etf-metadata-${dateStr}.csv`), 1000);
  };

  const formatElapsed = (s: number) => s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Header */}
        <div className="bg-white rounded-xl p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">ETF Weekly Data Export</h1>
          <p className="text-slate-500 text-sm">
            Fetches historical price data for all ETFs in <code className="bg-slate-100 px-1 rounded text-xs">backtestETFUniverse.ts</code> plus
            utility columns ERNS, VAGS (LifeStrategy 60), and SONIA (FRED IUDSOIA).
            Downloads three CSV files: prices, returns, and metadata.
          </p>
        </div>

        {/* Settings */}
        <div className="bg-white rounded-xl p-6 shadow-sm space-y-5">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Export Settings</h2>

          {/* Frequency toggle */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-slate-700">Data Frequency</span>
            </div>
            <div className="flex gap-2">
              {(['weekly','monthly','daily'] as Frequency[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFrequency(f)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                    frequency === f
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-400'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            {frequency === 'daily' && (
              <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                ⚠ Daily data for {years} years will produce ~{estimateRows(years, 'daily')} rows × ~175 columns.
                File size will be large and fetch time significantly longer. Only use if you need intraday-level backtesting precision.
              </div>
            )}
          </div>

          {/* Years slider */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-slate-700">Years of History</span>
              <span className="text-sm font-bold text-slate-900">{years} {years === 1 ? 'year' : 'years'}</span>
            </div>
            <input
              type="range"
              min={1} max={30} step={1}
              value={years}
              onChange={e => setYears(parseInt(e.target.value))}
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>1 yr</span>
              <span>10 yr</span>
              <span>20 yr</span>
              <span>30 yr</span>
            </div>
            {years > 20 && (
              <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                ⚠ Beyond 20 years many LSE-listed ETFs won't have full history — they will be exported with partial data from their launch date onward.
                SONIA data from FRED is available back to 1997.
              </div>
            )}
          </div>

          {/* Summary row */}
          <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 flex justify-between">
            <span>~{estimateRows(years, frequency)} rows × ~175 columns</span>
            <span>Estimated fetch time: <strong>{estimateTime(years, frequency)}</strong></span>
          </div>
        </div>

        {/* Action area */}
        <div className="bg-white rounded-xl p-8 shadow-sm">

          {/* Idle */}
          {status === 'idle' && (
            <div className="text-center">
              <button
                onClick={handleFetch}
                className="px-8 py-4 bg-blue-600 text-white rounded-xl text-base font-semibold hover:bg-blue-700 transition-colors shadow-sm"
              >
                🚀 Fetch &amp; Download Data
              </button>
              <p className="mt-3 text-xs text-slate-400">Do not close this tab while fetching</p>
            </div>
          )}

          {/* Fetching */}
          {status === 'fetching' && (
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
              <p className="text-slate-700 font-semibold text-lg mb-1">Fetching from Yahoo Finance + FRED...</p>
              <p className="text-slate-500 text-sm mb-1">
                {frequency} · {years} years · ~175 ETFs + ERNS + VAGS + SONIA
              </p>
              <p className="text-slate-400 text-sm">
                Elapsed: <span className="font-mono font-semibold text-slate-600">{formatElapsed(elapsed)}</span>
                &nbsp;· Please keep this tab open
              </p>
            </div>
          )}

          {/* Error */}
          {status === 'error' && (
            <div className="text-center">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                <p className="text-red-800 font-semibold mb-1">Fetch failed</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
              <button onClick={handleFetch} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                Retry
              </button>
            </div>
          )}

          {/* Done */}
          {status === 'done' && data && (
            <div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-700">{data.stats.success}</div>
                  <div className="text-xs text-green-600 font-medium mt-1">ETFs loaded</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-700">{data.stats.dateRange.count}</div>
                  <div className="text-xs text-blue-600 font-medium mt-1">{data.stats.frequency} dates</div>
                </div>
                <div className={`rounded-lg p-4 text-center ${data.stats.failed > 0 ? 'bg-yellow-50' : 'bg-slate-50'}`}>
                  <div className={`text-2xl font-bold ${data.stats.failed > 0 ? 'text-yellow-700' : 'text-slate-400'}`}>
                    {data.stats.failed}
                  </div>
                  <div className={`text-xs font-medium mt-1 ${data.stats.failed > 0 ? 'text-yellow-600' : 'text-slate-400'}`}>
                    Failed tickers
                  </div>
                </div>
              </div>

              {/* Utility ticker status */}
              <div className="space-y-2 mb-4">
                {[
                  { key: 'ernsOk',  label: 'ERNS',  desc: 'SONIA proxy (Yahoo Finance)' },
                  { key: 'vagsOk',  label: 'VAGS',  desc: 'LifeStrategy 60 benchmark' },
                  { key: 'swdaOk',  label: 'SWDA',  desc: 'MSCI World (regime filter)' },
                  { key: 'soniaOk', label: 'SONIA', desc: 'FRED IUDSOIA historical rates' },
                ].map(({ key, label, desc }) => {
                  const ok = data.stats[key as keyof ExportStats] as boolean;
                  return (
                    <div key={key} className={`rounded-lg px-3 py-2 text-xs flex items-center justify-between ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-yellow-50 text-yellow-700'}`}>
                      <span><strong>{label}</strong> — {desc}</span>
                      <span>{ok ? '✓ included' : '⚠ failed'}</span>
                    </div>
                  );
                })}
              </div>

              {/* Date range */}
              <div className="bg-slate-50 rounded-lg p-3 mb-5 text-center text-sm text-slate-600">
                <span className="font-medium">{data.stats.dateRange.start}</span>
                <span className="mx-2 text-slate-400">→</span>
                <span className="font-medium">{data.stats.dateRange.end}</span>
                <span className="ml-2 text-slate-400">· {formatElapsed(elapsed)}</span>
              </div>

              {/* Failed tickers */}
              {data.stats.failed > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-5">
                  <p className="text-sm text-yellow-800 font-semibold mb-1">
                    ⚠️ {data.stats.failed} ticker{data.stats.failed !== 1 ? 's' : ''} failed to load
                  </p>
                  <p className="text-xs text-yellow-700">{data.stats.failedTickers.join(', ')}</p>
                  <p className="text-xs text-yellow-600 mt-1">Excluded from CSV. Usually delisted or renamed.</p>
                </div>
              )}

              {/* Download */}
              <div className="text-center">
                <button
                  onClick={handleDownload}
                  className="px-8 py-4 bg-green-600 text-white rounded-xl text-base font-semibold hover:bg-green-700 transition-colors shadow-sm"
                >
                  📥 Download 3 CSV Files
                </button>
                <p className="mt-2 text-xs text-slate-400">
                  Prices · Returns · Metadata — downloads start automatically
                </p>
                <button onClick={handleFetch} className="mt-4 px-4 py-2 text-sm text-slate-500 hover:text-slate-700 underline">
                  Re-fetch fresh data
                </button>
              </div>

            </div>
          )}

        </div>

        <p className="text-center text-xs text-slate-400">
          Data: Yahoo Finance (prices) · FRED IUDSOIA (SONIA) · Adjusted close prices · LSE ETFs
        </p>

      </div>
    </div>
  );
}
