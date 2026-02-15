interface Metric {
  value: number;
  status: string;
  color: string;
  interpretation: string;
}

interface MetricsTableProps {
  metrics: Record<string, Metric>;
  weights: Record<string, number>;
  onWeightsChange?: (weights: Record<string, number>) => void;
}

export function MetricsTable({ metrics, weights }: MetricsTableProps) {
  const metricOrder = ['VIX', 'VIX3M', 'VVIX', 'MOVE', 'SKEW'];

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
  const isValid = totalWeight === 100;

  return (
    <div>
      <h3 className="text-lg font-semibold text-slate-900 mb-4">
        Individual Volatility Metrics
      </h3>

      <table className="w-full">
        <thead>
          <tr className="border-b-2 border-slate-200">
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
              Weight (%)
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
              Metric
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
              Value
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">
              Interpretation
            </th>
          </tr>
        </thead>
        <tbody>
          {metricOrder.map(key => {
            const metric = metrics[key];
            if (!metric) return null;
            
            const weightKey = key.toLowerCase().replace('_', '');
            
            return (
              <tr key={key} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-slate-700">
                    {weights[weightKey]}%
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-slate-900">{key}</td>
                <td className="px-4 py-3 text-slate-900">{metric.value.toFixed(1)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: metric.color }}
                    />
                    <span className="text-sm font-medium" style={{ color: metric.color }}>
                      {metric.status}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {metric.interpretation}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-4 border-t-2 border-slate-200 pt-3">
        <div className="px-4 py-2 flex items-center gap-3">
          <div className="w-[100px]">
            <span
              className={`text-lg font-bold ${isValid ? 'text-green-600' : 'text-red-600'}`}
            >
              {totalWeight}%
            </span>
          </div>
          <div className="flex-1">
            <span className="text-sm font-medium text-slate-700">
              Total Weight {isValid ? '✓' : '⚠️ Must equal 100%'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}