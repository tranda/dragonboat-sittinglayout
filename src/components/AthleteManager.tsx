import { useState } from 'react';
import type { Athlete, AppConfig } from '../types';
import { getAthleteAgeCategory } from '../utils/policies';
import { ImportEventsModal } from './ImportEventsModal';
import * as api from '../utils/api';

interface Props {
  config: AppConfig;
  athletes: Athlete[];
  removedIds: Set<number>;
  onRemove: (id: number) => void;
  onRestore: (id: number) => void;
  onAdd: (name: string, weight: number, gender: 'M' | 'F', yearOfBirth?: number, isBCP?: boolean, preferredSide?: 'left' | 'right' | 'both' | null) => void;
  onEdit: (id: number, updates: Partial<Pick<Athlete, 'name' | 'weight' | 'gender' | 'yearOfBirth' | 'isBCP' | 'preferredSide' | 'notes'>>) => void;
  onClose: () => void;
  onReload?: () => void;
  userRole?: string;
  competitionId?: number | null;
}

function GenderToggle({ value, onChange }: { value: 'F' | 'M'; onChange: (v: 'F' | 'M') => void }) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange('F')}
        className={`flex-1 py-2 text-sm font-semibold rounded-lg border-2 ${
          value === 'F' ? 'bg-[var(--bg-female-strong)] border-[var(--border-female-strong)] text-[var(--text-female)]' : 'bg-[var(--bg-surface-alt)] border-[var(--border-default)] text-[var(--text-muted)]'
        }`}
      >
        Female
      </button>
      <button
        type="button"
        onClick={() => onChange('M')}
        className={`flex-1 py-2 text-sm font-semibold rounded-lg border-2 ${
          value === 'M' ? 'bg-[var(--bg-male-strong)] border-[var(--border-male-strong)] text-blue-700' : 'bg-[var(--bg-surface-alt)] border-[var(--border-default)] text-[var(--text-muted)]'
        }`}
      >
        Male
      </button>
    </div>
  );
}

