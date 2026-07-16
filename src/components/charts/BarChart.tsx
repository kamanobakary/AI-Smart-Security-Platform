interface BarData {
  label: string;
  value: number;
  color?: string;
}

interface Props {
  data: BarData[];
  height?: number;
  showValues?: boolean;
}

export default function BarChart({ data, height = 200, showValues = true }: Props) {
  const width = 600;
  const pad = { top: 20, right: 20, bottom: 40, left: 40 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const maxVal = Math.max(...data.map(d => d.value)) * 1.1 || 1;
  const barW = (chartW / data.length) * 0.6;
  const barGap = (chartW / data.length) * 0.4;
  const defaultColor = '#3B82F6';

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: 280 }}>
        {[0, 0.25, 0.5, 0.75, 1].map(t => {
          const y = pad.top + chartH - t * chartH;
          return (
            <g key={t}>
              <line x1={pad.left} y1={y} x2={pad.left + chartW} y2={y}
                stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
              <text x={pad.left - 6} y={y + 4} textAnchor="end" fontSize="9"
                fill="currentColor" opacity="0.4">
                {Math.round(maxVal * t)}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const barH = (d.value / maxVal) * chartH;
          const x = pad.left + i * (barW + barGap) + barGap / 2;
          const y = pad.top + chartH - barH;
          const color = d.color || defaultColor;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} rx="3"
                fill={color} opacity="0.8" />
              <rect x={x} y={y} width={barW} height={Math.min(barH, 4)} rx="2"
                fill={color} />
              {showValues && barH > 16 && (
                <text x={x + barW / 2} y={y + 14} textAnchor="middle" fontSize="9"
                  fill="white" opacity="0.9">{d.value}</text>
              )}
              <text x={x + barW / 2} y={pad.top + chartH + 14} textAnchor="middle"
                fontSize="9" fill="currentColor" opacity="0.5">{d.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
