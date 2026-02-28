// lib/v5/backtestETFUniverse.ts
//
// ─────────────────────────────────────────────────────────────────────────────
// BACKTEST ETF UNIVERSE
// ─────────────────────────────────────────────────────────────────────────────
//
// This file defines the list of ETFs used by the backtest engine.
// It is SEPARATE from the main screener ETF list (lib/v5/etfList.ts) so you
// can freely customise it without affecting the live screener.
//
// ── HOW TO EDIT ──────────────────────────────────────────────────────────────
//
// TO DISABLE an ETF without deleting it, add // at the start of its line:
//   { ticker: 'VWRL.L', shortName: 'VWRL', fullName: 'Vanguard FTSE All-World', category: 'Global' },
//   becomes:
//   // { ticker: 'VWRL.L', shortName: 'VWRL', fullName: 'Vanguard FTSE All-World', category: 'Global' },
//
// TO ADD an ETF, copy any existing line and change the four fields.
//
// TO CREATE A SMALL FOCUSED LIST, comment out everything except the ETFs you want.
//
// ── REQUIRED FORMAT FOR EACH LINE ────────────────────────────────────────────
//
//   { ticker: 'XXXX.L', shortName: 'XXXX', fullName: 'Full descriptive name', category: 'Category' },
//
//   ticker     — Yahoo Finance ticker symbol, MUST include .L suffix for LSE-listed ETFs.
//                USD-listed ETFs (no .L) are supported but will be in USD — mix with care.
//                Examples: 'VWRL.L', 'SWDA.L', 'SPY' (no .L for US-listed)
//
//   shortName  — Short display label, typically the ticker without .L.
//                Used in charts and table headers. Keep under 8 characters.
//                Example: 'VWRL'
//
//   fullName   — Human-readable full name of the ETF.
//                Used in tooltips and the metadata CSV.
//                Example: 'Vanguard FTSE All-World UCITS ETF'
//
//   category   — Grouping label used for filtering and colour-coding in the backtest.
//                Use consistent names across ETFs in the same group.
//                Suggested categories: 'Global', 'US Equity', 'Europe', 'Asia',
//                'Emerging Markets', 'UK Equity', 'Bonds', 'Commodities',
//                'Property', 'Factor', 'Thematic', 'Cash'
//                You can use any string — categories are auto-populated from this list.
//
// ── NOTES ────────────────────────────────────────────────────────────────────
//
//   - ETFs with insufficient history (fewer than 10 weekly prices in the date range)
//     are automatically skipped during export — no action needed.
//   - The order of ETFs here determines the column order in the exported CSV.
//   - Utility tickers (ERNS, VAGS, SONIA) are added automatically by the export
//     route — do NOT add them here.
//   - If you reduce this list to a small number of ETFs for testing, re-export
//     the CSV before running the backtest — the backtest reads from the CSV.
//
// ─────────────────────────────────────────────────────────────────────────────

export interface BacktestETF {
  ticker:    string;  // Yahoo Finance ticker, e.g. 'VWRL.L'
  shortName: string;  // Short label, e.g. 'VWRL'
  fullName:  string;  // Full name, e.g. 'Vanguard FTSE All-World UCITS ETF'
  category:  string;  // Grouping, e.g. 'Global'
}

