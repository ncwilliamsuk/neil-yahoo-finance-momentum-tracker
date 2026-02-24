// lib/v5/sectors.ts
// Sector ETF definitions, factor matrix definitions, and calculations for Tab 3

export type Timeframe = '1D' | '1W' | '1M' | '3M' | '6M' | '12M';

export interface SectorETF {
  ticker: string;
  name: string;
  type: 'cyclical' | 'defensive';
}

export interface SectorReturn {
  ticker: string;
  name: string;
  type: 'cyclical' | 'defensive';
  return: number;
  rank: number;
}

export interface CDRatioPoint {
  date:  string;
  ratio: number;
  ma50:  number | null;
  ma200: number | null;
}

export interface SecondaryRatio {
  name:      string;
  current:   number;
  above50MA: boolean;
  trend:     'rising' | 'falling' | 'flat';
  ma50:      number;
  available: boolean;
}

export interface CDRatioData {
  region:         'US' | 'World' | 'EU';
  current:        number;
  above50MA:      boolean;
  above200MA:     boolean;
  trend:          'rising' | 'falling' | 'flat';
  series:         CDRatioPoint[];
  ma50:           number;
  ma200:          number;
  secondaryRatio: SecondaryRatio;
}

// ─── Factor Matrix types ──────────────────────────────────────────────────────

export type FactorSize   = 'Large' | 'Mid' | 'Small';
export type FactorStyle  = 'Blend' | 'Quality' | 'Value' | 'Momentum' | 'Growth' | 'Low Vol';

export interface FactorCell {
  ticker:  string;
  return:  number;         // % return for selected timeframe
  percentile: number;      // 0–100 rank across all 18 cells
}

export type FactorMatrix = Record<FactorSize, Record<FactorStyle, FactorCell>>;

// ─── ETF Definitions ──────────────────────────────────────────────────────────

export const US_SECTORS: SectorETF[] = [
  { ticker: 'XLK',  name: 'Technology',            type: 'cyclical' },
  { ticker: 'XLE',  name: 'Energy',                 type: 'cyclical' },
  { ticker: 'XLF',  name: 'Financials',             type: 'cyclical' },
  { ticker: 'XLY',  name: 'Consumer Discretionary', type: 'cyclical' },
  { ticker: 'XLI',  name: 'Industrials',            type: 'cyclical' },
  { ticker: 'XLB',  name: 'Materials',              type: 'cyclical' },
  { ticker: 'XLRE', name: 'Real Estate',            type: 'cyclical' },
  { ticker: 'XLC',  name: 'Communication Services', type: 'cyclical' },
  { ticker: 'XLP',  name: 'Consumer Staples',       type: 'defensive' },
  { ticker: 'XLV',  name: 'Healthcare',             type: 'defensive' },
  { ticker: 'XLU',  name: 'Utilities',              type: 'defensive' },
];

export const WORLD_SECTORS: SectorETF[] = [
  { ticker: 'XDWT.L', name: 'Technology',            type: 'cyclical' },
  { ticker: 'WCOM.L', name: 'Communication Services', type: 'cyclical' },
  { ticker: 'XWDS.L', name: 'Consumer Discretionary', type: 'cyclical' },
  { ticker: 'XDWF.L', name: 'Financials',            type: 'cyclical' },
  { ticker: 'XWIS.L', name: 'Industrials',           type: 'cyclical' },
  { ticker: 'WMAT.L', name: 'Materials',             type: 'cyclical' },
  { ticker: 'IWDP.L', name: 'Real Estate',           type: 'cyclical' },
  { ticker: 'WENS.L', name: 'Energy',                type: 'cyclical' },
  { ticker: 'XWCS.L', name: 'Consumer Staples',      type: 'defensive' },
  { ticker: 'WHEA.L', name: 'Healthcare',            type: 'defensive' },
  { ticker: 'WUTI.L', name: 'Utilities',             type: 'defensive' },
];

export const EU_SECTORS: SectorETF[] = [
  { ticker: 'ESIT.L', name: 'Technology',            type: 'cyclical' },
  { ticker: 'ESIC.L', name: 'Communication Services', type: 'cyclical' },
  { ticker: 'XSD2.L', name: 'Consumer Discretionary', type: 'cyclical' },
  { ticker: 'ESIF.L', name: 'Financials',            type: 'cyclical' },
  { ticker: 'ESIN.L', name: 'Industrials',           type: 'cyclical' },
  { ticker: 'MTRL.L', name: 'Materials',             type: 'cyclical' },
  { ticker: 'IPRP.L', name: 'Real Estate',           type: 'cyclical' },
  { ticker: 'ESIE.L', name: 'Energy',                type: 'cyclical' },
  { ticker: 'ESIS.L', name: 'Consumer Staples',      type: 'defensive' },
  { ticker: 'ESIH.L', name: 'Healthcare',            type: 'defensive' },
  { ticker: 'UTIL.L', name: 'Utilities',             type: 'defensive' },
];

export const SECONDARY_RATIO_TICKERS: Record<'US' | 'World' | 'EU', {
  numerator:   string;
  denominator: string;
  name:        string;
}> = {
  US:    { numerator: 'XLY',    denominator: 'XLP',    name: 'XLY / XLP'   },
  World: { numerator: 'XWDS.L', denominator: 'XWCS.L', name: 'XWDS / XWCS' },
  EU:    { numerator: 'XSD2.L', denominator: 'ESIS.L', name: 'XSD2 / ESIS' },
};

// ─── Factor Matrix ETF definitions ───────────────────────────────────────────
// 3×6 grid: Large / Mid / Small cap × Blend / Quality / Value / Momentum / Growth / Low Vol

export const FACTOR_SIZES:  FactorSize[]  = ['Large', 'Mid', 'Small'];
export const FACTOR_STYLES: FactorStyle[] = ['Blend', 'Quality', 'Value', 'Momentum', 'Growth', 'Low Vol'];

export const FACTOR_TICKERS: Record<FactorSize, Record<FactorStyle, string>> = {
  Large: {
    Blend:    'SPY',
    Quality:  'QUAL',
    Value:    'VALUE',
    Momentum: 'MTUM',
    Growth:   'VUG',
    'Low Vol':'SPLV',
  },
  Mid: {
    Blend:    'IJH',
    Quality:  'XMHQ',
    Value:    'VOE',
    Momentum: 'XMMO',
    Growth:   'VOT',
    'Low Vol':'XMLV',
  },
  Small: {
    Blend:    'IJR',
    Quality:  'SQLV',
    Value:    'VBR',
    Momentum: 'DWAS',
    Growth:   'VBK',
    'Low Vol':'XSLV',
  },
};

