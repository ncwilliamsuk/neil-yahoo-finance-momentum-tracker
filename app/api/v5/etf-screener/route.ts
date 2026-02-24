// app/api/v5/etf-screener/route.ts
// API route for Tab 5 ETF Screener
//
// Query params:
//   ?universe=core      — fetches CORE_ETF_LIST (115 ETFs, default)
//   ?universe=extended  — fetches EXTENDED_ETF_LIST (~800 ETFs, longer load time)
//
// Response shape:
//   {
//     success:      boolean,
//     data:         Record<cleanTicker, marketData>,
//     universe:     'core' | 'extended',
//     etfCount:     number,
//     successCount: number,
//     failCount:    number,
//     soniaRate:    number,
//     soniaSource:  string,
//     timestamp:    string,
//   }

import { NextResponse }      from 'next/server';
import { getETFList }        from '@/lib/v5/etfList';
import { fetchAllETFData }   from '@/lib/v5/etfFetcher';
import { Universe }          from '@/lib/v5/etfTypes';

// V5 critical exports — force dynamic, no caching
export const dynamic    = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const universeParam    = searchParams.get('universe') ?? 'core';

    // Validate universe param
    const universe: Universe = universeParam === 'extended' ? 'extended' : 'core';

    const etfList = getETFList(universe);
    const tickers = etfList.map(etf => etf.ticker);

    console.log(`\n── ETF Screener API ────────────────────────────`);
    console.log(`Universe: ${universe} (${tickers.length} ETFs)`);

    const { data, soniaRate, soniaSource, successCount, failCount } =
      await fetchAllETFData(tickers);

    return NextResponse.json({
      success:      true,
      data,
      universe,
      etfCount:     tickers.length,
      successCount,
      failCount,
      soniaRate,
      soniaSource,
      timestamp:    new Date().toISOString(),
    });

  } catch (error) {
    console.error('ETF Screener API error:', error);
    return NextResponse.json(
      {
        success: false,
        error:   error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}