import { useState } from 'react';
import {
  Bell, Mail, Send, MessageSquare, Check, X, AlertTriangle,
  Settings, ChevronDown, Shield, Zap, Info, CheckCircle2, Save
} from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  border: string;
  fields: { key: string; label: string; type: string; placeholder: string }[];
}

interface Rule {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'all';
  channel: string;
  enabled: boolean;
  label: string;
}

const channels: Channel[] = [
  {
    id: 'email',
    name: 'Email',
    icon: Mail,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    fields: [
      { key: 'smtp_host', label: 'Serveur SMTP', type: 'text', placeholder: 'smtp.gmail.com' },
      { key: 'smtp_port', label: 'Port SMTP', type: 'number', placeholder: '587' },
      { key: 'email_from', label: 'Expéditeur', type: 'email', placeholder: 'soc@aisecurity.io' },
      { key: 'email_to', label: 'Destinataire(s)', type: 'email', placeholder: 'admin@entreprise.fr' },
    ],
  },
  {
    id: 'telegram',
    name: 'Telegram',
    icon: Send,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/20',
    fields: [
      { key: 'bot_token', label: 'Token du Bot', type: 'password', placeholder: '123456789:AABBccDD...' },
      { key: 'chat_id', label: 'Chat ID', type: 'text', placeholder: '-100123456789' },
    ],
  },
  {
    id: 'discord',
    name: 'Discord',
    icon: MessageSquare,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10',
    border: 'border-violet-500/20',
    fields: [
      { key: 'webhook_url', label: 'URL Webhook', type: 'url', placeholder: 'https://discord.com/api/webhooks/...' },
      { key: 'username', label: 'Nom du bot', type: 'text', placeholder: 'AI Security Bot' },
    ],
  },
];

const severityOptions = [
  { value: 'all', label: 'Toutes les alertes', color: 'text-slate-400' },
  { value: 'critical', label: 'Critique seulement', color: 'text-red-400' },
  { value: 'high', label: 'Élevé et +', color: 'text-orange-400' },
  { value: 'medium', label: 'Moyen et +', color: 'text-yellow-400' },
];

const defaultRules: Rule[] = [
  { id: 'r1', severity: 'critical', channel: 'email', enabled: true, label: 'Alerte critique → Email immédiat' },
  { id: 'r2', severity: 'critical', channel: 'telegram', enabled: true, label: 'Alerte critique → Telegram instantané' },
  { id: 'r3', severity: 'high', channel: 'email', enabled: false, label: 'Alerte élevée → Rapport email' },
  { id: 'r4', severity: 'all', channel: 'discord', enabled: false, label: 'Toutes les alertes → Discord' },
];

const notifHistory = [
  { id: 'n1', channel: 'telegram', message: 'SQL Injection détecté — IP 192.168.1.45', time: '14:32', status: 'sent' },
  { id: 'n2', channel: 'email', message: 'DDoS Attack Critique — Rapport envoyé', time: '13:55', status: 'sent' },
  { id: 'n3', channel: 'email', message: 'Rapport hebdomadaire sécurité', time: '08:00', status: 'sent' },
  { id: 'n4', channel: 'discord', message: 'Brute Force détecté × 23 tentatives', time: 'Hier', status: 'failed' },
];

