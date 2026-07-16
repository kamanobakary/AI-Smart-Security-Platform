import { useState } from 'react';
import { Lightbulb, Shield, AlertTriangle, CheckCircle2, Clock, ChevronDown, ChevronUp, Zap } from 'lucide-react';
import type { AIRecommendation, Severity } from '../types';

const aiRecommendations: AIRecommendation[] = [
  {
    id: 'rec-1',
    priority: 'critical',
    category: 'Authentication',
    title: 'Activer l\'authentification multi-facteurs',
    description: 'L\'IA a détecté 23 tentatives de connexion suspectes depuis des IPs inconnues. L\'activation de MFA réduirait ce risque de 99.9%.',
    action: 'Configurer MFA pour tous les comptes admin et analyst',
    impact: 'Réduction du risque de compromission de 99.9%',
    effort: 'low',
    status: 'pending',
  },
  {
    id: 'rec-2',
    priority: 'critical',
    category: 'Network',
    title: 'Bloquer les IPs suspectes identifiées',
    description: 'Analyse IA: 47 adresses IP ont été identifiées comme sources d\'attaques répétées. Un blocage immédiat est recommandé.',
    action: 'Ajouter les IPs à la liste de blocage du firewall',
    impact: 'Réduction de 34% des tentatives d\'intrusion',
    effort: 'low',
    status: 'in_progress',
  },
  {
    id: 'rec-3',
    priority: 'high',
    category: 'Vulnerability',
    title: 'Mettre à jour les dépendances critiques',
    description: '12 bibliothèques avec des CVE critiques ont été détectées dans l\'environnement de production.',
    action: 'Appliquer les patches de sécurité pour les composants affectés',
    impact: 'Fermeture de 12 vecteurs d\'attaque connus',
    effort: 'medium',
    status: 'pending',
  },
  {
    id: 'rec-4',
    priority: 'high',
    category: 'Access Control',
    title: 'Réviser les permissions d\'accès excessives',
    description: 'L\'analyse comportementale révèle que 8 utilisateurs disposent de privilèges dépassant leurs besoins opérationnels.',
    action: 'Appliquer le principe du moindre privilège',
    impact: 'Réduction de la surface d\'attaque interne',
    effort: 'medium',
    status: 'pending',
  },
  {
    id: 'rec-5',
    priority: 'medium',
    category: 'Monitoring',
    title: 'Améliorer la surveillance des endpoints',
    description: '5 endpoints ne remontent pas de logs depuis plus de 24h. Un angle mort potentiel a été identifié.',
    action: 'Vérifier et reconfigurer les agents de monitoring',
    impact: 'Visibilité complète sur 100% du périmètre',
    effort: 'low',
    status: 'completed',
  },
  {
    id: 'rec-6',
    priority: 'medium',
    category: 'Encryption',
    title: 'Renforcer le chiffrement des communications',
    description: 'Des connexions TLS 1.0 ont été détectées. Une migration vers TLS 1.3 est fortement recommandée.',
    action: 'Désactiver TLS 1.0/1.1, forcer TLS 1.2+',
    impact: 'Élimination des vulnérabilités SSL/TLS connues',
    effort: 'medium',
    status: 'pending',
  },
  {
    id: 'rec-7',
    priority: 'low',
    category: 'Training',
    title: 'Formation anti-phishing pour les équipes',
    description: '3 utilisateurs ont cliqué sur des liens suspects dans les 30 derniers jours. Une formation ciblée est recommandée.',
    action: 'Organiser des sessions de sensibilisation',
    impact: 'Réduction du risque humain',
    effort: 'high',
    status: 'pending',
  },
];

