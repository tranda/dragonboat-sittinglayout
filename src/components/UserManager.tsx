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
  team: string | null;
  team_id?: number | null;
}

const ROLES = ['admin', 'coach', 'athlete'] as const;

export function UserManager({ onClose }: Props) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [teams, setTeams] = useState<api.ApiTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Add form
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addRole, setAddRole] = useState<string>('coach');
  const [addTeamId, setAddTeamId] = useState<string>('');

  // Edit form
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<string>('coach');
  const [editTeamId, setEditTeamId] = useState<string>('');

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

  const handleAdd = async () => {
    if (!addName.trim() || !addEmail.trim() || !addPassword.trim()) return;
    try {
      await api.createUser({ name: addName.trim(), email: addEmail.trim(), password: addPassword, role: addRole, team_id: addTeamId ? Number(addTeamId) : null });
      setShowAdd(false);
      setAddName(''); setAddEmail(''); setAddPassword(''); setAddRole('coach'); setAddTeamId('');
      await load();
    } catch (err) {
      alert('Failed: ' + (err instanceof Error ? err.message : ''));
    }
  };

  const startEdit = (u: UserRow) => {
    setEditId(u.id);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditRole(u.role);
    setEditPassword('');
    setEditTeamId(u.team_id ? String(u.team_id) : '');
  };

  const handleEdit = async () => {
    if (!editId || !editName.trim() || !editEmail.trim()) return;
    try {
      const data: Record<string, unknown> = { name: editName.trim(), email: editEmail.trim(), role: editRole, team_id: editTeamId ? Number(editTeamId) : null };
      if (editPassword.trim()) data.password = editPassword.trim();
      await api.updateUser(editId, data);
      setEditId(null);
      await load();
    } catch (err) {
      alert('Failed: ' + (err instanceof Error ? err.message : ''));
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Delete user "${name}"?`)) return;
    try {
      await api.deleteUser(id);
      await load();
    } catch (err) {
      alert('Failed: ' + (err instanceof Error ? err.message : ''));
    }
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      await api.updateUser(id, { is_active: isActive });
      await load();
    } catch (err) {
      alert('Failed: ' + (err instanceof Error ? err.message : ''));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[var(--bg-overlay)] pt-8">
      <div className="bg-[var(--bg-surface)] rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[85dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">User Management</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-xl px-1">&times;</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center text-[var(--text-muted)] py-8">Loading...</div>
          ) : (
            <>
              {users.map(u => (
                <div key={u.id} className={`border rounded-lg p-3 ${!u.is_active ? 'opacity-50' : ''}`}>
                  {editId === u.id ? (
                    <div className="space-y-2">
                      <input
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        placeholder="Name"
                        className="w-full px-2 py-1.5 text-sm border rounded-lg"
                        autoFocus
                      />
                      <input
                        value={editEmail}
                        onChange={e => setEditEmail(e.target.value)}
                        placeholder="Email"
                        type="email"
                        className="w-full px-2 py-1.5 text-sm border rounded-lg"
                      />
                      <input
                        value={editPassword}
                        onChange={e => setEditPassword(e.target.value)}
                        placeholder="New password (leave empty to keep)"
                        type="password"
                        className="w-full px-2 py-1.5 text-sm border rounded-lg"
                      />
                      <div className="flex gap-2">
                        <select
                          value={editRole}
                          onChange={e => setEditRole(e.target.value)}
                          className="flex-1 px-2 py-1.5 text-sm border rounded-lg"
                        >
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                        <select
                          value={editTeamId}
                          onChange={e => setEditTeamId(e.target.value)}
                          className="flex-1 px-2 py-1.5 text-sm border rounded-lg"
                        >
                          <option value="">No team</option>
                          {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleEdit} className="flex-1 py-1.5 text-xs bg-blue-600 text-white rounded-lg">Save</button>
                        <button onClick={() => setEditId(null)} className="px-3 py-1.5 text-xs bg-[var(--bg-surface-alt)] rounded-lg">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-[var(--text-primary)]">{u.name}</div>
                        <div className="text-xs text-[var(--text-secondary)]">{u.email}{u.team ? ` · ${u.team}` : ''}</div>
                        <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          u.role === 'admin' ? 'bg-[var(--bg-role-admin)] text-[var(--text-role-admin)]' :
                          u.role === 'coach' ? 'bg-[var(--bg-male-strong)] text-blue-700' :
                          'bg-[var(--bg-surface-alt)] text-[var(--text-secondary)]'
                        }`}>{u.role}</span>
                        {!u.is_active && (
                          <span className="inline-block mt-1 ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-700">inactive</span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleToggleActive(u.id, !u.is_active)}
                          className={`px-2 py-1 text-xs rounded ${u.is_active ? 'text-yellow-600 hover:bg-yellow-50' : 'text-green-600 hover:bg-green-50'}`}
                        >{u.is_active ? 'Deactivate' : 'Activate'}</button>
                        <button
                          onClick={() => startEdit(u)}
                          className="px-2 py-1 text-xs text-blue-600 hover:bg-[var(--bg-male)] rounded"
                        >Edit</button>
                        <button
                          onClick={() => handleDelete(u.id, u.name)}
                          className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
                        >Delete</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Add form */}
              {showAdd ? (
                <div className="border-2 border-dashed border-green-300 rounded-lg p-3 space-y-2">
                  <input
                    value={addName}
                    onChange={e => setAddName(e.target.value)}
                    placeholder="Name"
                    className="w-full px-2 py-1.5 text-sm border rounded-lg"
                    autoFocus
                  />
                  <input
                    value={addEmail}
                    onChange={e => setAddEmail(e.target.value)}
                    placeholder="Email"
                    type="email"
                    className="w-full px-2 py-1.5 text-sm border rounded-lg"
                  />
                  <input
                    value={addPassword}
                    onChange={e => setAddPassword(e.target.value)}
                    placeholder="Password (min 6 chars)"
                    type="password"
                    className="w-full px-2 py-1.5 text-sm border rounded-lg"
                  />
                  <div className="flex gap-2">
                    <select
                      value={addRole}
                      onChange={e => setAddRole(e.target.value)}
                      className="flex-1 px-2 py-1.5 text-sm border rounded-lg"
                    >
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <select
                      value={addTeamId}
                      onChange={e => setAddTeamId(e.target.value)}
                      className="flex-1 px-2 py-1.5 text-sm border rounded-lg"
                    >
                      <option value="">No team</option>
                      {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleAdd} className="flex-1 py-1.5 text-xs bg-green-600 text-white rounded-lg">Add User</button>
                    <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs bg-[var(--bg-surface-alt)] rounded-lg">Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAdd(true)}
                  className="w-full py-2 text-sm text-[var(--text-badge-side)] border-2 border-dashed border-green-300 rounded-lg hover:bg-green-50"
                >
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
