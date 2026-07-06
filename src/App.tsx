import { useState, useCallback } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout, { type Page } from './components/Layout';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import RealTimeMonitoring from './components/RealTimeMonitoring';
import AlertSystem from './components/AlertSystem';
import ThreatDetection from './components/ThreatDetection';
import Reports from './components/Reports';
import UserManagement from './components/UserManagement';
import AIRecommendations from './components/AIRecommendations';
import NotificationSystem from './components/NotificationSystem';
import SecurityTests from './components/SecurityTests';

function AppContent() {
  const { user, loading } = useAuth();
  const [activePage, setActivePage]   = useState<Page>('dashboard');
  const [newAlertCount, setNewAlertCount] = useState(0);

  // Called by AlertSystem and Dashboard whenever the "new" count changes
  const handleNewAlert = useCallback((count: number) => {
    setNewAlertCount(count);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-400 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Initialisation...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Login />;

  const pages: Record<Page, React.ReactNode> = {
    dashboard:       <Dashboard       onNavigate={setActivePage} onNewAlert={handleNewAlert} />,
    monitoring:      <RealTimeMonitoring />,
    alerts:          <AlertSystem     onNewAlert={handleNewAlert} />,
    threats:         <ThreatDetection />,
    reports:         <Reports />,
    users:           <UserManagement />,
    recommendations: <AIRecommendations />,
    notifications:   <NotificationSystem />,
    'security-tests': <SecurityTests />,
  };

  return (
    <Layout activePage={activePage} onNavigate={setActivePage} alertCount={newAlertCount}>
      {pages[activePage]}
    </Layout>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
