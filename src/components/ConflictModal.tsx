import type { ConflictGroup } from '../utils/conflicts';

interface Props {
  athleteName: string;
  conflicts: ConflictGroup[];
  onClose: () => void;
  onSelectRace?: (raceId: string) => void;
}

export function ConflictModal({ athleteName, conflicts, onClose, onSelectRace }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-overlay)] px-4" onClick={onClose}>
      <div className="bg-[var(--bg-surface)] rounded-xl shadow-2xl w-full max-w-sm flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <span className="text-yellow-500">⚠</span>
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Race conflict</h2>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] text-xl px-1">&times;</button>
        </div>
        <div className="p-3 space-y-3">
          <div className="text-xs text-[var(--text-secondary)]">
            <b className="text-[var(--text-primary)]">{athleteName}</b> is entered in races scheduled too close together in time:
          </div>
          {conflicts.map((c, i) => (
            <div key={i} className="space-y-1">
              <div className="text-[10px] font-semibold uppercase text-[var(--text-muted)]">{c.sessionLabel}</div>
              <div className="space-y-1">
                {c.races.map((r, ri) => (
                  <button
                    key={`${r.id}-${ri}`}
                    onClick={() => { onSelectRace?.(r.id); onClose(); }}
                    disabled={!onSelectRace}
                    className={`w-full text-left px-2 py-1.5 rounded text-sm bg-[var(--bg-surface-alt)] ${onSelectRace ? 'hover:bg-[var(--bg-male)]' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span>{r.name}{r.stage ? ` — ${r.stage}` : ''}</span>
                      {r.scheduledTime && (
                        <span className="text-[10px] text-[var(--text-muted)] whitespace-nowrap">
                          {new Date(r.scheduledTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