const severityConfig: Record<Severity, { label: string; color: string; bg: string; border: string; dot: string }> = {
  critical: { label: 'Critique', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', dot: 'bg-red-500' },
  high: { label: 'Élevé', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', dot: 'bg-orange-500' },
  medium: { label: 'Moyen', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', dot: 'bg-yellow-500' },
  low: { label: 'Faible', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', dot: 'bg-green-500' },
};

const effortLabels: Record<string, string> = { low: 'Faible', medium: 'Moyen', high: 'Élevé' };
const effortColors: Record<string, string> = { low: 'text-green-400', medium: 'text-yellow-400', high: 'text-red-400' };

const statusConfig = {
  pending: { label: 'En attente', icon: Clock, color: 'text-slate-400', bg: 'bg-slate-500/10' },
  in_progress: { label: 'En cours', icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  completed: { label: 'Terminé', icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10' },
};

const riskScore = 62;

export default function AIRecommendations() {
  const [recs, setRecs] = useState<AIRecommendation[]>(aiRecommendations);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  function updateStatus(id: string, status: AIRecommendation['status']) {
    setRecs(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  }

  const filtered = recs.filter(r => {
    const matchP = filterPriority === 'all' || r.priority === filterPriority;
    const matchS = filterStatus === 'all' || r.status === filterStatus;
    return matchP && matchS;
  });

  const completedCount = recs.filter(r => r.status === 'completed').length;
  const progressPct = Math.round((completedCount / recs.length) * 100);

  const riskColor = riskScore >= 70 ? 'text-green-400' : riskScore >= 50 ? 'text-yellow-400' : 'text-red-400';
  const riskRing = riskScore >= 70 ? '#10B981' : riskScore >= 50 ? '#F59E0B' : '#EF4444';
  const circumference = 2 * Math.PI * 40;
  const dashOffset = circumference - (riskScore / 100) * circumference;

  const priorityOrder: Severity[] = ['critical', 'high', 'medium', 'low'];
  const sortedFiltered = [...filtered].sort((a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-400" /> Centre de recommandations IA
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">Conseils automatiques pour renforcer votre posture de sécurité</p>
      </div>

      {/* Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Risk score */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex items-center gap-5">
          <div className="relative flex-shrink-0">
            <svg width="100" height="100" viewBox="-10 -10 100 100">
              <circle cx="40" cy="40" r="40" fill="none" stroke="#1E293B" strokeWidth="8" />
              <circle cx="40" cy="40" r="40" fill="none" stroke={riskRing} strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${circumference}`}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 40 40)"
                style={{ filter: `drop-shadow(0 0 4px ${riskRing}60)` }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold ${riskColor}`}>{riskScore}</span>
              <span className="text-[10px] text-slate-500">/100</span>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Score de risque</p>
            <p className="text-xs text-slate-400 mt-1">Niveau de risque actuel</p>
            <p className={`text-xs font-medium mt-1 ${riskColor}`}>
              {riskScore >= 70 ? 'Risque faible' : riskScore >= 50 ? 'Risque modéré' : 'Risque élevé'}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-sm font-semibold text-white mb-1">Progression</p>
          <p className="text-xs text-slate-400 mb-3">{completedCount}/{recs.length} recommandations appliquées</p>
          <div className="h-3 bg-slate-800 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all"
              style={{ width: `${progressPct}%` }} />
          </div>
          <p className="text-xs text-slate-500">{progressPct}% de réduction du risque estimée</p>
        </div>

        {/* Priority counts */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <p className="text-sm font-semibold text-white mb-3">Priorités en attente</p>
          <div className="space-y-2">
            {(['critical', 'high', 'medium', 'low'] as Severity[]).map(p => {
              const count = recs.filter(r => r.priority === p && r.status !== 'completed').length;
              const sc = severityConfig[p];
              return (
                <div key={p} className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sc.dot}`} />
                  <span className="text-xs text-slate-400 flex-1">{sc.label}</span>
                  <span className={`text-xs font-bold ${sc.color}`}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">Priorité:</span>
          {(['all', 'critical', 'high', 'medium', 'low'] as const).map(p => (
            <button key={p} onClick={() => setFilterPriority(p)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${filterPriority === p ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
              {p === 'all' ? 'Toutes' : severityConfig[p].label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500">Statut:</span>
          {(['all', 'pending', 'in_progress', 'completed'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${filterStatus === s ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
              {s === 'all' ? 'Tous' : statusConfig[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* Recommendations list */}
      <div className="space-y-3">
        {sortedFiltered.map((rec, idx) => {
          const sc = severityConfig[rec.priority];
          const stc = statusConfig[rec.status];
          const StatusIcon = stc.icon;
          const isExpanded = expanded === rec.id;

          return (
            <div key={rec.id} className={`bg-slate-900 border rounded-xl transition-all ${rec.status === 'completed' ? 'border-slate-800 opacity-70' : 'border-slate-800 hover:border-slate-700'}`}>
              <div className="p-4 cursor-pointer" onClick={() => setExpanded(isExpanded ? null : rec.id)}>
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-slate-600 w-4">#{idx + 1}</span>
                    <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${sc.dot} ${rec.priority === 'critical' ? 'animate-pulse' : ''}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-sm font-semibold ${rec.status === 'completed' ? 'text-slate-400 line-through' : 'text-white'}`}>
                            {rec.title}
                          </p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${sc.bg} ${sc.color} ${sc.border}`}>
                            {sc.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-1">{rec.description}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg ${stc.bg} ${stc.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {stc.label}
                        </span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500">
                      <span className="bg-slate-800 px-2 py-0.5 rounded">{rec.category}</span>
                      <span>Effort: <span className={effortColors[rec.effort]}>{effortLabels[rec.effort]}</span></span>
                    </div>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-slate-800 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="bg-slate-800/50 rounded-xl p-3">
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide mb-1">Description</p>
                        <p className="text-xs text-slate-300 leading-relaxed">{rec.description}</p>
                      </div>
                      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
                        <p className="text-[10px] text-blue-400 font-medium uppercase tracking-wide mb-1 flex items-center gap-1">
                          <Zap className="w-3 h-3" /> Action recommandée
                        </p>
                        <p className="text-xs text-slate-300 leading-relaxed">{rec.action}</p>
                      </div>
                      <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3">
                        <p className="text-[10px] text-green-400 font-medium uppercase tracking-wide mb-1 flex items-center gap-1">
                          <Shield className="w-3 h-3" /> Impact attendu
                        </p>
                        <p className="text-xs text-slate-300 leading-relaxed">{rec.impact}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="bg-slate-800/50 rounded-xl p-3">
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide mb-2">Détails</p>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Priorité</span>
                            <span className={sc.color}>{sc.label}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Effort</span>
                            <span className={effortColors[rec.effort]}>{effortLabels[rec.effort]}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Catégorie</span>
                            <span className="text-slate-300">{rec.category}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wide mb-2">Changer le statut</p>
                        <div className="grid grid-cols-3 gap-2">
                          {(['pending', 'in_progress', 'completed'] as const).map(s => {
                            const stcBtn = statusConfig[s];
                            const BtnIcon = stcBtn.icon;
                            return (
                              <button key={s} onClick={() => updateStatus(rec.id, s)}
                                className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-medium transition-all ${rec.status === s ? `border-current ${stcBtn.color} ${stcBtn.bg}` : 'border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-300'}`}>
                                <BtnIcon className="w-4 h-4" />
                                <span className="text-[10px]">{stcBtn.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
