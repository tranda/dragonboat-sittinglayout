import type { ScheduleEntry } from '../types';

interface Props {
  crewName: string;
  schedule: ScheduleEntry[];
  onClose: () => void;
}

export function CrewScheduleModal({ crewName, schedule, onClose }: Props) {
  const sorted = [...schedule]
    .filter(e => e.time)
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg-overlay)] px-4" onClick={onClose}>
      <div className="bg-[var(--bg-surface)] rounded-xl shadow-2xl w-full max-w-sm flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-secondary)]">
              <circle cx="12" cy="12" r="9" />
              <polyline points="12 7 12 12 15 14" />
            </svg>
            <h2 className="text-sm font-bold text-[var(--text-primary)] truncate">{crewName}</h2>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] text-xl px-1">&times;</button>
        </div>
        <div className="p-3">
          {sorted.length === 0 ? (
            <div className="text-xs text-[var(--text-muted)] italic py-2">No race times set. Add them via the menu → Edit Crew.</div>
          ) : (
            <div className="divide-y">
              {sorted.map((e, i) => (
                <div key={i} className="flex items-center justify-between py-2 gap-3">
                  <span className="text-sm font-medium text-[var(--text-primary)]">{e.stage || '—'}</span>
                  <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
                    {new Date(e.time).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
