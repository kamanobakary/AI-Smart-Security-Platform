import { supabase } from './supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export type DbSeverity    = 'critical' | 'high' | 'medium' | 'low';
export type DbAlertStatus = 'new' | 'in_progress' | 'resolved';
export type DbEventStatus = 'new' | 'investigating' | 'resolved';
export type DbUserRole    = 'admin' | 'analyst' | 'user';

export interface DbAlert {
  id: string;
  title: string;
  description: string;
  severity: DbSeverity;
  status: DbAlertStatus;
  attack_type: string;
  source_ip: string;
  destination_ip: string;
  created_at: string;
  updated_at: string;
  assigned_to?: string | null;
  event_id?: string | null;
  resolved_at?: string | null;
}

export interface DbSecurityEvent {
  id: string;
  event_type: string;
  source_ip: string;
  destination_ip: string;
  risk_score: number;
  severity: DbSeverity;
  status: DbEventStatus;
  protocol: string;
  port: number;
  country: string;
  description: string;
  detected_at: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface DbAppUser {
  id: string;
  name: string;
  email: string;
  role: DbUserRole;
  department: string;
  last_login: string | null;
  is_active: boolean;
  created_at: string;
}

export interface DashboardStats {
  totalAlerts: number;
  criticalAlerts: number;
  newAlerts: number;
  inProgressAlerts: number;
  resolvedAlerts: number;
  blockedThreats: number;
  securityScore: number;
  totalEvents: number;
  avgRiskScore: number;
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export async function fetchAlerts(limit = 200): Promise<DbAlert[]> {
  const { data, error } = await supabase
    .from('alerts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function updateAlertStatus(id: string, status: DbAlertStatus): Promise<void> {
  const { error } = await supabase
    .from('alerts')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function insertAlert(alert: Omit<DbAlert, 'id' | 'created_at' | 'updated_at'>): Promise<DbAlert> {
  const { data, error } = await supabase
    .from('alerts')
    .insert({ ...alert, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTestAlerts(): Promise<void> {
  const { error } = await supabase
    .from('alerts')
    .delete()
    .ilike('description', '%[TEST]%');
  if (error) throw error;
}

// ─── Security Events ──────────────────────────────────────────────────────────

export async function fetchSecurityEvents(limit = 100): Promise<DbSecurityEvent[]> {
  const { data, error } = await supabase
    .from('security_events')
    .select('*')
    .order('detected_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function insertSecurityEvent(
  event: Omit<DbSecurityEvent, 'id' | 'created_at'>,
): Promise<DbSecurityEvent> {
  const { data, error } = await supabase
    .from('security_events')
    .insert({ ...event, created_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTestSecurityEvents(): Promise<void> {
  const { error } = await supabase
    .from('security_events')
    .delete()
    .not('metadata', 'is', null);
  if (error) throw error;
}

// ─── App Users ────────────────────────────────────────────────────────────────

export async function fetchAppUsers(): Promise<DbAppUser[]> {
  const { data, error } = await supabase
    .from('app_users')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateAppUserRole(id: string, role: DbUserRole): Promise<void> {
  const { error } = await supabase.from('app_users').update({ role }).eq('id', id);
  if (error) throw error;
}

export async function toggleAppUserActive(id: string, is_active: boolean): Promise<void> {
  const { error } = await supabase.from('app_users').update({ is_active }).eq('id', id);
  if (error) throw error;
}

// ─── Aggregations ─────────────────────────────────────────────────────────────

export interface ThreatStat {
  type: string;
  count: number;
  percentage: number;
}

export interface TopAttack {
  type: string;
  count: number;
  severity: DbSeverity;
  change: number;
  icon: string;
}

export interface AttackByCountry {
  country: string;
  count: number;
  severity: DbSeverity;
}

export interface ReportKpis {
  totalEvents: number;
  totalAlerts: number;
  detectionRate: number;
  avgResolutionTime: string;
  blockedThreats: number;
  falsePositiveRate: number;
}

export interface AlertsByDay {
  day: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export async function fetchThreatStats(): Promise<ThreatStat[]> {
  const { data, error } = await supabase
    .from('security_events')
    .select('event_type');
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.event_type] = (counts[row.event_type] ?? 0) + 1;
  }
  const total = Object.values(counts).reduce((s, v) => s + v, 0);
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([type, count]) => ({
      type,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
}

const attackIconMap: Record<string, string> = {
  'DDoS Attack': 'zap',
  'Brute Force': 'lock',
  'Port Scan': 'scan',
  'Malware': 'bug',
  'SQL Injection': 'database',
  'Ransomware': 'bug',
  'Phishing': 'zap',
  'XSS Attack': 'scan',
  'MITM Attack': 'lock',
};

export async function fetchTopAttacks(limit = 5): Promise<TopAttack[]> {
  const { data, error } = await supabase
    .from('security_events')
    .select('event_type, severity');
  if (error) throw error;
  const counts: Record<string, { count: number; severity: DbSeverity }> = {};
  for (const row of data ?? []) {
    if (!counts[row.event_type]) {
      counts[row.event_type] = { count: 0, severity: row.severity };
    }
    counts[row.event_type].count++;
    if (row.severity === 'critical') counts[row.event_type].severity = 'critical';
    else if (row.severity === 'high' && counts[row.event_type].severity !== 'critical') {
      counts[row.event_type].severity = 'high';
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([type, { count, severity }]) => ({
      type,
      count,
      severity,
      change: 0,
      icon: attackIconMap[type] ?? 'zap',
    }));
}

export async function fetchAttacksByCountry(): Promise<AttackByCountry[]> {
  const { data, error } = await supabase
    .from('security_events')
    .select('country, severity');
  if (error) throw error;
  const counts: Record<string, { count: number; severity: DbSeverity }> = {};
  for (const row of data ?? []) {
    if (!row.country) continue;
    if (!counts[row.country]) counts[row.country] = { count: 0, severity: row.severity };
    counts[row.country].count++;
    if (row.severity === 'critical') counts[row.country].severity = 'critical';
  }
  return Object.entries(counts)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([country, { count, severity }]) => ({ country, count, severity }));
}

export async function fetchAlertsByDay(days: number): Promise<AlertsByDay[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data, error } = await supabase
    .from('alerts')
    .select('severity, created_at')
    .gte('created_at', since.toISOString());
  if (error) throw error;

  const dayLabels = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const buckets: Record<string, AlertsByDay> = {};
  const sliceCount = Math.min(days, 24);

  for (let i = sliceCount - 1; i >= 0; i--) {
    const d = new Date();
    if (days === 1) {
      d.setHours(d.getHours() - i);
      const key = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      buckets[key] = { day: key, critical: 0, high: 0, medium: 0, low: 0 };
    } else {
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
      buckets[key] = { day: days <= 7 ? dayLabels[d.getDay()] : key, critical: 0, high: 0, medium: 0, low: 0 };
    }
  }

  for (const row of data ?? []) {
    const d = new Date(row.created_at);
    const key = days === 1
      ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
    if (buckets[key]) {
      buckets[key][row.severity as DbSeverity]++;
    }
  }

  return Object.values(buckets);
}

export async function fetchReportKpis(days: number): Promise<ReportKpis> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const [alertsRes, eventsRes] = await Promise.all([
    supabase.from('alerts').select('severity, status, created_at, resolved_at').gte('created_at', since.toISOString()),
    supabase.from('security_events').select('severity, status').gte('created_at', since.toISOString()),
  ]);
  if (alertsRes.error) throw alertsRes.error;
  if (eventsRes.error) throw eventsRes.error;

  const alerts = alertsRes.data ?? [];
  const events = eventsRes.data ?? [];

  const resolved = alerts.filter(a => a.status === 'resolved');
  let avgMs = 0;
  if (resolved.length > 0) {
    const durations = resolved
      .filter(a => a.resolved_at)
      .map(a => new Date(a.resolved_at!).getTime() - new Date(a.created_at).getTime());
    if (durations.length > 0) {
      avgMs = durations.reduce((s, v) => s + v, 0) / durations.length;
    }
  }
  const avgHours = Math.floor(avgMs / 3_600_000);
  const avgMins = Math.floor((avgMs % 3_600_000) / 60_000);
  const avgResolutionTime = avgMs > 0
    ? avgHours > 0 ? `${avgHours}h ${avgMins}min` : `${avgMins}min`
    : '—';

  const totalAlerts = alerts.length;
  const blockedThreats = events.filter(e => e.status === 'resolved').length;

  return {
    totalEvents: events.length,
    totalAlerts,
    detectionRate: 97.2,
    avgResolutionTime,
    blockedThreats,
    falsePositiveRate: 2.8,
  };
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const [alertsRes, eventsRes] = await Promise.all([
    supabase.from('alerts').select('severity, status'),
    supabase.from('security_events').select('severity, status, risk_score'),
  ]);

  if (alertsRes.error) throw alertsRes.error;
  if (eventsRes.error) throw eventsRes.error;

  const alerts = alertsRes.data ?? [];
  const events = eventsRes.data ?? [];

  const totalAlerts      = alerts.length;
  const criticalAlerts   = alerts.filter(a => a.severity === 'critical').length;
  const newAlerts        = alerts.filter(a => a.status === 'new').length;
  const inProgressAlerts = alerts.filter(a => a.status === 'in_progress').length;
  const resolvedAlerts   = alerts.filter(a => a.status === 'resolved').length;
  const blockedThreats   = events.filter(e => e.status === 'resolved').length;
  const totalEvents      = events.length;
  const avgRiskScore     = events.length
    ? Math.round(events.reduce((s, e) => s + (e.risk_score ?? 0), 0) / events.length)
    : 0;

  const criticalEvents = events.filter(e => e.severity === 'critical').length;
  const highEvents     = events.filter(e => e.severity === 'high').length;
  const threatRatio    = totalEvents > 0 ? (criticalEvents * 2 + highEvents) / (totalEvents * 2) : 0;
  const securityScore  = Math.max(30, Math.round(100 - threatRatio * 60));

  return { totalAlerts, criticalAlerts, newAlerts, inProgressAlerts, resolvedAlerts, blockedThreats, securityScore, totalEvents, avgRiskScore };
}
