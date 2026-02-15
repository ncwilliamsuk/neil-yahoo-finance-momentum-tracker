interface CompositeGaugeProps {
  score: number;
  zone: string;
  color: string;
  interpretation: string;
}

export function CompositeGauge({ score, zone, color, interpretation }: CompositeGaugeProps) {
  // Calculate needle rotation (0-100 maps to -90deg to 90deg)
  const rotation = (score / 100) * 180 - 90;

  return (
    <div className="flex flex-col items-center p-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-6">
        Composite Volatility Gauge
      </h3>

      {/* SVG Gauge */}
      <svg width="320" height="180" viewBox="0 0 320 180" className="mb-4">
        {/* Background arc segments - 5 zones */}
        {/* Dark Green - Complacent (0-20%) */}
        <path
          d="M 40 160 A 120 120 0 0 1 64 56"
          fill="none"
          stroke="#22c55e"
          strokeWidth="28"
        />
        
        {/* Light Green - Normal (20-40%) */}
        <path
          d="M 64 56 A 120 120 0 0 1 116 24"
          fill="none"
          stroke="#86efac"
          strokeWidth="28"
        />
        
        {/* Yellow - Elevated (40-60%) */}
        <path
          d="M 116 24 A 120 120 0 0 1 204 24"
          fill="none"
          stroke="#fbbf24"
          strokeWidth="28"
        />
        
        {/* Orange - High (60-80%) */}
        <path
          d="M 204 24 A 120 120 0 0 1 256 56"
          fill="none"
          stroke="#f97316"
          strokeWidth="28"
        />
        
        {/* Red - Extreme (80-100%) */}
        <path
          d="M 256 56 A 120 120 0 0 1 280 160"
          fill="none"
          stroke="#ef4444"
          strokeWidth="28"
        />

        {/* Needle */}
        <g transform={`rotate(${rotation} 160 160)`}>
          <line
            x1="160"
            y1="160"
            x2="160"
            y2="60"
            stroke="#1e293b"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx="160" cy="160" r="10" fill="#1e293b" />
        </g>

        {/* Score in center */}
        <text
          x="160"
          y="145"
          textAnchor="middle"
          fontSize="52"
          fontWeight="bold"
          fill="#0f172a"
        >
          {Math.round(score)}
        </text>
      </svg>

      {/* Zone label */}
      <div
        className="px-6 py-2 rounded-full font-semibold text-sm mb-4"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {zone}
      </div>

      {/* Interpretation */}
      <p className="text-sm text-slate-600 text-center max-w-md">
        {interpretation}
      </p>
    </div>
  );
}
