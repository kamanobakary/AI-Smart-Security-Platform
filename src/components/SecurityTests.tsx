import { useState, useCallback } from 'react';
import {
  FlaskConical, Zap, Bell, Bug, RotateCcw,
  CheckCircle2, XCircle, Loader2, Clock,
  AlertTriangle, Shield, Activity, Terminal,
  Trash2, ChevronRight, Database, RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

type LogStatus = 'success' | 'error' | 'running' | 'warning';

interface LogEntry {
  id: string;
  timestamp: string;
  action: string;
  status: LogStatus;
  detail: string;
  table?: string;
}

type BtnId = 'attack' | 'alert' | 'malware' | 'reset';

type FeedbackState = Record<BtnId, 'idle' | 'loading' | 'success' | 'error'>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nowISO() { return new Date().toISOString(); }
function logId() { return Math.random().toString(36).slice(2, 9); }

function randomIP() {
  const prefixes = ['185.220.', '91.108.', '103.224.', '45.33.', '194.165.', '176.31.'];
  return prefixes[Math.floor(Math.random() * prefixes.length)] + (Math.floor(Math.random() * 254) + 1);
}

function rnd<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

const ATTACK_TYPES = ['DDoS Attack', 'Port Scan', 'SQL Injection', 'Zero-Day Exploit', 'Command Injection', 'Brute Force', 'MITM Attack'];
const MALWARE_TYPES = ['Ransomware', 'Trojan', 'Rootkit', 'Spyware', 'Wiper', 'Botnet'];
const COUNTRIES = ['Russie', 'Chine', 'Corée du Nord', 'Iran', 'Ukraine'];
const PROTOCOLS = ['TCP', 'UDP', 'HTTP', 'HTTPS', 'SSH', 'SMB', 'DNS'];

// ─── Log Row ──────────────────────────────────────────────────────────────────

function LogRow({ entry }: { entry: LogEntry }) {
  const icon = {
    success: <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />,
    error:   <XCircle      className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />,
    running: <Loader2      className="w-3.5 h-3.5 text-blue-400 flex-shrink-0 animate-spin" />,
    warning: <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />,
  }[entry.status];

  const detailColor = { success: 'text-green-400', error: 'text-red-400', running: 'text-blue-400', warning: 'text-yellow-400' }[entry.status];

  return (
    <div className={`flex items-start gap-3 px-4 py-2.5 border-b border-slate-800/40 last:border-0 hover:bg-slate-800/20 transition-colors ${
      entry.status === 'error' ? 'bg-red-500/3' : entry.status === 'running' ? 'bg-blue-500/3' : ''
    }`}>
      <span className="text-[10px] font-mono text-slate-600 whitespace-nowrap pt-0.5 w-16 flex-shrink-0">
        {new Date(entry.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </span>
      <span className="pt-0.5 flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-medium text-slate-200">{entry.action}</span>
          {entry.table && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 font-mono border border-slate-700/50">{entry.table}</span>
          )}
        </div>
        <p className={`text-[10px] mt-0.5 font-mono ${detailColor}`}>{entry.detail}</p>
      </div>
      <ChevronRight className="w-3 h-3 text-slate-700 flex-shrink-0 mt-0.5" />
    </div>
  );
}

// ─── Test Button ──────────────────────────────────────────────────────────────

interface TestBtnProps {
  id: BtnId;
  label: string;
  successMsg: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  border: string;
  feedback: FeedbackState;
  anyLoading: boolean;
  onClick: () => void;
}

function TestBtn({ id, label, successMsg, icon: Icon, color, bg, border, feedback, anyLoading, onClick }: TestBtnProps) {
  const state = feedback[id];
  const isLoading = state === 'loading';
  const isSuccess = state === 'success';
  const isError = state === 'error';
  const disabled = anyLoading && !isLoading;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative group flex flex-col items-center gap-4 p-6 rounded-2xl border-2 transition-all duration-200 w-full text-center
        ${disabled
          ? 'opacity-40 cursor-not-allowed border-slate-700 bg-slate-900/50'
          : isSuccess
            ? `border-green-500/50 bg-green-500/5 scale-[1.01]`
            : isError
              ? `border-red-500/50 bg-red-500/5`
              : `${border} ${bg} hover:scale-[1.02] hover:brightness-110 cursor-pointer active:scale-[0.98]`
        }`}
    >
      {/* Glow ring on success */}
      {isSuccess && (
        <div className="absolute inset-0 rounded-2xl border-2 border-green-500/30 animate-ping opacity-30 pointer-events-none" />
      )}

      {/* Icon */}
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all border
        ${isSuccess ? 'bg-green-500/15 border-green-500/30' : isError ? 'bg-red-500/15 border-red-500/30' : `${bg.replace('/5', '/15')} ${border}`}
      `}>
        {isLoading
          ? <Loader2 className="w-7 h-7 text-slate-400 animate-spin" />
          : isSuccess
            ? <CheckCircle2 className="w-7 h-7 text-green-400" />
            : isError
              ? <XCircle className="w-7 h-7 text-red-400" />
              : <Icon className={`w-7 h-7 ${color}`} />
        }
      </div>

      {/* Label */}
      <div>
        <p className={`text-sm font-semibold transition-colors ${
          isLoading ? 'text-slate-400' : isSuccess ? 'text-green-400' : isError ? 'text-red-400' : 'text-white'
        }`}>
          {isLoading ? 'En cours...' : label}
        </p>
        <p className={`text-[11px] mt-1 transition-colors ${
          isSuccess ? 'text-green-500 font-medium' : isError ? 'text-red-500' : 'text-slate-500'
        }`}>
          {isSuccess ? successMsg : isError ? 'Erreur — vérifiez les logs' : isLoading ? 'Insertion dans Supabase...' : 'Cliquer pour simuler'}
        </p>
      </div>

      {/* Active dot */}
      {!disabled && !isLoading && state === 'idle' && (
        <span className={`absolute top-3 right-3 w-2 h-2 rounded-full ${color.replace('text-', 'bg-')} opacity-40 group-hover:opacity-80 transition-opacity`} />
      )}
    </button>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

interface Toast { id: string; message: string; type: 'success' | 'error' | 'warning'; }

function ToastList({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl shadow-black/50 pointer-events-auto max-w-xs
            ${t.type === 'success' ? 'bg-slate-900 border-green-500/40 text-green-300'
            : t.type === 'error'   ? 'bg-slate-900 border-red-500/40 text-red-300'
            : 'bg-slate-900 border-yellow-500/40 text-yellow-300'}`}
        >
          {t.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
           : t.type === 'error'  ? <XCircle      className="w-4 h-4 flex-shrink-0" />
           :                       <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
          <p className="text-sm font-medium flex-1">{t.message}</p>
          <button onClick={() => onDismiss(t.id)} className="text-slate-600 hover:text-white transition-colors flex-shrink-0">
            <XCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Stat Badge ───────────────────────────────────────────────────────────────

function StatBadge({ icon: Icon, label, value, color, border }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: number; color: string; border: string;
}) {
  return (
    <div className={`flex items-center gap-3 bg-slate-900 border rounded-xl p-4 ${border}`}>
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color.replace('text-', 'bg-').replace('400', '500/10')}`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const INITIAL_FEEDBACK: FeedbackState = { attack: 'idle', alert: 'idle', malware: 'idle', reset: 'idle' };

export default function SecurityTests() {
  const [logs, setLogs]         = useState<LogEntry[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(INITIAL_FEEDBACK);
  const [toasts, setToasts]     = useState<Toast[]>([]);
  const [sessionStats, setSessionStats] = useState({ attacks: 0, alerts: 0, malware: 0, resets: 0 });

  const anyLoading = Object.values(feedback).some(v => v === 'loading');

  // ── Log helpers ─────────────────────────────────────────────────────────────

  const pushLog = useCallback((entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    const id = logId();
    setLogs(prev => [{ ...entry, id, timestamp: nowISO() }, ...prev].slice(0, 100));
    return id;
  }, []);

  const patchLog = useCallback((id: string, patch: Partial<LogEntry>) => {
    setLogs(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));
  }, []);

  function showToast(message: string, type: Toast['type']) {
    const id = logId();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  }

  function setBtn(id: BtnId, state: FeedbackState[BtnId]) {
    setFeedback(prev => ({ ...prev, [id]: state }));
  }

  function flashSuccess(id: BtnId) {
    setBtn(id, 'success');
    setTimeout(() => setBtn(id, 'idle'), 3000);
  }

  function flashError(id: BtnId) {
    setBtn(id, 'error');
    setTimeout(() => setBtn(id, 'idle'), 3000);
  }

  // ── Generate Attack ──────────────────────────────────────────────────────────

  async function handleAttack() {
    setBtn('attack', 'loading');
    const attackType = rnd(ATTACK_TYPES);
    const sourceIp   = randomIP();
    const country    = rnd(COUNTRIES);
    const port       = rnd([22, 80, 443, 3389, 8080, 3306]);

    const lid = pushLog({
      action: `Génération attaque — ${attackType}`,
      status: 'running',
      detail: `IP source: ${sourceIp} | Pays: ${country} | Port: ${port}`,
      table: 'security_events',
    });

    try {
      const { error } = await supabase.from('security_events').insert({
        event_type:      attackType,
        source_ip:       sourceIp,
        destination_ip:  `10.0.${Math.floor(Math.random() * 2)}.${Math.floor(Math.random() * 254) + 1}`,
        severity:        'critical',
        risk_score:      Math.floor(Math.random() * 15) + 85,
        description:     `[TEST] Attaque ${attackType} simulée depuis ${country}`,
        protocol:        rnd(PROTOCOLS),
        port,
        country,
        status:          'new',
        metadata:        { simulated: true, test_run: true, attack_vector: attackType },
        detected_at:     nowISO(),
      });
      if (error) throw error;

      patchLog(lid, {
        status: 'success',
        detail: `Attaque critique insérée — ${attackType} | IP: ${sourceIp} | ${country}`,
      });
      setSessionStats(s => ({ ...s, attacks: s.attacks + 1 }));
      flashSuccess('attack');
      showToast('Attaque générée avec succès', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      patchLog(lid, { status: 'error', detail: `Échec: ${msg}` });
      flashError('attack');
      showToast('Erreur lors de la génération de l\'attaque', 'error');
    }
  }

  // ── Generate Alert ───────────────────────────────────────────────────────────

  async function handleAlert() {
    setBtn('alert', 'loading');
    const sourceIp = randomIP();

    const lid = pushLog({
      action: 'Génération alerte de sécurité',
      status: 'running',
      detail: `Sévérité: medium | Source: ${sourceIp}`,
      table: 'alerts',
    });

    try {
      const { error } = await supabase.from('alerts').insert({
        title:          '[TEST] Alerte de sécurité simulée',
        description:    '[TEST] Alerte générée par le module de simulation — test du système de détection.',
        severity:       'medium',
        attack_type:    'Phishing',
        source_ip:      sourceIp,
        destination_ip: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
        status:         'new',
        created_at:     nowISO(),
        updated_at:     nowISO(),
      });
      if (error) throw error;

      patchLog(lid, {
        status: 'success',
        detail: `Alerte medium insérée — status: new | IP: ${sourceIp}`,
      });
      setSessionStats(s => ({ ...s, alerts: s.alerts + 1 }));
      flashSuccess('alert');
      showToast('Alerte générée avec succès', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      patchLog(lid, { status: 'error', detail: `Échec: ${msg}` });
      flashError('alert');
      showToast('Erreur lors de la génération de l\'alerte', 'error');
    }
  }

  // ── Generate Malware ─────────────────────────────────────────────────────────

  async function handleMalware() {
    setBtn('malware', 'loading');
    const malwareType = rnd(MALWARE_TYPES);
    const sourceIp    = randomIP();
    const country     = rnd(COUNTRIES);

    const lid = pushLog({
      action: `Simulation malware — ${malwareType}`,
      status: 'running',
      detail: `IP: ${sourceIp} | Variante: ${malwareType}`,
      table: 'security_events',
    });

    try {
      const { error } = await supabase.from('security_events').insert({
        event_type:      'Malware',
        source_ip:       sourceIp,
        destination_ip:  `192.168.0.${Math.floor(Math.random() * 254) + 1}`,
        severity:        'high',
        risk_score:      Math.floor(Math.random() * 20) + 70,
        description:     `[TEST] Malware ${malwareType} simulé — signature détectée`,
        protocol:        'TCP',
        port:            443,
        country,
        status:          'new',
        metadata:        { simulated: true, test_run: true, malware_type: malwareType },
        detected_at:     nowISO(),
      });
      if (error) throw error;

      patchLog(lid, {
        status: 'success',
        detail: `Malware high inséré — variante: ${malwareType} | IP: ${sourceIp}`,
      });
      setSessionStats(s => ({ ...s, malware: s.malware + 1 }));
      flashSuccess('malware');
      showToast(`Malware simulé (${malwareType}) généré avec succès`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      patchLog(lid, { status: 'error', detail: `Échec: ${msg}` });
      flashError('malware');
      showToast('Erreur lors de la simulation malware', 'error');
    }
  }

  // ── Reset ────────────────────────────────────────────────────────────────────

  async function handleReset() {
    setBtn('reset', 'loading');

    const jobs: Array<{ table: string; label: string; fn: () => Promise<{ error: unknown }> }> = [
      {
        table: 'security_events',
        label: 'Suppression événements de test',
        fn: () => supabase.from('security_events').delete().not('metadata', 'is', null),
      },
      {
        table: 'alerts',
        label: 'Suppression alertes de test',
        fn: () => supabase.from('alerts').delete().ilike('description', '%[TEST]%'),
      },
    ];

    let allOk = true;

    for (const job of jobs) {
      const lid = pushLog({ action: job.label, status: 'running', detail: `Table: ${job.table}`, table: job.table });
      try {
        const { error } = await job.fn();
        if (error) throw error;
        patchLog(lid, { status: 'success', detail: `Données de test supprimées de ${job.table}` });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        patchLog(lid, { status: 'error', detail: `Échec: ${msg}` });
        allOk = false;
      }
    }

    const summId = pushLog({ action: 'Réinitialisation terminée', status: allOk ? 'success' : 'warning', detail: allOk ? 'Toutes les données de test ont été supprimées' : 'Certaines suppressions ont échoué — vérifiez les logs' });
    void summId;

    setSessionStats(s => ({ ...s, resets: s.resets + 1 }));
    if (allOk) {
      flashSuccess('reset');
      showToast('Données réinitialisées', 'warning');
    } else {
      flashError('reset');
      showToast('Réinitialisation partielle — vérifiez les logs', 'error');
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const btns: Array<{
    id: BtnId; label: string; successMsg: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string; bg: string; border: string;
    onClick: () => void;
  }> = [
    { id: 'attack',  label: 'Tester Attaque',  successMsg: 'Attaque générée avec succès',  icon: Zap,      color: 'text-red-400',    bg: 'bg-red-500/5',    border: 'border-red-500/30',    onClick: handleAttack },
    { id: 'alert',   label: 'Tester Alerte',   successMsg: 'Alerte générée avec succès',   icon: Bell,     color: 'text-orange-400', bg: 'bg-orange-500/5', border: 'border-orange-500/30', onClick: handleAlert },
    { id: 'malware', label: 'Tester Malware',  successMsg: 'Malware généré avec succès',   icon: Bug,      color: 'text-amber-400',  bg: 'bg-amber-500/5',  border: 'border-amber-500/30',  onClick: handleMalware },
    { id: 'reset',   label: 'Tester Reset',    successMsg: 'Données réinitialisées',        icon: RefreshCw, color: 'text-blue-400',  bg: 'bg-blue-500/5',   border: 'border-blue-500/30',   onClick: handleReset },
  ];

  return (
    <div className="space-y-6">
      <ToastList toasts={toasts} onDismiss={id => setToasts(prev => prev.filter(t => t.id !== id))} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-emerald-400" />
            Tests de Sécurité
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Simuler des événements cybersécurité pour tester le système de détection en temps réel
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2 flex-shrink-0">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          <span className="text-xs text-emerald-400 font-medium">Environnement de test</span>
        </div>
      </div>

      {/* ── Zone de test des boutons ─────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            Zone de test des boutons
          </h2>
          <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" />
            Connexion Supabase active
          </span>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-3 p-3 bg-yellow-500/5 border border-yellow-500/15 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-400">
            Les données générées sont insérées en base réelle avec le marqueur <code className="text-slate-300 bg-slate-800 px-1 rounded">[TEST]</code>. Utilisez <strong className="text-white">Tester Reset</strong> pour les supprimer.
          </p>
        </div>

        {/* 4 test buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {btns.map(b => (
            <TestBtn
              key={b.id}
              {...b}
              feedback={feedback}
              anyLoading={anyLoading}
            />
          ))}
        </div>
      </div>

      {/* ── Session stats ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatBadge icon={Zap}      label="Attaques générées" value={sessionStats.attacks} color="text-red-400"    border="border-red-500/20" />
        <StatBadge icon={Bell}     label="Alertes générées"  value={sessionStats.alerts}  color="text-orange-400" border="border-orange-500/20" />
        <StatBadge icon={Bug}      label="Malwares simulés"  value={sessionStats.malware} color="text-amber-400"  border="border-amber-500/20" />
        <StatBadge icon={RotateCcw} label="Réinitialisations" value={sessionStats.resets} color="text-blue-400"   border="border-blue-500/20" />
      </div>

      {/* ── Connexion base de données ────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-400" />
          Connexion base de données
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Zap,  color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    title: 'Attaque / Malware', items: ['Table: security_events', 'severity: critical / high', 'status: new', 'metadata.simulated: true'] },
            { icon: Bell, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', title: 'Alerte',            items: ['Table: alerts', 'severity: medium', 'attack_type: Phishing', 'status: new'] },
            { icon: RefreshCw, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20',  title: 'Reset',             items: ['DELETE security_events', 'WHERE metadata NOT NULL', 'DELETE alerts', "WHERE description ILIKE '[TEST]%'"] },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className={`rounded-xl p-4 border ${card.bg} ${card.border}`}>
                <p className={`text-xs font-semibold ${card.color} mb-2.5 flex items-center gap-1.5`}>
                  <Icon className="w-3.5 h-3.5" /> {card.title}
                </p>
                <ul className="space-y-1.5">
                  {card.items.map((item) => (
                    <li key={item} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                      <span className="w-1 h-1 rounded-full bg-slate-600 flex-shrink-0" />
                      <code className="font-mono">{item}</code>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Logs de test en temps réel ───────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <h2 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            Logs de test en temps réel
            {logs.length > 0 && (
              <span className="text-[10px] bg-slate-800 text-slate-500 border border-slate-700 px-2 py-0.5 rounded-full">
                {logs.length} entrée{logs.length > 1 ? 's' : ''}
              </span>
            )}
          </h2>
          <div className="flex items-center gap-3">
            {logs.some(l => l.status === 'running') && (
              <span className="flex items-center gap-1.5 text-[11px] text-blue-400">
                <Loader2 className="w-3 h-3 animate-spin" /> En cours...
              </span>
            )}
            {logs.length > 0 && (
              <button
                onClick={() => setLogs([])}
                className="text-[11px] flex items-center gap-1 text-slate-500 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Effacer
              </button>
            )}
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 gap-3">
            <div className="w-12 h-12 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center">
              <Activity className="w-6 h-6 text-slate-600" />
            </div>
            <p className="text-slate-600 text-sm">Aucune action exécutée</p>
            <p className="text-slate-700 text-xs">Cliquez sur un bouton ci-dessus pour simuler un événement</p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto font-mono">
            <div className="flex items-center gap-3 px-4 py-1.5 bg-slate-800/30 border-b border-slate-800">
              <span className="text-[9px] text-slate-600 uppercase tracking-wider w-16 flex-shrink-0">Heure</span>
              <span className="w-4 flex-shrink-0" />
              <span className="text-[9px] text-slate-600 uppercase tracking-wider">Action / Détail</span>
            </div>
            {logs.map(entry => <LogRow key={entry.id} entry={entry} />)}
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="flex items-start gap-3 p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl">
        <Clock className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-medium text-slate-400">Mise à jour automatique</p>
          <p className="text-[11px] text-slate-600 mt-0.5">
            Chaque action insère ou supprime des données en temps réel dans Supabase. Les pages Surveillance, Alertes et Dashboard se mettent à jour automatiquement via Realtime sans recharger la page.
          </p>
        </div>
      </div>
    </div>
  );
}