// Flat list of all 18 factor tickers for easy fetching
export const ALL_FACTOR_TICKERS: string[] = FACTOR_SIZES.flatMap(size =>
  FACTOR_STYLES.map(style => FACTOR_TICKERS[size][style])
);

// ─── Signal scoring ───────────────────────────────────────────────────────────

export type RegionSignal = 'strong-risk-on' | 'risk-on' | 'neutral' | 'risk-off' | 'strong-risk-off';

export function regionSignal(data: CDRatioData): RegionSignal {
  let score = 0;
  if (data.current > 1)         score += 1;
  if (data.above50MA)           score += 1;
  if (data.above200MA)          score += 1;
  if (data.trend === 'rising')  score += 1;
  if (data.trend === 'falling') score -= 1;
  if (data.current < 1)         score -= 1;
  if (!data.above50MA)          score -= 0.5;
  if (!data.above200MA)         score -= 0.5;

  if (score >= 3)  return 'strong-risk-on';
  if (score >= 1)  return 'risk-on';
  if (score <= -3) return 'strong-risk-off';
  if (score <= -1) return 'risk-off';
  return 'neutral';
}

export function signalLabel(s: RegionSignal): string {
  switch (s) {
    case 'strong-risk-on':  return 'Strong Risk-On';
    case 'risk-on':         return 'Risk-On';
    case 'neutral':         return 'Neutral';
    case 'risk-off':        return 'Risk-Off';
    case 'strong-risk-off': return 'Strong Risk-Off';
  }
}

export function signalBadgeClass(s: RegionSignal): string {
  switch (s) {
    case 'strong-risk-on':  return 'bg-green-100 text-green-800';
    case 'risk-on':         return 'bg-green-50 text-green-700';
    case 'neutral':         return 'bg-yellow-50 text-yellow-700';
    case 'risk-off':        return 'bg-red-50 text-red-700';
    case 'strong-risk-off': return 'bg-red-100 text-red-800';
  }
}

export function signalDotClass(s: RegionSignal): string {
  switch (s) {
    case 'strong-risk-on':  return 'bg-green-500';
    case 'risk-on':         return 'bg-green-400';
    case 'neutral':         return 'bg-yellow-400';
    case 'risk-off':        return 'bg-red-400';
    case 'strong-risk-off': return 'bg-red-500';
  }
}

// ─── Cross-regional summary ───────────────────────────────────────────────────

export type SummaryTone = 'positive' | 'negative' | 'mixed' | 'neutral';

export interface RegionalSummary {
  headline: string;
  detail:   string;
  tone:     SummaryTone;
}

export function generateCrossRegionalSummary(
  us:    CDRatioData,
  world: CDRatioData,
  eu:    CDRatioData,
): RegionalSummary {
  const usSignal    = regionSignal(us);
  const worldSignal = regionSignal(world);
  const euSignal    = regionSignal(eu);

  const signals      = [usSignal, worldSignal, euSignal];
  const riskOnCount  = signals.filter(s => s === 'risk-on' || s === 'strong-risk-on').length;
  const riskOffCount = signals.filter(s => s === 'risk-off' || s === 'strong-risk-off').length;
  const neutralCount = signals.filter(s => s === 'neutral').length;

  const allRisingTrend  = [us, world, eu].every(d => d.trend === 'rising');
  const allFallingTrend = [us, world, eu].every(d => d.trend === 'falling');
  const allAbove200     = [us, world, eu].every(d => d.above200MA);
  const allBelow200     = [us, world, eu].every(d => !d.above200MA);

  const usLeading = (usSignal === 'strong-risk-on' || usSignal === 'risk-on') &&
                    (worldSignal === 'risk-off' || worldSignal === 'neutral') &&
                    (euSignal   === 'risk-off' || euSignal   === 'neutral');

  const euLeading = (euSignal === 'strong-risk-on' || euSignal === 'risk-on') &&
                    (usSignal === 'risk-off' || usSignal === 'neutral');

  if (riskOnCount === 3) {
    if (allRisingTrend) {
      return {
        headline: 'Global cyclical leadership — broad risk-on rotation',
        detail:   'Cyclicals are outperforming defensives across all three regions with rising momentum. ' +
                  'This is a broad-based expansion signal suggesting investor confidence is high globally. ' +
                  (allAbove200
                    ? 'All regions are above their 200-day MA, confirming a well-established trend.'
                    : 'Watch for 200-day MA crossovers to validate the longer-term trend.'),
        tone: 'positive',
      };
    }
    return {
      headline: 'Cyclicals leading globally — risk-on environment',
      detail:   'All three regions show cyclical sector outperformance over defensives, a positive signal for ' +
                'risk assets. ' + (allAbove200
                  ? 'The trend is supported by long-term moving averages in all regions.'
                  : 'Momentum is positive though some regions have yet to clear their 200-day moving average.'),
      tone: 'positive',
    };
  }

  if (riskOffCount === 3) {
    if (allFallingTrend) {
      return {
        headline: 'Global defensive rotation — risk-off across all regions',
        detail:   'Defensive sectors are leading cyclicals in all three regions with falling momentum. ' +
                  'This is a broad-based risk-off signal, consistent with late-cycle or contraction conditions. ' +
                  (allBelow200
                    ? 'All regions are below their 200-day MA, suggesting a structural rather than temporary shift.'
                    : 'Monitor whether ratios break below their 200-day moving averages for confirmation.'),
        tone: 'negative',
      };
    }
    return {
      headline: 'Defensives leading globally — cautious positioning warranted',
      detail:   'Defensive sectors are outperforming cyclicals across all three regions. Investors appear to ' +
                'be rotating toward safer assets. This pattern often precedes periods of market stress or ' +
                'slowing economic activity.',
      tone: 'negative',
    };
  }

  if (usLeading) {
    return {
      headline: 'US risk-on diverging from World and Europe',
      detail:   'US cyclicals are leading defensives while World and European markets show a more defensive ' +
                'bias. This divergence may reflect US economic exceptionalism or dollar-driven flows. ' +
                'Watch whether global markets follow the US lead or whether US momentum fades toward the ' +
                'international trend.',
      tone: 'mixed',
    };
  }

  if (euLeading) {
    return {
      headline: 'European cyclicals showing relative strength',
      detail:   'European sectors are exhibiting cyclical leadership while the US and/or World signals remain ' +
                'more cautious. This could reflect European fiscal stimulus, currency dynamics, or a rotation ' +
                'toward cheaper international markets.',
      tone: 'mixed',
    };
  }

  if (riskOnCount === 2 && riskOffCount === 1) {
    const laggard = euSignal    === 'risk-off' ? 'Europe'
                  : worldSignal === 'risk-off' ? 'World markets'
                  : 'the US';
    return {
      headline: 'Broadly risk-on with one region lagging',
      detail:   `Two of three regions show cyclical leadership, suggesting a generally constructive environment for risk assets. ` +
                `${laggard} is the outlier showing defensive rotation — worth monitoring whether this spreads or resolves.`,
      tone: 'positive',
    };
  }

  if (riskOffCount === 2 && riskOnCount === 1) {
    const leader = (usSignal === 'risk-on' || usSignal === 'strong-risk-on') ? 'the US'
                 : (euSignal === 'risk-on' || euSignal === 'strong-risk-on') ? 'Europe'
                 : 'World markets';
    return {
      headline: 'Predominantly defensive — one region holding cyclical strength',
      detail:   `Defensives are leading in two of three regions, suggesting a broadly cautious environment. ` +
                `${leader} is showing relative cyclical resilience, but the broader weight of evidence leans risk-off. ` +
                'Consider whether the outlier is leading a turn or simply lagging the global trend.',
      tone: 'negative',
    };
  }

  if (neutralCount >= 2) {
    return {
      headline: 'Cross-regional signals inconclusive — wait for confirmation',
      detail:   'The cyclical/defensive ratios across regions are not showing a clear directional bias. ' +
                'Markets may be in a transitional phase. Watch for trend confirmation from moving average ' +
                'crossovers before drawing conclusions.',
      tone: 'neutral',
    };
  }

  return {
    headline: 'Mixed signals — regional divergence in cyclical leadership',
    detail:   'Cyclical and defensive leadership varies significantly by region, suggesting a fragmented ' +
              'global market environment. A unified global signal has yet to emerge.',
    tone: 'mixed',
  };
}

