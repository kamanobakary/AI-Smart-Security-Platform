import { useState } from 'react';

interface DataPoint {
  label: string;
  values: { key: string; value: number; color: string }[];
}

interface Props {
  data: DataPoint[];
  height?: number;
}

export default function LineChart({ data, height = 180 }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);
  const width = 600;
  const pad = { top: 16, right: 20, bottom: 30, left: 40 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const allVals = data.flatMap(d => d.values.map(v => v.value));
  const maxVal = Math.max(...allVals) * 1.15 || 1;
  const keys = data[0]?.values.map(v => v.key) ?? [];

  function toX(i: number) { return pad.left + (i / (data.length - 1)) * chartW; }
  function toY(v: number) { return pad.top + chartH - (v / maxVal) * chartH; }

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: 280 }}
        onMouseLeave={() => setHovered(null)}>
        {[0, 0.25, 0.5, 0.75, 1].map(t => (
          <g key={t}>
            <line x1={pad.left} y1={pad.top + chartH - t * chartH}
              x2={pad.left + chartW} y2={pad.top + chartH - t * chartH}
              stroke="currentColor" strokeOpacity="0.07" strokeWidth="1" />
            <text x={pad.left - 6} y={pad.top + chartH - t * chartH + 4}
              textAnchor="end" fontSize="9" fill="currentColor" opacity="0.35">
              {Math.round(maxVal * t)}
            </text>
          </g>
        ))}

        {keys.map(key => {
          const pts = data.map((d, i) => {
            const v = d.values.find(x => x.key === key);
            return { x: toX(i), y: toY(v?.value ?? 0), color: v?.color ?? '#3B82F6' };
          });
          const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
          return (
            <path key={key} d={pathD} fill="none"
              stroke={pts[0]?.color} strokeWidth="2" strokeLinejoin="round" />
          );
        })}

        {data.map((_, i) => (
          <rect key={i} x={toX(i) - chartW / (data.length * 2)} y={pad.top}
            width={chartW / data.length} height={chartH}
            fill="transparent" onMouseEnter={() => setHovered(i)} />
        ))}

        {data.map((d, i) => i % Math.ceil(data.length / 8) === 0 && (
          <text key={i} x={toX(i)} y={height - 4} textAnchor="middle"
            fontSize="9" fill="currentColor" opacity="0.35">{d.label}</text>
        ))}

        {hovered !== null && (
          <g>
            <line x1={toX(hovered)} y1={pad.top} x2={toX(hovered)} y2={pad.top + chartH}
              stroke="white" strokeOpacity="0.15" strokeWidth="1" />
            {data[hovered].values.map((v) => (
              <circle key={v.key} cx={toX(hovered)} cy={toY(v.value)} r="4"
                fill={v.color} stroke="white" strokeWidth="1.5" />
            ))}
          </g>
        )}
      </svg>
    </div>
  );
}
