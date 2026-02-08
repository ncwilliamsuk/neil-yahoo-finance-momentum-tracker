"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  RefreshCw,
  Download,
  Plus,
  Trash2,
  Search,
  Star,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Minus,
  PieChart,
  X,
} from "lucide-react";

export interface ETF {
  ticker: string;
  name: string;
  category: string;
  ter: number;
  aum: number;
  dividendYield: number;
  price?: string;
  m1?: string;
  m3?: string;
  m6?: string;
  m12?: string;
  vol3M?: string;
  vol6M?: string;
  vol12M?: string;
  rsi?: string;
  sparklineData?: Array<{ x: number; y: number }>;
  momentumScore?: string;
  rawMomentumScore?: string;
  rank?: number;
}

import { etfData } from "../../data/etfs";

export default function MomentumDashboard() {
  const [etfs, setEtfs] = useState<ETF[]>(etfData);

  const [newTicker, setNewTicker] = useState("");
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newTer, setNewTer] = useState("");
  const [newAum, setNewAum] = useState("");
  const [newDivYield, setNewDivYield] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState("momentum");
  const [errors, setErrors] = useState<string[]>([]);
  const [vixPrice, setVixPrice] = useState<string | null>(null);
  const [vixChange, setVixChange] = useState<string | null>(null);
  const [weights, setWeights] = useState({ m3: 20, m6: 50, m12: 30 });
  const [riskFreeRate, setRiskFreeRate] = useState(4.5);
  const [useRiskAdjusted, setUseRiskAdjusted] = useState({
    m3: false,
    m6: false,
    m12: true,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [portfolio, setPortfolio] = useState<
    Array<{ ticker: string; allocation: number }>
  >([]);
  const [previousRanks, setPreviousRanks] = useState<Record<string, number>>(
    {},
  );

  const processHistoricalData = (historical: any[], ticker: string) => {
    try {
      const adjClosePrices = historical
        .map((h) => h.adjClose || h.close)
        .filter((p) => p !== null)
        .reverse(); // Most recent last

      if (adjClosePrices.length < 22) throw new Error("Insufficient data");

      const latestPrice = adjClosePrices[adjClosePrices.length - 1];
      const currentIdx = adjClosePrices.length - 1;

      const calcReturn = (daysAgo: number) => {
        const idx = currentIdx - daysAgo;
        return idx >= 0
          ? ((adjClosePrices[currentIdx] - adjClosePrices[idx]) /
              adjClosePrices[idx]) *
              100
          : null;
      };

      const m1 = calcReturn(22);
      const m3 = calcReturn(66);
      const m6 = calcReturn(132);
      const m12 = calcReturn(252);

      const calculateVolatility = (startIdx: number, endIdx: number) => {
        const dailyReturns = [];
        for (let i = startIdx + 1; i <= endIdx; i++) {
          if (adjClosePrices[i - 1] && adjClosePrices[i]) {
            const dailyReturn =
              ((adjClosePrices[i] - adjClosePrices[i - 1]) /
                adjClosePrices[i - 1]) *
              100;
            dailyReturns.push(dailyReturn);
          }
        }

        if (dailyReturns.length < 2) return null;

        const mean =
          dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
        const variance =
          dailyReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) /
          dailyReturns.length;
        const stdDev = Math.sqrt(variance);

        return stdDev * Math.sqrt(252);
      };

      const calculateRSI = () => {
        const period = 14;
        if (adjClosePrices.length < period + 1) return null;

        const recentPrices = adjClosePrices.slice(-period - 1);
        let gains = 0;
        let losses = 0;

        for (let i = 1; i < recentPrices.length; i++) {
          const change = recentPrices[i] - recentPrices[i - 1];
          if (change > 0) {
            gains += change;
          } else {
            losses += Math.abs(change);
          }
        }

        const avgGain = gains / period;
        const avgLoss = losses / period;

        if (avgLoss === 0) return 100;

        const rs = avgGain / avgLoss;
        const rsi = 100 - 100 / (1 + rs);

        return rsi.toFixed(1);
      };

      const vol3M =
        currentIdx >= 66
          ? calculateVolatility(currentIdx - 66, currentIdx)
          : null;
      const vol6M =
        currentIdx >= 132
          ? calculateVolatility(currentIdx - 132, currentIdx)
          : null;
      const vol12M =
        adjClosePrices.length > 252
          ? calculateVolatility(currentIdx - 252, currentIdx)
          : calculateVolatility(0, currentIdx);

      const rsi = calculateRSI();

      const sparklineData = adjClosePrices
        .slice(-60)
        .map((price: number, idx: number) => ({
          x: idx,
          y: price,
        }));

      return {
        price: latestPrice.toFixed(2),
        m1: m1?.toFixed(2),
        m3: m3?.toFixed(2),
        m6: m6?.toFixed(2),
        m12: m12?.toFixed(2),
        vol3M: vol3M?.toFixed(2),
        vol6M: vol6M?.toFixed(2),
        vol12M: vol12M?.toFixed(2),
        rsi: rsi,
        sparklineData: sparklineData,
      };
    } catch (error: any) {
      console.error(`Error processing ${ticker}:`, error);
      return null;
    }
  };

  const fetchPriceData = async () => {
    setLoading(true);
    setErrors([]);
    const newErrors: string[] = [];
    const updatedEtfs: ETF[] = [];

    const currentRanks: Record<string, number> = {};
    etfs.forEach((etf) => {
      if (etf.rank) currentRanks[etf.ticker] = etf.rank;
    });
    setPreviousRanks(currentRanks);

    try {
      // Fetch from API
      setProgress({ current: 0, total: etfs.length });
      const response = await fetch("/api/stocks");
      const data = await response.json();

      // Set VIX data from API
      if (data.vix) {
        setVixPrice(data.vix.price);
        setVixChange(data.vix.change);
      }

      // Process ETF data
      data.etfs.forEach((result: any, index: number) => {
        setProgress({ current: index + 1, total: etfs.length });

        const etfInfo = etfs.find((e) => {
          console.log("Matching ETF:", e.ticker, "with result:", result.ticker);
          return e.ticker === result.ticker;
        });

        if (!etfInfo) {
          console.log(`No ETF info found for ticker ${result.ticker}`);
          return;
        }

        if (result.error || !result.historical) {
          newErrors.push(`${result.ticker}: ${result.error || "No data"}`);
          updatedEtfs.push({ ...etfInfo });
          return;
        }

        const processed = processHistoricalData(
          result.historical,
          result.ticker,
        );
        if (processed) {
          updatedEtfs.push({
            ...etfInfo,
            ...processed,
            rsi: processed.rsi ?? undefined, // Convert null to undefined
          } as ETF);
        } else {
          newErrors.push(`${result.ticker}: Failed to process data`);
          updatedEtfs.push({ ...etfInfo });
        }
      });
    } catch (error: any) {
      console.error("Fetch error:", error);
      newErrors.push(`API Error: ${error.message}`);
    }

    const rankedEtfs = updatedEtfs.map((etf) => {
      const m3Val = parseFloat(etf.m3 || "0") || 0;
      const m6Val = parseFloat(etf.m6 || "0") || 0;
      const m12Val = parseFloat(etf.m12 || "0") || 0;
      const vol3M = parseFloat(etf.vol3M || "1") || 1;
      const vol6M = parseFloat(etf.vol6M || "1") || 1;
      const vol12M = parseFloat(etf.vol12M || "1") || 1;

      const sharpe3M = ((m3Val - riskFreeRate) / vol3M) * 100;
      const sharpe6M = ((m6Val - riskFreeRate) / vol6M) * 100;
      const sharpe12M = ((m12Val - riskFreeRate) / vol12M) * 100;

      const score3M = useRiskAdjusted.m3 ? sharpe3M : m3Val;
      const score6M = useRiskAdjusted.m6 ? sharpe6M : m6Val;
      const score12M = useRiskAdjusted.m12 ? sharpe12M : m12Val;

      const momentumScore = (
        (score3M * weights.m3) / 100 +
        (score6M * weights.m6) / 100 +
        (score12M * weights.m12) / 100
      ).toFixed(2);

      const rawMomentumScore = (
        (m3Val * weights.m3) / 100 +
        (m6Val * weights.m6) / 100 +
        (m12Val * weights.m12) / 100
      ).toFixed(2);

      return { ...etf, momentumScore, rawMomentumScore };
    });

    const sorted = [...rankedEtfs].sort(
      (a, b) =>
        parseFloat(b.momentumScore || "0") - parseFloat(a.momentumScore || "0"),
    );
    const withRanks = sorted.map((etf, idx) => ({ ...etf, rank: idx + 1 }));

    setEtfs(withRanks);
    setErrors(newErrors);
    setLastUpdate(new Date().toLocaleString());
    setLoading(false);
  };

  const addETF = () => {
    if (!newTicker || !newName || !newCategory) return;

    const newEtf: ETF = {
      ticker: newTicker.toUpperCase(),
      name: newName,
      category: newCategory,
      ter: parseFloat(newTer) || 0,
      aum: parseFloat(newAum) || 0,
      dividendYield: parseFloat(newDivYield) || 0,
    };

    setEtfs([...etfs, newEtf]);
    setNewTicker("");
    setNewName("");
    setNewCategory("");
    setNewTer("");
    setNewAum("");
    setNewDivYield("");
  };

  const removeETF = (ticker: string) => {
    setEtfs(etfs.filter((e) => e.ticker !== ticker));
    setPortfolio(portfolio.filter((p) => p.ticker !== ticker));
  };

  const togglePortfolio = (ticker: string) => {
    const existing = portfolio.find((p) => p.ticker === ticker);
    if (existing) {
      setPortfolio(portfolio.filter((p) => p.ticker !== ticker));
    } else {
      setPortfolio([...portfolio, { ticker, allocation: 0 }]);
    }
  };

  const updateAllocation = (ticker: string, allocation: string) => {
    setPortfolio(
      portfolio.map((p) =>
        p.ticker === ticker
          ? { ...p, allocation: parseFloat(allocation) || 0 }
          : p,
      ),
    );
  };

  const getMomentumColor = (score: string | undefined) => {
    if (!score) return "text-blue-600";
    const val = parseFloat(score);
    if (val >= 15) return "text-green-700 font-bold";
    if (val >= 10) return "text-green-600";
    if (val >= 5) return "text-green-500";
    if (val >= 0) return "text-blue-600";
    if (val >= -5) return "text-red-500";
    return "text-red-600";
  };

  const getRSIColor = (rsi: string | undefined) => {
    if (!rsi) return "text-amber-600";
    const val = parseFloat(rsi);
    if (val < 30) return "text-green-600 font-semibold";
    if (val > 70) return "text-red-600 font-semibold";
    return "text-amber-600";
  };

  const getRSILabel = (rsi: string | undefined) => {
    if (!rsi) return "Unknown";
    const val = parseFloat(rsi);
    if (val < 30) return "Oversold - Potential Buy";
    if (val > 70) return "Overbought - Potential Sell";
    return "Neutral";
  };

  const getRankBadge = (rank: number | undefined) => {
    if (!rank) return "bg-blue-50 text-blue-600 border-blue-200";
    if (rank === 1) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    if (rank === 2) return "bg-blue-200 text-blue-800 border-blue-400";
    if (rank === 3) return "bg-orange-100 text-orange-800 border-orange-300";
    if (rank <= 5) return "bg-green-50 text-green-700 border-green-200";
    return "bg-blue-50 text-blue-600 border-blue-200";
  };

  const getRankChange = (ticker: string, currentRank: number | undefined) => {
    if (!currentRank) return null;
    const prevRank = previousRanks[ticker];
    if (!prevRank) return null;
    const change = prevRank - currentRank;
    if (change === 0) return <Minus className="w-3 h-3 text-blue-400" />;
    if (change > 0)
      return (
        <div className="flex items-center text-green-600">
          <ArrowUp className="w-3 h-3" />
          <span className="text-xs">{change}</span>
        </div>
      );
    return (
      <div className="flex items-center text-red-600">
        <ArrowDown className="w-3 h-3" />
        <span className="text-xs">{Math.abs(change)}</span>
      </div>
    );
  };

  const getVixStatus = () => {
    if (!vixPrice)
      return { label: "Unknown", color: "bg-blue-100 text-blue-800" };
    const val = parseFloat(vixPrice);
    if (val < 15)
      return { label: "Low Fear", color: "bg-green-100 text-green-800" };
    if (val < 20)
      return { label: "Normal", color: "bg-blue-100 text-blue-800" };
    if (val < 30)
      return { label: "Elevated", color: "bg-amber-100 text-amber-800" };
    return { label: "High Fear", color: "bg-red-100 text-red-800" };
  };

  const exportToCSV = () => {
    const headers = [
      "Rank",
      "Ticker",
      "Name",
      "Category",
      "Price",
      "Div%",
      "1M%",
      "3M%",
      "6M%",
      "12M%",
      "Vol%",
      "RSI",
      "Raw Score",
      "Risk-Adj",
      "TER%",
      "AUM",
    ];
    const rows = displayEtfs.map((etf) => [
      etf.rank || "",
      etf.ticker,
      etf.name,
      etf.category,
      etf.price || "",
      etf.dividendYield || 0,
      etf.m1 || "",
      etf.m3 || "",
      etf.m6 || "",
      etf.m12 || "",
      etf.vol12M || "",
      etf.rsi || "",
      etf.rawMomentumScore || "",
      etf.momentumScore || "",
      etf.ter,
      etf.aum,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `momentum-etf-tracker-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const Sparkline = ({ data }: { data?: Array<{ x: number; y: number }> }) => {
    if (!data || data.length === 0)
      return <div className="w-20 h-8 bg-blue-100 rounded"></div>;

    const maxY = Math.max(...data.map((d) => d.y));
    const minY = Math.min(...data.map((d) => d.y));
    const range = maxY - minY || 1;

    const points = data.map((d) => ({
      x: (d.x / (data.length - 1)) * 80,
      y: 30 - ((d.y - minY) / range) * 28,
    }));

    const pathD = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ");
    const isPositive = data[data.length - 1].y > data[0].y;

    return (
      <svg width="80" height="32" className="inline-block">
        <path
          d={pathD}
          fill="none"
          stroke={isPositive ? "#16a34a" : "#dc2626"}
          strokeWidth="1.5"
        />
      </svg>
    );
  };

  const filteredEtfs = etfs.filter((etf) => {
    if (
      searchQuery &&
      !etf.ticker.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !etf.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  console.log("Filtered ETFs:", filteredEtfs);
  console.log("Search Query:", searchQuery);
  console.log("ETFs:", etfs);

  const displayEtfs = [...filteredEtfs].sort((a, b) => {
    if (sortBy === "momentum")
      return (
        parseFloat(b.momentumScore || "0") - parseFloat(a.momentumScore || "0")
      );
    if (sortBy === "raw")
      return (
        parseFloat(b.rawMomentumScore || "0") -
        parseFloat(a.rawMomentumScore || "0")
      );
    if (sortBy === "m6")
      return parseFloat(b.m6 || "0") - parseFloat(a.m6 || "0");
    if (sortBy === "ter") return a.ter - b.ter;
    if (sortBy === "aum") return b.aum - a.aum;
    return 0;
  });

  const portfolioMetrics =
    portfolio.length > 0
      ? {
          totalAllocation: portfolio.reduce((sum, p) => sum + p.allocation, 0),
          weightedTER: portfolio.reduce((sum, p) => {
            const etf = etfs.find((e) => e.ticker === p.ticker);
            return sum + (etf ? (etf.ter * p.allocation) / 100 : 0);
          }, 0),
          weightedReturn: portfolio.reduce((sum, p) => {
            const etf = etfs.find((e) => e.ticker === p.ticker);
            return (
              sum +
              (etf && etf.m12 ? (parseFloat(etf.m12) * p.allocation) / 100 : 0)
            );
          }, 0),
        }
      : null;

  const topEtfs = displayEtfs.slice(0, 3);
  const avgMomentum =
    displayEtfs.length > 0
      ? (
          displayEtfs.reduce(
            (sum, e) => sum + parseFloat(e.momentumScore || "0"),
            0,
          ) / displayEtfs.length
        ).toFixed(2)
      : "0";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-blue-50 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-blue-800">
                Momentum ETF Tracker
              </h1>
              <p className="text-sm text-blue-600">
                UK-listed ETFs ranked by momentum strategy
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportToCSV}
              disabled={loading || displayEtfs.length === 0}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-blue-50 rounded-lg disabled:bg-blue-300 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={fetchPriceData}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-blue-50 rounded-lg disabled:bg-blue-300 flex items-center gap-2"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh All
            </button>
          </div>
        </div>

        {loading && (
          <div className="mb-4">
            <div className="flex justify-between text-sm text-blue-600 mb-1">
              <span>
                Fetching data from Yahoo Finance... ({progress.current}/
                {progress.total})
              </span>
              <span>
                {Math.round((progress.current / progress.total) * 100)}%
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{
                  width: `${(progress.current / progress.total) * 100}%`,
                }}
              ></div>
            </div>
            <p className="text-xs text-blue-500 mt-2">
              ⏱️ This takes ~10-15 seconds for 10 ETFs
            </p>
          </div>
        )}

        {lastUpdate && (
          <p className="text-sm text-blue-500">✅ Last updated: {lastUpdate}</p>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {vixPrice && (
          <div className="bg-blue-50 rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-600">
                VIX (Fear Index)
              </span>
              <AlertCircle className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-blue-800">
                {vixPrice}
              </span>
              <span
                className={`text-sm font-semibold ${parseFloat(vixChange || "0") > 0 ? "text-red-600" : "text-green-600"}`}
              >
                {parseFloat(vixChange || "0") > 0 ? "↑" : "↓"}{" "}
                {Math.abs(parseFloat(vixChange || "0"))}%
              </span>
            </div>
            <div className="mt-2">
              <span
                className={`text-xs px-2 py-1 rounded-full ${getVixStatus().color}`}
              >
                {getVixStatus().label}
              </span>
            </div>
          </div>
        )}

        <div className="bg-blue-50 rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-600">
              Top 3 ETFs
            </span>
            <Star className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="space-y-1">
            {topEtfs.map((etf, idx) => (
              <div
                key={etf.ticker}
                className="flex items-center justify-between text-sm"
              >
                <span className="font-mono font-semibold text-blue-800">
                  {idx + 1}. {etf.ticker}
                </span>
                <span className={getMomentumColor(etf.momentumScore)}>
                  {etf.momentumScore || "-"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-600">
              Avg Momentum
            </span>
            <TrendingUp className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex items-end gap-2">
            <span
              className={`text-3xl font-bold ${getMomentumColor(avgMomentum)}`}
            >
              {avgMomentum}
            </span>
          </div>
          <p className="text-xs text-blue-500 mt-2">
            Across {displayEtfs.length} ETFs
          </p>
        </div>

        {portfolioMetrics && (
          <div className="bg-blue-50 rounded-lg shadow-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-600">
                Portfolio
              </span>
              <PieChart className="w-5 h-5 text-blue-400" />
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-blue-600">Allocation:</span>
                <span
                  className={`font-semibold ${portfolioMetrics.totalAllocation === 100 ? "text-green-600" : "text-amber-600"}`}
                >
                  {portfolioMetrics.totalAllocation.toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600">Avg TER:</span>
                <span className="font-semibold text-blue-800">
                  {portfolioMetrics.weightedTER.toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600">Expected Return:</span>
                <span
                  className={`font-semibold ${portfolioMetrics.weightedReturn > 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {portfolioMetrics.weightedReturn.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="font-semibold text-red-800 mb-2">
            ⚠ Errors fetching data:
          </p>
          <ul className="text-sm text-red-700 list-disc list-inside">
            {errors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Add ETF Form */}
      <div className="bg-blue-50 rounded-lg shadow-lg p-4">
        <h2 className="font-semibold mb-3 flex items-center gap-2 text-blue-800">
          <Plus className="w-5 h-5" />
          Add New ETF
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-black">
          <input
            type="text"
            placeholder="Ticker (e.g., VWRL.L)"
            value={newTicker}
            onChange={(e) => setNewTicker(e.target.value)}
            className="border border-blue-200 rounded px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="border border-blue-200 rounded px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Category"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="border border-blue-200 rounded px-3 py-2 text-sm"
          />
          <input
            type="number"
            step="0.01"
            placeholder="TER %"
            value={newTer}
            onChange={(e) => setNewTer(e.target.value)}
            className="border border-blue-200 rounded px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="AUM (£m)"
            value={newAum}
            onChange={(e) => setNewAum(e.target.value)}
            className="border border-blue-200 rounded px-3 py-2 text-sm"
          />
          <input
            type="number"
            step="0.01"
            placeholder="Div Yield %"
            value={newDivYield}
            onChange={(e) => setNewDivYield(e.target.value)}
            className="border border-blue-200 rounded px-3 py-2 text-sm"
          />
        </div>
        <button
          onClick={addETF}
          className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-blue-50 rounded-lg text-sm"
        >
          Add ETF
        </button>
      </div>

      {/* Momentum Settings */}
      <div className="bg-blue-50 rounded-lg shadow-lg p-4">
        <h2 className="font-semibold mb-3 text-blue-800">
          Momentum Calculation Settings
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-blue-700">
                3M ({weights.m3}%)
              </span>
              <label className="flex items-center gap-1 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={useRiskAdjusted.m3}
                  onChange={(e) =>
                    setUseRiskAdjusted({
                      ...useRiskAdjusted,
                      m3: e.target.checked,
                    })
                  }
                  className="w-3 h-3"
                />
                <span className="text-blue-600">Risk-Adj</span>
              </label>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={weights.m3}
              onChange={(e) =>
                setWeights({ ...weights, m3: parseInt(e.target.value) })
              }
              className="w-full"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-blue-700">
                6M ({weights.m6}%)
              </span>
              <label className="flex items-center gap-1 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={useRiskAdjusted.m6}
                  onChange={(e) =>
                    setUseRiskAdjusted({
                      ...useRiskAdjusted,
                      m6: e.target.checked,
                    })
                  }
                  className="w-3 h-3"
                />
                <span className="text-blue-600">Risk-Adj</span>
              </label>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={weights.m6}
              onChange={(e) =>
                setWeights({ ...weights, m6: parseInt(e.target.value) })
              }
              className="w-full"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-blue-700">
                12M ({weights.m12}%)
              </span>
              <label className="flex items-center gap-1 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={useRiskAdjusted.m12}
                  onChange={(e) =>
                    setUseRiskAdjusted({
                      ...useRiskAdjusted,
                      m12: e.target.checked,
                    })
                  }
                  className="w-3 h-3"
                />
                <span className="text-blue-600">Risk-Adj</span>
              </label>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={weights.m12}
              onChange={(e) =>
                setWeights({ ...weights, m12: parseInt(e.target.value) })
              }
              className="w-full"
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-xs text-blue-600">
            Total: {weights.m3 + weights.m6 + weights.m12}%
            {weights.m3 + weights.m6 + weights.m12 !== 100 && (
              <span className="text-amber-600 ml-2">⚠ Should = 100%</span>
            )}
          </p>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-blue-700">
              Risk-Free Rate:
            </label>
            <input
              type="number"
              step="0.1"
              value={riskFreeRate}
              onChange={(e) => setRiskFreeRate(parseFloat(e.target.value))}
              className="w-16 border border-blue-200 rounded px-2 py-1 text-xs"
            />
            <span className="text-xs text-blue-500">% (UK 10Y Gilt)</span>
          </div>
        </div>
      </div>

      {/* Search & Sort */}
      <div className="bg-blue-50 rounded-lg shadow-lg p-4">
        <div className="mb-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-blue-400" />
            <input
              type="text"
              placeholder="Search by ticker or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-blue-200 rounded-lg text-sm"
            />
          </div>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <span className="font-medium text-blue-800">Sort:</span>
          {[
            { key: "momentum", label: "Risk-Adj Score" },
            { key: "raw", label: "Raw Momentum" },
            { key: "m6", label: "6M Return" },
            { key: "ter", label: "Lowest Cost" },
            { key: "aum", label: "Largest AUM" },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={`px-3 py-1 rounded text-sm ${sortBy === opt.key ? "bg-blue-600 text-blue-50" : "bg-blue-100 hover:bg-blue-200 text-blue-800"}`}
            >
              {opt.label}
            </button>
          ))}
          <span className="ml-auto text-sm text-blue-600">
            Showing {displayEtfs.length} ETFs
          </span>
        </div>
      </div>

      {/* Portfolio Builder */}
      {portfolio.length > 0 && (
        <div className="bg-blue-50 rounded-lg shadow-lg p-4">
          <h2 className="font-semibold mb-3 flex items-center gap-2 text-blue-800">
            <PieChart className="w-5 h-5" />
            Portfolio Builder ({portfolio.length} ETFs)
          </h2>
          <div className="space-y-2">
            {portfolio.map((p) => {
              return (
                <div key={p.ticker} className="flex items-center gap-3">
                  <span className="font-mono font-semibold w-20 text-blue-800">
                    {p.ticker}
                  </span>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    max="100"
                    value={p.allocation}
                    onChange={(e) => updateAllocation(p.ticker, e.target.value)}
                    className="w-24 border border-blue-200 rounded px-2 py-1 text-sm"
                    placeholder="%"
                  />
                  <span className="text-sm text-blue-600">%</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={p.allocation}
                    onChange={(e) => updateAllocation(p.ticker, e.target.value)}
                    className="flex-1"
                  />
                  <button
                    onClick={() => togglePortfolio(p.ticker)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
          {portfolioMetrics && portfolioMetrics.totalAllocation !== 100 && (
            <p className="text-sm text-amber-600 mt-2">
              ⚠ Total allocation should equal 100%
            </p>
          )}
        </div>
      )}

      {/* ETF Table */}
      <div className="bg-blue-50 rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-blue-800 text-blue-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left">Rank</th>
                <th className="px-3 py-2 text-center">Portfolio</th>
                <th className="px-3 py-2 text-left">Ticker</th>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Category</th>
                <th className="px-3 py-2 text-right">Price</th>
                <th className="px-3 py-2 text-center">Trend</th>
                <th className="px-3 py-2 text-right">Div%</th>
                <th className="px-3 py-2 text-right">1M%</th>
                <th className="px-3 py-2 text-right">3M%</th>
                <th className="px-3 py-2 text-right">6M%</th>
                <th className="px-3 py-2 text-right">12M%</th>
                <th className="px-3 py-2 text-right">Vol%</th>
                <th className="px-3 py-2 text-right">RSI</th>
                <th className="px-3 py-2 text-right">Raw Score</th>
                <th className="px-3 py-2 text-right">Risk-Adj</th>
                <th className="px-3 py-2 text-right">TER%</th>
                <th className="px-3 py-2 text-right">AUM</th>
                <th className="px-3 py-2 text-center">Del</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-200">
              {displayEtfs.map((etf) => (
                <tr key={etf.ticker} className="hover:bg-blue-100">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold border ${getRankBadge(etf.rank)}`}
                      >
                        #{etf.rank || "-"}
                      </span>
                      {getRankChange(etf.ticker, etf.rank)}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => togglePortfolio(etf.ticker)}
                      className={
                        portfolio.find((p) => p.ticker === etf.ticker)
                          ? "text-blue-600"
                          : "text-blue-300 hover:text-blue-600"
                      }
                    >
                      <Star
                        className="w-4 h-4"
                        fill={
                          portfolio.find((p) => p.ticker === etf.ticker)
                            ? "currentColor"
                            : "none"
                        }
                      />
                    </button>
                  </td>
                  <td className="px-3 py-2 font-mono font-semibold text-blue-800">
                    {etf.ticker}
                  </td>
                  <td className="px-3 py-2 text-blue-700">{etf.name}</td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                      {etf.category}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-blue-800">
                    {etf.price ? `£${etf.price}` : "-"}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Sparkline data={etf.sparklineData} />
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-blue-600">
                    {etf.dividendYield || "0"}%
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-mono ${parseFloat(etf.m1 || "0") > 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {etf.m1 || "-"}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-mono ${parseFloat(etf.m3 || "0") > 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {etf.m3 || "-"}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-mono ${parseFloat(etf.m6 || "0") > 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {etf.m6 || "-"}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-mono ${parseFloat(etf.m12 || "0") > 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {etf.m12 || "-"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-blue-600">
                    {etf.vol12M || "-"}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-mono ${getRSIColor(etf.rsi)}`}
                    title={getRSILabel(etf.rsi)}
                  >
                    {etf.rsi || "-"}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-mono ${getMomentumColor(etf.rawMomentumScore)}`}
                  >
                    {etf.rawMomentumScore || "-"}
                  </td>
                  <td
                    className={`px-3 py-2 text-right font-mono font-bold ${getMomentumColor(etf.momentumScore)}`}
                  >
                    {etf.momentumScore || "-"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-blue-700">
                    {etf.ter.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-xs text-blue-600">
                    £{etf.aum.toLocaleString()}m
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => removeETF(etf.ticker)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800 mb-2">
          <strong>🚀 Getting Started:</strong> Click "Refresh All" to fetch live
          Yahoo Finance data (12 months of historical prices for each ETF).
        </p>
        <p className="text-sm text-blue-800 mb-2">
          <strong>📊 Features:</strong> Use the star icon to build portfolios,
          adjust momentum weights (3M/6M/12M), sort by different metrics, search
          ETFs, and export results to CSV.
        </p>
        <p className="text-sm text-blue-800">
          <strong>💾 Data Persistence:</strong> Click "Refresh All" each time
          you want updated prices. Export to CSV if you need to save results.
        </p>
      </div>
    </div>
  );
}
