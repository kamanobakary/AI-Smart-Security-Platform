import { useState, useMemo, useCallback } from 'react';
import {
  Wifi, Clock, HardDrive, Radio,
  X, AlertTriangle, TrendingUp, Filter, ChevronDown,
  Download, Eye, CheckCircle, XCircle, Info
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type RiskLevel = 'critique' | 'élevé' | 'moyen' | 'faible';

interface TrafficEvent {
  id: string;
  sourceIp: string;
  destIp: string;
  protocol: string;
  volume: string;
  volumeMb: number;
  threshold: number;
  datetime: string;
  risk: RiskLevel;
  exceeded: boolean;
  trendData: number[];
}

interface SuspiciousTimeEvent {
  id: string;
  user: string;
  ip: string;
  datetime: string;
  location: string;
  normalHours: string;
  score: number;
  risk: RiskLevel;
  action: string;
}

interface DataVolumeEvent {
  id: string;
  user: string;
  volume: string;
  volumeMb: number;
  destination: string;
  datetime: string;
  risk: RiskLevel;
  exfilRisk: boolean;
  protocol: string;
}

interface RareProtocolEvent {
  id: string;
  protocol: string;
  host: string;
  occurrences: number;
  datetime: string;
  risk: RiskLevel;
  isUnknown: boolean;
  port: number;
  description: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

function rndDate(hoursBack: number) {
  const d = new Date();
  d.setHours(d.getHours() - Math.floor(Math.random() * hoursBack));
  d.setMinutes(Math.floor(Math.random() * 60));
  return d.toISOString();
}

function rndTrend(base: number, spike: number): number[] {
  return Array.from({ length: 12 }, (_, i) =>
    i === 9 || i === 10 ? base + spike + Math.floor(Math.random() * 20)
    : base + Math.floor(Math.random() * (base * 0.4))
  );
}

export const trafficEvents: TrafficEvent[] = [
  { id: 'tr1', sourceIp: '185.220.101.45', destIp: '10.0.0.12',     protocol: 'TCP',   volume: '4.2 GB', volumeMb: 4300, threshold: 500,  datetime: rndDate(2),  risk: 'critique', exceeded: true,  trendData: rndTrend(200, 900) },
  { id: 'tr2', sourceIp: '91.108.56.22',   destIp: '192.168.1.50',  protocol: 'UDP',   volume: '1.8 GB', volumeMb: 1800, threshold: 300,  datetime: rndDate(4),  risk: 'élevé',    exceeded: true,  trendData: rndTrend(150, 500) },
  { id: 'tr3', sourceIp: '103.224.18.9',   destIp: '10.0.1.8',      protocol: 'ICMP',  volume: '340 MB', volumeMb: 340,  threshold: 100,  datetime: rndDate(7),  risk: 'élevé',    exceeded: true,  trendData: rndTrend(80, 200)  },
  { id: 'tr4', sourceIp: '192.168.2.33',   destIp: '172.16.0.5',    protocol: 'HTTP',  volume: '95 MB',  volumeMb: 95,   threshold: 200,  datetime: rndDate(10), risk: 'moyen',    exceeded: false, trendData: rndTrend(60, 80)   },
  { id: 'tr5', sourceIp: '109.248.10.77',  destIp: '10.0.0.3',      protocol: 'DNS',   volume: '520 MB', volumeMb: 520,  threshold: 50,   datetime: rndDate(15), risk: 'critique', exceeded: true,  trendData: rndTrend(30, 450)  },
  { id: 'tr6', sourceIp: '45.33.32.156',   destIp: '192.168.1.100', protocol: 'HTTPS', volume: '280 MB', volumeMb: 280,  threshold: 400,  datetime: rndDate(20), risk: 'moyen',    exceeded: false, trendData: rndTrend(120, 120) },
  { id: 'tr7', sourceIp: '194.165.16.99',  destIp: '10.0.1.22',     protocol: 'SMB',   volume: '2.1 GB', volumeMb: 2100, threshold: 200,  datetime: rndDate(28), risk: 'élevé',    exceeded: true,  trendData: rndTrend(100, 700) },
  { id: 'tr8', sourceIp: '176.31.100.12',  destIp: '172.16.0.1',    protocol: 'FTP',   volume: '650 MB', volumeMb: 650,  threshold: 150,  datetime: rndDate(35), risk: 'élevé',    exceeded: true,  trendData: rndTrend(70, 350)  },
].sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());

export const suspiciousTimeEvents: SuspiciousTimeEvent[] = [
  { id: 'st1', user: 'j.dupont',  ip: '192.168.1.44', datetime: (() => { const d = new Date(); d.setHours(3, 17); return d.toISOString(); })(),  location: 'Paris, FR',     normalHours: '08:00–18:00', score: 94, risk: 'critique', action: 'Accès base de données' },
  { id: 'st2', user: 'a.martin',  ip: '10.0.0.55',    datetime: (() => { const d = new Date(); d.setHours(1, 42); return d.toISOString(); })(),  location: 'Lyon, FR',      normalHours: '09:00–17:00', score: 87, risk: 'élevé',    action: 'Téléchargement fichiers' },
  { id: 'st3', user: 'm.bernard', ip: '185.220.10.5',  datetime: (() => { const d = new Date(); d.setHours(23, 58); return d.toISOString(); })(), location: 'Moscou, RU',    normalHours: '08:30–18:30', score: 98, risk: 'critique', action: 'Modification permissions' },
  { id: 'st4', user: 's.petit',   ip: '192.168.2.19', datetime: (() => { const d = new Date(); d.setHours(22, 5); return d.toISOString(); })(),  location: 'Bordeaux, FR',  normalHours: '08:00–17:00', score: 71, risk: 'élevé',    action: 'Connexion VPN' },
  { id: 'st5', user: 'c.robert',  ip: '10.0.1.88',    datetime: (() => { const d = new Date(); d.setHours(4, 30); return d.toISOString(); })(),  location: 'Berlin, DE',    normalHours: '09:00–18:00', score: 82, risk: 'élevé',    action: 'Export données CRM' },
  { id: 'st6', user: 'l.moreau',  ip: '91.109.22.11', datetime: (() => { const d = new Date(); d.setHours(2, 15); return d.toISOString(); })(),  location: 'Pékin, CN',     normalHours: '08:00–18:00', score: 99, risk: 'critique', action: 'Accès serveur production' },
  { id: 'st7', user: 'p.simon',   ip: '192.168.1.72', datetime: (() => { const d = new Date(); d.setHours(20, 45); return d.toISOString(); })(), location: 'Toulouse, FR',  normalHours: '09:00–17:30', score: 55, risk: 'moyen',    action: 'Lecture logs système' },
  { id: 'st8', user: 'n.laurent', ip: '10.0.0.34',    datetime: (() => { const d = new Date(); d.setHours(5, 10); return d.toISOString(); })(),  location: 'Téhéran, IR',   normalHours: '08:00–17:00', score: 97, risk: 'critique', action: 'Modification config firewall' },
].sort((a, b) => b.score - a.score);

export const dataVolumeEvents: DataVolumeEvent[] = [
  { id: 'dv1', user: 'j.dupont',  volume: '8.4 GB', volumeMb: 8600,  destination: 'Serveur externe IR',    datetime: rndDate(1),  risk: 'critique', exfilRisk: true,  protocol: 'SSH'   },
  { id: 'dv2', user: 'm.bernard', volume: '3.2 GB', volumeMb: 3300,  destination: 'Dropbox (perso)',        datetime: rndDate(4),  risk: 'élevé',    exfilRisk: true,  protocol: 'HTTPS' },
  { id: 'dv3', user: 'a.martin',  volume: '1.5 GB', volumeMb: 1500,  destination: 'S3 bucket non géré',    datetime: rndDate(7),  risk: 'élevé',    exfilRisk: true,  protocol: 'HTTPS' },
  { id: 'dv4', user: 's.petit',   volume: '780 MB', volumeMb: 780,   destination: 'NAS interne',            datetime: rndDate(12), risk: 'moyen',    exfilRisk: false, protocol: 'SMB'   },
  { id: 'dv5', user: 'l.moreau',  volume: '5.9 GB', volumeMb: 6000,  destination: 'IP inconnue CN',         datetime: rndDate(18), risk: 'critique', exfilRisk: true,  protocol: 'FTP'   },
  { id: 'dv6', user: 'c.robert',  volume: '2.1 GB', volumeMb: 2100,  destination: 'Mega.nz',               datetime: rndDate(24), risk: 'élevé',    exfilRisk: true,  protocol: 'HTTPS' },
  { id: 'dv7', user: 'p.simon',   volume: '430 MB', volumeMb: 430,   destination: 'Google Drive (pro)',     datetime: rndDate(30), risk: 'faible',   exfilRisk: false, protocol: 'HTTPS' },
  { id: 'dv8', user: 'n.laurent', volume: '11.2 GB',volumeMb: 11500, destination: 'C2 Server (KP)',         datetime: rndDate(36), risk: 'critique', exfilRisk: true,  protocol: 'TCP'   },
].sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());

