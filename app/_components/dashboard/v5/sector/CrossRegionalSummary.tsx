'use client';

// app/_components/dashboard/v5/sector/CrossRegionalSummary.tsx
// Synthesises C/D ratio signals across US, World and EU into a readable summary

import { CDRatioData } from '@/lib/v5/sectors';

interface CrossRegionalSummaryProps {
  us:    CDRatioData;
  world: CDRatioData;
  eu:    CDRatioData;
}

// ─── Signal helpers ───────────────────────────────────────────────────────────

type Signal = 'strong-risk-on' | 'risk-on' | 'neutral' | 'risk-off' | 'strong-risk-off';

function regionSignal(data: CDRatioData): Signal {
  let score = 0;
  if (data.current > 1)      score += 1;
  if (data.above50MA)        score += 1;
  if (data.above200MA)       score += 1;
  if (data.trend === 'rising')  score += 1;
  if (data.trend === 'falling') score -= 1;
  if (data.current < 1)      score -= 1;
  if (!data.above50MA)       score -= 0.5;
  if (!data.above200MA)      score -= 0.5;

  if (score >= 3)  return 'strong-risk-on';
  if (score >= 1)  return 'risk-on';
  if (score <= -3) return 'strong-risk-off';
  if (score <= -1) return 'risk-off';
  return 'neutral';
}

function signalLabel(s: Signal): string {
  switch (s) {
    case 'strong-risk-on':  return 'Strong Risk-On';
    case 'risk-on':         return 'Risk-On';
    case 'neutral':         return 'Neutral';
    case 'risk-off':        return 'Risk-Off';
    case 'strong-risk-off': return 'Strong Risk-Off';
  }
}

function signalColor(s: Signal): string {
  switch (s) {
    case 'strong-risk-on':  return 'bg-green-100 text-green-800';
    case 'risk-on':         return 'bg-green-50 text-green-700';
    case 'neutral':         return 'bg-yellow-50 text-yellow-700';
    case 'risk-off':        return 'bg-red-50 text-red-700';
    case 'strong-risk-off': return 'bg-red-100 text-red-800';
  }
}

function signalDot(s: Signal): string {
  switch (s) {
    case 'strong-risk-on':  return 'bg-green-500';
    case 'risk-on':         return 'bg-green-400';
    case 'neutral':         return 'bg-yellow-400';
    case 'risk-off':        return 'bg-red-400';
    case 'strong-risk-off': return 'bg-red-500';
  }
}

function trendLabel(t: 'rising' | 'falling' | 'flat'): string {
  if (t === 'rising')  return '↑ Rising';
  if (t === 'falling') return '↓ Falling';
  return '→ Flat';
}

function trendColor(t: 'rising' | 'falling' | 'flat'): string {
  if (t === 'rising')  return 'text-green-600';
  if (t === 'falling') return 'text-red-500';
  return 'text-slate-400';
}

// ─── Summary text generator ───────────────────────────────────────────────────

