import { useState, useEffect } from 'react';
import { Users, Shield, Search, UserCheck, UserX, Clock, Globe, Monitor, ChevronDown, Plus, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { User, UserRole } from '../types';

const roleConfig: Record<UserRole, { label: string; color: string; bg: string; border: string }> = {
  admin: { label: 'Administrateur', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  analyst: { label: 'Analyste', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  user: { label: 'Utilisateur', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' },
};

const logStatusConfig = {
  success: { label: 'Succès', color: 'text-green-400', bg: 'bg-green-500/10' },
  failed: { label: 'Échec', color: 'text-red-400', bg: 'bg-red-500/10' },
  suspicious: { label: 'Suspect', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
};

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRoleMenu, setShowRoleMenu] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setLoading(true);
      setError('');

      const { data, error: err } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) {
        console.error('Error loading users:', err);
        setError('Erreur lors du chargement des utilisateurs');
        return;
      }

      setUsers(data as User[]);
    } catch (err) {
      console.error('Load users exception:', err);
      setError('Erreur lors de la récupération des utilisateurs');
    } finally {
      setLoading(false);
    }
  }

  const filtered = users.filter(u => {
    const matchSearch = search === '' || u.full_name.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'all' || u.role === filterRole;
    const matchStatus = filterStatus === 'all' || (filterStatus === 'active' ? u.is_active : !u.is_active);
    return matchSearch && matchRole && matchStatus;
  });

  async function updateUserRole(id: string, role: UserRole) {
    try {
      const { error: err } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', id);

      if (err) {
        console.error('Error updating role:', err);
        setError('Erreur lors de la mise à jour du rôle');
        return;
      }

      setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
      if (selectedUser?.id === id) setSelectedUser(prev => prev ? { ...prev, role } : null);
      setShowRoleMenu(null);
    } catch (err) {
      console.error('Update role exception:', err);
      setError('Erreur lors de la modification du rôle');
    }
  }

  async function toggleActive(id: string) {
    try {
      const user = users.find(u => u.id === id);
      if (!user) return;

      const { error: err } = await supabase
        .from('profiles')
        .update({ is_active: !user.is_active })
        .eq('id', id);

      if (err) {
        console.error('Error toggling active:', err);
        setError('Erreur lors de la mise à jour du statut');
        return;
      }

      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: !u.is_active } : u));
      if (selectedUser?.id === id) setSelectedUser(prev => prev ? { ...prev, is_active: !prev.is_active } : null);
    } catch (err) {
      console.error('Toggle active exception:', err);
      setError('Erreur lors de la modification du statut');
    }
  }

  const counts = {
    all: users.length,
    admin: users.filter(u => u.role === 'admin').length,
    analyst: users.filter(u => u.role === 'analyst').length,
    user: users.filter(u => u.role === 'user').length,
    active: users.filter(u => u.is_active).length,
    inactive: users.filter(u => !u.is_active).length,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" /> Gestion des utilisateurs
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Administration des comptes et contrôle d'accès</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total utilisateurs', value: counts.all, color: 'text-blue-400', icon: Users },
          { label: 'Administrateurs', value: counts.admin, color: 'text-red-400', icon: Shield },
          { label: 'Comptes actifs', value: counts.active, color: 'text-green-400', icon: UserCheck },
          { label: 'Comptes inactifs', value: counts.inactive, color: 'text-yellow-400', icon: UserX },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3 hover:border-slate-700 transition-colors">
            <s.icon className={`w-8 h-8 ${s.color} opacity-60`} />
            <div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">Erreur</p>
            <p className="text-xs mt-1">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* User list */}
        <div className="lg:col-span-2 space-y-3">
          {/* Filters */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher par nom..."
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors" />
            </div>
            {(['all', 'admin', 'analyst', 'user'] as const).map(r => (
              <button key={r} onClick={() => setFilterRole(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterRole === r ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                {r === 'all' ? `Tous (${counts.all})` : `${roleConfig[r].label} (${counts[r]})`}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
              <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-400 rounded-full animate-spin mx-auto" />
              <p className="text-slate-400 text-sm mt-3">Chargement des utilisateurs...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
              <Users className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Aucun utilisateur trouvé</p>
              <p className="text-slate-600 text-xs mt-1">Les utilisateurs apparaîtront ici après leur création</p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Utilisateur', 'Rôle', 'Département', 'Dernière connexion', 'Statut', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-slate-500 font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(user => {
                    const rc = roleConfig[user.role];
                    return (
                      <tr key={user.id}
                        className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors cursor-pointer ${selectedUser?.id === user.id ? 'bg-blue-500/5' : ''}`}
                        onClick={() => setSelectedUser(user)}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                              <span className="text-xs font-bold text-white">
                                {user.full_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-slate-200">{user.full_name}</p>
                              <p className="text-slate-500 text-[10px]">ID: {user.id.slice(0, 8)}...</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded border text-[10px] font-medium ${rc.bg} ${rc.color} ${rc.border}`}>
                            {rc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400">{user.department || '—'}</td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                          {new Date(user.last_login).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-1 text-[10px] font-medium ${user.is_active ? 'text-green-400' : 'text-slate-500'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-green-400' : 'bg-slate-600'}`} />
                            {user.is_active ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <button onClick={() => setShowRoleMenu(showRoleMenu === user.id ? null : user.id)}
                                className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-400 px-2 py-1 rounded-lg text-[10px] transition-colors">
                                Rôle <ChevronDown className="w-3 h-3" />
                              </button>
                              {showRoleMenu === user.id && (
                                <div className="absolute right-0 top-7 z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1 min-w-32">
                                  {(['admin', 'analyst', 'user'] as UserRole[]).map(r => (
                                    <button key={r} onClick={() => updateUserRole(user.id, r)}
                                      className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-700 transition-colors ${roleConfig[r].color}`}>
                                      {roleConfig[r].label}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <button onClick={() => toggleActive(user.id)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${user.is_active ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}>
                              {user.is_active ? 'Désactiver' : 'Activer'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* User detail panel */}
        <div className="space-y-4">
          {selectedUser ? (
            <>
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-xl p-5 sticky top-0">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 border border-blue-400 flex items-center justify-center">
                    <span className="text-lg font-bold text-white">{selectedUser.full_name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-white">{selectedUser.full_name}</p>
                    <p className="text-xs text-slate-400">ID: {selectedUser.id.slice(0, 12)}...</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  {[
                    { label: 'Rôle', value: roleConfig[selectedUser.role].label, color: roleConfig[selectedUser.role].color },
                    { label: 'Département', value: selectedUser.department || 'Non spécifié' },
                    { label: 'Statut', value: selectedUser.is_active ? 'Actif' : 'Inactif', color: selectedUser.is_active ? 'text-green-400' : 'text-slate-400' },
                    { label: 'Membre depuis', value: new Date(selectedUser.created_at).toLocaleDateString('fr-FR') },
                    { label: 'Dernière connexion', value: new Date(selectedUser.last_login).toLocaleString('fr-FR') },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between items-center border-b border-slate-700 pb-2.5">
                      <span className="text-slate-400">{r.label}</span>
                      <span className={`font-medium text-slate-200 ${r.color || ''}`}>{r.value}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-700 space-y-2">
                  <p className="text-xs font-semibold text-slate-300 mb-2">Actions</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => toggleActive(selectedUser.id)}
                      className={`px-2 py-2 rounded-lg text-[10px] font-medium transition-colors text-center ${selectedUser.is_active ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20'}`}>
                      {selectedUser.is_active ? 'Désactiver' : 'Activer'}
                    </button>
                    <div className="relative">
                      <button onClick={() => setShowRoleMenu(showRoleMenu === selectedUser.id ? null : selectedUser.id)}
                        className="w-full px-2 py-2 rounded-lg text-[10px] font-medium transition-colors bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 flex items-center justify-center gap-1">
                        Rôle <ChevronDown className="w-2.5 h-2.5" />
                      </button>
                      {showRoleMenu === selectedUser.id && (
                        <div className="absolute right-0 top-10 z-50 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl py-1 min-w-32">
                          {(['admin', 'analyst', 'user'] as UserRole[]).map(r => (
                            <button key={r} onClick={() => updateUserRole(selectedUser.id, r)}
                              className={`w-full text-left px-3 py-2 text-xs hover:bg-slate-700 transition-colors ${roleConfig[r].color}`}>
                              {roleConfig[r].label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide mb-2">Informations système</p>
                <div className="space-y-1.5 text-[10px]">
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-500">UUID</span>
                    <span className="font-mono text-slate-400 text-[9px]">{selectedUser.id}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Créé le</span>
                    <span className="text-slate-300">{new Date(selectedUser.created_at).toLocaleString('fr-FR')}</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-slate-900 border border-slate-800 border-dashed rounded-xl p-8 text-center sticky top-0">
              <Users className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Sélectionnez un utilisateur</p>
              <p className="text-xs text-slate-600 mt-1">pour afficher les détails</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