export const rareProtocolEvents: RareProtocolEvent[] = [
  { id: 'rp1', protocol: 'IRC',      host: 'WS-ENG-12',   occurrences: 3,  datetime: rndDate(2),  risk: 'critique', isUnknown: false, port: 6667, description: 'Souvent utilisé par les botnets C2' },
  { id: 'rp2', protocol: 'TFTP',     host: 'SRV-APP-01',  occurrences: 7,  datetime: rndDate(5),  risk: 'élevé',    isUnknown: false, port: 69,   description: 'Transfert non authentifié détecté'  },
  { id: 'rp3', protocol: 'PROTO-X',  host: 'WS-FIN-01',   occurrences: 1,  datetime: rndDate(6),  risk: 'critique', isUnknown: true,  port: 4444, description: 'Protocole inconnu — possible C2'     },
  { id: 'rp4', protocol: 'Telnet',   host: 'SRV-DB-02',   occurrences: 12, datetime: rndDate(9),  risk: 'élevé',    isUnknown: false, port: 23,   description: 'Protocole en clair déprécié'         },
  { id: 'rp5', protocol: 'UNKN-44',  host: '192.168.1.77',occurrences: 2,  datetime: rndDate(12), risk: 'critique', isUnknown: true,  port: 9001, description: 'Signature inconnue — analyse en cours'},
  { id: 'rp6', protocol: 'RPC/DCOM', host: 'WS-HR-05',    occurrences: 28, datetime: rndDate(16), risk: 'moyen',    isUnknown: false, port: 135,  description: 'Mouvement latéral potentiel'         },
  { id: 'rp7', protocol: 'NetBIOS',  host: 'SRV-MAIL',    occurrences: 45, datetime: rndDate(22), risk: 'moyen',    isUnknown: false, port: 137,  description: 'Énumération réseau interne'          },
  { id: 'rp8', protocol: 'UNKN-99',  host: '10.0.1.44',   occurrences: 1,  datetime: rndDate(30), risk: 'élevé',    isUnknown: true,  port: 31337,description: 'Port d\'élite — possible backdoor'  },
].sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());

// ─── Helpers ──────────────────────────────────────────────────────────────────

function riskBadge(risk: RiskLevel) {
  const m: Record<RiskLevel, string> = {
    critique: 'bg-red-500/15 text-red-400 border border-red-500/30',
    élevé:    'bg-orange-500/15 text-orange-400 border border-orange-500/30',
    moyen:    'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
    faible:   'bg-green-500/15 text-green-400 border border-green-500/30',
  };
  return m[risk];
}

