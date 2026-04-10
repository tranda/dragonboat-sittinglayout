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
}

const ROLES = ['admin', 'coach', 'athlete'] as const;

export function UserManager({ onClose }: Props) {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Add form
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addRole, setAddRole] = useState<string>('coach');

  // Edit form
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<string>('coach');

  const load = useCallback(async () => {
    try {
      const data = await api.fetchUsers();
      setUsers(data);
    } catch (err) {
      alert('Failed to load users: ' + (err instanceof Error ? err.message : ''));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!addName.trim() || !addEmail.trim() || !addPassword.trim()) return;
    try {
      await api.createUser({ name: addName.trim(), email: addEmail.trim(), password: addPassword, role: addRole });
      setShowAdd(false);
      setAddName(''); setAddEmail(''); setAddPassword(''); setAddRole('coach');
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
  };

  const handleEdit = async () => {
    if (!editId || !editName.trim() || !editEmail.trim()) return;
    try {
      const data: Record<string, unknown> = { name: editName.trim(), email: editEmail.trim(), role: editRole };
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

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-8">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[85dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">User Management</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl px-1">&times;</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center text-gray-400 py-8">Loading...</div>
          ) : (
            <>
              {users.map(u => (
                <div key={u.id} className="border rounded-lg p-3">
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
                      <select
                        value={editRole}
                        onChange={e => setEditRole(e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border rounded-lg"
                      >
                        {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <div className="flex gap-2">
                        <button onClick={handleEdit} className="flex-1 py-1.5 text-xs bg-blue-600 text-white rounded-lg">Save</button>
                        <button onClick={() => setEditId(null)} className="px-3 py-1.5 text-xs bg-gray-100 rounded-lg">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-800">{u.name}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                        <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          u.role === 'admin' ? 'bg-red-100 text-red-700' :
                          u.role === 'coach' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{u.role}</span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEdit(u)}
                          className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
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
                  <select
                    value={addRole}
                    onChange={e => setAddRole(e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border rounded-lg"
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <div className="flex gap-2">
                    <button onClick={handleAdd} className="flex-1 py-1.5 text-xs bg-green-600 text-white rounded-lg">Add User</button>
                    <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs bg-gray-100 rounded-lg">Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAdd(true)}
                  className="w-full py-2 text-sm text-green-700 border-2 border-dashed border-green-300 rounded-lg hover:bg-green-50"
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
