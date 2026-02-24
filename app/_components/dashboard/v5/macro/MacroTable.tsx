// app/_components/dashboard/v5/macro/MacroTable.tsx
'use client';

import { MacroIndicator } from '@/lib/v5/yields';

interface MacroTableProps {
  fred: Record<string, MacroIndicator>;
  marketIndicators: Record<string, MacroIndicator>;  // RENAMED from commodities
  region?: 'US' | 'UK';
}

export function MacroTable({ fred, marketIndicators, region = 'US' }: MacroTableProps) {
  // Define sections with NEW indicators
  const sections = [
    {
      title: 'Policy & Rates',
      keys: ['policy_rate', 'real_rate']
    },
    {
      title: 'Yields',
      keys: region === 'US' 
        ? ['yield_3m', 'yield_2y', 'yield_5y', 'yield_10y', 'yield_30y']
        : ['yield_3m', 'yield_10y']  // UK only has 3M and 10Y
    },
    {
      title: 'Inflation & Growth',
      keys: ['cpi', 'breakeven_10y', 'unemployment', 'm2']  // ADDED breakeven_10y
    },
    {
      title: 'Spreads',
      keys: region === 'US'
        ? ['spread_10y2y', 'spread_10y3m', 'credit_spread']  // ADDED credit_spread
        : ['spread_10y3m', 'credit_spread']  // UK has 10Y-3M and credit spread
    },
    {
      title: 'Economic Indicators',  // RENAMED from "Commodities"
      keys: ['manufacturing', 'retail_sales', 'house_prices', 'dxy', 'gold', 'oil']  // ADDED 3 new + kept original 3
    }
  ];

  // Format value based on type
  const formatValue = (value: number | null, name: string): string => {
    if (value === null) return 'N/A';
    
    // Different formatting for different types
    if (name.includes('M2')) {
      // Trillions
      return `$${(value / 1000).toFixed(2)}T`;
    } else if (name.includes('CPI') || name.includes('Breakeven')) {
      // Percentage
      return `${value.toFixed(1)}%`;
    } else if (name.includes('Dollar Index') || name.includes('Gold') || name.includes('Oil')) {
      // Commodities
      return value.toFixed(2);
    } else if (name.includes('Manufacturing') || name.includes('Retail') || name.includes('House')) {
      // Index values - no % sign
      return value.toFixed(1);
    } else {
      // Percentages (yields, rates, unemployment, spreads)
      return `${value.toFixed(2)}%`;
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-slate-900">
          Macro Indicators
        </h3>
        <p className="text-xs text-slate-600 mt-1">
          Current values with percentile rankings
        </p>
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.title}>
            <h4 className="text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
              {section.title}
            </h4>
            
            <div className="space-y-1">
              {section.keys.map((key) => {
                // Get indicator from either fred or marketIndicators
                const indicator = fred[key] || marketIndicators[key];
                
                if (!indicator) return null;
                
                return (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    {/* Name - fixed width with tooltip */}
                    <span 
                      className="font-medium text-slate-900 w-28 truncate cursor-help" 
                      title={indicator.note || indicator.name}
                    >
                      {indicator.name}
                      {indicator.note && (
                        <span className="ml-1 text-blue-500">ⓘ</span>
                      )}
                    </span>
                    
                    {/* Value */}
                    <span className="font-semibold text-slate-900 w-16 text-right">
                      {formatValue(indicator.current, indicator.name)}
                    </span>
                    
                    {/* Percentile bar - flex grow */}
                    <div className="flex-1 relative h-1.5 bg-slate-100 rounded-full overflow-hidden min-w-0">
                      <div
                        className="absolute left-0 top-0 h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${indicator.percentile}%`,
                          backgroundColor: indicator.status.color
                        }}
                      />
                    </div>
                    
                    {/* Percentile text */}
                    <span className="text-slate-600 w-10 text-right">
                      {indicator.percentile.toFixed(0)}%
                    </span>
                    
                    {/* Status badge */}
                    <span
                      className="px-1.5 py-0.5 rounded text-xs font-medium text-white w-16 text-center"
                      style={{ backgroundColor: indicator.status.color }}
                    >
                      {indicator.status.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