// ─── Calculation helpers ──────────────────────────────────────────────────────

export function calcReturn(prices: number[]): number {
  if (!prices || prices.length < 2) return 0;
  const start = prices[0];
  const end   = prices[prices.length - 1];
  if (!start || start === 0) return 0;
  return ((end - start) / start) * 100;
}

export function rankSectors(sectors: Omit<SectorReturn, 'rank'>[]): SectorReturn[] {
  return [...sectors]
    .sort((a, b) => b.return - a.return)
    .map((s, i) => ({ ...s, rank: i + 1 }));
}

export function calcSMA(values: number[], period: number): (number | null)[] {
  return values.map((_, i) => {
    if (i < period - 1) return null;
    const slice = values.slice(i - period + 1, i + 1);
    return slice.reduce((a, b) => a + b, 0) / period;
  });
}

export function buildEqualWeightedIndex(
  priceMap: Record<string, { date: string; price: number }[]>,
  tickers:  string[],
): { date: string; value: number }[] {
  const validTickers = tickers.filter(t => (priceMap[t]?.length ?? 0) > 0);
  if (validTickers.length === 0) return [];

  const dateSets    = validTickers.map(t => new Set(priceMap[t].map(p => p.date)));
  const commonDates = [...dateSets[0]]
    .filter(d => dateSets.every(ds => ds.has(d)))
    .sort();
  if (commonDates.length === 0) return [];

  const baseMap:     Record<string, number>                  = {};
  const priceByDate: Record<string, Record<string, number>> = {};

  for (const ticker of validTickers) {
    const filtered = priceMap[ticker].filter(p => commonDates.includes(p.date));
    if (filtered.length === 0) continue;
    baseMap[ticker] = filtered[0].price;
    for (const { date, price } of filtered) {
      if (!priceByDate[date]) priceByDate[date] = {};
      priceByDate[date][ticker] = price;
    }
  }

  return commonDates.map(date => {
    const day    = priceByDate[date] ?? {};
    const active = validTickers.filter(t => baseMap[t] && day[t] && baseMap[t] > 0);
    if (active.length === 0) return { date, value: 1 };
    const avg = active.reduce((sum, t) => sum + day[t] / baseMap[t], 0) / active.length;
    return { date, value: avg };
  });
}

function calcTrend(values: number[]): 'rising' | 'falling' | 'flat' {
  if (values.length < 20) return 'flat';
  const recent    = values.slice(-10);
  const prior     = values.slice(-20, -10);
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const priorAvg  = prior.reduce((a, b)  => a + b, 0) / prior.length;
  const change    = (recentAvg - priorAvg) / priorAvg;
  return change > 0.005 ? 'rising' : change < -0.005 ? 'falling' : 'flat';
}

