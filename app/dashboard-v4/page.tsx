// app/dashboard-v4/page.tsx

'use client';

import { ETF_LIST } from '@/lib/etf/etfList';
import { MOCK_DATA } from '@/lib/etf/mockData';
import { Header } from '@/app/_components/dashboard/Header';
import { ControlsPanel } from '@/app/_components/dashboard/ControlsPanel';
import { MainTable } from '@/app/_components/dashboard/MainTable';
import { DualMomentumCard } from '@/app/_components/dashboard/DualMomentumCard';
import { LabelHighlightsCard } from '@/app/_components/dashboard/LabelHighlightsCard';
import { TopPerformersCard } from '@/app/_components/dashboard/TopPerformersCard';
import { RotationOverviewCard } from '@/app/_components/dashboard/RotationOverviewCard';
import { useEffect, useState, useMemo } from 'react';
import { ETFData } from '@/lib/etf/types';
import { mergeETFData, calculateScore, classifyLabel } from '@/lib/etf/calculations';

export default function DashboardPage() {
  const [currentDate, setCurrentDate] = useState('Loading...');
  const [apiData, setApiData] = useState<Record<string, any> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [useMockData, setUseMockData] = useState(false);
  
  // State for controls
  const [weights, setWeights] = useState({ m3: 33, m6: 33, m12: 34 });
  const [calculationMode, setCalculationMode] = useState<'standard' | 'risk-adj'>('standard');
  const [removeLatestMonth, setRemoveLatestMonth] = useState(false);
  const [maFilter, setMaFilter] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [labelFilter, setLabelFilter] = useState('all');
  const [selectedETFs, setSelectedETFs] = useState<Set<string>>(new Set());
  const [compareMode, setCompareMode] = useState(false);

  useEffect(() => {
    const formatted = new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    setCurrentDate(formatted);
  }, []);

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/etf-data');
      const result = await response.json();
      
      if (result.success) {
        setApiData(result.data);
        setUseMockData(false);
        console.log(`✓ Loaded real data for ${Object.keys(result.data).length} ETFs`);
      } else {
        console.warn('API failed, using mock data');
        setUseMockData(true);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      console.warn('Using mock data as fallback');
      setUseMockData(true);
    } finally {
      setIsLoading(false);
    }
  };

  // Choose data source
  const dataSource = useMockData ? MOCK_DATA : apiData;

  // Prepare ETF data with calculations
  const allETFsWithData = useMemo(() => {
    if (!dataSource) return [];
    
    return ETF_LIST.map(etf => {
      const marketData = dataSource[etf.ticker.replace('.L', '')];
      return mergeETFData(etf, marketData);
    });
  }, [dataSource]);

  // Calculate scores and labels
  const etfsWithScores = useMemo(() => {
    return allETFsWithData.map(etf => {
      const score = calculateScore(etf, allETFsWithData, weights, calculationMode, removeLatestMonth);
      const label = classifyLabel(etf);
      return { ...etf, score, label };
    });
  }, [allETFsWithData, weights, calculationMode, removeLatestMonth]);

  // Apply filters
  const filteredETFs = useMemo(() => {
    let filtered = etfsWithScores;

    // Compare Mode - filter to selected ETFs only
    if (compareMode && selectedETFs.size > 0) {
      filtered = filtered.filter(etf => selectedETFs.has(etf.ticker));
    }

    // MA Filter
    if (maFilter) {
      filtered = filtered.filter(etf => etf.above200MA === true);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(etf => etf.category === categoryFilter);
    }

    // Label filter
    if (labelFilter !== 'all') {
      filtered = filtered.filter(etf => etf.label === labelFilter);
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(etf =>
        etf.ticker.toLowerCase().includes(search) ||
        etf.shortName.toLowerCase().includes(search) ||
        etf.fullName.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [etfsWithScores, compareMode, selectedETFs, maFilter, categoryFilter, labelFilter, searchTerm]);

  // For summary cards - use filtered ETFs in compare mode, all ETFs otherwise
  const summaryETFs = useMemo(() => {
    return compareMode && selectedETFs.size > 0 ? filteredETFs : etfsWithScores;
  }, [compareMode, selectedETFs, filteredETFs, etfsWithScores]);

  const handleRefresh = () => {
    console.log('Refreshing data...');
    fetchData();
  };

  const handleExport = () => {
    console.log('Exporting CSV...');
    
    // Calculate fixed momentum ranks for ALL ETFs (same as table)
    const rankedAllETFs = [...etfsWithScores].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const rankMap = new Map<string, number>();
    rankedAllETFs.forEach((etf, index) => {
      rankMap.set(etf.ticker, index + 1);
    });
    
    // Use the filtered ETFs that are shown in the table
    const dataToExport = filteredETFs;
    
    // Sort by momentum rank (same as overall ranking)
    const sortedData = [...dataToExport].sort((a, b) => {
      const rankA = rankMap.get(a.ticker) ?? 999;
      const rankB = rankMap.get(b.ticker) ?? 999;
      return rankA - rankB;
    });
    
    // Create CSV header
    let csv = 'Rank,Ticker,Short Name,Full Name,Category,Price (£),TER%,1M%,3M%,6M%,12M%,Label,RSI,Liquidity,Score,Currency Normalized\n';
    
    // Add data rows
    sortedData.forEach((etf) => {
      const rank = rankMap.get(etf.ticker) ?? 999;
      const ticker = etf.ticker.replace('.L', '');
      const price = etf.price ? etf.price.toFixed(2) : '';
      const ter = etf.ter.toFixed(2);
      const r1m = etf.returns?.['1M'] !== null && etf.returns?.['1M'] !== undefined ? etf.returns['1M'].toFixed(1) : '';
      const r3m = etf.returns?.['3M'] !== null && etf.returns?.['3M'] !== undefined ? etf.returns['3M'].toFixed(1) : '';
      const r6m = etf.returns?.['6M'] !== null && etf.returns?.['6M'] !== undefined ? etf.returns['6M'].toFixed(1) : '';
      const r12m = etf.returns?.['12M'] !== null && etf.returns?.['12M'] !== undefined ? etf.returns['12M'].toFixed(1) : '';
      const label = etf.label || '';
      const rsi = etf.rsi || '';
      const liquidity = etf.liquidity || '';
      const score = etf.score?.toFixed(1) || '0.0';
      const currencyNorm = etf.currencyNormalized ? 'Yes' : 'No';
      
      // Escape fields that might contain commas
      const shortName = `"${etf.shortName}"`;
      const fullName = `"${etf.fullName}"`;
      const category = `"${etf.category}"`;
      
      csv += `${rank},${ticker},${shortName},${fullName},${category},${price},${ter},${r1m},${r3m},${r6m},${r12m},${label},${rsi},${liquidity},${score},${currencyNorm}\n`;
    });
    
    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Generate filename with current date
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const modeStr = calculationMode === 'risk-adj' ? 'risk-adj' : 'standard';
    const filterStr = maFilter ? 'ma-filter' : 'all';
    
    link.download = `etf-momentum-${dateStr}-${modeStr}-${filterStr}.csv`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log(`✓ Exported ${sortedData.length} ETFs to CSV`);
  };

  const handleCompareClick = () => {
    if (selectedETFs.size === 0 && !compareMode) {
      alert('Please select at least one ETF to compare');
      return;
    }
    
    setCompareMode(!compareMode);
    console.log(`Compare mode ${!compareMode ? 'ON' : 'OFF'}, Selected: ${selectedETFs.size} ETFs`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 p-5 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-semibold text-slate-700 mb-2">
            Loading ETF Data...
          </div>
          <div className="text-sm text-slate-500">
            Fetching data from Yahoo Finance (this may take 1-2 minutes)
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-5">
      <div className="max-w-7xl mx-auto">
        <Header 
          etfCount={ETF_LIST.length}
          lastUpdate={currentDate}
          onRefresh={handleRefresh}
          onExport={handleExport}
        />

        {useMockData && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-5">
            <p className="text-sm text-yellow-800">
              ⚠️ Using mock data (11 ETFs). Real API data failed to load.
            </p>
          </div>
        )}

        {!useMockData && apiData && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-5">
            <p className="text-sm text-green-800">
              ✓ Using real Yahoo Finance data ({Object.keys(apiData).length} ETFs loaded)
            </p>
          </div>
        )}

        {compareMode && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-5">
            <p className="text-sm text-blue-800">
              🔍 Compare Mode Active - Showing {selectedETFs.size} selected ETF{selectedETFs.size !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        <ControlsPanel
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
<div className="grid grid-cols-3 gap-5 mb-5">
  <DualMomentumCard allETFs={etfsWithScores} />  {/* Always uses all ETFs */}
  <LabelHighlightsCard allETFs={summaryETFs} />
  <TopPerformersCard allETFs={summaryETFs} />
</div>

        <MainTable 
          etfs={filteredETFs}
          allETFs={etfsWithScores}
          onSelectionChange={setSelectedETFs}
          selectedETFs={selectedETFs}
        />

        {/* Rotation Overview Card - ADD THIS SECTION */}
        <div className="mt-5">
          <RotationOverviewCard allETFs={etfsWithScores} />
        </div>

      </div>
    </div>
  );
}