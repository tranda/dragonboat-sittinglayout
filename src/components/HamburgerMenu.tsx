import { useState } from 'react';
import type { Race, GenderCategory, AgeCategory } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  showWeights: boolean;
  onToggleWeights: () => void;
  onExport: () => void;
  onResetCurrent: () => void;
  onResetAll: () => void;
  // Race management
  selectedRace: Race | undefined;
  onAddRace: (name: string, boatType: 'standard' | 'small', distance: string, genderCategory: GenderCategory, ageCategory: AgeCategory) => void;
  onRemoveRace: () => void;
  onDuplicateRace: () => void;
  onRenameRace: (name: string) => void;
  onManageAthletes: () => void;
  onImport: () => void;
  onSettings: () => void;
  onCompareCrew?: () => void;
  onReorderRaces?: () => void;
  onShowReport?: () => void;
  onShowDashboard?: () => void;
  onPdfExport?: () => void;
  onActivityLog?: () => void;
  onManageUsers?: () => void;
  onLogout?: () => void;
  userRole?: string;
}

export function HamburgerMenu({
  isOpen, onClose, showWeights, onToggleWeights,
  onExport, onResetCurrent, onResetAll,
  selectedRace, onAddRace, onRemoveRace, onDuplicateRace, onRenameRace, onManageAthletes, onImport, onSettings, onCompareCrew, onReorderRaces, onShowReport, onShowDashboard, onPdfExport, onActivityLog, onManageUsers, onLogout, userRole,
}: Props) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBoatType, setNewBoatType] = useState<'standard' | 'small'>('standard');
  const [newDistance, setNewDistance] = useState('200m');
  const [newGenderCat, setNewGenderCat] = useState<GenderCategory>('Open');
  const [newAgeCat, setNewAgeCat] = useState<AgeCategory>('Senior B');
  const [showRename, setShowRename] = useState(false);
  const [renameName, setRenameName] = useState('');

  if (!isOpen) return null;

  const newRaceName = `${newBoatType === 'standard' ? 'ST' : 'SM'} ${newAgeCat} ${newGenderCat} ${newDistance}`;

  const handleAdd = () => {
    onAddRace(newRaceName, newBoatType, newDistance, newGenderCat, newAgeCat);
    setShowAddForm(false);
    onClose();
  };

  const handleRename = () => {
    if (renameName.trim()) {
      onRenameRace(renameName.trim());
      setShowRename(false);
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 bottom-0 w-72 bg-white shadow-2xl z-50 flex flex-col animate-slide-right">
        <div className="flex items-center justify-between p-4 border-b">
          <span className="font-bold text-gray-800">Menu</span>
          <button onClick={onClose} className="text-gray-400 text-xl px-1">&times;</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {(userRole === 'admin' || userRole === 'coach') && (<>
          {/* Toggle weights */}
          <button
            onClick={() => { onToggleWeights(); }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-50 text-sm"
          >
            <span>Show Weights</span>
            <div className={`w-10 h-5 rounded-full transition-colors ${showWeights ? 'bg-blue-500' : 'bg-gray-300'}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${showWeights ? 'translate-x-5' : ''}`} />
            </div>
          </button>

          <button
            onClick={onManageAthletes}
            className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-50 text-sm font-medium"
          >
            Manage Athletes
          </button>

          {onShowReport && (
            <button
              onClick={() => { onShowReport(); onClose(); }}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-50 text-sm font-medium"
            >
              Report
            </button>
          )}

          {onShowDashboard && (
            <button
              onClick={() => { onShowDashboard(); onClose(); }}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-50 text-sm font-medium"
            >
              Crews Dashboard
            </button>
          )}

          <hr className="my-2" />

          {/* Race management */}
          <div className="text-xs font-semibold text-gray-400 uppercase px-3 pt-2">Current Race</div>
          {selectedRace && (
            <div className="text-xs text-gray-500 px-3 pb-1">{selectedRace.name}</div>
          )}

          <button
            onClick={() => { setShowRename(true); setRenameName(selectedRace?.name ?? ''); }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm"
          >
            Rename Race
          </button>

          {showRename && (
            <div className="px-3 py-2 space-y-2">
              <input
                value={renameName}
                onChange={e => setRenameName(e.target.value)}
                className="w-full px-2 py-1.5 text-sm border rounded-lg"
                autoFocus
              />
              <div className="flex gap-2">
                <button onClick={handleRename} className="flex-1 py-1 text-xs bg-blue-600 text-white rounded-lg">Save</button>
                <button onClick={() => setShowRename(false)} className="px-3 py-1 text-xs bg-gray-100 rounded-lg">Cancel</button>
              </div>
            </div>
          )}

          <button
            onClick={() => { onDuplicateRace(); onClose(); }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm"
          >
            Duplicate Race
          </button>

          {onCompareCrew && (
            <button
              onClick={() => { onCompareCrew(); onClose(); }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm"
            >
              Compare / Copy Crew
            </button>
          )}

          <button
            onClick={() => { onResetCurrent(); onClose(); }}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm"
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
            Remove Race
          </button>

          <hr className="my-2" />

          {onReorderRaces && (
            <button
              onClick={() => { onReorderRaces(); onClose(); }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm"
            >
              Reorder Races
            </button>
          )}

          {/* Add race */}
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-green-50 text-sm text-green-700 font-medium"
          >
            + Add New Race
          </button>

          {showAddForm && (
            <div className="px-3 py-2 space-y-2">
              <div className="px-2 py-1.5 text-sm bg-gray-100 rounded-lg text-gray-700 font-medium">{newRaceName}</div>
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

          <hr className="my-2" />

          {/* Global actions - admin only */}
          {userRole === 'admin' && (
            <>
              <button
                onClick={() => { onExport(); onClose(); }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 text-sm text-blue-700 font-medium"
              >
                Export to Excel
              </button>

              {onPdfExport && (
                <button
                  onClick={() => { onPdfExport(); onClose(); }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 text-sm text-blue-700 font-medium"
                >
                  Print / PDF
                </button>
              )}

              <button
                onClick={onImport}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 text-sm text-blue-700 font-medium"
              >
                Import from Excel
              </button>

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

              <hr className="my-2" />
            </>
          )}

          {userRole === 'admin' && (
            <button
              onClick={onSettings}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-600"
            >
              Settings
            </button>
          )}

          {userRole === 'admin' && onManageUsers && (
            <button
              onClick={() => { onManageUsers(); onClose(); }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-600"
            >
              Manage Users
            </button>
          )}

          {userRole === 'admin' && onActivityLog && (
            <button
              onClick={() => { onActivityLog(); onClose(); }}
              className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-600"
            >
              Activity Log
            </button>
          )}
          </>)}

          {onLogout && (
            <>
              <hr className="my-2" />
              <button
                onClick={onLogout}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-500"
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
