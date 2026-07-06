import { useState, useEffect, useRef } from 'react';
import { Radio, Wifi, Server, Globe, Activity, Shield, AlertTriangle, RefreshCw } from 'lucide-react';
import { mockEvents, generateTrafficData } from '../lib/mockData';
import AreaChart from './charts/AreaChart';
import type { SecurityEvent, TrafficDataPoint } from '../types';

const attackTypes = [
  'SQL Injection', 'DDoS Attack', 'Brute Force', 'Phishing', 'Malware',
  'Port Scan', 'XSS Attack', 'MITM Attack', 'Ransomware'
];
const countries = ['China', 'Russia', 'USA', 'Germany', 'Brazil', 'Iran', 'Ukraine'];
const protocols = ['TCP', 'UDP', 'HTTP', 'HTTPS', 'SSH', 'FTP'];
const severities = ['critical', 'high', 'medium', 'low'] as const;

function randomIP() {
  return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

const severityColors: Record<string, string> = {
  critical: 'text-red-400 bg-red-500/10 border-red-500/30',
  high: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  low: 'text-green-400 bg-green-500/10 border-green-500/30',
};

export default function RealTimeMonitoring() {
  const [events, setEvents] = useState<SecurityEvent[]>(mockEvents.slice(0, 30));
  const [traffic, setTraffic] = useState<TrafficDataPoint[]>(() => generateTrafficData(24));
  const [running, setRunning] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [stats, setStats] = useState({ blocked: 892, analyzed: 12450, threats: 127, uptime: 99.98 });
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      const newEvent: SecurityEvent = {
        id: `live-${Date.now()}`,
        event_type: attackTypes[Math.floor(Math.random() * attackTypes.length)],
        source_ip: randomIP(),
        destination_ip: `192.168.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 254) + 1}`,
        severity: severities[Math.floor(Math.random() * severities.length)],
        description: 'Comportement suspect détecté par le moteur IA.',
        protocol: protocols[Math.floor(Math.random() * protocols.length)],
        port: [80, 443, 22, 3306, 8080][Math.floor(Math.random() * 5)],
        country: countries[Math.floor(Math.random() * countries.length)],
        status: 'new',
        detected_at: new Date().toISOString(),
      };
      setEvents(prev => [newEvent, ...prev.slice(0, 49)]);
      setTraffic(prev => {
        const next = [...prev.slice(1), {
          time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          inbound: Math.floor(Math.random() * 800 + 200),
          outbound: Math.floor(Math.random() * 500 + 100),
          blocked: Math.floor(Math.random() * 150 + 10),
        }];
        return next;
      });
      setStats(prev => ({
        blocked: prev.blocked + Math.floor(Math.random() * 3),
        analyzed: prev.analyzed + Math.floor(Math.random() * 20 + 5),
        threats: prev.threats + (Math.random() > 0.7 ? 1 : 0),
        uptime: 99.98,
      }));
    }, 2500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const filtered = filterSeverity === 'all' ? events : events.filter(e => e.severity === filterSeverity);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Radio className="w-5 h-5 text-blue-400" /> Surveillance en temps réel
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Analyse du trafic réseau en direct</p>
        </div>
        <button onClick={() => setRunning(r => !r)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${running ? 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20' : 'bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20'}`}>
          {running ? <><span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" /> Pause</> : <><RefreshCw className="w-3.5 h-3.5" /> Reprendre</>}
        </button>
      </div>

      {/* Live stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Paquets analysés', value: stats.analyzed.toLocaleString('fr'), icon: Activity, color: 'text-blue-400' },
          { label: 'Menaces bloquées', value: stats.blocked.toLocaleString('fr'), icon: Shield, color: 'text-green-400' },
          { label: 'Alertes actives', value: stats.threats, icon: AlertTriangle, color: 'text-red-400' },
          { label: 'Disponibilité', value: `${stats.uptime}%`, icon: Server, color: 'text-cyan-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-xs text-slate-500">{s.label}</span>
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Traffic chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Wifi className="w-4 h-4 text-blue-400" /> Trafic réseau en direct
            {running && <span className="flex items-center gap-1 text-xs text-green-400"><span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /> Live</span>}
          </h3>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-400 inline-block rounded" /> Entrant</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-400 inline-block rounded" /> Sortant</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-400 inline-block rounded" /> Bloqué</span>
          </div>
        </div>
        <AreaChart data={traffic} height={200} />
      </div>

      {/* Events stream */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-400" /> Flux d'événements
            {running && <span className="flex items-center gap-1 text-xs text-green-400"><span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping" /> En direct</span>}
          </h3>
          <div className="flex gap-1.5">
            {(['all', 'critical', 'high', 'medium', 'low'] as const).map(s => (
              <button key={s} onClick={() => setFilterSeverity(s)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${filterSeverity === s ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                {s === 'all' ? 'Tous' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-auto max-h-80">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-900">
              <tr className="border-b border-slate-800">
                {['Heure', 'Type d\'attaque', 'IP Source', 'Destination', 'Proto', 'Port', 'Pays', 'Gravité'].map(h => (
                  <th key={h} className="pb-2 pt-1 text-left text-slate-500 font-medium pr-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((ev, idx) => (
                <tr key={ev.id}
                  className={`border-b border-slate-800/40 transition-all ${idx === 0 && running ? 'animate-pulse-once bg-blue-500/5' : 'hover:bg-slate-800/30'}`}>
                  <td className="py-2 pr-3 font-mono text-slate-500 whitespace-nowrap">
                    {new Date(ev.detected_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="py-2 pr-3 text-slate-200 font-medium whitespace-nowrap">{ev.event_type}</td>
                  <td className="py-2 pr-3 font-mono text-slate-400">{ev.source_ip}</td>
                  <td className="py-2 pr-3 font-mono text-slate-500">{ev.destination_ip}</td>
                  <td className="py-2 pr-3 text-slate-400">{ev.protocol}</td>
                  <td className="py-2 pr-3 text-slate-500">{ev.port}</td>
                  <td className="py-2 pr-3 text-slate-400">{ev.country}</td>
                  <td className="py-2">
                    <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold uppercase ${severityColors[ev.severity]}`}>
                      {ev.severity}
                    </span>
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
