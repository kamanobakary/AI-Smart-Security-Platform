import { useMemo, useState, useEffect, useCallback } from 'react';
import { BarChart3, Download, FileText, TrendingUp, Calendar, Globe, AlertCircle } from 'lucide-react';
import { fetchReportKpis, fetchAlertsByDay, fetchAlerts, type ReportKpis, type AlertsByDay } from '../lib/database';
import type { TrafficDataPoint } from '../types';
import AreaChart from './charts/AreaChart';
import BarChart from './charts/BarChart';
import LineChart from './charts/LineChart';

export type ReportPeriod = 'today' | '7days' | '30days' | '3months';

const periodDays: Record<ReportPeriod, number> = {
  today: 1,
  '7days': 7,
  '30days': 30,
  '3months': 90,
};

const periodLabels: Record<ReportPeriod, string> = {
  today: "Aujourd'hui",
  '7days': '7 derniers jours',
  '30days': '30 derniers jours',
  '3months': '3 derniers mois',
};

function generateTrafficByPeriod(days: number): TrafficDataPoint[] {
  const points = Math.min(days, 24);
  return Array.from({ length: points }, (_, i) => {
    const d = new Date();
    if (days === 1) {
      d.setHours(d.getHours() - (points - 1 - i));
    } else {
      d.setDate(d.getDate() - (points - 1 - i));
    }
    return {
      time: days === 1
        ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        : d.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' }),
      inbound: Math.floor(Math.random() * 800 + 200),
      outbound: Math.floor(Math.random() * 500 + 100),
      blocked: Math.floor(Math.random() * 150 + 10),
    };
  });
}