export default function NotificationSystem() {
  const [activeChannel, setActiveChannel] = useState<string>('email');
  const [channelEnabled, setChannelEnabled] = useState<Record<string, boolean>>({
    email: true,
    telegram: false,
    discord: false,
  });
  const [formValues, setFormValues] = useState<Record<string, Record<string, string>>>({});
  const [rules, setRules] = useState<Rule[]>(defaultRules);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'sending' | 'sent' | 'error'>>({});

  const channel = channels.find(c => c.id === activeChannel)!;

  function handleField(channelId: string, key: string, value: string) {
    setFormValues(prev => ({ ...prev, [channelId]: { ...(prev[channelId] ?? {}), [key]: value } }));
  }

  function saveConfig() {
    setSavedFeedback(activeChannel);
    setTimeout(() => setSavedFeedback(null), 2500);
  }

  async function sendTest(channelId: string) {
    setTestStatus(s => ({ ...s, [channelId]: 'sending' }));
    await new Promise(r => setTimeout(r, 1200));
    setTestStatus(s => ({ ...s, [channelId]: Math.random() > 0.2 ? 'sent' : 'error' }));
    setTimeout(() => setTestStatus(s => ({ ...s, [channelId]: 'idle' })), 3000);
  }

  function toggleRule(id: string) {
    setRules(rs => rs.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  }

  const channelIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    email: Mail, telegram: Send, discord: MessageSquare,
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-400" /> Système de Notifications
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">Configurez vos alertes par Email, Telegram et Discord</p>
      </div>

      {/* Channel tabs */}
      <div className="flex gap-3 flex-wrap">
        {channels.map(ch => (
          <button key={ch.id} onClick={() => setActiveChannel(ch.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
              activeChannel === ch.id ? `${ch.bg} ${ch.border} ${ch.color}` : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
            }`}>
            <ch.icon className="w-4 h-4" />
            {ch.name}
            <span className={`w-2 h-2 rounded-full ${channelEnabled[ch.id] ? 'bg-green-400' : 'bg-slate-600'}`} />
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Config form */}
        <div className="lg:col-span-2 space-y-4">
          <div className={`bg-slate-900 border ${channel.border} rounded-xl p-5`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-sm font-semibold flex items-center gap-2 ${channel.color}`}>
                <channel.icon className="w-4 h-4" />
                Configuration {channel.name}
              </h3>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-xs text-slate-400">Activer</span>
                <div className="relative" onClick={() => setChannelEnabled(p => ({ ...p, [channel.id]: !p[channel.id] }))}>
                  <div className={`w-10 h-5 rounded-full border transition-all ${channelEnabled[channel.id] ? 'bg-blue-600 border-blue-500' : 'bg-slate-700 border-slate-600'}`} />
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${channelEnabled[channel.id] ? 'left-5' : 'left-0.5'}`} />
                </div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {channel.fields.map(f => (
                <div key={f.key}>
                  <label className="text-xs text-slate-400 block mb-1.5 font-medium">{f.label}</label>
                  <input
                    type={f.type}
                    value={formValues[channel.id]?.[f.key] ?? ''}
                    onChange={e => handleField(channel.id, f.key, e.target.value)}
                    placeholder={f.placeholder}
                    disabled={!channelEnabled[channel.id]}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 disabled:opacity-40 transition-colors" />
                </div>
              ))}
            </div>

            <div className="flex gap-2 mt-4 pt-4 border-t border-slate-800">
              <button onClick={saveConfig} disabled={!channelEnabled[channel.id]}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-40 ${savedFeedback === channel.id ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'}`}>
                {savedFeedback === channel.id ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                {savedFeedback === channel.id ? 'Sauvegardé !' : 'Sauvegarder'}
              </button>
              <button onClick={() => sendTest(channel.id)} disabled={!channelEnabled[channel.id]}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all disabled:opacity-40 ${
                  testStatus[channel.id] === 'sent' ? 'bg-green-500/10 border-green-500/30 text-green-400' :
                  testStatus[channel.id] === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                  'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}>
                {testStatus[channel.id] === 'sending' ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : testStatus[channel.id] === 'sent' ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : testStatus[channel.id] === 'error' ? (
                  <X className="w-4 h-4" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                {testStatus[channel.id] === 'sending' ? 'Envoi...' :
                  testStatus[channel.id] === 'sent' ? 'Message reçu !' :
                  testStatus[channel.id] === 'error' ? 'Échec connexion' :
                  'Tester la connexion'}
              </button>
            </div>
          </div>

          {/* Notification rules */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-400" />
              Règles de notification
            </h3>
            <div className="space-y-2">
              {rules.map(rule => {
                const ChIcon = channelIconMap[rule.channel] ?? Bell;
                const sCol = rule.severity === 'critical' ? 'text-red-400' : rule.severity === 'high' ? 'text-orange-400' : rule.severity === 'medium' ? 'text-yellow-400' : 'text-slate-400';
                return (
                  <div key={rule.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${rule.enabled ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-800/20 border-slate-800 opacity-60'}`}>
                    <div onClick={() => toggleRule(rule.id)} className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer transition-all ${rule.enabled ? 'bg-blue-500/15 border border-blue-500/20' : 'bg-slate-700/50 border border-slate-700'}`}>
                      <ChIcon className={`w-4 h-4 ${rule.enabled ? 'text-blue-400' : 'text-slate-500'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 font-medium">{rule.label}</p>
                      <p className={`text-xs ${sCol}`}>{severityOptions.find(s => s.value === rule.severity)?.label}</p>
                    </div>
                    <label className="flex-shrink-0 cursor-pointer" onClick={() => toggleRule(rule.id)}>
                      <div className="relative">
                        <div className={`w-9 h-5 rounded-full border transition-all ${rule.enabled ? 'bg-blue-600 border-blue-500' : 'bg-slate-700 border-slate-600'}`} />
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${rule.enabled ? 'left-4' : 'left-0.5'}`} />
                      </div>
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right panel: Status + History */}
        <div className="space-y-4">
          {/* Channel status */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-400" /> État des canaux
            </h3>
            <div className="space-y-2">
              {channels.map(ch => (
                <div key={ch.id} className="flex items-center justify-between p-2.5 bg-slate-800/40 rounded-xl">
                  <div className="flex items-center gap-2">
                    <ch.icon className={`w-4 h-4 ${ch.color}`} />
                    <span className="text-sm text-slate-300">{ch.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${channelEnabled[ch.id] ? 'bg-green-400 animate-pulse' : 'bg-slate-600'}`} />
                    <span className={`text-xs font-medium ${channelEnabled[ch.id] ? 'text-green-400' : 'text-slate-500'}`}>
                      {channelEnabled[ch.id] ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notification history */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4 text-slate-400" /> Historique récent
            </h3>
            <div className="space-y-2">
              {notifHistory.map(n => {
                const ChIcon = channelIconMap[n.channel] ?? Bell;
                return (
                  <div key={n.id} className="p-2.5 bg-slate-800/40 rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <ChIcon className={`w-3.5 h-3.5 ${n.channel === 'email' ? 'text-blue-400' : n.channel === 'telegram' ? 'text-cyan-400' : 'text-violet-400'}`} />
                      <span className="text-[11px] text-slate-500">{n.time}</span>
                      <span className={`ml-auto text-[10px] font-medium ${n.status === 'sent' ? 'text-green-400' : 'text-red-400'}`}>
                        {n.status === 'sent' ? '✓ Envoyé' : '✗ Échoué'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{n.message}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Info box */}
          <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-300">
                <p className="font-semibold text-blue-400 mb-1">Intégration FastAPI</p>
                <p>Les notifications sont envoyées via le backend Python FastAPI. Chaque alerte déclenchée par Scikit-learn génère un événement webhook vers les canaux actifs.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
