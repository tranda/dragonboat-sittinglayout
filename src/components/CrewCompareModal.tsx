import { useState } from 'react';
import type { Athlete, Race, BoatLayout } from '../types';

interface Props {
  currentRace: Race;
  currentLayout: BoatLayout;
  races: Race[];
  layouts: Record<string, BoatLayout>;
  athleteMap: Map<number, Athlete>;
  onCopyCrew: (fromRaceId: string) => void;
  onClose: () => void;
}

function CrewColumn({ race, layout, athleteMap, label }: {
  race: Race;
  layout: BoatLayout;
  athleteMap: Map<number, Athlete>;
  label: string;
}) {
  const getName = (id: number | null) => {
    if (id === null) return '—';
    const a = athleteMap.get(id);
    return a ? a.name : '?';
  };

  const sideLabel = (id: number | null) => {
    if (id === null) return null;
    const a = athleteMap.get(id);
    if (!a?.preferredSide) return null;
    return a.preferredSide === 'both' ? 'L/R' : a.preferredSide === 'left' ? 'L' : 'R';
  };

  const nameCell = (id: number | null) => {
    const a = id !== null ? athleteMap.get(id) : null;
    const side = sideLabel(id);
    return (
      <div className={`text-[10px] truncate px-1 py-0.5 rounded ${
        a?.gender === 'F' ? 'bg-[var(--bg-female)]' : a?.gender === 'M' ? 'bg-[var(--bg-male)]' : 'bg-[var(--bg-surface-alt)]'
      }`}>
        {getName(id)}
        {side && <span className="ml-0.5 px-0.5 bg-[var(--bg-badge-side)] text-[var(--text-badge-side)] rounded text-[8px] font-semibold">{side}</span>}
      </div>
    );
  };

  const filled = [
    ...layout.left.filter(id => id !== null),
    ...layout.right.filter(id => id !== null),
    layout.drummer,
    layout.helm,
    ...layout.reserves,
  ].filter(id => id !== null).length;

  const total = layout.left.length + layout.right.length + 2 + (race.boatType === 'standard' ? 4 : 2);

  return (
    <div className="flex-1 min-w-0">
      <div className="text-[11px] font-bold text-[var(--text-primary)] truncate mb-0.5">{label}</div>
      <div className="text-[9px] text-[var(--text-muted)] mb-1">{race.name} · {filled}/{total}</div>

      {/* Drummer */}
      <div className="text-[8px] text-[var(--text-muted)] uppercase mb-0.5">Drummer</div>
      {nameCell(layout.drummer)}

      {/* Seats */}
      <div className="mt-1 text-[8px] text-[var(--text-muted)] uppercase mb-0.5">Paddlers</div>
      <div className="grid grid-cols-2 gap-x-0.5 gap-y-0.5">
        {layout.left.map((id, i) => (
          <div key={`l${i}`} className="contents">
            {nameCell(id)}
            {nameCell(layout.right[i] ?? null)}
          </div>
        ))}
      </div>

      {/* Helm */}
      <div className="mt-1 text-[8px] text-[var(--text-muted)] uppercase mb-0.5">Helm</div>
      {nameCell(layout.helm)}

      {/* Reserves */}
      <div className="mt-1 text-[8px] text-[var(--text-muted)] uppercase mb-0.5">Reserves</div>
      <div className="grid grid-cols-2 gap-0.5">
        {layout.reserves.map((id, i) => (
          <div key={`r${i}`}>{nameCell(id)}</div>
        ))}
        {layout.reserves.length === 0 && (
          <div className="text-[10px] text-[var(--text-muted)]">none</div>
        )}
      </div>
    </div>
  );
}

export function CrewCompareModal({ currentRace, currentLayout, races, layouts, athleteMap, onCopyCrew, onClose }: Props) {
  const otherRaces = races.filter(r => r.id !== currentRace.id);
  const [compareId, setCompareId] = useState(otherRaces[0]?.id ?? '');
  const compareRace = races.find(r => r.id === compareId);
  const compareLayout = layouts[compareId];

  const handleCopy = () => {
    if (!compareId) return;
    if (!confirm(`Copy crew from "${compareRace?.name}" into "${currentRace.name}"? This will replace the current crew.`)) return;
    onCopyCrew(compareId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[var(--bg-overlay)] pt-6">
      <div className="bg-[var(--bg-surface)] rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Compare Crews</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-xl px-1">&times;</button>
        </div>

        {/* Race selector */}
        <div className="px-4 py-2 border-b bg-gray-50/50">
          <label className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase">Compare with</label>
          <select
            value={compareId}
            onChange={e => setCompareId(e.target.value)}
            className="w-full mt-1 px-2 py-1.5 text-sm border rounded-lg bg-[var(--bg-surface)]"
          >
            {otherRaces.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        {/* Side by side */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex gap-3">
            <CrewColumn
              race={currentRace}
              layout={currentLayout}
              athleteMap={athleteMap}
              label="Current"
            />
            <div className="w-px bg-[var(--border-default)] flex-shrink-0" />
            {compareRace && compareLayout ? (
              <CrewColumn
                race={compareRace}
                layout={compareLayout}
                athleteMap={athleteMap}
                label="Compare"
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-[var(--text-muted)] text-sm">No layout</div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4 border-t">
          <button
            onClick={handleCopy}
            disabled={!compareLayout}
            className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            Copy to current crew
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm bg-[var(--bg-surface-alt)] text-[var(--text-primary)] rounded-lg">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
