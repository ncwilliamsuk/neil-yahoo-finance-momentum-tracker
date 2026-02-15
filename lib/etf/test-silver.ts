// lib/etf/test-silver.ts
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

async function testSilver() {
  try {
    console.log('Testing SSLN.L (Silver) with ADJUSTED CLOSE...\n');
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 365);
    
    const result = await yahooFinance.historical('SSLN.L', {
      period1: startDate,
      period2: endDate,
      interval: '1d'
    });
    
    // Use adjClose instead of close
    const adjClosePrices = result.map(day => day.adjClose ?? day.close);
    
    console.log('Total days:', result.length);
    console.log('\nFirst 5 days (ADJUSTED):');
    result.slice(0, 5).forEach((day, i) => {
      const adjClose = adjClosePrices[i];
      console.log(day.date.toISOString().split('T')[0], 
                  'Close:', day.close.toFixed(2), 
                  'AdjClose:', adjClose.toFixed(2));
    });
    
    console.log('\nLast 5 days (ADJUSTED):');
    result.slice(-5).forEach((day, i) => {
      const adjClose = adjClosePrices[adjClosePrices.length - 5 + i];
      console.log(day.date.toISOString().split('T')[0], 
                  'Close:', day.close.toFixed(2), 
                  'AdjClose:', adjClose.toFixed(2));
    });
    
    const currentPrice = adjClosePrices[adjClosePrices.length - 1];
    const price1YearAgo = adjClosePrices[0];
    const return1Y = ((currentPrice - price1YearAgo) / price1YearAgo) * 100;
    
    console.log('\nCalculation using ADJUSTED CLOSE:');
    console.log('Current adj price:', currentPrice.toFixed(2));
    console.log('1 year ago adj price:', price1YearAgo.toFixed(2));
    console.log('1Y return:', return1Y.toFixed(2) + '%');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testSilver();