export const BACKTEST_ETF_UNIVERSE: BacktestETF[] = [

  // ── Global ────────────────────────────────────────────────────────────────
  { ticker: 'VWRL.L',  shortName: 'VWRL',  fullName: 'Vanguard FTSE All-World UCITS ETF',                          category: 'Global'           },
  { ticker: 'SWDA.L',  shortName: 'SWDA',  fullName: 'iShares Core MSCI World UCITS ETF',                          category: 'Global'           },
  { ticker: 'HMWO.L',  shortName: 'HMWO',  fullName: 'HSBC MSCI World UCITS ETF',                                  category: 'Global'           },
  { ticker: 'XMWX.L',  shortName: 'XMWX',  fullName: 'Xtrackers MSCI World Swap UCITS ETF',                       category: 'Global'           },
  { ticker: 'VEVE.L',  shortName: 'VEVE',  fullName: 'Vanguard FTSE Developed World UCITS ETF',                    category: 'Global'           },

  // ── US Equity ─────────────────────────────────────────────────────────────
  { ticker: 'CSP1.L',  shortName: 'CSP1',  fullName: 'iShares Core S&P 500 UCITS ETF',                             category: 'US Equity'        },
  { ticker: 'VUSA.L',  shortName: 'VUSA',  fullName: 'Vanguard S&P 500 UCITS ETF',                                 category: 'US Equity'        },
  { ticker: 'SPXP.L',  shortName: 'SPXP',  fullName: 'Invesco S&P 500 UCITS ETF',                                  category: 'US Equity'        },
  { ticker: 'CSPX.L',  shortName: 'CSPX',  fullName: 'iShares Core S&P 500 UCITS ETF (Acc)',                       category: 'US Equity'        },
  { ticker: 'INXG.L',  shortName: 'INXG',  fullName: 'iShares S&P 500 GBP Hedged UCITS ETF',                       category: 'US Equity'        },

  // ── Europe ────────────────────────────────────────────────────────────────
  { ticker: 'VEUR.L',  shortName: 'VEUR',  fullName: 'Vanguard FTSE Developed Europe UCITS ETF',                   category: 'Europe'           },
  { ticker: 'IEUR.L',  shortName: 'IEUR',  fullName: 'iShares Core MSCI Europe UCITS ETF',                         category: 'Europe'           },
  { ticker: 'IMEU.L',  shortName: 'IMEU',  fullName: 'iShares MSCI Europe UCITS ETF',                              category: 'Europe'           },
  { ticker: 'EXSA.L',  shortName: 'EXSA',  fullName: 'iShares STOXX Europe 600 UCITS ETF',                         category: 'Europe'           },
  { ticker: 'MEUD.L',  shortName: 'MEUD',  fullName: 'Lyxor Core MSCI EMU DR UCITS ETF',                           category: 'Europe'           },

  // ── UK Equity ─────────────────────────────────────────────────────────────
  { ticker: 'ISF.L',   shortName: 'ISF',   fullName: 'iShares Core FTSE 100 UCITS ETF',                            category: 'UK Equity'        },
  { ticker: 'VUKE.L',  shortName: 'VUKE',  fullName: 'Vanguard FTSE 100 UCITS ETF',                                category: 'UK Equity'        },
  { ticker: 'VMID.L',  shortName: 'VMID',  fullName: 'Vanguard FTSE 250 UCITS ETF',                                category: 'UK Equity'        },
  { ticker: 'VVAL.L',  shortName: 'VVAL',  fullName: 'Vanguard FTSE UK All Share Index UCITS ETF',                 category: 'UK Equity'        },

  // ── Asia Pacific ──────────────────────────────────────────────────────────
  { ticker: 'VAPX.L',  shortName: 'VAPX',  fullName: 'Vanguard FTSE Developed Asia Pacific ex Japan UCITS ETF',    category: 'Asia Pacific'     },
  { ticker: 'VJPN.L',  shortName: 'VJPN',  fullName: 'Vanguard FTSE Japan UCITS ETF',                              category: 'Asia Pacific'     },
  { ticker: 'IJPA.L',  shortName: 'IJPA',  fullName: 'iShares Core MSCI Japan IMI UCITS ETF',                      category: 'Asia Pacific'     },
  { ticker: 'XDJP.L',  shortName: 'XDJP',  fullName: 'Xtrackers Nikkei 225 UCITS ETF',                             category: 'Asia Pacific'     },

  // ── Emerging Markets ──────────────────────────────────────────────────────
  { ticker: 'VFEM.L',  shortName: 'VFEM',  fullName: 'Vanguard FTSE Emerging Markets UCITS ETF',                   category: 'Emerging Markets' },
  { ticker: 'VFEG.L',  shortName: 'VFEG',  fullName: 'Vanguard FTSE Emerging Markets UCITS ETF (GBP)',             category: 'Emerging Markets' },
  { ticker: 'IEMG.L',  shortName: 'IEMG',  fullName: 'iShares Core MSCI Emerging Markets IMI UCITS ETF',           category: 'Emerging Markets' },
  { ticker: 'EMIM.L',  shortName: 'EMIM',  fullName: 'iShares Core MSCI EM IMI UCITS ETF',                         category: 'Emerging Markets' },
  { ticker: 'CEMA.L',  shortName: 'CEMA',  fullName: 'iShares MSCI EM Asia UCITS ETF',                             category: 'Emerging Markets' },

  // ── UK Bonds ──────────────────────────────────────────────────────────────
  { ticker: 'IGLT.L',  shortName: 'IGLT',  fullName: 'iShares Core UK Gilts UCITS ETF',                            category: 'UK Bonds'         },
  { ticker: 'VGOV.L',  shortName: 'VGOV',  fullName: 'Vanguard UK Government Bond UCITS ETF',                      category: 'UK Bonds'         },
  { ticker: 'SLXX.L',  shortName: 'SLXX',  fullName: 'iShares Core £ Corp Bond UCITS ETF',                         category: 'UK Bonds'         },
  { ticker: 'ISXF.L',  shortName: 'ISXF',  fullName: 'iShares £ Index-Linked Gilts UCITS ETF',                     category: 'UK Bonds'         },

  // ── Global Bonds ──────────────────────────────────────────────────────────
  { ticker: 'VAGP.L',  shortName: 'VAGP',  fullName: 'Vanguard Global Aggregate Bond UCITS ETF GBP Hedged',        category: 'Global Bonds'     },
  { ticker: 'AGBP.L',  shortName: 'AGBP',  fullName: 'iShares Global Aggregate Bond UCITS ETF GBP Hedged',         category: 'Global Bonds'     },
  { ticker: 'IGLH.L',  shortName: 'IGLH',  fullName: 'iShares Global Govt Bond UCITS ETF GBP Hedged',              category: 'Global Bonds'     },

  // ── Commodities ───────────────────────────────────────────────────────────
  { ticker: 'SGLN.L',  shortName: 'SGLN',  fullName: 'iShares Physical Gold ETC',                                  category: 'Commodities'      },
  { ticker: 'SSLN.L',  shortName: 'SSLN',  fullName: 'iShares Physical Silver ETC',                                category: 'Commodities'      },
  { ticker: 'PHAU.L',  shortName: 'PHAU',  fullName: 'WisdomTree Physical Gold ETC',                               category: 'Commodities'      },
  { ticker: 'SPLT.L',  shortName: 'SPLT',  fullName: 'iShares Physical Platinum ETC',                              category: 'Commodities'      },
  { ticker: 'SPDM.L',  shortName: 'SPDM',  fullName: 'iShares Physical Palladium ETC',                             category: 'Commodities'      },
  { ticker: 'BCOG.L',  shortName: 'BCOG',  fullName: 'iShares Bloomberg Roll Select Commodity Swap UCITS ETF',     category: 'Commodities'      },

  // ── Property ──────────────────────────────────────────────────────────────
  { ticker: 'IUKP.L',  shortName: 'IUKP',  fullName: 'iShares UK Property UCITS ETF',                              category: 'Property'         },
  { ticker: 'IWDP.L',  shortName: 'IWDP',  fullName: 'iShares Developed Markets Property Yield UCITS ETF',         category: 'Property'         },
  { ticker: 'RGLP.L',  shortName: 'RGLP',  fullName: 'iShares Global REIT UCITS ETF',                              category: 'Property'         },

  // ── Factor ────────────────────────────────────────────────────────────────
  { ticker: 'IWFQ.L',  shortName: 'IWFQ',  fullName: 'iShares Edge MSCI World Quality Factor UCITS ETF',           category: 'Factor'           },
  { ticker: 'IWMO.L',  shortName: 'IWMO',  fullName: 'iShares Edge MSCI World Momentum Factor UCITS ETF',          category: 'Factor'           },
  { ticker: 'IWVL.L',  shortName: 'IWVL',  fullName: 'iShares Edge MSCI World Value Factor UCITS ETF',             category: 'Factor'           },
  { ticker: 'MVOL.L',  shortName: 'MVOL',  fullName: 'iShares Edge MSCI World Minimum Volatility UCITS ETF',       category: 'Factor'           },
  { ticker: 'WSML.L',  shortName: 'WSML',  fullName: 'iShares MSCI World Small Cap UCITS ETF',                     category: 'Factor'           },

  // ── Thematic ──────────────────────────────────────────────────────────────
  { ticker: 'ESPO.L',  shortName: 'ESPO',  fullName: 'VanEck Video Gaming and eSports UCITS ETF',                  category: 'Thematic'         },
  { ticker: 'CLMA.L',  shortName: 'CLMA',  fullName: 'iShares Global Clean Energy UCITS ETF',                      category: 'Thematic'         },
  { ticker: 'INRG.L',  shortName: 'INRG',  fullName: 'iShares Global Clean Energy UCITS ETF (GBP)',                category: 'Thematic'         },
  { ticker: 'WTAI.L',  shortName: 'WTAI',  fullName: 'WisdomTree Artificial Intelligence UCITS ETF',               category: 'Thematic'         },
  { ticker: 'ROBO.L',  shortName: 'ROBO',  fullName: 'ROBO Global Robotics and Automation UCITS ETF',              category: 'Thematic'         },
  { ticker: 'HEAL.L',  shortName: 'HEAL',  fullName: 'iShares Healthcare Innovation UCITS ETF',                    category: 'Thematic'         },
  { ticker: 'DGTL.L',  shortName: 'DGTL',  fullName: 'iShares Digitalisation UCITS ETF',                           category: 'Thematic'         },

  // ── Cash ──────────────────────────────────────────────────────────────────
  { ticker: 'CSH2.L',  shortName: 'CSH2',  fullName: 'iShares £ Ultrashort Bond UCITS ETF',                        category: 'Cash'             },
  { ticker: 'ERNS.L',  shortName: 'ERNS',  fullName: 'iShares £ Ultrashort Bond UCITS ETF (SONIA)',                 category: 'Cash'             },

];