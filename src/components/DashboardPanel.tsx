import type { Athlete, Race, BoatLayout } from '../types';

interface Props {
  races: Race[];
  layouts: Record<string, BoatLayout>;
  athleteMap: Map<number, Athlete>;
  onSelectRace: (id: string) => void;
  onClose: () => void;
}

function countFilled(layout: BoatLayout, race: Race) {
  const paddlers = layout.left.filter(id => id !== null).length + layout.right.filter(id => id !== null).length;
  const totalPaddlers = race.numRows * 2;
  const drummer = layout.drummer !== null ? 1 : 0;
  const helm = layout.helm !== null ? 1 : 0;
  const reserves = layout.reserves.filter(id => id !== null).length;
  const maxReserves = race.boatType === 'standard' ? 4 : 2;
  return { paddlers, totalPaddlers, drummer, helm, reserves, maxReserves };
}

export function DashboardPanel({ races, layouts, athleteMap, onSelectRace, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 pt-6">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">Races Dashboard</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl px-1">&times;</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {races.map(race => {
            const layout = layouts[race.id];
            if (!layout) return null;
            const c = countFilled(layout, race);
            const totalFilled = c.paddlers + c.drummer + c.helm;
            const totalSeats = c.totalPaddlers + 2;
            const isFull = totalFilled === totalSeats;
            const pct = Math.round((totalFilled / totalSeats) * 100);

            // Find athletes with notes in this crew
            const crewIds = [
              ...layout.left.filter(Boolean),
              ...layout.right.filter(Boolean),
              layout.drummer,
              layout.helm,
              ...layout.reserves,
            ].filter(Boolean) as number[];
            const warnings = crewIds
              .map(id => athleteMap.get(id))
              .filter(a => a?.notes)
              .map(a => a!);

            return (
              <button
                key={race.id}
                onClick={() => { onSelectRace(race.id); onClose(); }}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  isFull ? 'border-green-200 bg-green-50/50' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm font-semibold text-gray-800 truncate mr-2">{race.name}</div>
                  <span className={`text-xs font-bold flex-shrink-0 ${
                    isFull ? 'text-green-600' : pct >= 80 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {totalFilled}/{totalSeats}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-gray-200 rounded-full mb-1.5">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isFull ? 'bg-green-500' : pct >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="flex gap-3 text-[10px] text-gray-500">
                  <span>Paddlers: <b className={c.paddlers === c.totalPaddlers ? 'text-green-600' : 'text-gray-700'}>{c.paddlers}/{c.totalPaddlers}</b></span>
                  <span>DR: <b className={c.drummer ? 'text-green-600' : 'text-red-500'}>{c.drummer ? '✓' : '✗'}</b></span>
                  <span>HM: <b className={c.helm ? 'text-green-600' : 'text-red-500'}>{c.helm ? '✓' : '✗'}</b></span>
                  <span>Res: <b className="text-gray-700">{c.reserves}/{c.maxReserves}</b></span>
                </div>

                {/* Warnings for athletes with notes */}
                {warnings.length > 0 && (
                  <div className="mt-1.5 space-y-0.5">
                    {warnings.map(a => (
                      <div key={a.id} className="text-[10px] text-orange-600 truncate">
                        ⚠ {a.name}: {a.notes}
                      </div>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
