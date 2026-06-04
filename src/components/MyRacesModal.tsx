import { useMemo } from 'react';
import type { Race, BoatLayout } from '../types';

interface Props {
  athleteId: number | null;
  athleteName?: string;
  races: Race[];
  layouts: Record<string, BoatLayout>;
  onClose: () => void;
  onSelectRace?: (raceId: string) => void;
}

type Role = 'paddle' | 'helm' | 'drummer' | 'reserve';

interface MyRaceEntry {
  raceId: string;
  raceName: string;
  role: Role;
  detail?: string; // e.g. "Left · seat 3" for paddlers
}

const roleLabel: Record<Role, string> = {
  paddle: 'paddle',
  helm: 'helm',
  drummer: 'drummer',
  reserve: 'reserve',
};

export function MyRacesModal({ athleteId, athleteName, races, layouts, onClose, onSelectRace }: Props) {
  const entries = useMemo<MyRaceEntry[]>(() => {
    if (athleteId === null) return [];
    const out: MyRaceEntry[] = [];
    for (const race of races) {
      const layout = layouts[race.id];
      if (!layout) continue;
      const leftSeat = layout.left.findIndex(id => id === athleteId);
      if (leftSeat !== -1) out.push({ raceId: race.id, raceName: race.name, role: 'paddle', detail: `Left · seat ${leftSeat + 1}` });
      const rightSeat = layout.right.findIndex(id => id === athleteId);
      if (rightSeat !== -1) out.push({ raceId: race.id, raceName: race.name, role: 'paddle', detail: `Right · seat ${rightSeat + 1}` });
      if (layout.drummer === athleteId) out.push({ raceId: race.id, raceName: race.name, role: 'drummer' });
      if (layout.helm === athleteId) out.push({ raceId: race.id, raceName: race.name, role: 'helm' });
      if (layout.reserves.includes(athleteId)) out.push({ raceId: race.id, raceName: race.name, role: 'reserve' });
    }
    return out;
  }, [athleteId, races, layouts]);

  const counts = useMemo(() => {
    const c = { paddle: 0, helm: 0, drummer: 0, reserve: 0 };
    entries.forEach(e => { c[e.role]++; });
    return c;
  }, [entries]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[var(--bg-overlay)] pt-6">
      <div className="bg-[var(--bg-surface)] rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[90dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">My Races</h2>
            {athleteName && <div className="text-xs text-[var(--text-muted)] truncate">{athleteName}</div>}
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-xl px-1">&times;</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {athleteId === null ? (
            <div className="text-center text-[var(--text-muted)] py-10 px-6 text-sm">
              Your account isn't linked to an athlete yet, so we can't show your races. Ask your coach or admin to link your account.
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="px-4 py-2 flex flex-wrap items-center gap-3 text-[11px] text-[var(--text-secondary)] border-b bg-[var(--bg-surface)]">
                <span><b className="text-[var(--text-primary)]">{entries.length}</b> crews</span>
                {counts.paddle > 0 && <span><b className="text-[var(--text-primary)]">{counts.paddle}</b> paddle</span>}
                {counts.reserve > 0 && <span><b className="text-[var(--text-primary)]">{counts.reserve}</b> reserve</span>}
                {counts.helm > 0 && <span><b className="text-[var(--text-primary)]">{counts.helm}</b> helm</span>}
                {counts.drummer > 0 && <span><b className="text-[var(--text-primary)]">{counts.drummer}</b> drummer</span>}
              </div>

              {/* Race list */}
              <div className="divide-y">
                {entries.map((e) => (
                  <button
                    key={`${e.raceId}-${e.role}-${e.detail ?? ''}`}
                    onClick={() => onSelectRace?.(e.raceId)}
                    disabled={!onSelectRace}
                    className={`w-full flex items-center justify-between gap-2 px-4 py-3 text-left ${onSelectRace ? 'hover:bg-[var(--bg-surface-alt)] cursor-pointer' : ''}`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[var(--text-primary)] truncate">{e.raceName}</div>
                      {e.detail && <div className="text-xs text-[var(--text-muted)]">{e.detail}</div>}
                    </div>
                    <span className={`flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                      e.role === 'paddle' ? 'bg-[var(--bg-male-strong)] text-blue-700' :
                      e.role === 'drummer' ? 'bg-amber-100 text-amber-700' :
                      e.role === 'helm' ? 'bg-amber-100 text-amber-700' :
                      'bg-[var(--bg-badge-side)] text-[var(--text-badge-side)]'
                    }`}>{roleLabel[e.role]}</span>
                  </button>
                ))}
                {entries.length === 0 && (
                  <div className="text-center text-[var(--text-muted)] py-10 text-sm">You're not in any crews yet</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
