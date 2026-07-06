import { useState, useMemo } from 'react';
import { Database, Network, ShieldAlert, MapPin, X, AlertTriangle, TrendingUp, Filter, ChevronDown } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type RiskLevel = 'critique' | 'élevé' | 'moyen' | 'faible';

interface ExfilEvent {
  id: string;
  user: string;
  ip: string;
  volume: string;
  volumeBytes: number;
  datetime: string;
  destination: string;
  risk: RiskLevel;
  protocol: string;
}

interface LateralEvent {
  id: string;
  sourceMachine: string;
  sourceIp: string;
  targetMachine: string;
  targetIp: string;
  attempts: number;
  datetime: string;
  protocol: string;
  isAnomalous: boolean;
}

interface PrivilegeEvent {
  id: string;
  user: string;
  oldRole: string;
  newRole: string;
  datetime: string;
  authorizedBy: string;
  risk: RiskLevel;
  isUnauthorized: boolean;
}

interface UnusualAccessEvent {
  id: string;
  user: string;
  country: string;
  ip: string;
  device: string;
  datetime: string;
  reason: string;
  risk: RiskLevel;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

function randomDate(hoursBack: number) {
  const d = new Date();
  d.setHours(d.getHours() - Math.floor(Math.random() * hoursBack));
  d.setMinutes(Math.floor(Math.random() * 60));
  return d.toISOString();
}

const users = ['j.dupont', 'a.martin', 'm.bernard', 's.petit', 'c.robert', 'l.moreau', 'p.simon', 'n.laurent'];
const internalIPs = ['192.168.1.', '192.168.2.', '10.0.0.', '10.0.1.'];
const machines = ['WS-FIN-01', 'WS-ENG-12', 'SRV-DB-02', 'SRV-APP-01', 'WS-HR-05', 'SRV-LDAP', 'WS-DEV-08', 'SRV-MAIL'];

function rndIP(prefix = '') {
  return prefix + (Math.floor(Math.random() * 254) + 1);
}

export const exfilEvents: ExfilEvent[] = [
  { id: 'ex1',  user: 'j.dupont',   ip: rndIP('192.168.1.'), volume: '2.4 GB', volumeBytes: 2400, datetime: randomDate(2),  destination: 'Dropbox externe',     risk: 'critique', protocol: 'HTTPS' },
  { id: 'ex2',  user: 'a.martin',   ip: rndIP('10.0.0.'),    volume: '847 MB', volumeBytes: 847,  datetime: randomDate(5),  destination: 'IP inconnue (CN)',     risk: 'élevé',    protocol: 'FTP'   },
  { id: 'ex3',  user: 'm.bernard',  ip: rndIP('192.168.2.'), volume: '128 MB', volumeBytes: 128,  datetime: randomDate(8),  destination: 'Google Drive',         risk: 'moyen',    protocol: 'HTTPS' },
  { id: 'ex4',  user: 's.petit',    ip: rndIP('10.0.1.'),    volume: '3.1 GB', volumeBytes: 3100, datetime: randomDate(12), destination: 'Serveur RU inconnu',   risk: 'critique', protocol: 'SSH'   },
  { id: 'ex5',  user: 'c.robert',   ip: rndIP('192.168.1.'), volume: '45 MB',  volumeBytes: 45,   datetime: randomDate(18), destination: 'OneDrive personnel',   risk: 'faible',   protocol: 'HTTPS' },
  { id: 'ex6',  user: 'l.moreau',   ip: rndIP('10.0.0.'),    volume: '980 MB', volumeBytes: 980,  datetime: randomDate(24), destination: 'IP inconnue (KP)',     risk: 'élevé',    protocol: 'DNS'   },
  { id: 'ex7',  user: 'p.simon',    ip: rndIP('192.168.2.'), volume: '210 MB', volumeBytes: 210,  datetime: randomDate(30), destination: 'Mega.nz',             risk: 'moyen',    protocol: 'HTTPS' },
  { id: 'ex8',  user: 'n.laurent',  ip: rndIP('10.0.1.'),    volume: '4.8 GB', volumeBytes: 4800, datetime: randomDate(36), destination: 'C2 Server (IR)',       risk: 'critique', protocol: 'TCP'   },
].sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());

