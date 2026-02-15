// lib/etf/test-etf-list.ts (temporary test file)
import { ETF_LIST, getCategories, getCategoryCounts } from './etfList';

console.log('Total ETFs:', ETF_LIST.length);
console.log('Categories:', getCategories());
console.log('Counts:', getCategoryCounts());

