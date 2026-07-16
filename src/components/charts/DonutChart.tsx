import { useState } from 'react';

interface Segment {
  label: string;
  value: number;
  color: string;
}

interface Props {
  segments: Segment[];
  size?: number;
  label?: string;
  value?: string;
}

export default function DonutChart({ segments, size = 160, label = '', value = '' }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.42;
  const innerR = size * 0.28;
  const total = segments.reduce((s, d) => s + d.value, 0);

  let angle = -Math.PI / 2;
  const paths = segments.map((seg, i) => {
    const slice = (seg.value / total) * 2 * Math.PI;
    const startAngle = angle;
    angle += slice;
    const endAngle = angle;

    const r = hovered === i ? outerR + 4 : outerR;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const xi1 = cx + innerR * Math.cos(startAngle);
    const yi1 = cy + innerR * Math.sin(startAngle);
    const xi2 = cx + innerR * Math.cos(endAngle);
    const yi2 = cy + innerR * Math.sin(endAngle);
    const large = slice > Math.PI ? 1 : 0;

    return {
      d: `M${xi1},${yi1} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} L${xi2},${yi2} A${innerR},${innerR} 0 ${large},0 ${xi1},${yi1} Z`,
      ...seg,
    };
  });

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {paths.map((p, i) => (
          <path key={i} d={p.d} fill={p.color}
            opacity={hovered === null || hovered === i ? 1 : 0.5}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            style={{ cursor: 'pointer', transition: 'opacity 0.2s' }} />
        ))}
        <text x={cx} y={cy - 8} textAnchor="middle" fontSize="18" fontWeight="700"
          fill="currentColor">{hovered !== null ? segments[hovered].value : value}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize="9" fill="currentColor" opacity="0.5">
          {hovered !== null ? segments[hovered].label : label}
        </text>
      </svg>
      <div className="flex flex-col gap-1.5">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2 cursor-pointer"
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="text-xs text-slate-400 whitespace-nowrap">{s.label}</span>
            <span className="text-xs font-medium ml-1" style={{ color: s.color }}>
              {((s.value / total) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
