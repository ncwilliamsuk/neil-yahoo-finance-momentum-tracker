import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";
import { tickers } from "../../data/etfs";

const yahooFinance = new YahooFinance();

export async function GET() {
  try {
    // Fetch VIX data
    let vixData = null;
    try {
      const vixChart = await yahooFinance.chart("^VIX", {
        period1: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        period2: new Date(),
        interval: "1d",
      });

      if (vixChart?.quotes && vixChart.quotes.length >= 2) {
        const quotes = vixChart.quotes;
        const latestVix = quotes[quotes.length - 1].close;
        const prevVix = quotes[quotes.length - 2].close;
        const vixChange = ((latestVix! - prevVix!) / prevVix!) * 100;

        vixData = {
          price: latestVix!.toFixed(2),
          change: vixChange.toFixed(2),
        };
      }
    } catch (error) {
      console.error("VIX fetch error:", error);
    }

    // Fetch ETF data
    const results = await Promise.all(
      tickers.map(async (ticker) => {
        try {
          const quote = await yahooFinance.quote(ticker);

          // Use chart instead of historical
          const chartData = await yahooFinance.chart(ticker, {
            period1: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
            period2: new Date(),
            interval: "1d",
          });

          // Convert chart data to historical format for compatibility
          const historical = chartData.quotes.map((q) => ({
            date: q.date,
            open: q.open,
            high: q.high,
            low: q.low,
            close: q.close,
            adjClose: q.adjclose || q.close,
            volume: q.volume,
          }));

          return { ticker, quote, historical, error: null };
        } catch (err: any) {
          console.error(`Error fetching ${ticker}:`, err);
          return { ticker, quote: null, historical: null, error: err.message };
        }
      }),
    );

    return NextResponse.json({ vix: vixData, etfs: results });
  } catch (error: any) {
    console.error("API route error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch data",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
