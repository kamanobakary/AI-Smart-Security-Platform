import { useState } from 'react';
import type { TrafficDataPoint } from '../../types';

interface Props {
  data: TrafficDataPoint[];
  height?: number;
}

export default function AreaChart({ data, height = 200 }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);
  const width = 800;
  const pad = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const maxVal = Math.max(...data.flatMap(d => [d.inbound, d.outbound, d.blocked])) * 1.1;
  const xStep = chartW / (data.length - 1);

  function toX(i: number) { return pad.left + i * xStep; }
  function toY(v: number) { return pad.top + chartH - (v / maxVal) * chartH; }

  function buildPath(key: keyof TrafficDataPoint) {
    return data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(d[key] as number)}`).join(' ');
  }

  function buildArea(key: keyof TrafficDataPoint) {
    const line = buildPath(key);
    return `${line} L${toX(data.length - 1)},${pad.top + chartH} L${toX(0)},${pad.top + chartH} Z`;
  }

  const yTicks = 5;
  const yTickVals = Array.from({ length: yTicks + 1 }, (_, i) => Math.round((maxVal / yTicks) * i));

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ minWidth: 320 }}
        onMouseLeave={() => setHovered(null)}>
        <defs>
          <linearGradient id="gradIn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="gradOut" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="gradBlocked" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {yTickVals.map(v => (
          <g key={v}>
            <line x1={pad.left} y1={toY(v)} x2={pad.left + chartW} y2={toY(v)}
              stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
            <text x={pad.left - 8} y={toY(v) + 4} textAnchor="end" fontSize="10"
              fill="currentColor" opacity="0.4">{v}</text>
          </g>
        ))}

        {data.map((d, i) => i % 3 === 0 && (
          <text key={i} x={toX(i)} y={height - 4} textAnchor="middle" fontSize="9"
            fill="currentColor" opacity="0.4">{d.time}</text>
        ))}

        <path d={buildArea('inbound')} fill="url(#gradIn)" />
        <path d={buildArea('outbound')} fill="url(#gradOut)" />
        <path d={buildArea('blocked')} fill="url(#gradBlocked)" />

        <path d={buildPath('inbound')} fill="none" stroke="#3B82F6" strokeWidth="2" />
        <path d={buildPath('outbound')} fill="none" stroke="#10B981" strokeWidth="2" />
        <path d={buildPath('blocked')} fill="none" stroke="#EF4444" strokeWidth="1.5" strokeDasharray="4 2" />

        {data.map((d, i) => (
          <rect key={i} x={toX(i) - xStep / 2} y={pad.top} width={xStep} height={chartH}
            fill="transparent" onMouseEnter={() => setHovered(i)} />
        ))}

        {hovered !== null && (
          <g>
            <line x1={toX(hovered)} y1={pad.top} x2={toX(hovered)} y2={pad.top + chartH}
              stroke="white" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="3 3" />
            {(['inbound', 'outbound', 'blocked'] as const).map((key, ki) => {
              const colors = ['#3B82F6', '#10B981', '#EF4444'];
              const val = data[hovered][key] as number;
              return (
                <circle key={key} cx={toX(hovered)} cy={toY(val)} r="4"
                  fill={colors[ki]} stroke="white" strokeWidth="1.5" />
              );
            })}
            <rect x={Math.min(toX(hovered) + 8, width - 110)} y={pad.top + 5} width="100" height="60"
              rx="4" fill="#1E293B" opacity="0.95" />
            <text x={Math.min(toX(hovered) + 58, width - 60)} y={pad.top + 20} textAnchor="middle"
              fontSize="9" fill="#94A3B8">{data[hovered].time}</text>
            {(['inbound', 'outbound', 'blocked'] as const).map((key, ki) => {
              const labels = ['In', 'Out', 'Block'];
              const colors = ['#3B82F6', '#10B981', '#EF4444'];
              return (
                <text key={key} x={Math.min(toX(hovered) + 58, width - 60)} y={pad.top + 32 + ki * 12}
                  textAnchor="middle" fontSize="9" fill={colors[ki]}>
                  {labels[ki]}: {data[hovered][key]}
                </text>
              );
            })}
          </g>
        )}
      </svg>
    </div>
  );
}
