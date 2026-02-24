'use client';
// app/_components/dashboard/v5/heatmaps/WorldMap.tsx

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ComposableMap, Geographies, Geography, ZoomableGroup } from 'react-simple-maps';
import { Timeframe, COUNTRY_ETFS, getHeatmapColorHex, HEATMAP_LEGEND } from '@/lib/v5/sectors';

// Natural earth projection aspect ratio (width / height)
const MAP_ASPECT_RATIO = 1.75;

interface Props {
  countryReturns: Record<string, Record<Timeframe, number>>;
  tickerReturns:  Record<string, Record<Timeframe, number>>;
}

const TIMEFRAMES: Timeframe[] = ['1D', '1W', '1M', '3M', '6M', '12M'];

const GEO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const COUNTRY_ISO_MAP: Record<string, string> = {
  'USA':          '840',
  'Canada':       '124',
  'Mexico':       '484',
  'Brazil':       '076',
  'Chile':        '152',
  'Argentina':    '032',
  'Peru':         '604',
  'Colombia':     '170',
  'UK':           '826',
  'Germany':      '276',
  'France':       '250',
  'Italy':        '380',
  'Spain':        '724',
  'Switzerland':  '756',
  'Netherlands':  '528',
  'Belgium':      '056',
  'Sweden':       '752',
  'Norway':       '578',
  'Poland':       '616',
  'Austria':      '040',
  'Ireland':      '372',
  'Greece':       '300',
  'Japan':        '392',
  'China':        '156',
  'Hong Kong':    '344',
  'South Korea':  '410',
  'Taiwan':       '158',
  'Singapore':    '702',
  'Australia':    '036',
  'India':        '356',
  'Thailand':     '764',
  'Indonesia':    '360',
  'Malaysia':     '458',
  'Philippines':  '608',
  'Vietnam':      '704',
  'New Zealand':  '554',
  'Israel':       '376',
  'Turkey':       '792',
  'UAE':          '784',
  'Saudi Arabia': '682',
  'South Africa': '710',
  'Egypt':        '818',
};

function buildIsoReturnMap(
  countryReturns: Record<string, Record<Timeframe, number>>,
  tf: Timeframe,
): Record<string, { country: string; ticker: string; ret: number }> {
  const map: Record<string, { country: string; ticker: string; ret: number }> = {};
  for (const [, countries] of Object.entries(COUNTRY_ETFS)) {
    for (const [country, ticker] of Object.entries(countries)) {
      const iso = COUNTRY_ISO_MAP[country];
      if (!iso) continue;
      map[iso] = { country, ticker, ret: countryReturns[country]?.[tf] ?? 0 };
    }
  }
  return map;
}

function buildRankedList(
  countryReturns: Record<string, Record<Timeframe, number>>,
  tf: Timeframe,
) {
  const entries: { country: string; ticker: string; ret: number; region: string }[] = [];
  for (const [region, countries] of Object.entries(COUNTRY_ETFS)) {
    for (const [country, ticker] of Object.entries(countries)) {
      entries.push({ country, ticker, ret: countryReturns[country]?.[tf] ?? 0, region });
    }
  }
  return entries.sort((a, b) => b.ret - a.ret);
}

