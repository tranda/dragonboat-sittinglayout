import { useState, useEffect, useCallback } from 'react';
import * as api from '../utils/api';

interface Props {
  onClose: () => void;
}

export function CompetitionManager({ onClose }: Props) {
  const [competitions, setCompetitions] = useState<api.ApiCompetitionFull[]>([]);
  const [teams, setTeams] = useState<api.ApiTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'competitions' | 'teams'>('competitions');

  // Competition form
  const [showAddComp, setShowAddComp] = useState(false);
  const [editCompId, setEditCompId] = useState<number | null>(null);
  const [compName, setCompName] = useState('');
  const [compYear, setCompYear] = useState(String(new Date().getFullYear()));
  const [compLocation, setCompLocation] = useState('');

  // Team form
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [editTeamId, setEditTeamId] = useState<number | null>(null);
  const [teamName, setTeamName] = useState('');
  const [teamCountry, setTeamCountry] = useState('');
  const [teamType, setTeamType] = useState<string>('club');

  const load = useCallback(async () => {
    try {
      const [c, t] = await Promise.all([api.fetchCompetitions(), api.fetchTeams()]);
      setCompetitions(c);
      setTeams(t);
    } catch (err) {
      alert('Failed to load: ' + (err instanceof Error ? err.message : ''));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Competition handlers
  const clearCompForm = () => { setShowAddComp(false); setEditCompId(null); setCompName(''); setCompYear(String(new Date().getFullYear())); setCompLocation(''); };

  const handleSaveComp = async () => {
    if (!compName.trim()) return;
    try {
      if (editCompId) {
        await api.updateCompetition(editCompId, { name: compName.trim(), year: parseInt(compYear), location: compLocation.trim() || null });
      } else {
        await api.createCompetition({ name: compName.trim(), year: parseInt(compYear), location: compLocation.trim() || null, is_active: true });
      }
      clearCompForm();
      await load();
    } catch (err) { alert('Failed: ' + (err instanceof Error ? err.message : '')); }
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      await api.updateCompetition(id, { is_active: !isActive });
      await load();
    } catch (err) { alert('Failed: ' + (err instanceof Error ? err.message : '')); }
  };

  const handleDeleteComp = async (id: number, name: string) => {
    if (!confirm(`Delete competition "${name}"?`)) return;
    try { await api.deleteCompetition(id); await load(); }
    catch (err) { alert('Failed: ' + (err instanceof Error ? err.message : '')); }
  };

  const handleAddTeamToComp = async (compId: number, teamId: number) => {
    try { await api.addTeamToCompetition(compId, teamId); await load(); }
    catch (err) { alert('Failed: ' + (err instanceof Error ? err.message : '')); }
  };

  const handleRemoveTeamFromComp = async (compId: number, teamId: number) => {
    try { await api.removeTeamFromCompetition(compId, teamId); await load(); }
    catch (err) { alert('Failed: ' + (err instanceof Error ? err.message : '')); }
  };

  // Team handlers
  const clearTeamForm = () => { setShowAddTeam(false); setEditTeamId(null); setTeamName(''); setTeamCountry(''); setTeamType('club'); };

  const handleSaveTeam = async () => {
    if (!teamName.trim()) return;
    try {
      if (editTeamId) {
        await api.updateTeam(editTeamId, { name: teamName.trim(), country: teamCountry.trim() || null, type: teamType });
      } else {
        await api.createTeam({ name: teamName.trim(), country: teamCountry.trim() || null, type: teamType });
      }
      clearTeamForm();
      await load();
    } catch (err) { alert('Failed: ' + (err instanceof Error ? err.message : '')); }
  };

  const handleDeleteTeam = async (id: number, name: string) => {
    if (!confirm(`Delete team "${name}"?`)) return;
    try { await api.deleteTeam(id); await load(); }
    catch (err) { alert('Failed: ' + (err instanceof Error ? err.message : '')); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-6">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90dvh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">Competitions & Teams</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl px-1">&times;</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button onClick={() => setTab('competitions')} className={`flex-1 py-2 text-sm font-semibold ${tab === 'competitions' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}>
            Competitions
          </button>
          <button onClick={() => setTab('teams')} className={`flex-1 py-2 text-sm font-semibold ${tab === 'teams' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}>
            Teams
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center text-gray-400 py-8">Loading...</div>
          ) : tab === 'competitions' ? (
            <>
              {competitions.map(c => (
                <div key={c.id} className={`border rounded-lg p-3 ${!c.is_active ? 'opacity-50' : ''}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <div className="text-sm font-semibold text-gray-800">{c.name}</div>
                      <div className="text-xs text-gray-400">{c.year}{c.location ? ` · ${c.location}` : ''}</div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleToggleActive(c.id, c.is_active)}
                        className={`px-2 py-1 text-xs rounded ${c.is_active ? 'text-yellow-600 hover:bg-yellow-50' : 'text-green-600 hover:bg-green-50'}`}>
                        {c.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => { setEditCompId(c.id); setCompName(c.name); setCompYear(String(c.year)); setCompLocation(c.location ?? ''); setShowAddComp(true); }}
                        className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded">Edit</button>
                      <button onClick={() => handleDeleteComp(c.id, c.name)}
                        className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded">Delete</button>
                    </div>
                  </div>
                  {/* Teams in this competition */}
                  <div className="mt-2">
                    <div className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Teams</div>
                    <div className="flex flex-wrap gap-1">
                      {(c.teams ?? []).map(t => (
                        <span key={t.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-medium">
                          {t.name}
                          <button onClick={() => handleRemoveTeamFromComp(c.id, t.id)} className="text-blue-400 hover:text-red-500">&times;</button>
                        </span>
                      ))}
                      {/* Add team dropdown */}
                      <select
                        value=""
                        onChange={e => { if (e.target.value) handleAddTeamToComp(c.id, Number(e.target.value)); }}
                        className="px-1.5 py-0.5 text-[10px] border rounded-full bg-white text-gray-500"
                      >
                        <option value="">+ Add team</option>
                        {teams.filter(t => !(c.teams ?? []).find(ct => ct.id === t.id)).map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}

              {showAddComp ? (
                <div className="border-2 border-dashed border-green-300 rounded-lg p-3 space-y-2">
                  <input value={compName} onChange={e => setCompName(e.target.value)} placeholder="Competition name" className="w-full px-2 py-1.5 text-sm border rounded-lg" autoFocus />
                  <div className="flex gap-2">
                    <input value={compYear} onChange={e => setCompYear(e.target.value)} placeholder="Year" type="number" className="flex-1 px-2 py-1.5 text-sm border rounded-lg" />
                    <input value={compLocation} onChange={e => setCompLocation(e.target.value)} placeholder="Location" className="flex-1 px-2 py-1.5 text-sm border rounded-lg" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveComp} className="flex-1 py-1.5 text-xs bg-green-600 text-white rounded-lg">{editCompId ? 'Save' : 'Add'}</button>
                    <button onClick={clearCompForm} className="px-3 py-1.5 text-xs bg-gray-100 rounded-lg">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { clearCompForm(); setShowAddComp(true); }} className="w-full py-2 text-sm text-green-700 border-2 border-dashed border-green-300 rounded-lg hover:bg-green-50">
                  + Add Competition
                </button>
              )}
            </>
          ) : (
            <>
              {teams.map(t => (
                <div key={t.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-800">{t.name}</div>
                      <div className="text-xs text-gray-400">
                        {t.country ?? 'No country'} · {t.type}
                        {t.users_count != null && ` · ${t.users_count} users`}
                        {t.athletes_count != null && ` · ${t.athletes_count} athletes`}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditTeamId(t.id); setTeamName(t.name); setTeamCountry(t.country ?? ''); setTeamType(t.type); setShowAddTeam(true); }}
                        className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded">Edit</button>
                      <button onClick={() => handleDeleteTeam(t.id, t.name)}
                        className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded">Delete</button>
                    </div>
                  </div>
                </div>
              ))}

              {showAddTeam ? (
                <div className="border-2 border-dashed border-green-300 rounded-lg p-3 space-y-2">
                  <input value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="Team name" className="w-full px-2 py-1.5 text-sm border rounded-lg" autoFocus />
                  <div className="flex gap-2">
                    <input value={teamCountry} onChange={e => setTeamCountry(e.target.value)} placeholder="Country" className="flex-1 px-2 py-1.5 text-sm border rounded-lg" />
                    <select value={teamType} onChange={e => setTeamType(e.target.value)} className="flex-1 px-2 py-1.5 text-sm border rounded-lg">
                      <option value="club">Club</option>
                      <option value="national">National Team</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveTeam} className="flex-1 py-1.5 text-xs bg-green-600 text-white rounded-lg">{editTeamId ? 'Save' : 'Add'}</button>
                    <button onClick={clearTeamForm} className="px-3 py-1.5 text-xs bg-gray-100 rounded-lg">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { clearTeamForm(); setShowAddTeam(true); }} className="w-full py-2 text-sm text-green-700 border-2 border-dashed border-green-300 rounded-lg hover:bg-green-50">
                  + Add Team
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
