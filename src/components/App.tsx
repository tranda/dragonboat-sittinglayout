import { useState, useMemo, useCallback } from 'react';
import type { AppData, Athlete } from '../types';
import { useLayoutState } from '../hooks/useLayoutState';
import { RaceSelector } from './RaceSelector';
import { BoatLayout } from './BoatLayout';
import { HamburgerMenu } from './HamburgerMenu';
import { AthleteManager } from './AthleteManager';
import { ImportDialog } from './ImportDialog';
import { ConfigPanel } from './ConfigPanel';
import { exportToExcel } from '../utils/excelExport';
import { importFromExcel } from '../utils/excelImport';
import { loadConfig, saveConfig, isEligibleForGender, isEligibleForAgeCategory } from '../utils/policies';
import type { AppConfig } from '../types';

interface Props {
  data: AppData;
}

export function App({ data }: Props) {
  const {
    races, layouts,
    updateLayout, resetLayout, resetAll,
    addRace, removeRace, duplicateRace, renameRace,
  } = useLayoutState(data);

  const [selectedRaceId, setSelectedRaceId] = useState(races[0]?.id ?? '');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showWeights, setShowWeights] = useState(false);
  const [showAthleteManager, setShowAthleteManager] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [appConfig, setAppConfig] = useState<AppConfig>(loadConfig);
  const [athleteOverrides, setAthleteOverrides] = useState<Record<number, Partial<Athlete>>>(() => {
    try {
      const saved = localStorage.getItem('dragonboat-athlete-overrides');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  // Track removed athletes
  const [removedAthleteIds, setRemovedAthleteIds] = useState<Set<number>>(() => {
    try {
      const saved = localStorage.getItem('dragonboat-removed');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  const saveRemoved = useCallback((ids: Set<number>) => {
    setRemovedAthleteIds(ids);
    localStorage.setItem('dragonboat-removed', JSON.stringify([...ids]));
  }, []);

  // Custom added athletes
  const [customAthletes, setCustomAthletes] = useState<Athlete[]>(() => {
    try {
      const saved = localStorage.getItem('dragonboat-custom-athletes');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const allAthletes = useMemo(() => {
    const merged = [...data.athletes, ...customAthletes];
    // Apply overrides
    return merged.map(a => athleteOverrides[a.id] ? { ...a, ...athleteOverrides[a.id] } : a);
  }, [data.athletes, customAthletes, athleteOverrides]);

  const athleteMap = useMemo(() => {
    const map = new Map<number, Athlete>();
    allAthletes.forEach(a => map.set(a.id, a));
    return map;
  }, [allAthletes]);

  const activeAthletes = useMemo(() => {
    return allAthletes.filter(a => !removedAthleteIds.has(a.id));
  }, [allAthletes, removedAthleteIds]);

  const selectedRace = races.find(r => r.id === selectedRaceId);
  const layout = layouts[selectedRaceId];
  const benchFactors = selectedRace ? data.benchFactors[selectedRace.boatType] : data.benchFactors.standard;

  const seatedIds = useMemo(() => {
    if (!layout) return new Set<number>();
    const ids = new Set<number>();
    layout.left.forEach(id => id !== null && ids.add(id));
    layout.right.forEach(id => id !== null && ids.add(id));
    if (layout.drummer !== null) ids.add(layout.drummer);
    if (layout.helm !== null) ids.add(layout.helm);
    layout.reserves.forEach(id => ids.add(id));
    return ids;
  }, [layout]);

  const unassignedAthletes = useMemo(() => {
    if (!selectedRace) return [];
    return activeAthletes.filter(a => {
      if (seatedIds.has(a.id)) return false;
      // Apply gender policy
      if (!isEligibleForGender(a, selectedRace)) return false;
      // Apply age policy
      if (!isEligibleForAgeCategory(a, selectedRace.ageCategory, appConfig)) return false;
      return true;
    });
  }, [activeAthletes, selectedRace, seatedIds, appConfig]);

  const handleAddRace = (name: string, boatType: 'standard' | 'small', distance: string, genderCategory?: import('../types').GenderCategory, ageCategory?: import('../types').AgeCategory) => {
    const id = addRace(name, boatType, distance, genderCategory, ageCategory);
    if (id) setSelectedRaceId(id);
  };

  const handleRemoveRace = () => {
    const nextRace = races.find(r => r.id !== selectedRaceId);
    removeRace(selectedRaceId);
    if (nextRace) setSelectedRaceId(nextRace.id);
  };

  const handleDuplicate = () => {
    if (!selectedRace) return;
    const newId = duplicateRace(selectedRaceId, selectedRace.name + ' (copy)');
    if (newId) setSelectedRaceId(newId);
  };

  const handleRemoveAthlete = useCallback((id: number) => {
    const next = new Set(removedAthleteIds);
    next.add(id);
    saveRemoved(next);
  }, [removedAthleteIds, saveRemoved]);

  const handleRestoreAthlete = useCallback((id: number) => {
    const next = new Set(removedAthleteIds);
    next.delete(id);
    saveRemoved(next);
  }, [removedAthleteIds, saveRemoved]);

  const handleEditAthlete = useCallback((id: number, updates: Partial<Pick<Athlete, 'name' | 'weight' | 'gender' | 'yearOfBirth'>>) => {
    const next = { ...athleteOverrides, [id]: { ...athleteOverrides[id], ...updates } };
    setAthleteOverrides(next);
    localStorage.setItem('dragonboat-athlete-overrides', JSON.stringify(next));
    // Also update custom athletes if it's a custom one
    const customIdx = customAthletes.findIndex(a => a.id === id);
    if (customIdx >= 0) {
      const updated = [...customAthletes];
      updated[customIdx] = { ...updated[customIdx], ...updates };
      setCustomAthletes(updated);
      localStorage.setItem('dragonboat-custom-athletes', JSON.stringify(updated));
    }
  }, [athleteOverrides, customAthletes]);

  const handleAddAthlete = useCallback((name: string, weight: number, gender: 'M' | 'F', yearOfBirth?: number) => {
    const maxId = allAthletes.reduce((max, a) => Math.max(max, a.id), 0);
    const newAthlete: Athlete = { id: maxId + 1, name, weight, gender, yearOfBirth, raceAssignments: [] };
    const updated = [...customAthletes, newAthlete];
    setCustomAthletes(updated);
    localStorage.setItem('dragonboat-custom-athletes', JSON.stringify(updated));
  }, [allAthletes, customAthletes]);

  const handleExport = () => exportToExcel(races, layouts, athleteMap);

  const handleImport = useCallback(async (file: File, mode: 'athletes' | 'full') => {
    try {
      const result = await importFromExcel(file);

      if (mode === 'athletes') {
        // Only update athlete data — match by name, update existing, add new
        const overrides = { ...athleteOverrides };
        const newCustom = [...customAthletes];

        for (const imported of result.athletes) {
          // Find existing athlete by name
          const existing = allAthletes.find(a => a.name === imported.name);
          if (existing) {
            // Update via overrides
            overrides[existing.id] = {
              ...overrides[existing.id],
              weight: imported.weight || existing.weight,
              gender: imported.gender,
              yearOfBirth: imported.yearOfBirth,
            };
          } else {
            // Add as new custom athlete
            const maxId = [...allAthletes, ...newCustom].reduce((max, a) => Math.max(max, a.id), 0);
            newCustom.push({ ...imported, id: maxId + 1 });
          }
        }

        setAthleteOverrides(overrides);
        localStorage.setItem('dragonboat-athlete-overrides', JSON.stringify(overrides));
        setCustomAthletes(newCustom);
        localStorage.setItem('dragonboat-custom-athletes', JSON.stringify(newCustom));
      } else {
        // Full import — replace everything
        localStorage.removeItem('dragonboat-layouts');
        localStorage.removeItem('dragonboat-races');
        localStorage.removeItem('dragonboat-removed');
        localStorage.removeItem('dragonboat-athlete-overrides');
        localStorage.removeItem('dragonboat-custom-athletes');
        // Reload with new data would be complex, so we store and reload
        localStorage.setItem('dragonboat-imported', JSON.stringify(result));
        window.location.reload();
      }

      setShowImport(false);
      alert(`Imported ${result.athletes.length} athletes` + (mode === 'full' ? ` and ${result.races.length} races` : ''));
    } catch (err) {
      alert('Import failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }, [allAthletes, athleteOverrides, customAthletes]);

  return (
    <div className="h-dvh flex flex-col bg-slate-100 overflow-hidden max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-2 pb-1 flex-shrink-0">
        <h1 className="text-sm font-bold text-gray-800 leading-tight">
          Dragon Boat <span className="text-gray-400 font-normal text-xs">Munich 2026</span>
        </h1>
        <button
          onClick={() => setMenuOpen(true)}
          className="w-8 h-8 flex flex-col items-center justify-center gap-[3px] rounded-lg hover:bg-gray-200"
        >
          <div className="w-4 h-0.5 bg-gray-600 rounded" />
          <div className="w-4 h-0.5 bg-gray-600 rounded" />
          <div className="w-4 h-0.5 bg-gray-600 rounded" />
        </button>
      </div>

      {/* Race tabs */}
      <div className="px-3 pb-1 flex-shrink-0">
        <RaceSelector races={races} selectedRaceId={selectedRaceId} onSelect={setSelectedRaceId} />
      </div>

      {/* Boat layout — fills remaining space */}
      <div className="flex-1 px-2 pb-1 min-h-0 flex flex-col">
        {selectedRace && layout ? (
          <BoatLayout
            race={selectedRace}
            layout={layout}
            athleteMap={athleteMap}
            benchFactors={benchFactors}
            unassignedAthletes={unassignedAthletes}
            showWeights={showWeights}
            onLayoutChange={(l) => updateLayout(selectedRaceId, l)}
            onRemoveAthlete={handleRemoveAthlete}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Select a race</div>
        )}
      </div>

      {/* Hamburger menu */}
      <HamburgerMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        showWeights={showWeights}
        onToggleWeights={() => setShowWeights(!showWeights)}
        onExport={handleExport}
        onResetCurrent={() => resetLayout(selectedRaceId)}
        onResetAll={resetAll}
        selectedRace={selectedRace}
        onAddRace={handleAddRace}
        onRemoveRace={handleRemoveRace}
        onDuplicateRace={handleDuplicate}
        onRenameRace={(name) => renameRace(selectedRaceId, name)}
        onManageAthletes={() => { setMenuOpen(false); setShowAthleteManager(true); }}
        onImport={() => { setMenuOpen(false); setShowImport(true); }}
        onSettings={() => { setMenuOpen(false); setShowConfig(true); }}
      />

      {/* Athlete manager screen */}
      {showAthleteManager && (
        <AthleteManager
          athletes={allAthletes}
          removedIds={removedAthleteIds}
          onRemove={handleRemoveAthlete}
          onRestore={handleRestoreAthlete}
          onAdd={handleAddAthlete}
          onEdit={handleEditAthlete}
          onClose={() => setShowAthleteManager(false)}
        />
      )}

      {/* Config panel */}
      {showConfig && (
        <ConfigPanel
          config={appConfig}
          onSave={(c) => { setAppConfig(c); saveConfig(c); }}
          onClose={() => setShowConfig(false)}
        />
      )}

      {/* Import dialog */}
      {showImport && (
        <ImportDialog
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