export function calcCDRatio(
  cyclicalIndex:  { date: string; value: number }[],
  defensiveIndex: { date: string; value: number }[],
  region:         'US' | 'World' | 'EU',
  priceMap:       Record<string, { date: string; price: number }[]>,
): CDRatioData {
  const defMap = new Map(defensiveIndex.map(d => [d.date, d.value]));

  const rawRatios = cyclicalIndex
    .filter(c => defMap.has(c.date) && (defMap.get(c.date) ?? 0) > 0)
    .map(c => ({ date: c.date, ratio: c.value / defMap.get(c.date)! }));

  if (rawRatios.length < 5) {
    return {
      region, current: 1, above50MA: false, above200MA: false,
      trend: 'flat', series: [], ma50: 1, ma200: 1,
      secondaryRatio: {
        name: '', current: 1, above50MA: false, trend: 'flat', ma50: 1, available: false,
      },
    };
  }

  const ratioValues = rawRatios.map(r => r.ratio);
  const sma50Array  = calcSMA(ratioValues, 50);
  const sma200Array = calcSMA(ratioValues, 200);

  const last    = ratioValues[ratioValues.length - 1];
  const ma50val  = sma50Array[sma50Array.length - 1]   ?? last;
  const ma200val = sma200Array[sma200Array.length - 1] ?? last;

  const series: CDRatioPoint[] = rawRatios.slice(-200).map((r, i) => {
    const absIdx = (rawRatios.length - 200) + i;
    return {
      date:  r.date,
      ratio: r.ratio,
      ma50:  sma50Array[absIdx]  ?? null,
      ma200: sma200Array[absIdx] ?? null,
    };
  });

  // Secondary ratio — normalised to avoid currency mismatches
  const secDef    = SECONDARY_RATIO_TICKERS[region];
  const numSeries = priceMap[secDef.numerator]   ?? [];
  const denSeries = priceMap[secDef.denominator] ?? [];

  let secondaryRatio: SecondaryRatio = {
    name: secDef.name, current: 1, above50MA: false,
    trend: 'flat', ma50: 1, available: false,
  };

  if (numSeries.length > 5 && denSeries.length > 5) {
    const denDateMap = new Map(denSeries.map(p => [p.date, p.price]));
    const common     = numSeries.filter(p => denDateMap.has(p.date));

    if (common.length > 5) {
      const numBase = common[0].price;
      const denBase = denDateMap.get(common[0].date)!;

      if (numBase > 0 && denBase > 0) {
        const secRatios = common.map(p => {
          const normNum = p.price / numBase;
          const normDen = denDateMap.get(p.date)! / denBase;
          return normDen > 0 ? normNum / normDen : 1;
        });

        const secSMA50 = calcSMA(secRatios, Math.min(50, secRatios.length));
        const secLast  = secRatios[secRatios.length - 1];
        const secMA50  = secSMA50[secSMA50.length - 1] ?? secLast;

        secondaryRatio = {
          name:      secDef.name,
          current:   secLast,
          above50MA: secLast > secMA50,
          trend:     calcTrend(secRatios),
          ma50:      secMA50,
          available: true,
        };
      }
    }
  }

  return {
    region,
    current:    last,
    above50MA:  last > ma50val,
    above200MA: last > ma200val,
    trend:      calcTrend(ratioValues),
    series,
    ma50:       ma50val,
    ma200:      ma200val,
    secondaryRatio,
  };
}

// ─── Factor matrix calculation ────────────────────────────────────────────────

/**
 * Build the 3×6 factor matrix for a given timeframe from pre-fetched prices.
 * Percentile is ranked across all 18 cells (0 = worst, 100 = best).
 */
export function buildFactorMatrix(
  priceMap: Record<string, number[]>,
  bars:     number,
): FactorMatrix {
  // Collect all 18 returns first so we can compute cross-matrix percentile
  const allReturns: { size: FactorSize; style: FactorStyle; ticker: string; ret: number }[] = [];

  for (const size of FACTOR_SIZES) {
    for (const style of FACTOR_STYLES) {
      const ticker = FACTOR_TICKERS[size][style];
      const prices = priceMap[ticker] ?? [];
      const slice  = prices.length >= 2 ? prices.slice(-Math.min(bars, prices.length)) : [];
      const ret    = calcReturn(slice);
      allReturns.push({ size, style, ticker, ret });
    }
  }

  // Rank returns to get percentile (0–100)
  const sorted = [...allReturns].sort((a, b) => a.ret - b.ret);
  const n      = sorted.length;

  const matrix = {} as FactorMatrix;
  for (const size of FACTOR_SIZES) {
    matrix[size] = {} as Record<FactorStyle, FactorCell>;
  }

  for (const item of allReturns) {
    const rank       = sorted.findIndex(s => s.ticker === item.ticker && s.size === item.size);
    const percentile = n > 1 ? Math.round((rank / (n - 1)) * 100) : 50;

    matrix[item.size][item.style] = {
      ticker:     item.ticker,
      return:     item.ret,
      percentile,
    };
  }

  return matrix;
}

// ─── Return colour coding ─────────────────────────────────────────────────────

export function getReturnColorClass(value: number, tf: Timeframe): string {
  const thresholds: Record<Timeframe, { vNeg: number; neg: number; pos: number; vPos: number }> = {
    '1D':  { vNeg: -2,  neg: -0.5, pos: 0.5, vPos: 2  },
    '1W':  { vNeg: -4,  neg: -1,   pos: 1,   vPos: 4  },
    '1M':  { vNeg: -6,  neg: -2,   pos: 2,   vPos: 6  },
    '3M':  { vNeg: -10, neg: -3,   pos: 3,   vPos: 10 },
    '6M':  { vNeg: -15, neg: -5,   pos: 5,   vPos: 15 },
    '12M': { vNeg: -20, neg: -7,   pos: 7,   vPos: 20 },
  };
  const t = thresholds[tf];
  if (value <= t.vNeg) return 'bg-red-800 text-white';
  if (value <= t.neg)  return 'bg-red-400 text-white';
  if (value < t.pos)   return 'bg-yellow-100 text-slate-700';
  if (value < t.vPos)  return 'bg-green-400 text-white';
  return                      'bg-green-700 text-white';
}

// ─── Factor matrix colour (percentile-based, independent of thresholds) ───────

export function getFactorCellClass(percentile: number): string {
  if (percentile >= 80) return 'bg-green-700 text-white';
  if (percentile >= 60) return 'bg-green-400 text-white';
  if (percentile >= 40) return 'bg-yellow-100 text-slate-700';
  if (percentile >= 20) return 'bg-red-400 text-white';
  return                       'bg-red-800 text-white';
}

// ─── Ratio Trends types ───────────────────────────────────────────────────────

export type RatioTab = 'Sector' | 'Global' | 'Size & Style' | 'Commodity' | 'Credit' | 'Themes' | 'All';

export interface RatioDefinition {
  id:          string;
  numerator:   string;
  denominator: string;
  label:       string;       // e.g. "Growth / Value"
  guide:       string;       // e.g. "Style rotation"
  tab:         Exclude<RatioTab, 'All'>;
  riskOnAbove: boolean;      // true = ratio > 1 (or rising) = risk-on
}

export interface RatioPoint {
  date:  string;
  value: number;
}

export interface RatioSeries {
  id:          string;
  label:       string;
  guide:       string;
  tab:         Exclude<RatioTab, 'All'>;
  current:     number;       // latest normalised ratio value
  ma50:        number;       // 50-day MA of ratio
  aboveMa50:   boolean;
  trend:       'rising' | 'falling' | 'flat';
  signal:      'risk-on' | 'risk-off' | 'neutral';
  series:      RatioPoint[]; // ~12 months of monthly points, normalised to 1
}

