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
      <div className="flex-1 bg-black/30" />

      {/* Bottom sheet */}
      <div
        className="bg-white rounded-t-2xl shadow-2xl max-h-[70vh] min-h-[50vh] flex flex-col animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle + title */}
        <div className="pt-2 pb-1 px-4">
          <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-2" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">{title || 'Select Athlete'}</span>
            <button onClick={onClose} className="text-gray-400 text-lg px-2">&times;</button>
          </div>
        </div>

        {/* Gender tabs */}
        <div className="flex gap-1 px-4 pb-2">
          <button
            onClick={() => setGenderTab('F')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg ${
              genderTab === 'F' ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            Women ({women.length})
          </button>
          <button
            onClick={() => setGenderTab('M')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg ${
              genderTab === 'M' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
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
            className="w-full px-3 py-1.5 text-sm border rounded-lg outline-none focus:border-blue-400"
          />
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 px-4 pb-4">
          {filtered.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-4">No athletes available</div>
          ) : (
            <div className="grid grid-cols-1 gap-1">
              {filtered.map(a => (
                <button
                  key={a.id}
                  onClick={() => onSelect(a)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm ${
                    a.gender === 'F' ? 'bg-pink-50 hover:bg-pink-100' : 'bg-blue-50 hover:bg-blue-100'
                  }`}
                >
                  <span className="font-medium">{a.name}</span>
                  <span className="text-gray-400 text-xs">{a.weight || '?'} kg</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
