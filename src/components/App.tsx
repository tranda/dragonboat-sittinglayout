import { useState, useMemo, useCallback, useEffect } from 'react';
import type { Athlete, Race, BoatLayout as BoatLayoutType, AppConfig } from '../types';
import { RaceSelector } from './RaceSelector';
import { BoatLayout } from './BoatLayout';
import { HamburgerMenu } from './HamburgerMenu';
import { AthleteManager } from './AthleteManager';
import { ImportDialog } from './ImportDialog';
import { ConfigPanel } from './ConfigPanel';
import { LoginScreen } from './LoginScreen';
import { UserManager } from './UserManager';
import { RaceReorderModal } from './RaceReorderModal';
import { ReportPanel } from './ReportPanel';
import { exportToExcel } from '../utils/excelExport';
import { importFromExcel } from '../utils/excelImport';
import { DEFAULT_CONFIG, isEligibleForGender, isEligibleForAgeCategory } from '../utils/policies';
import * as api from '../utils/api';

export function App() {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(api.isLoggedIn());
  const [user, setUser] = useState<api.ApiUser | null>(null);

  // Data state
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [races, setRaces] = useState<Race[]>([]);
  const [layouts, setLayouts] = useState<Record<string, BoatLayoutType>>({});
  const [benchFactors, setBenchFactors] = useState<Record<string, number[]>>({ standard: [], small: [] });
  const [appConfig, setAppConfig] = useState<AppConfig>(DEFAULT_CONFIG);

  // UI state
  const [selectedRaceId, setSelectedRaceId] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showWeights, setShowWeights] = useState(false);
  const [showAthleteManager, setShowAthleteManager] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [showReorderRaces, setShowReorderRaces] = useState(false);
  const [showReport, setShowReport] = useState(false);

  // Role checks
  const canEdit = user?.role === 'admin' || user?.role === 'coach';

  // Load all data from API
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.fetchInit();
      setUser(data.user);

      // Map API athletes to frontend format
      const mappedAthletes: Athlete[] = data.athletes.map(a => ({
        id: a.id,
        name: a.name,
        weight: a.weight,
        gender: a.gender,
        yearOfBirth: a.yearOfBirth ?? undefined,
        isBCP: a.isBCP ?? false,
        preferredSide: a.preferredSide ?? null,
        isRemoved: a.isRemoved ?? false,
        raceAssignments: a.raceAssignments || [],
      })) as Athlete[];
      setAthletes(mappedAthletes);

      const mappedRaces: Race[] = data.races.map(r => ({
        id: r.id,
        name: r.name,
        boatType: r.boatType as 'standard' | 'small',
        numRows: r.numRows,
        distance: r.distance,
        genderCategory: r.genderCategory as 'Open' | 'Women' | 'Mixed',
        ageCategory: r.ageCategory as Race['ageCategory'],
        category: r.category,
      }));
      setRaces(mappedRaces);
      setLayouts(data.layouts);
      setBenchFactors(data.benchFactors);

      if (data.config) {
        setAppConfig({
          competitionYear: data.config.competitionYear,
          ageCategoryRules: data.config.ageCategoryRules as AppConfig['ageCategoryRules'],
          genderPolicy: data.config.genderPolicy as AppConfig['genderPolicy'],
        });
      }

      if (mappedRaces.length > 0 && !selectedRaceId) {
        setSelectedRaceId(mappedRaces[0].id);
      }
    } catch {
      // Token expired or invalid
      api.logout();
      setLoggedIn(false);
    } finally {
      setLoading(false);
    }
  }, [selectedRaceId]);

  useEffect(() => {
    if (loggedIn) loadData();
    else setLoading(false);
  }, [loggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  // Athlete helpers
  const activeAthletes = useMemo(() => athletes.filter(a => !(a as unknown as Record<string, boolean>).isRemoved), [athletes]);
  const removedIds = useMemo(() => new Set(athletes.filter(a => (a as unknown as Record<string, boolean>).isRemoved).map(a => a.id)), [athletes]);

  const athleteMap = useMemo(() => {
    const map = new Map<number, Athlete>();
    athletes.forEach(a => map.set(a.id, a));
    return map;
  }, [athletes]);

  const selectedRace = races.find(r => r.id === selectedRaceId);
  const layout = layouts[selectedRaceId];
  const currentBenchFactors = selectedRace ? (benchFactors[selectedRace.boatType] || []) : [];

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
    const eligible = activeAthletes.filter(a => {
      if (seatedIds.has(a.id)) return false;
      if (!isEligibleForGender(a, selectedRace)) return false;
      if (!isEligibleForAgeCategory(a, selectedRace.ageCategory, appConfig)) return false;
      return true;
    });
    if (selectedRace.ageCategory !== 'BCP') {
      eligible.sort((a, b) => (a.isBCP ? 1 : 0) - (b.isBCP ? 1 : 0));
    }
    return eligible;
  }, [activeAthletes, selectedRace, seatedIds, appConfig]);

  // --- Handlers ---

  const handleLayoutChange = useCallback((newLayout: BoatLayoutType) => {
    setLayouts(prev => ({ ...prev, [selectedRaceId]: newLayout }));
    api.saveLayout(selectedRaceId, newLayout).catch(console.error);
  }, [selectedRaceId]);

  const handleAddRace = async (name: string, boatType: 'standard' | 'small', distance: string, genderCategory?: string, ageCategory?: string) => {
    const id = name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') + '_' + Date.now();
    const numRows = boatType === 'standard' ? 10 : 5;
    try {
      await api.createRace({ id, name, boat_type: boatType, num_rows: numRows, distance, gender_category: genderCategory || 'Open', age_category: ageCategory || 'Senior B', category: name });
      await loadData();
      setSelectedRaceId(id);
    } catch (err) { alert('Failed to add race: ' + (err instanceof Error ? err.message : '')); }
  };

  const handleRemoveRace = async () => {
    try {
      await api.deleteRace(selectedRaceId);
      const next = races.find(r => r.id !== selectedRaceId);
      await loadData();
      if (next) setSelectedRaceId(next.id);
    } catch (err) { alert('Failed: ' + (err instanceof Error ? err.message : '')); }
  };

  const handleDuplicate = async () => {
    try {
      await api.duplicateRace(selectedRaceId);
      await loadData();
    } catch (err) { alert('Failed: ' + (err instanceof Error ? err.message : '')); }
  };

  const handleRenameRace = async (name: string) => {
    try {
      await api.updateRace(selectedRaceId, { name });
      await loadData();
    } catch (err) { alert('Failed: ' + (err instanceof Error ? err.message : '')); }
  };

  const handleRemoveAthlete = useCallback(async (id: number) => {
    try {
      await api.removeAthlete(id);
      setAthletes(prev => prev.map(a => a.id === id ? { ...a, isRemoved: true } as unknown as Athlete : a));
    } catch (err) { alert('Failed: ' + (err instanceof Error ? err.message : '')); }
  }, []);

  const handleRestoreAthlete = useCallback(async (id: number) => {
    try {
      await api.restoreAthlete(id);
      setAthletes(prev => prev.map(a => a.id === id ? { ...a, isRemoved: false } as unknown as Athlete : a));
    } catch (err) { alert('Failed: ' + (err instanceof Error ? err.message : '')); }
  }, []);

  const handleEditAthlete = useCallback(async (id: number, updates: Partial<Pick<Athlete, 'name' | 'weight' | 'gender' | 'yearOfBirth' | 'isBCP' | 'preferredSide'>>) => {
    try {
      await api.updateAthlete(id, {
        name: updates.name, weight: updates.weight, gender: updates.gender,
        year_of_birth: updates.yearOfBirth, is_bcp: updates.isBCP,
        preferred_side: updates.preferredSide,
      });
      setAthletes(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    } catch (err) { alert('Failed: ' + (err instanceof Error ? err.message : '')); }
  }, []);

  const handleAddAthlete = useCallback(async (name: string, weight: number, gender: 'M' | 'F', yearOfBirth?: number, isBCP?: boolean, preferredSide?: 'left' | 'right' | 'both' | null) => {
    try {
      const created = await api.createAthlete({ name, weight, gender, year_of_birth: yearOfBirth, is_bcp: isBCP, preferred_side: preferredSide });
      setAthletes(prev => [...prev, { id: created.id, name, weight, gender, yearOfBirth, isBCP, preferredSide, raceAssignments: [] }]);
    } catch (err) { alert('Failed: ' + (err instanceof Error ? err.message : '')); }
  }, []);

  const handleSaveConfig = useCallback(async (config: AppConfig) => {
    setAppConfig(config);
    try {
      await api.saveConfigApi({
        competitionYear: config.competitionYear,
        genderPolicy: config.genderPolicy,
        ageCategoryRules: config.ageCategoryRules,
      });
    } catch (err) { alert('Failed: ' + (err instanceof Error ? err.message : '')); }
  }, []);

  const handleExport = () => exportToExcel(races, layouts, athleteMap);

  const handleImport = useCallback(async (file: File, mode: 'athletes' | 'full') => {
    try {
      const result = await importFromExcel(file);
      if (mode === 'athletes') {
        for (const imported of result.athletes) {
          const existing = athletes.find(a => a.name === imported.name);
          if (existing) {
            await api.updateAthlete(existing.id, {
              weight: imported.weight || existing.weight,
              gender: imported.gender,
              year_of_birth: imported.yearOfBirth,
            });
          } else {
            await api.createAthlete({
              name: imported.name, weight: imported.weight, gender: imported.gender,
              year_of_birth: imported.yearOfBirth,
            });
          }
        }
      }
      setShowImport(false);
      await loadData();
      alert(`Imported ${result.athletes.length} athletes`);
    } catch (err) { alert('Import failed: ' + (err instanceof Error ? err.message : '')); }
  }, [athletes, loadData]);

  const handleLogout = () => {
    api.logout();
    setLoggedIn(false);
    setUser(null);
  };

  // --- Render ---

  if (!loggedIn) {
    return <LoginScreen onLogin={() => setLoggedIn(true)} />;
  }

  if (loading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-slate-100">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-dvh flex flex-col bg-slate-100 overflow-hidden max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 pt-2 pb-1 flex-shrink-0">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] text-gray-400 leading-tight">Dragon Boat · Munich 2026</div>
          <div className="text-sm font-bold text-gray-800 leading-tight truncate">
            {selectedRace?.name ?? 'No race selected'}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[10px] text-gray-400">{user?.name} ({user?.role})</span>
          <button
            onClick={() => setMenuOpen(true)}
            className="w-8 h-8 flex flex-col items-center justify-center gap-[3px] rounded-lg hover:bg-gray-200"
          >
            <div className="w-4 h-0.5 bg-gray-600 rounded" />
            <div className="w-4 h-0.5 bg-gray-600 rounded" />
            <div className="w-4 h-0.5 bg-gray-600 rounded" />
          </button>
        </div>
      </div>

      {/* Race tabs */}
      <div className="px-3 pb-1 flex-shrink-0">
        <RaceSelector races={races} selectedRaceId={selectedRaceId} onSelect={setSelectedRaceId} />
      </div>

      {/* Boat layout */}
      <div className="flex-1 px-2 pb-1 min-h-0 flex flex-col">
        {selectedRace && layout ? (
          <BoatLayout
            race={selectedRace}
            layout={layout}
            athleteMap={athleteMap}
            benchFactors={currentBenchFactors}
            unassignedAthletes={unassignedAthletes}
            showWeights={showWeights}
            onLayoutChange={canEdit ? handleLayoutChange : () => {}}
            readOnly={!canEdit}
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
        onResetCurrent={() => {}}
        onResetAll={() => {}}
        selectedRace={selectedRace}
        onAddRace={canEdit ? handleAddRace : () => {}}
        onRemoveRace={canEdit ? handleRemoveRace : () => {}}
        onDuplicateRace={canEdit ? handleDuplicate : () => {}}
        onRenameRace={canEdit ? handleRenameRace : () => {}}
        onManageAthletes={() => { setMenuOpen(false); setShowAthleteManager(true); }}
        onImport={canEdit ? () => { setMenuOpen(false); setShowImport(true); } : () => {}}
        onSettings={() => { setMenuOpen(false); setShowConfig(true); }}
        onReorderRaces={canEdit ? () => { setMenuOpen(false); setShowReorderRaces(true); } : undefined}
        onShowReport={canEdit ? () => { setMenuOpen(false); setShowReport(true); } : undefined}
        onManageUsers={user?.role === 'admin' ? () => { setMenuOpen(false); setShowUsers(true); } : undefined}
        onLogout={() => { handleLogout(); setMenuOpen(false); }}
        userRole={user?.role}
      />

      {/* Athlete manager */}
      {showAthleteManager && (
        <AthleteManager
          config={appConfig}
          athletes={athletes}
          removedIds={removedIds}
          onRemove={canEdit ? handleRemoveAthlete : async () => {}}
          onRestore={canEdit ? handleRestoreAthlete : async () => {}}
          onAdd={canEdit ? handleAddAthlete : async () => {}}
          onEdit={canEdit ? handleEditAthlete : async () => {}}
          onClose={() => setShowAthleteManager(false)}
        />
      )}

      {/* Config panel */}
      {showConfig && (
        <ConfigPanel
          config={appConfig}
          onSave={canEdit ? handleSaveConfig : () => {}}
          onClose={() => setShowConfig(false)}
        />
      )}

      {/* User manager */}
      {showUsers && (
        <UserManager onClose={() => setShowUsers(false)} />
      )}

      {/* Report panel */}
      {showReport && (
        <ReportPanel
          athletes={athletes}
          races={races}
          layouts={layouts}
          config={appConfig}
          onClose={() => setShowReport(false)}
        />
      )}

      {/* Reorder races modal */}
      {showReorderRaces && (
        <RaceReorderModal
          races={races}
          onClose={() => setShowReorderRaces(false)}
          onSaved={(ids) => {
            setRaces(prev => {
              const map = new Map(prev.map(r => [r.id, r] as const));
              return ids.map(id => map.get(id)!).filter(Boolean);
            });
          }}
        />
      )}

      {/* Import dialog */}
      {showImport && canEdit && (
        <ImportDialog onImport={handleImport} onClose={() => setShowImport(false)} />
      )}
    </div>
  );
}
