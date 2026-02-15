/**
 * S&P 500 constituent tickers
 * Update quarterly when S&P makes changes
 * Last updated: February 2026
 * 
 * Source: Current S&P 500 composition
 * Used for: Tab 1 breadth calculation (% above 20 DMA)
 */

export const SP500_TICKERS = [
  // Technology
  'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'GOOG', 'META', 'AVGO', 'TSLA', 'ORCL', 'CRM',
  'ADBE', 'CSCO', 'ACN', 'AMD', 'INTC', 'IBM', 'QCOM', 'TXN', 'INTU', 'NOW',
  'AMAT', 'MU', 'LRCX', 'ADI', 'KLAC', 'SNPS', 'CDNS', 'MCHP', 'FTNT', 'PANW',
  'ADSK', 'ROP', 'FICO', 'MSCI', 'APH', 'TEL', 'MSI', 'TYL', 'KEYS', 'ANSS',
  'PTC', 'CDW', 'ZBRA', 'FFIV', 'JNPR', 'AKAM', 'CTSH', 'IT', 'GLW', 'HPQ',
  'NTAP', 'STX', 'WDC', 'ENPH', 'SEDG', 'ON', 'SWKS', 'MPWR', 'TER', 'MRVL',
  
  // Financials
  'BRK.B', 'JPM', 'V', 'MA', 'BAC', 'WFC', 'GS', 'MS', 'SPGI', 'BLK',
  'C', 'AXP', 'CB', 'SCHW', 'PGR', 'MMC', 'ICE', 'CME', 'AON', 'PNC',
  'USB', 'TFC', 'BK', 'AJG', 'COF', 'AFL', 'MET', 'AIG', 'PRU', 'TRV',
  'ALL', 'DFS', 'HIG', 'AMP', 'MSCI', 'MCO', 'FIS', 'BRO', 'CPAY', 'GPN',
  'TROW', 'STT', 'CINF', 'WRB', 'CFG', 'KEY', 'FITB', 'HBAN', 'RF', 'NTRS',
  'SYF', 'MTB', 'SIVB', 'FRC', 'ZION', 'IVZ', 'BEN', 'L', 'GL', 'AIZ',
  
  // Healthcare
  'UNH', 'JNJ', 'LLY', 'ABBV', 'MRK', 'TMO', 'ABT', 'DHR', 'PFE', 'AMGN',
  'CVS', 'ELV', 'BMY', 'GILD', 'CI', 'MDT', 'ISRG', 'REGN', 'VRTX', 'ZTS',
  'BSX', 'SYK', 'HCA', 'MRNA', 'MCK', 'EW', 'DXCM', 'HUM', 'BDX', 'CNC',
  'A', 'IDXX', 'IQV', 'COR', 'RMD', 'ALGN', 'MTD', 'BIIB', 'COO', 'ILMN',
  'STE', 'WAT', 'TECH', 'CTLT', 'HOLX', 'PODD', 'BAX', 'DGX', 'TFX', 'MOH',
  'LH', 'INCY', 'VTRS', 'DVA', 'XRAY', 'RVTY', 'UHS', 'CAH', 'HSIC', 'SOLV',
  
  // Consumer Discretionary
  'AMZN', 'TSLA', 'HD', 'MCD', 'NKE', 'LOW', 'SBUX', 'TJX', 'BKNG', 'AZO',
  'ORLY', 'CMG', 'MAR', 'ABNB', 'GM', 'F', 'HLT', 'ROST', 'YUM', 'DHI',
  'LEN', 'DRI', 'APTV', 'POOL', 'GPC', 'BBY', 'EXPE', 'TSCO', 'ULTA', 'DPZ',
  'EBAY', 'NCLH', 'RCL', 'CCL', 'LVS', 'WYNN', 'MGM', 'RL', 'TPR', 'PVH',
  'VFC', 'NWL', 'WHR', 'HAS', 'LKQ', 'BBWI', 'CZR', 'MHK', 'AAP', 'KMX',
  
  // Communication Services
  'GOOGL', 'GOOG', 'META', 'NFLX', 'DIS', 'CMCSA', 'VZ', 'T', 'TMUS', 'CHTR',
  'EA', 'TTWO', 'MTCH', 'NWSA', 'NWS', 'FOX', 'FOXA', 'PARA', 'WBD', 'OMC',
  'IPG', 'LYV', 'DISH', 'CABO',
  
  // Industrials
  'UNP', 'RTX', 'HON', 'UPS', 'CAT', 'BA', 'GE', 'LMT', 'DE', 'MMM',
  'ADP', 'GD', 'NOC', 'WM', 'TT', 'ETN', 'ITW', 'PH', 'EMR', 'FDX',
  'PCAR', 'CSX', 'NSC', 'JCI', 'CMI', 'TDG', 'CARR', 'PAYX', 'OTIS', 'ROK',
  'AME', 'FAST', 'VRSK', 'DOV', 'RSG', 'ODFL', 'IR', 'DAL', 'UAL', 'LUV',
  'SWK', 'CPRT', 'XYL', 'HWM', 'ALLE', 'CHRW', 'JBHT', 'PWR', 'EXPD', 'GNRC',
  'NDSN', 'IEX', 'PNR', 'ROL', 'AOS', 'PAYC', 'J', 'BLDR', 'MAS', 'LDOS',
  'HUBB', 'VLTO', 'SNA', 'URI', 'WAB', 'CNI',
  
  // Consumer Staples
  'WMT', 'PG', 'COST', 'KO', 'PEP', 'PM', 'MO', 'CL', 'MDLZ', 'EL',
  'ADM', 'KMB', 'GIS', 'MNST', 'SYY', 'KHC', 'HSY', 'K', 'CHD', 'CLX',
  'TSN', 'HRL', 'MKC', 'CAG', 'SJM', 'CPB', 'KR', 'DG', 'DLTR', 'TAP',
  'STZ', 'BF.B', 'LW',
  
  // Energy
  'XOM', 'CVX', 'COP', 'SLB', 'EOG', 'MPC', 'PSX', 'VLO', 'OXY', 'WMB',
  'KMI', 'HES', 'FANG', 'HAL', 'DVN', 'BKR', 'MRO', 'APA', 'CTRA', 'EQT',
  'OKE', 'TRGP', 'LNG', 'CHRD',
  
  // Utilities
  'NEE', 'DUK', 'SO', 'D', 'AEP', 'EXC', 'SRE', 'PCG', 'PEG', 'XEL',
  'ED', 'EIX', 'WEC', 'AWK', 'DTE', 'ES', 'FE', 'ETR', 'PPL', 'AEE',
  'CMS', 'CNP', 'NI', 'ATO', 'NRG', 'EVRG', 'PNW', 'LNT', 'AES',
  
  // Real Estate
  'PLD', 'AMT', 'CCI', 'EQIX', 'PSA', 'WELL', 'SPG', 'DLR', 'O', 'CBRE',
  'EQR', 'AVB', 'SBAC', 'VTR', 'ARE', 'INVH', 'EXR', 'MAA', 'ESS', 'SUI',
  'DOC', 'UDR', 'CPT', 'HST', 'REG', 'BXP', 'FRT', 'KIM', 'VNO',
  
  // Materials
  'LIN', 'APD', 'SHW', 'ECL', 'FCX', 'NEM', 'CTVA', 'DD', 'DOW', 'NUE',
  'VMC', 'MLM', 'ALB', 'STLD', 'IFF', 'PKG', 'BALL', 'AVY', 'AMCR', 'IP',
  'EMN', 'CF', 'MOS', 'LYB', 'CE', 'FMC'
];

// Total: ~500 tickers
// Note: This list includes current S&P 500 constituents as of Feb 2026
// Update quarterly when index changes occur