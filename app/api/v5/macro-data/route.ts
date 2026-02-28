// app/api/v5/macro-data/route.ts
// API Route for Tab 2: Macro & Yields Data with US/UK Support
// UPDATED: Added Breakeven Inflation, Credit Spread, Manufacturing, Retail Sales, House Prices

import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
import {
  fetchMultipleFREDSeries,
  getLatestFREDValue,
  US_FRED_SERIES,
  UK_FRED_SERIES,
  UK_YAHOO_GILTS,
  YIELD_CURVE_SERIES,
  MACRO_TABLE_ONLY_SERIES,
  getSeriesNames,
  calculateYoYChange
} from '@/lib/v5/fred';
import {
  transformToChartData,
  createMacroIndicator,
  calculatePercentileFromObservations,
  getLookbackStartDate
} from '@/lib/v5/yields';
import {
  RRG_CONFIGURATIONS,
  calculateRRGPosition,
  convertToWeeklyData,
  getRRGTickers
} from '@/lib/v5/rrg';

const yahooFinance = new YahooFinance();

export async function GET(request: Request) {
  try {
    // Get region parameter (default to US)
    const { searchParams } = new URL(request.url);
    const region = (searchParams.get('region') || 'US') as 'US' | 'UK';
    
    console.log(`Fetching macro data for region: ${region}`);

    // Fetch 2 years for CPI YoY calculation, but only show last 1 year on chart
    const fetchStartDate = getLookbackStartDate(2); // Need 2 years for YoY CPI
    const chartStartDate = getLookbackStartDate(1); // Only show last 1 year on chart
    const endDate = new Date().toISOString().split('T')[0];

    // 1. Fetch FRED data based on region
    console.log(`Fetching ${region} FRED series from ${fetchStartDate} to ${endDate}`);
    
    let fredData: Record<string, any[]>;
    
    if (region === 'US') {
      fredData = await fetchMultipleFREDSeries(US_FRED_SERIES, fetchStartDate, endDate);
      
      // Transform CPI from index to YoY % change
      if (fredData.cpi && fredData.cpi.length > 0) {
        fredData.cpi = calculateYoYChange(fredData.cpi);
        console.log('✓ Transformed US CPI to YoY % change');
      }
      
    } else {
      // UK: Fetch limited FRED series
      fredData = await fetchMultipleFREDSeries(UK_FRED_SERIES, fetchStartDate, endDate);
      
      // Transform CPI from index to YoY % change
      if (fredData.cpi && fredData.cpi.length > 0) {
        fredData.cpi = calculateYoYChange(fredData.cpi);
        console.log('✓ Transformed UK CPI to YoY % change');
      }
      
      // Skip UK Gilts from Yahoo Finance for now - data sources unreliable
      console.log('Skipping UK 2Y, 5Y, 30Y yields (no reliable data source)...');
      fredData.yield_2y = [];
      fredData.yield_5y = [];
      fredData.yield_30y = [];
      
      // Use UK 3M yield as policy rate proxy
      console.log('Checking UK 3M yield for policy rate proxy...');
      if (fredData.yield_3m && fredData.yield_3m.length > 0) {
        fredData.policy_rate = fredData.yield_3m;
        console.log(`✓ Using UK 3M yield as policy rate proxy from FRED`);
      } else {
        console.log('UK 3M not available from FRED, calculating 3M yield from CSH2.L...');
        try {
          const fourMonthsAgo = new Date();
          fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);
          
          const csh2History = await yahooFinance.historical('CSH2.L', {
            period1: fourMonthsAgo.toISOString().split('T')[0],
            period2: endDate,
            interval: '1d'
          });
          
          if (csh2History && csh2History.length >= 60) {
            const daysAvailable = csh2History.length - 1;
            const lookbackDays = Math.min(90, daysAvailable);
            
            const currentPrice = csh2History[csh2History.length - 1].adjClose ?? csh2History[csh2History.length - 1].close;
            const priceNDaysAgo = csh2History[csh2History.length - 1 - lookbackDays].adjClose ?? csh2History[csh2History.length - 1 - lookbackDays].close;
            
            if (currentPrice && priceNDaysAgo && currentPrice > 0 && priceNDaysAgo > 0) {
              const threeMonthReturn = (currentPrice - priceNDaysAgo) / priceNDaysAgo;
              const annualizedYield = (threeMonthReturn * (365 / lookbackDays)) * 100;
              
              console.log(`CSH2.L 3M calculation: Current=${currentPrice.toFixed(2)}, ${lookbackDays}d ago=${priceNDaysAgo.toFixed(2)}, Annualized=${annualizedYield.toFixed(2)}%`);
              
              const startDateObj = new Date(fetchStartDate);
              const endDateObj = new Date(endDate);
              const syntheticData: Array<{ date: string; value: string }> = [];
              
              for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 7)) {
                syntheticData.push({
                  date: d.toISOString().split('T')[0],
                  value: annualizedYield.toFixed(2)
                });
              }
              
              fredData.yield_3m = syntheticData;
              fredData.policy_rate = syntheticData;
              console.log(`✓ Using CSH2.L calculated yield as UK 3M proxy: ${annualizedYield.toFixed(2)}%`);
            } else {
              console.warn(`✗ Invalid prices from CSH2.L`);
              fredData.yield_3m = [];
              fredData.policy_rate = [];
            }
          } else {
            console.warn(`✗ Not enough CSH2.L historical data (got ${csh2History?.length || 0} days, need 60+)`);
            fredData.yield_3m = [];
            fredData.policy_rate = [];
          }
        } catch (error) {
          console.error('Error calculating 3M yield from CSH2.L:', error);
          fredData.yield_3m = [];
          fredData.policy_rate = [];
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Calculate UK spreads and real rate
      console.log('Calculating UK spreads and real rate...');
      
      if (fredData.yield_10y && fredData.yield_3m && fredData.yield_3m.length > 0) {
        fredData.spread_10y3m = calculateSpread(fredData.yield_10y, fredData.yield_3m);
        console.log('✓ Calculated UK 10Y-3M spread');
      } else {
        fredData.spread_10y3m = [];
        console.warn('✗ Cannot calculate UK 10Y-3M spread (missing data)');
      }
      
      fredData.spread_10y2y = [];
      
      if (fredData.yield_10y && fredData.cpi && fredData.cpi.length > 0) {
        const realRate = calculateSpread(fredData.yield_10y, fredData.cpi);
        fredData.real_rate = realRate;
        console.log('✓ Calculated UK real rate (10Y - CPI)');
      } else {
        fredData.real_rate = [];
        console.warn('✗ Cannot calculate UK real rate (missing data)');
      }
      
      // NEW - Calculate UK Credit Spread (IHYG.L / IGLT.L ratio)
      console.log('Calculating UK Credit Spread from Yahoo Finance...');
      try {
        const ihygQuote = await yahooFinance.quote('IHYG.L');
        const igltQuote = await yahooFinance.quote('IGLT.L');
        
        if (ihygQuote.regularMarketPrice && igltQuote.regularMarketPrice) {
          const spreadRatio = (ihygQuote.regularMarketPrice / igltQuote.regularMarketPrice) * 100;
          
          const spreadData: Array<{ date: string; value: string }> = [];
          const startDateObj = new Date(fetchStartDate);
          const endDateObj = new Date(endDate);
          
          for (let d = new Date(startDateObj); d <= endDateObj; d.setDate(d.getDate() + 7)) {
            spreadData.push({
              date: d.toISOString().split('T')[0],
              value: spreadRatio.toFixed(4)
            });
          }
          
          fredData.credit_spread = spreadData;
          console.log(`✓ Calculated UK Credit Spread: ${spreadRatio.toFixed(2)}`);
        } else {
          console.warn('✗ Could not fetch IHYG.L or IGLT.L prices');
          fredData.credit_spread = [];
        }
      } catch (error) {
        console.error('Error calculating UK Credit Spread:', error);
        fredData.credit_spread = [];
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // 2. Transform yield curve data for chart
    const yieldCurveSeriesData: Record<string, any[]> = {};
    
    YIELD_CURVE_SERIES.forEach(seriesKey => {
      if (seriesKey === 'real_rate') return;
      
      let dataKey: string = seriesKey;
      if (seriesKey === 'policy_rate') {
        dataKey = region === 'US' ? 'fed_funds' : 'policy_rate';
      }
      
      if (fredData[dataKey] && fredData[dataKey].length > 0) {
        yieldCurveSeriesData[seriesKey] = fredData[dataKey];
      }
    });

    if (fredData.real_rate && fredData.real_rate.length > 0) {
      yieldCurveSeriesData.real_rate = fredData.real_rate;
    }
    
    ['breakeven_10y', 'credit_spread', 'manufacturing', 'retail_sales', 'house_prices'].forEach(key => {
      if (fredData[key] && fredData[key].length > 0) {
        yieldCurveSeriesData[key] = fredData[key];
      }
    });

    const allYieldCurveData = transformToChartData(yieldCurveSeriesData);
    const yieldCurveData = allYieldCurveData.filter(d => d.date >= chartStartDate);

    // 3. Get latest values and calculate percentiles
    const macroIndicators: Record<string, any> = {};
    const seriesNames = getSeriesNames(region);

    for (const [key, observations] of Object.entries(fredData)) {
      if (!observations || observations.length === 0) continue;
      
      const latestObs = observations[observations.length - 1];
      const currentValue = latestObs ? parseFloat(latestObs.value) : null;
      const percentile = calculatePercentileFromObservations(currentValue, observations);

      let statusType: 'u-shaped' | 'linear-high-bad' | 'linear-high-good' | 'spread';
      
      if (key.includes('spread') || key === 'credit_spread') {
        statusType = 'spread';
      } else if (key.includes('cpi') || key.includes('unemployment')) {
        statusType = 'linear-high-bad';
      } else if (key.includes('m2') || key === 'manufacturing' || 
                 key === 'retail_sales' || key === 'house_prices') {
        statusType = 'linear-high-good';
      } else if (key === 'breakeven_10y') {
        statusType = 'u-shaped';
      } else {
        statusType = 'u-shaped';
      }

      let note: string | undefined = undefined;
      if (region === 'UK') {
        if (key === 'yield_3m') {
          note = 'UK SONIA rate from FRED (Sterling Overnight Index Average)';
        } else if (key === 'policy_rate') {
          note = 'Approximated using UK SONIA rate (~BOE base rate)';
        } else if (key === 'spread_10y3m') {
          note = 'Calculated: UK 10Y (FRED) minus UK SONIA';
        } else if (key === 'real_rate') {
          note = 'Calculated: UK 10Y yield minus UK CPI YoY%';
        } else if (key === 'credit_spread') {
          note = 'Calculated: IHYG.L / IGLT.L ratio from Yahoo Finance';
        }
      }

      const displayName = seriesNames[key] || key;
      macroIndicators[key] = createMacroIndicator(
        displayName,
        currentValue,
        percentile,
        statusType,
        currentValue,
        note
      );
    }

    // 4. Fetch market indicators from Yahoo Finance
    console.log('Fetching market indicators...');
    const marketIndicatorAssets = {
      dxy: { ticker: 'DX-Y.NYB', name: 'US Dollar Index' },
      gold: { ticker: 'GC=F', name: 'Gold' },
      oil: { ticker: 'CL=F', name: 'WTI Crude Oil' }
    };

    const marketIndicatorData: Record<string, any> = {};

    for (const [key, { ticker, name }] of Object.entries(marketIndicatorAssets)) {
      try {
        const quote = await yahooFinance.quote(ticker);
        const current = quote.regularMarketPrice;

        if (!current) {
          throw new Error(`No price data for ${ticker}`);
        }

        const history = await yahooFinance.historical(ticker, {
          period1: fetchStartDate,
          period2: endDate,
          interval: '1d'
        });

        if (!history || history.length === 0) {
          throw new Error(`No historical data for ${ticker}`);
        }

        const historicalPrices = history.map(h => h.adjClose ?? h.close).filter(p => p !== null && p !== undefined);
        const percentile = calculatePercentileFromObservations(current, historicalPrices);

        marketIndicatorData[key] = createMacroIndicator(
          name,
          current,
          percentile,
          'linear-high-good',
          current
        );

        console.log(`✓ Fetched ${name}: ${current}`);
      } catch (error) {
        console.error(`✗ Error fetching ${ticker}:`, error instanceof Error ? error.message : error);
        marketIndicatorData[key] = createMacroIndicator(name, null, 0, 'linear-high-good', null);
      }

      await new Promise(resolve => setTimeout(resolve, 200));
    }

    if (region === 'UK') {
      console.log('Fetching US M2 for UK mode...');
      try {
        const usM2Data = await fetchMultipleFREDSeries({ m2: 'M2SL' }, fetchStartDate, endDate);
        if (usM2Data.m2 && usM2Data.m2.length > 0) {
          const latestM2 = usM2Data.m2[usM2Data.m2.length - 1];
          const currentValue = parseFloat(latestM2.value);
          const percentile = calculatePercentileFromObservations(currentValue, usM2Data.m2);
          macroIndicators.m2 = createMacroIndicator(
            'M2 Money Supply (US)',
            currentValue,
            percentile,
            'linear-high-good',
            currentValue
          );
          console.log('✓ Fetched US M2 for UK mode');
        }
      } catch (error) {
        console.error('Error fetching US M2 for UK mode:', error);
        macroIndicators.m2 = createMacroIndicator('M2 Money Supply (US)', null, 0, 'linear-high-good', null);
      }
    }

    // 5. Calculate RRG positions
    console.log('Calculating RRG positions...');
    const rrgData: Record<string, any> = {};

    for (const view of ['sectors', 'factors', 'global'] as const) {
      const config = RRG_CONFIGURATIONS[view];
      const tickers = getRRGTickers(view);

      const eighteenMonthsAgo = new Date();
      eighteenMonthsAgo.setMonth(eighteenMonthsAgo.getMonth() - 20);

      const priceData: Record<string, { dates: string[]; prices: number[] }> = {};

      console.log(`Fetching ${view} RRG data...`);

      for (const ticker of tickers) {
        try {
          const history = await yahooFinance.historical(ticker, {
            period1: eighteenMonthsAgo.toISOString().split('T')[0],
            period2: endDate,
            interval: '1d'
          });

          if (!history || history.length < 160) {
            console.warn(`✗ Not enough data for ${ticker} (got ${history?.length || 0} days, need 160+)`);
            continue;
          }

          const dailyData = history
            .map(h => ({
              date: h.date.toISOString().split('T')[0],
              close: h.adjClose ?? h.close
            }))
            .filter(d => d.close !== null && d.close !== undefined && !isNaN(d.close));

          if (dailyData.length < 160) {
            console.warn(`✗ Not enough valid data for ${ticker} after filtering`);
            continue;
          }

          const weeklyData = convertToWeeklyData(dailyData);
          
          if (weeklyData.prices.length < 40) {
            console.warn(`✗ Not enough weekly data for ${ticker} (got ${weeklyData.prices.length} weeks, need 40+)`);
            continue;
          }

          priceData[ticker] = weeklyData;
          console.log(`✓ Fetched ${ticker}: ${weeklyData.prices.length} weeks of data`);

          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
          console.error(`✗ Error fetching ${ticker} for RRG:`, error instanceof Error ? error.message : error);
        }
      }

      const positions = [];
      const benchmarkData = priceData[config.benchmark];

      if (!benchmarkData || benchmarkData.prices.length < 40) {
        console.error(`✗ Insufficient benchmark (${config.benchmark}) data for ${view} RRG`);
        rrgData[view] = {
          name: config.name,
          benchmark: config.benchmark,
          positions: [],
          error: 'Insufficient benchmark data'
        };
        continue;
      }

      const benchmarkPrices = benchmarkData.prices;
      console.log(`Using ${config.benchmark} as benchmark: ${benchmarkPrices.length} weeks`);

      for (const etf of config.etfs) {
        const etfData = priceData[etf.ticker];
        
        if (!etfData || etfData.prices.length < 40) {
          console.warn(`✗ Skipping ${etf.ticker} - insufficient data`);
          continue;
        }

        const minLength = Math.min(etfData.prices.length, benchmarkPrices.length);
        const etfPrices = etfData.prices.slice(-minLength);
        const alignedBenchmarkPrices = benchmarkPrices.slice(-minLength);
        
        if (etfPrices.length < 40 || alignedBenchmarkPrices.length < 40) {
          console.warn(`✗ Skipping ${etf.ticker} - not enough aligned data (${etfPrices.length} points)`);
          continue;
        }

        const position = calculateRRGPosition(
          etfPrices,
          alignedBenchmarkPrices,
          etf.ticker,
          etf.name,
          etf.type || '',
          13
        );
        
        if (position) {
          positions.push(position);
          console.log(`✓ RRG position for ${etf.ticker}: Ratio=${position.rsRatio.toFixed(2)}, Momentum=${position.rsMomentum.toFixed(2)}, Quadrant=${position.quadrant}`);
        } else {
          console.warn(`✗ Failed to calculate RRG position for ${etf.ticker}`);
        }
      }

      rrgData[view] = {
        name: config.name,
        benchmark: config.benchmark,
        positions
      };

      console.log(`${view} RRG complete: ${positions.length}/${config.etfs.length} positions calculated`);
    }

    // 6. Assemble response
    const response = {
      region,
      yieldCurve: {
        data: yieldCurveData,
        series: YIELD_CURVE_SERIES
      },
      macroTable: {
        fred: macroIndicators,
        marketIndicators: marketIndicatorData
      },
      rrg: rrgData,
      timestamp: new Date().toISOString()
    };

    console.log('Macro data fetch complete');
    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in macro-data API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch macro data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function calculateSpread(
  series1: Array<{ date: string; value: string }>,
  series2: Array<{ date: string; value: string }>
): Array<{ date: string; value: string }> {
  const spread: Array<{ date: string; value: string }> = [];
  
  const series2Map = new Map(series2.map(obs => [obs.date, parseFloat(obs.value)]));
  
  series1.forEach(obs1 => {
    const val1 = parseFloat(obs1.value);
    const val2 = series2Map.get(obs1.date);
    
    if (val2 !== undefined && !isNaN(val1) && !isNaN(val2)) {
      spread.push({
        date: obs1.date,
        value: (val1 - val2).toFixed(4)
      });
    }
  });
  
  return spread;
}