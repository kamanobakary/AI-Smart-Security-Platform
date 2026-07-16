import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Shield, AlertTriangle, Clock, RefreshCw,
  Globe, Zap, Lock, TrendingUp, TrendingDown,
  Wifi, Cpu, Server, Bug, ScanLine, Target, Radio,
  Bell, ChevronRight, ArrowUpRight, BarChart3, Database, Activity,
} from 'lucide-react';
import {
  generateTrafficData, generatePacketStats, generateAIClassification,
  generateAttackMapData, getPeriodStats,
  type AIClassification, type PacketStats,
} from '../lib/mockData';
import { fetchDashboardStats, fetchAlerts, fetchTopAttacks, type DashboardStats, type TopAttack, type DbAlert } from '../lib/database';
import AreaChart from './charts/AreaChart';
import BarChart from './charts/BarChart';
import DonutChart from './charts/DonutChart';
import AttackMap from './AttackMap';
import type { Page } from './Layout';

interface Props { onNavigate: (page: Page) => void; onNewAlert?: (count: number) => void; }

type Period = '24h' | '7d' | '30d';

const severityConfig = {
  critical: { label: 'Critique', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', dot: 'bg-red-400', glow: 'shadow-red-500/20' },
  high: { label: 'Élevé', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', dot: 'bg-orange-400', glow: 'shadow-orange-500/20' },
  medium: { label: 'Moyen', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', dot: 'bg-yellow-400', glow: 'shadow-yellow-500/20' },
  low: { label: 'Faible', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', dot: 'bg-green-400', glow: 'shadow-green-500/20' },
};

const statusConfig = {
  new: { label: 'Nouveau', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  in_progress: { label: 'En cours', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  resolved: { label: 'Résolu', color: 'text-green-400', bg: 'bg-green-500/10' },
};

function PulsingDot({ color = 'bg-green-400' }: { color?: string }) {
  return (
    <span className="relative flex h-2 w-2">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-75`} />
      <span className={`relative inline-flex rounded-full h-2 w-2 ${color}`} />
    </span>
  );
}

function SecurityScoreRing({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#10B981' : score >= 60 ? '#F59E0B' : '#EF4444';
  const textColor = score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-yellow-400' : 'text-red-400';
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Modéré' : 'Critique';
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg width="128" height="128" viewBox="-10 -10 140 140">
          <circle cx="60" cy="60" r="54" fill="none" stroke="#1e293b" strokeWidth="10" />
          <circle cx="60" cy="60" r="54" fill="none" stroke={color} strokeWidth="10"
            strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
            transform="rotate(-90 60 60)"
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)', filter: `drop-shadow(0 0 8px ${color}80)` }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-black ${textColor}`}>{score}</span>
          <span className="text-[10px] text-slate-500 font-medium">/100</span>
        </div>
      </div>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${textColor} ${score >= 80 ? 'bg-emerald-500/10 border-emerald-500/20' : score >= 60 ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-red-500/10 border-red-500/20'}`}>{label}</span>
    </div>
  );
}

const attackIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  zap: Zap, lock: Lock, scan: ScanLine, bug: Bug, database: Database,
};

export default function Dashboard({ onNavigate, onNewAlert }: Props) {
  const [period, setPeriod] = useState<Period>('24h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [alertLogs, setAlertLogs] = useState<DbAlert[]>([]);
  const [topAttacksData, setTopAttacksData] = useState<TopAttack[]>([]);
  const [aiData, setAiData] = useState<AIClassification[]>(() => generateAIClassification(24));
  const [packetData, setPacketData] = useState<PacketStats[]>(() => generatePacketStats(20));
  const [attackMapData] = useState(() => generateAttackMapData());
  const [tick, setTick] = useState(0);
  const [dbStats, setDbStats] = useState<DashboardStats | null>(null);

  const periodStats = useMemo(() => getPeriodStats(period), [period, tick]);
  const trafficData = useMemo(() => generateTrafficData(24), [tick]);

  const loadDbStats = useCallback(async () => {
    try {
      const [s, logs, attacks] = await Promise.all([
        fetchDashboardStats(),
        fetchAlerts(12),
        fetchTopAttacks(5),
      ]);
      setDbStats(s);
      setAlertLogs(logs);
      setTopAttacksData(attacks);
      onNewAlert?.(s.newAlerts);
    } catch { /* silently keep previous values */ }
  }, [onNewAlert]);

  const refreshData = useCallback(() => {
    setAiData(generateAIClassification(24));
    setPacketData(generatePacketStats(20));
    setLastUpdate(new Date());
    setTick(t => t + 1);
    loadDbStats();
  }, [loadDbStats]);

  useEffect(() => { loadDbStats(); }, [loadDbStats]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(refreshData, 30_000);
    return () => clearInterval(id);
  }, [autoRefresh, refreshData]);

  const latestAI = aiData[aiData.length - 1];
  const currentPacket = packetData[packetData.length - 1];

  // Real counts from Supabase — fallback to 0 while loading
  const totalAlerts    = dbStats?.totalAlerts    ?? 0;
  const criticalAlerts = dbStats?.criticalAlerts ?? 0;
  const newAlerts      = dbStats?.newAlerts      ?? 0;
  const resolvedAlerts = dbStats?.resolvedAlerts ?? 0;
  const blockedThreats = dbStats?.blockedThreats ?? 0;
  const securityScore  = dbStats?.securityScore  ?? 72;

  const donutData = [
    { label: 'Critique',  value: criticalAlerts,                                                    color: '#EF4444' },
    { label: 'Élevé',     value: Math.max(0, totalAlerts - criticalAlerts - resolvedAlerts - newAlerts), color: '#F97316' },
    { label: 'Nouveaux',  value: newAlerts,                                                          color: '#3B82F6' },
    { label: 'Résolus',   value: resolvedAlerts,                                                     color: '#22C55E' },
  ];

  const aiBarData = [
    { label: 'Normal', value: latestAI?.normal ?? 72, color: '#22C55E' },
    { label: 'Suspect', value: latestAI?.suspicious ?? 28, color: '#EF4444' },
  ];

  const historyLineData = aiData.slice(-10).map(d => ({
    label: d.timestamp,
    values: [
      { key: 'normal', value: d.normal, color: '#22C55E' },
      { key: 'suspicious', value: d.suspicious, color: '#EF4444' },
    ],
  }));

  // compact packet bar
  const packetBarData = packetData.slice(-10).map(d => ({
    label: d.time,
    value: d.blocked,
    color: '#EF4444',
  }));

  return (
    <div className="space-y-4">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            Centre de Sécurité Opérationnel
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Système IA de Détection d'Intrusion — Surveillance en temps réel</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period selector */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-1 flex gap-1">
            {(['24h', '7d', '30d'] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${period === p ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white'}`}>
                {p === '24h' ? '24 Heures' : p === '7d' ? '7 Jours' : '30 Jours'}
              </button>
            ))}
          </div>
          <button onClick={() => { setAutoRefresh(v => !v); if (!autoRefresh) refreshData(); }}
            className={`flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border transition-all ${autoRefresh ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
            {autoRefresh ? 'En direct' : 'Pause'}
          </button>
          <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
            <Clock className="w-3.5 h-3.5" />
            {lastUpdate.toLocaleTimeString('fr-FR')}
          </div>
        </div>
      </div>

      {/* ── Section 1: Surveillance réseau KPIs ───────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Paquets analysés', value: (periodStats.packetsAnalyzed / 1000).toFixed(0) + 'K',
            sub: `+${Math.floor(periodStats.packetsAnalyzed * 0.003 / 1000)}K/min`, icon: Wifi,
            color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20',
            trend: 'up', nav: 'monitoring' as Page
          },
          {
            label: 'Menaces bloquées', value: blockedThreats.toLocaleString('fr'),
            sub: 'Stoppées par l\'IA', icon: Shield,
            color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20',
            trend: 'down', nav: 'alerts' as Page
          },
          {
            label: 'Alertes actives', value: totalAlerts,
            sub: `${newAlerts} nouvelles`, icon: Bell,
            color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20',
            trend: 'up', nav: 'alerts' as Page
          },
          {
            label: 'Disponibilité', value: `${periodStats.uptime.toFixed(2)}%`,
            sub: 'SLA garanti', icon: Radio,
            color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20',
            trend: null, nav: 'monitoring' as Page
          },
        ].map(kpi => (
          <button key={kpi.label} onClick={() => onNavigate(kpi.nav)}
            className={`bg-slate-900 border ${kpi.border} rounded-xl p-4 text-left hover:brightness-110 transition-all group relative overflow-hidden`}>
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-transparent ${kpi.bg}`} />
            <div className="relative flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg ${kpi.bg} ${kpi.border} border flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-slate-500 font-medium">{kpi.label}</p>
                <p className={`text-2xl font-black ${kpi.color} leading-tight`}>{kpi.value}</p>
                <p className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                  {kpi.trend === 'up' && <TrendingUp className="w-3 h-3 text-red-400" />}
                  {kpi.trend === 'down' && <TrendingDown className="w-3 h-3 text-emerald-400" />}
                  {kpi.sub}
                </p>
              </div>
              <ArrowUpRight className={`w-3.5 h-3.5 ${kpi.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
            </div>
          </button>
        ))}
      </div>

      {/* ── Section 2: Détection IA + Score sécurité ─────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* AI Detection Panel */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              Détection IA — Classification du trafic
            </h3>
            <div className="flex items-center gap-2">
              <PulsingDot color="bg-cyan-400" />
              <span className="text-[10px] text-cyan-400 font-medium">IA Actif</span>
            </div>
          </div>

          {/* AI Confidence bar */}
          <div className="mb-4 p-3 bg-slate-800/60 rounded-xl border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">Score de confiance IA</span>
              <span className="text-sm font-bold text-cyan-400">{latestAI?.confidence ?? 94}%</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-700"
                style={{ width: `${latestAI?.confidence ?? 94}%` }} />
            </div>
          </div>

          {/* Normal vs Suspicious split */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-emerald-400">{latestAI?.normal ?? 72}%</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Trafic Normal</p>
            </div>
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-red-400">{latestAI?.suspicious ?? 28}%</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Trafic Suspect</p>
            </div>
            <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-3 text-center">
              <p className="text-2xl font-black text-orange-400">{latestAI?.anomalyScore ?? 22}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Score Anomalie</p>
            </div>
          </div>

          {/* Mini trend chart */}
          <div>
            <p className="text-[11px] text-slate-500 mb-2">Évolution classification (dernières 10h)</p>
            <BarChart data={aiBarData} height={100} showValues={false} />
          </div>
        </div>

        {/* Security Score */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-400" />
            Score global de sécurité
          </h3>
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <SecurityScoreRing score={securityScore} />
            <div className="w-full space-y-2.5">
              {[
                { label: 'Détection IA',      val: Math.round(periodStats.aiConfidence),               max: 100, color: 'bg-cyan-500' },
                { label: 'Alertes critiques',  val: criticalAlerts,                                    max: Math.max(criticalAlerts, 20), color: 'bg-red-500' },
                { label: 'Menaces bloquées',   val: Math.min(Math.round(blockedThreats / 5), 100),     max: 100, color: 'bg-emerald-500' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">{item.label}</span>
                    <span className="text-slate-300 font-medium">{item.val}{item.max === 100 ? '%' : ''}</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full`}
                      style={{ width: `${Math.min((item.val / item.max) * 100, 100)}%`, transition: 'width 1s ease' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 3: Carte géographique + Top attaques ──── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Attack Map */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-slate-800">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-400" />
              Carte géographique des attaques
            </h3>
            <div className="flex items-center gap-1.5">
              <PulsingDot color="bg-red-400" />
              <span className="text-[10px] text-red-400">{attackMapData.length} origines actives</span>
            </div>
          </div>
          <AttackMap data={attackMapData} />
        </div>

        {/* Top Attacks */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-orange-400" />
            Top 5 attaques détectées
          </h3>
          <div className="space-y-2.5">
            {topAttacksData.map((attack, i) => {
              const Icon = attackIconMap[attack.icon] ?? Zap;
              const sc = severityConfig[attack.severity];
              const pct = topAttacksData[0]?.count ? Math.round((attack.count / topAttacksData[0].count) * 100) : 0;
              return (
                <div key={attack.type} className={`p-3 rounded-xl border ${sc.bg} ${sc.border} group hover:brightness-110 transition-all`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-bold text-slate-500">#{i + 1}</span>
                    <Icon className={`w-3.5 h-3.5 ${sc.color}`} />
                    <span className={`text-xs font-semibold ${sc.color} flex-1`}>{attack.type}</span>
                    <span className="text-xs font-black text-white">{attack.count}</span>
                    <span className={`text-[10px] font-medium ${attack.change > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {attack.change > 0 ? '+' : ''}{attack.change}%
                    </span>
                  </div>
                  <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${sc.dot}`}
                      style={{ width: `${pct}%`, transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Section 4: Trafic réseau + Distribution ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              Trafic réseau en temps réel
            </h3>
            <div className="flex gap-3 text-[11px] text-slate-500">
              <span className="flex items-center gap-1"><span className="w-3 h-px bg-blue-400 inline-block" />Entrant</span>
              <span className="flex items-center gap-1"><span className="w-3 h-px bg-emerald-400 inline-block" />Sortant</span>
              <span className="flex items-center gap-1"><span className="w-3 h-px bg-red-400 inline-block" />Bloqué</span>
            </div>
          </div>
          <AreaChart data={trafficData} height={180} />
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            Répartition des alertes
          </h3>
          <DonutChart segments={donutData} label="alertes" value={`${totalAlerts}`} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              { label: 'Critique',  val: criticalAlerts, color: 'text-red-400',    bg: 'bg-red-500/10' },
              { label: 'Nouveaux',  val: newAlerts,      color: 'text-blue-400',   bg: 'bg-blue-500/10' },
              { label: 'Résolus',   val: resolvedAlerts, color: 'text-green-400',  bg: 'bg-green-500/10' },
              { label: 'Bloqués',   val: blockedThreats, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-lg px-2 py-1.5 text-center`}>
                <p className={`text-base font-black ${s.color}`}>{s.val}</p>
                <p className="text-[10px] text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Section 5: Journal des alertes ────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            Journal des alertes
            {newAlerts > 0 && (
              <span className="ml-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                {newAlerts}
              </span>
            )}
          </h3>
          <button onClick={() => onNavigate('alerts')}
            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
            Voir tout <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-800/40">
              <tr>
                {['Heure', 'IP Source', 'Type d\'attaque', 'Titre', 'Gravité', 'Statut'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-slate-400 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alertLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-xs">Chargement des alertes...</td>
                </tr>
              ) : alertLogs.slice(0, 12).map((log, i) => {
                const sc = severityConfig[log.severity];
                const stc = statusConfig[log.status];
                return (
                  <tr key={log.id}
                    className={`border-t border-slate-800/50 hover:bg-slate-800/30 transition-colors ${i === 0 && log.status === 'new' ? 'bg-blue-500/3' : ''}`}>
                    <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap font-mono text-[11px]">
                      {new Date(log.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-slate-300 text-[11px] whitespace-nowrap">{log.source_ip}</td>
                    <td className="px-4 py-2.5 text-slate-200 font-medium whitespace-nowrap">{log.attack_type}</td>
                    <td className="px-4 py-2.5 text-slate-400 text-[11px] truncate max-w-40">{log.title}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase ${sc.bg} ${sc.border} ${sc.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${stc.bg} ${stc.color}`}>
                        {stc.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 6: Historique + État système ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Historical stats */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              Historique & Statistiques — {period === '24h' ? '24 heures' : period === '7d' ? '7 jours' : '30 jours'}
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Paquets / période', value: (periodStats.packetsAnalyzed / 1000).toFixed(0) + 'K', color: 'text-blue-400' },
              { label: 'Menaces bloquées', value: periodStats.threatsBlocked.toLocaleString('fr'), color: 'text-emerald-400' },
              { label: 'Confiance moyenne', value: `${periodStats.aiConfidence.toFixed(1)}%`, color: 'text-cyan-400' },
            ].map(s => (
              <div key={s.label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center">
                <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <BarChart data={packetBarData} height={130} showValues={false} />
        </div>

        {/* System Status */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <Server className="w-4 h-4 text-slate-400" />
            État du système
          </h3>
          <div className="space-y-3">
            {[
              { name: 'Moteur IA (Scikit-learn)', status: 'optimal', uptime: '99.9%', cpu: 28 },
              { name: 'Analyse paquets', status: 'optimal', uptime: '100%', cpu: 44 },
              { name: 'Base de données', status: 'healthy', uptime: '99.7%', cpu: 31 },
              { name: 'API FastAPI', status: 'optimal', uptime: '99.9%', cpu: 18 },
              { name: 'Firewall / IDS', status: 'healthy', uptime: '99.8%', cpu: 52 },
            ].map(sys => (
              <div key={sys.name} className="p-2.5 bg-slate-800/40 rounded-xl border border-slate-700/50">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-medium text-slate-300 truncate">{sys.name}</span>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <PulsingDot color={sys.status === 'optimal' ? 'bg-emerald-400' : 'bg-blue-400'} />
                    <span className={`text-[10px] font-medium ${sys.status === 'optimal' ? 'text-emerald-400' : 'text-blue-400'}`}>
                      {sys.uptime}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${sys.cpu > 70 ? 'bg-orange-500' : sys.cpu > 50 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                      style={{ width: `${sys.cpu}%` }} />
                  </div>
                  <span className="text-[10px] text-slate-500 flex-shrink-0">CPU {sys.cpu}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Live pulse footer ──────────────────────────────── */}
      <div className="flex items-center gap-3 p-3 bg-blue-500/5 border border-blue-500/15 rounded-xl">
        <Radio className="w-4 h-4 text-blue-400 animate-pulse flex-shrink-0" />
        <p className="text-[11px] text-blue-300 flex-1">
          <span className="font-semibold text-blue-400">Système IA actif</span> — Analyse continue des paquets réseau • Auto-actualisation toutes les 30s • Moteur ML Scikit-learn opérationnel • {newAlerts} alertes en attente de traitement
        </p>
        <button onClick={() => onNavigate('recommendations')}
          className="flex-shrink-0 text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors">
          Recommandations IA <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
