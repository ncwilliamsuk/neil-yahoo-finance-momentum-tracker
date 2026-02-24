// app/api/v5/breadth-data/route.ts
// On-demand route for S&P 500 breadth — fetches full year for all 500 stocks.
// Called only when user clicks "Load Breadth Data" on Tab 1.
// Returns 20/50/200 DMA breadth + new highs/lows across 1M/3M/6M/12M.

import { NextResponse }          from 'next/server';
import { calculateSP500Breadth } from '@/lib/v5/breadth';

export const dynamic    = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET() {
  try {
    console.log('=== Fetching S&P 500 breadth (on demand) ===');
    const breadth = await calculateSP500Breadth();
    console.log('=== Breadth fetch complete ===');

    return NextResponse.json({
      // Legacy fields
      percentage: breadth.percentage,
      above:      breadth.above,
      total:      breadth.total,
      status:     breadth.status.label,
      color:      breadth.status.color,
      // New fields
      dma:        breadth.dma,
      hiLo:       breadth.hiLo,
      adLine:     breadth.adLine,
      summary:    breadth.summary,
      timestamp:  new Date().toISOString(),
    });
  } catch (error) {
    console.error('Breadth data fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch breadth data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}