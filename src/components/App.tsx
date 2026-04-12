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
import { CrewCompareModal } from './CrewCompareModal';
import { DashboardPanel } from './DashboardPanel';
import { ActivityLogPanel } from './ActivityLogPanel';
import { PdfExportModal } from './PdfExportModal';
import { CompetitionManager } from './CompetitionManager';
import { exportToExcel } from '../utils/excelExport';
import { getPdfToken } from '../utils/api';
import { importFromExcel } from '../utils/excelImport';
import { DEFAULT_CONFIG, isEligibleForGender, isEligibleForAgeCategory } from '../utils/policies';
import * as api from '../utils/api';

export function App() {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(api.isLoggedIn());
  const [user, setUser] = useState<api.ApiUser | null>(null);

  // Team + Competition state
  const [userTeams, setUserTeams] = useState<{ id: number; name: string }[]>([]);
  const [activeTeamId, setActiveTeamId] = useState<number | null>(api.getTeamId());
  const [competitions, setCompetitions] = useState<api.ApiCompetition[]>([]);
  const [activeCompetitionId, setActiveCompetitionId] = useState<number | null>(api.getCompetitionId());

  // Data state
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [races, setRaces] = useState<Race[]>([]);
  const [layouts, setLayouts] = useState<Record<string, BoatLayoutType>>({});
  const [benchFactors, setBenchFactors] = useState<Record<string, number[]>>({ standard: [], small: [] });
  const [appConfig, setAppConfig] = useState<AppConfig>(DEFAULT_CONFIG);

  // UI state
  const [selectedRaceId, setSelectedRaceId] = useState(() => localStorage.getItem('dragonboat-race') ?? '');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showWeights, setShowWeights] = useState(false);
  const [showAthleteManager, setShowAthleteManager] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showUsers, setShowUsers] = useState(false);
  const [showReorderRaces, setShowReorderRaces] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [view, setView] = useState<'layout' | 'dashboard'>(() => (localStorage.getItem('dragonboat-view') as 'layout' | 'dashboard') ?? 'dashboard');
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [showPdfExport, setShowPdfExport] = useState(false);
  const [showCompetitions, setShowCompetitions] = useState(false);

  // Persist view state
  useEffect(() => { localStorage.setItem('dragonboat-view', view); }, [view]);
  useEffect(() => { if (selectedRaceId) localStorage.setItem('dragonboat-race', selectedRaceId); }, [selectedRaceId]);

  // Role checks
  const canEdit = user?.role === 'admin' || user?.role === 'coach';

  // Load all data from API
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.fetchInit();
      setUser(data.user);
      setUserTeams(data.teams ?? []);
      setCompetitions(data.competitions ?? []);
      if (data.activeTeamId) {
        setActiveTeamId(data.activeTeamId);
        api.setTeamId(data.activeTeamId);
      }
      if (data.activeCompetitionId) {
        setActiveCompetitionId(data.activeCompetitionId);
        api.setCompetitionId(data.activeCompetitionId);
      }

      // Map API athletes to frontend format
      const mappedAthletes: Athlete[] = data.athletes.map(a => ({
        id: a.id,
        name: a.name,
        weight: a.weight,
        gender: a.gender,
        yearOfBirth: a.yearOfBirth ?? undefined,
        isBCP: a.isBCP ?? false,
        preferredSide: a.preferredSide ?? null,
        isHelm: a.isHelm ?? false,
        isDrummer: a.isDrummer ?? false,
        edbfId: a.edbfId ?? null,
        notes: a.notes ?? null,
        isRemoved: a.isRemoved ?? false,
        isRegistered: a.isRegistered ?? false,
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

      if (mappedRaces.length > 0) {
        setSelectedRaceId(prev => prev || mappedRaces[0].id);
      }
    } catch {
      // Token expired or invalid
      api.logout();
      setLoggedIn(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loggedIn) loadData();
    else setLoading(false);
  }, [loggedIn, loadData]);

  const handleSwitchTeam = useCallback((teamId: number) => {
    api.setTeamId(teamId);
    setActiveTeamId(teamId);
    api.setCompetitionId(null);
    setActiveCompetitionId(null);
    setSelectedRaceId('');
    setView('dashboard');
    setLoading(true);
    loadData();
  }, [loadData]);

  const handleSwitchCompetition = useCallback((compId: number) => {
    api.setCompetitionId(compId);
    setActiveCompetitionId(compId);
    setSelectedRaceId('');
    setView('dashboard');
    setLoading(true);
    loadData();
  }, [loadData]);

  // Athlete helpers
  const activeAthletes = useMemo(() => athletes.filter(a => !a.isRemoved), [athletes]);
  const removedIds = useMemo(() => new Set(athletes.filter(a => a.isRemoved).map(a => a.id)), [athletes]);

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
    layout.reserves.forEach(id => id !== null && ids.add(id));
    return ids;
  }, [layout]);

  const unassignedAthletes = useMemo(() => {
    if (!selectedRace) return [];
    const eligible = activeAthletes.filter(a => {
      if (seatedIds.has(a.id)) return false;
      if (!a.isRegistered) return false;
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
    api.saveLayout(selectedRaceId, newLayout).catch(() => {
      alert('Failed to save layout. Please check your connection and try again.');
    });
  }, [selectedRaceId]);

  const handleAddRace = async (name: string, boatType: 'standard' | 'small', distance: string, genderCategory?: string, ageCategory?: string) => {
    const id = name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') + '_' + Date.now();
    const numRows = boatType === 'standard' ? 10 : 5;
    try {
      await api.createRace({ id, name, boat_type: boatType, num_rows: numRows, distance, gender_category: genderCategory || 'Open', age_category: ageCategory || 'Senior B', category: name });
      await loadData();
      setSelectedRaceId(id);
    } catch (err) { alert('Failed to add crew:' + (err instanceof Error ? err.message : '')); }
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
      setAthletes(prev => prev.map(a => a.id === id ? { ...a, isRemoved: true } : a));
    } catch (err) { alert('Failed: ' + (err instanceof Error ? err.message : '')); }
  }, []);

  const handleRestoreAthlete = useCallback(async (id: number) => {
    try {
      await api.restoreAthlete(id);
      setAthletes(prev => prev.map(a => a.id === id ? { ...a, isRemoved: false } : a));
    } catch (err) { alert('Failed: ' + (err instanceof Error ? err.message : '')); }
  }, []);

  const handleEditAthlete = useCallback(async (id: number, updates: Partial<Pick<Athlete, 'name' | 'weight' | 'gender' | 'yearOfBirth' | 'isBCP' | 'preferredSide' | 'isHelm' | 'isDrummer' | 'edbfId' | 'notes'>>) => {
    try {
      await api.updateAthlete(id, {
        name: updates.name, weight: updates.weight, gender: updates.gender,
        year_of_birth: updates.yearOfBirth, is_bcp: updates.isBCP,
        preferred_side: updates.preferredSide, is_helm: updates.isHelm,
        is_drummer: updates.isDrummer, edbf_id: updates.edbfId, notes: updates.notes,
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

  const handleCopyCrew = useCallback((fromRaceId: string) => {
    const source = layouts[fromRaceId];
    if (!source || !selectedRaceId) return;
    const copied = { ...source, left: [...source.left], right: [...source.right], reserves: [...source.reserves] };
    setLayouts(prev => ({ ...prev, [selectedRaceId]: copied }));
    api.saveLayout(selectedRaceId, copied).catch(console.error);
  }, [layouts, selectedRaceId]);

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
      <div className="h-dvh flex items-center justify-center bg-[var(--bg-app)]">
        <div className="text-[var(--text-muted)] text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-dvh flex flex-col bg-[var(--bg-app)] overflow-hidden max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 pt-2 pb-1 flex-shrink-0">
        <button
          onClick={() => setView('dashboard')}
          className={`w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 ${
            view === 'dashboard' ? 'bg-[var(--bg-male-strong)] text-blue-600' : 'hover:bg-[var(--bg-surface-alt)] text-[var(--text-secondary)]'
          }`}
          title="Crews Dashboard"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </button>
        <div className="min-w-0 flex-1 flex items-center gap-1">
          <div className="min-w-0">
            <div className="text-[10px] text-[var(--text-muted)] leading-tight truncate">
              {userTeams.length > 1 ? (
                <select
                  value={activeTeamId ?? ''}
                  onChange={e => handleSwitchTeam(Number(e.target.value))}
                  className="bg-transparent text-[10px] text-[var(--text-muted)] outline-none cursor-pointer max-w-[45%]"
                >
                  {userTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              ) : (
                <span>{userTeams[0]?.name ?? ''}</span>
              )}
              {(userTeams.length > 0 && competitions.length > 0) && ' · '}
              {competitions.length > 1 ? (
                <select
                  value={activeCompetitionId ?? ''}
                  onChange={e => handleSwitchCompetition(Number(e.target.value))}
                  className="bg-transparent text-[10px] text-[var(--text-muted)] outline-none cursor-pointer max-w-[45%]"
                >
                  {competitions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              ) : (
                <span>{competitions[0]?.name ?? ''}</span>
              )}
            </div>
            <div className="text-sm font-bold text-[var(--text-primary)] leading-tight truncate">
              {view === 'dashboard' ? 'Crews Dashboard' : (selectedRace?.name ?? 'No crew selected')}
            </div>
          </div>
          {view === 'layout' && selectedRace && layout && (
            <button
              onClick={async () => { try { const t = await getPdfToken(); window.open(`/api/crew-sheet?ids=${encodeURIComponent(selectedRace.id)}&token=${t}`, '_blank'); } catch (err) { alert('PDF failed: ' + (err instanceof Error ? err.message : String(err))); } }}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[var(--bg-surface-alt)] text-[var(--text-muted)] flex-shrink-0"
              title="Download PDF"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-[10px] text-[var(--text-muted)]">{user?.name}</span>
          <button
            onClick={() => setMenuOpen(true)}
            className="w-8 h-8 flex flex-col items-center justify-center gap-[3px] rounded-lg hover:bg-[var(--bg-surface-alt)]"
          >
            <div className="w-4 h-0.5 bg-[var(--text-secondary)] rounded" />
            <div className="w-4 h-0.5 bg-[var(--text-secondary)] rounded" />
            <div className="w-4 h-0.5 bg-[var(--text-secondary)] rounded" />
          </button>
        </div>
      </div>

      {view === 'dashboard' ? (
        <DashboardPanel
          races={races}
          layouts={layouts}
          athleteMap={athleteMap}
          onSelectRace={(id) => { setSelectedRaceId(id); setView('layout'); }}
        />
      ) : (
        <>
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
              <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-sm">Select a crew</div>
            )}
          </div>
        </>
      )}

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
        onCompareCrew={canEdit && selectedRace ? () => { setMenuOpen(false); setShowCompare(true); } : undefined}
        onReorderRaces={canEdit ? () => { setMenuOpen(false); setShowReorderRaces(true); } : undefined}
        onShowReport={canEdit ? () => { setMenuOpen(false); setShowReport(true); } : undefined}
        onShowDashboard={canEdit ? () => { setMenuOpen(false); setView('dashboard'); } : undefined}
        onPdfExport={() => { setMenuOpen(false); setShowPdfExport(true); }}
        onManageCompetitions={user?.role === 'admin' ? () => { setMenuOpen(false); setShowCompetitions(true); } : undefined}
        onActivityLog={user?.role === 'admin' ? () => { setMenuOpen(false); setShowActivityLog(true); } : undefined}
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
          onReload={loadData}
          userRole={user?.role}
          competitionId={activeCompetitionId}
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

      {/* Competitions & Teams */}
      {showCompetitions && (
        <CompetitionManager onClose={() => setShowCompetitions(false)} />
      )}

      {/* PDF export */}
      {showPdfExport && (
        <PdfExportModal
          races={races}
          onClose={() => setShowPdfExport(false)}
        />
      )}

      {/* Activity log */}
      {showActivityLog && (
        <ActivityLogPanel onClose={() => setShowActivityLog(false)} />
      )}


      {/* Crew compare */}
      {showCompare && selectedRace && layout && (
        <CrewCompareModal
          currentRace={selectedRace}
          currentLayout={layout}
          races={races}
          layouts={layouts}
          athleteMap={athleteMap}
          onCopyCrew={handleCopyCrew}
          onClose={() => setShowCompare(false)}
        />
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
