import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface SP500ChartProps {
  data: Array<{ date: string; close: number; volume: number }>;
  dma20: number;
  dma50: number;
}

export function SP500Chart({ data, dma20, dma50 }: SP500ChartProps) {
  // Calculate DMAs for each point
  const chartData = data.map((point, i) => {
    let dma20Value = null;
    let dma50Value = null;

    if (i >= 19) {
      const last20 = data.slice(i - 19, i + 1);
      dma20Value = last20.reduce((sum, p) => sum + p.close, 0) / 20;
    }

    if (i >= 49) {
      const last50 = data.slice(i - 49, i + 1);
      dma50Value = last50.reduce((sum, p) => sum + p.close, 0) / 50;
    }

    return {
      date: point.date,
      close: point.close,
      dma20: dma20Value,
      dma50: dma50Value,
      volume: point.volume
    };
  });

  // Format date for UK format (DD/MM/YYYY)
  const formatDateUK = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Format date for axis (no year)
  const formatDateAxis = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-GB', { month: 'short' });
    return `${day} ${month}`;
  };

  // Format numbers with commas
  const formatNumber = (value: number) => {
    return value.toLocaleString('en-GB', { maximumFractionDigits: 2 });
  };

  // Format volume
  const formatVolume = (value: number) => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(0)}M`;
    return value.toString();
  };

  // Custom tooltip with UK formatting and correct order
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="font-semibold text-slate-900 mb-2">{formatDateUK(data.date)}</p>
          <div className="space-y-1">
            <p className="text-sm text-blue-600 font-medium">
              S&P 500: {formatNumber(data.close)}
            </p>
            <p className="text-sm text-slate-600">
              Volume: {formatVolume(data.volume)}
            </p>
            {data.dma20 && (
              <p className="text-sm text-orange-600">
                20 DMA: {formatNumber(data.dma20)}
              </p>
            )}
            {data.dma50 && (
              <p className="text-sm text-purple-600">
                50 DMA: {formatNumber(data.dma50)}
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        S&P 500 Index - 12 Months
      </h3>

      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            tickFormatter={formatDateAxis}
            interval={Math.floor(chartData.length / 12)}
          />
          <YAxis 
            yAxisId="left" 
            tick={{ fontSize: 12 }} 
            domain={['auto', 'auto']}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            tick={{ fontSize: 12 }}
            tickFormatter={formatVolume}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          
          {/* Price line */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="close"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name="S&P 500"
          />
          
          {/* 20 DMA */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="dma20"
            stroke="#f97316"
            strokeWidth={2}
            dot={false}
            strokeDasharray="5 5"
            name="20 DMA"
          />
          
          {/* 50 DMA */}
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="dma50"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={false}
            strokeDasharray="5 5"
            name="50 DMA"
          />
          
          {/* Volume bars */}
          <Bar
            yAxisId="right"
            dataKey="volume"
            fill="#94a3b8"
            opacity={0.3}
            name="Volume"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}