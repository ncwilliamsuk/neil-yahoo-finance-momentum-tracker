import { NextResponse } from "next/server";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

const tickers = [
  "CSPX.L",
  "VUSA.L",
  "VWRL.L",
  "VUKE.L",
  "EQQQ.L",
  "SGLN.L",
  "VFEM.L",
  "DAGB.L",
  "SMGB.L",
  "IWMO.L",
];

export async function GET() {
  try {
    // Fetch VIX data
    let vixData = null;
    try {
      const vixHistorical = await yahooFinance.historical("^VIX", {
        period1: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        period2: new Date().toISOString().split("T")[0],
        interval: "1d",
      });

      if (vixHistorical && vixHistorical.length >= 2) {
        const latestVix = vixHistorical[vixHistorical.length - 1].close;
        const prevVix = vixHistorical[vixHistorical.length - 2].close;
        const vixChange = ((latestVix - prevVix) / prevVix) * 100;

        vixData = {
          price: latestVix.toFixed(2),
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

          const historical = await yahooFinance.historical(ticker, {
            period1: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
              .toISOString()
              .split("T")[0],
            period2: new Date().toISOString().split("T")[0],
            interval: "1d",
          });

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