function generateSummary(
  usSignal:    Signal,
  worldSignal: Signal,
  euSignal:    Signal,
  us:          CDRatioData,
  world:       CDRatioData,
  eu:          CDRatioData,
): { headline: string; detail: string; tone: 'positive' | 'negative' | 'mixed' | 'neutral' } {
  const signals = [usSignal, worldSignal, euSignal];
  const riskOnCount  = signals.filter(s => s === 'risk-on' || s === 'strong-risk-on').length;
  const riskOffCount = signals.filter(s => s === 'risk-off' || s === 'strong-risk-off').length;
  const neutralCount = signals.filter(s => s === 'neutral').length;

  const allRisingTrend  = [us, world, eu].every(d => d.trend === 'rising');
  const allFallingTrend = [us, world, eu].every(d => d.trend === 'falling');
  const allAbove200     = [us, world, eu].every(d => d.above200MA);
  const allBelow200     = [us, world, eu].every(d => !d.above200MA);
  const usLeading       = (usSignal === 'strong-risk-on' || usSignal === 'risk-on') &&
                          (worldSignal === 'risk-off' || worldSignal === 'neutral') &&
                          (euSignal === 'risk-off' || euSignal === 'neutral');
  const euLeading       = (euSignal === 'strong-risk-on' || euSignal === 'risk-on') &&
                          (usSignal === 'risk-off' || usSignal === 'neutral');

  // All three risk-on
  if (riskOnCount === 3) {
    if (allRisingTrend) {
      return {
        headline: 'Global cyclical leadership — broad risk-on rotation',
        detail:   'Cyclicals are outperforming defensives across all three regions with rising momentum. ' +
                  'This is a broad-based expansion signal suggesting investor confidence is high globally. ' +
                  (allAbove200 ? 'All regions are above their 200-day MA, confirming a well-established trend.' :
                  'Watch for confirmation from 200-day MA crossovers to validate the longer-term trend.'),
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

  // All three risk-off
  if (riskOffCount === 3) {
    if (allFallingTrend) {
      return {
        headline: 'Global defensive rotation — risk-off across all regions',
        detail:   'Defensive sectors are leading cyclicals in all three regions with falling momentum in the ' +
                  'ratio. This is a broad-based risk-off signal, consistent with late-cycle or contraction ' +
                  'conditions. ' + (allBelow200
                    ? 'All regions are trading below their 200-day MA, suggesting this is a structural rather than temporary shift.'
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

  // US leading, others lagging
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

  // Europe leading
  if (euLeading) {
    return {
      headline: 'European cyclicals showing relative strength',
      detail:   'European sectors are exhibiting cyclical leadership while the US and/or World signals remain ' +
                'more cautious. This could reflect European fiscal stimulus, currency dynamics, or a rotation ' +
                'toward cheaper international markets.',
      tone: 'mixed',
    };
  }

  // Two risk-on, one risk-off
  if (riskOnCount === 2 && riskOffCount === 1) {
    const laggard = euSignal === 'risk-off' ? 'Europe'
                  : worldSignal === 'risk-off' ? 'World'
                  : 'the US';
    return {
      headline: 'Broadly risk-on with one region lagging',
      detail:   `Two of three regions show cyclical leadership, suggesting a generally constructive environment for risk assets. ` +
                `${laggard} is the outlier showing defensive rotation — worth monitoring whether this spreads or resolves. ` +
                (allRisingTrend ? 'Momentum is rising across all regions.' : ''),
      tone: 'positive',
    };
  }

  // Two risk-off, one risk-on
  if (riskOffCount === 2 && riskOnCount === 1) {
    const leader = usSignal === 'risk-on' || usSignal === 'strong-risk-on' ? 'the US'
                 : euSignal === 'risk-on' || euSignal === 'strong-risk-on' ? 'Europe'
                 : 'World';
    return {
      headline: 'Predominantly defensive — one region holding cyclical strength',
      detail:   `Defensives are leading in two of three regions, suggesting a broadly cautious market environment. ` +
                `${leader} is showing relative cyclical resilience, but the broader weight of evidence leans risk-off. ` +
                'Consider whether the outlier region is leading a turn or simply lagging the global trend.',
      tone: 'negative',
    };
  }

  // Mixed with neutrals
  if (neutralCount >= 2) {
    return {
      headline: 'Cross-regional signals inconclusive — wait for confirmation',
      detail:   'The cyclical/defensive ratios across regions are not showing a clear directional bias. ' +
                'Markets may be in a transitional phase between risk-on and risk-off. ' +
                'Watch for trend confirmation from moving average crossovers before drawing conclusions.',
      tone: 'neutral',
    };
  }

  // One of each
  return {
    headline: 'Mixed signals — regional divergence in cyclical leadership',
    detail:   'Cyclical and defensive leadership varies significantly by region, suggesting a fragmented ' +
              'global market environment. ' +
              (us.trend !== world.trend
                ? 'Momentum trends are also diverging, which typically precedes a resolution in one direction. '
                : '') +
              'A unified global signal has yet to emerge.',
    tone: 'mixed',
  };
}

// ─── Tone styling ─────────────────────────────────────────────────────────────

function toneBorder(tone: 'positive' | 'negative' | 'mixed' | 'neutral'): string {
  switch (tone) {
    case 'positive': return 'border-l-4 border-green-400 bg-green-50';
    case 'negative': return 'border-l-4 border-red-400 bg-red-50';
    case 'mixed':    return 'border-l-4 border-orange-400 bg-orange-50';
    case 'neutral':  return 'border-l-4 border-slate-300 bg-slate-50';
  }
}

function toneHeadlineColor(tone: 'positive' | 'negative' | 'mixed' | 'neutral'): string {
  switch (tone) {
    case 'positive': return 'text-green-800';
    case 'negative': return 'text-red-800';
    case 'mixed':    return 'text-orange-800';
    case 'neutral':  return 'text-slate-700';
  }
}

function toneDetailColor(tone: 'positive' | 'negative' | 'mixed' | 'neutral'): string {
  switch (tone) {
    case 'positive': return 'text-green-700';
    case 'negative': return 'text-red-700';
    case 'mixed':    return 'text-orange-700';
    case 'neutral':  return 'text-slate-600';
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CrossRegionalSummary({ us, world, eu }: CrossRegionalSummaryProps) {
  const usSignal    = regionSignal(us);
  const worldSignal = regionSignal(world);
  const euSignal    = regionSignal(eu);

  const { headline, detail, tone } = generateSummary(
    usSignal, worldSignal, euSignal, us, world, eu,
  );

  const regions = [
    { label: 'US Market', data: us,    signal: usSignal    },
    { label: 'World',     data: world, signal: worldSignal },
    { label: 'Europe',    data: eu,    signal: euSignal     },
  ];

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900 mb-1">
        Cross-Regional Analysis
      </h2>
      <p className="text-xs text-slate-400 mb-5">
        Synthesis of cyclical vs defensive sector leadership across US, World and Europe.
      </p>

      {/* Summary block */}
      <div className={`rounded-lg px-5 py-4 mb-5 ${toneBorder(tone)}`}>
        <p className={`text-sm font-bold mb-1.5 ${toneHeadlineColor(tone)}`}>
          {headline}
        </p>
        <p className={`text-xs leading-relaxed ${toneDetailColor(tone)}`}>
          {detail}
        </p>
      </div>

      {/* Three region signal rows */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {regions.map(({ label, data, signal }) => (
          <div
            key={label}
            className="bg-slate-50 rounded-lg px-4 py-3 flex flex-col gap-2"
          >
            {/* Region + signal badge */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">{label}</span>
              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${signalColor(signal)}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${signalDot(signal)}`} />
                {signalLabel(signal)}
              </span>
            </div>

            {/* Stats row */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">
                Ratio <span className="font-semibold text-slate-700 tabular-nums">
                  {data.current.toFixed(4)}
                </span>
              </span>
              <span className={`font-medium ${trendColor(data.trend)}`}>
                {trendLabel(data.trend)}
              </span>
            </div>

            {/* MA status */}
            <div className="flex gap-2">
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium
                ${data.above50MA ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                {data.above50MA ? '▲' : '▼'} 50MA
              </span>
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium
                ${data.above200MA ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                {data.above200MA ? '▲' : '▼'} 200MA
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
