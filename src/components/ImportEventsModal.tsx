import { useState } from 'react';
import * as api from '../utils/api';

interface Props {
  onClose: () => void;
  onImported: () => void;
  existingAthletes?: { id: number; name: string }[];
}

export function ImportEventsModal({ onClose, onImported, existingAthletes = [] }: Props) {
  const [step, setStep] = useState<'login' | 'select'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [athletes, setAthletes] = useState<api.EventsAthlete[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [importing, setImporting] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.fetchEventsAthletes(username, password);
      setAthletes(data);
      setSelected(new Set(data.map(a => a.id)));
      setStep('select');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setLoading(false);
    }
  };

  const toggleAll = () => {
    if (selected.size === athletes.length) setSelected(new Set());
    else setSelected(new Set(athletes.map(a => a.id)));
  };

  const toggle = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const toImport = athletes.filter(a => selected.has(a.id));
      let created = 0, updated = 0;
      for (const a of toImport) {
        const name = `${a.first_name} ${a.last_name}`.trim();
        const yob = a.birth_date ? new Date(a.birth_date).getFullYear() : undefined;
        const gender = a.gender?.toLowerCase().startsWith('f') ? 'F' : 'M';

        let preferredSide: string | null = null;
        if (a.left_side && a.right_side) preferredSide = 'both';
        else if (a.left_side) preferredSide = 'left';
        else if (a.right_side) preferredSide = 'right';

        const data = {
          name, gender, weight: 0,
          year_of_birth: yob,
          preferred_side: preferredSide,
          is_helm: a.helm || false,
          is_drummer: a.drummer || false,
          edbf_id: a.edbf_id || null,
        };

        const existing = existingAthletes.find(e => e.name.toLowerCase() === name.toLowerCase());
        if (existing) {
          await api.updateAthlete(existing.id, data);
          updated++;
        } else {
          await api.createAthlete(data);
          created++;
        }
      }
      onImported();
      onClose();
      alert(`${created} created, ${updated} updated`);
    } catch (err) {
      alert('Import failed: ' + (err instanceof Error ? err.message : ''));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[var(--bg-overlay)] pt-6">
      <div className="bg-[var(--bg-surface)] rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[85dvh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Import from Events</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-xl px-1">&times;</button>
        </div>

        {step === 'login' ? (
          <div className="p-4 space-y-3">
            <p className="text-xs text-[var(--text-secondary)]">Log in to events.motion.rs to import athletes from your club.</p>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Username"
              type="text"
              className="w-full px-3 py-2 text-sm border rounded-lg"
              autoFocus
            />
            <input
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              type="password"
              className="w-full px-3 py-2 text-sm border rounded-lg"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
            {error && <div className="text-xs text-red-600">{error}</div>}
            <button
              onClick={handleLogin}
              disabled={loading || !username || !password}
              className="w-full py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
              {loading ? 'Connecting...' : 'Connect & Fetch Athletes'}
            </button>
          </div>
        ) : (
          <>
            <div className="px-4 py-2 border-b flex items-center gap-2">
              <button onClick={toggleAll} className="px-3 py-1 text-xs font-medium text-blue-700 bg-[var(--bg-male)] border border-blue-200 rounded-lg hover:bg-[var(--bg-male-strong)]">
                {selected.size === athletes.length ? 'None' : 'All'}
              </button>
              <span className="text-xs text-[var(--text-muted)] ml-auto">{selected.size} of {athletes.length} selected</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {athletes.map(a => {
                const name = `${a.first_name} ${a.last_name}`.trim();
                const roles = [a.helm && 'HM', a.drummer && 'DR', a.left_side && 'L', a.right_side && 'R'].filter(Boolean);
                return (
                  <label
                    key={a.id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer ${
                      selected.has(a.id) ? 'bg-[var(--bg-male)]' : 'hover:bg-[var(--bg-surface-alt)]'
                    }`}
                  >
                    <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggle(a.id)} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--text-primary)] truncate">{name}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        {a.gender?.toUpperCase() === 'F' ? 'W' : 'M'}
                        {a.birth_date ? ` · ${new Date(a.birth_date).getFullYear()}` : ''}
                        {a.category ? ` · ${a.category}` : ''}
                        {a.edbf_id ? ` · EDBF: ${a.edbf_id}` : ''}
                        {roles.length > 0 && ` · ${roles.join('/')}`}
                      </div>
                    </div>
                  </label>
                );
              })}
              {athletes.length === 0 && (
                <div className="text-center text-[var(--text-muted)] py-8">No athletes found</div>
              )}
            </div>

            <div className="flex gap-2 p-4 border-t">
              <button
                onClick={handleImport}
                disabled={selected.size === 0 || importing}
                className="flex-1 py-2 text-sm bg-green-600 text-white rounded-lg disabled:opacity-50"
              >
                {importing ? 'Importing...' : `Import ${selected.size} Athletes`}
              </button>
              <button onClick={onClose} className="px-4 py-2 text-sm bg-[var(--bg-surface-alt)] text-[var(--text-secondary)] rounded-lg">
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