export const lateralEvents: LateralEvent[] = [
  { id: 'lat1', sourceMachine: 'WS-ENG-12', sourceIp: rndIP('192.168.1.'), targetMachine: 'SRV-DB-02',   targetIp: rndIP('10.0.0.'), attempts: 47,  datetime: randomDate(1),  protocol: 'SMB',  isAnomalous: true  },
  { id: 'lat2', sourceMachine: 'WS-FIN-01', sourceIp: rndIP('192.168.2.'), targetMachine: 'SRV-LDAP',    targetIp: rndIP('10.0.0.'), attempts: 23,  datetime: randomDate(3),  protocol: 'LDAP', isAnomalous: true  },
  { id: 'lat3', sourceMachine: 'WS-HR-05',  sourceIp: rndIP('10.0.1.'),    targetMachine: 'SRV-APP-01',  targetIp: rndIP('10.0.0.'), attempts: 8,   datetime: randomDate(6),  protocol: 'RDP',  isAnomalous: false },
  { id: 'lat4', sourceMachine: 'SRV-MAIL',  sourceIp: rndIP('10.0.0.'),    targetMachine: 'SRV-DB-02',   targetIp: rndIP('10.0.0.'), attempts: 134, datetime: randomDate(9),  protocol: 'SSH',  isAnomalous: true  },
  { id: 'lat5', sourceMachine: 'WS-DEV-08', sourceIp: rndIP('192.168.1.'), targetMachine: 'WS-FIN-01',   targetIp: rndIP('192.168.2.'), attempts: 3, datetime: randomDate(14), protocol: 'WMI', isAnomalous: false },
  { id: 'lat6', sourceMachine: 'WS-HR-05',  sourceIp: rndIP('10.0.1.'),    targetMachine: 'SRV-LDAP',    targetIp: rndIP('10.0.0.'), attempts: 61,  datetime: randomDate(20), protocol: 'LDAP', isAnomalous: true  },
  { id: 'lat7', sourceMachine: 'SRV-APP-01',sourceIp: rndIP('10.0.0.'),    targetMachine: 'SRV-DB-02',   targetIp: rndIP('10.0.0.'), attempts: 12,  datetime: randomDate(28), protocol: 'TCP',  isAnomalous: false },
  { id: 'lat8', sourceMachine: 'WS-ENG-12', sourceIp: rndIP('192.168.1.'), targetMachine: 'SRV-MAIL',    targetIp: rndIP('10.0.0.'), attempts: 89,  datetime: randomDate(35), protocol: 'SMTP', isAnomalous: true  },
].sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());

export const privilegeEvents: PrivilegeEvent[] = [
  { id: 'pr1', user: 'j.dupont',  oldRole: 'Utilisateur',   newRole: 'Administrateur Domain', datetime: randomDate(1),  authorizedBy: 'Inconnu',      risk: 'critique', isUnauthorized: true  },
  { id: 'pr2', user: 'a.martin',  oldRole: 'Analyste',      newRole: 'Admin Système',          datetime: randomDate(4),  authorizedBy: 'IT-Admin-01',  risk: 'élevé',    isUnauthorized: false },
  { id: 'pr3', user: 'm.bernard', oldRole: 'Développeur',   newRole: 'Root',                   datetime: randomDate(7),  authorizedBy: 'Inconnu',      risk: 'critique', isUnauthorized: true  },
  { id: 'pr4', user: 's.petit',   oldRole: 'Support',       newRole: 'Admin RH',               datetime: randomDate(12), authorizedBy: 'DRH-Manager',  risk: 'moyen',    isUnauthorized: false },
  { id: 'pr5', user: 'c.robert',  oldRole: 'Stagiaire',     newRole: 'Admin Finance',          datetime: randomDate(18), authorizedBy: 'Inconnu',      risk: 'élevé',    isUnauthorized: true  },
  { id: 'pr6', user: 'l.moreau',  oldRole: 'Consultant',    newRole: 'Super Administrateur',   datetime: randomDate(25), authorizedBy: 'Inconnu',      risk: 'critique', isUnauthorized: true  },
  { id: 'pr7', user: 'p.simon',   oldRole: 'Développeur',   newRole: 'DevOps Lead',            datetime: randomDate(32), authorizedBy: 'CTO',          risk: 'faible',   isUnauthorized: false },
  { id: 'pr8', user: 'n.laurent', oldRole: 'Utilisateur',   newRole: 'Admin Réseau',           datetime: randomDate(40), authorizedBy: 'Net-Admin',    risk: 'moyen',    isUnauthorized: false },
].sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());