export const RATIO_DEFINITIONS: RatioDefinition[] = [
  // Sector
  { id: 'xly-xlp',  numerator: 'XLY',    denominator: 'XLP',    label: 'XLY / XLP',   guide: 'Risk appetite',         tab: 'Sector',      riskOnAbove: true },
  { id: 'xlb-xlp',  numerator: 'XLB',    denominator: 'XLP',    label: 'XLB / XLP',   guide: 'Materials vs Staples',  tab: 'Sector',      riskOnAbove: true },
  { id: 'xli-xlu',  numerator: 'XLI',    denominator: 'XLU',    label: 'XLI / XLU',   guide: 'Industrials vs Utils',  tab: 'Sector',      riskOnAbove: true },
  // Global
  { id: 'rsp-spy',  numerator: 'RSP',    denominator: 'SPY',    label: 'RSP / SPY',   guide: 'Broad participation',   tab: 'Global',      riskOnAbove: true },
  { id: 'vusa-vwrl',numerator: 'VUSA.L', denominator: 'VWRL.L', label: 'VUSA / VWRL', guide: 'US vs World',           tab: 'Global',      riskOnAbove: true },
  { id: 'eem-efa',  numerator: 'EEM',    denominator: 'EFA',    label: 'EEM / EFA',   guide: 'Emerging vs Developed', tab: 'Global',      riskOnAbove: true },
  { id: 'vusa-veur',numerator: 'VUSA.L', denominator: 'VEUR.L', label: 'VUSA / VEUR', guide: 'US vs Europe',          tab: 'Global',      riskOnAbove: false },
  // Size & Style
  { id: 'iwm-spy',  numerator: 'IWM',    denominator: 'SPY',    label: 'IWM / SPY',   guide: 'Small vs Large cap',    tab: 'Size & Style',riskOnAbove: true },
  { id: 'vtv-vug',  numerator: 'VTV',    denominator: 'VUG',    label: 'VTV / VUG',   guide: 'Value vs Growth',       tab: 'Size & Style',riskOnAbove: false },
  { id: 'mtum-splv',numerator: 'MTUM',   denominator: 'SPLV',   label: 'MTUM / SPLV', guide: 'Momentum vs Low Vol',   tab: 'Size & Style',riskOnAbove: true },
  // Commodity
  { id: 'cper-gld', numerator: 'CPER',   denominator: 'GLD',    label: 'CPER / GLD',  guide: 'Copper vs Gold',        tab: 'Commodity',   riskOnAbove: true },
  { id: 'dbc-spy',  numerator: 'DBC',    denominator: 'SPY',    label: 'DBC / SPY',   guide: 'Commodity cycle',       tab: 'Commodity',   riskOnAbove: false },
  // Credit
  { id: 'hyg-ief',  numerator: 'HYG',    denominator: 'IEF',    label: 'HYG / IEF',   guide: 'Credit risk appetite',  tab: 'Credit',      riskOnAbove: true },
  { id: 'xlf-tlt',  numerator: 'XLF',    denominator: 'TLT',    label: 'XLF / TLT',   guide: 'Banking vs Bonds',      tab: 'Credit',      riskOnAbove: true },
  // Themes
  { id: 'soxx-spy', numerator: 'SOXX',   denominator: 'SPY',    label: 'SOXX / SPY',  guide: 'Semiconductors',        tab: 'Themes',      riskOnAbove: true },
];

export const ALL_RATIO_TICKERS: string[] = [
  ...new Set(RATIO_DEFINITIONS.flatMap(r => [r.numerator, r.denominator]))
];

