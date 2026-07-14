import { useState, useMemo } from 'react';
import type { Athlete, Race, BoatLayout, GenderCategory, AppConfig, Medal } from '../types';
import { MEDAL_EMOJI } from '../types';
import { getAthleteAgeCategory } from '../utils/policies';

interface MedalCounts { gold: number; silver: number; bronze: number; }

interface Props {
  athletes: Athlete[];
  races: Race[];
  layouts: Record<string, BoatLayout>;
  config: AppConfig;
  onClose: () => void;
  onSelectRace?: (raceId: string) => void;
}

type BoatFilter = 'all' | 'standard' | 'small';
type GenderFilter = 'all' | GenderCategory;

interface RoleCounts {
  paddle: number;
  helm: number;
  drummer: number;
  reserve: number;
}

export function ReportPanel({ athletes, races, layouts, config, onClose, onSelectRace }: Props) {
  const [boatFilter, setBoatFilter] = useState<BoatFilter>('all');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [ageFilter, setAgeFilter] = useState<string>('all');
  const [distanceFilter, setDistanceFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [nameQuery, setNameQuery] = useState('');

  // Unique values derived from actual races (so filters match what's in the data)
  const distances = useMemo(() => {
    const set = new Set<string>();
    races.forEach(r => { if (r.distance) set.add(r.distance); });
    return Array.from(set).sort();
  }, [races]);

  const ageCategories = useMemo(() => {
    const set = new Set<string>();
    races.forEach(r => { if (r.ageCategory) set.add(r.ageCategory); });
    return Array.from(set).sort();
  }, [races]);

  // Filtered races
  const filteredRaces = useMemo(() => {
    return races.filter(r => {
      if (boatFilter !== 'all' && r.boatType !== boatFilter) return false;
      if (genderFilter !== 'all' && r.genderCategory !== genderFilter) return false;
      if (ageFilter !== 'all' && r.ageCategory !== ageFilter) return false;
      if (distanceFilter !== 'all' && r.distance !== distanceFilter) return false;
      return true;
    });
  }, [races, boatFilter, genderFilter, ageFilter, distanceFilter]);

  // Medal for each race id (for showing on expanded crew rows).
  const medalByRace = useMemo(() => new Map(races.map(r => [r.id, r.medal ?? null])), [races]);

  // Role counts + medal tallies per athlete + crew assignments
  const { rows, crewMap } = useMemo(() => {
    const counts = new Map<number, RoleCounts>();
    const medals = new Map<number, MedalCounts>();
    const crews = new Map<number, { raceId: string; raceName: string; role: string }[]>();
    const add = (id: number | null, role: keyof RoleCounts, raceId: string, raceName: string) => {
      if (id === null) return;
      const cur = counts.get(id) ?? { paddle: 0, helm: 0, drummer: 0, reserve: 0 };
      cur[role]++;
      counts.set(id, cur);
      const list = crews.get(id) ?? [];
      list.push({ raceId, raceName, role });
      crews.set(id, list);
    };
    const addMedal = (id: number | null, medal: Medal) => {
      if (id === null) return;
      const cur = medals.get(id) ?? { gold: 0, silver: 0, bronze: 0 };
      cur[medal]++;
      medals.set(id, cur);
    };
    for (const race of filteredRaces) {
      const layout = layouts[race.id];
      if (!layout) continue;
      layout.left.forEach(id => add(id, 'paddle', race.id, race.name));
      layout.right.forEach(id => add(id, 'paddle', race.id, race.name));
      add(layout.drummer, 'drummer', race.id, race.name);
      add(layout.helm, 'helm', race.id, race.name);
      layout.reserves.forEach(id => add(id, 'reserve', race.id, race.name));
      // Medal credit: everyone on the crew, including reserves.
      if (race.medal) {
        [...layout.left, ...layout.right, layout.drummer, layout.helm, ...layout.reserves]
          .forEach(id => addMedal(id, race.medal!));
      }
    }
    const r = athletes
      .filter(a => !a.isRemoved && a.isRegistered)
      .map(a => {
        const c = counts.get(a.id) ?? { paddle: 0, helm: 0, drummer: 0, reserve: 0 };
        const m = medals.get(a.id) ?? { gold: 0, silver: 0, bronze: 0 };
        const total = c.paddle + c.helm + c.drummer + c.reserve;
        return { athlete: a, counts: c, medals: m, total };
      })
      .sort((a, b) =>
        b.counts.paddle - a.counts.paddle ||
        b.counts.reserve - a.counts.reserve ||
        b.counts.helm - a.counts.helm ||
        b.counts.drummer - a.counts.drummer ||
        a.athlete.name.localeCompare(b.athlete.name)
      );
    return { rows: r, crewMap: crews };
  }, [athletes, filteredRaces, layouts]);

  // Diacritic-insensitive: "c" matches "č"/"ć", "s" matches "š", etc.
  // NFD strips most accents via combining marks; đ/Đ don't decompose so map them.
  const normalize = (s: string) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
  const q = normalize(nameQuery.trim());
  const visibleRows = q ? rows.filter(r => normalize(r.athlete.name).includes(q)) : rows;

  const totalAssignments = visibleRows.reduce((s, r) => s + r.total, 0);
  const activeCount = visibleRows.filter(r => r.total > 0).length;
  const totalMedals = visibleRows.reduce((s, r) => s + r.medals.gold + r.medals.silver + r.medals.bronze, 0);

  const cell = (n: number) => (
    <div className={`w-7 text-center text-xs tabular-nums ${n === 0 ? 'text-[var(--text-muted)]' : 'text-[var(--text-primary)] font-semibold'}`}>
      {n === 0 ? '—' : n}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[var(--bg-overlay)] pt-6">
      <div className="bg-[var(--bg-surface)] rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Report</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-xl px-1">&times;</button>
        </div>

        {/* Name search */}
        <div className="p-3 border-b">
          <div className="relative">
            <input
              value={nameQuery}
              onChange={e => setNameQuery(e.target.value)}
              placeholder="Search name…"
              className="w-full pl-3 pr-8 py-2 text-sm border rounded-lg bg-[var(--bg-surface)] outline-none focus:border-[var(--border-male-strong)]"
            />
            {nameQuery && (
              <button
                onClick={() => setNameQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-lg px-1"
                aria-label="Clear search"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Filters toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-surface-alt)] border-b"
          >
            <span>Filters ({filteredRaces.length} of {races.length} crews)</span>
            <span className="text-[var(--text-muted)]">{showFilters ? '▴' : '▾'}</span>
          </button>

          {showFilters && (
            <div className="p-4 border-b bg-gray-50/50">
              <div className="grid grid-cols-2 gap-2">
                <select value={boatFilter} onChange={e => setBoatFilter(e.target.value as BoatFilter)} className="px-2 py-1.5 text-xs border rounded-lg bg-[var(--bg-surface)]">
                  <option value="all">All boats</option>
                  <option value="standard">Standard (20)</option>
                  <option value="small">Small (10)</option>
                </select>
                <select value={genderFilter} onChange={e => setGenderFilter(e.target.value as GenderFilter)} className="px-2 py-1.5 text-xs border rounded-lg bg-[var(--bg-surface)]">
                  <option value="all">All genders</option>
                  <option value="Open">Open</option>
                  <option value="Women">Women</option>
                  <option value="Mixed">Mixed</option>
                </select>
                <select value={ageFilter} onChange={e => setAgeFilter(e.target.value)} className="px-2 py-1.5 text-xs border rounded-lg bg-[var(--bg-surface)]">
                  <option value="all">All ages</option>
                  {ageCategories.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <select value={distanceFilter} onChange={e => setDistanceFilter(e.target.value)} className="px-2 py-1.5 text-xs border rounded-lg bg-[var(--bg-surface)]">
                  <option value="all">All distances</option>
                  {distances.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="px-4 py-2 flex items-center gap-3 text-[11px] text-[var(--text-secondary)] border-b bg-[var(--bg-surface)]">
            <span><b className="text-[var(--text-primary)]">{activeCount}</b> athletes racing</span>
            <span><b className="text-[var(--text-primary)]">{totalAssignments}</b> total assignments</span>
            {totalMedals > 0 && <span><b className="text-[var(--text-primary)]">{totalMedals}</b> medals</span>}
          </div>

          {/* Column headers */}
          <div className="sticky top-0 flex items-center gap-1 px-4 py-1.5 bg-[var(--bg-surface-alt)] border-b text-[10px] font-semibold text-[var(--text-muted)] uppercase">
            <div className="flex-1">Athlete</div>
            <div className="w-7 text-center" title="Paddle">Pad</div>
            <div className="w-7 text-center" title="Reserve">Res</div>
            <div className="w-7 text-center" title="Helm">Helm</div>
            <div className="w-7 text-center" title="Drummer">Drm</div>
          </div>

          {/* Athlete list */}
          <div className="divide-y">
            {visibleRows.map(({ athlete, counts, medals }) => {
              const ageCat = getAthleteAgeCategory(athlete, config);
              const medalTotal = medals.gold + medals.silver + medals.bronze;
              const isExpanded = expandedId === athlete.id;
              const assignments = crewMap.get(athlete.id) ?? [];
              return (
                <div key={athlete.id}>
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : athlete.id)}
                    className={`flex items-center gap-1 px-4 py-2 cursor-pointer ${athlete.gender === 'F' ? 'bg-[var(--bg-female)]' : 'bg-[var(--bg-male)]'} ${isExpanded ? 'ring-1 ring-blue-400' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{athlete.name}</div>
                      <div className="text-xs text-[var(--text-muted)]">
                        {athlete.gender === 'F' ? 'W' : 'M'}
                        {athlete.yearOfBirth ? ` · ${athlete.yearOfBirth}` : ''}
                        {ageCat ? ` · ${ageCat}` : ''}
                        {athlete.preferredSide && <span className="ml-1 px-1 py-0.5 bg-[var(--bg-badge-side)] text-[var(--text-badge-side)] rounded text-[9px] font-semibold">{athlete.preferredSide === 'both' ? 'L/R' : athlete.preferredSide === 'left' ? 'L' : 'R'}</span>}
                        {athlete.isBCP && <span className="ml-1 px-1 py-0.5 bg-[var(--bg-badge-bcp)] text-[var(--text-badge-bcp)] rounded text-[9px] font-semibold">BCP</span>}
                      </div>
                      {medalTotal > 0 && (
                        <div className="flex gap-2 mt-0.5 text-xs tabular-nums">
                          {medals.gold > 0 && <span title="Gold">{MEDAL_EMOJI.gold} {medals.gold}</span>}
                          {medals.silver > 0 && <span title="Silver">{MEDAL_EMOJI.silver} {medals.silver}</span>}
                          {medals.bronze > 0 && <span title="Bronze">{MEDAL_EMOJI.bronze} {medals.bronze}</span>}
                        </div>
                      )}
                    </div>
                    {cell(counts.paddle)}
                    {cell(counts.reserve)}
                    {cell(counts.helm)}
                    {cell(counts.drummer)}
                  </div>
                  {isExpanded && assignments.length > 0 && (
                    <div className="px-4 py-2 bg-[var(--bg-surface)] border-t border-[var(--border-default)] space-y-1">
                      {assignments.map((a) => (
                        <button
                          key={`${a.raceId}-${a.role}`}
                          onClick={(e) => { e.stopPropagation(); onSelectRace?.(a.raceId); }}
                          disabled={!onSelectRace}
                          className={`w-full flex items-center justify-between text-xs px-2 py-1 -mx-2 rounded ${onSelectRace ? 'hover:bg-[var(--bg-surface-alt)] cursor-pointer' : ''}`}
                        >
                          <span className="text-[var(--text-primary)] truncate mr-2 text-left">
                            {(() => { const md = medalByRace.get(a.raceId); return md ? <span className="mr-1">{MEDAL_EMOJI[md]}</span> : null; })()}
                            {a.raceName}
                          </span>
                          <span className={`flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                            a.role === 'paddle' ? 'bg-[var(--bg-male-strong)] text-blue-700' :
                            a.role === 'drummer' ? 'bg-amber-100 text-amber-700' :
                            a.role === 'helm' ? 'bg-amber-100 text-amber-700' :
                            'bg-[var(--bg-badge-side)] text-[var(--text-badge-side)]'
                          }`}>{a.role}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {visibleRows.length === 0 && (
              <div className="text-center text-[var(--text-muted)] py-8 text-sm">{q ? 'No matching names' : 'No athletes'}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
