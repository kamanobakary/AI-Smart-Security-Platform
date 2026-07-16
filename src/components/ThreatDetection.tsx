import { useState, useMemo, useEffect } from 'react';
import { Brain, Shield, Bug, Lock, UserX, Activity, TrendingUp, TrendingDown, Minus, Cpu, Eye, X } from 'lucide-react';
import { fetchThreatStats, fetchSecurityEvents, type ThreatStat, type DbSecurityEvent } from '../lib/database';
import DonutChart from './charts/DonutChart';
import BehavioralPanel from './BehavioralPanel';
import AnomalyPanel from './AnomalyPanel';

const threatCategoryDefs = [
  {
    id: 'intrusion',
    title: 'Détection d\'intrusion',
    icon: Shield,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    activeColor: 'text-red-300',
    activeBg: 'bg-red-500/25',
    activeBorder: 'border-red-500',
    keywords: ['Port Scan', 'Zero-Day Exploit', 'XSS Attack', 'CSRF Attack', 'Command Injection', 'SQL Injection', 'Buffer Overflow'],
    description: 'Analyse des tentatives d\'accès non autorisé aux systèmes.',
    techniques: ['Port scanning', 'Exploit de vulnérabilités', 'Injection de commandes', 'Buffer overflow'],
    trend: 12,
  },
  {
    id: 'malware',
    title: 'Détection de malware',
    icon: Bug,
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    activeColor: 'text-orange-300',
    activeBg: 'bg-orange-500/25',
    activeBorder: 'border-orange-500',
    keywords: ['Ransomware', 'Malware', 'Phishing', 'MITM Attack', 'Zero-Day Exploit'],
    description: 'Identification des logiciels malveillants et ransomwares.',
    techniques: ['Ransomware', 'Spyware', 'Trojan', 'Rootkit'],
    trend: -8,
  },
  {
    id: 'unauthorized',
    title: 'Accès non autorisés',
    icon: Lock,
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    activeColor: 'text-yellow-300',
    activeBg: 'bg-yellow-500/25',
    activeBorder: 'border-yellow-500',
    keywords: ['Brute Force', 'Credential Stuffing', 'Phishing'],
    description: 'Surveillance des tentatives d\'authentification anormales.',
    techniques: ['Brute force', 'Credential stuffing', 'Password spraying', 'Pass-the-hash'],
    trend: 5,
  },
  {
    id: 'behavioral',
    title: 'Analyse comportementale',
    icon: UserX,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    activeColor: 'text-blue-300',
    activeBg: 'bg-blue-500/25',
    activeBorder: 'border-blue-500',
    keywords: ['MITM Attack', 'DNS Spoofing', 'Phishing', 'DDoS Attack'],
    description: 'Détection des comportements utilisateurs anormaux (UBA/UEBA).',
    techniques: ['Exfiltration de données', 'Mouvement latéral', 'Élévation de privilèges', 'Accès inhabituels'],
    trend: -3,
  },
  {
    id: 'anomaly',
    title: 'Identification d\'anomalies',
    icon: Activity,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    activeColor: 'text-cyan-300',
    activeBg: 'bg-cyan-500/25',
    activeBorder: 'border-cyan-500',
    keywords: ['DDoS Attack', 'DNS Spoofing'],
    description: 'Détection des déviations statistiques par rapport au comportement normal.',
    techniques: ['Trafic anormal', 'Heure de connexion suspecte', 'Volume de données inhabituel', 'Protocoles rares'],
    trend: 2,
  },
];

const aiModels = [
  { name: 'Moteur de détection d\'intrusion', accuracy: 98.7, version: 'v3.2.1', status: 'active' },
  { name: 'Analyseur comportemental UEBA', accuracy: 96.2, version: 'v2.8.0', status: 'active' },
  { name: 'Classificateur de malware', accuracy: 99.1, version: 'v4.1.0', status: 'active' },
  { name: 'Modèle de détection d\'anomalies', accuracy: 94.8, version: 'v2.3.5', status: 'training' },
  { name: 'Analyseur de réseau DPI', accuracy: 97.4, version: 'v3.0.2', status: 'active' },
];


