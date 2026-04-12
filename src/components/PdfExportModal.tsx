import { useState } from 'react';
import type { Race } from '../types';
import { getPdfToken } from '../utils/api';

interface Props {
  races: Race[];
  onClose: () => void;
}

export function PdfExportModal({ races, onClose }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(races.map(r => r.id)));
  const [generating, setGenerating] = useState(false);

  const toggleRace = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(races.map(r => r.id)));
  const selectNone = () => setSelected(new Set());

  const handleOpen = () => {
    setGenerating(true);
    const win = window.open('', '_blank');
    getPdfToken().then(token => {
      const ids = Array.from(selected).map(encodeURIComponent).join(',');
      const url = `/api/crew-sheet?ids=${ids}&token=${token}`;
      if (win) win.location.href = url;
      else window.location.href = url;
    }).catch(err => {
      if (win) win.close();
      alert('Failed: ' + (err instanceof Error ? err.message : ''));
    }).finally(() => setGenerating(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[var(--bg-overlay)] pt-6">
      <div className="bg-[var(--bg-surface)] rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[85dvh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">PDF Export</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-xl px-1">&times;</button>
        </div>

        <div className="px-4 py-2 border-b flex items-center gap-2">
          <button onClick={selectAll} className="px-3 py-1 text-xs font-medium text-blue-700 bg-[var(--bg-male)] border border-[var(--border-male)] rounded-lg hover:bg-[var(--bg-male-strong)]">All</button>
          <button onClick={selectNone} className="px-3 py-1 text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-surface-alt)] border border-[var(--border-default)] rounded-lg hover:bg-[var(--bg-surface-alt)]">None</button>
          <span className="text-xs text-[var(--text-muted)] ml-auto">{selected.size} of {races.length} selected</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {races.map(race => (
            <label
              key={race.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer ${
                selected.has(race.id) ? 'bg-[var(--bg-male)]' : 'hover:bg-[var(--bg-surface-alt)]'
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(race.id)}
                onChange={() => toggleRace(race.id)}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[var(--text-primary)] truncate">{race.name}</div>
                <div className="text-[10px] text-[var(--text-muted)]">
                  {race.boatType === 'standard' ? 'ST' : 'SM'} · {race.distance}
                </div>
              </div>
            </label>
          ))}
        </div>

        <div className="flex gap-2 p-4 border-t">
          <button
            onClick={handleOpen}
            disabled={selected.size === 0 || generating}
            className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            {generating ? 'Opening...' : `Open Crew Sheets (${selected.size})`}
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm bg-[var(--bg-surface-alt)] text-[var(--text-primary)] rounded-lg">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