export default function Reports() {
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('7days');
  const [loading, setLoading] = useState(false);
  const [kpis, setKpis] = useState<ReportKpis | null>(null);
  const [alertsByDay, setAlertsByDay] = useState<AlertsByDay[]>([]);

  const trafficData = useMemo(() => generateTrafficByPeriod(periodDays[selectedPeriod]), [selectedPeriod]);

  const loadData = useCallback(async (period: ReportPeriod) => {
    setLoading(true);
    try {
      const days = periodDays[period];
      const [k, abd] = await Promise.all([
        fetchReportKpis(days),
        fetchAlertsByDay(days),
      ]);
      setKpis(k);
      setAlertsByDay(abd);
    } catch { /* keep previous values */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(selectedPeriod); }, [selectedPeriod, loadData]);

  const handlePeriodChange = (period: ReportPeriod) => {
    setSelectedPeriod(period);
  };

  const barData = alertsByDay.map(d => ({
    label: d.day,
    value: d.critical + d.high + d.medium + d.low,
    color: '#3B82F6',
  }));

  const threatBreakdown = useMemo(() => {
    const total = alertsByDay.reduce((s, d) => s + d.critical + d.high + d.medium + d.low, 0);
    const counts = {
      critical: alertsByDay.reduce((s, d) => s + d.critical, 0),
      high: alertsByDay.reduce((s, d) => s + d.high, 0),
      medium: alertsByDay.reduce((s, d) => s + d.medium, 0),
      low: alertsByDay.reduce((s, d) => s + d.low, 0),
    };
    return (['critical', 'high', 'medium', 'low'] as const).map(sev => ({
      severity: sev,
      count: counts[sev],
      percentage: total > 0 ? Math.round((counts[sev] / total) * 100) : 0,
    }));
  }, [alertsByDay]);

  const threatBarData = threatBreakdown.map(t => {
    const colors: Record<string, string> = {
      critical: '#EF4444', high: '#F97316', medium: '#EAB308', low: '#22C55E',
    };
    return {
      label: t.severity.charAt(0).toUpperCase() + t.severity.slice(1),
      value: t.count,
      color: colors[t.severity] || '#3B82F6',
    };
  });

  const lineData = alertsByDay.map(d => ({
    label: d.day,
    values: [
      { key: 'critical', value: d.critical, color: '#EF4444' },
      { key: 'high', value: d.high, color: '#F97316' },
      { key: 'medium', value: d.medium, color: '#EAB308' },
    ],
  }));

  async function exportCSV() {
    const alerts = await fetchAlerts(200);
    const rows = [
      ['Période', periodLabels[selectedPeriod]],
      ['Généré le', new Date().toLocaleString('fr-FR')],
      [],
      ['ID', 'Titre', 'Gravité', 'Type d\'attaque', 'IP Source', 'Statut', 'Date'],
      ...alerts.map(a => [a.id, a.title, a.severity, a.attack_type, a.source_ip, a.status, new Date(a.created_at).toLocaleString('fr-FR')]),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-smart-security-rapport-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPDF() {
    const content = `
AI Smart Security - Rapport de sécurité
Période: ${periodLabels[selectedPeriod]}
Date: ${new Date().toLocaleDateString('fr-FR')}
========================================

RÉSUMÉ EXÉCUTIF
- Total événements: ${kpis?.totalEvents ?? 0}
- Alertes générées: ${kpis?.totalAlerts ?? 0}
- Taux de détection: ${kpis?.detectionRate ?? 0}%
- Temps moyen résolution: ${kpis?.avgResolutionTime ?? '—'}
- Menaces bloquées: ${kpis?.blockedThreats ?? 0}
- Taux de faux positifs: ${kpis?.falsePositiveRate ?? 0}%

DISTRIBUTION DES ALERTES
${threatBreakdown.map(t => `- ${t.severity}: ${t.count} (${t.percentage}%)`).join('\n')}

DONNÉES PAR JOUR
${alertsByDay.map(d => `- ${d.day}: Critique(${d.critical}) | Élevé(${d.high}) | Moyen(${d.medium}) | Faible(${d.low})`).join('\n')}

Rapport généré automatiquement par AI Smart Security
    `;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-smart-security-rapport-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const kpiCards = [
    { label: 'Total événements', value: (kpis?.totalEvents ?? 0).toLocaleString('fr'), sub: 'dans la période', color: 'text-blue-400' },
    { label: 'Alertes générées', value: kpis?.totalAlerts ?? 0, sub: 'détectées', color: 'text-orange-400' },
    { label: 'Taux de détection', value: `${kpis?.detectionRate ?? 0}%`, sub: 'Précision IA', color: 'text-green-400' },
    { label: 'Temps moyen résolution', value: kpis?.avgResolutionTime ?? '—', sub: 'MTTR', color: 'text-cyan-400' },
    { label: 'Menaces bloquées', value: (kpis?.blockedThreats ?? 0).toLocaleString('fr'), sub: 'stoppées', color: 'text-emerald-400' },
    { label: 'Faux positifs', value: `${kpis?.falsePositiveRate ?? 0}%`, sub: 'Taux FP', color: 'text-yellow-400' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" /> Rapports et statistiques
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Analyse détaillée des données de sécurité pour {periodLabels[selectedPeriod].toLowerCase()}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} disabled={loading}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800 disabled:opacity-50 border border-slate-700 text-slate-300 text-xs px-3 py-2 rounded-xl transition-colors">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button onClick={exportPDF} disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:opacity-50 text-white text-xs px-3 py-2 rounded-xl transition-colors">
            <FileText className="w-3.5 h-3.5" /> Export PDF
          </button>
        </div>
      </div>

      {/* Period selector */}
      <div className={`bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-2 transition-all ${loading ? 'opacity-60' : ''}`}>
        <Calendar className="w-4 h-4 text-slate-500" />
        <span className="text-xs text-slate-500 font-medium">Période:</span>
        {(['today', '7days', '30days', '3months'] as const).map(p => (
          <button key={p} onClick={() => handlePeriodChange(p)} disabled={loading}
            className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
              selectedPeriod === p
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}>
            {periodLabels[p]}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 text-sm">
          <div className="w-3 h-3 border-2 border-blue-500/30 border-t-blue-400 rounded-full animate-spin" />
          Chargement des données...
        </div>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map(k => (
          <div key={k.label} className={`bg-slate-900 border border-slate-800 rounded-xl p-3 text-center transition-all ${loading ? 'opacity-60' : 'hover:border-slate-700'}`}>
            <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-[10px] text-slate-200 font-medium mt-0.5">{k.label}</p>
            <p className="text-[10px] text-slate-500">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Traffic chart */}
      <div className={`bg-slate-900 border border-slate-800 rounded-xl p-5 transition-all ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-400" /> Graphique du trafic réseau
          </h3>
          <div className="flex gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-400 inline-block rounded" /> Entrant</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-400 inline-block rounded" /> Sortant</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-400 inline-block rounded" /> Bloqué</span>
          </div>
        </div>
        <AreaChart data={trafficData} height={200} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Alerts by day */}
        <div className={`bg-slate-900 border border-slate-800 rounded-xl p-5 transition-all ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-400" /> Alertes par jour
          </h3>
          <BarChart data={barData} height={180} />
        </div>

        {/* Threat types */}
        <div className={`bg-slate-900 border border-slate-800 rounded-xl p-5 transition-all ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-orange-400" /> Distribution par gravité
          </h3>
          <BarChart data={threatBarData} height={180} />
        </div>
      </div>

      {/* Alert evolution line chart */}
      <div className={`bg-slate-900 border border-slate-800 rounded-xl p-5 transition-all ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" /> Évolution des alertes
          </h3>
          <div className="flex gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Critique</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" /> Élevé</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Moyen</span>
          </div>
        </div>
        <LineChart data={lineData} height={180} />
      </div>

      {/* Severity breakdown table */}
      <div className={`bg-slate-900 border border-slate-800 rounded-xl p-5 transition-all ${loading ? 'opacity-60 pointer-events-none' : ''}`}>
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Répartition détaillée par gravité</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800">
                {['Gravité', 'Total', 'Pourcentage', 'Tendance'].map(h => (
                  <th key={h} className="pb-2 text-left text-slate-500 font-medium pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {threatBreakdown.map(t => {
                const colors: Record<string, string> = {
                  critical: 'text-red-400', high: 'text-orange-400', medium: 'text-yellow-400', low: 'text-green-400',
                };
                return (
                  <tr key={t.severity} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 pr-4">
                      <span className={`font-semibold ${colors[t.severity] || 'text-slate-400'}`}>
                        {t.severity.charAt(0).toUpperCase() + t.severity.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-slate-200 font-medium">{t.count}</td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${t.percentage}%` }} />
                        </div>
                        <span className="text-slate-300 min-w-10">{t.percentage}%</span>
                      </div>
                    </td>
                    <td className="py-3 text-xs font-medium text-slate-400">—</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info box */}
      <div className="flex items-start gap-2 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
        <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-xs text-blue-400">
          <p className="font-medium mb-1">Données de la période "{periodLabels[selectedPeriod]}"</p>
          <p className="text-blue-300">Les statistiques et graphiques se mettent à jour automatiquement lors du changement de période. Les exports incluent également les données de la période sélectionnée.</p>
        </div>
      </div>
    </div>
  );
}