// Maps a technique label to matching event_type keywords
const techniqueToAttackKeywords: Record<string, string[]> = {
  // Intrusion
  'Port scanning':              ['Port Scan'],
  'Exploit de vulnérabilités':  ['Zero-Day Exploit', 'XSS Attack', 'CSRF Attack'],
  'Injection de commandes':     ['Command Injection', 'SQL Injection'],
  'Buffer overflow':            ['Buffer Overflow'],
  // Malware
  'Ransomware':                 ['Ransomware'],
  'Spyware':                    ['Malware', 'Phishing'],
  'Trojan':                     ['Malware', 'MITM Attack'],
  'Rootkit':                    ['Malware', 'Zero-Day Exploit'],
  // Unauthorized
  'Brute force':                ['Brute Force'],
  'Credential stuffing':        ['Credential Stuffing'],
  'Password spraying':          ['Brute Force'],
  'Pass-the-hash':              ['Brute Force'],
  // Behavioral
  'Exfiltration de données':    ['MITM Attack', 'DNS Spoofing'],
  'Mouvement latéral':          ['MITM Attack'],
  'Élévation de privilèges':    ['Brute Force', 'Zero-Day Exploit'],
  'Accès inhabituels':          ['Phishing', 'DDoS Attack'],
  // Anomaly
  'Trafic anormal':             ['DDoS Attack'],
  'Heure de connexion suspecte':['Phishing'],
  'Volume de données inhabituel':['DDoS Attack', 'MITM Attack'],
  'Protocoles rares':           ['DNS Spoofing'],
};


