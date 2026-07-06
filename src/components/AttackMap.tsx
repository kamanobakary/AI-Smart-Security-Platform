import { useState } from 'react';
import type { AttackMapPoint } from '../lib/mockData';

interface Props {
  data: AttackMapPoint[];
}

const severityColors = {
  critical: { fill: '#EF4444', glow: '#EF444460', label: 'Critique' },
  high: { fill: '#F97316', glow: '#F9731660', label: 'Élevé' },
  medium: { fill: '#EAB308', glow: '#EAB30860', label: 'Moyen' },
  low: { fill: '#22C55E', glow: '#22C55E60', label: 'Faible' },
};

// Simple Mercator projection
function project(lat: number, lng: number, width: number, height: number) {
  const x = ((lng + 180) / 360) * width;
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = height / 2 - (mercN * height) / (2 * Math.PI);
  return { x, y };
}

// Simplified world outline paths (key continents as simplified polygons)
const CONTINENTS = [
  // North America
  'M 110,55 L 130,45 L 155,42 L 175,48 L 195,55 L 205,70 L 215,85 L 210,100 L 200,115 L 185,130 L 165,145 L 150,155 L 135,148 L 115,135 L 100,120 L 95,100 L 98,80 Z',
  // South America
  'M 175,165 L 190,158 L 205,165 L 215,180 L 225,200 L 220,220 L 215,240 L 205,255 L 190,265 L 175,255 L 165,240 L 162,220 L 165,200 L 170,180 Z',
  // Europe
  'M 330,55 L 355,45 L 385,42 L 400,50 L 415,60 L 405,75 L 395,85 L 375,90 L 355,88 L 335,80 L 325,68 Z',
  // Africa
  'M 345,105 L 375,98 L 405,100 L 420,115 L 425,135 L 420,165 L 415,190 L 405,210 L 385,225 L 365,230 L 345,220 L 330,200 L 325,175 L 328,150 L 335,125 Z',
  // Russia / North Asia
  'M 410,30 L 480,18 L 560,20 L 610,30 L 640,45 L 620,58 L 580,65 L 520,70 L 460,68 L 420,58 L 405,45 Z',
  // Asia (South)
  'M 450,75 L 500,65 L 560,68 L 610,80 L 635,95 L 640,115 L 625,130 L 595,138 L 555,140 L 520,130 L 490,115 L 460,100 L 445,88 Z',
  // East Asia
  'M 570,80 L 615,72 L 655,75 L 670,90 L 665,108 L 645,120 L 610,125 L 575,118 L 558,104 L 562,90 Z',
  // Australia
  'M 580,200 L 620,192 L 660,196 L 680,210 L 685,228 L 675,242 L 650,250 L 620,252 L 595,245 L 575,230 L 572,215 Z',
  // Southeast Asia
  'M 600,130 L 635,125 L 660,132 L 670,148 L 655,160 L 630,162 L 610,155 L 598,142 Z',
];

