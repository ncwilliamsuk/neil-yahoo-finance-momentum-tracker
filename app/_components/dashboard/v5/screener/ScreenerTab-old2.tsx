'use client';

// app/_components/dashboard/v5/screener/ScreenerTab.tsx
// Main container for Tab 5 — ETF Momentum Screener
// Manages all state, data fetching, filtering and score calculation.
// Components are imported from the screener/ folder — all V5 standalone.

import { useEffect, useState, useMemo } from 'react';
import useSWR                           from 'swr';
import { ETFData, Universe }            from '@/lib/v5/etfTypes';
import { getETFList }                    from '@/lib/v5/etfList';
import { mergeETFData, calculateScore, classifyLabel, parseLiquidity } from '@/lib/v5/etfCalculations';

import { ScreenerHeader }               from './ScreenerHeader';
import { ScreenerControlsPanel }        from './ScreenerControlsPanel';
import { ScreenerMainTable }            from './ScreenerMainTable';
import { ScreenerDualMomentumCard }     from './ScreenerDualMomentumCard';
import { ScreenerLabelHighlightsCard }  from './ScreenerLabelHighlightsCard';
import { ScreenerTopPerformersCard }    from './ScreenerTopPerformersCard';
import { ScreenerRotationOverviewCard } from './ScreenerRotationOverviewCard';

// ─────────────────────────────────────────────────────────────
// SWR config — identical pattern to all other V5 tabs
// provider: () => new Map() prevents stale cache on tab switch
// revalidateOnFocus: false prevents re-fetch on tab switch
// ─────────────────────────────────────────────────────────────

const SWR_OPTS = {
  revalidateOnFocus:     false,
  revalidateOnReconnect: false,
  provider:              () => new Map(),
};

