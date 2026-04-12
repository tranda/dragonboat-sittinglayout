import { useState } from 'react';
import type { Athlete, AppConfig } from '../types';
import { getAthleteAgeCategory } from '../utils/policies';

interface Props {
  config: AppConfig;
  athletes: Athlete[];
  removedIds: Set<number>;
  onRemove: (id: number) => void;
  onRestore: (id: number) => void;
  onAdd: (name: string, weight: number, gender: 'M' | 'F', yearOfBirth?: number, isBCP?: boolean) => void;
  onEdit: (id: number, updates: Partial<Pick<Athlete, 'name' | 'weight' | 'gender' | 'yearOfBirth' | 'isBCP'>>) => void;
  onClose: () => void;
}

function GenderToggle({ value, onChange }: { value: 'F' | 'M'; onChange: (v: 'F' | 'M') => void }) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange('F')}
        className={`flex-1 py-2 text-sm font-semibold rounded-lg border-2 ${
          value === 'F' ? 'bg-pink-100 border-pink-400 text-pink-700' : 'bg-gray-50 border-gray-200 text-gray-400'
        }`}
      >
        Female
      </button>
      <button
        type="button"
        onClick={() => onChange('M')}
        className={`flex-1 py-2 text-sm font-semibold rounded-lg border-2 ${
          value === 'M' ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-400'
        }`}
      >
        Male
      </button>
    </div>
  );
}

export function AthleteManager({ config, athletes, removedIds, onRemove, onRestore, onAdd, onEdit, onClose }: Props) {
  const [tab, setTab] = useState<'active' | 'removed'>('active');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newName, setNewName] = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [newGender, setNewGender] = useState<'F' | 'M'>('F');
  const [newYearOfBirth, setNewYearOfBirth] = useState('');
  const [newIsBCP, setNewIsBCP] = useState(false);
  const [search, setSearch] = useState('');

  const active = athletes
    .filter(a => !removedIds.has(a.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  const removed = athletes
    .filter(a => removedIds.has(a.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  const list = tab === 'active' ? active : removed;
  const filtered = search
    ? list.filter(a => a.name.toLowerCase().includes(search.toLowerCase()))
    : list;

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    const yob = parseInt(newYearOfBirth) || undefined;
    onAdd(name, parseFloat(newWeight) || 0, newGender, yob, newIsBCP || undefined);
    clearForm();
  };

  const startEdit = (a: Athlete) => {
    setEditingId(a.id);
    setNewName(a.name);
    setNewWeight(a.weight ? String(a.weight) : '');
    setNewGender(a.gender);
    setNewYearOfBirth(a.yearOfBirth ? String(a.yearOfBirth) : '');
    setNewIsBCP(!!a.isBCP);
    setShowAddForm(false);
  };

  const handleSaveEdit = () => {
    if (editingId === null) return;
    const name = newName.trim();
    if (!name) return;
    onEdit(editingId, {
      name,
      weight: parseFloat(newWeight) || 0,
      gender: newGender,
      yearOfBirth: parseInt(newYearOfBirth) || undefined,
      isBCP: newIsBCP || undefined,
    });
    clearForm();
  };

  const clearForm = () => {
    setEditingId(null);
    setShowAddForm(false);
    setNewName('');
    setNewWeight('');
    setNewGender('F');
    setNewYearOfBirth('');
    setNewIsBCP(false);
  };

  const isEditing = editingId !== null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 bg-white border-b">
        <h2 className="text-base font-bold text-gray-800">Athletes</h2>
        <button onClick={onClose} className="text-gray-400 text-xl px-2">&times;</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 py-2 bg-white">
        <button
          onClick={() => setTab('active')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg ${
            tab === 'active' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
          }`}
        >
          Active ({active.length})
        </button>
        <button
          onClick={() => setTab('removed')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg ${
            tab === 'removed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
          }`}
        >
          Removed ({removed.length})
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-2 bg-white border-b">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search..."
          className="w-full px-3 py-1.5 text-sm border rounded-lg outline-none focus:border-blue-400"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {filtered.map(a => (
          <div
            key={a.id}
            className={`flex items-center justify-between px-3 py-2.5 mb-1 rounded-lg ${
              editingId === a.id ? 'ring-2 ring-blue-400' : ''
            } ${a.gender === 'F' ? 'bg-pink-50' : 'bg-blue-50'}`}
            onClick={() => tab === 'active' && startEdit(a)}
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{a.name}</div>
              <div className="text-xs text-gray-400">
                {a.weight ? `${a.weight} kg` : 'no weight'} · {a.gender === 'F' ? 'W' : 'M'}
                {a.yearOfBirth ? ` · ${a.yearOfBirth}` : ''}
                {(() => { const cat = getAthleteAgeCategory(a, config); return cat ? ` · ${cat}` : ''; })()}
                {a.isBCP ? <span className="ml-1 px-1 py-0.5 bg-purple-100 text-purple-700 rounded text-[9px] font-semibold">BCP</span> : null}
              </div>
            </div>
            {tab === 'active' ? (
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(a.id); }}
                className="text-xs text-red-500 font-medium px-2 py-1 rounded hover:bg-red-100 flex-shrink-0"
              >
                Remove
              </button>
            ) : (
              <button
                onClick={() => onRestore(a.id)}
                className="text-xs text-green-600 font-medium px-2 py-1 rounded hover:bg-green-100 flex-shrink-0"
              >
                Restore
              </button>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-8">
            {search ? 'No matches' : tab === 'removed' ? 'No removed athletes' : 'No athletes'}
          </div>
        )}
      </div>

      {/* Add / Edit form */}
      <div className="px-4 py-3 bg-white border-t">
        {showAddForm || isEditing ? (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-gray-500 uppercase">
              {isEditing ? 'Edit Athlete' : 'New Athlete'}
            </div>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Name"
              className="w-full px-3 py-1.5 text-sm border rounded-lg outline-none focus:border-blue-400"
              autoFocus
            />
            <GenderToggle value={newGender} onChange={setNewGender} />
            <div className="flex gap-2">
              <input
                value={newWeight}
                onChange={e => setNewWeight(e.target.value)}
                placeholder="Weight (kg)"
                type="number"
                className="flex-1 px-3 py-1.5 text-sm border rounded-lg outline-none focus:border-blue-400"
              />
              <input
                value={newYearOfBirth}
                onChange={e => setNewYearOfBirth(e.target.value)}
                placeholder="Year of birth"
                type="number"
                className="flex-1 px-3 py-1.5 text-sm border rounded-lg outline-none focus:border-blue-400"
              />
            </div>
            <button
              type="button"
              onClick={() => setNewIsBCP(!newIsBCP)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border-2 text-sm ${
                newIsBCP ? 'bg-purple-100 border-purple-400 text-purple-700 font-semibold' : 'bg-gray-50 border-gray-200 text-gray-400'
              }`}
            >
              <span>BCP (Breast Cancer Paddler)</span>
              <span>{newIsBCP ? 'Yes' : 'No'}</span>
            </button>
            <div className="flex gap-2">
              <button
                onClick={isEditing ? handleSaveEdit : handleAdd}
                className="flex-1 py-2 text-sm bg-green-600 text-white rounded-lg font-medium"
              >
                {isEditing ? 'Save Changes' : 'Add Athlete'}
              </button>
              <button onClick={clearForm} className="px-4 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => { clearForm(); setShowAddForm(true); }}
            className="w-full py-2 text-sm bg-green-600 text-white rounded-lg font-medium"
          >
            + Add New Athlete
          </button>
        )}
      </div>
    </div>
  );
}