export default function AttackMap({ data }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  const W = 780;
  const H = 380;

  const points = data.map(d => {
    const { x, y } = project(d.lat, d.lng, W, H);
    return { ...d, x, y };
  });

  // Paris target (approx)
  const target = project(48.8, 2.35, W, H);

  return (
    <div className="relative bg-slate-950 overflow-hidden" style={{ height: 340 }}>
      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-10"
        style={{ backgroundImage: 'linear-gradient(rgba(59,130,246,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.3) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} className="absolute inset-0">
        <defs>
          {data.map(d => (
            <radialGradient key={`grd-${d.id}`} id={`grd-${d.id}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={severityColors[d.severity].fill} stopOpacity="0.6" />
              <stop offset="100%" stopColor={severityColors[d.severity].fill} stopOpacity="0" />
            </radialGradient>
          ))}
          <radialGradient id="targetGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Continent fills */}
        {CONTINENTS.map((d, i) => (
          <path key={i} d={d} fill="#1e293b" stroke="#334155" strokeWidth="0.8" opacity="0.9" />
        ))}

        {/* Attack lines from sources to Paris target */}
        {points.map(p => {
          const sc = severityColors[p.severity];
          const isHov = hovered === p.id;
          // Cubic bezier control point
          const mx = (p.x + target.x) / 2;
          const my = Math.min(p.y, target.y) - 60;
          return (
            <path key={`line-${p.id}`}
              d={`M ${p.x} ${p.y} Q ${mx} ${my} ${target.x} ${target.y}`}
              fill="none"
              stroke={sc.fill}
              strokeWidth={isHov ? 1.5 : 0.8}
              strokeOpacity={isHov ? 0.8 : 0.25}
              strokeDasharray="4 4"
              style={{ transition: 'stroke-opacity 0.2s, stroke-width 0.2s' }}>
              {isHov && (
                <animate attributeName="stroke-dashoffset" values="0;-8" dur="0.5s" repeatCount="indefinite" />
              )}
            </path>
          );
        })}

        {/* Attack origin circles */}
        {points.map(p => {
          const sc = severityColors[p.severity];
          const r = Math.max(5, Math.min(16, (p.count / 280) * 16));
          return (
            <g key={p.id} style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHovered(p.id)}
              onMouseLeave={() => setHovered(null)}>
              {/* Glow halo */}
              <circle cx={p.x} cy={p.y} r={r + 10} fill={`url(#grd-${p.id})`} opacity="0.5">
                <animate attributeName="r" values={`${r + 6};${r + 14};${r + 6}`} dur="2.5s" repeatCount="indefinite" />
              </circle>
              {/* Main circle */}
              <circle cx={p.x} cy={p.y} r={r}
                fill={sc.fill} fillOpacity={hovered === p.id ? 0.95 : 0.8}
                stroke={sc.fill} strokeWidth="1" strokeOpacity="0.6"
                style={{ filter: `drop-shadow(0 0 ${hovered === p.id ? 8 : 4}px ${sc.fill}80)`, transition: 'all 0.2s' }}>
                <animate attributeName="r" values={`${r};${r + 2};${r}`} dur={`${1.5 + Math.random()}s`} repeatCount="indefinite" />
              </circle>
              {/* Count label */}
              {p.count > 100 && (
                <text x={p.x} y={p.y + 3.5} textAnchor="middle" fontSize="7" fill="white" fontWeight="700" opacity="0.9">{p.count}</text>
              )}
            </g>
          );
        })}

        {/* Paris target marker */}
        <g>
          <circle cx={target.x} cy={target.y} r="16" fill="url(#targetGrad)">
            <animate attributeName="r" values="12;20;12" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx={target.x} cy={target.y} r="5" fill="#3B82F6" stroke="white" strokeWidth="1.5"
            style={{ filter: 'drop-shadow(0 0 6px #3B82F6)' }} />
          <text x={target.x + 8} y={target.y - 8} fontSize="9" fill="#3B82F6" fontWeight="700">Paris (Cible)</text>
        </g>

        {/* Tooltip */}
        {hovered && (() => {
          const p = points.find(pt => pt.id === hovered);
          if (!p) return null;
          const tx = Math.min(p.x + 12, W - 130);
          const ty = Math.max(p.y - 60, 10);
          return (
            <g>
              <rect x={tx - 4} y={ty - 14} width="130" height="62" rx="6" fill="#0f172a" stroke="#334155" strokeWidth="1" opacity="0.95" />
              <text x={tx + 2} y={ty + 2} fontSize="10" fontWeight="700" fill={severityColors[p.severity].fill}>{p.country}</text>
              <text x={tx + 2} y={ty + 16} fontSize="9" fill="#94a3b8">{p.attackType}</text>
              <text x={tx + 2} y={ty + 30} fontSize="9" fill="#64748b">{severityColors[p.severity].label} • {p.count} attaques</text>
            </g>
          );
        })()}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-3 right-3 flex gap-2 flex-wrap justify-end">
        {Object.entries(severityColors).map(([key, val]) => (
          <span key={key} className="flex items-center gap-1 text-[10px] bg-slate-900/80 border border-slate-700 rounded-lg px-2 py-1">
            <span className="w-2 h-2 rounded-full" style={{ background: val.fill, boxShadow: `0 0 4px ${val.fill}` }} />
            <span style={{ color: val.fill }}>{val.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
