// lib/v5/etfList.ts
// Single source of truth for all ETF screener tickers.
//
// universe field:
//   (absent)           → appears in both Core and Extended views
//   universe: 'extended' → appears in Extended view only
//
// currencyNote field:
//   (absent)    = LSE-listed, trades in GBX/GBP
//   'USD'       = US-listed ETF, no LSE equivalent
//   'LSE-ETP'   = LSE-listed ETP (not a fund)

import type { ETFMetadata } from './etfTypes';

export const ETF_LIST: ETFMetadata[] = [

  // ── Countries ──────────────────────────────────────────────
  // Core (20)
  { ticker: 'VUKG.L', shortName: 'UK All-Share', fullName: 'Vanguard FTSE UK All Share (Acc)', category: 'Countries', ter: 0.06 },
  { ticker: 'CSP1.L', shortName: 'S&P 500', fullName: 'iShares Core S&P 500 (Acc)', category: 'Countries', ter: 0.07 },
  { ticker: 'SJPA.L', shortName: 'Japan', fullName: 'iShares MSCI Japan (Acc)', category: 'Countries', ter: 0.15 },
  { ticker: 'CG1.L', shortName: 'Germany', fullName: 'Amundi DAX III (Acc)', category: 'Countries', ter: 0.08 },
  { ticker: 'CE2D.L', shortName: 'France', fullName: 'Amundi MSCI France (Acc)', category: 'Countries', ter: 0.25 },
  { ticker: 'CSCA.L', shortName: 'Canada', fullName: 'iShares MSCI Canada (Acc)', category: 'Countries', ter: 0.33 },
  { ticker: 'SAUS.L', shortName: 'Australia', fullName: 'iShares MSCI Australia (Acc)', category: 'Countries', ter: 0.44 },
  { ticker: 'CS1.L', shortName: 'Spain', fullName: 'Amundi IBEX 35 (Acc)', category: 'Countries', ter: 0.3 },
  { ticker: 'CMB1.L', shortName: 'Italy', fullName: 'iShares FTSE MIB (Acc)', category: 'Countries', ter: 0.33 },
  { ticker: 'UC94.L', shortName: 'Switzerland', fullName: 'UBS MSCI Switzerland (hGBP Acc)', category: 'Countries', ter: 0.20 },
  { ticker: 'SPOL.L', shortName: 'Poland', fullName: 'iShares MSCI Poland (Acc)', category: 'Countries', ter: 0.45 },
  { ticker: 'FRIN.L', shortName: 'India', fullName: 'Franklin FTSE India (Acc)', category: 'Countries', ter: 0.19 },
  { ticker: 'HTWN.L', shortName: 'Taiwan', fullName: 'HSBC MSCI Taiwan (Acc)', category: 'Countries', ter: 0.15 },
  { ticker: 'XFVT.L', shortName: 'Vietnam', fullName: 'Xtrackers FTSE Vietnam (Acc)', category: 'Countries', ter: 0.85 },
  { ticker: 'ITKY.L', shortName: 'Turkey', fullName: 'iShares MSCI Turkey (Acc)', category: 'Countries', ter: 0.74 },
  { ticker: 'CMX1.L', shortName: 'Mexico', fullName: 'iShares MSCI Mexico Capped (Acc)', category: 'Countries', ter: 0.65 },
  { ticker: 'IKSA.L', shortName: 'Saudi Arabia', fullName: 'iShares MSCI Saudi Arabia (Acc)', category: 'Countries', ter: 0.60 },
  { ticker: 'HIDR.L', shortName: 'Indonesia', fullName: 'HSBC MSCI Indonesia', category: 'Countries', ter: 0.5 },
  { ticker: 'HMCH.L', shortName: 'China', fullName: 'HSBC MSCI China (Dist)', category: 'Countries', ter: 0.28 },
  // Extended only (32)
  { ticker: 'CUKX.L', shortName: 'FTSE 100', fullName: 'iShares FTSE 100 (Acc)', category: 'Countries', ter: 0.07, universe: 'extended' },
  { ticker: 'VMIG.L', shortName: 'FTSE 250', fullName: 'Vanguard FTSE 250 (Acc)', category: 'Countries', ter: 0.1, universe: 'extended' },
  { ticker: 'VNRG.L', shortName: 'US All-Cap', fullName: 'Vanguard FTSE North America (Acc)', category: 'Countries', ter: 0.08, universe: 'extended' },
  { ticker: 'OMXS.L', shortName: 'Sweden', fullName: 'iShares OMX Stockholm Capped (Acc)', category: 'Countries', ter: 0.1, universe: 'extended' },
  { ticker: 'XDN0.L', shortName: 'Nordic', fullName: 'Xtrackers MSCI Nordic', category: 'Countries', ter: 0.3, universe: 'extended' },
  { ticker: 'IAEX.L', shortName: 'Netherlands', fullName: 'iShares AEX (Amsterdam 30)', category: 'Countries', ter: 0.3, universe: 'extended' },
  { ticker: 'FLRK.L', shortName: 'South Korea', fullName: 'Franklin FTSE Korea (Acc)', category: 'Countries', ter: 0.09, universe: 'extended' },
  { ticker: 'FVUB.L', shortName: 'Brazil', fullName: 'Franklin FTSE Brazil (Acc)', category: 'Countries', ter: 0.19, universe: 'extended' },
  { ticker: 'HSTC.L', shortName: 'Hong Kong', fullName: 'HSBC Hang Seng Tech (Acc)', category: 'Countries', ter: 0.5, universe: 'extended' },
  { ticker: 'SRSA.L', shortName: 'South Africa', fullName: 'iShares MSCI South Africa (Acc)', category: 'Countries', ter: 0.65, universe: 'extended' },
  { ticker: 'EWK', shortName: 'Belgium', fullName: 'iShares MSCI Belgium (USD)', category: 'Countries', ter: 0.5, universe: 'extended', currencyNote: 'USD' },
  { ticker: 'NORW', shortName: 'Norway', fullName: 'Global X MSCI Norway (USD)', category: 'Countries', ter: 0.5, universe: 'extended', currencyNote: 'USD' },
  { ticker: 'EWO', shortName: 'Austria', fullName: 'iShares MSCI Austria (USD)', category: 'Countries', ter: 0.5, universe: 'extended', currencyNote: 'USD' },
  { ticker: 'EIRL', shortName: 'Ireland', fullName: 'iShares MSCI Ireland (USD)', category: 'Countries', ter: 0.5, universe: 'extended', currencyNote: 'USD' },
  { ticker: 'GREK', shortName: 'Greece', fullName: 'Global X MSCI Greece (USD)', category: 'Countries', ter: 0.58, universe: 'extended', currencyNote: 'USD' },
  { ticker: 'EWS', shortName: 'Singapore', fullName: 'iShares MSCI Singapore (USD)', category: 'Countries', ter: 0.5, universe: 'extended', currencyNote: 'USD' },
  { ticker: 'THD', shortName: 'Thailand', fullName: 'iShares MSCI Thailand (USD)', category: 'Countries', ter: 0.59, universe: 'extended', currencyNote: 'USD' },
  { ticker: 'EWM', shortName: 'Malaysia', fullName: 'iShares MSCI Malaysia (USD)', category: 'Countries', ter: 0.5, universe: 'extended', currencyNote: 'USD' },
  { ticker: 'EPHE', shortName: 'Philippines', fullName: 'iShares MSCI Philippines (USD)', category: 'Countries', ter: 0.59, universe: 'extended', currencyNote: 'USD' },
  { ticker: 'ENZL', shortName: 'New Zealand', fullName: 'iShares MSCI New Zealand (USD)', category: 'Countries', ter: 0.5, universe: 'extended', currencyNote: 'USD' },
  { ticker: 'ECH', shortName: 'Chile', fullName: 'iShares MSCI Chile (USD)', category: 'Countries', ter: 0.57, universe: 'extended', currencyNote: 'USD' },
  { ticker: 'ARGT', shortName: 'Argentina', fullName: 'Global X MSCI Argentina (USD)', category: 'Countries', ter: 0.59, universe: 'extended', currencyNote: 'USD' },
  { ticker: 'EPU', shortName: 'Peru', fullName: 'iShares MSCI Peru (USD)', category: 'Countries', ter: 0.57, universe: 'extended', currencyNote: 'USD' },
  { ticker: 'GXG', shortName: 'Colombia', fullName: 'Global X MSCI Colombia (USD)', category: 'Countries', ter: 0.61, universe: 'extended', currencyNote: 'USD' },
  { ticker: 'UAE', shortName: 'UAE', fullName: 'iShares MSCI UAE (USD)', category: 'Countries', ter: 0.5, universe: 'extended', currencyNote: 'USD' },
  { ticker: 'EIS', shortName: 'Israel', fullName: 'iShares MSCI Israel (USD)', category: 'Countries', ter: 0.59, universe: 'extended', currencyNote: 'USD' },

  // ── Broad Regions ──────────────────────────────────────────────
  // Core (5)
  { ticker: 'XMWX.L', shortName: 'World ex-US', fullName: 'Xtrackers MSCI World ex USA (Acc)', category: 'Broad Regions', ter: 0.15 },
  { ticker: 'SWDA.L', shortName: 'World', fullName: 'iShares MSCI World (Acc)', category: 'Broad Regions', ter: 0.20 },
  { ticker: 'VERX.L', shortName: 'Europe ex-UK', fullName: 'Vanguard FTSE Dev Europe ex-UK (Acc)', category: 'Broad Regions', ter: 0.10 },
  { ticker: 'VFEG.L', shortName: 'Emerg Mkts', fullName: 'Vanguard FTSE Emerging Markets (Acc)', category: 'Broad Regions', ter: 0.22 },
  { ticker: 'VAPX.L', shortName: 'Asia Pac ex-JP', fullName: 'Vanguard FTSE Developed Asia Pac ex-Japan', category: 'Broad Regions', ter: 0.15 },
  // Extended only (11)
  { ticker: 'VWRP.L', shortName: 'FTSE All-World', fullName: 'Vanguard FTSE All-World (Acc)', category: 'Broad Regions', ter: 0.22, universe: 'extended' },
  { ticker: 'VEVE.L', shortName: 'Developed World', fullName: 'Vanguard FTSE Developed World', category: 'Broad Regions', ter: 0.12, universe: 'extended' },
  { ticker: 'MEUD.L', shortName: 'Europe 600', fullName: 'Amundi Stoxx Europe 600 (Acc)', category: 'Broad Regions', ter: 0.07, universe: 'extended' },
  { ticker: 'SX5S.L', shortName: 'Eurozone', fullName: 'Invesco Euro Stoxx 50 (Acc)', category: 'Broad Regions', ter: 0.05, universe: 'extended' },
  { ticker: 'HMEF.L', shortName: 'Em Markets', fullName: 'HSBC MSCI Emerging Markets', category: 'Broad Regions', ter: 0.15, universe: 'extended' },
  { ticker: 'EMXN.L', shortName: 'EM ex-China', fullName: 'Amundi MSCI Emerging ex China (Acc)', category: 'Broad Regions', ter: 0.15, universe: 'extended' },
  { ticker: 'LTAM.L', shortName: 'EM Lat Am', fullName: 'iShares MSCI EM Latin America', category: 'Broad Regions', ter: 0.2, universe: 'extended' },
  { ticker: 'V3AB.L', shortName: 'World ESG', fullName: 'Vanguard ESG Global All Cap (Acc)', category: 'Broad Regions', ter: 0.24, universe: 'extended' },
  { ticker: 'BRIC.L', shortName: 'Brazil-India-China', fullName: 'iShares BIC 50', category: 'Broad Regions', ter: 0.74, universe: 'extended' },

  // ── Sectors US ──────────────────────────────────────────────
  // Core (11)
  { ticker: 'IITU.L', shortName: 'US Tech', fullName: 'iShares S&P 500 Tech', category: 'Sectors US', ter: 0.15 },
  { ticker: 'IUCM.L', shortName: 'US Comms', fullName: 'iShares S&P 500 Comm', category: 'Sectors US', ter: 0.15 },
  { ticker: 'ICDU.L', shortName: 'US Cons Disc', fullName: 'iShares S&P 500 ConsD', category: 'Sectors US', ter: 0.15 },
  { ticker: 'IUCS.L', shortName: 'US Cons Stap', fullName: 'iShares S&P 500 ConsS', category: 'Sectors US', ter: 0.15 },
  { ticker: 'IUFS.L', shortName: 'US Financials', fullName: 'iShares S&P 500 Finance', category: 'Sectors US', ter: 0.15 },
  { ticker: 'IUHC.L', shortName: 'US Health', fullName: 'iShares S&P 500 Health', category: 'Sectors US', ter: 0.15 },
  { ticker: 'IUIS.L', shortName: 'US Industrials', fullName: 'iShares S&P 500 Industrials', category: 'Sectors US', ter: 0.15 },
  { ticker: 'IUMS.L', shortName: 'US Materials', fullName: 'iShares S&P 500 Materials', category: 'Sectors US', ter: 0.15 },
  { ticker: 'IUSP.L', shortName: 'US Real Estate', fullName: 'iShares S&P 500 Real Estate', category: 'Sectors US', ter: 0.15 },
  { ticker: 'XLUP.L', shortName: 'US Utilities', fullName: 'Invesco Utilities S&P US Select (Acc)', category: 'Sectors US', ter: 0.14 },
  { ticker: 'IUES.L', shortName: 'US Energy', fullName: 'iShares S&P 500 Energy (Acc)', category: 'Sectors US', ter: 0.15 },
  // Extended only (10)
  { ticker: 'XLV', shortName: 'US Healthcare', fullName: 'SPDR US Healthcare (USD)', category: 'Sectors US', ter: 0.1, universe: 'extended', currencyNote: 'USD' },

  // ── Sectors World ──────────────────────────────────────────────
  // Core (11)
  { ticker: 'XDWT.L', shortName: 'World Tech', fullName: 'Xtrackers MSCI World Info Tech', category: 'Sectors World', ter: 0.25 },
  { ticker: 'WCOM.L', shortName: 'World Comms', fullName: 'SPDR MSCI World Comm', category: 'Sectors World', ter: 0.30 },
  { ticker: 'XWDS.L', shortName: 'World Cons Disc', fullName: 'Xtrackers MSCI World ConsD', category: 'Sectors World', ter: 0.25 },
  { ticker: 'XWCS.L', shortName: 'World Cons Stap', fullName: 'Xtrackers MSCI World Consumer Staples', category: 'Sectors World', ter: 0.25 },
  { ticker: 'XDWF.L', shortName: 'World Financials', fullName: 'Xtrackers MSCI World Finance', category: 'Sectors World', ter: 0.25 },
  { ticker: 'WHEA.L', shortName: 'World Health', fullName: 'SPDR MSCI World Health', category: 'Sectors World', ter: 0.30 },
  { ticker: 'XWIS.L', shortName: 'World Industrials', fullName: 'Xtrackers MSCI World Industrials', category: 'Sectors World', ter: 0.25 },
  { ticker: 'WMAT.L', shortName: 'World Materials', fullName: 'SPDR MSCI World Materials', category: 'Sectors World', ter: 0.30 },
  { ticker: 'IWDP.L', shortName: 'World Real Estate', fullName: 'iShares Dev. Real Estate', category: 'Sectors World', ter: 0.40 },
  { ticker: 'WUTI.L', shortName: 'World Utilities', fullName: 'SPDR MSCI World Utilities', category: 'Sectors World', ter: 0.30 },
  { ticker: 'WENS.L', shortName: 'World Energy', fullName: 'iShares MSCI World Energy', category: 'Sectors World', ter: 0.30 },

  // ── Sectors Europe ──────────────────────────────────────────────
  // Core (11)
  { ticker: 'ESIT.L', shortName: 'EU Tech', fullName: 'iShares MSCI Europe Tech', category: 'Sectors Europe', ter: 0.18 },
  { ticker: 'ESIC.L', shortName: 'EU Comms', fullName: 'iShares MSCI Europe Comm', category: 'Sectors Europe', ter: 0.18 },
  { ticker: 'XSD2.L', shortName: 'EU Cons Disc', fullName: 'Xtrackers Europe ConsD (Acc)', category: 'Sectors Europe', ter: 0.17 },
  { ticker: 'ESIS.L', shortName: 'EU Cons Stap', fullName: 'iShares MSCI Europe Staples', category: 'Sectors Europe', ter: 0.18 },
  { ticker: 'ESIF.L', shortName: 'EU Financials', fullName: 'iShares MSCI Europe Finance', category: 'Sectors Europe', ter: 0.18 },
  { ticker: 'ESIH.L', shortName: 'EU Health', fullName: 'iShares MSCI Europe Health', category: 'Sectors Europe', ter: 0.18 },
  { ticker: 'ESIN.L', shortName: 'EU Industrials', fullName: 'iShares MSCI Europe Industrials', category: 'Sectors Europe', ter: 0.18 },
  { ticker: 'MTRL.L', shortName: 'EU Materials', fullName: 'iShares MSCI Europe Materials', category: 'Sectors Europe', ter: 0.35 },
  { ticker: 'IPRP.L', shortName: 'EU Real Estate', fullName: 'iShares European Property', category: 'Sectors Europe', ter: 0.40 },
  { ticker: 'UTIL.L', shortName: 'EU Utilities', fullName: 'SPDR MSCI Europe Utilities (Dist)', category: 'Sectors Europe', ter: 0.18 },
  { ticker: 'ESIE.L', shortName: 'EU Energy', fullName: 'iShares MSCI Europe Energy', category: 'Sectors Europe', ter: 0.18 },

  // ── Factors ──────────────────────────────────────────────
  // Core (15)
  { ticker: 'IUMF.L', shortName: 'US Momentum', fullName: 'iShares MSCI USA Momentum', category: 'Factors', ter: 0.15 },
  { ticker: 'IWFM.L', shortName: 'World Momentum', fullName: 'iShares MSCI World Momentum', category: 'Factors', ter: 0.30 },
  { ticker: 'IUQF.L', shortName: 'US Quality', fullName: 'iShares MSCI USA Quality', category: 'Factors', ter: 0.15 },
  { ticker: 'IWFQ.L', shortName: 'World Quality', fullName: 'iShares MSCI World Quality', category: 'Factors', ter: 0.25 },
  { ticker: 'IUVF.L', shortName: 'US Value', fullName: 'iShares MSCI USA Value', category: 'Factors', ter: 0.20 },
  { ticker: 'IWFV.L', shortName: 'World Value', fullName: 'iShares MSCI World Value', category: 'Factors', ter: 0.30 },
  { ticker: 'IUSF.L', shortName: 'US Size', fullName: 'iShares MSCI USA Size Factor', category: 'Factors', ter: 0.15 },
  { ticker: 'IWSZ.L', shortName: 'World Size', fullName: 'iShares MSCI World Size Factor', category: 'Factors', ter: 0.30 },
  { ticker: 'ISP6.L', shortName: 'US Small Cap', fullName: 'iShares MSCI USA Small Cap 600', category: 'Factors', ter: 0.30 },
  { ticker: 'WLDS.L', shortName: 'World Small Cap', fullName: 'iShares MSCI World Small Cap', category: 'Factors', ter: 0.35 },
  { ticker: 'AVCG.L', shortName: 'Avantis Core', fullName: 'Avantis Global Equity', category: 'Factors', ter: 0.22 },
  { ticker: 'AVSG.L', shortName: 'Avantis Sm Val', fullName: 'Avantis Global Small Cap Value', category: 'Factors', ter: 0.39 },
  { ticker: 'AVEG.L', shortName: 'Avantis EM Val', fullName: 'Avantis Emerging Markets Equity', category: 'Factors', ter: 0.33 },
  // Extended only (18)
  { ticker: 'XDEB.L', shortName: 'World Min Vol', fullName: 'Xtrackers MSCI World Minimum Volatility', category: 'Factors', ter: 0.25, universe: 'extended' },
  { ticker: 'JPLG.L', shortName: 'Global Multi-Fac', fullName: 'J.P. Morgan Global Equity Multi-Factor', category: 'Factors', ter: 0.2, universe: 'extended' },
  { ticker: 'GOGB.L', shortName: 'Global Moat', fullName: 'VanEck Morningstar Global Moat', category: 'Factors', ter: 0.52, universe: 'extended' },
  { ticker: 'FLXX.L', shortName: 'Global Dividend', fullName: 'Franklin LibertyQ Global Dividend', category: 'Factors', ter: 0.3, universe: 'extended' },
  { ticker: 'GBDV.L', shortName: 'Global Div Arist', fullName: 'SPDR S&P Global Dividend Aristocrats', category: 'Factors', ter: 0.45, universe: 'extended' },
  { ticker: 'MVUS.L', shortName: 'US Min Vol', fullName: 'iShares Edge S&P 500 Min Volatility', category: 'Factors', ter: 0.2, universe: 'extended' },
  { ticker: 'XDWE.L', shortName: 'S&P 500 Eq Wt', fullName: 'Xtrackers S&P 500 Equal Weight', category: 'Factors', ter: 0.15, universe: 'extended' },
  { ticker: 'QQQA.L', shortName: 'Nasdaq 100', fullName: 'UBS Nasdaq-100 (Acc)', category: 'Factors', ter: 0.13, universe: 'extended' },
  { ticker: 'DHS.L', shortName: 'US Dividend', fullName: 'WisdomTree US Equity Income', category: 'Factors', ter: 0.29, universe: 'extended' },
  { ticker: 'IEFQ.L', shortName: 'EU Quality', fullName: 'iShares Edge MSCI Europe Quality Factor', category: 'Factors', ter: 0.25, universe: 'extended' },
  { ticker: 'IEFM.L', shortName: 'EU Momentum', fullName: 'iShares Edge MSCI Europe Momentum Factor', category: 'Factors', ter: 0.25, universe: 'extended' },
  { ticker: 'IEFV.L', shortName: 'EU Value', fullName: 'iShares Edge MSCI Europe Value Factor', category: 'Factors', ter: 0.25, universe: 'extended' },
  { ticker: 'EEI.L', shortName: 'EU Dividend', fullName: 'WisdomTree Europe Equity Income', category: 'Factors', ter: 0.29, universe: 'extended' },
  { ticker: 'EMV.L', shortName: 'EM Min Vol', fullName: 'iShares Edge MSCI EM Min Volatility', category: 'Factors', ter: 0.4, universe: 'extended' },
  { ticker: 'FEMQ.L', shortName: 'EM Quality', fullName: 'Fidelity Emerging Markets Quality Income', category: 'Factors', ter: 0.5, universe: 'extended' },
  { ticker: 'EMSM.L', shortName: 'EM Small Cap', fullName: 'SPDR MSCI Emerging Markets Small Cap', category: 'Factors', ter: 0.55, universe: 'extended' },
  { ticker: 'JGRE.L', shortName: 'Global Res Enh', fullName: 'J.P. Morgan Global Research Enhanced', category: 'Factors', ter: 0.25, universe: 'extended' },

  // ── Commodities ──────────────────────────────────────────────
  // Core (18)
  { ticker: 'SGLN.L', shortName: 'Gold', fullName: 'iShares Physical Gold', category: 'Commodities', ter: 0.12 },
  { ticker: 'GDGB.L', shortName: 'Gold Miners', fullName: 'iShares Gold Producers (Acc)', category: 'Commodities', ter: 0.55 },
  { ticker: 'GJGB.L', shortName: 'Jr Gold Miners', fullName: 'VanEck Junior Gold Miners (Acc)', category: 'Commodities', ter: 0.55 },
  { ticker: 'SSLN.L', shortName: 'Silver', fullName: 'iShares Physical Silver', category: 'Commodities', ter: 0.20 },
  { ticker: 'SILG.L', shortName: 'Silver Miners', fullName: 'Global X Silver Miners (Acc)', category: 'Commodities', ter: 0.65 },
  { ticker: 'SPLT.L', shortName: 'Platinum', fullName: 'iShares Physical Platinum', category: 'Commodities', ter: 0.20 },
  { ticker: 'SPDM.L', shortName: 'Palladium', fullName: 'iShares Physical Palladium', category: 'Commodities', ter: 0.20 },
  { ticker: 'COPB.L', shortName: 'Copper', fullName: 'WisdomTree Copper (£)', category: 'Commodities', ter: 0.49 },
  { ticker: 'GDIG.L', shortName: 'Metal Miners', fullName: 'VanEck S&P Global Mining (Acc)', category: 'Commodities', ter: 0.50 },
  { ticker: 'BRNG.L', shortName: 'Oil', fullName: 'WisdomTree Brent Crude Oil (£)', category: 'Commodities', ter: 0.49 },
  { ticker: 'NGAS.L', shortName: 'Nat Gas', fullName: 'WisdomTree Natural Gas (£)', category: 'Commodities', ter: 0.49 },
  { ticker: 'INRG.L', shortName: 'Clean Energy', fullName: 'iShares Global Clean Energy', category: 'Commodities', ter: 0.65 },
  { ticker: 'RAYG.L', shortName: 'Solar', fullName: 'Global X Solar', category: 'Commodities', ter: 0.50 },
  { ticker: 'URNP.L', shortName: 'Uranium', fullName: 'Global X Uranium', category: 'Commodities', ter: 0.65 },
  { ticker: 'NUCG.L', shortName: 'Nuclear', fullName: 'VanEck Uranium+Nuclear', category: 'Commodities', ter: 0.55 },
  { ticker: 'LITG.L', shortName: 'Lithium/Battery', fullName: 'L&G Battery Value-Chain', category: 'Commodities', ter: 0.49 },
  { ticker: 'IH2O.L', shortName: 'Clean Water', fullName: 'iShares Global Water (Acc)', category: 'Commodities', ter: 0.65 },
  { ticker: 'AIGA.L', shortName: 'Agriculture', fullName: 'WisdomTree Agriculture', category: 'Commodities', ter: 0.49 },
  // Extended only (5)
  { ticker: 'CMOP.L', shortName: 'Cmdties Broad', fullName: 'Invesco Bloomberg Commodity (Acc)', category: 'Commodities', ter: 0.19, universe: 'extended' },
  { ticker: 'SPOG.L', shortName: 'Oil & Gas Prod', fullName: 'iShares Oil & Gas Exploration & Production', category: 'Commodities', ter: 0.55, universe: 'extended' },
  { ticker: 'METG.L', shortName: 'Battery Metals', fullName: 'iShares Essential Metals Producers (Acc)', category: 'Commodities', ter: 0.55, universe: 'extended' },
  { ticker: 'REGB.L', shortName: 'Rare Earths', fullName: 'VanEck Rare Earth and Strategic Metals', category: 'Commodities', ter: 0.59, universe: 'extended' },
  { ticker: 'SPAG.L', shortName: 'Agribusiness', fullName: 'iShares Agribusiness (Acc)', category: 'Commodities', ter: 0.55, universe: 'extended' },

  // ── Crypto ──────────────────────────────────────────────
  // Core (4)
  { ticker: 'IB1T.L', shortName: 'Bitcoin', fullName: 'iShares Bitcoin ETP', category: 'Crypto', ter: 0.15 },
  { ticker: 'ETHW.L', shortName: 'Ethereum', fullName: 'WisdomTree Physical Ethereum', category: 'Crypto', ter: 0.35 },
  { ticker: 'BCHS.L', shortName: 'Blockchain', fullName: 'Invesco CoinShares Global Blockchain', category: 'Crypto', ter: 0.65 },
  { ticker: 'DAGB.L', shortName: 'Crypto Firms', fullName: 'VanEck Crypto & Blockchain Innovators', category: 'Crypto', ter: 0.65 },

  // ── Thematics ──────────────────────────────────────────────
  // Core (10)
  { ticker: 'AIAI.L', shortName: 'AI', fullName: 'L&G Artificial Intelligence', category: 'Thematics', ter: 0.49 },
  { ticker: 'SMGB.L', shortName: 'Semiconductors', fullName: 'VanEck Semiconductor (Acc)', category: 'Thematics', ter: 0.35 },
  { ticker: 'RBOT.L', shortName: 'Robotics', fullName: 'iShares Automation & Robotics', category: 'Thematics', ter: 0.40 },
  { ticker: 'WCLD.L', shortName: 'Cloud', fullName: 'WisdomTree Cloud UCITS', category: 'Thematics', ter: 0.40 },
  { ticker: 'ISPY.L', shortName: 'Cybersecurity', fullName: 'iShares Cybersecurity (Acc)', category: 'Thematics', ter: 0.35 },
  { ticker: 'ECAR.L', shortName: 'EV Cars', fullName: 'iShares Electric Vehicles', category: 'Thematics', ter: 0.40 },
  { ticker: 'DFNG.L', shortName: 'Defense', fullName: 'VanEck Defense (Acc)', category: 'Thematics', ter: 0.55 },
  { ticker: 'INFR.L', shortName: 'Infrastructure', fullName: 'iShares Global Infrastructure', category: 'Thematics', ter: 0.50 },
  { ticker: 'AGED.L', shortName: 'Aging Pop', fullName: 'iShares Aging Population', category: 'Thematics', ter: 0.40 },
  { ticker: 'LOCK.L', shortName: 'Digital Security', fullName: 'iShares Digital Security (Acc)', category: 'Thematics', ter: 0.40 },
  // Extended only (30)
  { ticker: 'WREN.L', shortName: 'Renewable Energy', fullName: 'WisdomTree Renewable Energy (Acc)', category: 'Thematics', ter: 0.45, universe: 'extended' },
  { ticker: 'RAYS.L', shortName: 'Solar Energy', fullName: 'Invesco Solar Energy (Acc)', category: 'Thematics', ter: 0.69, universe: 'extended' },
  { ticker: 'HTWG.L', shortName: 'Hydrogen Econ', fullName: 'L&G Hydrogen Economy (Acc)', category: 'Thematics', ter: 0.49, universe: 'extended' },
  { ticker: 'CLMP.L', shortName: 'Sust Energy', fullName: 'Guinness Sustainable Energy (Acc)', category: 'Thematics', ter: 0.65, universe: 'extended' },
  { ticker: 'GCAR.L', shortName: 'Elec Vehicles', fullName: 'iShares Electric Vehicles & Driving Tech', category: 'Thematics', ter: 0.4, universe: 'extended' },
  { ticker: 'CHRG.L', shortName: 'Battery Tech', fullName: 'WisdomTree Battery Solutions (Acc)', category: 'Thematics', ter: 0.4, universe: 'extended' },
  { ticker: 'XAIX.L', shortName: 'AI & Big Data', fullName: 'Xtrackers AI & Big Data (Acc)', category: 'Thematics', ter: 0.35, universe: 'extended' },
  { ticker: 'RBTX.L', shortName: 'Robotics & Auto', fullName: 'iShares Automation and Robotics (Acc)', category: 'Thematics', ter: 0.4, universe: 'extended' },
  { ticker: 'KLWD.L', shortName: 'Cloud Computing', fullName: 'WisdomTree Cloud Computing (Acc)', category: 'Thematics', ter: 0.4, universe: 'extended' },
  { ticker: 'DPAG.L', shortName: 'Digital Payments', fullName: 'L&G Digital Payments (Acc)', category: 'Thematics', ter: 0.49, universe: 'extended' },
  { ticker: 'DRDR.L', shortName: 'Healthcare Innov', fullName: 'iShares Healthcare Innovation (Acc)', category: 'Thematics', ter: 0.4, universe: 'extended' },
  { ticker: 'BTEK.L', shortName: 'Biotechnology', fullName: 'iShares Nasdaq US Biotechnology (Acc)', category: 'Thematics', ter: 0.35, universe: 'extended' },
  { ticker: 'BIGT.L', shortName: 'Pharma Breakthru', fullName: 'L&G Pharma Breakthrough (Acc)', category: 'Thematics', ter: 0.49, universe: 'extended' },
  { ticker: 'AGES.L', shortName: 'Ageing Pop', fullName: 'iShares Ageing Population (Acc)', category: 'Thematics', ter: 0.4, universe: 'extended' },
  { ticker: 'EDOG.L', shortName: 'Digital Health', fullName: 'Global X Telemedicine & Digital Health', category: 'Thematics', ter: 0.68, universe: 'extended' },
  { ticker: 'CIRC.L', shortName: 'Circular Economy', fullName: 'Rize Circular Economy Enablers (Acc)', category: 'Thematics', ter: 0.45, universe: 'extended' },
  { ticker: 'HPRO.L', shortName: 'Global REIT', fullName: 'HSBC FTSE EPRA NAREIT Developed', category: 'Thematics', ter: 0.24, universe: 'extended' },
  { ticker: 'LUXG.L', shortName: 'Global Luxury', fullName: 'Amundi S&P Global Luxury (Acc)', category: 'Thematics', ter: 0.25, universe: 'extended' },
  { ticker: 'DFND.L', shortName: 'Aerospace & Def', fullName: 'iShares Global Aerospace & Defence (Acc)', category: 'Thematics', ter: 0.35, universe: 'extended' },
  { ticker: 'WDEP.L', shortName: 'Europe Defence', fullName: 'WisdomTree Europe Defence (Acc)', category: 'Thematics', ter: 0.4, universe: 'extended' },
  { ticker: 'JEDG.L', shortName: 'Space Tech', fullName: 'VanEck Space Innovators (Acc)', category: 'Thematics', ter: 0.55, universe: 'extended' },
  { ticker: 'QNTG.L', shortName: 'Quantum Comp', fullName: 'VanEck Quantum Computing (Acc)', category: 'Thematics', ter: 0.55, universe: 'extended' },
  { ticker: 'ESGB.L', shortName: 'Gaming & Esports', fullName: 'VanEck Video Gaming and eSports (Acc)', category: 'Thematics', ter: 0.55, universe: 'extended' },
  { ticker: 'XLPE.L', shortName: 'Private Equity', fullName: 'Xtrackers LPX Private Equity Swap (Acc)', category: 'Thematics', ter: 0.7, universe: 'extended' },
  { ticker: 'TRIP.L', shortName: 'Global Travel', fullName: 'US Global Investors Travel (Acc)', category: 'Thematics', ter: 0.69, universe: 'extended' },

  // ── Bonds ──────────────────────────────────────────────
  // Core (9)
  { ticker: 'CSH2.L', shortName: 'UK Cash', fullName: 'Amundi Smart Overnight', category: 'Bonds', ter: 0.05 },
  { ticker: 'IGL5.L', shortName: 'UK Gilts 0-5Y', fullName: 'iShares UK Gilts 0-5yr (Acc)', category: 'Bonds', ter: 0.07 },
  { ticker: 'VGVA.L', shortName: 'UK Gilts Med', fullName: 'Vanguard U.K. Gilt (Acc)', category: 'Bonds', ter: 0.05 },
  { ticker: 'IGLT.L', shortName: 'UK Gilts Broad', fullName: 'iShares Core UK Gilts', category: 'Bonds', ter: 0.07 },
  { ticker: 'VAGS.L', shortName: 'Global Bonds', fullName: 'Vanguard Global Aggregate (hGBP Acc)', category: 'Bonds', ter: 0.10 },
  { ticker: 'IBTG.L', shortName: 'US Treas 1-3Y', fullName: 'iShares $ Treas 1-3yr (hGBP Dist)', category: 'Bonds', ter: 0.10 },
  { ticker: 'IGTM.L', shortName: 'US Treas 7-10Y', fullName: 'iShares $ Treas 7-10yr (hGBP Dist)', category: 'Bonds', ter: 0.10 },
  { ticker: 'IDGA.L', shortName: 'US Treas 20Y+', fullName: 'iShares $ Treas 20+yr (hGBP Acc)', category: 'Bonds', ter: 0.10 },
  { ticker: 'IS15.L', shortName: 'UK Corp 0-5Y', fullName: 'iShares £ Corp Bond 0-5yr', category: 'Bonds', ter: 0.20 },
  // Extended only (10)
  { ticker: 'VUTA.L', shortName: 'US Treas Broad', fullName: 'Vanguard USD Treasury Bonds (Acc)', category: 'Bonds', ter: 0.05, universe: 'extended' },
  { ticker: 'PRIG.L', shortName: 'Global Govt Bond', fullName: 'Amundi Prime Global Government Bond', category: 'Bonds', ter: 0.05, universe: 'extended' },
  { ticker: 'PRIR.L', shortName: 'Euro Govt Bond', fullName: 'Amundi Euro Government Bonds', category: 'Bonds', ter: 0.05, universe: 'extended' },
  { ticker: 'JRBU.L', shortName: 'USD Corp IG', fullName: 'J.P. Morgan USD IG Corporate Bond (Acc)', category: 'Bonds', ter: 0.04, universe: 'extended' },
  { ticker: 'VECP.L', shortName: 'EUR Corp IG', fullName: 'Vanguard EUR Corporate Bond', category: 'Bonds', ter: 0.07, universe: 'extended' },
  { ticker: 'XUHG.L', shortName: 'USD High Yield', fullName: 'Xtrackers USD High Yield Corporate Bond', category: 'Bonds', ter: 0.25, universe: 'extended' },
  { ticker: 'GHYS.L', shortName: 'Global Hi Yield', fullName: 'iShares Global High Yield Corporate Bond', category: 'Bonds', ter: 0.55, universe: 'extended' },
  { ticker: 'SBEM.L', shortName: 'EM Sov Bond', fullName: 'UBS Emerging Markets Sovereign Bonds', category: 'Bonds', ter: 0.25, universe: 'extended' },
  { ticker: 'GILI.L', shortName: 'UK Inflation Lnk', fullName: 'Amundi UK Government Inflation-Linked Bond', category: 'Bonds', ter: 0.07, universe: 'extended' },
  { ticker: 'IBCI.L', shortName: 'EUR Inflation Lnk', fullName: 'iShares EUR Inflation Linked Govt Bond', category: 'Bonds', ter: 0.09, universe: 'extended' },
];