function riskDot(risk: RiskLevel) {
  const m: Record<RiskLevel, string> = { critique: 'bg-red-400', élevé: 'bg-orange-400', moyen: 'bg-yellow-400', faible: 'bg-green-400' };
  return m[risk];
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function TrendBars({ data, color, threshold }: { data: number[]; color: string; threshold?: number }) {
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-0.5 h-10">
      {data.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col justify-end gap-0" style={{ height: '100%' }}>
          <div
            className={`rounded-sm transition-all ${threshold && v > threshold ? 'bg-red-500' : color}`}
            style={{ height: `${(v / max) * 100}%`, opacity: 0.35 + (i / data.length) * 0.65 }}
          />
        </div>
      ))}
    </div>
  );
}

function SparkLine({ data, color = '#3B82F6' }: { data: number[]; color?: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 100;
  const h = 32;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-8" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatCard({ label, value, sub, color = 'text-cyan-400' }: { label: string; value: string | number; sub: string; color?: string }) {
  return (
    <div className="bg-slate-800/60 rounded-lg p-2.5 text-center">
      <p className={`text-base font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-white font-medium">{label}</p>
      <p className="text-[9px] text-slate-500">{sub}</p>
    </div>
  );
}

type RiskFilter = RiskLevel | 'tous';
const ALL_RISKS: RiskFilter[] = ['tous', 'critique', 'élevé', 'moyen', 'faible'];

function RiskFilterBar({ risk, setRisk }: { risk: RiskFilter; setRisk: (r: RiskFilter) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {ALL_RISKS.map(r => (
        <button key={r} onClick={() => setRisk(r)}
          className={`text-[10px] px-2 py-0.5 rounded-md border capitalize transition-all ${
            risk === r
              ? r === 'tous' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500 font-semibold'
                : riskBadge(r as RiskLevel) + ' font-semibold'
              : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
          }`}>{r}</button>
      ))}
    </div>
  );
}

function DateSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} onClick={e => e.stopPropagation()}
      className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 rounded-md px-2 py-0.5 focus:outline-none focus:border-slate-600">
      <option value="">Toute période</option>
      <option value="6">6 dernières heures</option>
      <option value="24">Dernières 24h</option>
      <option value="48">Dernières 48h</option>
    </select>
  );
}

function IpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} onClick={e => e.stopPropagation()}
      placeholder="Filtrer IP..."
      className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 rounded-md px-2 py-0.5 focus:outline-none focus:border-slate-600 w-28 placeholder-slate-600" />
  );
}

function UserSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const users = ['j.dupont', 'a.martin', 'm.bernard', 's.petit', 'c.robert', 'l.moreau', 'p.simon', 'n.laurent'];
  return (
    <select value={value} onChange={e => onChange(e.target.value)} onClick={e => e.stopPropagation()}
      className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 rounded-md px-2 py-0.5 focus:outline-none focus:border-slate-600">
      <option value="">Tous les utilisateurs</option>
      {users.map(u => <option key={u} value={u}>{u}</option>)}
    </select>
  );
}

function FilterRow({ children, count }: { children: React.ReactNode; count: number }) {
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
      <Filter className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
      {children}
      <span className="text-[10px] text-slate-500 ml-auto">{count} résultat{count !== 1 ? 's' : ''}</span>
    </div>
  );
}

// ─── Export Helpers ───────────────────────────────────────────────────────────

function exportCSV(rows: Record<string, string | number>[], filename: string) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(';'), ...rows.map(r => headers.map(h => `"${r[h]}"`).join(';'))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function exportPDF(title: string, rows: Record<string, string | number>[], filename: string) {
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const tableRows = rows.map(r =>
    `<tr>${headers.map(h => `<td style="border:1px solid #444;padding:6px 8px;font-size:11px;color:#ccc;">${r[h]}</td>`).join('')}</tr>`
  ).join('');
  const html = `
    <html><head><title>${title}</title>
    <style>body{background:#0f172a;font-family:sans-serif;padding:24px;color:#e2e8f0}
    h2{font-size:16px;margin-bottom:12px;color:#67e8f9}
    table{width:100%;border-collapse:collapse}
    th{background:#1e293b;color:#94a3b8;font-size:10px;padding:6px 8px;border:1px solid #334155;text-align:left}
    </style></head>
    <body>
    <h2>${title} — ${new Date().toLocaleString('fr-FR')}</h2>
    <table><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${tableRows}</tbody></table>
    </body></html>`;
  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); w.print(); }
}

function ExportBar({ onCSV, onPDF }: { onCSV: () => void; onPDF: () => void }) {
  return (
    <div className="flex gap-1.5">
      <button onClick={e => { e.stopPropagation(); onCSV(); }}
        className="text-[10px] px-2.5 py-1 rounded-md border bg-slate-800 text-slate-400 border-slate-700 hover:text-cyan-400 hover:border-cyan-500/40 transition-all flex items-center gap-1">
        <Download className="w-3 h-3" /> CSV
      </button>
      <button onClick={e => { e.stopPropagation(); onPDF(); }}
        className="text-[10px] px-2.5 py-1 rounded-md border bg-slate-800 text-slate-400 border-slate-700 hover:text-cyan-400 hover:border-cyan-500/40 transition-all flex items-center gap-1">
        <Download className="w-3 h-3" /> PDF
      </button>
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({ title, rows, onClose }: {
  title: string;
  rows: { label: string; value: string | number; highlight?: boolean }[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => { e.stopPropagation(); onClose(); }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-slate-900 border border-slate-700 rounded-xl p-5 w-full max-w-md shadow-2xl shadow-black/50"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400" /> {title}
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="flex items-start justify-between gap-4 py-1.5 border-b border-slate-800/60 last:border-0">
              <span className="text-[11px] text-slate-500 flex-shrink-0">{r.label}</span>
              <span className={`text-[11px] font-medium text-right ${r.highlight ? 'text-red-400' : 'text-slate-200'}`}>
                {r.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Traffic Panel ────────────────────────────────────────────────────────────

function TrafficPanel() {
  const [risk, setRisk] = useState<RiskFilter>('tous');
  const [ip, setIp] = useState('');
  const [date, setDate] = useState('');
  const [exceedOnly, setExceedOnly] = useState(false);
  const [detail, setDetail] = useState<TrafficEvent | null>(null);

  const filtered = useMemo(() => trafficEvents.filter(e => {
    if (risk !== 'tous' && e.risk !== risk) return false;
    if (ip && !e.sourceIp.includes(ip) && !e.destIp.includes(ip)) return false;
    if (exceedOnly && !e.exceeded) return false;
    if (date) {
      const cutoff = new Date(); cutoff.setHours(cutoff.getHours() - parseInt(date));
      if (new Date(e.datetime) < cutoff) return false;
    }
    return true;
  }), [risk, ip, date, exceedOnly]);

  const globalTrend = [120, 145, 130, 210, 195, 340, 280, 510, 460, 720, 650, 890];
  const exceededCount = filtered.filter(e => e.exceeded).length;
  const totalVol = filtered.reduce((s, e) => s + e.volumeMb, 0);

  function doExportCSV() {
    exportCSV(filtered.map(e => ({
      'IP Source': e.sourceIp, 'IP Destination': e.destIp, 'Protocole': e.protocol,
      'Volume': e.volume, 'Seuil (MB)': e.threshold, 'Dépassé': e.exceeded ? 'Oui' : 'Non',
      'Date/Heure': fmtDate(e.datetime), 'Risque': e.risk,
    })), 'trafic_anomalies.csv');
  }

  function doExportPDF() {
    exportPDF('Trafic anormal — Anomalies détectées', filtered.map(e => ({
      'IP Source': e.sourceIp, 'IP Destination': e.destIp, 'Protocole': e.protocol,
      'Volume': e.volume, 'Seuil': `${e.threshold} MB`, 'Dépassé': e.exceeded ? 'Oui' : 'Non',
      'Date/Heure': fmtDate(e.datetime), 'Risque': e.risk,
    })), 'trafic_anomalies.pdf');
  }

  return (
    <div className="space-y-3" onClick={e => e.stopPropagation()}>
      {detail && (
        <DetailModal
          title={`Trafic anormal — ${detail.sourceIp}`}
          onClose={() => setDetail(null)}
          rows={[
            { label: 'IP Source', value: detail.sourceIp },
            { label: 'IP Destination', value: detail.destIp },
            { label: 'Protocole', value: detail.protocol },
            { label: 'Volume', value: detail.volume, highlight: detail.exceeded },
            { label: 'Seuil normal', value: `${detail.threshold} MB` },
            { label: 'Dépassement', value: detail.exceeded ? `+${detail.volumeMb - detail.threshold} MB` : 'Non', highlight: detail.exceeded },
            { label: 'Date/Heure', value: fmtDate(detail.datetime) },
            { label: 'Niveau de risque', value: detail.risk.toUpperCase(), highlight: detail.risk === 'critique' },
          ]}
        />
      )}

      <div className="grid grid-cols-4 gap-2">
        <StatCard label="Événements" value={filtered.length} sub="total filtré" />
        <StatCard label="Dépassements" value={exceededCount} sub="seuil franchi" color={exceededCount > 0 ? 'text-red-400' : 'text-cyan-400'} />
        <StatCard label="Volume total" value={totalVol > 1024 ? `${(totalVol / 1024).toFixed(1)} TB` : `${totalVol} MB`} sub="cumulé" />
        <StatCard label="Protocoles" value={new Set(filtered.map(e => e.protocol)).size} sub="distincts" />
      </div>

      {/* Traffic evolution chart */}
      <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-cyan-400" /> Évolution du trafic (12h) — MB/s
          </span>
          <span className="text-[10px] text-red-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Pic détecté +340%
          </span>
        </div>
        <SparkLine data={globalTrend} color="#06B6D4" />
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-slate-600">-12h</span>
          <span className="text-[9px] text-slate-600">maintenant</span>
        </div>
      </div>

      <FilterRow count={filtered.length}>
        <RiskFilterBar risk={risk} setRisk={setRisk} />
        <IpInput value={ip} onChange={setIp} />
        <DateSelect value={date} onChange={setDate} />
        <button onClick={() => setExceedOnly(p => !p)}
          className={`text-[10px] px-2.5 py-0.5 rounded-md border transition-all flex items-center gap-1 ${
            exceedOnly ? 'bg-red-500/20 text-red-300 border-red-500 font-semibold' : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
          }`}>
          <AlertTriangle className="w-3 h-3" /> Dépassements
        </button>
        <ExportBar onCSV={doExportCSV} onPDF={doExportPDF} />
      </FilterRow>

      <div className="bg-slate-800/50 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700/50">
                {['IP Source', 'IP Destination', 'Protocole', 'Volume', 'Seuil', 'Tendance', 'Date/Heure', 'Risque', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] text-slate-500 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-600 text-[10px]">Aucun événement pour ce filtre</td></tr>
                : filtered.map(ev => (
                <tr key={ev.id} className={`border-b border-slate-700/30 hover:bg-slate-800/40 transition-colors ${ev.exceeded ? 'bg-red-500/3' : ''}`}>
                  <td className="px-3 py-2 font-mono text-[10px] text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${riskDot(ev.risk)}`} />
                      {ev.sourceIp}
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-[10px] text-slate-400">{ev.destIp}</td>
                  <td className="px-3 py-2 text-slate-400">{ev.protocol}</td>
                  <td className={`px-3 py-2 font-semibold text-[10px] ${ev.exceeded ? 'text-red-400' : 'text-cyan-400'}`}>{ev.volume}</td>
                  <td className="px-3 py-2 text-slate-500 text-[10px]">{ev.threshold} MB</td>
                  <td className="px-3 py-2 w-20">
                    <TrendBars data={ev.trendData.slice(-6)} color="bg-cyan-500" threshold={ev.threshold} />
                  </td>
                  <td className="px-3 py-2 font-mono text-[10px] text-slate-500 whitespace-nowrap">{fmtDate(ev.datetime)}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-1">
                      <span className={`text-[9px] px-2 py-0.5 rounded font-semibold uppercase ${riskBadge(ev.risk)}`}>{ev.risk}</span>
                      {ev.exceeded && <span className="text-[9px] px-2 py-0.5 rounded font-semibold bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1"><AlertTriangle className="w-2.5 h-2.5" />ALERTE</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <button onClick={() => setDetail(ev)}
                      className="text-[9px] px-2 py-0.5 rounded-md bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white transition-all flex items-center gap-1 whitespace-nowrap">
                      <Eye className="w-3 h-3" /> Détails
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Suspicious Time Panel ────────────────────────────────────────────────────

function SuspiciousTimePanel() {
  const [risk, setRisk] = useState<RiskFilter>('tous');
  const [user, setUser] = useState('');
  const [date, setDate] = useState('');
  const [detail, setDetail] = useState<SuspiciousTimeEvent | null>(null);

  const trendData = [4, 2, 8, 6, 12, 9, 15, 11, 18, 14, 22, 19];

  const filtered = useMemo(() => suspiciousTimeEvents.filter(e => {
    if (risk !== 'tous' && e.risk !== risk) return false;
    if (user && e.user !== user) return false;
    return true;
  }), [risk, user]);

  const avgScore = filtered.length ? Math.round(filtered.reduce((s, e) => s + e.score, 0) / filtered.length) : 0;

  function scoreColor(s: number) {
    if (s >= 90) return 'text-red-400';
    if (s >= 70) return 'text-orange-400';
    if (s >= 50) return 'text-yellow-400';
    return 'text-green-400';
  }

  function doExportCSV() {
    exportCSV(filtered.map(e => ({
      'Utilisateur': e.user, 'IP': e.ip, 'Heure': fmtTime(e.datetime),
      'Localisation': e.location, 'Horaires normaux': e.normalHours,
      'Score risque': e.score, 'Action': e.action, 'Risque': e.risk,
    })), 'connexions_suspectes.csv');
  }

  function doExportPDF() {
    exportPDF('Heures de connexion suspectes', filtered.map(e => ({
      'Utilisateur': e.user, 'IP': e.ip, 'Heure': fmtTime(e.datetime),
      'Localisation': e.location, 'Score': e.score, 'Risque': e.risk,
    })), 'connexions_suspectes.pdf');
  }

  return (
    <div className="space-y-3" onClick={e => e.stopPropagation()}>
      {detail && (
        <DetailModal
          title={`Connexion suspecte — ${detail.user}`}
          onClose={() => setDetail(null)}
          rows={[
            { label: 'Utilisateur', value: detail.user },
            { label: 'Adresse IP', value: detail.ip },
            { label: 'Heure de connexion', value: fmtTime(detail.datetime), highlight: true },
            { label: 'Horaires habituels', value: detail.normalHours },
            { label: 'Localisation', value: detail.location },
            { label: 'Action effectuée', value: detail.action },
            { label: 'Score de risque', value: `${detail.score}/100`, highlight: detail.score >= 80 },
            { label: 'Niveau de risque', value: detail.risk.toUpperCase(), highlight: detail.risk === 'critique' },
          ]}
        />
      )}

      <div className="grid grid-cols-4 gap-2">
        <StatCard label="Connexions" value={filtered.length} sub="hors horaires" />
        <StatCard label="Score moyen" value={`${avgScore}/100`} sub="risque calculé" color={scoreColor(avgScore)} />
        <StatCard label="Critiques" value={filtered.filter(e => e.risk === 'critique').length} sub="score ≥ 90" color="text-red-400" />
        <StatCard label="Pays" value={new Set(filtered.map(e => e.location.split(',')[1]?.trim())).size} sub="origines" />
      </div>

      <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-cyan-400" /> Connexions hors-horaires (12h)
          </span>
          <span className="text-[10px] text-orange-400">+27% vs semaine dernière</span>
        </div>
        <TrendBars data={trendData} color="bg-cyan-500" />
      </div>

      <FilterRow count={filtered.length}>
        <RiskFilterBar risk={risk} setRisk={setRisk} />
        <UserSelect value={user} onChange={setUser} />
        <ExportBar onCSV={doExportCSV} onPDF={doExportPDF} />
      </FilterRow>

      <div className="bg-slate-800/50 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700/50">
                {['Utilisateur', 'IP', 'Heure', 'Localisation', 'Horaires normaux', 'Action', 'Score', 'Risque', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] text-slate-500 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={9} className="px-3 py-6 text-center text-slate-600 text-[10px]">Aucune connexion pour ce filtre</td></tr>
                : filtered.map(ev => (
                <tr key={ev.id} className={`border-b border-slate-700/30 hover:bg-slate-800/40 transition-colors ${ev.risk === 'critique' ? 'bg-red-500/3' : ''}`}>
                  <td className="px-3 py-2 font-medium text-slate-200 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${riskDot(ev.risk)}`} />
                      {ev.user}
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-[10px] text-slate-400">{ev.ip}</td>
                  <td className="px-3 py-2 font-mono font-semibold text-[10px] text-orange-300">{fmtTime(ev.datetime)}</td>
                  <td className="px-3 py-2 text-slate-400 text-[10px] whitespace-nowrap">{ev.location}</td>
                  <td className="px-3 py-2 text-slate-500 text-[10px] whitespace-nowrap">{ev.normalHours}</td>
                  <td className="px-3 py-2 text-slate-400 text-[10px] max-w-36 truncate">{ev.action}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-14 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${ev.score >= 90 ? 'bg-red-500' : ev.score >= 70 ? 'bg-orange-500' : 'bg-yellow-500'}`}
                          style={{ width: `${ev.score}%` }} />
                      </div>
                      <span className={`text-[10px] font-bold ${scoreColor(ev.score)}`}>{ev.score}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-[9px] px-2 py-0.5 rounded font-semibold uppercase ${riskBadge(ev.risk)}`}>{ev.risk}</span>
                  </td>
                  <td className="px-3 py-2">
                    <button onClick={() => setDetail(ev)}
                      className="text-[9px] px-2 py-0.5 rounded-md bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white transition-all flex items-center gap-1 whitespace-nowrap">
                      <Eye className="w-3 h-3" /> Détails
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Data Volume Panel ────────────────────────────────────────────────────────

function DataVolumePanel() {
  const [risk, setRisk] = useState<RiskFilter>('tous');
  const [user, setUser] = useState('');
  const [date, setDate] = useState('');
  const [exfilOnly, setExfilOnly] = useState(false);
  const [detail, setDetail] = useState<DataVolumeEvent | null>(null);

  const trendData = [180, 240, 200, 380, 320, 550, 490, 720, 660, 940, 870, 1120];

  const filtered = useMemo(() => dataVolumeEvents.filter(e => {
    if (risk !== 'tous' && e.risk !== risk) return false;
    if (user && e.user !== user) return false;
    if (exfilOnly && !e.exfilRisk) return false;
    if (date) {
      const cutoff = new Date(); cutoff.setHours(cutoff.getHours() - parseInt(date));
      if (new Date(e.datetime) < cutoff) return false;
    }
    return true;
  }), [risk, user, date, exfilOnly]);

  const totalVol = filtered.reduce((s, e) => s + e.volumeMb, 0);
  const exfilCount = filtered.filter(e => e.exfilRisk).length;

  function doExportCSV() {
    exportCSV(filtered.map(e => ({
      'Utilisateur': e.user, 'Volume': e.volume, 'Destination': e.destination,
      'Protocole': e.protocol, 'Risque exfiltration': e.exfilRisk ? 'Oui' : 'Non',
      'Date/Heure': fmtDate(e.datetime), 'Risque': e.risk,
    })), 'volumes_donnees.csv');
  }

  function doExportPDF() {
    exportPDF('Volume de données inhabituel', filtered.map(e => ({
      'Utilisateur': e.user, 'Volume': e.volume, 'Destination': e.destination,
      'Risque exfil': e.exfilRisk ? 'Oui' : 'Non', 'Risque': e.risk,
    })), 'volumes_donnees.pdf');
  }

  return (
    <div className="space-y-3" onClick={e => e.stopPropagation()}>
      {detail && (
        <DetailModal
          title={`Volume inhabituel — ${detail.user}`}
          onClose={() => setDetail(null)}
          rows={[
            { label: 'Utilisateur', value: detail.user },
            { label: 'Volume transféré', value: detail.volume, highlight: detail.exfilRisk },
            { label: 'Destination', value: detail.destination, highlight: detail.exfilRisk },
            { label: 'Protocole', value: detail.protocol },
            { label: 'Date/Heure', value: fmtDate(detail.datetime) },
            { label: 'Risque d\'exfiltration', value: detail.exfilRisk ? 'DÉTECTÉ' : 'Faible', highlight: detail.exfilRisk },
            { label: 'Niveau de risque', value: detail.risk.toUpperCase(), highlight: detail.risk === 'critique' },
          ]}
        />
      )}

      <div className="grid grid-cols-4 gap-2">
        <StatCard label="Transferts" value={filtered.length} sub="anormaux" />
        <StatCard label="Volume total" value={totalVol > 10000 ? `${(totalVol / 1024).toFixed(1)} TB` : `${(totalVol / 1024).toFixed(2)} GB`} sub="cumulé" />
        <StatCard label="Exfiltration" value={exfilCount} sub="risques détectés" color={exfilCount > 0 ? 'text-red-400' : 'text-cyan-400'} />
        <StatCard label="Comptes" value={new Set(filtered.map(e => e.user)).size} sub="impliqués" />
      </div>

      <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-cyan-400" /> Volumes transférés (12h) — MB
          </span>
          <span className="text-[10px] text-red-400">+52% vs médiane</span>
        </div>
        <SparkLine data={trendData} color="#06B6D4" />
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-slate-600">-12h</span>
          <span className="text-[9px] text-slate-600">maintenant</span>
        </div>
      </div>

      <FilterRow count={filtered.length}>
        <RiskFilterBar risk={risk} setRisk={setRisk} />
        <UserSelect value={user} onChange={setUser} />
        <DateSelect value={date} onChange={setDate} />
        <button onClick={() => setExfilOnly(p => !p)}
          className={`text-[10px] px-2.5 py-0.5 rounded-md border transition-all flex items-center gap-1 ${
            exfilOnly ? 'bg-red-500/20 text-red-300 border-red-500 font-semibold' : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
          }`}>
          Risque exfiltration
        </button>
        <ExportBar onCSV={doExportCSV} onPDF={doExportPDF} />
      </FilterRow>

      <div className="bg-slate-800/50 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700/50">
                {['Utilisateur', 'Volume', 'Destination', 'Protocole', 'Date/Heure', 'Exfil.', 'Risque', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] text-slate-500 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-600 text-[10px]">Aucun transfert pour ce filtre</td></tr>
                : filtered.map(ev => (
                <tr key={ev.id} className={`border-b border-slate-700/30 hover:bg-slate-800/40 transition-colors ${ev.exfilRisk ? 'bg-red-500/3' : ''}`}>
                  <td className="px-3 py-2 font-medium text-slate-200 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${riskDot(ev.risk)}`} />
                      {ev.user}
                    </div>
                  </td>
                  <td className={`px-3 py-2 font-bold text-[10px] ${ev.risk === 'critique' ? 'text-red-400' : ev.risk === 'élevé' ? 'text-orange-400' : 'text-cyan-400'}`}>
                    {ev.volume}
                  </td>
                  <td className="px-3 py-2 text-slate-400 text-[10px] max-w-36 truncate">{ev.destination}</td>
                  <td className="px-3 py-2 text-slate-500">{ev.protocol}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-slate-500 whitespace-nowrap">{fmtDate(ev.datetime)}</td>
                  <td className="px-3 py-2">
                    {ev.exfilRisk
                      ? <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1 w-fit"><AlertTriangle className="w-2.5 h-2.5" />OUI</span>
                      : <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-green-500/15 text-green-400 border border-green-500/30 flex items-center gap-1 w-fit"><CheckCircle className="w-2.5 h-2.5" />NON</span>
                    }
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-[9px] px-2 py-0.5 rounded font-semibold uppercase ${riskBadge(ev.risk)}`}>{ev.risk}</span>
                  </td>
                  <td className="px-3 py-2">
                    <button onClick={() => setDetail(ev)}
                      className="text-[9px] px-2 py-0.5 rounded-md bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white transition-all flex items-center gap-1 whitespace-nowrap">
                      <Eye className="w-3 h-3" /> Détails
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Rare Protocols Panel ─────────────────────────────────────────────────────

function RareProtocolsPanel() {
  const [risk, setRisk] = useState<RiskFilter>('tous');
  const [ip, setIp] = useState('');
  const [unknownOnly, setUnknownOnly] = useState(false);
  const [detail, setDetail] = useState<RareProtocolEvent | null>(null);

  const trendData = [2, 3, 2, 5, 4, 7, 6, 9, 8, 12, 10, 15];

  const filtered = useMemo(() => rareProtocolEvents.filter(e => {
    if (risk !== 'tous' && e.risk !== risk) return false;
    if (ip && !e.host.includes(ip)) return false;
    if (unknownOnly && !e.isUnknown) return false;
    return true;
  }), [risk, ip, unknownOnly]);

  const unknownCount = filtered.filter(e => e.isUnknown).length;

  function doExportCSV() {
    exportCSV(filtered.map(e => ({
      'Protocole': e.protocol, 'Hôte': e.host, 'Port': e.port,
      'Occurrences': e.occurrences, 'Inconnu': e.isUnknown ? 'Oui' : 'Non',
      'Description': e.description, 'Date/Heure': fmtDate(e.datetime), 'Risque': e.risk,
    })), 'protocoles_rares.csv');
  }

  function doExportPDF() {
    exportPDF('Protocoles rares détectés', filtered.map(e => ({
      'Protocole': e.protocol, 'Hôte': e.host, 'Port': e.port,
      'Occurrences': e.occurrences, 'Inconnu': e.isUnknown ? 'Oui' : 'Non', 'Risque': e.risk,
    })), 'protocoles_rares.pdf');
  }

  return (
    <div className="space-y-3" onClick={e => e.stopPropagation()}>
      {detail && (
        <DetailModal
          title={`Protocole rare — ${detail.protocol}`}
          onClose={() => setDetail(null)}
          rows={[
            { label: 'Protocole', value: detail.protocol, highlight: detail.isUnknown },
            { label: 'Hôte concerné', value: detail.host },
            { label: 'Port', value: detail.port },
            { label: 'Occurrences', value: detail.occurrences },
            { label: 'Description', value: detail.description },
            { label: 'Date/Heure', value: fmtDate(detail.datetime) },
            { label: 'Protocole inconnu', value: detail.isUnknown ? 'OUI — Analyse requise' : 'Non', highlight: detail.isUnknown },
            { label: 'Niveau de risque', value: detail.risk.toUpperCase(), highlight: detail.risk === 'critique' },
          ]}
        />
      )}

      <div className="grid grid-cols-4 gap-2">
        <StatCard label="Protocoles" value={filtered.length} sub="détectés" />
        <StatCard label="Inconnus" value={unknownCount} sub="non référencés" color={unknownCount > 0 ? 'text-red-400' : 'text-cyan-400'} />
        <StatCard label="Occurrences" value={filtered.reduce((s, e) => s + e.occurrences, 0)} sub="total" />
        <StatCard label="Hôtes" value={new Set(filtered.map(e => e.host)).size} sub="concernés" />
      </div>

      {unknownCount > 0 && (
        <div className="flex items-start gap-3 p-3 bg-red-500/8 border border-red-500/25 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-semibold text-red-300">Protocole(s) inconnu(s) détecté(s)</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {unknownCount} protocole{unknownCount > 1 ? 's' : ''} non référencé{unknownCount > 1 ? 's' : ''} identifié{unknownCount > 1 ? 's' : ''} sur le réseau. Une analyse immédiate est recommandée — possible activité C2 ou backdoor.
            </p>
          </div>
        </div>
      )}

      <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-cyan-400" /> Détections de protocoles rares (12h)
          </span>
          <span className="text-[10px] text-orange-400">+19% cette semaine</span>
        </div>
        <TrendBars data={trendData} color="bg-cyan-500" />
      </div>

      <FilterRow count={filtered.length}>
        <RiskFilterBar risk={risk} setRisk={setRisk} />
        <IpInput value={ip} onChange={setIp} />
        <button onClick={() => setUnknownOnly(p => !p)}
          className={`text-[10px] px-2.5 py-0.5 rounded-md border transition-all flex items-center gap-1 ${
            unknownOnly ? 'bg-red-500/20 text-red-300 border-red-500 font-semibold' : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
          }`}>
          <XCircle className="w-3 h-3" /> Inconnus uniquement
        </button>
        <ExportBar onCSV={doExportCSV} onPDF={doExportPDF} />
      </FilterRow>

      <div className="bg-slate-800/50 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700/50">
                {['Protocole', 'Hôte', 'Port', 'Occurrences', 'Description', 'Date/Heure', 'Risque', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] text-slate-500 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-600 text-[10px]">Aucun protocole pour ce filtre</td></tr>
                : filtered.map(ev => (
                <tr key={ev.id} className={`border-b border-slate-700/30 hover:bg-slate-800/40 transition-colors ${ev.isUnknown ? 'bg-red-500/3' : ''}`}>
                  <td className="px-3 py-2 font-mono font-semibold text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${riskDot(ev.risk)}`} />
                      <span className={ev.isUnknown ? 'text-red-300' : 'text-cyan-300'}>{ev.protocol}</span>
                      {ev.isUnknown && <span className="text-[8px] px-1 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-semibold">INCONNU</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-[10px] text-slate-300">{ev.host}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-slate-500">{ev.port}</td>
                  <td className={`px-3 py-2 font-bold text-[10px] ${ev.occurrences > 20 ? 'text-orange-400' : ev.occurrences > 5 ? 'text-yellow-400' : 'text-slate-300'}`}>
                    {ev.occurrences}
                  </td>
                  <td className="px-3 py-2 text-slate-400 text-[10px] max-w-44 truncate">{ev.description}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-slate-500 whitespace-nowrap">{fmtDate(ev.datetime)}</td>
                  <td className="px-3 py-2">
                    <span className={`text-[9px] px-2 py-0.5 rounded font-semibold uppercase ${riskBadge(ev.risk)}`}>{ev.risk}</span>
                  </td>
                  <td className="px-3 py-2">
                    <button onClick={() => setDetail(ev)}
                      className="text-[9px] px-2 py-0.5 rounded-md bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white transition-all flex items-center gap-1 whitespace-nowrap">
                      <Eye className="w-3 h-3" /> Détails
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type AnomalyTechnique = 'Trafic anormal' | 'Heure de connexion suspecte' | 'Volume de données inhabituel' | 'Protocoles rares';

const anomalyTechniques: Array<{ id: AnomalyTechnique; icon: typeof Wifi; count: number; label: string }> = [
  { id: 'Trafic anormal',               icon: Wifi,      count: trafficEvents.length,       label: 'pics détectés'      },
  { id: 'Heure de connexion suspecte',  icon: Clock,     count: suspiciousTimeEvents.length, label: 'connexions suspectes' },
  { id: 'Volume de données inhabituel', icon: HardDrive, count: dataVolumeEvents.length,     label: 'transferts anormaux' },
  { id: 'Protocoles rares',             icon: Radio,     count: rareProtocolEvents.length,   label: 'protocoles détectés' },
];

interface AnomalyPanelProps {
  onStopPropagation: (e: React.MouseEvent) => void;
}

export default function AnomalyPanel({ onStopPropagation }: AnomalyPanelProps) {
  const [activeTech, setActiveTech] = useState<AnomalyTechnique | null>(null);

  const toggle = useCallback((e: React.MouseEvent, tech: AnomalyTechnique) => {
    e.stopPropagation();
    setActiveTech(prev => prev === tech ? null : tech);
  }, []);

  return (
    <div className="mt-4 pt-3 border-t border-slate-800" onClick={onStopPropagation}>
      <p className="text-xs text-slate-400 mb-3">Détection des déviations statistiques par rapport au comportement normal.</p>

      {/* Technique buttons */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <button
          onClick={e => { e.stopPropagation(); setActiveTech(null); }}
          className={`text-[10px] px-2.5 py-1 rounded-md border transition-all font-medium ${
            activeTech === null
              ? 'bg-cyan-500/25 text-cyan-300 border-cyan-500 shadow-sm shadow-cyan-500/20 font-semibold'
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600 hover:text-slate-300'
          }`}
        >
          Tous
          <span className={`ml-1.5 font-bold ${activeTech === null ? 'text-cyan-200' : 'text-slate-500'}`}>(134)</span>
        </button>

        {anomalyTechniques.map(tech => {
          const Icon = tech.icon;
          const isActive = activeTech === tech.id;
          return (
            <button key={tech.id} onClick={e => toggle(e, tech.id)}
              className={`text-[10px] px-2.5 py-1 rounded-md border transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'bg-cyan-500/25 text-cyan-300 border-cyan-500 shadow-sm shadow-cyan-500/20 font-semibold'
                  : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:border-cyan-500/50 hover:bg-cyan-500/20 cursor-pointer'
              }`}
            >
              <Icon className="w-3 h-3" />
              {tech.id}
              <span className={`font-bold ${isActive ? 'text-cyan-200' : 'text-slate-500'}`}>({tech.count})</span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isActive ? 'rotate-180' : ''}`} />
            </button>
          );
        })}
      </div>

      {/* Active label */}
      {activeTech && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
            {activeTech}
            <span className="text-cyan-400 font-bold ml-1">
              • {anomalyTechniques.find(t => t.id === activeTech)?.count} {anomalyTechniques.find(t => t.id === activeTech)?.label}
            </span>
          </span>
          <button onClick={e => { e.stopPropagation(); setActiveTech(null); }}
            className="text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {activeTech === 'Trafic anormal'               && <TrafficPanel />}
      {activeTech === 'Heure de connexion suspecte'  && <SuspiciousTimePanel />}
      {activeTech === 'Volume de données inhabituel' && <DataVolumePanel />}
      {activeTech === 'Protocoles rares'             && <RareProtocolsPanel />}
    </div>
  );
}