export const unusualAccessEvents: UnusualAccessEvent[] = [
  { id: 'ua1', user: 'j.dupont',  country: 'Corée du Nord', ip: rndIP('185.220.'),  device: 'Linux / Chrome',    datetime: randomDate(1),  reason: 'Pays inhabituels',         risk: 'critique' },
  { id: 'ua2', user: 'a.martin',  country: 'Iran',          ip: rndIP('91.109.'),   device: 'Android / Firefox', datetime: randomDate(3),  reason: 'Appareil inconnu + VPN',   risk: 'élevé'    },
  { id: 'ua3', user: 'm.bernard', country: 'Russie',        ip: rndIP('109.248.'),  device: 'Windows / Edge',    datetime: randomDate(5),  reason: 'Connexion à 3h du matin',  risk: 'élevé'    },
  { id: 'ua4', user: 's.petit',   country: 'France',        ip: rndIP('176.31.'),   device: 'macOS / Safari',    datetime: randomDate(8),  reason: 'IP résidentielle suspecte', risk: 'moyen'    },
  { id: 'ua5', user: 'c.robert',  country: 'Chine',         ip: rndIP('103.224.'),  device: 'iOS / Safari',      datetime: randomDate(12), reason: 'Géolocalisation anormale',  risk: 'critique' },
  { id: 'ua6', user: 'l.moreau',  country: 'Ukraine',       ip: rndIP('194.165.'),  device: 'Linux / Tor',       datetime: randomDate(16), reason: 'Navigateur Tor détecté',   risk: 'critique' },
  { id: 'ua7', user: 'p.simon',   country: 'Brésil',        ip: rndIP('200.96.'),   device: 'Windows / Chrome',  datetime: randomDate(22), reason: 'Hors plage horaire',       risk: 'moyen'    },
  { id: 'ua8', user: 'n.laurent', country: 'Allemagne',     ip: rndIP('185.176.'),  device: 'macOS / Firefox',   datetime: randomDate(28), reason: 'Multiples pays en 1h',     risk: 'élevé'    },
].sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());

// ─── Helpers ──────────────────────────────────────────────────────────────────

function riskBadge(risk: RiskLevel) {
  const map: Record<RiskLevel, string> = {
    critique: 'bg-red-500/15 text-red-400 border border-red-500/30',
    élevé:    'bg-orange-500/15 text-orange-400 border border-orange-500/30',
    moyen:    'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
    faible:   'bg-green-500/15 text-green-400 border border-green-500/30',
  };
  return map[risk];
}

