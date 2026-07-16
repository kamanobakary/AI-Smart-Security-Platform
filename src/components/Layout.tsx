import { useState } from 'react';
import {
  Shield, LayoutDashboard, Radio, Bell, Brain, BarChart3,
  Users, Lightbulb, Sun, Moon, LogOut, Menu, X, ChevronRight,
  Settings, AlertTriangle, BellRing, FlaskConical
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';

export type Page = 'dashboard' | 'monitoring' | 'alerts' | 'threats' | 'reports' | 'users' | 'recommendations' | 'notifications' | 'security-tests';

interface Props {
  activePage: Page;
  onNavigate: (page: Page) => void;
  children: React.ReactNode;
  alertCount?: number;
}

const navItems: { id: Page; label: string; icon: React.ComponentType<{ className?: string }>; separator?: boolean }[] = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'monitoring', label: 'Surveillance', icon: Radio },
  { id: 'alerts', label: 'Alertes', icon: Bell },
  { id: 'threats', label: 'Détection IA', icon: Brain },
  { id: 'reports', label: 'Rapports', icon: BarChart3 },
  { id: 'users', label: 'Utilisateurs', icon: Users },
  { id: 'recommendations', label: 'Recommandations IA', icon: Lightbulb },
  { id: 'notifications', label: 'Notifications', icon: BellRing },
  { id: 'security-tests', label: 'Tests de Sécurité', icon: FlaskConical, separator: true },
];

export default function Layout({ activePage, onNavigate, children, alertCount = 0 }: Props) {
  const { theme, toggleTheme } = useTheme();
  const { profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const roleLabel: Record<string, string> = { admin: 'Administrateur', analyst: 'Analyste', user: 'Utilisateur' };
  const roleColor: Record<string, string> = { admin: 'text-red-400', analyst: 'text-blue-400', user: 'text-slate-400' };

  function SidebarContent() {
    return (
      <>
        <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800 dark:border-slate-800 border-slate-200">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
            <Shield className="w-4 h-4 text-blue-400" />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-semibold text-slate-100 dark:text-slate-100 leading-tight truncate">AI Smart Security</p>
            <p className="text-[10px] text-slate-500 leading-tight">SOC Platform v2.1</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = activePage === item.id;
            const isTestPage = item.id === 'security-tests';
            return (
              <div key={item.id}>
                {item.separator && (
                  <div className="mx-1 my-2 border-t border-slate-800" />
                )}
                <button onClick={() => { onNavigate(item.id); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group relative ${
                    active
                      ? isTestPage
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      : isTestPage
                        ? 'text-emerald-500/70 hover:bg-emerald-500/5 hover:text-emerald-400'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}>
                  <Icon className={`w-4 h-4 flex-shrink-0 ${
                    active
                      ? isTestPage ? 'text-emerald-400' : 'text-blue-400'
                      : isTestPage ? 'text-emerald-600 group-hover:text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'
                  }`} />
                  <span className="text-sm font-medium">{item.label}</span>
                  {item.id === 'alerts' && alertCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {alertCount > 99 ? '99+' : alertCount}
                    </span>
                  )}
                  {active && <ChevronRight className={`ml-auto w-3 h-3 opacity-60 ${isTestPage ? 'text-emerald-400' : 'text-blue-400'}`} />}
                </button>
              </div>
            );
          })}
        </nav>

        <div className="px-3 pb-4 border-t border-slate-800 dark:border-slate-800 pt-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/50">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-blue-400">
                {(profile?.full_name || profile?.email || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-xs font-medium text-slate-200 truncate">{profile?.full_name || 'Utilisateur'}</p>
              <p className={`text-[10px] ${roleColor[profile?.role ?? 'user'] || 'text-slate-400'}`}>
                {roleLabel[profile?.role ?? 'user']}
              </p>
            </div>
            <button onClick={() => signOut()} title="Déconnexion"
              className="text-slate-500 hover:text-red-400 transition-colors">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className={`flex h-screen overflow-hidden ${theme === 'dark' ? 'dark bg-slate-950' : 'bg-slate-100'}`}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-56 bg-slate-900 dark:bg-slate-900 border-r border-slate-800 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 bg-slate-900 flex flex-col h-full shadow-2xl">
            <button onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-slate-900 dark:bg-slate-900 border-b border-slate-800 flex items-center px-4 gap-3 flex-shrink-0">
          <button className="lg:hidden text-slate-400 hover:text-white" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1 flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-slate-400 hidden sm:block">Systèmes opérationnels</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {alertCount > 0 && (
              <button onClick={() => onNavigate('alerts')}
                className="relative flex items-center gap-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs px-2.5 py-1.5 rounded-lg hover:bg-red-500/20 transition-colors">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="hidden sm:block">{alertCount} alerte{alertCount > 1 ? 's' : ''}</span>
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
              </button>
            )}

            <button onClick={toggleTheme}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all">
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="relative">
              <button onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 rounded-lg px-2.5 py-1.5 transition-colors">
                <div className="w-5 h-5 rounded-md bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-blue-400">
                    {(profile?.full_name || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-xs text-slate-300 hidden sm:block max-w-24 truncate">
                  {profile?.full_name || 'Utilisateur'}
                </span>
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-10 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 py-1">
                  <div className="px-3 py-2 border-b border-slate-700">
                    <p className="text-xs font-medium text-white">{profile?.full_name}</p>
                    <p className="text-[10px] text-slate-400">{profile?.email}</p>
                  </div>
                  <button onClick={() => { onNavigate('users'); setShowUserMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors">
                    <Settings className="w-3.5 h-3.5" /> Paramètres
                  </button>
                  <button onClick={() => { signOut(); setShowUserMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-slate-700/50 transition-colors">
                    <LogOut className="w-3.5 h-3.5" /> Déconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-950 dark:bg-slate-950 text-slate-100 dark:text-slate-100">
          {children}
        </main>
      </div>
    </div>
  );
}
