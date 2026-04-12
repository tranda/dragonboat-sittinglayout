import { useState, useMemo } from 'react';
import type { Athlete, Race, BoatLayout, GenderCategory, AppConfig } from '../types';
import { getAthleteAgeCategory } from '../utils/policies';

interface Props {
  athletes: Athlete[];
  races: Race[];
  layouts: Record<string, BoatLayout>;
  config: AppConfig;
  onClose: () => void;
}

type BoatFilter = 'all' | 'standard' | 'small';
type GenderFilter = 'all' | GenderCategory;

interface RoleCounts {
  paddle: number;
  helm: number;
  drummer: number;
  reserve: number;
}

export function ReportPanel({ athletes, races, layouts, config, onClose }: Props) {
  const [boatFilter, setBoatFilter] = useState<BoatFilter>('all');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [ageFilter, setAgeFilter] = useState<string>('all');
  const [distanceFilter, setDistanceFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

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

  // Role counts per athlete + crew assignments
  const { rows, crewMap } = useMemo(() => {
    const counts = new Map<number, RoleCounts>();
    const crews = new Map<number, { raceName: string; role: string }[]>();
    const add = (id: number | null, role: keyof RoleCounts, raceName: string) => {
      if (id === null) return;
      const cur = counts.get(id) ?? { paddle: 0, helm: 0, drummer: 0, reserve: 0 };
      cur[role]++;
      counts.set(id, cur);
      const list = crews.get(id) ?? [];
      list.push({ raceName, role });
      crews.set(id, list);
    };
    for (const race of filteredRaces) {
      const layout = layouts[race.id];
      if (!layout) continue;
      layout.left.forEach(id => add(id, 'paddle', race.name));
      layout.right.forEach(id => add(id, 'paddle', race.name));
      add(layout.drummer, 'drummer', race.name);
      add(layout.helm, 'helm', race.name);
      layout.reserves.forEach(id => add(id, 'reserve', race.name));
    }
    const r = athletes
      .filter(a => !(a as unknown as { isRemoved?: boolean }).isRemoved)
      .map(a => {
        const c = counts.get(a.id) ?? { paddle: 0, helm: 0, drummer: 0, reserve: 0 };
        const total = c.paddle + c.helm + c.drummer + c.reserve;
        return { athlete: a, counts: c, total };
      })
      .sort((a, b) => b.total - a.total || a.athlete.name.localeCompare(b.athlete.name));
    return { rows: r, crewMap: crews };
  }, [athletes, filteredRaces, layouts]);

  const totalAssignments = rows.reduce((s, r) => s + r.total, 0);
  const activeCount = rows.filter(r => r.total > 0).length;

  const cell = (n: number) => (
    <div className={`w-7 text-center text-xs tabular-nums ${n === 0 ? 'text-gray-300' : 'text-gray-800 font-semibold'}`}>
      {n === 0 ? '—' : n}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-6">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">Report</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl px-1">&times;</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Filters toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-50 border-b"
          >
            <span>Filters ({filteredRaces.length} of {races.length} crews)</span>
            <span className="text-gray-400">{showFilters ? '▴' : '▾'}</span>
          </button>

          {showFilters && (
            <div className="p-4 border-b bg-gray-50/50">
              <div className="grid grid-cols-2 gap-2">
                <select value={boatFilter} onChange={e => setBoatFilter(e.target.value as BoatFilter)} className="px-2 py-1.5 text-xs border rounded-lg bg-white">
                  <option value="all">All boats</option>
                  <option value="standard">Standard (20)</option>
                  <option value="small">Small (10)</option>
                </select>
                <select value={genderFilter} onChange={e => setGenderFilter(e.target.value as GenderFilter)} className="px-2 py-1.5 text-xs border rounded-lg bg-white">
                  <option value="all">All genders</option>
                  <option value="Open">Open</option>
                  <option value="Women">Women</option>
                  <option value="Mixed">Mixed</option>
                </select>
                <select value={ageFilter} onChange={e => setAgeFilter(e.target.value)} className="px-2 py-1.5 text-xs border rounded-lg bg-white">
                  <option value="all">All ages</option>
                  {ageCategories.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <select value={distanceFilter} onChange={e => setDistanceFilter(e.target.value)} className="px-2 py-1.5 text-xs border rounded-lg bg-white">
                  <option value="all">All distances</option>
                  {distances.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="px-4 py-2 flex items-center gap-3 text-[11px] text-gray-500 border-b bg-white">
            <span><b className="text-gray-800">{activeCount}</b> athletes racing</span>
            <span><b className="text-gray-800">{totalAssignments}</b> total assignments</span>
          </div>

          {/* Column headers */}
          <div className="sticky top-0 flex items-center gap-1 px-4 py-1.5 bg-gray-50 border-b text-[10px] font-semibold text-gray-400 uppercase">
            <div className="flex-1">Athlete</div>
            <div className="w-7 text-center" title="Paddle">Pad</div>
            <div className="w-7 text-center" title="Helm">Helm</div>
            <div className="w-7 text-center" title="Drummer">Drm</div>
            <div className="w-7 text-center" title="Reserve">Res</div>
          </div>

          {/* Athlete list */}
          <div className="divide-y">
            {rows.map(({ athlete, counts }) => {
              const ageCat = getAthleteAgeCategory(athlete, config);
              const isExpanded = expandedId === athlete.id;
              const assignments = crewMap.get(athlete.id) ?? [];
              return (
                <div key={athlete.id}>
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : athlete.id)}
                    className={`flex items-center gap-1 px-4 py-2 cursor-pointer ${athlete.gender === 'F' ? 'bg-pink-50' : 'bg-blue-50'} ${isExpanded ? 'ring-1 ring-blue-400' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{athlete.name}</div>
                      <div className="text-xs text-gray-400">
                        {athlete.gender === 'F' ? 'W' : 'M'}
                        {athlete.yearOfBirth ? ` · ${athlete.yearOfBirth}` : ''}
                        {ageCat ? ` · ${ageCat}` : ''}
                        {athlete.preferredSide && <span className="ml-1 px-1 py-0.5 bg-green-100 text-green-700 rounded text-[9px] font-semibold">{athlete.preferredSide === 'both' ? 'L/R' : athlete.preferredSide === 'left' ? 'L' : 'R'}</span>}
                        {athlete.isBCP && <span className="ml-1 px-1 py-0.5 bg-purple-100 text-purple-700 rounded text-[9px] font-semibold">BCP</span>}
                      </div>
                    </div>
                    {cell(counts.paddle)}
                    {cell(counts.helm)}
                    {cell(counts.drummer)}
                    {cell(counts.reserve)}
                  </div>
                  {isExpanded && assignments.length > 0 && (
                    <div className="px-4 py-2 bg-white border-t border-gray-100 space-y-1">
                      {assignments.map((a, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-gray-700 truncate mr-2">{a.raceName}</span>
                          <span className={`flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                            a.role === 'paddle' ? 'bg-blue-100 text-blue-700' :
                            a.role === 'drummer' ? 'bg-amber-100 text-amber-700' :
                            a.role === 'helm' ? 'bg-amber-100 text-amber-700' :
                            'bg-green-100 text-green-700'
                          }`}>{a.role}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {rows.length === 0 && (
              <div className="text-center text-gray-400 py-8 text-sm">No athletes</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
