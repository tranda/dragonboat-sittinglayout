import { useState, useEffect, useCallback } from 'react';
import * as api from '../utils/api';

interface Props {
  onClose: () => void;
}

interface UserRow {
  id: number;
  name: string;
  email: string;
  role: string;
  athlete_id: number | null;
  is_active: boolean;
  teams: { id: number; name: string; type: string }[];
}

const ROLES = ['admin', 'coach', 'athlete'] as const;

export function UserManager({ onClose }: Props) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [teams, setTeams] = useState<api.ApiTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<string>('coach');
  const [formTeamIds, setFormTeamIds] = useState<Set<number>>(new Set());

  const load = useCallback(async () => {
    try {
      const [userData, teamData] = await Promise.all([api.fetchUsers(), api.fetchTeams()]);
      setUsers(userData as unknown as UserRow[]);
      setTeams(teamData);
    } catch (err) {
      alert('Failed to load: ' + (err instanceof Error ? err.message : ''));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const clearForm = () => {
    setShowAdd(false); setEditId(null);
    setFormName(''); setFormEmail(''); setFormPassword('');
    setFormRole('coach'); setFormTeamIds(new Set());
  };



  const handleAdd = async () => {
    if (!formName.trim() || !formEmail.trim() || !formPassword.trim()) return;
    if (formRole !== 'admin' && formTeamIds.size === 0) return;
    try {
      const payload: Record<string, unknown> = {
        name: formName.trim(), email: formEmail.trim(), password: formPassword, role: formRole,
      };
      if (formRole !== 'admin') payload.team_ids = Array.from(formTeamIds);
      await api.createUser(payload);
      clearForm();
      await load();
    } catch (err) {
      alert('Failed: ' + (err instanceof Error ? err.message : ''));
    }
  };

  const startEdit = (u: UserRow) => {
    setEditId(u.id);
    setFormName(u.name);
    setFormEmail(u.email);
    setFormRole(u.role);
    setFormPassword('');
    setFormTeamIds(new Set(u.teams.map(t => t.id)));
    setShowAdd(false);
  };

  const handleEdit = async () => {
    if (!editId || !formName.trim() || !formEmail.trim()) return;
    if (formRole !== 'admin' && formTeamIds.size === 0) return;
    try {
      const data: Record<string, unknown> = {
        name: formName.trim(), email: formEmail.trim(), role: formRole,
      };
      if (formRole !== 'admin') data.team_ids = Array.from(formTeamIds);
      if (formPassword.trim()) data.password = formPassword.trim();
      await api.updateUser(editId, data);
      setEditId(null);
      await load();
    } catch (err) {
      alert('Failed: ' + (err instanceof Error ? err.message : ''));
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete user "${name}"?`)) return;
    try { await api.deleteUser(id); await load(); }
    catch (err) { alert('Failed: ' + (err instanceof Error ? err.message : '')); }
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    try { await api.updateUser(id, { is_active: isActive }); await load(); }
    catch (err) { alert('Failed: ' + (err instanceof Error ? err.message : '')); }
  };

  const clubTeams = teams.filter(t => t.type === 'club');
  const nationalTeams = teams.filter(t => t.type === 'national');
  const selectedClubId = Array.from(formTeamIds).find(id => clubTeams.some(t => t.id === id));
  const selectedNationalId = Array.from(formTeamIds).find(id => nationalTeams.some(t => t.id === id));

  const setClubTeam = (id: string) => {
    setFormTeamIds(prev => {
      const next = new Set(Array.from(prev).filter(tid => !clubTeams.some(t => t.id === tid)));
      if (id) next.add(Number(id));
      return next;
    });
  };
  const setNationalTeam = (id: string) => {
    setFormTeamIds(prev => {
      const next = new Set(Array.from(prev).filter(tid => !nationalTeams.some(t => t.id === tid)));
      if (id) next.add(Number(id));
      return next;
    });
  };

  const teamSelector = formRole !== 'admin' ? (
    <div className="space-y-2">
      <div>
        <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase mb-1">Club Team</div>
        <select value={selectedClubId ?? ''} onChange={e => setClubTeam(e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-lg">
          <option value="">No club</option>
          {clubTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
      <div>
        <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase mb-1">National Team</div>
        <select value={selectedNationalId ?? ''} onChange={e => setNationalTeam(e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-lg">
          <option value="">No national team</option>
          {nationalTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
    </div>
  ) : null;

  const formFields = (
    <div className="space-y-2">
      <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="Name" className="w-full px-2 py-1.5 text-sm border rounded-lg" autoFocus />
      <input value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="Email" type="email" className="w-full px-2 py-1.5 text-sm border rounded-lg" />
      <input value={formPassword} onChange={e => setFormPassword(e.target.value)} placeholder={editId ? 'New password (leave empty to keep)' : 'Password (min 6 chars)'} type="password" className="w-full px-2 py-1.5 text-sm border rounded-lg" />
      <select value={formRole} onChange={e => setFormRole(e.target.value)} className="w-full px-2 py-1.5 text-sm border rounded-lg">
        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
      </select>
      {teamSelector}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[var(--bg-overlay)] pt-8">
      <div className="bg-[var(--bg-surface)] rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[85dvh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">User Management</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-xl px-1">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center text-[var(--text-muted)] py-8">Loading...</div>
          ) : (
            <>
              {users.map(u => (
                <div key={u.id} className={`border rounded-lg p-3 ${!u.is_active ? 'opacity-50' : ''}`}>
                  {editId === u.id ? (
                    <div className="space-y-2">
                      {formFields}
                      <div className="flex gap-2">
                        <button onClick={handleEdit} disabled={formRole !== 'admin' && formTeamIds.size === 0} className="flex-1 py-1.5 text-xs bg-blue-600 text-white rounded-lg disabled:opacity-50">Save</button>
                        <button onClick={() => setEditId(null)} className="px-3 py-1.5 text-xs bg-[var(--bg-surface-alt)] rounded-lg">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-[var(--text-primary)]">{u.name}</div>
                        <div className="text-xs text-[var(--text-secondary)]">{u.email}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            u.role === 'admin' ? 'bg-[var(--bg-role-admin)] text-[var(--text-role-admin)]' :
                            u.role === 'coach' ? 'bg-[var(--bg-role-coach)] text-[var(--text-role-coach)]' :
                            'bg-[var(--bg-surface-alt)] text-[var(--text-secondary)]'
                          }`}>{u.role}</span>
                          {u.teams.map(t => (
                            <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-[var(--bg-male)] text-[var(--text-male)]">
                              {t.name}
                            </span>
                          ))}
                          {!u.is_active && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-700">inactive</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button onClick={() => handleToggleActive(u.id, !u.is_active)}
                          className={`px-2 py-1 text-xs rounded ${u.is_active ? 'text-yellow-600 hover:bg-yellow-50' : 'text-green-600 hover:bg-green-50'}`}>
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button onClick={() => startEdit(u)} className="px-2 py-1 text-xs text-blue-600 hover:bg-[var(--bg-male)] rounded">Edit</button>
                        <button onClick={() => handleDelete(u.id, u.name)} className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded">Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {showAdd ? (
                <div className="border-2 border-dashed border-green-300 rounded-lg p-3 space-y-2">
                  {formFields}
                  <div className="flex gap-2">
                    <button onClick={handleAdd} disabled={formRole !== 'admin' && formTeamIds.size === 0} className="flex-1 py-1.5 text-xs bg-green-600 text-white rounded-lg disabled:opacity-50">Add User</button>
                    <button onClick={() => { clearForm(); setShowAdd(false); }} className="px-3 py-1.5 text-xs bg-[var(--bg-surface-alt)] rounded-lg">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { clearForm(); setShowAdd(true); }} className="w-full py-2 text-sm text-green-700 border-2 border-dashed border-green-300 rounded-lg hover:bg-green-50">
                  + Add User
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