export function getETFList(universe: 'core' | 'extended'): ETFMetadata[] {
  if (universe === 'core') return ETF_LIST.filter(e => e.universe !== 'extended');
  return ETF_LIST;
}

export const CATEGORY_ORDER = [
  'Countries', 'Broad Regions',
  'Sectors US', 'Sectors World', 'Sectors Europe',
  'Factors', 'Commodities', 'Crypto', 'Thematics', 'Bonds',
] as const;

export function getCategories(universe: 'core' | 'extended' = 'core'): string[] {
  const list = getETFList(universe);
  const found = new Set(list.map(etf => etf.category));
  return CATEGORY_ORDER.filter(c => found.has(c));
}

export function getCategoryCounts(universe: 'core' | 'extended' = 'core'): Record<string, number> {
  const counts: Record<string, number> = {};
  getETFList(universe).forEach(etf => {
    counts[etf.category] = (counts[etf.category] || 0) + 1;
  });
  return counts;
}

// Dual momentum comparison tickers — always from core regardless of universe
export const DUAL_MOMENTUM_TICKERS = ['CSH2.L', 'CSP1.L', 'XMWX.L', 'IGLT.L'];

// Legacy exports for any code still referencing these directly
export const CORE_ETF_LIST     = getETFList('core');
export const EXTENDED_ETF_LIST = getETFList('extended');