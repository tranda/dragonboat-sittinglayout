import { useState, useMemo } from 'react';
import type { Athlete, Race, BoatLayout, GenderCategory, AgeCategory } from '../types';

interface Props {
  athletes: Athlete[];
  races: Race[];
  layouts: Record<string, BoatLayout>;
  onClose: () => void;
}

type BoatFilter = 'all' | 'standard' | 'small';
type GenderFilter = 'all' | GenderCategory;
type AgeFilter = 'all' | AgeCategory;

const AGE_CATS: AgeCategory[] = ['18U', '24U', 'Premier', 'Senior A', 'Senior B', 'Senior C', 'Senior D', 'BCP'];

export function ReportPanel({ athletes, races, layouts, onClose }: Props) {
  const [includeDrummer, setIncludeDrummer] = useState(false);
  const [includeHelm, setIncludeHelm] = useState(false);
  const [includeReserves, setIncludeReserves] = useState(false);

  const [boatFilter, setBoatFilter] = useState<BoatFilter>('all');
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [ageFilter, setAgeFilter] = useState<AgeFilter>('all');
  const [distanceFilter, setDistanceFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(true);

  // Unique distances from races
  const distances = useMemo(() => {
    const set = new Set<string>();
    races.forEach(r => { if (r.distance) set.add(r.distance); });
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

  // Count per athlete
  const rows = useMemo(() => {
    const counts = new Map<number, number>();
    for (const race of filteredRaces) {
      const layout = layouts[race.id];
      if (!layout) continue;
      const ids = new Set<number>();
      layout.left.forEach(id => id !== null && ids.add(id));
      layout.right.forEach(id => id !== null && ids.add(id));
      if (includeDrummer && layout.drummer !== null) ids.add(layout.drummer);
      if (includeHelm && layout.helm !== null) ids.add(layout.helm);
      if (includeReserves) layout.reserves.forEach(id => id !== null && ids.add(id));
      ids.forEach(id => counts.set(id, (counts.get(id) ?? 0) + 1));
    }
    return athletes
      .filter(a => !(a as unknown as { isRemoved?: boolean }).isRemoved)
      .map(a => ({ athlete: a, count: counts.get(a.id) ?? 0 }))
      .sort((a, b) => b.count - a.count || a.athlete.name.localeCompare(b.athlete.name));
  }, [athletes, filteredRaces, layouts, includeDrummer, includeHelm, includeReserves]);

  const totalAssignments = rows.reduce((s, r) => s + r.count, 0);
  const activeCount = rows.filter(r => r.count > 0).length;

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
            <span>Filters ({filteredRaces.length} of {races.length} races)</span>
            <span className="text-gray-400">{showFilters ? '▴' : '▾'}</span>
          </button>

          {showFilters && (
            <div className="p-4 space-y-3 border-b bg-gray-50/50">
              {/* Role toggles */}
              <div>
                <div className="text-[11px] font-semibold text-gray-500 mb-1.5 uppercase">Include Roles</div>
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={includeDrummer} onChange={e => setIncludeDrummer(e.target.checked)} />
                    Drummer
                  </label>
                  <label className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={includeHelm} onChange={e => setIncludeHelm(e.target.checked)} />
                    Helm
                  </label>
                  <label className="flex items-center gap-1.5 text-xs">
                    <input type="checkbox" checked={includeReserves} onChange={e => setIncludeReserves(e.target.checked)} />
                    Reserves
                  </label>
                </div>
                <div className="text-[10px] text-gray-400 mt-1">Paddlers (L/R seats) always included</div>
              </div>

              {/* Race filters */}
              <div>
                <div className="text-[11px] font-semibold text-gray-500 mb-1.5 uppercase">Race Filters</div>
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
                  <select value={ageFilter} onChange={e => setAgeFilter(e.target.value as AgeFilter)} className="px-2 py-1.5 text-xs border rounded-lg bg-white">
                    <option value="all">All ages</option>
                    {AGE_CATS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <select value={distanceFilter} onChange={e => setDistanceFilter(e.target.value)} className="px-2 py-1.5 text-xs border rounded-lg bg-white">
                    <option value="all">All distances</option>
                    {distances.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="px-4 py-2 flex items-center gap-3 text-[11px] text-gray-500 border-b bg-white">
            <span><b className="text-gray-800">{activeCount}</b> athletes racing</span>
            <span><b className="text-gray-800">{totalAssignments}</b> total assignments</span>
          </div>

          {/* Athlete list */}
          <div className="divide-y">
            {rows.map(({ athlete, count }) => (
              <div key={athlete.id} className="flex items-center justify-between px-4 py-2 hover:bg-gray-50">
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-gray-800 truncate">{athlete.name}</div>
                  <div className="text-[10px] text-gray-400">
                    {athlete.gender} · {athlete.weight}kg{athlete.yearOfBirth ? ` · ${athlete.yearOfBirth}` : ''}
                  </div>
                </div>
                <div className={`text-sm font-bold min-w-[2rem] text-right ${
                  count === 0 ? 'text-gray-300' : count < 3 ? 'text-gray-700' : count < 6 ? 'text-blue-600' : 'text-green-600'
                }`}>
                  {count}
                </div>
              </div>
            ))}
            {rows.length === 0 && (
              <div className="text-center text-gray-400 py-8 text-sm">No athletes</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
