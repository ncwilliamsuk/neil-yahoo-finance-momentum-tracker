'use client';

import { useState, useMemo } from 'react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ReferenceLine, ErrorBar } from 'recharts';

interface ADLinePoint {
  date:       string;
  advancing:  number;
  declining:  number;
  unchanged:  number;
  netAdvance: number;
  cumulative: number;
}

interface SP500ChartProps {
  chartData: Record<string, Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>>;
  indices: Record<string, { ticker: string; name: string }>;
  spy: {
    current: number;
    dma20: number;
    dma50: number;
  };
  adLine?: ADLinePoint[];  // optional — only available after breadth data loaded
}

const TIMEFRAME_BARS: Record<string, number> = {
  '1M':  23,
  '3M':  65,
  '6M':  130,
  '12M': 252,
};

export function SP500Chart({ chartData: chartDataProp, indices, spy, adLine }: SP500ChartProps) {
  // Index selection state
  const [selectedGroup, setSelectedGroup] = useState<'us' | 'intl' | 'global' | 'fx' | 'vol'>('us');
  const [selectedIndex, setSelectedIndex] = useState('sp500');

  // Timeframe state
  const [timeframe, setTimeframe] = useState<'1M' | '3M' | '6M' | '12M'>('12M');

  // State for toggles
  const [chartType, setChartType] = useState<'line' | 'candlestick'>('line');
  const [showDMA20, setShowDMA20] = useState(true);
  const [showDMA50, setShowDMA50] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  
  // New indicator states (all OFF by default)
  const [showBollinger, setShowBollinger] = useState(false);
  const [showVWAP, setShowVWAP] = useState(false);
  const [showDonchian, setShowDonchian] = useState(false);
  const [showRSI, setShowRSI] = useState(false);
  const [showPPO, setShowPPO] = useState(false);
  const [showMACD, setShowMACD] = useState(false);
  const [showADLine, setShowADLine] = useState(false);

  const adLineAvailable = !!adLine && adLine.length > 0;

  // Slice raw data to selected timeframe
  const rawData = chartDataProp[selectedIndex] || [];
  const bars = TIMEFRAME_BARS[timeframe];
  const data = rawData.slice(-Math.min(bars, rawData.length));

  // Auto-hide 50 DMA on 1M (not enough bars)
  const dma50Available = timeframe !== '1M';
  const effectiveShowDMA50 = showDMA50 && dma50Available;

  // Handler for tab changes (auto-selects first index in group)
  const handleTabChange = (group: 'us' | 'intl' | 'global' | 'fx' | 'vol') => {
    setSelectedGroup(group);
    const firstIndex = {
      us: 'sp500',
      intl: 'ftse',
      global: 'gold',
      fx: 'dxy',
      vol: 'vix'
    }[group];
    setSelectedIndex(firstIndex);
  };

  // Calculate DMAs and prepare candlestick data
  const chartData = data.map((point, i) => {
    let dma20Value = null;
    let dma50Value = null;

    if (i >= 19) {
      const last20 = data.slice(i - 19, i + 1);
      dma20Value = last20.reduce((sum, p) => sum + p.close, 0) / 20;
    }

    if (i >= 49) {
      const last50 = data.slice(i - 49, i + 1);
      dma50Value = last50.reduce((sum, p) => sum + p.close, 0) / 50;
    }

    // Bollinger Bands (20-period, 2 std dev)
    let bollingerUpper = null;
    let bollingerMiddle = null;
    let bollingerLower = null;
    if (i >= 19) {
      const last20 = data.slice(i - 19, i + 1).map(d => d.close);
      const mean = last20.reduce((sum, p) => sum + p, 0) / 20;
      const variance = last20.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / 20;
      const stdDev = Math.sqrt(variance);
      bollingerMiddle = mean;
      bollingerUpper = mean + (2 * stdDev);
      bollingerLower = mean - (2 * stdDev);
    }

    // VWAP anchored from lowest low in the slice; fallback to cumulative if low is last bar
    let vwapValue = null;
    if (i >= 0) {
      const lowestLow = Math.min(...data.map(d => d.low));
      const lowestLowIdx = data.findIndex(d => d.low === lowestLow);
      const useCumulative = lowestLowIdx >= data.length - 2; // fallback if swing low is at/near end
      const startIdx = useCumulative ? 0 : lowestLowIdx;
      if (i >= startIdx) {
        const sliceData = data.slice(startIdx, i + 1);
        const cumulativePV = sliceData.reduce((sum, d) => sum + (d.close * d.volume), 0);
        const cumulativeV  = sliceData.reduce((sum, d) => sum + d.volume, 0);
        vwapValue = cumulativeV > 0 ? cumulativePV / cumulativeV : null;
      }
    }

    // Donchian Channels (20-period)
    let donchianUpper = null;
    let donchianLower = null;
    if (i >= 19) {
      const last20 = data.slice(i - 19, i + 1);
      donchianUpper = Math.max(...last20.map(d => d.high));
      donchianLower = Math.min(...last20.map(d => d.low));
    }

    // Prepare candlestick data
    const isUp = point.close >= point.open;
    const candleBody = Math.abs(point.close - point.open);
    const candleBottom = Math.min(point.open, point.close);
    const candleTop = Math.max(point.open, point.close);
    
    // ErrorBar needs the distance from the bar value to high/low
    const wickHigh = point.high - candleTop;
    const wickLow = candleBottom - point.low;

    return {
      date: point.date,
      open: point.open,
      high: point.high,
      low: point.low,
      close: point.close,
      dma20: dma20Value,
      dma50: dma50Value,
      volume: point.volume,
      // New indicators
      bollingerUpper,
      bollingerMiddle,
      bollingerLower,
      vwap: vwapValue,
      donchianUpper,
      donchianLower,
      // Candlestick rendering data
      isUp,
      candleBottom,
      candleBody,
      wickHigh: [wickHigh, wickHigh],
      wickLow: [wickLow, wickLow]
    };
  });

  // Calculate RSI (14-period)
  const calculateRSI = () => {
    const period = 14;
    const rsiData: (number | null)[] = new Array(period).fill(null);
    
    let gains = 0;
    let losses = 0;
    
    // First RSI calculation
    for (let i = 1; i <= period; i++) {
      const change = data[i].close - data[i - 1].close;
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    
    let avgGain = gains / period;
    let avgLoss = losses / period;
    let rs = avgGain / avgLoss;
    rsiData.push(100 - (100 / (1 + rs)));
    
    // Subsequent RSI values
    for (let i = period + 1; i < data.length; i++) {
      const change = data[i].close - data[i - 1].close;
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? Math.abs(change) : 0;
      
      avgGain = ((avgGain * (period - 1)) + gain) / period;
      avgLoss = ((avgLoss * (period - 1)) + loss) / period;
      rs = avgGain / avgLoss;
      rsiData.push(100 - (100 / (1 + rs)));
    }
    
    return rsiData;
  };

  // Calculate PPO (Percentage Price Oscillator) - 3 variations
  const calculatePPO = () => {
    const calculateEMA = (period: number) => {
      const multiplier = 2 / (period + 1);
      const ema: (number | null)[] = [];
      let currentEMA = data[0].close;
      ema.push(currentEMA);
      
      for (let i = 1; i < data.length; i++) {
        currentEMA = (data[i].close - currentEMA) * multiplier + currentEMA;
        ema.push(currentEMA);
      }
      return ema;
    };
    
    const calculateSinglePPO = (fast: number, slow: number) => {
      const fastEMA = calculateEMA(fast);
      const slowEMA = calculateEMA(slow);
      
      return fastEMA.map((fastVal, i) => {
        if (fastVal === null || slowEMA[i] === null || slowEMA[i] === 0) return null;
        return ((fastVal - slowEMA[i]!) / slowEMA[i]!) * 100;
      });
    };
    
    return {
      ppo1: calculateSinglePPO(1, 5),
      ppo2: calculateSinglePPO(5, 13),
      ppo3: calculateSinglePPO(21, 34)
    };
  };

  // Calculate MACD (Moving Average Convergence Divergence)
  const calculateMACD = () => {
    const calculateEMA = (period: number) => {
      const multiplier = 2 / (period + 1);
      const ema: number[] = [];
      let currentEMA = data[0].close;
      ema.push(currentEMA);
      
      for (let i = 1; i < data.length; i++) {
        currentEMA = (data[i].close - currentEMA) * multiplier + currentEMA;
        ema.push(currentEMA);
      }
      return ema;
    };
    
    const ema12 = calculateEMA(12);
    const ema26 = calculateEMA(26);
    
    // MACD line
    const macdLine = ema12.map((val, i) => val - ema26[i]);
    
    // Signal line (9-day EMA of MACD)
    const multiplier = 2 / (9 + 1);
    const signalLine: number[] = [];
    let currentSignal = macdLine[0];
    signalLine.push(currentSignal);
    
    for (let i = 1; i < macdLine.length; i++) {
      currentSignal = (macdLine[i] - currentSignal) * multiplier + currentSignal;
      signalLine.push(currentSignal);
    }
    
    // Histogram
    const histogram = macdLine.map((val, i) => val - signalLine[i]);
    
    return { macdLine, signalLine, histogram };
  };

  const rsiData = showRSI ? calculateRSI() : [];
  const ppoData = showPPO ? calculatePPO() : { ppo1: [], ppo2: [], ppo3: [] };
  const macdData = showMACD ? calculateMACD() : { macdLine: [], signalLine: [], histogram: [] };

  // Add RSI, PPO, and MACD to chartData
  chartData.forEach((point, i) => {
    point.rsi = rsiData[i] || null;
    point.ppo1 = ppoData.ppo1[i] || null;
    point.ppo2 = ppoData.ppo2[i] || null;
    point.ppo3 = ppoData.ppo3[i] || null;
    point.macd = macdData.macdLine[i] || null;
    point.macdSignal = macdData.signalLine[i] || null;
    point.macdHistogram = macdData.histogram[i] || null;
  });

  // Calculate Y-axis domain based on ALL displayed values (prices + DMAs + indicators)
  // This mimics what the line chart auto-scale would do
  const allPriceValues = chartData.flatMap(d => [
    d.high, 
    d.low, 
    d.close, 
    d.open,
    d.dma20 || 0,
    d.dma50 || 0,
    ...(showBollinger ? [d.bollingerUpper || 0, d.bollingerLower || 0] : []),
    ...(showVWAP ? [d.vwap || 0] : []),
    ...(showDonchian ? [d.donchianUpper || 0, d.donchianLower || 0] : [])
  ]).filter(v => v > 0);  // Remove nulls/zeros

  const priceMin = Math.min(...allPriceValues);
  const priceMax = Math.max(...allPriceValues);
  
  // Add 2% buffer - scale appropriately for the price range
  const range = priceMax - priceMin;
  const buffer = range * 0.02;
  const priceDomain = [priceMin - buffer, priceMax + buffer];

  // Format date for UK format (DD/MM/YYYY)
  const formatDateUK = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Format date for axis - show 1st of each month
  const formatDateAxis = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  // Generate ticks — weekly for 1M/3M, monthly for 6M/12M
  const getAxisTicks = () => {
    if (timeframe === '1M' || timeframe === '3M') {
      // Weekly ticks: pick every ~5th data point
      const ticks: string[] = [];
      chartData.forEach((d, i) => {
        if (i % 5 === 0) ticks.push(d.date);
      });
      return ticks;
    }
    // Monthly ticks: first occurrence of each calendar month
    const monthTicks: string[] = [];
    const seenMonths = new Set<string>();
    chartData.forEach(d => {
      const date = new Date(d.date);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      if (!seenMonths.has(monthKey)) {
        seenMonths.add(monthKey);
        monthTicks.push(d.date);
      }
    });
    return monthTicks;
  };

  // Format numbers with commas - adapt decimals based on value range
  const formatNumber = (value: number) => {
    // For small values (currencies, small indices), show more decimals
    if (Math.abs(value) < 10) {
      return value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    } else if (Math.abs(value) < 1000) {
      return value.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }
    // For large values, no decimals
    return value.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  // Format volume
  const formatVolume = (value: number) => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(0)}M`;
    return value.toString();
  };

  // Get price range for nice Y-axis ticks
  const getPriceTicks = () => {
    const [minDomain, maxDomain] = priceDomain;
    const range = maxDomain - minDomain;
    
    // Determine appropriate step size based on range
    let step: number;
    if (range < 1) {
      // For currencies (e.g., 0.10 range) -> 0.01 steps
      step = 0.01;
    } else if (range < 10) {
      // For small ranges -> 0.5 steps
      step = 0.5;
    } else if (range < 50) {
      // 50 range -> 5 steps
      step = 5;
    } else if (range < 100) {
      // 100 range -> 10 steps
      step = 10;
    } else if (range < 500) {
      // 500 range -> 50 steps
      step = 50;
    } else if (range < 1000) {
      // 1000 range -> 100 steps
      step = 100;
    } else if (range < 5000) {
      // 5000 range -> 500 steps
      step = 500;
    } else {
      // Large ranges -> 1000 steps
      step = 1000;
    }
    
    // Generate 5-8 evenly spaced ticks
    const start = Math.ceil(minDomain / step) * step;
    const end = Math.floor(maxDomain / step) * step;
    
    const ticks = [];
    for (let i = start; i <= end; i += step) {
      ticks.push(i);
    }
    
    // Ensure we have at least 3 ticks
    if (ticks.length < 3) {
      return [minDomain, (minDomain + maxDomain) / 2, maxDomain];
    }
    
    return ticks;
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="font-semibold text-slate-900 mb-2">{formatDateUK(data.date)}</p>
          <div className="space-y-1">
            {chartType === 'candlestick' ? (
              <>
                <p className="text-sm text-green-600 font-medium">Open: {formatNumber(data.open)}</p>
                <p className="text-sm text-blue-600 font-medium">High: {formatNumber(data.high)}</p>
                <p className="text-sm text-red-600 font-medium">Low: {formatNumber(data.low)}</p>
                <p className="text-sm text-slate-900 font-semibold">Close: {formatNumber(data.close)}</p>
              </>
            ) : (
              <p className="text-sm text-blue-600 font-medium">
                S&P 500: {formatNumber(data.close)}
              </p>
            )}
            {showVolume && (
              <p className="text-sm text-slate-600">
                Volume: {formatVolume(data.volume)}
              </p>
            )}
            {showDMA20 && data.dma20 && (
              <p className="text-sm text-orange-600">
                20 DMA: {formatNumber(data.dma20)}
              </p>
            )}
            {effectiveShowDMA50 && data.dma50 && (
              <p className="text-sm text-purple-600">
                50 DMA: {formatNumber(data.dma50)}
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      {/* Tab Groups and Index Selector */}
      <div className="mb-4">
        {/* Tab Groups */}
        <div className="flex gap-2 mb-3 border-b border-slate-200">
          <button
            onClick={() => handleTabChange('us')}
            className={`px-4 py-2 font-medium transition-colors ${
              selectedGroup === 'us'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            US Equities
          </button>
          <button
            onClick={() => handleTabChange('intl')}
            className={`px-4 py-2 font-medium transition-colors ${
              selectedGroup === 'intl'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            International
          </button>
          <button
            onClick={() => handleTabChange('global')}
            className={`px-4 py-2 font-medium transition-colors ${
              selectedGroup === 'global'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Global Assets
          </button>
          <button
            onClick={() => handleTabChange('fx')}
            className={`px-4 py-2 font-medium transition-colors ${
              selectedGroup === 'fx'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Currencies
          </button>
          <button
            onClick={() => handleTabChange('vol')}
            className={`px-4 py-2 font-medium transition-colors ${
              selectedGroup === 'vol'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Volatility
          </button>
        </div>

        {/* Index Buttons for Selected Group */}
        <div className="flex flex-wrap gap-2">
          {selectedGroup === 'us' && (
            <>
              <button
                onClick={() => setSelectedIndex('sp500')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  selectedIndex === 'sp500'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                S&P 500
              </button>
              <button
                onClick={() => setSelectedIndex('russell')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  selectedIndex === 'russell'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Russell 2000
              </button>
              <button
                onClick={() => setSelectedIndex('nasdaq')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  selectedIndex === 'nasdaq'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Nasdaq
              </button>
              <button
                onClick={() => setSelectedIndex('dow')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  selectedIndex === 'dow'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Dow Jones
              </button>
            </>
          )}

          {selectedGroup === 'intl' && (
            <>
              <button
                onClick={() => setSelectedIndex('ftse')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  selectedIndex === 'ftse'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                FTSE 100
              </button>
              <button
                onClick={() => setSelectedIndex('dax')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  selectedIndex === 'dax'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                DAX
              </button>
              <button
                onClick={() => setSelectedIndex('nikkei')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  selectedIndex === 'nikkei'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Nikkei 225
              </button>
              <button
                onClick={() => setSelectedIndex('eafe')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  selectedIndex === 'eafe'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                MSCI EAFE
              </button>
            </>
          )}

          {selectedGroup === 'global' && (
            <>
              <button
                onClick={() => setSelectedIndex('gold')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  selectedIndex === 'gold'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Gold
              </button>
              <button
                onClick={() => setSelectedIndex('oil')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  selectedIndex === 'oil'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                WTI Crude
              </button>
              <button
                onClick={() => setSelectedIndex('btc')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  selectedIndex === 'btc'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Bitcoin
              </button>
            </>
          )}

          {selectedGroup === 'fx' && (
            <>
              <button
                onClick={() => setSelectedIndex('dxy')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  selectedIndex === 'dxy'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                US Dollar Index
              </button>
              <button
                onClick={() => setSelectedIndex('eurusd')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  selectedIndex === 'eurusd'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                EUR/USD
              </button>
              <button
                onClick={() => setSelectedIndex('usdjpy')}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  selectedIndex === 'usdjpy'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                USD/JPY
              </button>
            </>
          )}

          {selectedGroup === 'vol' && (
            <button
              onClick={() => setSelectedIndex('vix')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                selectedIndex === 'vix'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              VIX
            </button>
          )}
        </div>

        {/* Chart Title */}
        <h3 className="text-lg font-semibold text-slate-900 mt-4">
          {indices[selectedIndex]?.name || 'Market Chart'}
        </h3>
      </div>

      {/* Header with timeframe toggle, chart type toggle and inline legend */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          {/* Inline legend with colored indicators */}
          <div className="flex items-center gap-3 text-xs text-slate-600">
            {chartType === 'line' && (
              <div className="flex items-center gap-1">
                <div className="w-4 h-0.5 bg-blue-600" />
                <span>S&P 500</span>
              </div>
            )}
            {chartType === 'candlestick' && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-500 border border-green-600" />
                <span>S&P 500</span>
              </div>
            )}
            {showDMA20 && (
              <div className="flex items-center gap-1">
                <div className="w-4 h-0.5 bg-cyan-500" style={{ borderTop: '2px dashed' }} />
                <span>20 DMA</span>
              </div>
            )}
            {effectiveShowDMA50 && (
              <div className="flex items-center gap-1">
                <div className="w-4 h-0.5 bg-yellow-500" style={{ borderTop: '2px dashed' }} />
                <span>50 DMA</span>
              </div>
            )}
            {showBollinger && (
              <div className="flex items-center gap-1">
                <div className="w-4 h-0.5 bg-cyan-400" style={{ borderTop: '2px dotted' }} />
                <span>Bollinger</span>
              </div>
            )}
            {showVWAP && (
              <div className="flex items-center gap-1">
                <div className="w-4 h-0.5 bg-black" />
                <span>VWAP</span>
              </div>
            )}
            {showDonchian && (
              <div className="flex items-center gap-1">
                <div className="w-4 h-0.5 bg-violet-400" />
                <span>Donchian</span>
              </div>
            )}
            {showVolume && (
              <div className="flex items-center gap-1">
                <div className="w-3 h-2 bg-slate-400 opacity-30" />
                <span>Volume</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Chart type toggle + Timeframe toggle */}
        <div className="flex items-center gap-3">
          {/* Timeframe buttons */}
          <div className="bg-slate-100 rounded-lg p-1 flex gap-1">
            {(['1M', '3M', '6M', '12M'] as const).map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  timeframe === tf
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Chart type toggle */}
          <div className="flex gap-2">
          <button
            onClick={() => setChartType('line')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              chartType === 'line'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Line
          </button>
          <button
            onClick={() => setChartType('candlestick')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              chartType === 'candlestick'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Candlestick
          </button>
        </div>
        </div>
      </div>

      {/* Indicator checkboxes - grouped */}
      <div className="flex flex-wrap gap-4 mb-4 text-sm">
        {/* Group 1: Moving Averages */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showDMA20}
            onChange={(e) => setShowDMA20(e.target.checked)}
            className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
          />
          <span className="text-slate-700">20 DMA</span>
          <div className="w-6 h-0.5 bg-cyan-500" style={{ borderTop: '2px dashed' }} />
        </label>

        <label className={`flex items-center gap-2 ${dma50Available ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}
          title={dma50Available ? '' : 'Not enough data on 1M timeframe'}>
          <input
            type="checkbox"
            checked={showDMA50}
            onChange={(e) => dma50Available && setShowDMA50(e.target.checked)}
            disabled={!dma50Available}
            className="w-4 h-4 text-yellow-600 rounded focus:ring-yellow-500 disabled:opacity-40"
          />
          <span className="text-slate-700">50 DMA</span>
          {!dma50Available && <span className="text-xs text-slate-400 italic">— 1M only</span>}
          <div className="w-6 h-0.5 bg-yellow-500" style={{ borderTop: '2px dashed' }} />
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showVWAP}
            onChange={(e) => setShowVWAP(e.target.checked)}
            className="w-4 h-4 text-slate-900 rounded focus:ring-slate-700"
          />
          <span className="text-slate-700">VWAP</span>
          <div className="w-6 h-0.5 bg-slate-900" style={{ borderTop: '2px solid' }} />
        </label>

        {/* Separator */}
        <div className="w-px h-6 bg-slate-300" />

        {/* Group 2: Bands/Channels */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showVolume}
            onChange={(e) => setShowVolume(e.target.checked)}
            className="w-4 h-4 text-slate-600 rounded focus:ring-slate-500"
          />
          <span className="text-slate-700">Volume</span>
          <div className="w-6 h-1.5 bg-slate-400 opacity-30" />
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showBollinger}
            onChange={(e) => setShowBollinger(e.target.checked)}
            className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
          />
          <span className="text-slate-700">Bollinger Bands</span>
          <div className="w-6 h-0.5 bg-cyan-400" style={{ borderTop: '2px dotted' }} />
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showDonchian}
            onChange={(e) => setShowDonchian(e.target.checked)}
            className="w-4 h-4 text-violet-600 rounded focus:ring-violet-500"
          />
          <span className="text-slate-700">Donchian</span>
          <div className="w-6 h-0.5 bg-violet-400" style={{ borderTop: '2px solid' }} />
        </label>

        {/* Separator */}
        <div className="w-px h-6 bg-slate-300" />

        {/* Group 3: Oscillators */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showRSI}
            onChange={(e) => setShowRSI(e.target.checked)}
            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
          />
          <span className="text-slate-700">RSI</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showMACD}
            onChange={(e) => setShowMACD(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <span className="text-slate-700">MACD</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showPPO}
            onChange={(e) => setShowPPO(e.target.checked)}
            className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
          />
          <span className="text-slate-700">PPO (Multi)</span>
        </label>

        {/* Separator */}
        <div className="w-px h-6 bg-slate-300" />

        {/* Group 4: Breadth — requires breadth data to be loaded */}
        <label
          className={`flex items-center gap-2 ${adLineAvailable ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}
          title={adLineAvailable ? 'A/D Line (1 year, all 500 S&P 500 stocks)' : 'Load breadth data first to enable the A/D Line'}
        >
          <input
            type="checkbox"
            checked={showADLine}
            onChange={(e) => adLineAvailable && setShowADLine(e.target.checked)}
            disabled={!adLineAvailable}
            className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500 disabled:opacity-40"
          />
          <span className="text-slate-700">A/D Line</span>
          {!adLineAvailable && (
            <span className="text-xs text-slate-400 italic">— load breadth data first</span>
          )}
          <div className="w-6 h-0.5 bg-rose-500" />
        </label>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            tickFormatter={formatDateAxis}
            ticks={getAxisTicks()}
          />
          <YAxis 
          width={60}
            yAxisId="left" 
            tick={{ fontSize: 12 }} 
            domain={priceDomain}
            ticks={getPriceTicks()}
            tickFormatter={formatNumber}
            allowDataOverflow={true}
          />
          {showVolume && (
            <YAxis 
            width={60}
              yAxisId="right" 
              orientation="right" 
              tick={{ fontSize: 12 }}
              tickFormatter={formatVolume}
            />
          )}
          <Tooltip content={<CustomTooltip />} />
          
          {/* Price line (only show in line mode) */}
          {chartType === 'line' && (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="close"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="S&P 500"
            />
          )}

          {/* Candlestick bars with wicks (using Bar + ErrorBar) */}
          {chartType === 'candlestick' && (
            <>
              {/* Transparent bar at bottom position for correct placement */}
              <Bar
                yAxisId="left"
                dataKey="candleBottom"
                stackId="candle"
                fill="transparent"
                isAnimationActive={false}
              />
              {/* Colored bar for candle body */}
              <Bar
                yAxisId="left"
                dataKey="candleBody"
                stackId="candle"
                isAnimationActive={false}
                name="S&P 500"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`}
                    fill={entry.isUp ? '#22c55e' : '#ef4444'}
                    stroke={entry.isUp ? '#16a34a' : '#dc2626'}
                    strokeWidth={1}
                  />
                ))}
                {/* Wicks using ErrorBar */}
                <ErrorBar
                  dataKey="wickHigh"
                  width={0}
                  strokeWidth={1.5}
                  stroke="#64748b"
                  direction="y"
                />
                <ErrorBar
                  dataKey="wickLow"
                  width={0}
                  strokeWidth={1.5}
                  stroke="#64748b"
                  direction="y"
                />
              </Bar>
            </>
          )}
          
          {/* 20 DMA */}
          {showDMA20 && (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="dma20"
              stroke="#06b6d4"
              strokeWidth={2}
              dot={false}
              strokeDasharray="5 5"
              name="20 DMA"
            />
          )}
          
          {/* 50 DMA */}
          {effectiveShowDMA50 && (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="dma50"
              stroke="#eab308"
              strokeWidth={2}
              dot={false}
              strokeDasharray="5 5"
              name="50 DMA"
            />
          )}

          {/* Bollinger Bands */}
          {showBollinger && (
            <>
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="bollingerUpper"
                stroke="#67e8f9"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="3 3"
                name="BB Upper"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="bollingerMiddle"
                stroke="#06b6d4"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="3 3"
                name="BB Middle"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="bollingerLower"
                stroke="#67e8f9"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="3 3"
                name="BB Lower"
              />
            </>
          )}

          {/* VWAP */}
          {showVWAP && (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="vwap"
              stroke="#000000"
              strokeWidth={2}
              dot={false}
              name="VWAP"
            />
          )}

          {/* Donchian Channels */}
          {showDonchian && (
            <>
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="donchianUpper"
                stroke="#c084fc"
                strokeWidth={2}
                dot={false}
                name="Donchian Upper"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="donchianLower"
                stroke="#c084fc"
                strokeWidth={2}
                dot={false}
                name="Donchian Lower"
              />
            </>
          )}
          
          {/* Volume bars */}
          {showVolume && (
            <Bar
              yAxisId="right"
              dataKey="volume"
              fill="#94a3b8"
              opacity={0.3}
              name="Volume"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* RSI Panel */}
      {showRSI && (
        <div className="mt-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="text-sm font-semibold text-slate-900">RSI (14)</h4>
            <div className="flex items-center gap-1 text-xs text-slate-600">
              <div className="w-4 h-0.5 bg-indigo-600" />
              <span>RSI</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={150}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={formatDateAxis}
                ticks={getAxisTicks()}
              />
              <YAxis 
                width={60}
                tick={{ fontSize: 12 }} 
                domain={[0, 100]}
                ticks={[0, 30, 50, 70, 100]}
              />
              <YAxis yAxisId="right" orientation="right" width={60} tick={false} axisLine={false} tickLine={false} />
              <Tooltip content={({ active, payload }: any) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-2 border border-slate-200 rounded shadow-lg">
                      <p className="text-xs font-semibold">{formatDateUK(data.date)}</p>
                      <p className="text-xs text-indigo-600">RSI: {data.rsi?.toFixed(2) || 'N/A'}</p>
                    </div>
                  );
                }
                return null;
              }} />
              <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1} />
              <ReferenceLine y={50} stroke="#94a3b8" strokeDasharray="3 3" strokeWidth={1} />
              <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="3 3" strokeWidth={1} />
              <Line
                type="monotone"
                dataKey="rsi"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
                name="RSI"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* PPO Panels - Grouped (3 stacked) */}
      {showPPO && (
        <div className="mt-1 p-2 bg-slate-50 rounded-lg border border-slate-200">
          {/* PPO Panel 1 - Short Term */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h4 className="text-sm font-semibold text-slate-900">PPO(1,5,0) - ST</h4>
              <div className="flex items-center gap-1 text-xs text-slate-600">
                <div className="w-4 h-0.5 bg-teal-500" />
                <span>PPO</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatDateAxis}
                  ticks={getAxisTicks()}
                />
                <YAxis 
                  width={60}
                  tick={{ fontSize: 12 }} 
                  domain={['auto', 'auto']}
                />
                <YAxis yAxisId="right" orientation="right" width={60} tick={false} axisLine={false} tickLine={false} />
                <Tooltip content={({ active, payload }: any) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-2 border border-slate-200 rounded shadow-lg">
                        <p className="text-xs font-semibold">{formatDateUK(data.date)}</p>
                        <p className="text-xs text-teal-600">PPO(1,5): {data.ppo1?.toFixed(2) || 'N/A'}%</p>
                      </div>
                    );
                  }
                  return null;
                }} />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" strokeWidth={1} />
                <Line
                  type="monotone"
                  dataKey="ppo1"
                  stroke="#14b8a6"
                  strokeWidth={2}
                  dot={false}
                  name="PPO(1,5,0)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* PPO Panel 2 - Medium Term */}
          <div className="mt-0.5">
            <div className="flex items-center gap-3 mb-2">
              <h4 className="text-sm font-semibold text-slate-900">PPO(5,13,0) - MT</h4>
              <div className="flex items-center gap-1 text-xs text-slate-600">
                <div className="w-4 h-0.5 bg-cyan-500" />
                <span>PPO</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatDateAxis}
                  ticks={getAxisTicks()}
                />
                <YAxis 
                  width={60}
                  tick={{ fontSize: 12 }} 
                  domain={['auto', 'auto']}
                />
                <YAxis yAxisId="right" orientation="right" width={60} tick={false} axisLine={false} tickLine={false} />
                <Tooltip content={({ active, payload }: any) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-2 border border-slate-200 rounded shadow-lg">
                        <p className="text-xs font-semibold">{formatDateUK(data.date)}</p>
                        <p className="text-xs text-cyan-600">PPO(5,13): {data.ppo2?.toFixed(2) || 'N/A'}%</p>
                      </div>
                    );
                  }
                  return null;
                }} />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" strokeWidth={1} />
                <Line
                  type="monotone"
                  dataKey="ppo2"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  dot={false}
                  name="PPO(5,13,0)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* PPO Panel 3 - Long Term */}
          <div className="mt-0.5">
            <div className="flex items-center gap-3 mb-2">
              <h4 className="text-sm font-semibold text-slate-900">PPO(21,34,0) - LT</h4>
              <div className="flex items-center gap-1 text-xs text-slate-600">
                <div className="w-4 h-0.5 bg-sky-500" />
                <span>PPO</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickFormatter={formatDateAxis}
                  ticks={getAxisTicks()}
                />
                <YAxis 
                  width={60}
                  tick={{ fontSize: 12 }} 
                  domain={['auto', 'auto']}
                />
                <YAxis yAxisId="right" orientation="right" width={60} tick={false} axisLine={false} tickLine={false} />
                <Tooltip content={({ active, payload }: any) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-2 border border-slate-200 rounded shadow-lg">
                        <p className="text-xs font-semibold">{formatDateUK(data.date)}</p>
                        <p className="text-xs text-sky-600">PPO(21,34): {data.ppo3?.toFixed(2) || 'N/A'}%</p>
                      </div>
                    );
                  }
                  return null;
                }} />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" strokeWidth={1} />
                <Line
                  type="monotone"
                  dataKey="ppo3"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  dot={false}
                  name="PPO(21,34,0)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* MACD Panel */}
      {showMACD && (        <div className="mt-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="text-sm font-semibold text-slate-900">MACD (12,26,9)</h4>
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <div className="flex items-center gap-1">
                <div className="w-4 h-0.5 bg-blue-600" />
                <span>MACD</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-0.5 bg-red-500" />
                <span>Signal</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-2 bg-green-500 opacity-50" />
                <span>Histogram</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={formatDateAxis}
                ticks={getAxisTicks()}
              />
              <YAxis 
                width={60}
                tick={{ fontSize: 12 }} 
                domain={['auto', 'auto']}
              />
              <YAxis yAxisId="right" orientation="right" width={60} tick={false} axisLine={false} tickLine={false} />
              <Tooltip content={({ active, payload }: any) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-2 border border-slate-200 rounded shadow-lg">
                      <p className="text-xs font-semibold">{formatDateUK(data.date)}</p>
                      <p className="text-xs text-blue-600">MACD: {data.macd?.toFixed(2) || 'N/A'}</p>
                      <p className="text-xs text-red-600">Signal: {data.macdSignal?.toFixed(2) || 'N/A'}</p>
                      <p className="text-xs text-slate-600">Hist: {data.macdHistogram?.toFixed(2) || 'N/A'}</p>
                    </div>
                  );
                }
                return null;
              }} />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" strokeWidth={1} />
              <Bar
                dataKey="macdHistogram"
                fill="#94a3b8"
                opacity={0.5}
                name="Histogram"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`}
                    fill={entry.macdHistogram && entry.macdHistogram > 0 ? '#22c55e' : '#ef4444'}
                  />
                ))}
              </Bar>
              <Line
                type="monotone"
                dataKey="macd"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="MACD"
              />
              <Line
                type="monotone"
                dataKey="macdSignal"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                name="Signal"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* A/D Line Panel */}
{showADLine && adLine && adLine.length > 0 && (() => {
  const mainDates = new Set(data.map((d: any) => d.date));
  const trimmedADLine = adLine.filter(d => mainDates.has(d.date));
  const seen = new Set<string>();
  const adTicks = trimmedADLine
    .filter(d => {
      const key = `${new Date(d.date).getFullYear()}-${new Date(d.date).getMonth()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(d => d.date);

  return (
    <div className="mt-1">
      <div className="flex items-center gap-3 mb-2">
        <h4 className="text-sm font-semibold text-slate-900">A/D Line (1Y · all 500 S&amp;P 500 stocks)</h4>
        <div className="flex items-center gap-1 text-xs text-slate-600">
          <div className="w-4 h-0.5 bg-rose-500" />
          <span>Cumulative A/D</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={150}>
        <ComposedChart data={trimmedADLine}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            tickFormatter={formatDateAxis}
            ticks={adTicks}
          />
          <YAxis
            width={60}
            tick={{ fontSize: 12 }}
            domain={['auto', 'auto']}
            tickFormatter={(v: number) => v.toLocaleString()}
          />
          <YAxis yAxisId="right" orientation="right" width={60} tick={false} axisLine={false} tickLine={false} />
          <Tooltip content={({ active, payload }: any) => {
            if (active && payload && payload.length) {
              const d = payload[0].payload;
              return (
                <div className="bg-white p-2 border border-slate-200 rounded shadow-lg">
                  <p className="text-xs font-semibold">{formatDateUK(d.date)}</p>
                  <p className="text-xs text-rose-600">Cumulative: {d.cumulative.toLocaleString()}</p>
                  <p className="text-xs text-green-600">Advancing: {d.advancing}</p>
                  <p className="text-xs text-red-600">Declining: {d.declining}</p>
                  <p className="text-xs text-slate-500">Net: {d.netAdvance > 0 ? '+' : ''}{d.netAdvance}</p>
                </div>
              );
            }
            return null;
          }} />
          <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" strokeWidth={1} />
          <Line
            type="monotone"
            dataKey="cumulative"
            stroke="#f43f5e"
            strokeWidth={2}
            dot={false}
            name="A/D Line"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
})()}
   </div>
  );
}