function riskDot(risk: RiskLevel) {
  const map: Record<RiskLevel, string> = {
    critique: 'bg-red-400',
    élevé:    'bg-orange-400',
    moyen:    'bg-yellow-400',
    faible:   'bg-green-400',
  };
  return map[risk];
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

// Mini bar-chart component for trend sparklines
function TrendBars({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {data.map((v, i) => (
        <div
          key={i}
          className={`flex-1 rounded-sm ${color} transition-all`}
          style={{ height: `${(v / max) * 100}%`, opacity: 0.4 + (i / data.length) * 0.6 }}
        />
      ))}
    </div>
  );
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

type RiskFilter = RiskLevel | 'tous';

function FilterBar({
  riskFilter, setRiskFilter,
  userFilter, setUserFilter,
  dateFilter, setDateFilter,
  resultCount,
  accentClass,
}: {
  riskFilter: RiskFilter;
  setRiskFilter: (r: RiskFilter) => void;
  userFilter: string;
  setUserFilter: (u: string) => void;
  dateFilter: string;
  setDateFilter: (d: string) => void;
  resultCount: number;
  accentClass: string;
}) {
  const risks: RiskFilter[] = ['tous', 'critique', 'élevé', 'moyen', 'faible'];
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
      <Filter className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
      <div className="flex flex-wrap gap-1">
        {risks.map(r => (
          <button
            key={r}
            onClick={() => setRiskFilter(r)}
            className={`text-[10px] px-2 py-0.5 rounded-md border capitalize transition-all ${
              riskFilter === r
                ? r === 'tous' ? `${accentClass} font-semibold` : riskBadge(r as RiskLevel) + ' font-semibold'
                : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
            }`}
          >
            {r}
          </button>
        ))}
      </div>
      <div className="flex gap-2 ml-auto">
        <select
          value={userFilter}
          onChange={e => setUserFilter(e.target.value)}
          onClick={e => e.stopPropagation()}
          className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 rounded-md px-2 py-0.5 focus:outline-none focus:border-slate-600"
        >
          <option value="">Tous les utilisateurs</option>
          {users.map(u => <option key={u} value={u}>{u}</option>)}
        </select>
        <select
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
          onClick={e => e.stopPropagation()}
          className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 rounded-md px-2 py-0.5 focus:outline-none focus:border-slate-600"
        >
          <option value="">Toute période</option>
          <option value="6">6 dernières heures</option>
          <option value="24">Dernières 24h</option>
          <option value="48">Dernières 48h</option>
        </select>
      </div>
      <span className="text-[10px] text-slate-500 ml-1">{resultCount} résultat{resultCount !== 1 ? 's' : ''}</span>
    </div>
  );
}

// ─── Exfiltration Panel ───────────────────────────────────────────────────────

function ExfilPanel({ onClose }: { onClose: () => void }) {
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('tous');
  const [userFilter, setUserFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const trendData = [12, 8, 15, 22, 18, 31, 27, 42, 38, 55, 48, 61];

  const filtered = useMemo(() => {
    return exfilEvents.filter(e => {
      if (riskFilter !== 'tous' && e.risk !== riskFilter) return false;
      if (userFilter && e.user !== userFilter) return false;
      if (dateFilter) {
        const cutoff = new Date();
        cutoff.setHours(cutoff.getHours() - parseInt(dateFilter));
        if (new Date(e.datetime) < cutoff) return false;
      }
      return true;
    });
  }, [riskFilter, userFilter, dateFilter]);

  const totalVol = filtered.reduce((s, e) => s + e.volumeBytes, 0);

  return (
    <div className="mt-3 space-y-3" onClick={e => e.stopPropagation()}>
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Événements', value: filtered.length, sub: 'total filtré' },
          { label: 'Volume total', value: totalVol > 1000 ? `${(totalVol / 1024).toFixed(1)} TB` : `${totalVol} MB`, sub: 'données exfiltrées' },
          { label: 'Critiques', value: filtered.filter(e => e.risk === 'critique').length, sub: 'risque maximal' },
          { label: 'Utilisateurs', value: new Set(filtered.map(e => e.user)).size, sub: 'comptes impliqués' },
        ].map(s => (
          <div key={s.label} className="bg-slate-800/60 rounded-lg p-2.5 text-center">
            <p className="text-base font-bold text-blue-400">{s.value}</p>
            <p className="text-[10px] text-white font-medium">{s.label}</p>
            <p className="text-[9px] text-slate-500">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Trend chart */}
      <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-blue-400" /> Tendance (12h)
          </span>
          <span className="text-[10px] text-red-400">+23% ce mois</span>
        </div>
        <TrendBars data={trendData} color="bg-blue-500" />
      </div>

      <FilterBar
        riskFilter={riskFilter} setRiskFilter={setRiskFilter}
        userFilter={userFilter} setUserFilter={setUserFilter}
        dateFilter={dateFilter} setDateFilter={setDateFilter}
        resultCount={filtered.length}
        accentClass="bg-blue-500/20 text-blue-300 border-blue-500"
      />

      <div className="bg-slate-800/50 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700/50">
                {['Utilisateur', 'IP Source', 'Volume', 'Destination', 'Protocol', 'Date/Heure', 'Risque'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] text-slate-500 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-600 text-[10px]">Aucun événement pour ce filtre</td></tr>
              ) : filtered.map(ev => (
                <tr key={ev.id} className={`border-b border-slate-700/30 transition-colors hover:bg-slate-800/40 ${ev.risk === 'critique' ? 'bg-red-500/3' : ''}`}>
                  <td className="px-3 py-2 font-medium text-slate-200 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${riskDot(ev.risk)}`} />
                      {ev.user}
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-slate-400">{ev.ip}</td>
                  <td className="px-3 py-2 font-semibold text-blue-400">{ev.volume}</td>
                  <td className="px-3 py-2 text-slate-400 max-w-32 truncate">{ev.destination}</td>
                  <td className="px-3 py-2 text-slate-500">{ev.protocol}</td>
                  <td className="px-3 py-2 font-mono text-slate-500 whitespace-nowrap">{fmtDate(ev.datetime)}</td>
                  <td className="px-3 py-2">
                    <span className={`text-[9px] px-2 py-0.5 rounded font-semibold uppercase ${riskBadge(ev.risk)}`}>{ev.risk}</span>
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

// ─── Lateral Movement Panel ───────────────────────────────────────────────────

function LateralPanel({ onClose }: { onClose: () => void }) {
  const [showAnomalousOnly, setShowAnomalousOnly] = useState(false);
  const [dateFilter, setDateFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');

  const trendData = [5, 9, 7, 14, 11, 20, 17, 28, 24, 35, 31, 44];

  const filtered = useMemo(() => {
    return lateralEvents.filter(e => {
      if (showAnomalousOnly && !e.isAnomalous) return false;
      if (dateFilter) {
        const cutoff = new Date();
        cutoff.setHours(cutoff.getHours() - parseInt(dateFilter));
        if (new Date(e.datetime) < cutoff) return false;
      }
      return true;
    });
  }, [showAnomalousOnly, dateFilter, userFilter]);

  const anomalousCount = filtered.filter(e => e.isAnomalous).length;
  const totalAttempts = filtered.reduce((s, e) => s + e.attempts, 0);

  return (
    <div className="mt-3 space-y-3" onClick={e => e.stopPropagation()}>
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Connexions', value: filtered.length, sub: 'mouvements détectés' },
          { label: 'Anomalies', value: anomalousCount, sub: 'comportements suspects' },
          { label: 'Tentatives', value: totalAttempts, sub: 'total cumulé' },
          { label: 'Machines', value: new Set(filtered.flatMap(e => [e.sourceMachine, e.targetMachine])).size, sub: 'impliquées' },
        ].map(s => (
          <div key={s.label} className="bg-slate-800/60 rounded-lg p-2.5 text-center">
            <p className="text-base font-bold text-blue-400">{s.value}</p>
            <p className="text-[10px] text-white font-medium">{s.label}</p>
            <p className="text-[9px] text-slate-500">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-blue-400" /> Mouvements latéraux (12h)
          </span>
          <span className="text-[10px] text-orange-400">+41% cette semaine</span>
        </div>
        <TrendBars data={trendData} color="bg-blue-500" />
      </div>

      <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
        <Filter className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
        <button
          onClick={() => setShowAnomalousOnly(p => !p)}
          className={`text-[10px] px-2.5 py-0.5 rounded-md border transition-all flex items-center gap-1 ${
            showAnomalousOnly
              ? 'bg-orange-500/20 text-orange-300 border-orange-500 font-semibold'
              : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
          }`}
        >
          <AlertTriangle className="w-3 h-3" /> Anomalies uniquement
        </button>
        <select
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
          onClick={e => e.stopPropagation()}
          className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 rounded-md px-2 py-0.5 focus:outline-none focus:border-slate-600 ml-auto"
        >
          <option value="">Toute période</option>
          <option value="6">6 dernières heures</option>
          <option value="24">Dernières 24h</option>
          <option value="48">Dernières 48h</option>
        </select>
        <span className="text-[10px] text-slate-500">{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="bg-slate-800/50 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700/50">
                {['Machine source', 'IP source', 'Machine cible', 'IP cible', 'Tentatives', 'Protocole', 'Date/Heure', 'Alerte'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] text-slate-500 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-slate-600 text-[10px]">Aucune connexion pour ce filtre</td></tr>
              ) : filtered.map(ev => (
                <tr key={ev.id} className={`border-b border-slate-700/30 transition-colors hover:bg-slate-800/40 ${ev.isAnomalous ? 'bg-orange-500/3' : ''}`}>
                  <td className="px-3 py-2 font-medium text-slate-200 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${ev.isAnomalous ? 'bg-orange-400' : 'bg-slate-600'}`} />
                      {ev.sourceMachine}
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-slate-500">{ev.sourceIp}</td>
                  <td className="px-3 py-2 font-medium text-slate-300">{ev.targetMachine}</td>
                  <td className="px-3 py-2 font-mono text-slate-500">{ev.targetIp}</td>
                  <td className={`px-3 py-2 font-bold ${ev.attempts > 50 ? 'text-red-400' : ev.attempts > 20 ? 'text-orange-400' : 'text-slate-300'}`}>
                    {ev.attempts}
                  </td>
                  <td className="px-3 py-2 text-slate-500">{ev.protocol}</td>
                  <td className="px-3 py-2 font-mono text-slate-500 whitespace-nowrap">{fmtDate(ev.datetime)}</td>
                  <td className="px-3 py-2">
                    {ev.isAnomalous
                      ? <span className="text-[9px] px-2 py-0.5 rounded font-semibold bg-orange-500/15 text-orange-400 border border-orange-500/30 flex items-center gap-1 w-fit">
                          <AlertTriangle className="w-2.5 h-2.5" /> ANOMALIE
                        </span>
                      : <span className="text-[9px] px-2 py-0.5 rounded font-semibold bg-slate-700 text-slate-500">Normal</span>
                    }
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

// ─── Privilege Escalation Panel ───────────────────────────────────────────────

function PrivilegePanel({ onClose }: { onClose: () => void }) {
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('tous');
  const [userFilter, setUserFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [unauthorizedOnly, setUnauthorizedOnly] = useState(false);

  const trendData = [3, 2, 5, 4, 7, 6, 9, 8, 11, 10, 14, 13];

  const filtered = useMemo(() => {
    return privilegeEvents.filter(e => {
      if (riskFilter !== 'tous' && e.risk !== riskFilter) return false;
      if (userFilter && e.user !== userFilter) return false;
      if (unauthorizedOnly && !e.isUnauthorized) return false;
      if (dateFilter) {
        const cutoff = new Date();
        cutoff.setHours(cutoff.getHours() - parseInt(dateFilter));
        if (new Date(e.datetime) < cutoff) return false;
      }
      return true;
    });
  }, [riskFilter, userFilter, dateFilter, unauthorizedOnly]);

  return (
    <div className="mt-3 space-y-3" onClick={e => e.stopPropagation()}>
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Escalations', value: filtered.length, sub: 'détectées' },
          { label: 'Non autorisées', value: filtered.filter(e => e.isUnauthorized).length, sub: 'accès illégitimes' },
          { label: 'Critiques', value: filtered.filter(e => e.risk === 'critique').length, sub: 'risque maximal' },
          { label: 'Comptes', value: new Set(filtered.map(e => e.user)).size, sub: 'affectés' },
        ].map(s => (
          <div key={s.label} className="bg-slate-800/60 rounded-lg p-2.5 text-center">
            <p className={`text-base font-bold ${s.label === 'Non autorisées' || s.label === 'Critiques' ? 'text-red-400' : 'text-blue-400'}`}>{s.value}</p>
            <p className="text-[10px] text-white font-medium">{s.label}</p>
            <p className="text-[9px] text-slate-500">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-blue-400" /> Escalations de privilèges (12h)
          </span>
          <span className="text-[10px] text-red-400">+18% cette semaine</span>
        </div>
        <TrendBars data={trendData} color="bg-blue-500" />
      </div>

      <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
        <Filter className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
        <div className="flex flex-wrap gap-1">
          {(['tous', 'critique', 'élevé', 'moyen', 'faible'] as RiskFilter[]).map(r => (
            <button key={r} onClick={() => setRiskFilter(r)}
              className={`text-[10px] px-2 py-0.5 rounded-md border capitalize transition-all ${
                riskFilter === r
                  ? r === 'tous' ? 'bg-blue-500/20 text-blue-300 border-blue-500 font-semibold' : riskBadge(r as RiskLevel) + ' font-semibold'
                  : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
              }`}>{r}</button>
          ))}
          <button
            onClick={() => setUnauthorizedOnly(p => !p)}
            className={`text-[10px] px-2.5 py-0.5 rounded-md border transition-all flex items-center gap-1 ${
              unauthorizedOnly ? 'bg-red-500/20 text-red-300 border-red-500 font-semibold' : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-slate-300'
            }`}
          >
            <ShieldAlert className="w-3 h-3" /> Non autorisées
          </button>
        </div>
        <div className="flex gap-2 ml-auto">
          <select value={userFilter} onChange={e => setUserFilter(e.target.value)} onClick={e => e.stopPropagation()}
            className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 rounded-md px-2 py-0.5 focus:outline-none">
            <option value="">Tous les utilisateurs</option>
            {users.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} onClick={e => e.stopPropagation()}
            className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 rounded-md px-2 py-0.5 focus:outline-none">
            <option value="">Toute période</option>
            <option value="6">6 dernières heures</option>
            <option value="24">Dernières 24h</option>
            <option value="48">Dernières 48h</option>
          </select>
        </div>
        <span className="text-[10px] text-slate-500">{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="bg-slate-800/50 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700/50">
                {['Utilisateur', 'Ancien rôle', 'Nouveau rôle', 'Autorisé par', 'Date/Heure', 'Risque', 'Statut'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] text-slate-500 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-600 text-[10px]">Aucune escalation pour ce filtre</td></tr>
              ) : filtered.map(ev => (
                <tr key={ev.id} className={`border-b border-slate-700/30 transition-colors hover:bg-slate-800/40 ${ev.isUnauthorized ? 'bg-red-500/3' : ''}`}>
                  <td className="px-3 py-2 font-medium text-slate-200 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${riskDot(ev.risk)}`} />
                      {ev.user}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-500">{ev.oldRole}</td>
                  <td className="px-3 py-2 font-medium text-slate-300">{ev.newRole}</td>
                  <td className={`px-3 py-2 ${ev.authorizedBy === 'Inconnu' ? 'text-red-400 font-semibold' : 'text-slate-400'}`}>{ev.authorizedBy}</td>
                  <td className="px-3 py-2 font-mono text-slate-500 whitespace-nowrap">{fmtDate(ev.datetime)}</td>
                  <td className="px-3 py-2">
                    <span className={`text-[9px] px-2 py-0.5 rounded font-semibold uppercase ${riskBadge(ev.risk)}`}>{ev.risk}</span>
                  </td>
                  <td className="px-3 py-2">
                    {ev.isUnauthorized
                      ? <span className="text-[9px] px-2 py-0.5 rounded font-semibold bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1 w-fit">
                          <ShieldAlert className="w-2.5 h-2.5" /> CRITIQUE
                        </span>
                      : <span className="text-[9px] px-2 py-0.5 rounded font-semibold bg-green-500/15 text-green-400 border border-green-500/30">Autorisé</span>
                    }
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

// ─── Unusual Access Panel ─────────────────────────────────────────────────────

function UnusualAccessPanel({ onClose }: { onClose: () => void }) {
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('tous');
  const [userFilter, setUserFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const trendData = [8, 12, 10, 18, 15, 24, 20, 29, 26, 38, 33, 47];

  const filtered = useMemo(() => {
    return unusualAccessEvents.filter(e => {
      if (riskFilter !== 'tous' && e.risk !== riskFilter) return false;
      if (userFilter && e.user !== userFilter) return false;
      if (dateFilter) {
        const cutoff = new Date();
        cutoff.setHours(cutoff.getHours() - parseInt(dateFilter));
        if (new Date(e.datetime) < cutoff) return false;
      }
      return true;
    });
  }, [riskFilter, userFilter, dateFilter]);

  const highRiskCount = filtered.filter(e => e.risk === 'critique' || e.risk === 'élevé').length;

  return (
    <div className="mt-3 space-y-3" onClick={e => e.stopPropagation()}>
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Accès suspects', value: filtered.length, sub: 'détectés', color: 'text-blue-400' },
          { label: 'Haut risque', value: highRiskCount, sub: 'critique / élevé', color: 'text-red-400' },
          { label: 'Pays distincts', value: new Set(filtered.map(e => e.country)).size, sub: 'origines', color: 'text-blue-400' },
          { label: 'Comptes', value: new Set(filtered.map(e => e.user)).size, sub: 'affectés', color: 'text-blue-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-800/60 rounded-lg p-2.5 text-center">
            <p className={`text-base font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-white font-medium">{s.label}</p>
            <p className="text-[9px] text-slate-500">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-blue-400" /> Accès inhabituels (12h)
          </span>
          <span className="text-[10px] text-orange-400">+31% cette semaine</span>
        </div>
        <TrendBars data={trendData} color="bg-blue-500" />
      </div>

      <FilterBar
        riskFilter={riskFilter} setRiskFilter={setRiskFilter}
        userFilter={userFilter} setUserFilter={setUserFilter}
        dateFilter={dateFilter} setDateFilter={setDateFilter}
        resultCount={filtered.length}
        accentClass="bg-blue-500/20 text-blue-300 border-blue-500"
      />

      <div className="bg-slate-800/50 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700/50">
                {['Utilisateur', 'Pays', 'Adresse IP', 'Appareil', 'Raison', 'Heure', 'Risque'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] text-slate-500 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-600 text-[10px]">Aucun accès pour ce filtre</td></tr>
              ) : filtered.map(ev => (
                <tr key={ev.id} className={`border-b border-slate-700/30 transition-colors hover:bg-slate-800/40 ${
                  ev.risk === 'critique' ? 'bg-red-500/3' : ev.risk === 'élevé' ? 'bg-orange-500/3' : ''
                }`}>
                  <td className="px-3 py-2 font-medium text-slate-200 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${riskDot(ev.risk)}`} />
                      {ev.user}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-300 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      {ev.country}
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-slate-400">{ev.ip}</td>
                  <td className="px-3 py-2 text-slate-400 max-w-32 truncate">{ev.device}</td>
                  <td className="px-3 py-2 text-slate-400 max-w-40 truncate">{ev.reason}</td>
                  <td className="px-3 py-2 font-mono text-slate-500 whitespace-nowrap">{fmtDate(ev.datetime)}</td>
                  <td className="px-3 py-2">
                    <span className={`text-[9px] px-2 py-0.5 rounded font-semibold uppercase ${riskBadge(ev.risk)}`}>{ev.risk}</span>
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

type BehavioralTechnique = 'Exfiltration de données' | 'Mouvement latéral' | 'Élévation de privilèges' | 'Accès inhabituels';

const techniques: Array<{ id: BehavioralTechnique; icon: typeof Database; count: number; label: string }> = [
  { id: 'Exfiltration de données', icon: Database,    count: exfilEvents.length,     label: 'transferts suspects' },
  { id: 'Mouvement latéral',       icon: Network,     count: lateralEvents.length,   label: 'connexions internes' },
  { id: 'Élévation de privilèges', icon: ShieldAlert, count: privilegeEvents.length, label: 'escalations' },
  { id: 'Accès inhabituels',       icon: MapPin,      count: unusualAccessEvents.length, label: 'accès suspects' },
];

interface BehavioralPanelProps {
  onStopPropagation: (e: React.MouseEvent) => void;
}

export default function BehavioralPanel({ onStopPropagation }: BehavioralPanelProps) {
  const [activeTech, setActiveTech] = useState<BehavioralTechnique | null>(null);

  function toggle(e: React.MouseEvent, tech: BehavioralTechnique) {
    e.stopPropagation();
    setActiveTech(prev => prev === tech ? null : tech);
  }

  return (
    <div className="mt-4 pt-3 border-t border-slate-800" onClick={onStopPropagation}>
      <p className="text-xs text-slate-400 mb-3">Détection des comportements utilisateurs anormaux (UBA/UEBA).</p>

      {/* Technique buttons */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {/* Tous reset */}
        <button
          onClick={e => { e.stopPropagation(); setActiveTech(null); }}
          className={`text-[10px] px-2.5 py-1 rounded-md border transition-all font-medium ${
            activeTech === null
              ? 'bg-blue-500/25 text-blue-300 border-blue-500 shadow-sm shadow-blue-500/20 font-semibold'
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600 hover:text-slate-300'
          }`}
        >
          Tous
          <span className={`ml-1.5 font-bold ${activeTech === null ? 'text-blue-200' : 'text-slate-500'}`}>(167)</span>
        </button>

        {techniques.map(tech => {
          const Icon = tech.icon;
          const isActive = activeTech === tech.id;
          return (
            <button
              key={tech.id}
              onClick={e => toggle(e, tech.id)}
              className={`text-[10px] px-2.5 py-1 rounded-md border transition-all flex items-center gap-1.5 ${
                isActive
                  ? 'bg-blue-500/25 text-blue-300 border-blue-500 shadow-sm shadow-blue-500/20 font-semibold'
                  : 'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:border-blue-500/50 hover:bg-blue-500/20 cursor-pointer'
              }`}
            >
              <Icon className="w-3 h-3" />
              {tech.id}
              <span className={`font-bold ${isActive ? 'text-blue-200' : 'text-slate-500'}`}>({tech.count})</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${isActive ? 'rotate-180' : ''}`} />
            </button>
          );
        })}
      </div>

      {/* Active technique label */}
      {activeTech && (
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] text-blue-300 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
            {activeTech}
            <span className="text-blue-400 font-bold ml-1">
              • {techniques.find(t => t.id === activeTech)?.count} {techniques.find(t => t.id === activeTech)?.label}
            </span>
          </span>
          <button
            onClick={e => { e.stopPropagation(); setActiveTech(null); }}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Detail panels */}
      {activeTech === 'Exfiltration de données' && <ExfilPanel onClose={() => setActiveTech(null)} />}
      {activeTech === 'Mouvement latéral' && <LateralPanel onClose={() => setActiveTech(null)} />}
      {activeTech === 'Élévation de privilèges' && <PrivilegePanel onClose={() => setActiveTech(null)} />}
      {activeTech === 'Accès inhabituels' && <UnusualAccessPanel onClose={() => setActiveTech(null)} />}
    </div>
  );
}