export default function ThreatDetection() {
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [activeTechnique, setActiveTechnique] = useState<string | null>(null);
  const [activeMalwareTechnique, setActiveMalwareTechnique] = useState<string | null>(null);
  const [activeUnauthorizedTechnique, setActiveUnauthorizedTechnique] = useState<string | null>(null);
  const [threatStatsData, setThreatStatsData] = useState<ThreatStat[]>([]);
  const [events, setEvents] = useState<DbSecurityEvent[]>([]);

  useEffect(() => {
    fetchThreatStats().then(setThreatStatsData).catch(() => {});
    fetchSecurityEvents(200).then(setEvents).catch(() => {});
  }, []);

  const allCriticalThreats = useMemo(
    () => events.filter(e => e.severity === 'critical' || e.severity === 'high').slice(0, 30),
    [events]
  );

  // Compute category counts from real events
  const threatCategories = useMemo(() => threatCategoryDefs.map(def => {
    const matching = events.filter(e => def.keywords.some(k => e.event_type.includes(k)));
    const count = matching.length;
    const blocked = matching.filter(e => e.status === 'resolved').length;
    return { ...def, count, blocked };
  }), [events]);

  const donutData = useMemo(() => [
    { label: 'Intrusion', value: threatCategories[0]?.count ?? 0, color: '#EF4444' },
    { label: 'Malware', value: threatCategories[1]?.count ?? 0, color: '#F97316' },
    { label: 'Accès non auth.', value: threatCategories[2]?.count ?? 0, color: '#EAB308' },
    { label: 'Comportemental', value: threatCategories[3]?.count ?? 0, color: '#3B82F6' },
    { label: 'Anomalies', value: threatCategories[4]?.count ?? 0, color: '#06B6D4' },
  ], [threatCategories]);

  // Per-technique counts from real events
  const malwareTechniqueStats = useMemo((): Record<string, { count: number; blocked: number }> => {
    const techKeywords: Record<string, string[]> = {
      'Ransomware': ['Ransomware'],
      'Spyware': ['Malware', 'Phishing'],
      'Trojan': ['Malware', 'MITM Attack'],
      'Rootkit': ['Malware', 'Zero-Day Exploit'],
    };
    const result: Record<string, { count: number; blocked: number }> = {};
    for (const [tech, kws] of Object.entries(techKeywords)) {
      const matching = events.filter(e => kws.some(k => e.event_type.includes(k)));
      result[tech] = { count: matching.length, blocked: matching.filter(e => e.status === 'resolved').length };
    }
    return result;
  }, [events]);

  const unauthorizedTechniqueStats = useMemo((): Record<string, { count: number; blocked: number }> => {
    const techKeywords: Record<string, string[]> = {
      'Brute force': ['Brute Force'],
      'Credential stuffing': ['Credential Stuffing'],
      'Password spraying': ['Brute Force'],
      'Pass-the-hash': ['Brute Force'],
    };
    const result: Record<string, { count: number; blocked: number }> = {};
    for (const [tech, kws] of Object.entries(techKeywords)) {
      const matching = events.filter(e => kws.some(k => e.event_type.includes(k)));
      result[tech] = { count: matching.length, blocked: matching.filter(e => e.status === 'resolved').length };
    }
    return result;
  }, [events]);

  // Table filter: intrusion technique drives the main events table
  const filteredThreats = useMemo(() => {
    if (!activeTechnique) return allCriticalThreats.slice(0, 10);
    const keywords = techniqueToAttackKeywords[activeTechnique] ?? [];
    return allCriticalThreats.filter(e => keywords.some(k => e.event_type.includes(k)));
  }, [activeTechnique, allCriticalThreats]);

  // Malware filtered events (shown inside the card)
  const malwareEvents = useMemo(() => {
    const base = events.filter(e =>
      ['Ransomware', 'Malware', 'Phishing', 'MITM Attack', 'Zero-Day Exploit'].some(k => e.event_type.includes(k))
    );
    if (!activeMalwareTechnique) return base;
    const keywords = techniqueToAttackKeywords[activeMalwareTechnique] ?? [];
    return base.filter(e => keywords.some(k => e.event_type.includes(k)));
  }, [activeMalwareTechnique, events]);

  // Dynamic malware card stats
  const malwareStats = useMemo(() => {
    const base = threatCategories[1] ? { count: threatCategories[1].count, blocked: threatCategories[1].blocked } : { count: 0, blocked: 0 };
    if (!activeMalwareTechnique) return base;
    return malwareTechniqueStats[activeMalwareTechnique] ?? base;
  }, [activeMalwareTechnique, malwareTechniqueStats, threatCategories]);

  // Unauthorized filtered events (shown inside the card)
  const unauthorizedEvents = useMemo(() => {
    const base = events.filter(e =>
      ['Brute Force', 'Credential Stuffing', 'Phishing'].some(k => e.event_type.includes(k))
    );
    if (!activeUnauthorizedTechnique) return base;
    const keywords = techniqueToAttackKeywords[activeUnauthorizedTechnique] ?? [];
    return base.filter(e => keywords.some(k => e.event_type.includes(k)));
  }, [activeUnauthorizedTechnique, events]);

  // Dynamic unauthorized card stats
  const unauthorizedStats = useMemo(() => {
    const base = threatCategories[2] ? { count: threatCategories[2].count, blocked: threatCategories[2].blocked } : { count: 0, blocked: 0 };
    if (!activeUnauthorizedTechnique) return base;
    return unauthorizedTechniqueStats[activeUnauthorizedTechnique] ?? base;
  }, [activeUnauthorizedTechnique, unauthorizedTechniqueStats, threatCategories]);

  function handleTechniqueClick(e: React.MouseEvent, technique: string, catId: string) {
    e.stopPropagation();
    if (catId === 'intrusion') {
      setActiveTechnique(prev => prev === technique ? null : technique);
    } else if (catId === 'malware') {
      setActiveMalwareTechnique(prev => prev === technique ? null : technique);
    } else if (catId === 'unauthorized') {
      setActiveUnauthorizedTechnique(prev => prev === technique ? null : technique);
    }
  }

  function handleCatClick(catId: string) {
    const isSelected = selectedCat === catId;
    setSelectedCat(isSelected ? null : catId);
    if (isSelected) {
      if (catId === 'intrusion') setActiveTechnique(null);
      if (catId === 'malware') setActiveMalwareTechnique(null);
      if (catId === 'unauthorized') setActiveUnauthorizedTechnique(null);
    }
  }

  const activeKeywords = activeTechnique ? (techniqueToAttackKeywords[activeTechnique] ?? []) : [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Brain className="w-5 h-5 text-blue-400" /> Détection des menaces par IA
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">Intelligence artificielle avancée pour identifier et neutraliser les cybermenaces</p>
      </div>

      {/* AI Status */}
      <div className="bg-gradient-to-r from-blue-500/5 to-cyan-500/5 border border-blue-500/20 rounded-xl p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
          <Cpu className="w-6 h-6 text-blue-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Moteur IA opérationnel</p>
          <p className="text-xs text-slate-400">5 modèles actifs • Précision moyenne: 97.2% • {events.length.toLocaleString('fr')} événements analysés</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span className="text-xs text-green-400 font-medium">Actif</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Threat distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <Eye className="w-4 h-4 text-blue-400" /> Distribution des menaces
          </h3>
          <DonutChart segments={donutData} label="menaces" value={donutData.reduce((s, d) => s + d.value, 0).toLocaleString('fr')} />

          <div className="mt-4 space-y-2">
            {threatStatsData.map(s => (
              <div key={s.type} className="flex items-center gap-2">
                <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${s.percentage}%`, opacity: 0.6 + s.percentage / 100 }} />
                </div>
                <span className="text-xs text-slate-400 w-20 text-right">{s.type}</span>
                <span className="text-xs font-medium text-slate-300 w-8 text-right">{s.percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Threat categories */}
        <div className="lg:col-span-2 space-y-3">
          {threatCategories.map(cat => {
            const Icon = cat.icon;
            const isSelected = selectedCat === cat.id;
            const isIntrusion = cat.id === 'intrusion';
            const isMalware = cat.id === 'malware';
            const isUnauthorized = cat.id === 'unauthorized';
            const isBehavioral = cat.id === 'behavioral';
            const isAnomaly = cat.id === 'anomaly';

            // Dynamic stats per card
            const displayCount = isMalware ? malwareStats.count : isUnauthorized ? unauthorizedStats.count : cat.count;
            const displayBlocked = isMalware ? malwareStats.blocked : isUnauthorized ? unauthorizedStats.blocked : cat.blocked;
            const efficiency = Math.round((displayBlocked / displayCount) * 100);

            return (
              <div key={cat.id}
                onClick={() => handleCatClick(cat.id)}
                className={`bg-slate-900 border rounded-xl p-4 cursor-pointer transition-all ${
                  isSelected
                    ? isMalware
                      ? 'border-orange-500/40 ring-1 ring-orange-500/20'
                      : isUnauthorized
                        ? 'border-yellow-500/40 ring-1 ring-yellow-500/20'
                        : isBehavioral
                          ? 'border-blue-500/40 ring-1 ring-blue-500/20'
                          : 'border-blue-500/40 ring-1 ring-blue-500/20'
                    : 'border-slate-800 hover:border-slate-700'
                }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg ${cat.bg} border ${cat.border} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-4 h-4 ${cat.color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{cat.title}</p>
                      <p className="text-xs text-slate-500 transition-all">
                        {displayCount} événements • {displayBlocked} bloqués
                        {isMalware && activeMalwareTechnique && (
                          <span className="ml-1 text-orange-400/70">— {activeMalwareTechnique}</span>
                        )}
                        {isUnauthorized && activeUnauthorizedTechnique && (
                          <span className="ml-1 text-yellow-400/70">— {activeUnauthorizedTechnique}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`text-lg font-bold ${cat.color} transition-all`}>{efficiency}%</p>
                      <p className="text-[10px] text-slate-500">efficacité</p>
                    </div>
                    <div className={`flex items-center gap-0.5 text-xs ${cat.trend > 0 ? 'text-red-400' : cat.trend < 0 ? 'text-green-400' : 'text-slate-400'}`}>
                      {cat.trend > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : cat.trend < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                      <span>{Math.abs(cat.trend)}%</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${cat.color.replace('text', 'bg')}`}
                    style={{ width: `${efficiency}%` }} />
                </div>

                {isSelected && isBehavioral && (
                  <BehavioralPanel onStopPropagation={e => e.stopPropagation()} />
                )}

                {isSelected && isAnomaly && (
                  <AnomalyPanel onStopPropagation={e => e.stopPropagation()} />
                )}

                {isSelected && !isBehavioral && !isAnomaly && (
                  <div className="mt-4 pt-3 border-t border-slate-800">
                    <p className="text-xs text-slate-400 mb-3">{cat.description}</p>

                    {/* Technique buttons */}
                    <div className="flex flex-wrap gap-1.5">
                      {/* "Tous" reset button — malware and unauthorized */}
                      {isMalware && (
                        <button
                          onClick={e => { e.stopPropagation(); setActiveMalwareTechnique(null); }}
                          className={`text-[10px] px-2.5 py-1 rounded-md border transition-all font-medium ${
                            !activeMalwareTechnique
                              ? 'bg-orange-500/25 text-orange-300 border-orange-500 shadow-sm shadow-orange-500/20 font-semibold'
                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600 hover:text-slate-300'
                          }`}
                        >
                          Tous
                          <span className={`ml-1.5 font-bold ${!activeMalwareTechnique ? 'text-orange-200' : 'text-slate-500'}`}>({threatCategories[1]?.count ?? 0})</span>
                        </button>
                      )}
                      {isUnauthorized && (
                        <button
                          onClick={e => { e.stopPropagation(); setActiveUnauthorizedTechnique(null); }}
                          className={`text-[10px] px-2.5 py-1 rounded-md border transition-all font-medium ${
                            !activeUnauthorizedTechnique
                              ? 'bg-yellow-500/25 text-yellow-300 border-yellow-500 shadow-sm shadow-yellow-500/20 font-semibold'
                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600 hover:text-slate-300'
                          }`}
                        >
                          Tous
                          <span className={`ml-1.5 font-bold ${!activeUnauthorizedTechnique ? 'text-yellow-200' : 'text-slate-500'}`}>({threatCategories[2]?.count ?? 0})</span>
                        </button>
                      )}

                      {cat.techniques.map(t => {
                        const isActiveIntrusion = isIntrusion && activeTechnique === t;
                        const isActiveMalware = isMalware && activeMalwareTechnique === t;
                        const isActiveUnauthorized = isUnauthorized && activeUnauthorizedTechnique === t;
                        const isActive = isActiveIntrusion || isActiveMalware || isActiveUnauthorized;
                        const isInteractive = isIntrusion || isMalware || isUnauthorized;

                        const matchCount = isIntrusion
                          ? allCriticalThreats.filter(e =>
                              (techniqueToAttackKeywords[t] ?? []).some(k => e.event_type.includes(k))
                            ).length
                          : null;

                        const malwareStat = isMalware ? malwareTechniqueStats[t] : null;
                        const unauthorizedStat = isUnauthorized ? unauthorizedTechniqueStats[t] : null;

                        return (
                          <button
                            key={t}
                            onClick={e => handleTechniqueClick(e, t, cat.id)}
                            className={`text-[10px] px-2.5 py-1 rounded-md border transition-all ${
                              isInteractive
                                ? isActive
                                  ? `${cat.activeBg} ${cat.activeColor} ${cat.activeBorder} shadow-sm font-semibold`
                                  : `${cat.bg} ${cat.color} ${cat.border} hover:brightness-125 cursor-pointer`
                                : `${cat.bg} ${cat.color} ${cat.border} cursor-default`
                            }`}
                          >
                            {t}
                            {isMalware && malwareStat && (
                              <span className={`ml-1.5 font-bold ${isActive ? 'text-orange-200' : 'text-slate-500'}`}>
                                ({malwareStat.count})
                              </span>
                            )}
                            {isUnauthorized && unauthorizedStat && (
                              <span className={`ml-1.5 font-bold ${isActive ? 'text-yellow-200' : 'text-slate-500'}`}>
                                ({unauthorizedStat.count})
                              </span>
                            )}
                            {isIntrusion && matchCount !== null && (
                              <span className={`ml-1.5 font-bold ${isActive ? 'text-red-200' : 'text-slate-500'}`}>
                                ({matchCount})
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Malware filter status + events preview */}
                    {isMalware && (
                      <div className="mt-3 space-y-2">
                        {activeMalwareTechnique && (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-orange-300 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                              Filtre actif: {activeMalwareTechnique}
                              <span className="text-orange-400 font-bold ml-1">• {malwareEvents.length} événement{malwareEvents.length !== 1 ? 's' : ''}</span>
                            </span>
                            <button
                              onClick={e => { e.stopPropagation(); setActiveMalwareTechnique(null); }}
                              className="text-slate-500 hover:text-slate-300 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Mini events table inside malware card */}
                        <div className="bg-slate-800/50 rounded-lg overflow-hidden">
                          <div className="px-3 py-2 border-b border-slate-700/50 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-medium">
                              {activeMalwareTechnique ? `Événements — ${activeMalwareTechnique}` : 'Événements malware récents'}
                            </span>
                            <span className="text-[10px] text-slate-500">{malwareEvents.slice(0, 5).length} affichés</span>
                          </div>
                          {malwareEvents.length === 0 ? (
                            <p className="text-[10px] text-slate-500 text-center py-4">
                              Aucun événement pour <span className="text-orange-400">{activeMalwareTechnique}</span>
                            </p>
                          ) : (
                            <div className="divide-y divide-slate-700/30">
                              {malwareEvents.slice(0, 5).map(ev => (
                                <div key={ev.id} className="flex items-center gap-2 px-3 py-2">
                                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                    ev.severity === 'critical' ? 'bg-red-400' :
                                    ev.severity === 'high' ? 'bg-orange-400' :
                                    ev.severity === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                                  }`} />
                                  <span className="text-[10px] text-orange-300 font-medium flex-shrink-0 w-24 truncate">{ev.event_type}</span>
                                  <span className="text-[10px] text-slate-500 font-mono truncate">{ev.source_ip}</span>
                                  <span className="text-[10px] text-slate-600 flex-shrink-0 ml-auto">
                                    {new Date(ev.detected_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Unauthorized filter status + events preview */}
                    {isUnauthorized && (
                      <div className="mt-3 space-y-2">
                        {activeUnauthorizedTechnique && (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-yellow-300 bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                              Filtre actif: {activeUnauthorizedTechnique}
                              <span className="text-yellow-400 font-bold ml-1">• {unauthorizedEvents.length} événement{unauthorizedEvents.length !== 1 ? 's' : ''}</span>
                            </span>
                            <button
                              onClick={e => { e.stopPropagation(); setActiveUnauthorizedTechnique(null); }}
                              className="text-slate-500 hover:text-slate-300 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Mini events table inside unauthorized card */}
                        <div className="bg-slate-800/50 rounded-lg overflow-hidden">
                          <div className="px-3 py-2 border-b border-slate-700/50 flex items-center justify-between">
                            <span className="text-[10px] text-slate-400 font-medium">
                              {activeUnauthorizedTechnique ? `Incidents — ${activeUnauthorizedTechnique}` : 'Tentatives d\'accès récentes'}
                            </span>
                            <span className="text-[10px] text-slate-500">{Math.min(5, unauthorizedEvents.length)} affichés</span>
                          </div>
                          {unauthorizedEvents.length === 0 ? (
                            <p className="text-[10px] text-slate-500 text-center py-4">
                              Aucun incident pour <span className="text-yellow-400">{activeUnauthorizedTechnique}</span>
                            </p>
                          ) : (
                            <div className="divide-y divide-slate-700/30">
                              {unauthorizedEvents.slice(0, 5).map(ev => (
                                <div key={ev.id} className="flex items-center gap-2 px-3 py-2">
                                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                    ev.severity === 'critical' ? 'bg-red-400' :
                                    ev.severity === 'high' ? 'bg-orange-400' :
                                    ev.severity === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                                  }`} />
                                  <span className="text-[10px] text-yellow-300 font-medium flex-shrink-0 w-28 truncate">{ev.event_type}</span>
                                  <span className="text-[10px] text-slate-500 font-mono truncate">{ev.source_ip}</span>
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded flex-shrink-0 font-semibold uppercase ml-auto ${
                                    ev.status === 'new' ? 'bg-blue-500/10 text-blue-400' :
                                    ev.status === 'in_progress' ? 'bg-yellow-500/10 text-yellow-400' :
                                    'bg-green-500/10 text-green-400'
                                  }`}>
                                    {ev.status === 'new' ? 'Nouveau' : ev.status === 'in_progress' ? 'En cours' : 'Résolu'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Intrusion filter status */}
                    {isIntrusion && activeTechnique && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className="text-[11px] text-red-300 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                          Filtre actif: {activeTechnique}
                          <span className="text-red-400 font-bold ml-1">• {filteredThreats.length} résultat{filteredThreats.length !== 1 ? 's' : ''}</span>
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); setActiveTechnique(null); }}
                          className="text-slate-500 hover:text-slate-300 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Models */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-blue-400" /> Modèles IA déployés
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {aiModels.map(m => (
            <div key={m.name} className="bg-slate-800/50 rounded-xl p-3">
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs font-medium text-slate-200 leading-tight pr-2">{m.name}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md flex-shrink-0 ${m.status === 'active' ? 'bg-green-500/15 text-green-400' : 'bg-yellow-500/15 text-yellow-400'}`}>
                  {m.status === 'active' ? 'Actif' : 'Entraînem.'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">{m.version}</span>
                <div className="flex items-center gap-1.5">
                  <div className="h-1 w-16 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${m.accuracy}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-blue-400">{m.accuracy}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent critical threats */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Activity className="w-4 h-4 text-red-400" /> Menaces critiques récentes
            {activeTechnique && (
              <span className="ml-1 text-[10px] bg-red-500/15 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full">
                {filteredThreats.length} résultat{filteredThreats.length !== 1 ? 's' : ''}
              </span>
            )}
          </h3>
          {activeTechnique && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">
                Filtre: <span className="text-red-400 font-medium">{activeTechnique}</span>
                {activeKeywords.length > 0 && (
                  <span className="text-slate-500"> ({activeKeywords.join(', ')})</span>
                )}
              </span>
              <button
                onClick={() => setActiveTechnique(null)}
                className="text-[11px] text-slate-500 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2 py-0.5 rounded-lg transition-all flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Tout afficher
              </button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800">
                {['Heure', 'Type', 'IP Source', 'Pays', 'Protocole', 'Gravité', 'Statut'].map(h => (
                  <th key={h} className="pb-2 text-left text-slate-500 font-medium pr-4 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredThreats.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                    Aucun événement correspondant à <span className="text-red-400 font-medium">{activeTechnique}</span>
                  </td>
                </tr>
              ) : (
                filteredThreats.map(ev => {
                  const isHighlighted = activeTechnique && activeKeywords.some(k => ev.event_type.includes(k));
                  return (
                    <tr key={ev.id}
                      className={`border-b border-slate-800/40 transition-colors ${isHighlighted ? 'bg-red-500/5 hover:bg-red-500/10' : 'hover:bg-slate-800/30'}`}>
                      <td className="py-2.5 pr-4 font-mono text-slate-500 whitespace-nowrap">
                        {new Date(ev.detected_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className={`py-2.5 pr-4 font-medium whitespace-nowrap ${isHighlighted ? 'text-red-300' : 'text-slate-200'}`}>
                        {ev.event_type}
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-slate-400">{ev.source_ip}</td>
                      <td className="py-2.5 pr-4 text-slate-400">{ev.country}</td>
                      <td className="py-2.5 pr-4 text-slate-400">{ev.protocol}</td>
                      <td className="py-2.5 pr-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${ev.severity === 'critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'}`}>
                          {ev.severity}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-400">
                        {ev.status === 'resolved' ? 'Résolu' : ev.status === 'in_progress' ? 'En cours' : 'Nouveau'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