const fetcher = (url: string) => fetch(url).then(r => r.json());

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface ApiResponse {
  success:      boolean;
  data:         Record<string, any>;
  universe:     Universe;
  etfCount:     number;
  successCount: number;
  failCount:    number;
  soniaRate:    number;
  soniaSource:  string;
  timestamp:    string;
  error?:       string;
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

export function ScreenerTab() {
  // ── Universe ────────────────────────────────────────────────
  const [universe, setUniverse] = useState<Universe>('core');

  // ── Controls state ──────────────────────────────────────────
  const [weights, setWeights]                       = useState({ m3: 33, m6: 33, m12: 34 });
  const [calculationMode, setCalculationMode]       = useState<'standard' | 'risk-adj'>('standard');
  const [removeLatestMonth, setRemoveLatestMonth]   = useState(false);
  const [maFilter, setMaFilter]                     = useState(false);
  const [searchTerm, setSearchTerm]                 = useState('');
  const [categoryFilter, setCategoryFilter]         = useState('all');
  const [labelFilter, setLabelFilter]               = useState('all');

  // ── Selection / compare ─────────────────────────────────────
  const [selectedETFs, setSelectedETFs] = useState<Set<string>>(new Set());
  const [compareMode, setCompareMode]   = useState(false);

  // ── SWR data fetch ───────────────────────────────────────────
  // Key changes when universe changes, triggering a fresh fetch.
  // On tab switch the key is unchanged so SWR returns cached data instantly.
  const swrKey = `/api/v5/etf-screener?universe=${universe}`;

  const {
    data:    result,
    error:   swrError,
    isLoading,
    mutate,
  } = useSWR<ApiResponse>(swrKey, fetcher, SWR_OPTS);

  // Derive values from SWR response
  const apiData      = result?.success ? result.data        : null;
  const soniaRate    = result?.success ? result.soniaRate    : null;
  const soniaSource  = result?.success ? result.soniaSource  : '';
  const successCount = result?.success ? result.successCount : 0;
  const failCount    = result?.success ? result.failCount    : 0;
  const loadError    = swrError
    ? (swrError instanceof Error ? swrError.message : 'Network error')
    : result?.success === false
    ? (result.error ?? 'Unknown error from API')
    : null;

  // ── Last updated display ─────────────────────────────────────
  const lastUpdated = useMemo(() => {
    if (!result?.timestamp) return 'Loading...';
    return new Date(result.timestamp).toLocaleDateString('en-GB', {
      weekday: 'long', year: 'numeric', month: 'long',
      day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }, [result?.timestamp]);

  // ── Universe toggle ──────────────────────────────────────────
  // Changing universe updates the SWR key which triggers a new fetch.
  const handleUniverseChange = (newUniverse: Universe) => {
    setUniverse(newUniverse);
    setSelectedETFs(new Set());
    setCompareMode(false);
  };

  // ── Refresh ──────────────────────────────────────────────────
  // mutate() forces SWR to re-fetch the current key
  const handleRefresh = () => mutate();

  // ── Merge metadata + market data ────────────────────────────
  const allETFsWithData = useMemo<ETFData[]>(() => {
    if (!apiData) return [];
    const list = getETFList(universe);
    return list.map(etf => {
      const marketData = apiData[etf.ticker.replace('.L', '')];
      return mergeETFData(etf, marketData ?? null);
    });
  }, [apiData, universe]);

  // ── Calculate scores and labels ─────────────────────────────
  const etfsWithScores = useMemo<ETFData[]>(() => {
    return allETFsWithData.map(etf => ({
      ...etf,
      score: calculateScore(etf, allETFsWithData, weights, calculationMode, removeLatestMonth),
      label: classifyLabel(etf),
    }));
  }, [allETFsWithData, weights, calculationMode, removeLatestMonth]);

  // ── Apply filters ────────────────────────────────────────────
  const filteredETFs = useMemo<ETFData[]>(() => {
    let filtered = etfsWithScores;

    if (compareMode && selectedETFs.size > 0) {
      filtered = filtered.filter(etf => selectedETFs.has(etf.ticker));
    }
    if (maFilter) {
      filtered = filtered.filter(etf => etf.above200MA === true);
    }
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(etf => etf.category === categoryFilter);
    }
    if (labelFilter !== 'all') {
      filtered = filtered.filter(etf => etf.label === labelFilter);
    }
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(etf =>
        etf.ticker.toLowerCase().includes(s)    ||
        etf.shortName.toLowerCase().includes(s) ||
        etf.fullName.toLowerCase().includes(s)
      );
    }

    return filtered;
  }, [etfsWithScores, compareMode, selectedETFs, maFilter, categoryFilter, labelFilter, searchTerm]);

  // Summary cards use filtered list in compare mode, full list otherwise
  const summaryETFs = useMemo<ETFData[]>(() => {
    return compareMode && selectedETFs.size > 0 ? filteredETFs : etfsWithScores;
  }, [compareMode, selectedETFs, filteredETFs, etfsWithScores]);

  // ── Handlers ─────────────────────────────────────────────────
  const handleCompareClick = () => {
    if (selectedETFs.size === 0 && !compareMode) {
      alert('Please select at least one ETF to compare');
      return;
    }
    setCompareMode(prev => !prev);
  };

  const handleExport = () => {
    const rankedAll = [...etfsWithScores].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const rankMap   = new Map<string, number>();
    rankedAll.forEach((etf, i) => rankMap.set(etf.ticker, i + 1));

    const sorted = [...filteredETFs].sort((a, b) => {
      return (rankMap.get(a.ticker) ?? 999) - (rankMap.get(b.ticker) ?? 999);
    });

    let csv = 'Rank,Ticker,Short Name,Full Name,Category,Price (£),TER%,' +
              '1M%,3M%,6M%,12M%,Sharpe 12M,Label,RSI,Liquidity,Score,Currency Normalised\n';

    sorted.forEach(etf => {
      const rank = rankMap.get(etf.ticker) ?? 999;
      const fmt  = (v: number | null | undefined, dp = 1) =>
        v != null ? v.toFixed(dp) : '';

      csv += [
        rank,
        etf.ticker.replace('.L', ''),
        `"${etf.shortName}"`,
        `"${etf.fullName}"`,
        `"${etf.category}"`,
        fmt(etf.price, 2),
        fmt(etf.ter, 2),
        fmt(etf.returns?.['1M']),
        fmt(etf.returns?.['3M']),
        fmt(etf.returns?.['6M']),
        fmt(etf.returns?.['12M']),
        fmt(etf.sharpeRatios?.['12M'], 2),
        etf.label ?? '',
        etf.rsi ?? '',
        Math.round(parseLiquidity(etf.liquidity)),
        fmt(etf.score),
        etf.currencyNormalized ? 'Yes' : 'No',
      ].join(',') + '\n';
    });

    const blob  = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url   = URL.createObjectURL(blob);
    const link  = document.createElement('a');
    const date  = new Date().toISOString().split('T')[0];
    const mode  = calculationMode === 'risk-adj' ? 'risk-adj' : 'standard';
    link.href     = url;
    link.download = `etf-screener-${universe}-${date}-${mode}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // ── Loading screen ───────────────────────────────────────────
  if (isLoading) {
    const etfCount  = getETFList(universe).length;
    const estSeconds = Math.round((etfCount * 0.2) + 5);
    const estMinutes = Math.ceil(estSeconds / 60);

    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-semibold text-slate-700 mb-2">
            Loading ETF Data...
          </div>
          <div className="text-sm text-slate-500 mb-1">
            Fetching {etfCount} ETFs from Yahoo Finance
          </div>
          <div className="text-xs text-slate-400">
            Estimated time: ~{estMinutes} {estMinutes === 1 ? 'minute' : 'minutes'}
          </div>
          {universe === 'extended' && (
            <div className="mt-3 text-xs text-amber-600 font-medium">
              Extended universe — ~188 ETFs across all major categories
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Error screen ─────────────────────────────────────────────
  if (loadError) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold text-red-600 mb-2">Failed to load data</div>
          <div className="text-sm text-slate-500 mb-4">{loadError}</div>
          <button
            onClick={handleRefresh}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header */}
      <ScreenerHeader
        universe={universe}
        onUniverseChange={handleUniverseChange}
        etfCount={getETFList(universe).length}
        successCount={successCount}
        failCount={failCount}
        soniaRate={soniaRate}
        soniaSource={soniaSource}
        lastUpdated={lastUpdated}
        onRefresh={handleRefresh}
        onExport={handleExport}
      />

      {/* Status banners */}
      {failCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-800">
            ⚠️ {failCount} ETF{failCount !== 1 ? 's' : ''} failed to load from Yahoo Finance
            and will show N/A. This is usually caused by delisted or renamed tickers.
          </p>
        </div>
      )}

      {compareMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            🔍 Compare Mode — showing {selectedETFs.size} selected ETF{selectedETFs.size !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {soniaSource && soniaSource !== 'FRED IUDSOIA' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            ⚠️ SONIA sourced from {soniaSource} — Sharpe ratios use an approximated risk-free rate.
          </p>
        </div>
      )}

      {/* Controls */}
      <ScreenerControlsPanel
        universe={universe}
        weights={weights}
        onWeightsChange={setWeights}
        calculationMode={calculationMode}
        onCalculationModeChange={setCalculationMode}
        removeLatestMonth={removeLatestMonth}
        onRemoveLatestMonthChange={setRemoveLatestMonth}
        maFilter={maFilter}
        onMaFilterChange={setMaFilter}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        labelFilter={labelFilter}
        onLabelFilterChange={setLabelFilter}
        selectedCount={selectedETFs.size}
        onCompareClick={handleCompareClick}
        compareMode={compareMode}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-5">
        <ScreenerDualMomentumCard allETFs={etfsWithScores} soniaRate={soniaRate} />
        <ScreenerLabelHighlightsCard allETFs={summaryETFs} />
        <ScreenerTopPerformersCard allETFs={summaryETFs} />
      </div>

      {/* Main Table */}
      <ScreenerMainTable
        etfs={filteredETFs}
        allETFs={etfsWithScores}
        onSelectionChange={setSelectedETFs}
        selectedETFs={selectedETFs}
      />

      {/* Rotation Overview */}
      <ScreenerRotationOverviewCard allETFs={etfsWithScores} />

    </div>
  );
}