export function buildRatioSeries(
  priceMap: Record<string, { date: string; price: number }[]>,
  def:      RatioDefinition,
): RatioSeries {
  const numSeries = priceMap[def.numerator]   ?? [];
  const denSeries = priceMap[def.denominator] ?? [];

  const denMap = new Map(denSeries.map(p => [p.date, p.price]));
  const common  = numSeries
    .filter(p => denMap.has(p.date) && (denMap.get(p.date) ?? 0) > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Fallback if insufficient data
  if (common.length < 10) {
    return {
      id: def.id, label: def.label, guide: def.guide, tab: def.tab,
      current: 1, ma50: 1, aboveMa50: false, trend: 'flat', signal: 'neutral', series: [],
    };
  }

  // Normalise to base = 1 at start
  const baseNum = common[0].price;
  const baseDen = denMap.get(common[0].date)!;
  const ratios  = common.map(p => (p.price / baseNum) / (denMap.get(p.date)! / baseDen));

  // 50-day MA
  const sma50arr = calcSMA(ratios, Math.min(50, ratios.length));
  const last      = ratios[ratios.length - 1];
  const ma50val   = sma50arr[sma50arr.length - 1] ?? last;

  // Trend
  const trend = (() => {
    if (ratios.length < 20) return 'flat' as const;
    const recent = ratios.slice(-10).reduce((a, b) => a + b, 0) / 10;
    const prior  = ratios.slice(-20, -10).reduce((a, b) => a + b, 0) / 10;
    const chg    = (recent - prior) / prior;
    return chg > 0.005 ? 'rising' as const : chg < -0.005 ? 'falling' as const : 'flat' as const;
  })();

  // Signal
  const signal = (() => {
    const aboveMA  = last > ma50val;
    const isRiskOn = def.riskOnAbove ? aboveMA : !aboveMA;
    if (isRiskOn && trend !== 'falling')  return 'risk-on'  as const;
    if (!isRiskOn && trend !== 'rising')  return 'risk-off' as const;
    return 'neutral' as const;
  })();

  // Monthly samples — last 13 months
  const monthlyPoints: RatioPoint[] = [];
  const seen = new Set<string>();
  for (let i = common.length - 1; i >= 0 && monthlyPoints.length < 13; i--) {
    const monthKey = common[i].date.slice(0, 7);
    if (!seen.has(monthKey)) {
      seen.add(monthKey);
      monthlyPoints.unshift({ date: common[i].date, value: ratios[i] });
    }
  }

  return {
    id: def.id, label: def.label, guide: def.guide, tab: def.tab,
    current: last, ma50: ma50val, aboveMa50: last > ma50val, trend, signal,
    series: monthlyPoints,
  };
}

// ─── Tab 4: Heatmap colour scale (7 bands, shared across all 4 maps) ─────────
// Used by SP500Heatmap, ETFHeatmap, ThematicHeatmap, WorldMap

export function getHeatmapColorHex(value: number): string {
  if (value >= 3)  return '#00c853';
  if (value >= 2)  return '#388e5e';
  if (value >= 1)  return '#1e4d33';
  if (value > -1)  return '#6b7280';
  if (value > -2)  return '#4d1e1e';
  if (value > -3)  return '#8e3838';
  return                   '#d32f2f';
}


export const HEATMAP_LEGEND = [
  { label: '≥ +3%',       color: '#00c853', textColor: 'white' },
  { label: '+2% to +3%',  color: '#388e5e', textColor: 'white' },
  { label: '+1% to +2%',  color: '#1e4d33', textColor: 'white' },
  { label: '-1% to +1%',  color: '#6b7280', textColor: 'white' },
  { label: '-2% to -1%',  color: '#4d1e1e', textColor: 'white' },
  { label: '-3% to -2%',  color: '#8e3838', textColor: 'white' },
  { label: '≤ -3%',       color: '#d32f2f', textColor: 'white' },
];

// ─── Tab 4: S&P 500 Top 100 tickers (hand-picked across all 11 GICS sectors) ─

export interface SP500Stock {
  ticker:    string;
  name:      string;
  sector:    string;
  marketCap: number; // relative weight for treemap sizing
}

export const SP500_TOP100: SP500Stock[] = [
  // Technology (18)
  { ticker: 'AAPL',  name: 'Apple',               sector: 'Technology',             marketCap: 3000 },
  { ticker: 'MSFT',  name: 'Microsoft',            sector: 'Technology',             marketCap: 2800 },
  { ticker: 'NVDA',  name: 'NVIDIA',               sector: 'Technology',             marketCap: 2600 },
  { ticker: 'AVGO',  name: 'Broadcom',             sector: 'Technology',             marketCap: 800  },
  { ticker: 'ORCL',  name: 'Oracle',               sector: 'Technology',             marketCap: 500  },
  { ticker: 'CRM',   name: 'Salesforce',           sector: 'Technology',             marketCap: 300  },
  { ticker: 'AMD',   name: 'AMD',                  sector: 'Technology',             marketCap: 290  },
  { ticker: 'QCOM',  name: 'Qualcomm',             sector: 'Technology',             marketCap: 200  },
  { ticker: 'TXN',   name: 'Texas Instruments',    sector: 'Technology',             marketCap: 180  },
  { ticker: 'AMAT',  name: 'Applied Materials',    sector: 'Technology',             marketCap: 160  },
  { ticker: 'INTC',  name: 'Intel',                sector: 'Technology',             marketCap: 120  },
  { ticker: 'MU',    name: 'Micron',               sector: 'Technology',             marketCap: 115  },
  { ticker: 'NOW',   name: 'ServiceNow',           sector: 'Technology',             marketCap: 200  },
  { ticker: 'LRCX',  name: 'Lam Research',         sector: 'Technology',             marketCap: 110  },
  { ticker: 'KLAC',  name: 'KLA Corp',             sector: 'Technology',             marketCap: 100  },
  { ticker: 'ADI',   name: 'Analog Devices',       sector: 'Technology',             marketCap: 100  },
  { ticker: 'SNPS',  name: 'Synopsys',             sector: 'Technology',             marketCap: 90   },
  { ticker: 'CDNS',  name: 'Cadence',              sector: 'Technology',             marketCap: 85   },
  // Communication Services (6)
  { ticker: 'GOOGL', name: 'Alphabet',             sector: 'Communication Services', marketCap: 2100 },
  { ticker: 'META',  name: 'Meta',                 sector: 'Communication Services', marketCap: 1400 },
  { ticker: 'NFLX',  name: 'Netflix',              sector: 'Communication Services', marketCap: 380  },
  { ticker: 'DIS',   name: 'Disney',               sector: 'Communication Services', marketCap: 170  },
  { ticker: 'CMCSA', name: 'Comcast',              sector: 'Communication Services', marketCap: 150  },
  { ticker: 'T',     name: 'AT&T',                 sector: 'Communication Services', marketCap: 140  },
  // Consumer Discretionary (8)
  { ticker: 'AMZN',  name: 'Amazon',               sector: 'Consumer Discretionary', marketCap: 2000 },
  { ticker: 'TSLA',  name: 'Tesla',                sector: 'Consumer Discretionary', marketCap: 800  },
  { ticker: 'HD',    name: 'Home Depot',           sector: 'Consumer Discretionary', marketCap: 360  },
  { ticker: 'MCD',   name: 'McDonald\'s',          sector: 'Consumer Discretionary', marketCap: 220  },
  { ticker: 'NKE',   name: 'Nike',                 sector: 'Consumer Discretionary', marketCap: 110  },
  { ticker: 'LOW',   name: 'Lowe\'s',              sector: 'Consumer Discretionary', marketCap: 150  },
  { ticker: 'BKNG',  name: 'Booking Holdings',    sector: 'Consumer Discretionary', marketCap: 160  },
  { ticker: 'TJX',   name: 'TJX Companies',        sector: 'Consumer Discretionary', marketCap: 130  },
  // Consumer Staples (7)
  { ticker: 'WMT',   name: 'Walmart',              sector: 'Consumer Staples',       marketCap: 700  },
  { ticker: 'PG',    name: 'Procter & Gamble',     sector: 'Consumer Staples',       marketCap: 380  },
  { ticker: 'COST',  name: 'Costco',               sector: 'Consumer Staples',       marketCap: 370  },
  { ticker: 'KO',    name: 'Coca-Cola',            sector: 'Consumer Staples',       marketCap: 270  },
  { ticker: 'PEP',   name: 'PepsiCo',              sector: 'Consumer Staples',       marketCap: 230  },
  { ticker: 'PM',    name: 'Philip Morris',        sector: 'Consumer Staples',       marketCap: 200  },
  { ticker: 'MDLZ',  name: 'Mondelez',             sector: 'Consumer Staples',       marketCap: 90   },
  // Healthcare (10)
  { ticker: 'LLY',   name: 'Eli Lilly',            sector: 'Healthcare',             marketCap: 850  },
  { ticker: 'UNH',   name: 'UnitedHealth',         sector: 'Healthcare',             marketCap: 500  },
  { ticker: 'JNJ',   name: 'Johnson & Johnson',    sector: 'Healthcare',             marketCap: 380  },
  { ticker: 'ABBV',  name: 'AbbVie',               sector: 'Healthcare',             marketCap: 320  },
  { ticker: 'MRK',   name: 'Merck',                sector: 'Healthcare',             marketCap: 280  },
  { ticker: 'TMO',   name: 'Thermo Fisher',        sector: 'Healthcare',             marketCap: 200  },
  { ticker: 'ABT',   name: 'Abbott',               sector: 'Healthcare',             marketCap: 190  },
  { ticker: 'DHR',   name: 'Danaher',              sector: 'Healthcare',             marketCap: 170  },
  { ticker: 'AMGN',  name: 'Amgen',                sector: 'Healthcare',             marketCap: 155  },
  { ticker: 'ISRG',  name: 'Intuitive Surgical',   sector: 'Healthcare',             marketCap: 145  },
  // Financials (10)
  { ticker: 'BRK-B', name: 'Berkshire Hathaway',  sector: 'Financials',             marketCap: 900  },
  { ticker: 'JPM',   name: 'JPMorgan Chase',       sector: 'Financials',             marketCap: 700  },
  { ticker: 'V',     name: 'Visa',                 sector: 'Financials',             marketCap: 580  },
  { ticker: 'MA',    name: 'Mastercard',           sector: 'Financials',             marketCap: 480  },
  { ticker: 'BAC',   name: 'Bank of America',      sector: 'Financials',             marketCap: 330  },
  { ticker: 'WFC',   name: 'Wells Fargo',          sector: 'Financials',             marketCap: 250  },
  { ticker: 'GS',    name: 'Goldman Sachs',        sector: 'Financials',             marketCap: 220  },
  { ticker: 'MS',    name: 'Morgan Stanley',       sector: 'Financials',             marketCap: 200  },
  { ticker: 'SPGI',  name: 'S&P Global',           sector: 'Financials',             marketCap: 155  },
  { ticker: 'AXP',   name: 'American Express',     sector: 'Financials',             marketCap: 200  },
  // Industrials (9)
  { ticker: 'CAT',   name: 'Caterpillar',          sector: 'Industrials',            marketCap: 200  },
  { ticker: 'RTX',   name: 'RTX Corp',             sector: 'Industrials',            marketCap: 180  },
  { ticker: 'HON',   name: 'Honeywell',            sector: 'Industrials',            marketCap: 170  },
  { ticker: 'UPS',   name: 'UPS',                  sector: 'Industrials',            marketCap: 130  },
  { ticker: 'BA',    name: 'Boeing',               sector: 'Industrials',            marketCap: 120  },
  { ticker: 'GE',    name: 'GE Aerospace',         sector: 'Industrials',            marketCap: 250  },
  { ticker: 'DE',    name: 'Deere & Co',           sector: 'Industrials',            marketCap: 115  },
  { ticker: 'LMT',   name: 'Lockheed Martin',      sector: 'Industrials',            marketCap: 110  },
  { ticker: 'ETN',   name: 'Eaton',                sector: 'Industrials',            marketCap: 130  },
  // Energy (6)
  { ticker: 'XOM',   name: 'ExxonMobil',           sector: 'Energy',                 marketCap: 520  },
  { ticker: 'CVX',   name: 'Chevron',              sector: 'Energy',                 marketCap: 290  },
  { ticker: 'COP',   name: 'ConocoPhillips',       sector: 'Energy',                 marketCap: 140  },
  { ticker: 'SLB',   name: 'SLB',                  sector: 'Energy',                 marketCap: 80   },
  { ticker: 'EOG',   name: 'EOG Resources',        sector: 'Energy',                 marketCap: 75   },
  { ticker: 'OXY',   name: 'Occidental',           sector: 'Energy',                 marketCap: 55   },
  // Materials (5)
  { ticker: 'LIN',   name: 'Linde',                sector: 'Materials',              marketCap: 220  },
  { ticker: 'APD',   name: 'Air Products',         sector: 'Materials',              marketCap: 65   },
  { ticker: 'SHW',   name: 'Sherwin-Williams',     sector: 'Materials',              marketCap: 90   },
  { ticker: 'FCX',   name: 'Freeport-McMoRan',     sector: 'Materials',              marketCap: 70   },
  { ticker: 'NEM',   name: 'Newmont',              sector: 'Materials',              marketCap: 55   },
  // Real Estate (5)
  { ticker: 'PLD',   name: 'Prologis',             sector: 'Real Estate',            marketCap: 110  },
  { ticker: 'AMT',   name: 'American Tower',       sector: 'Real Estate',            marketCap: 95   },
  { ticker: 'EQIX',  name: 'Equinix',              sector: 'Real Estate',            marketCap: 90   },
  { ticker: 'SPG',   name: 'Simon Property',       sector: 'Real Estate',            marketCap: 65   },
  { ticker: 'WELL',  name: 'Welltower',            sector: 'Real Estate',            marketCap: 65   },
  // Utilities (5)
  { ticker: 'NEE',   name: 'NextEra Energy',       sector: 'Utilities',              marketCap: 150  },
  { ticker: 'SO',    name: 'Southern Co',          sector: 'Utilities',              marketCap: 90   },
  { ticker: 'DUK',   name: 'Duke Energy',          sector: 'Utilities',              marketCap: 85   },
  { ticker: 'AEP',   name: 'AEP',                  sector: 'Utilities',              marketCap: 55   },
  { ticker: 'EXC',   name: 'Exelon',               sector: 'Utilities',              marketCap: 45   },
  // Information Technology extras to cover semiconductors/software
  { ticker: 'ACN',   name: 'Accenture',            sector: 'Technology',             marketCap: 220  },
  { ticker: 'IBM',   name: 'IBM',                  sector: 'Technology',             marketCap: 180  },
  { ticker: 'ADBE',  name: 'Adobe',                sector: 'Technology',             marketCap: 230  },
  { ticker: 'INTU',  name: 'Intuit',               sector: 'Technology',             marketCap: 180  },
];

// ─── Tab 4: ETF Category definitions ─────────────────────────────────────────

export const ETF_CATEGORIES: Record<string, Record<string, string[]>> = {
  US: {
    'US Index':             ['VOO', 'VTI', 'SPY', 'RSP', 'QQQ', 'DIA', 'IVV', 'IWB'],
    'US Large Cap - Blend': ['SCHX', 'XLG', 'FNDX', 'VV'],
    'US Large Cap - Growth':['VUG', 'IVW', 'VOOG', 'IWF', 'SCHG'],
    'US Large Cap - Value': ['VTV', 'IVE', 'VOOV', 'IWD', 'SCHV'],
    'US Mid Cap - Blend':   ['IJH', 'MDY', 'VO', 'SCHM', 'IWR'],
    'US Mid Cap - Growth':  ['IJK', 'VOT', 'IWP'],
    'US Mid Cap - Value':   ['IJJ', 'VOE', 'IWS'],
    'US Small Cap - Blend': ['IJR', 'IWM', 'VB', 'SCHA', 'IWC'],
    'US Small Cap - Growth':['IWO', 'VBK'],
    'US Small Cap - Value': ['IWN', 'VBR'],
    'US Sector':            ['XLK', 'XLE', 'XLF', 'XLY', 'XLP', 'XLV', 'XLI', 'XLB', 'XLU', 'XLRE', 'XLC', 'KRE', 'SMH', 'XRT', 'SOXX'],
    'Leverage':             ['UPRO', 'TQQQ', 'SPXL', 'SSO', 'QLD', 'SOXL', 'TNA', 'UWM'],
    'Inverse':              ['SH', 'PSQ', 'DOG', 'RWM', 'SQQQ', 'SPXS', 'TZA', 'TWM'],
    'Dividend':             ['VYM', 'SCHD', 'DVY', 'VIG', 'DGRO', 'SDY', 'HDV', 'NOBL'],
    'US Volatility':        ['VXX', 'UVXY', 'SVXY', 'VIXY'],
  },
  International: {
    'Global':                   ['VT', 'ACWI', 'URTH', 'IOO'],
    'International Developed':  ['EFA', 'VEA', 'IEFA', 'SCHF', 'EWJ', 'EWG', 'EWU'],
    'Emerging Markets':         ['EEM', 'VWO', 'IEMG', 'FXI', 'EWY', 'EWZ', 'INDA'],
  },
  Other: {
    'Commodities':      ['GLD', 'IAU', 'SLV', 'DBC', 'PDBC', 'USO', 'UNG', 'CPER', 'WEAT'],
    'Fixed Income':     ['AGG', 'BND', 'SCHZ', 'SHY', 'IEF', 'TLT', 'LQD', 'VCIT', 'VCLT', 'HYG', 'JNK', 'TIP', 'VTIP', 'MUB'],
    'Crypto':           ['BITO', 'BITI'],
    'Strategy/Factors': ['QUAL', 'RPV', 'RPG', 'MTUM', 'SPLV', 'USMV', 'ARKK', 'SIZE', 'VLUE'],
  },
};

// ─── Tab 4: Thematic ETF definitions ─────────────────────────────────────────

export const THEMATIC_ETFS: Record<string, string[]> = {
  'AI':                 ['BOTZ', 'IRBO', 'THNQ', 'AIQ', 'CHAT'],
  'Robotics':           ['ROBO', 'ROBT'],
  'Cloud':              ['SKYY', 'CLOU', 'WCLD'],
  'Semiconductors':     ['SMH', 'SOXX', 'PSI', 'XSD'],
  'Cybersecurity':      ['HACK', 'BUG', 'CIBR', 'IHAK'],
  'Software':           ['IGV', 'WCLD'],
  '5G/Telecom':         ['FIVG', 'NXTG', 'VOX'],
  'Electric Vehicles':  ['DRIV', 'KARS', 'IDRV', 'LIT'],
  'Clean Energy':       ['ICLN', 'TAN', 'QCLN', 'PBW'],
  'Space':              ['ARKX', 'UFO', 'ROKT'],
  'Genomics/Biotech':   ['ARKG', 'XBI', 'IBB', 'GNOM'],
  'Fintech':            ['ARKF', 'IPAY', 'FINX'],
  'Defense/Aerospace':  ['ITA', 'PPA', 'XAR', 'DFEN'],
  'Transportation':     ['IYT', 'XTN', 'JETS'],
  'Consumer Goods':     ['MOO', 'EBIZ', 'FTXG'],
  'Cannabis':           ['MJ', 'MSOS', 'YOLO', 'POTX'],
  'Gaming/Esports':     ['ESPO', 'GAMR', 'HERO', 'BJK'],
  'Blockchain':         ['BLOK', 'LEGR', 'BLCN'],
};

// ─── Tab 4: Country ETF definitions ──────────────────────────────────────────

export const COUNTRY_ETFS: Record<string, Record<string, string>> = {
  Americas: {
    'USA': 'SPY', 'Canada': 'EWC', 'Mexico': 'EWW', 'Brazil': 'EWZ',
    'Chile': 'ECH', 'Argentina': 'ARGT', 'Peru': 'EPU', 'Colombia': 'GXG',
  },
  Europe: {
    'UK': 'EWU', 'Germany': 'EWG', 'France': 'EWQ', 'Italy': 'EWI',
    'Spain': 'EWP', 'Switzerland': 'EWL', 'Netherlands': 'EWN', 'Belgium': 'EWK',
    'Sweden': 'EWD', 'Norway': 'NORW', 'Poland': 'EPOL', 'Austria': 'EWO',
    'Ireland': 'EIRL', 'Greece': 'GREK',
  },
  'Asia-Pacific': {
    'Japan': 'EWJ', 'China': 'FXI', 'Hong Kong': 'EWH', 'South Korea': 'EWY',
    'Taiwan': 'EWT', 'Singapore': 'EWS', 'Australia': 'EWA', 'India': 'INDA',
    'Thailand': 'THD', 'Indonesia': 'EIDO', 'Malaysia': 'EWM', 'Philippines': 'EPHE',
    'Vietnam': 'VNM', 'New Zealand': 'ENZL',
  },
  'Middle East/Africa': {
    'Israel': 'EIS', 'Turkey': 'TUR', 'UAE': 'UAE', 'Saudi Arabia': 'KSA',
    'South Africa': 'EZA', 'Egypt': 'EGPT',
  },
};

// Flat list of all unique country ETF tickers
export const ALL_COUNTRY_TICKERS: string[] = [
  ...new Set(Object.values(COUNTRY_ETFS).flatMap(region => Object.values(region)))
];

// Flat list of all unique ETF category tickers
export const ALL_ETF_CATEGORY_TICKERS: string[] = [
  ...new Set(
    Object.values(ETF_CATEGORIES).flatMap(group =>
      Object.values(group).flat()
    )
  )
];

// Flat list of all unique thematic tickers
export const ALL_THEMATIC_TICKERS: string[] = [
  ...new Set(Object.values(THEMATIC_ETFS).flat())
];

// Flat list of all SP500 tickers
export const ALL_SP500_TICKERS: string[] = SP500_TOP100.map(s => s.ticker);
