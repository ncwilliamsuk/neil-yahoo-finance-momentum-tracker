// lib/etf/test-mock.ts
import { MOCK_DATA, getMockData, hasMockData } from './mockData';

console.log('Mock data ETFs:', Object.keys(MOCK_DATA).length);
console.log('CSP1.L has mock data:', hasMockData('CSP1.L'));
console.log('CSP1.L data:', getMockData('CSP1.L'));
console.log('INVALID.L has mock data:', hasMockData('INVALID.L'));

