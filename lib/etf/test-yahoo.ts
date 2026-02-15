// lib/etf/test-yahoo.ts
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

async function testYahoo() {
  try {
    console.log('Testing Yahoo Finance...');
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    const result = await yahooFinance.historical('VUKG.L', {
      period1: startDate,
      period2: endDate,
      interval: '1d'
    });
    
    console.log('Success! Got', result.length, 'days of data');
    console.log('Latest close:', result[result.length - 1].close);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testYahoo();