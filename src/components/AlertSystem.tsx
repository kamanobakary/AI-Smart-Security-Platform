import { useState, useEffect, useCallback } from 'react';
import {
  Bell, Filter, Search, CheckCircle2, Clock, AlertTriangle,
  XCircle, Eye, RefreshCw, Loader2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { fetchAlerts, updateAlertStatus as dbUpdateStatus } from '../lib/database';
import type { DbAlert, DbAlertStatus, DbSeverity } from '../lib/database';

// ─── Config maps ──────────────────────────────────────────────────────────────

const severityConfig: Record<DbSeverity, { label: string; color: string; bg: string; border: string; dot: string }> = {
  critical: { label: 'Critique', color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30',    dot: 'bg-red-500' },
  high:     { label: 'Élevé',    color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', dot: 'bg-orange-500' },
  medium:   { label: 'Moyen',    color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', dot: 'bg-yellow-500' },
  low:      { label: 'Faible',   color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30',  dot: 'bg-green-500' },
};

const statusConfig: Record<DbAlertStatus, { label: string; icon: React.ComponentType<{ className?: string }>; color: string }> = {
  new:         { label: 'Nouveau', icon: Bell,         color: 'text-blue-400' },
  in_progress: { label: 'En cours', icon: Clock,       color: 'text-yellow-400' },
  resolved:    { label: 'Résolu',   icon: CheckCircle2, color: 'text-green-400' },
};

type CardFilter = DbAlertStatus | DbSeverity | null;

const cardConfig: Record<NonNullable<CardFilter>, {
  label: string; color: string;
  activeColor: string; activeBg: string; activeBorder: string; activeShadow: string;
}> = {
  new:         { label: 'Nouvelles',  color: 'text-blue-400',   activeColor: 'text-blue-300',   activeBg: 'bg-blue-500/15',   activeBorder: 'border-blue-500',   activeShadow: 'shadow-blue-500/20' },
  in_progress: { label: 'En cours',   color: 'text-yellow-400', activeColor: 'text-yellow-300', activeBg: 'bg-yellow-500/15', activeBorder: 'border-yellow-500', activeShadow: 'shadow-yellow-500/20' },
  resolved:    { label: 'Résolues',   color: 'text-green-400',  activeColor: 'text-green-300',  activeBg: 'bg-green-500/15',  activeBorder: 'border-green-500',  activeShadow: 'shadow-green-500/20' },
  critical:    { label: 'Critiques',  color: 'text-red-400',    activeColor: 'text-red-300',    activeBg: 'bg-red-500/15',    activeBorder: 'border-red-500',    activeShadow: 'shadow-red-500/20' },
  high:        { label: 'Élevées',    color: 'text-orange-400', activeColor: 'text-orange-300', activeBg: 'bg-orange-500/15', activeBorder: 'border-orange-500', activeShadow: 'shadow-orange-500/20' },
  medium:      { label: 'Moyennes',   color: 'text-yellow-400', activeColor: 'text-yellow-300', activeBg: 'bg-yellow-500/15', activeBorder: 'border-yellow-400', activeShadow: 'shadow-yellow-500/20' },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  onNewAlert?: (newCount: number) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AlertSystem({ onNewAlert }: Props) {
  const [alerts, setAlerts]           = useState<DbAlert[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [updatingId, setUpdatingId]   = useState<string | null>(null);
  const [search, setSearch]           = useState('');
  const [filterSev, setFilterSev]     = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selected, setSelected]       = useState<DbAlert | null>(null);
  const [activeCard, setActiveCard]   = useState<CardFilter>(null);

  // ── Load from Supabase ────────────────────────────────────────────────────

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchAlerts(200);
      setAlerts(data);
      onNewAlert?.(data.filter(a => a.status === 'new').length);
    } catch {
      setError('Impossible de charger les alertes depuis Supabase.');
    } finally {
      setLoading(false);
    }
  }, [onNewAlert]);

  useEffect(() => { load(); }, [load]);

  // ── Realtime subscription ─────────────────────────────────────────────────

  useEffect(() => {
    const channel = supabase
      .channel('alerts-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts' }, () => {
        load();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load]);

  // ── Card filter toggle ─────────────────────────────────────────────────────

  function handleCardClick(key: NonNullable<CardFilter>) {
    if (activeCard === key) {
      setActiveCard(null);
      setFilterSev('all');
      setFilterStatus('all');
    } else {
      setActiveCard(key);
      if (key === 'new' || key === 'in_progress' || key === 'resolved') {
        setFilterStatus(key);
        setFilterSev('all');
      } else {
        setFilterSev(key);
        setFilterStatus('all');
      }
    }
    setSelected(null);
  }

  // ── Update status ──────────────────────────────────────────────────────────

  async function updateStatus(id: string, status: DbAlertStatus) {
    setUpdatingId(id);
    try {
      await dbUpdateStatus(id, status);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, status, updated_at: new Date().toISOString() } : a));
      if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
      onNewAlert?.(alerts.filter(a => (a.id === id ? status : a.status) === 'new').length);
    } catch {
      setError('Erreur lors de la mise à jour du statut.');
    } finally {
      setUpdatingId(null);
    }
  }

  // ── Derived counts ─────────────────────────────────────────────────────────

  const counts = {
    all:         alerts.length,
    critical:    alerts.filter(a => a.severity === 'critical').length,
    high:        alerts.filter(a => a.severity === 'high').length,
    medium:      alerts.filter(a => a.severity === 'medium').length,
    low:         alerts.filter(a => a.severity === 'low').length,
    new:         alerts.filter(a => a.status === 'new').length,
    in_progress: alerts.filter(a => a.status === 'in_progress').length,
    resolved:    alerts.filter(a => a.status === 'resolved').length,
  };

  const filtered = alerts.filter(a => {
    const matchSearch = search === ''
      || a.title.toLowerCase().includes(search.toLowerCase())
      || a.source_ip.includes(search)
      || a.attack_type.toLowerCase().includes(search.toLowerCase());
    const matchSev    = filterSev    === 'all' || a.severity === filterSev;
    const matchStatus = filterStatus === 'all' || a.status   === filterStatus;
    return matchSearch && matchSev && matchStatus;
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-red-400" />
            Système d'alertes
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Table <code className="text-slate-400 bg-slate-800 px-1 rounded text-[11px]">alerts</code> — Supabase Realtime activé
          </p>
        </div>
        <div className="flex items-center gap-2">
          {counts.new > 0 && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-400 text-sm font-medium">
                {counts.new} nouvelle{counts.new > 1 ? 's' : ''}
              </span>
            </div>
          )}
          <button
            onClick={load}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-all disabled:opacity-40"
            title="Actualiser">
            {loading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <RefreshCw className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={load} className="ml-auto text-xs underline hover:no-underline">Réessayer</button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && alerts.length === 0 && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      )}

      {/* Summary cards — clickable filters */}
      {!loading && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {(Object.entries(cardConfig) as [NonNullable<CardFilter>, typeof cardConfig[keyof typeof cardConfig]][]).map(([key, cfg]) => {
            const count = counts[key as keyof typeof counts] ?? 0;
            const isActive = activeCard === key;
            return (
              <button
                key={key}
                onClick={() => handleCardClick(key)}
                title={isActive ? `Annuler le filtre "${cfg.label}"` : `Filtrer : ${cfg.label}`}
                className={`relative rounded-xl p-3 text-center transition-all duration-200 border focus:outline-none ${
                  isActive
                    ? `${cfg.activeBg} ${cfg.activeBorder} shadow-lg ${cfg.activeShadow}`
                    : 'bg-slate-900 border-slate-800 hover:border-slate-600 hover:bg-slate-800/60'
                }`}>
                {isActive && (
                  <span className={`absolute inset-x-0 top-0 h-0.5 rounded-t-xl ${cfg.activeBorder.replace('border-', 'bg-')}`} />
                )}
                <p className={`text-xl font-bold transition-colors ${isActive ? cfg.activeColor : cfg.color}`}>{count}</p>
                <p className={`text-[10px] mt-0.5 transition-colors ${isActive ? cfg.activeColor : 'text-slate-500'}`}>{cfg.label}</p>
                {isActive && (
                  <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-slate-900 border border-slate-700 rounded-full flex items-center justify-center">
                    <span className="text-[8px] text-slate-400">✕</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Active filter banner */}
      {activeCard && (
        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-medium ${cardConfig[activeCard].activeBg} ${cardConfig[activeCard].activeBorder}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cardConfig[activeCard].activeBorder.replace('border-', 'bg-')} animate-pulse`} />
          <span className={cardConfig[activeCard].activeColor}>
            Filtre actif : <span className="font-bold">{cardConfig[activeCard].label}</span> — {filtered.length} alerte{filtered.length !== 1 ? 's' : ''} affichée{filtered.length !== 1 ? 's' : ''}
          </span>
          <button onClick={() => handleCardClick(activeCard)} className={`ml-auto text-[11px] hover:opacity-80 ${cardConfig[activeCard].activeColor}`}>
            Effacer ✕
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par IP, type, titre..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors" />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-slate-500" />
          {(['all', 'critical', 'high', 'medium', 'low'] as const).map(s => (
            <button key={s} onClick={() => setFilterSev(s)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${filterSev === s ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
              {s === 'all' ? `Tous (${counts.all})` : `${severityConfig[s]?.label} (${counts[s as keyof typeof counts] ?? 0})`}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {(['all', 'new', 'in_progress', 'resolved'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${filterStatus === s ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
              {s === 'all' ? 'Tous' : statusConfig[s]?.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Alert list */}
        <div className="lg:col-span-3 space-y-2">
          {!loading && filtered.length === 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-sm">
              Aucune alerte trouvée
            </div>
          )}
          {filtered.map(alert => {
            const sc         = severityConfig[alert.severity];
            const StatusIcon = statusConfig[alert.status].icon;
            return (
              <div
                key={alert.id}
                onClick={() => setSelected(alert)}
                className={`bg-slate-900 border rounded-xl p-4 cursor-pointer transition-all hover:border-slate-600 ${
                  selected?.id === alert.id ? 'border-blue-500/50 ring-1 ring-blue-500/20' : 'border-slate-800'
                }`}>
                <div className="flex items-start gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${sc.dot} ${alert.severity === 'critical' ? 'animate-pulse' : ''}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-slate-100 leading-tight">{alert.title}</p>
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-semibold uppercase flex-shrink-0 ${sc.bg} ${sc.color} ${sc.border}`}>
                        {sc.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                      <span className="font-mono">{alert.source_ip}</span>
                      <span>→</span>
                      <span className="font-mono">{alert.destination_ip}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-slate-500">
                        {new Date(alert.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className={`flex items-center gap-1 text-[10px] ${statusConfig[alert.status].color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig[alert.status].label}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sticky top-0">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Détails de l'alerte</h3>
                <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-white transition-colors">
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
              <div className={`px-3 py-1.5 rounded-lg border inline-flex items-center gap-2 mb-4 ${severityConfig[selected.severity].bg} ${severityConfig[selected.severity].border}`}>
                <span className={`w-2 h-2 rounded-full ${severityConfig[selected.severity].dot} ${selected.severity === 'critical' ? 'animate-pulse' : ''}`} />
                <span className={`text-xs font-semibold ${severityConfig[selected.severity].color}`}>
                  {severityConfig[selected.severity].label}
                </span>
              </div>
              <h4 className="text-base font-bold text-white mb-1">{selected.title}</h4>
              <p className="text-xs text-slate-400 mb-4 leading-relaxed">{selected.description}</p>

              <div className="space-y-3 text-xs">
                {[
                  { label: "Type d'attaque",  value: selected.attack_type },
                  { label: 'IP Source',       value: selected.source_ip,      mono: true },
                  { label: 'IP Destination',  value: selected.destination_ip, mono: true },
                  { label: 'Détecté le',      value: new Date(selected.created_at).toLocaleString('fr-FR') },
                  { label: 'Mis à jour',      value: new Date(selected.updated_at).toLocaleString('fr-FR') },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center border-b border-slate-800 pb-2">
                    <span className="text-slate-500">{row.label}</span>
                    <span className={`font-medium text-slate-200 ${row.mono ? 'font-mono' : ''}`}>{row.value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <p className="text-xs text-slate-500 mb-2">Changer le statut</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['new', 'in_progress', 'resolved'] as const).map(s => {
                    const Icon = statusConfig[s].icon;
                    const isUpdating = updatingId === selected.id;
                    return (
                      <button
                        key={s}
                        disabled={isUpdating}
                        onClick={() => updateStatus(selected.id, s)}
                        className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-medium transition-all disabled:opacity-50 ${
                          selected.status === s
                            ? `border-current ${statusConfig[s].color} bg-current/10`
                            : 'border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-300'
                        }`}>
                        {isUpdating && selected.status !== s
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <Icon className="w-4 h-4" />}
                        {statusConfig[s].label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                <p className="text-xs font-medium text-blue-400 mb-1 flex items-center gap-1.5">
                  <Eye className="w-3 h-3" /> Analyse IA
                </p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Comportement cohérent avec une attaque {selected.attack_type}.
                  Probabilité de faux positif : {selected.severity === 'critical' ? '2' : selected.severity === 'high' ? '8' : '15'}%.
                  Recommandation : {selected.severity === 'critical' ? 'Isoler immédiatement.' : 'Surveiller et documenter.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 border-dashed rounded-xl p-8 text-center">
              <AlertTriangle className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Sélectionnez une alerte pour afficher les détails</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
