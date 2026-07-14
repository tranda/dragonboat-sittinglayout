import { useState } from 'react';
import type { Race, GenderCategory, AgeCategory, ScheduleEntry } from '../types';
import { RACE_STAGES } from '../types';
import { useTheme } from '../hooks/useTheme';

// Convert an ISO datetime to the value a <input type="datetime-local"> expects (local time).
function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function localInputToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const opts: { value: 'light' | 'dark' | 'system'; label: string }[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
  ];
  return (
    <div className="px-3 py-2">
      <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase mb-1.5">Theme</div>
      <div className="flex gap-1">
        {opts.map(o => (
          <button
            key={o.value}
            onClick={() => setTheme(o.value)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              theme === o.value
                ? 'bg-[var(--bg-active-tab)] text-[var(--text-active-tab)]'
                : 'bg-[var(--bg-surface-alt)] text-[var(--text-secondary)]'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  canEdit?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  showWeights: boolean;
  onToggleWeights: () => void;
  // Conflict detection settings (local device)
  conflictEnabled: boolean;
  onToggleConflict: () => void;
  conflictMinGap: number;
  onChangeConflictMinGap: (minutes: number) => void;
  onExport: () => void;
  onResetCurrent: () => void;
  onResetAll: () => void;
  // Race management
  selectedRace: Race | undefined;
  onAddRace: (name: string, boatType: 'standard' | 'small', distance: string, genderCategory: GenderCategory, ageCategory: AgeCategory) => void;
  onRemoveRace: () => void;
  onDuplicateRace: () => void;
  onEditRace: (fields: { name?: string; schedule?: ScheduleEntry[] }) => void;
  onManageAthletes: () => void;
  onImport?: () => void;
  onSettings: () => void;
  onCompareCrew?: () => void;
  onReorderRaces?: () => void;
  onShowReport?: () => void;
  onShowDashboard?: () => void;
  onPdfExport?: () => void;
  onManageCompetitions?: () => void;
  onActivityLog?: () => void;
  onManageUsers?: () => void;
  onLogout?: () => void;
  userRole?: string;
}

export function HamburgerMenu({
  isOpen, onClose, canEdit = true, canUndo, canRedo, onUndo, onRedo, showWeights, onToggleWeights,
  conflictEnabled, onToggleConflict, conflictMinGap, onChangeConflictMinGap,
  onExport, onResetCurrent, onResetAll,
  selectedRace, onAddRace, onRemoveRace, onDuplicateRace, onEditRace, onManageAthletes, onImport: _onImport, onSettings, onCompareCrew, onReorderRaces, onShowReport, onShowDashboard, onPdfExport, onManageCompetitions, onActivityLog, onManageUsers, onLogout, userRole,
}: Props) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBoatType, setNewBoatType] = useState<'standard' | 'small'>('standard');
  const [newDistance, setNewDistance] = useState('200m');
  const [newGenderCat, setNewGenderCat] = useState<GenderCategory>('Open');
  const [newAgeCat, setNewAgeCat] = useState<AgeCategory>('Senior B');
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  // Each row edits with a datetime-local string; converted to/from ISO on open/save.
  const [editSchedule, setEditSchedule] = useState<{ stage: string; time: string }[]>([]);

  if (!isOpen) return null;

  const newRaceName = `${newBoatType === 'standard' ? 'ST' : 'SM'} ${newAgeCat} ${newGenderCat} ${newDistance}`;

  const handleAdd = () => {
    onAddRace(newRaceName, newBoatType, newDistance, newGenderCat, newAgeCat);
    setShowAddForm(false);
    onClose();
  };

  const openEdit = () => {
    setEditName(selectedRace?.name ?? '');
    setEditSchedule((selectedRace?.schedule ?? []).map(e => ({ stage: e.stage, time: isoToLocalInput(e.time) })));
    setShowEdit(true);
  };

  const addScheduleRow = () => setEditSchedule(rows => [...rows, { stage: '', time: '' }]);
  const updateScheduleRow = (i: number, patch: Partial<{ stage: string; time: string }>) =>
    setEditSchedule(rows => rows.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  const removeScheduleRow = (i: number) => setEditSchedule(rows => rows.filter((_, idx) => idx !== i));

  const handleEdit = () => {
    if (!editName.trim()) return;
    // Keep only rows with a valid time; store time as ISO.
    const schedule: ScheduleEntry[] = editSchedule
      .map(r => ({ stage: r.stage, iso: localInputToIso(r.time) }))
      .filter((r): r is { stage: string; iso: string } => r.iso !== null)
      .map(r => ({ stage: r.stage, time: r.iso }));
    onEditRace({ name: editName.trim(), schedule });
    setShowEdit(false);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-[var(--bg-overlay)] z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 bottom-0 w-72 bg-[var(--bg-surface)] shadow-2xl z-50 flex flex-col animate-slide-right">
        <div className="flex items-center justify-between p-4 border-b">
          <span className="font-bold text-[var(--text-primary)]">Menu</span>
          <button onClick={onClose} className="text-[var(--text-muted)] text-xl px-1">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {(userRole === 'admin' || userRole === 'coach') && (<>
          {/* Undo / Redo */}
          {(onUndo || onRedo) && (
            <>
              <div className="flex gap-2">
                <button
                  onClick={onUndo}
                  disabled={!canUndo}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium ${canUndo ? 'bg-[var(--bg-male)] text-[var(--text-male)] hover:bg-[var(--bg-male-strong)]' : 'bg-[var(--bg-surface-alt)] text-[var(--text-muted)] cursor-not-allowed'}`}
                >
                  <span>↶</span><span>Undo</span>
                </button>
                <button
                  onClick={onRedo}
                  disabled={!canRedo}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium ${canRedo ? 'bg-[var(--bg-male)] text-[var(--text-male)] hover:bg-[var(--bg-male-strong)]' : 'bg-[var(--bg-surface-alt)] text-[var(--text-muted)] cursor-not-allowed'}`}
                >
                  <span>↷</span><span>Redo</span>
                </button>
              </div>
              <hr className="my-2" />
            </>
          )}
          {/* Toggle weights */}
          <button
            onClick={() => { onToggleWeights(); }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-[var(--bg-surface-alt)] text-sm"
          >
            <span>Show Weights</span>
            <div className={`w-10 h-5 rounded-full transition-colors ${showWeights ? 'bg-[var(--bg-male)]0' : 'bg-[var(--border-default)]'}`}>
              <div className={`w-5 h-5 bg-[var(--bg-surface)] rounded-full shadow transition-transform ${showWeights ? 'translate-x-5' : ''}`} />
            </div>
          </button>

          {/* Conflict detection */}
          <button
            onClick={onToggleConflict}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-[var(--bg-surface-alt)] text-sm"
          >
            <span>Race Conflicts</span>
            <div className={`w-10 h-5 rounded-full transition-colors ${conflictEnabled ? 'bg-[var(--bg-male)]0' : 'bg-[var(--border-default)]'}`}>
              <div className={`w-5 h-5 bg-[var(--bg-surface)] rounded-full shadow transition-transform ${conflictEnabled ? 'translate-x-5' : ''}`} />
            </div>
          </button>
          {conflictEnabled && (
            <div className="flex items-center justify-between px-3 py-1.5 text-sm">
              <span className="text-[var(--text-secondary)]">Min gap (min)</span>
              <input
                type="number"
                min={1}
                value={conflictMinGap}
                onChange={e => { const v = parseInt(e.target.value, 10); if (Number.isFinite(v) && v > 0) onChangeConflictMinGap(v); }}
                className="w-16 px-2 py-1 text-sm border rounded-lg text-right"
              />
            </div>
          )}

          <button
            onClick={onManageAthletes}
            className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-[var(--bg-surface-alt)] text-sm font-medium"
          >
            Manage Athletes
          </button>

          {onPdfExport && (
            <button
              onClick={() => { onPdfExport(); onClose(); }}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-[var(--bg-surface-alt)] text-sm font-medium"
            >
              Print / PDF
            </button>
          )}

          {onShowDashboard && (
            <button
              onClick={() => { onShowDashboard(); onClose(); }}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-[var(--bg-surface-alt)] text-sm font-medium"
            >
              Crews Dashboard
            </button>
          )}

          <hr className="my-2" />

          {/* Race management */}
          <div className="text-xs font-semibold text-[var(--text-muted)] uppercase px-3 pt-2">Current Crew</div>
          {selectedRace && (
            <div className="text-xs text-[var(--text-secondary)] px-3 pb-1">
              {selectedRace.name}
              {(selectedRace.schedule?.length ?? 0) > 0 && (
                <span className="text-[var(--text-muted)]"> · {selectedRace.schedule!.length} scheduled</span>
              )}
            </div>
          )}

          {!canEdit && (
            <div className="mx-3 my-1 flex items-center gap-1.5 rounded-md bg-amber-100 border border-amber-300 px-2.5 py-1.5 text-xs font-semibold text-amber-800">
              <span>🔒</span><span>Competition locked — view only</span>
            </div>
          )}

          {canEdit && <>
          <button
            onClick={openEdit}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--bg-surface-alt)] text-sm"
          >
            Edit Crew
          </button>

          {showEdit && (
            <div className="px-3 py-2 space-y-2">
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                placeholder="Crew name"
                className="w-full px-2 py-1.5 text-sm border rounded-lg"
                autoFocus
              />

              <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase pt-1">Race times</div>
              {editSchedule.length === 0 && (
                <div className="text-xs text-[var(--text-muted)] italic">No race times yet.</div>
              )}
              {editSchedule.map((row, i) => (
                <div key={i} className="space-y-1 border rounded-lg p-2">
                  <div className="flex gap-1">
                    <select
                      value={row.stage}
                      onChange={e => updateScheduleRow(i, { stage: e.target.value })}
                      className="flex-1 px-2 py-1.5 text-sm border rounded-lg"
                    >
                      <option value="">No stage</option>
                      {RACE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <button
                      onClick={() => removeScheduleRow(i)}
                      className="px-2 text-red-600 text-sm"
                      title="Remove time"
                    >
                      ✕
                    </button>
                  </div>
                  <input
                    type="datetime-local"
                    value={row.time}
                    onChange={e => updateScheduleRow(i, { time: e.target.value })}
                    className="w-full px-2 py-1.5 text-sm border rounded-lg"
                  />
                </div>
              ))}
              <button
                onClick={addScheduleRow}
                className="w-full py-1 text-xs bg-[var(--bg-surface-alt)] rounded-lg text-[var(--text-secondary)]"
              >
                + Add race time
              </button>

              <div className="flex gap-2 pt-1">
                <button onClick={handleEdit} className="flex-1 py-1 text-xs bg-blue-600 text-white rounded-lg">Save</button>
                <button onClick={() => setShowEdit(false)} className="px-3 py-1 text-xs bg-[var(--bg-surface-alt)] rounded-lg">Cancel</button>
              </div>
            </div>
          )}

          <button
            onClick={() => { onDuplicateRace(); onClose(); }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--bg-surface-alt)] text-sm"
          >
            Duplicate Crew
          </button>

          {onCompareCrew && (
            <button
              onClick={() => { onCompareCrew(); onClose(); }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--bg-surface-alt)] text-sm"
            >
              Compare / Copy Crew
            </button>
          )}

          <button
            onClick={() => { onResetCurrent(); onClose(); }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--bg-surface-alt)] text-sm"
          >
            Reset Layout
          </button>

          <button
            onClick={() => {
              if (confirm(`Remove "${selectedRace?.name}"?`)) {
                onRemoveRace();
                onClose();
              }
            }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-50 text-sm text-red-600"
          >
            Remove Crew
          </button>

          <hr className="my-2" />

          {onReorderRaces && (
            <button
              onClick={() => { onReorderRaces(); onClose(); }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--bg-surface-alt)] text-sm"
            >
              Reorder Crews
            </button>
          )}

          {/* Add race */}
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-green-50 text-sm text-[var(--text-badge-side)] font-medium"
          >
            + Add New Crew
          </button>

          {showAddForm && (
            <div className="px-3 py-2 space-y-2">
              <div className="px-2 py-1.5 text-sm bg-[var(--bg-surface-alt)] rounded-lg text-[var(--text-primary)] font-medium">{newRaceName}</div>
              <div className="flex gap-2">
                <select value={newBoatType} onChange={e => setNewBoatType(e.target.value as 'standard' | 'small')} className="flex-1 px-2 py-1.5 text-sm border rounded-lg">
                  <option value="standard">Standard (20)</option>
                  <option value="small">Small (10)</option>
                </select>
                <select value={newDistance} onChange={e => setNewDistance(e.target.value)} className="flex-1 px-2 py-1.5 text-sm border rounded-lg">
                  <option value="200m">200m</option>
                  <option value="500m">500m</option>
                  <option value="1000m">1000m</option>
                  <option value="2000m">2000m</option>
                </select>
              </div>
              <div className="flex gap-2">
                <select value={newGenderCat} onChange={e => setNewGenderCat(e.target.value as GenderCategory)} className="flex-1 px-2 py-1.5 text-sm border rounded-lg">
                  <option value="Open">Open</option>
                  <option value="Women">Women</option>
                  <option value="Mixed">Mixed</option>
                </select>
                <select value={newAgeCat} onChange={e => setNewAgeCat(e.target.value as AgeCategory)} className="flex-1 px-2 py-1.5 text-sm border rounded-lg">
                  <option value="18U">18U</option>
                  <option value="24U">24U</option>
                  <option value="Premier">Premier</option>
                  <option value="Senior A">Senior A</option>
                  <option value="Senior B">Senior B</option>
                  <option value="Senior C">Senior C</option>
                  <option value="Senior D">Senior D</option>
                  <option value="BCP">BCP</option>
                </select>
              </div>
              <button onClick={handleAdd} className="w-full py-1.5 text-sm bg-green-600 text-white rounded-lg">Add</button>
            </div>
          )}
          </>}

          <hr className="my-2" />

          {/* Global actions - admin only */}
          {userRole === 'admin' && (
            <>
              <button
                onClick={() => { onExport(); onClose(); }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--bg-male)] text-sm text-blue-700 font-medium"
              >
                Export to Excel
              </button>

              {canEdit && (
                <button
                  onClick={() => {
                    if (confirm('Reset ALL layouts to original?')) {
                      onResetAll();
                      onClose();
                    }
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-50 text-sm text-red-600"
                >
                  Reset All
                </button>
              )}

              <hr className="my-2" />
            </>
          )}

          {userRole === 'admin' && (
            <button
              onClick={onSettings}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--bg-surface-alt)] text-sm text-[var(--text-secondary)]"
            >
              Settings
            </button>
          )}

          {userRole === 'admin' && onManageCompetitions && (
            <button
              onClick={() => { onManageCompetitions(); onClose(); }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--bg-surface-alt)] text-sm text-[var(--text-secondary)]"
            >
              Competitions & Teams
            </button>
          )}

          {userRole === 'admin' && onManageUsers && (
            <button
              onClick={() => { onManageUsers(); onClose(); }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--bg-surface-alt)] text-sm text-[var(--text-secondary)]"
            >
              Manage Users
            </button>
          )}

          {userRole === 'admin' && onActivityLog && (
            <button
              onClick={() => { onActivityLog(); onClose(); }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--bg-surface-alt)] text-sm text-[var(--text-secondary)]"
            >
              Activity Log
            </button>
          )}
          </>)}

          {/* Report — visible to all roles */}
          {onShowReport && (
            <button
              onClick={() => { onShowReport(); onClose(); }}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-[var(--bg-surface-alt)] text-sm font-medium"
            >
              Report
            </button>
          )}

          {/* Theme toggle — visible to all roles */}
          <hr className="my-2" />
          <ThemeToggle />

          {/* About */}
          <hr className="my-2" />
          <div className="px-3 py-2 text-[10px] text-[var(--text-muted)] leading-relaxed">
            <div className="font-semibold text-[var(--text-secondary)] mb-0.5">About</div>
            <div>Dragon Boat Crews v{__APP_VERSION__}</div>
            <div>by Zoran Trandafilović</div>
          </div>

          {onLogout && (
            <>
              <hr className="my-2" />
              <button
                onClick={onLogout}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--bg-surface-alt)] text-sm text-[var(--text-secondary)]"
              >
                Log Out
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
