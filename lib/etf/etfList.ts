// lib/etf/etfList.ts

import { ETFMetadata } from './types';

/**
 * Complete list of all 115 ETFs tracked in the dashboard
 * All tickers include .L suffix for London Stock Exchange
 */
export const ETF_LIST: ETFMetadata[] = [
  // ============================================
  // Countries & Broad Regions (26 ETFs)
  // ============================================
  { ticker: 'VUKG.L', shortName: 'UK All-Share', fullName: 'Vanguard FTSE UK All Share (Acc)', category: 'Countries & Broad Regions', ter: 0.06 },
  { ticker: 'CSP1.L', shortName: 'S&P 500', fullName: 'iShares Core S&P 500 (Acc)', category: 'Countries & Broad Regions', ter: 0.07 },
  { ticker: 'SJPA.L', shortName: 'Japan', fullName: 'iShares MSCI Japan (Acc)', category: 'Countries & Broad Regions', ter: 0.15 },
  { ticker: 'CG1.L', shortName: 'Germany', fullName: 'Amundi DAX III (Acc)', category: 'Countries & Broad Regions', ter: 0.08 },
  { ticker: 'CE2D.L', shortName: 'France', fullName: 'Amundi MSCI France (Acc)', category: 'Countries & Broad Regions', ter: 0.25 },
  { ticker: 'CSCA.L', shortName: 'Canada', fullName: 'iShares MSCI Canada (Acc)', category: 'Countries & Broad Regions', ter: 0.33 },
  { ticker: 'SAUS.L', shortName: 'Australia', fullName: 'iShares MSCI Australia (Acc)', category: 'Countries & Broad Regions', ter: 0.44 },
  { ticker: 'ESPA.L', shortName: 'Spain', fullName: 'iShares MSCI Spain (Acc)', category: 'Countries & Broad Regions', ter: 0.33 },
  { ticker: 'XTIM.L', shortName: 'Italy', fullName: 'Xtrackers MSCI Italy (Acc)', category: 'Countries & Broad Regions', ter: 0.30 },
  { ticker: 'UC94.L', shortName: 'Switzerland', fullName: 'UBS MSCI Switzerland (hGBP Acc)', category: 'Countries & Broad Regions', ter: 0.20 },
  { ticker: 'SPOL.L', shortName: 'Poland', fullName: 'iShares MSCI Poland (Acc)', category: 'Countries & Broad Regions', ter: 0.45 },
  { ticker: 'FRIN.L', shortName: 'India', fullName: 'Franklin FTSE India (Acc)', category: 'Countries & Broad Regions', ter: 0.19 },
  { ticker: 'CSKR.L', shortName: 'South Korea', fullName: 'iShares MSCI Korea (Acc)', category: 'Countries & Broad Regions', ter: 0.65 },
  { ticker: 'HTWN.L', shortName: 'Taiwan', fullName: 'HSBC MSCI Taiwan (Acc)', category: 'Countries & Broad Regions', ter: 0.15 },
  { ticker: 'XFVT.L', shortName: 'Vietnam', fullName: 'Xtrackers FTSE Vietnam (Acc)', category: 'Countries & Broad Regions', ter: 0.85 },
  { ticker: 'ITKY.L', shortName: 'Turkey', fullName: 'iShares MSCI Turkey (Acc)', category: 'Countries & Broad Regions', ter: 0.74 },
  { ticker: 'IDMX.L', shortName: 'Mexico', fullName: 'iShares MSCI Mexico (Acc)', category: 'Countries & Broad Regions', ter: 0.65 },
  { ticker: 'IKSA.L', shortName: 'Saudi Arabia', fullName: 'iShares MSCI Saudi Arabia (Acc)', category: 'Countries & Broad Regions', ter: 0.60 },
  { ticker: 'IDNP.L', shortName: 'Indonesia', fullName: 'iShares MSCI Indonesia (Acc)', category: 'Countries & Broad Regions', ter: 0.45 },
  { ticker: 'HMCH.L', shortName: 'China', fullName: 'HSBC MSCI China (Dist)', category: 'Countries & Broad Regions', ter: 0.28 },
  { ticker: 'XMWX.L', shortName: 'World ex-US', fullName: 'Xtrackers MSCI World ex USA (Acc)', category: 'Countries & Broad Regions', ter: 0.15 },
  { ticker: 'SWDA.L', shortName: 'World', fullName: 'iShares MSCI World (Acc)', category: 'Countries & Broad Regions', ter: 0.20 },
  { ticker: 'VERX.L', shortName: 'Europe ex-UK', fullName: 'Vanguard FTSE Dev Europe ex-UK (Acc)', category: 'Countries & Broad Regions', ter: 0.10 },
  { ticker: 'VFEG.L', shortName: 'Emerg Mkts', fullName: 'Vanguard FTSE Emerging Markets (Acc)', category: 'Countries & Broad Regions', ter: 0.22 },
  { ticker: 'HMFD.L', shortName: 'Frontier Mkts', fullName: 'MSCI Frontier Markets (Acc)', category: 'Countries & Broad Regions', ter: 0.50 },
  { ticker: 'VAPX.L', shortName: 'Asia Pac ex-JP', fullName: 'Vanguard FTSE Developed Asia Pac ex-Japan', category: 'Countries & Broad Regions', ter: 0.15 },

  // ============================================
  // US GICS Sectors (11 ETFs)
  // ============================================
  { ticker: 'IITU.L', shortName: 'US Tech', fullName: 'iShares S&P 500 Tech', category: 'US GICS Sectors', ter: 0.15 },
  { ticker: 'IUCM.L', shortName: 'US Comm', fullName: 'iShares S&P 500 Comm', category: 'US GICS Sectors', ter: 0.15 },
  { ticker: 'ICDU.L', shortName: 'US Cons Disc', fullName: 'iShares S&P 500 ConsD', category: 'US GICS Sectors', ter: 0.15 },
  { ticker: 'IUCS.L', shortName: 'US Cons Stap', fullName: 'iShares S&P 500 ConsS', category: 'US GICS Sectors', ter: 0.15 },
  { ticker: 'IUFS.L', shortName: 'US Financials', fullName: 'iShares S&P 500 Finance', category: 'US GICS Sectors', ter: 0.15 },
  { ticker: 'IUHC.L', shortName: 'US Health', fullName: 'iShares S&P 500 Health', category: 'US GICS Sectors', ter: 0.15 },
  { ticker: 'IUIS.L', shortName: 'US Industrials', fullName: 'iShares S&P 500 Industrials', category: 'US GICS Sectors', ter: 0.15 },
  { ticker: 'IUMS.L', shortName: 'US Materials', fullName: 'iShares S&P 500 Materials', category: 'US GICS Sectors', ter: 0.15 },
  { ticker: 'IUSP.L', shortName: 'US Real Estate', fullName: 'iShares S&P 500 Real Estate', category: 'US GICS Sectors', ter: 0.15 },
  { ticker: 'IUTU.L', shortName: 'US Utilities', fullName: 'iShares S&P 500 Utilities', category: 'US GICS Sectors', ter: 0.15 },
  { ticker: 'IUES.L', shortName: 'US Energy', fullName: 'iShares S&P 500 Energy (Acc)', category: 'US GICS Sectors', ter: 0.15 },

  // ============================================
  // World Sectors (11 ETFs)
  // ============================================
  { ticker: 'XDWT.L', shortName: 'World Tech', fullName: 'Xtrackers MSCI World Info Tech', category: 'World Sectors', ter: 0.25 },
  { ticker: 'WCOM.L', shortName: 'World Comm', fullName: 'SPDR MSCI World Comm', category: 'World Sectors', ter: 0.30 },
  { ticker: 'XWDS.L', shortName: 'World Cons Disc', fullName: 'Xtrackers MSCI World ConsD', category: 'World Sectors', ter: 0.25 },
  { ticker: 'WSTP.L', shortName: 'World Cons Stap', fullName: 'iShares MSCI World Cons Staples (Acc)', category: 'World Sectors', ter: 0.30 },
  { ticker: 'XDWF.L', shortName: 'World Financials', fullName: 'Xtrackers MSCI World Finance', category: 'World Sectors', ter: 0.25 },
  { ticker: 'WHEA.L', shortName: 'World Health', fullName: 'SPDR MSCI World Health', category: 'World Sectors', ter: 0.30 },
  { ticker: 'XWND.L', shortName: 'World Industrials', fullName: 'Xtrackers MSCI World Industrials ESG (Acc)', category: 'World Sectors', ter: 0.25 },
  { ticker: 'WMAT.L', shortName: 'World Materials', fullName: 'SPDR MSCI World Materials', category: 'World Sectors', ter: 0.30 },
  { ticker: 'IWDP.L', shortName: 'World Real Estate', fullName: 'iShares Dev. Real Estate', category: 'World Sectors', ter: 0.40 },
  { ticker: 'WUTI.L', shortName: 'World Utilities', fullName: 'SPDR MSCI World Utilities', category: 'World Sectors', ter: 0.30 },
  { ticker: 'WENS.L', shortName: 'World Energy', fullName: 'iShares MSCI World Energy', category: 'World Sectors', ter: 0.30 },

  // ============================================
  // Europe Sectors (11 ETFs)
  // ============================================
  { ticker: 'ESIT.L', shortName: 'Europe Tech', fullName: 'iShares MSCI Europe Tech', category: 'Europe Sectors', ter: 0.18 },
  { ticker: 'ESIC.L', shortName: 'Europe Comm', fullName: 'iShares MSCI Europe Comm', category: 'Europe Sectors', ter: 0.18 },
  { ticker: 'XSD2.L', shortName: 'Europe Cons Disc', fullName: 'Xtrackers Europe ConsD (Acc)', category: 'Europe Sectors', ter: 0.17 },
  { ticker: 'ESIS.L', shortName: 'Europe Cons Stap', fullName: 'iShares MSCI Europe Staples', category: 'Europe Sectors', ter: 0.18 },
  { ticker: 'ESIF.L', shortName: 'Europe Financials', fullName: 'iShares MSCI Europe Finance', category: 'Europe Sectors', ter: 0.18 },
  { ticker: 'ESIH.L', shortName: 'Europe Health', fullName: 'iShares MSCI Europe Health', category: 'Europe Sectors', ter: 0.18 },
  { ticker: 'ESIN.L', shortName: 'Europe Industrials', fullName: 'iShares MSCI Europe Industrials', category: 'Europe Sectors', ter: 0.18 },
  { ticker: 'MATR.L', shortName: 'Europe Materials', fullName: 'Xtrackers Europe Materials (Dist)', category: 'Europe Sectors', ter: 0.18 },
  { ticker: 'IPRP.L', shortName: 'Europe Real Estate', fullName: 'iShares European Property', category: 'Europe Sectors', ter: 0.40 },
  { ticker: 'UTIL.L', shortName: 'Europe Utilities', fullName: 'SPDR MSCI Europe Utilities (Dist)', category: 'Europe Sectors', ter: 0.18 },
  { ticker: 'ESIE.L', shortName: 'Europe Energy', fullName: 'iShares MSCI Europe Energy', category: 'Europe Sectors', ter: 0.18 },

  // ============================================
  // Style/Factor ETFs (15 ETFs)
  // ============================================
  { ticker: 'IUMF.L', shortName: 'US Momentum', fullName: 'iShares MSCI USA Momentum', category: 'Style/Factor ETFs', ter: 0.15 },
  { ticker: 'IWFM.L', shortName: 'World Momentum', fullName: 'iShares MSCI World Momentum', category: 'Style/Factor ETFs', ter: 0.30 },
  { ticker: 'IUQF.L', shortName: 'US Quality', fullName: 'iShares MSCI USA Quality', category: 'Style/Factor ETFs', ter: 0.15 },
  { ticker: 'IWFQ.L', shortName: 'World Quality', fullName: 'iShares MSCI World Quality', category: 'Style/Factor ETFs', ter: 0.25 },
  { ticker: 'IUVF.L', shortName: 'US Value', fullName: 'iShares MSCI USA Value', category: 'Style/Factor ETFs', ter: 0.20 },
  { ticker: 'IWFV.L', shortName: 'World Value', fullName: 'iShares MSCI World Value', category: 'Style/Factor ETFs', ter: 0.30 },
  { ticker: 'USMV.L', shortName: 'US Min Vol', fullName: 'iShares Edge MSCI USA Min Vol', category: 'Style/Factor ETFs', ter: 0.30 },
  { ticker: 'MVOL.L', shortName: 'World Min Vol', fullName: 'iShares Edge MSCI World Min Vol', category: 'Style/Factor ETFs', ter: 0.30 },
  { ticker: 'IUSF.L', shortName: 'US Size', fullName: 'iShares MSCI USA Size Factor', category: 'Style/Factor ETFs', ter: 0.15 },
  { ticker: 'IWSZ.L', shortName: 'World Size', fullName: 'iShares MSCI World Size Factor', category: 'Style/Factor ETFs', ter: 0.30 },
  { ticker: 'ISP6.L', shortName: 'US Small Cap', fullName: 'iShares MSCI USA Small Cap 600', category: 'Style/Factor ETFs', ter: 0.30 },
  { ticker: 'WLDS.L', shortName: 'World Small Cap', fullName: 'iShares MSCI World Small Cap', category: 'Style/Factor ETFs', ter: 0.35 },
  { ticker: 'AVCG.L', shortName: 'Avantis Core', fullName: 'Avantis Global Equity', category: 'Style/Factor ETFs', ter: 0.22 },
  { ticker: 'AVSG.L', shortName: 'Avantis Sm Val', fullName: 'Avantis Global Small Cap Value', category: 'Style/Factor ETFs', ter: 0.39 },
  { ticker: 'AVEG.L', shortName: 'Avantis EM Val', fullName: 'Avantis Emerging Markets Equity', category: 'Style/Factor ETFs', ter: 0.33 },

  // ============================================
  // Precious Metals & Commodities (18 ETFs)
  // ============================================
  { ticker: 'SGLN.L', shortName: 'Gold', fullName: 'iShares Physical Gold', category: 'Precious Metals & Commodities', ter: 0.12 },
  { ticker: 'GDGB.L', shortName: 'Gold Miners', fullName: 'iShares Gold Producers (Acc)', category: 'Precious Metals & Commodities', ter: 0.55 },
  { ticker: 'GJGB.L', shortName: 'Jr Gold Miners', fullName: 'VanEck Junior Gold Miners (Acc)', category: 'Precious Metals & Commodities', ter: 0.55 },
  { ticker: 'SSLN.L', shortName: 'Silver', fullName: 'iShares Physical Silver', category: 'Precious Metals & Commodities', ter: 0.20 },
  { ticker: 'SILG.L', shortName: 'Silver Miners', fullName: 'Global X Silver Miners (Acc)', category: 'Precious Metals & Commodities', ter: 0.65 },
  { ticker: 'SPLT.L', shortName: 'Platinum', fullName: 'iShares Physical Platinum', category: 'Precious Metals & Commodities', ter: 0.20 },
  { ticker: 'SPDM.L', shortName: 'Palladium', fullName: 'iShares Physical Palladium', category: 'Precious Metals & Commodities', ter: 0.20 },
  { ticker: 'COPB.L', shortName: 'Copper', fullName: 'WisdomTree Copper (£)', category: 'Precious Metals & Commodities', ter: 0.49 },
  { ticker: 'GDIG.L', shortName: 'Metal Miners', fullName: 'VanEck S&P Global Mining (Acc)', category: 'Precious Metals & Commodities', ter: 0.50 },
  { ticker: 'BRNG.L', shortName: 'Oil', fullName: 'WisdomTree Brent Crude Oil (£)', category: 'Precious Metals & Commodities', ter: 0.49 },
  { ticker: 'NGAS.L', shortName: 'Nat Gas', fullName: 'WisdomTree Natural Gas (£)', category: 'Precious Metals & Commodities', ter: 0.49 },
  { ticker: 'INRG.L', shortName: 'Clean Energy', fullName: 'iShares Global Clean Energy', category: 'Precious Metals & Commodities', ter: 0.65 },
  { ticker: 'RAYG.L', shortName: 'Solar', fullName: 'Global X Solar', category: 'Precious Metals & Commodities', ter: 0.50 },
  { ticker: 'URNP.L', shortName: 'Uranium', fullName: 'Global X Uranium', category: 'Precious Metals & Commodities', ter: 0.65 },
  { ticker: 'NUCG.L', shortName: 'Nuclear', fullName: 'VanEck Uranium+Nuclear', category: 'Precious Metals & Commodities', ter: 0.55 },
  { ticker: 'LITG.L', shortName: 'Lithium/Battery', fullName: 'L&G Battery Value-Chain', category: 'Precious Metals & Commodities', ter: 0.49 },
  { ticker: 'IH2O.L', shortName: 'Clean Water', fullName: 'iShares Global Water (Acc)', category: 'Precious Metals & Commodities', ter: 0.65 },
  { ticker: 'AIGA.L', shortName: 'Agriculture', fullName: 'WisdomTree Agriculture', category: 'Precious Metals & Commodities', ter: 0.49 },

  // ============================================
  // Crypto & Blockchain (4 ETFs)
  // ============================================
  { ticker: 'IB1T.L', shortName: 'Bitcoin', fullName: 'iShares Bitcoin ETP', category: 'Crypto & Blockchain', ter: 0.15 },
  { ticker: 'ETHW.L', shortName: 'Ethereum', fullName: 'WisdomTree Physical Ethereum', category: 'Crypto & Blockchain', ter: 0.35 },
  { ticker: 'BCHS.L', shortName: 'Blockchain', fullName: 'Invesco CoinShares Global Blockchain', category: 'Crypto & Blockchain', ter: 0.65 },
  { ticker: 'DAGB.L', shortName: 'Crypto Firms', fullName: 'VanEck Crypto & Blockchain Innovators', category: 'Crypto & Blockchain', ter: 0.65 },

  // ============================================
  // Thematic (10 ETFs)
  // ============================================
  { ticker: 'AIAI.L', shortName: 'AI', fullName: 'L&G Artificial Intelligence', category: 'Thematic', ter: 0.49 },
  { ticker: 'SMGB.L', shortName: 'Semiconductors', fullName: 'VanEck Semiconductor (Acc)', category: 'Thematic', ter: 0.35 },
  { ticker: 'RBOT.L', shortName: 'Robotics', fullName: 'iShares Automation & Robotics', category: 'Thematic', ter: 0.40 },
  { ticker: 'WCLD.L', shortName: 'Cloud', fullName: 'WisdomTree Cloud UCITS', category: 'Thematic', ter: 0.40 },
  { ticker: 'ISPY.L', shortName: 'Cybersecurity', fullName: 'iShares Cybersecurity (Acc)', category: 'Thematic', ter: 0.35 },
  { ticker: 'ECAR.L', shortName: 'EV Cars', fullName: 'iShares Electric Vehicles', category: 'Thematic', ter: 0.40 },
  { ticker: 'DFNG.L', shortName: 'Defense', fullName: 'VanEck Defense (Acc)', category: 'Thematic', ter: 0.55 },
  { ticker: 'INFR.L', shortName: 'Infrastructure', fullName: 'iShares Global Infrastructure', category: 'Thematic', ter: 0.50 },
  { ticker: 'AGED.L', shortName: 'Aging Pop', fullName: 'iShares Aging Population', category: 'Thematic', ter: 0.40 },
  { ticker: 'LOCK.L', shortName: 'Digital Security', fullName: 'iShares Digital Security (Acc)', category: 'Thematic', ter: 0.40 },

  // ============================================
  // Bonds (9 ETFs)
  // ============================================
  { ticker: 'CSH2.L', shortName: 'UK Cash', fullName: 'Amundi Smart Overnight', category: 'Bonds', ter: 0.05 },
  { ticker: 'IGL5.L', shortName: 'UK Gilts 0-5Y', fullName: 'iShares UK Gilts 0-5yr (Acc)', category: 'Bonds', ter: 0.07 },
  { ticker: 'VGVA.L', shortName: 'UK Gilts Med', fullName: 'Vanguard U.K. Gilt (Acc)', category: 'Bonds', ter: 0.05 },
  { ticker: 'IGLT.L', shortName: 'UK Gilts Broad', fullName: 'iShares Core UK Gilts', category: 'Bonds', ter: 0.07 },
  { ticker: 'VAGS.L', shortName: 'Global Bonds', fullName: 'Vanguard Global Aggregate (hGBP Acc)', category: 'Bonds', ter: 0.10 },
  { ticker: 'IBTG.L', shortName: 'US Treas 1-3Y', fullName: 'iShares $ Treas 1-3yr (hGBP Dist)', category: 'Bonds', ter: 0.10 },
  { ticker: 'IGTM.L', shortName: 'US Treas 7-10Y', fullName: 'iShares $ Treas 7-10yr (hGBP Dist)', category: 'Bonds', ter: 0.10 },
  { ticker: 'IDGA.L', shortName: 'US Treas 20Y+', fullName: 'iShares $ Treas 20+yr (hGBP Acc)', category: 'Bonds', ter: 0.10 },
  { ticker: 'IS15.L', shortName: 'UK Corp 0-5Y', fullName: 'iShares £ Corp Bond 0-5yr', category: 'Bonds', ter: 0.20 }
];

/**
 * Get unique categories from ETF list
 */
export function getCategories(): string[] {
  const categories = new Set(ETF_LIST.map(etf => etf.category));
  return Array.from(categories).sort();
}

/**
 * Get count of ETFs per category
 */
export function getCategoryCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  ETF_LIST.forEach(etf => {
    counts[etf.category] = (counts[etf.category] || 0) + 1;
  });
  return counts;
}