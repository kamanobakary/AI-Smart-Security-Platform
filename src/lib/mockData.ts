import type { SecurityEvent, Alert, User, LoginLog, TrafficDataPoint, ThreatStats, AIRecommendation, DashboardStats } from '../types';

const attackTypes = [
  'SQL Injection', 'DDoS Attack', 'Brute Force', 'Phishing', 'Malware',
  'Ransomware', 'XSS Attack', 'MITM Attack', 'Zero-Day Exploit', 'Port Scan',
  'Buffer Overflow', 'Command Injection', 'CSRF Attack', 'DNS Spoofing', 'Credential Stuffing'
];

const countries = ['Chine', 'Russie', 'USA', 'Allemagne', 'Brésil', 'Inde', 'Iran', 'Corée du Nord', 'Ukraine', 'Roumanie'];
const protocols = ['TCP', 'UDP', 'HTTP', 'HTTPS', 'FTP', 'SSH', 'SMTP', 'DNS'];
const departments = ['Security', 'Engineering', 'DevOps', 'Finance', 'HR', 'Legal', 'Sales'];

function randomIP(): string {
  return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
}

function randomInternalIP(): string {
  return `192.168.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 254) + 1}`;
}

function randomDate(hoursBack: number): string {
  const d = new Date();
  d.setHours(d.getHours() - Math.floor(Math.random() * hoursBack));
  d.setMinutes(Math.floor(Math.random() * 60));
  return d.toISOString();
}

const severities: Array<'critical' | 'high' | 'medium' | 'low'> = ['critical', 'high', 'medium', 'low'];
const statuses: Array<'new' | 'in_progress' | 'resolved'> = ['new', 'in_progress', 'resolved'];