export default function WorldMap({ countryReturns, tickerReturns }: Props) {
  const [tf, setTf]             = useState<Timeframe>('1M');
  const [tooltip, setTooltip]   = useState<{ country: string; ticker: string; ret: number } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState<{ coordinates: [number, number]; zoom: number }>({
    coordinates: [0, 20],
    zoom: 1,
  });
  const [mapWidth, setMapWidth]   = useState(800);
  const [mapHeight, setMapHeight] = useState(Math.round(800 / MAP_ASPECT_RATIO));
  const mapContainerRef           = useRef<HTMLDivElement>(null);

  // ResizeObserver — recalculate dimensions whenever container width changes
  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0) {
          setMapWidth(w);
          setMapHeight(Math.round(w / MAP_ASPECT_RATIO));
        }
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Scale calculated from width — natural earth default is 153 at 960px wide
  const scale = (mapWidth / 960) * 140;

  const isoMap = useMemo(() => buildIsoReturnMap(countryReturns, tf), [countryReturns, tf]);
  const ranked = useMemo(() => buildRankedList(countryReturns, tf), [countryReturns, tf]);

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">World Stock Markets</h2>
          <p className="text-xs text-slate-500 mt-0.5">Country ETF performance · Scroll to zoom · Drag to pan</p>
        </div>
        <div className="bg-slate-100 rounded-lg p-1 flex gap-1">
          {TIMEFRAMES.map(t => (
            <button
              key={t}
              onClick={() => setTf(t)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                tf === t ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 mb-4">
        {HEATMAP_LEGEND.map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: l.color }} />
            <span className="text-xs text-slate-500">{l.label}</span>
          </div>
        ))}
        <span className="text-xs text-slate-400 ml-2">· Dark = no data</span>
      </div>

      {/* Map + table layout */}
      <div className="flex gap-4 items-stretch">

        {/* Map — height driven by measured width / aspect ratio */}
        <div
          ref={mapContainerRef}
          className="flex-1 bg-slate-900 rounded-xl overflow-hidden relative"
          style={{ height: mapHeight }}
          onMouseMove={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          }}
        >
          <ComposableMap
            projection="geoNaturalEarth1"
            width={mapWidth}
            height={mapHeight}
            style={{ width: '100%', height: '100%' }}
            projectionConfig={{ scale, center: [0, -10] }}
          >
            <ZoomableGroup
              zoom={position.zoom}
              center={position.coordinates}
              onMoveEnd={({ zoom, coordinates }) => setPosition({ zoom, coordinates })}
              minZoom={1}
              maxZoom={6}
            >
              <Geographies geography={GEO_URL}>
                {({ geographies }) =>
                  geographies.map(geo => {
                    const id   = geo.id as string;
                    const data = isoMap[id];
                    const fill = data ? getHeatmapColorHex(data.ret) : '#2a2a2a';
                    const strokeWidth = position.zoom > 3 ? 0.3 : 0.5;
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={fill}
                        stroke="#0f172a"
                        strokeWidth={strokeWidth}
                        style={{
                          default: { outline: 'none' },
                          hover:   { outline: 'none', filter: 'brightness(1.2)', cursor: data ? 'pointer' : 'default' },
                          pressed: { outline: 'none' },
                        }}
                        onMouseEnter={() => { if (data) setTooltip(data); }}
                        onMouseLeave={() => setTooltip(null)}
                      />
                    );
                  })
                }
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>

          {/* Tooltip */}
          {tooltip && (
            <div
              className="absolute z-20 bg-slate-900 border border-slate-600 text-white text-xs rounded-lg px-3 py-2 shadow-xl pointer-events-none"
              style={{ left: Math.min(mousePos.x + 12, 400), top: mousePos.y - 10 }}
            >
              <div className="font-bold text-sm">{tooltip.country}</div>
              <div className="text-slate-400">{tooltip.ticker}</div>
              <div className={`font-semibold mt-0.5 ${tooltip.ret >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {tooltip.ret >= 0 ? '+' : ''}{tooltip.ret.toFixed(2)}%
              </div>
            </div>
          )}

          <div className="absolute bottom-3 right-3 text-slate-500 text-xs">
            Scroll to zoom · Drag to pan
          </div>
        </div>

        {/* Ranked table — stretches to map height via flexbox */}
        <div className="w-52 flex-shrink-0 flex flex-col">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 flex-shrink-0">Rankings</div>
          <div className="space-y-1 flex-1 overflow-y-auto">
            {ranked.map((item, i) => {
              const colorHex = getHeatmapColorHex(item.ret);
              return (
                <div
                  key={item.country}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50"
                >
                  <span className="text-xs text-slate-400 w-5 text-right flex-shrink-0">{i + 1}</span>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colorHex }} />
                  <span className="text-xs text-slate-700 flex-1 truncate">{item.country}</span>
                  <span
                    className="text-xs font-semibold flex-shrink-0"
                    style={{ color: item.ret >= 0 ? '#15803d' : '#b91c1c' }}
                  >
                    {item.ret >= 0 ? '+' : ''}{item.ret.toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
