export type Severity = 'critical' | 'high' | 'medium' | 'low';
export type AlertStatus = 'new' | 'in_progress' | 'resolved';
export type UserRole = 'admin' | 'analyst' | 'user';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  department: string;
  last_login: string;
  is_active: boolean;
  created_at: string;
}

export interface SecurityEvent {
  id: string;
  event_type: string;
  source_ip: string;
  destination_ip: string;
  severity: Severity;
  description: string;
  protocol: string;
  port: number;
  country: string;
  status: AlertStatus;
  detected_at: string;
}

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  attack_type: string;
  source_ip: string;
  destination_ip: string;
  status: AlertStatus;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

export interface LoginLog {
  id: string;
  user_id: string;
  email: string;
  ip_address: string;
  user_agent: string;
  status: 'success' | 'failed' | 'suspicious';
  location: string;
  created_at: string;
}

export interface TrafficDataPoint {
  time: string;
  inbound: number;
  outbound: number;
  blocked: number;
}

export interface ThreatStats {
  type: string;
  count: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface AIRecommendation {
  id: string;
  priority: Severity;
  category: string;
  title: string;
  description: string;
  action: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
}

export interface DashboardStats {
  totalEvents: number;
  criticalAlerts: number;
  highAlerts: number;
  mediumAlerts: number;
  lowAlerts: number;
  securityScore: number;
  blockedThreats: number;
  activeUsers: number;
}
