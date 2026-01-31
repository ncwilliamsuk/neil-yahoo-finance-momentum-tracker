import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

import { tickers } from "../app/data/etfs";

async function testTicker(ticker: string) {
  try {
    const quote = await yahooFinance.quote(ticker);
    console.log(`✅ ${ticker}: ${quote.shortName || quote.longName || "OK"}`);
    return { ticker, valid: true, name: quote.shortName || quote.longName };
  } catch (error: any) {
    console.log(`❌ ${ticker}: ${error.message}`);
    return { ticker, valid: false, error: error.message };
  }
}

async function testAllTickers() {
  console.log(`Testing ${tickers.length} tickers...\n`);

  const results = [];
  for (const ticker of tickers) {
    const result = await testTicker(ticker);
    results.push(result);
    await new Promise((resolve) => setTimeout(resolve, 100)); // Rate limit
  }

  const valid = results.filter((r) => r.valid);
  const invalid = results.filter((r) => !r.valid);

  console.log(`\n\n=== SUMMARY ===`);
  console.log(`Valid: ${valid.length}/${tickers.length}`);
  console.log(`Invalid: ${invalid.length}/${tickers.length}`);

  if (invalid.length > 0) {
    console.log(`\n=== INVALID TICKERS ===`);
    invalid.forEach((r) => console.log(`${r.ticker}`));
  }
}

testAllTickers();
