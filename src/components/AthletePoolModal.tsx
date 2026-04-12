import { useState } from 'react';
import type { Athlete } from '../types';

interface Props {
  athletes: Athlete[];
  onSelect: (athlete: Athlete) => void;
  onClose: () => void;
  title?: string;
}

export function AthletePoolModal({ athletes, onSelect, onClose, title }: Props) {
  const [genderTab, setGenderTab] = useState<'F' | 'M'>('F');
  const [search, setSearch] = useState('');

  // Sort: non-BCP first, then BCP, alphabetical within each group
  const sortAthletes = (list: Athlete[]) => list.sort((a, b) => {
    if (a.isBCP !== b.isBCP) return a.isBCP ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
  const women = sortAthletes(athletes.filter(a => a.gender === 'F'));
  const men = sortAthletes(athletes.filter(a => a.gender === 'M'));
  const list = genderTab === 'F' ? women : men;
  const filtered = search
    ? list.filter(a => a.name.toLowerCase().includes(search.toLowerCase()))
    : list;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" onClick={onClose}>
      {/* Backdrop */}
      <div className="flex-1 bg-[var(--bg-overlay)]" />

      {/* Bottom sheet */}
      <div
        className="bg-[var(--bg-surface)] rounded-t-2xl shadow-2xl max-h-[70vh] min-h-[50vh] flex flex-col animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle + title */}
        <div className="pt-2 pb-1 px-4">
          <div className="w-10 h-1 bg-[var(--border-default)] rounded-full mx-auto mb-2" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[var(--text-primary)]">{title || 'Select Athlete'}</span>
            <button onClick={onClose} className="text-[var(--text-muted)] text-lg px-2">&times;</button>
          </div>
        </div>

        {/* Gender tabs */}
        <div className="flex gap-1 px-4 pb-2">
          <button
            onClick={() => setGenderTab('F')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg ${
              genderTab === 'F' ? 'bg-[var(--bg-female-strong)] text-[var(--text-female)]' : 'bg-[var(--bg-surface-alt)] text-[var(--text-secondary)]'
            }`}
          >
            Women ({women.length})
          </button>
          <button
            onClick={() => setGenderTab('M')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg ${
              genderTab === 'M' ? 'bg-[var(--bg-male-strong)] text-blue-700' : 'bg-[var(--bg-surface-alt)] text-[var(--text-secondary)]'
            }`}
          >
            Men ({men.length})
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pb-2">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full px-3 py-1.5 text-sm border rounded-lg outline-none focus:border-[var(--border-male-strong)]"
          />
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 px-4 pb-4">
          {filtered.length === 0 ? (
            <div className="text-center text-[var(--text-muted)] text-sm py-4">No athletes available</div>
          ) : (
            <div className="grid grid-cols-1 gap-1">
              {filtered.map(a => (
                <button
                  key={a.id}
                  onClick={() => onSelect(a)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm ${
                    a.gender === 'F' ? 'bg-[var(--bg-female)] hover:bg-[var(--bg-female-strong)]' : 'bg-[var(--bg-male)] hover:bg-[var(--bg-male-strong)]'
                  }`}
                >
                  <span className="font-medium flex items-center min-w-0">
                    <span className="truncate">{a.name}</span>
                    {a.preferredSide && (
                      <span className="ml-1 px-1 py-0.5 bg-[var(--bg-badge-side)] text-[var(--text-badge-side)] rounded text-[9px] font-semibold flex-shrink-0">{a.preferredSide === 'both' ? 'L/R' : a.preferredSide === 'left' ? 'L' : 'R'}</span>
                    )}
                    {a.isBCP && (
                      <span className="ml-1 px-1 py-0.5 bg-[var(--bg-badge-bcp)] text-[var(--text-badge-bcp)] rounded text-[9px] font-semibold flex-shrink-0">BCP</span>
                    )}
                  </span>
                  <span className="text-[var(--text-muted)] text-xs flex-shrink-0 ml-2">{a.weight || '?'} kg</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