export function AthleteManager({ config, athletes, removedIds, onRemove, onRestore, onAdd, onEdit, onClose, onReload, userRole, competitionId }: Props) {
  const [tab, setTab] = useState<'active' | 'removed'>('active');
  const [showImportEvents, setShowImportEvents] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newName, setNewName] = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [newGender, setNewGender] = useState<'F' | 'M'>('F');
  const [newYearOfBirth, setNewYearOfBirth] = useState('');
  const [newIsBCP, setNewIsBCP] = useState(false);
  const [newPreferredSide, setNewPreferredSide] = useState<'left' | 'right' | 'both' | ''>('');
  const [newNotes, setNewNotes] = useState('');
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
    onAdd(name, parseFloat(newWeight) || 0, newGender, yob, newIsBCP || undefined, newPreferredSide || null);
    clearForm();
  };

  const startEdit = (a: Athlete) => {
    setEditingId(a.id);
    setNewName(a.name);
    setNewWeight(a.weight ? String(a.weight) : '');
    setNewGender(a.gender);
    setNewYearOfBirth(a.yearOfBirth ? String(a.yearOfBirth) : '');
    setNewIsBCP(!!a.isBCP);
    setNewPreferredSide(a.preferredSide || '');
    setNewNotes(a.notes || '');
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
      preferredSide: newPreferredSide || null,
      notes: newNotes.trim() || null,
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
    setNewPreferredSide('');
    setNewNotes('');
  };

  const isEditing = editingId !== null;

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg-app)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2 bg-[var(--bg-surface)] border-b">
        <h2 className="text-base font-bold text-[var(--text-primary)]">Athletes</h2>
        <button onClick={onClose} className="text-[var(--text-muted)] text-xl px-2">&times;</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 py-2 bg-[var(--bg-surface)]">
        <button
          onClick={() => setTab('active')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg ${
            tab === 'active' ? 'bg-[var(--bg-male-strong)] text-blue-700' : 'bg-[var(--bg-surface-alt)] text-[var(--text-secondary)]'
          }`}
        >
          Active ({active.length})
        </button>
        <button
          onClick={() => setTab('removed')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg ${
            tab === 'removed' ? 'bg-[var(--bg-role-admin)] text-[var(--text-role-admin)]' : 'bg-[var(--bg-surface-alt)] text-[var(--text-secondary)]'
          }`}
        >
          Removed ({removed.length})
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-2 bg-[var(--bg-surface)] border-b">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search..."
          className="w-full px-3 py-1.5 text-sm border rounded-lg outline-none focus:border-[var(--border-male-strong)]"
        />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {filtered.map(a => (
          <div
            key={a.id}
            className={`flex items-center justify-between px-3 py-2.5 mb-1 rounded-lg ${
              editingId === a.id ? 'ring-2 ring-blue-400' : ''
            } ${a.gender === 'F' ? 'bg-[var(--bg-female)]' : 'bg-[var(--bg-male)]'}`}
            onClick={() => tab === 'active' && startEdit(a)}
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{a.name}</div>
              <div className="text-xs text-[var(--text-muted)]">
                {a.weight ? `${a.weight} kg` : 'no weight'} · {a.gender === 'F' ? 'W' : 'M'}
                {a.yearOfBirth ? ` · ${a.yearOfBirth}` : ''}
                {(() => { const cat = getAthleteAgeCategory(a, config); return cat ? ` · ${cat}` : ''; })()}
                {a.preferredSide ? <span className="ml-1 px-1 py-0.5 bg-[var(--bg-badge-side)] text-[var(--text-badge-side)] rounded text-[9px] font-semibold">{a.preferredSide === 'both' ? 'L/R' : a.preferredSide === 'left' ? 'L' : 'R'}</span> : null}
                {a.isBCP ? <span className="ml-1 px-1 py-0.5 bg-[var(--bg-badge-bcp)] text-[var(--text-badge-bcp)] rounded text-[9px] font-semibold">BCP</span> : null}
              </div>
              {a.notes && <div className="text-[10px] text-orange-600 truncate">{a.notes}</div>}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {tab === 'active' && competitionId && (
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (a.isRegistered) await api.unregisterAthlete(a.id, competitionId);
                    else await api.registerAthlete(a.id, competitionId);
                    onReload?.();
                  }}
                  className={`px-2 py-1 text-[10px] font-semibold rounded-lg ${
                    a.isRegistered
                      ? 'bg-green-600 text-white'
                      : 'bg-[var(--bg-surface-alt)] text-[var(--text-muted)] border border-[var(--border-default)]'
                  }`}
                >
                  {a.isRegistered ? 'REG' : 'REG'}
                </button>
              )}
              {tab === 'active' ? (
                <button
                  onClick={(e) => { e.stopPropagation(); onRemove(a.id); }}
                  className="p-1 text-red-500 rounded hover:bg-[var(--bg-role-admin)] flex-shrink-0"
                  title="Remove"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={() => onRestore(a.id)}
                  className="text-xs text-green-600 font-medium px-2 py-1 rounded hover:bg-[var(--bg-badge-side)] flex-shrink-0"
                >
                  Restore
                </button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-[var(--text-muted)] text-sm py-8">
            {search ? 'No matches' : tab === 'removed' ? 'No removed athletes' : 'No athletes'}
          </div>
        )}
      </div>

      {/* Add / Edit form */}
      <div className="px-4 py-3 bg-[var(--bg-surface)] border-t">
        {showAddForm || isEditing ? (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase">
              {isEditing ? 'Edit Athlete' : 'New Athlete'}
            </div>
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Name"
              className="w-full px-3 py-1.5 text-sm border rounded-lg outline-none focus:border-[var(--border-male-strong)]"
              autoFocus
            />
            <GenderToggle value={newGender} onChange={setNewGender} />
            <div className="flex gap-2">
              <input
                value={newWeight}
                onChange={e => setNewWeight(e.target.value)}
                placeholder="Weight (kg)"
                type="number"
                className="flex-1 px-3 py-1.5 text-sm border rounded-lg outline-none focus:border-[var(--border-male-strong)]"
              />
              <input
                value={newYearOfBirth}
                onChange={e => setNewYearOfBirth(e.target.value)}
                placeholder="Year of birth"
                type="number"
                className="flex-1 px-3 py-1.5 text-sm border rounded-lg outline-none focus:border-[var(--border-male-strong)]"
              />
            </div>
            <textarea
              value={newNotes}
              onChange={e => setNewNotes(e.target.value)}
              placeholder="Notes (injury, strength, etc.)"
              rows={2}
              className="w-full px-3 py-1.5 text-sm border rounded-lg outline-none focus:border-[var(--border-male-strong)] resize-none"
            />
            <div className="flex gap-2">
              <select
                value={newPreferredSide}
                onChange={e => setNewPreferredSide(e.target.value as 'left' | 'right' | 'both' | '')}
                className="flex-1 px-3 py-1.5 text-sm border rounded-lg outline-none focus:border-[var(--border-male-strong)]"
              >
                <option value="">No side pref.</option>
                <option value="left">Left</option>
                <option value="right">Right</option>
                <option value="both">Both</option>
              </select>
              <button
                type="button"
                onClick={() => setNewIsBCP(!newIsBCP)}
                className={`flex-1 flex items-center justify-between px-3 py-2 rounded-lg border-2 text-sm ${
                  newIsBCP ? 'bg-[var(--bg-badge-bcp)] border-purple-400 text-[var(--text-badge-bcp)] font-semibold' : 'bg-[var(--bg-surface-alt)] border-[var(--border-default)] text-[var(--text-muted)]'
                }`}
              >
                <span>BCP</span>
                <span>{newIsBCP ? 'Yes' : 'No'}</span>
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={isEditing ? handleSaveEdit : handleAdd}
                className="flex-1 py-2 text-sm bg-green-600 text-white rounded-lg font-medium"
              >
                {isEditing ? 'Save Changes' : 'Add Athlete'}
              </button>
              <button onClick={clearForm} className="px-4 py-2 text-sm bg-[var(--bg-surface-alt)] text-[var(--text-secondary)] rounded-lg">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => { clearForm(); setShowAddForm(true); }}
              className="flex-1 py-2 text-sm bg-green-600 text-white rounded-lg font-medium"
            >
              + Add Athlete
            </button>
            {userRole === 'admin' && (
              <button
                onClick={() => setShowImportEvents(true)}
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg font-medium"
              >
                Import
              </button>
            )}
          </div>
        )}
      </div>

      {showImportEvents && (
        <ImportEventsModal
          onClose={() => setShowImportEvents(false)}
          onImported={() => { setShowImportEvents(false); onReload?.(); }}
        />
      )}
    </div>
  );
}
