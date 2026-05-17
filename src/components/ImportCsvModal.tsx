import { useState, useMemo } from 'react';
import * as api from '../utils/api';
import { parseIdbfCsv, type IdbfCsvRow } from '../utils/csvImport';

interface Props {
  onClose: () => void;
  onImported: () => void;
  existingAthletes?: { id: number; name: string }[];
  activeTeamName?: string | null;
}

function clubMatchesTeam(clubName: string, teamName?: string | null): boolean {
  if (!teamName) return false;
  const a = clubName.toLowerCase().trim();
  const b = teamName.toLowerCase().trim();
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

export function ImportCsvModal({ onClose, onImported, existingAthletes = [], activeTeamName }: Props) {
  const [step, setStep] = useState<'pick' | 'select'>('pick');
  const [error, setError] = useState('');
  const [rows, setRows] = useState<IdbfCsvRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterClub, setFilterClub] = useState<string>('all');
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    setError('');
    try {
      const parsed = await parseIdbfCsv(file);
      const athletes = parsed.filter(r => r.athlete);
      if (athletes.length === 0) {
        setError('No athletes found in CSV');
        return;
      }
      setRows(athletes);
      // Pre-select athletes from matching club
      const matchingPins = new Set(
        athletes.filter(r => clubMatchesTeam(r.club_name, activeTeamName)).map(r => r.pin)
      );
      setSelected(matchingPins.size > 0 ? matchingPins : new Set(athletes.map(r => r.pin)));
      // Auto-filter to matching club if found
      const match = athletes.find(r => clubMatchesTeam(r.club_name, activeTeamName));
      if (match) setFilterClub(match.club_name);
      setStep('select');
    } catch (e) {
      setError('Failed to parse: ' + (e instanceof Error ? e.message : ''));
    }
  };

  const clubs = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => { if (r.club_name) set.add(r.club_name); });
    return Array.from(set).sort();
  }, [rows]);

  const visible = useMemo(() => {
    if (filterClub === 'all') return rows;
    return rows.filter(r => r.club_name === filterClub);
  }, [rows, filterClub]);

  const toggle = (pin: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(pin)) next.delete(pin); else next.add(pin);
      return next;
    });
  };
  const toggleAllVisible = () => {
    const visiblePins = new Set(visible.map(r => r.pin));
    const allSelected = visible.every(r => selected.has(r.pin));
    setSelected(prev => {
      const next = new Set(prev);
      if (allSelected) visiblePins.forEach(p => next.delete(p));
      else visiblePins.forEach(p => next.add(p));
      return next;
    });
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const toImport = rows.filter(r => selected.has(r.pin));
      let created = 0, updated = 0;
      for (const r of toImport) {
        const name = `${r.first_name} ${r.family_name}`.trim();
        const yob = r.birth_date ? parseInt(r.birth_date.slice(0, 4)) : undefined;
        const gender = r.gender.toUpperCase().startsWith('F') ? 'F' : 'M';
        let preferredSide: string | null = null;
        if (r.left_side && r.right_side) preferredSide = 'both';
        else if (r.left_side) preferredSide = 'left';
        else if (r.right_side) preferredSide = 'right';

        const data = {
          name, gender, weight: 0,
          year_of_birth: yob,
          preferred_side: preferredSide,
          is_helm: r.helm,
          is_drummer: r.drummer,
          edbf_id: r.pin || null,
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

  const allVisibleSelected = visible.length > 0 && visible.every(r => selected.has(r.pin));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[var(--bg-overlay)] pt-6">
      <div className="bg-[var(--bg-surface)] rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[85dvh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Import from CSV</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-xl px-1">&times;</button>
        </div>

        {step === 'pick' ? (
          <div className="p-4 space-y-3">
            <p className="text-xs text-[var(--text-secondary)]">Upload an IDBF athletes export (.csv, tab-delimited).</p>
            <label
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragEnter={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleFile(f);
              }}
              className={`block w-full px-4 py-8 text-center border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                dragOver ? 'border-blue-500 bg-[var(--bg-male)]' : 'border-[var(--border-default)] hover:bg-[var(--bg-surface-alt)]'
              }`}
            >
              <input
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                className="hidden"
              />
              <div className="text-sm font-medium text-[var(--text-primary)] mb-1">Drop CSV file here</div>
              <div className="text-xs text-[var(--text-muted)]">or tap to browse</div>
            </label>
            {error && <div className="text-xs text-red-600">{error}</div>}
          </div>
        ) : (
          <>
            <div className="px-4 py-2 border-b flex items-center gap-2 flex-wrap">
              <select value={filterClub} onChange={e => setFilterClub(e.target.value)} className="px-2 py-1 text-xs border rounded-lg bg-[var(--bg-surface)]">
                <option value="all">All clubs ({rows.length})</option>
                {clubs.map(c => <option key={c} value={c}>{c} ({rows.filter(r => r.club_name === c).length})</option>)}
              </select>
              <button onClick={toggleAllVisible} className="px-3 py-1 text-xs font-medium text-blue-700 bg-[var(--bg-male)] border border-blue-200 rounded-lg hover:bg-[var(--bg-male-strong)]">
                {allVisibleSelected ? 'None' : 'All'}
              </button>
              <span className="text-xs text-[var(--text-muted)] ml-auto">{selected.size} selected</span>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {visible.map(r => {
                const name = `${r.first_name} ${r.family_name}`.trim();
                const yob = r.birth_date ? r.birth_date.slice(0, 4) : '';
                const roles = [r.helm && 'HM', r.drummer && 'DR', r.left_side && 'L', r.right_side && 'R'].filter(Boolean);
                const isMatch = clubMatchesTeam(r.club_name, activeTeamName);
                return (
                  <label
                    key={r.pin}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer ${
                      selected.has(r.pin) ? 'bg-[var(--bg-male)]' : 'hover:bg-[var(--bg-surface-alt)]'
                    }`}
                  >
                    <input type="checkbox" checked={selected.has(r.pin)} onChange={() => toggle(r.pin)} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--text-primary)] truncate">{name}</div>
                      <div className="text-[10px] text-[var(--text-muted)] truncate">
                        {r.gender.toUpperCase() === 'F' ? 'W' : 'M'}
                        {yob ? ` · ${yob}` : ''}
                        {r.club_name ? ` · ` : ''}
                        {r.club_name && (
                          <span className={isMatch ? 'text-blue-600 font-semibold' : ''}>{r.club_name}</span>
                        )}
                        {roles.length > 0 && ` · ${roles.join('/')}`}
                      </div>
                    </div>
                  </label>
                );
              })}
              {visible.length === 0 && (
                <div className="text-center text-[var(--text-muted)] py-8">No athletes</div>
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