export const mockEvents: SecurityEvent[] = Array.from({ length: 120 }, (_, i) => ({
  id: `evt-${i + 1}`,
  event_type: attackTypes[Math.floor(Math.random() * attackTypes.length)],
  source_ip: randomIP(),
  destination_ip: randomInternalIP(),
  severity: severities[Math.floor(Math.random() * severities.length)],
  description: `Suspicious activity detected from external source targeting internal network infrastructure.`,
  protocol: protocols[Math.floor(Math.random() * protocols.length)],
  port: [80, 443, 22, 3306, 8080, 21, 25, 53, 3389, 8443][Math.floor(Math.random() * 10)],
  country: countries[Math.floor(Math.random() * countries.length)],
  status: statuses[Math.floor(Math.random() * statuses.length)],
  detected_at: randomDate(72),
})).sort((a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime());

export const mockAlerts: Alert[] = Array.from({ length: 48 }, (_, i) => {
  const attack = attackTypes[Math.floor(Math.random() * attackTypes.length)];
  const sev = severities[Math.floor(Math.random() * severities.length)];
  return {
    id: `alert-${i + 1}`,
    title: `${attack} Detected`,
    description: `AI engine identified a ${attack.toLowerCase()} attempt targeting critical infrastructure. Automated analysis completed.`,
    severity: sev,
    attack_type: attack,
    source_ip: randomIP(),
    destination_ip: randomInternalIP(),
    status: statuses[Math.floor(Math.random() * statuses.length)],
    created_at: randomDate(48),
    updated_at: randomDate(24),
  };
}).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

export const mockUsers: User[] = [
  { id: 'u1', email: 'admin@aisecurity.io', full_name: 'Abou Kamano', role: 'admin', department: 'Security', last_login: randomDate(1), is_active: true, created_at: randomDate(720) },
];

export const mockLoginLogs: LoginLog[] = Array.from({ length: 50 }, (_, i) => ({
  id: `log-${i + 1}`,
  user_id: mockUsers[0].id,
  email: mockUsers[0].email,
  ip_address: Math.random() > 0.8 ? randomIP() : randomInternalIP(),
  user_agent: ['Chrome/120 Windows', 'Firefox/121 macOS', 'Safari/17 macOS', 'Edge/120 Windows'][Math.floor(Math.random() * 4)],
  status: Math.random() > 0.15 ? (Math.random() > 0.05 ? 'success' : 'suspicious') : 'failed',
  location: ['Paris, France', 'Lyon, France', 'Remote VPN', 'Unknown', 'Berlin, Germany'][Math.floor(Math.random() * 5)],
  created_at: randomDate(48),
})).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

export function generateTrafficData(points: number = 24): TrafficDataPoint[] {
  return Array.from({ length: points }, (_, i) => {
    const h = new Date();
    h.setHours(h.getHours() - (points - 1 - i));
    return {
      time: h.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      inbound: Math.floor(Math.random() * 800 + 200),
      outbound: Math.floor(Math.random() * 500 + 100),
      blocked: Math.floor(Math.random() * 150 + 10),
    };
  });
}

export const threatStats: ThreatStats[] = [
  { type: 'Intrusion', count: 342, percentage: 28, trend: 'up' },
  { type: 'Malware', count: 218, percentage: 18, trend: 'down' },
  { type: 'Brute Force', count: 195, percentage: 16, trend: 'up' },
  { type: 'Phishing', count: 167, percentage: 14, trend: 'stable' },
  { type: 'DDoS', count: 134, percentage: 11, trend: 'down' },
  { type: 'Data Exfil', count: 98, percentage: 8, trend: 'up' },
  { type: 'Other', count: 61, percentage: 5, trend: 'stable' },
];

export const aiRecommendations: AIRecommendation[] = [
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

export const dashboardStats: DashboardStats = {
  totalEvents: 1247,
  criticalAlerts: mockAlerts.filter(a => a.severity === 'critical').length,
  highAlerts: mockAlerts.filter(a => a.severity === 'high').length,
  mediumAlerts: mockAlerts.filter(a => a.severity === 'medium').length,
  lowAlerts: mockAlerts.filter(a => a.severity === 'low').length,
  securityScore: 73,
  blockedThreats: 892,
  activeUsers: mockUsers.filter(u => u.is_active).length,
};

export function getAlertsByDay(): { day: string; critical: number; high: number; medium: number; low: number }[] {
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  return days.map(day => ({
    day,
    critical: Math.floor(Math.random() * 8 + 1),
    high: Math.floor(Math.random() * 15 + 3),
    medium: Math.floor(Math.random() * 25 + 5),
    low: Math.floor(Math.random() * 40 + 10),
  }));
}

export type ReportPeriod = 'today' | '7days' | '30days' | '3months';

export interface ReportData {
  kpis: {
    totalEvents: number;
    totalAlerts: number;
    detectionRate: number;
    avgResolutionTime: string;
    blockedThreats: number;
    falsePositiveRate: number;
  };
  alertsByDay: { day: string; critical: number; high: number; medium: number; low: number }[];
  trafficData: TrafficDataPoint[];
  threatBreakdown: { severity: string; count: number; percentage: number }[];
}

function generatePeriodAlerts(daysBack: number, maxAlerts: number): Alert[] {
  return Array.from({ length: maxAlerts }, (_, i) => {
    const attack = attackTypes[Math.floor(Math.random() * attackTypes.length)];
    const sev = severities[Math.floor(Math.random() * severities.length)];
    return {
      id: `alert-${i + 1}`,
      title: `${attack} Detected`,
      description: `AI engine identified a ${attack.toLowerCase()} attempt targeting critical infrastructure.`,
      severity: sev,
      attack_type: attack,
      source_ip: randomIP(),
      destination_ip: randomInternalIP(),
      status: statuses[Math.floor(Math.random() * statuses.length)],
      created_at: randomDate(daysBack * 24),
      updated_at: randomDate(Math.floor(daysBack * 24 / 2)),
    };
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

function generateAlertsByDay(days: number): { day: string; critical: number; high: number; medium: number; low: number }[] {
  const dayLabels = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    result.push({
      day: dayLabels[date.getDay()],
      critical: Math.floor(Math.random() * 8 + 1),
      high: Math.floor(Math.random() * 15 + 3),
      medium: Math.floor(Math.random() * 25 + 5),
      low: Math.floor(Math.random() * 40 + 10),
    });
  }
  return result;
}

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

export function getReportData(period: ReportPeriod): ReportData {
  let daysBack = 7;
  let maxAlerts = 48;
  let kpis = {
    totalEvents: 1247,
    totalAlerts: 48,
    detectionRate: 97.2,
    avgResolutionTime: '1h 23min',
    blockedThreats: 892,
    falsePositiveRate: 2.8,
  };

  if (period === 'today') {
    daysBack = 1;
    maxAlerts = Math.floor(Math.random() * 12 + 3);
    kpis = {
      totalEvents: Math.floor(Math.random() * 40 + 10),
      totalAlerts: maxAlerts,
      detectionRate: 98.1,
      avgResolutionTime: '45min',
      blockedThreats: Math.floor(Math.random() * 50 + 15),
      falsePositiveRate: 1.2,
    };
  } else if (period === '30days') {
    daysBack = 30;
    maxAlerts = 156;
    kpis = {
      totalEvents: 3214,
      totalAlerts: 156,
      detectionRate: 96.8,
      avgResolutionTime: '2h 15min',
      blockedThreats: 2145,
      falsePositiveRate: 3.1,
    };
  } else if (period === '3months') {
    daysBack = 90;
    maxAlerts = 432;
    kpis = {
      totalEvents: 8756,
      totalAlerts: 432,
      detectionRate: 96.4,
      avgResolutionTime: '2h 50min',
      blockedThreats: 5234,
      falsePositiveRate: 3.5,
    };
  }

  const alerts = generatePeriodAlerts(daysBack, maxAlerts);
  const alertsByDay = generateAlertsByDay(daysBack <= 30 ? daysBack : 7);
  const trafficData = generateTrafficByPeriod(daysBack);

  const threatBreakdown = [
    { severity: 'critical', count: alerts.filter(a => a.severity === 'critical').length, percentage: 0 },
    { severity: 'high', count: alerts.filter(a => a.severity === 'high').length, percentage: 0 },
    { severity: 'medium', count: alerts.filter(a => a.severity === 'medium').length, percentage: 0 },
    { severity: 'low', count: alerts.filter(a => a.severity === 'low').length, percentage: 0 },
  ];

  const total = threatBreakdown.reduce((s, t) => s + t.count, 0);
  threatBreakdown.forEach(t => {
    t.percentage = total > 0 ? Math.round((t.count / total) * 100) : 0;
  });

  return { kpis, alertsByDay, trafficData, threatBreakdown };
}

// ─── SOC Dashboard Extended Data ────────────────────────────────────────────

export interface PacketStats {
  time: string;
  total: number;
  suspicious: number;
  normal: number;
  blocked: number;
}

export interface AttackMapPoint {
  id: string;
  country: string;
  countryCode: string;
  lat: number;
  lng: number;
  count: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  attackType: string;
}

export interface AIClassification {
  timestamp: string;
  normal: number;
  suspicious: number;
  confidence: number;
  anomalyScore: number;
}

export interface TopAttack {
  type: string;
  count: number;
  change: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  icon: string;
}

export interface AlertLog {
  id: string;
  time: string;
  ip: string;
  attackType: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'new' | 'in_progress' | 'resolved';
  country: string;
  port: number;
  protocol: string;
  confidence: number;
}

const geoPoints: { country: string; code: string; lat: number; lng: number }[] = [
  { country: 'Chine', code: 'CN', lat: 35.86, lng: 104.19 },
  { country: 'Russie', code: 'RU', lat: 61.52, lng: 105.31 },
  { country: 'Corée du Nord', code: 'KP', lat: 40.33, lng: 127.51 },
  { country: 'Iran', code: 'IR', lat: 32.42, lng: 53.68 },
  { country: 'Ukraine', code: 'UA', lat: 48.37, lng: 31.16 },
  { country: 'Roumanie', code: 'RO', lat: 45.94, lng: 24.96 },
  { country: 'Brésil', code: 'BR', lat: -14.23, lng: -51.92 },
  { country: 'Inde', code: 'IN', lat: 20.59, lng: 78.96 },
  { country: 'USA', code: 'US', lat: 37.09, lng: -95.71 },
  { country: 'Allemagne', code: 'DE', lat: 51.16, lng: 10.45 },
];

export function generateAttackMapData(): AttackMapPoint[] {
  return geoPoints.map((g, i) => ({
    id: `geo-${i}`,
    country: g.country,
    countryCode: g.code,
    lat: g.lat,
    lng: g.lng,
    count: Math.floor(Math.random() * 280 + 20),
    severity: severities[Math.floor(Math.random() * severities.length)],
    attackType: attackTypes[Math.floor(Math.random() * attackTypes.length)],
  }));
}

export function generatePacketStats(points = 20): PacketStats[] {
  return Array.from({ length: points }, (_, i) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - (points - 1 - i) * 3);
    const total = Math.floor(Math.random() * 5000 + 3000);
    const suspicious = Math.floor(total * (Math.random() * 0.08 + 0.02));
    const blocked = Math.floor(suspicious * (Math.random() * 0.4 + 0.5));
    return {
      time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      total,
      suspicious,
      blocked,
      normal: total - suspicious,
    };
  });
}

export function generateAIClassification(points = 24): AIClassification[] {
  return Array.from({ length: points }, (_, i) => {
    const d = new Date();
    d.setHours(d.getHours() - (points - 1 - i));
    const normal = Math.floor(Math.random() * 30 + 60);
    return {
      timestamp: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      normal,
      suspicious: 100 - normal,
      confidence: Math.floor(Math.random() * 10 + 89),
      anomalyScore: Math.floor(Math.random() * 35 + 5),
    };
  });
}

export function generateAlertLogs(count = 30): AlertLog[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - Math.floor(Math.random() * 480));
    return {
      id: `log-${i}`,
      time: d.toISOString(),
      ip: randomIP(),
      attackType: attackTypes[Math.floor(Math.random() * attackTypes.length)],
      severity: severities[Math.floor(Math.random() * severities.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      country: countries[Math.floor(Math.random() * countries.length)],
      port: [80, 443, 22, 3306, 8080, 21, 25, 53, 3389][Math.floor(Math.random() * 9)],
      protocol: protocols[Math.floor(Math.random() * protocols.length)],
      confidence: Math.floor(Math.random() * 20 + 79),
    };
  }).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
}

export const topAttacks: TopAttack[] = [
  { type: 'DDoS', count: 347, change: +18, severity: 'critical', icon: 'zap' },
  { type: 'Brute Force', count: 284, change: +7, severity: 'high', icon: 'lock' },
  { type: 'Port Scanning', count: 231, change: -5, severity: 'medium', icon: 'scan' },
  { type: 'Malware', count: 198, change: +23, severity: 'critical', icon: 'bug' },
  { type: 'SQL Injection', count: 145, change: -12, severity: 'high', icon: 'database' },
];

export interface PeriodStats {
  period: string;
  packetsAnalyzed: number;
  threatsBlocked: number;
  activeAlerts: number;
  uptime: number;
  aiConfidence: number;
}

export function getPeriodStats(period: '24h' | '7d' | '30d'): PeriodStats {
  const multipliers = { '24h': 1, '7d': 7, '30d': 30 };
  const m = multipliers[period];
  return {
    period,
    packetsAnalyzed: Math.floor(1_240_000 * m * (0.9 + Math.random() * 0.2)),
    threatsBlocked: Math.floor(892 * m * (0.85 + Math.random() * 0.3)),
    activeAlerts: Math.floor(23 + Math.random() * 15),
    uptime: 99.7 + Math.random() * 0.3,
    aiConfidence: 94 + Math.random() * 5,
  };
}
