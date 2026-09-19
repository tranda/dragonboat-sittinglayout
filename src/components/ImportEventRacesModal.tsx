import { useEffect, useState } from 'react';
import * as api from '../utils/api';
import type { Race, Medal } from '../types';
import { MEDAL_EMOJI } from '../types';

interface Props {
  onClose: () => void;
  onImported: () => void;
  existingRaces: Race[];
  activeTeamName?: string | null;
}

// A race's identity for skip-existing dedup: boat + distance + gender + age.
// Re-running the import then never re-creates a race already in this competition.
function raceKey(parts: { boatType: string; distance: string; genderCategory: string; ageCategory: string }): string {
  return [parts.boatType, parts.distance, parts.genderCategory, parts.ageCategory]
    .map(p => String(p).toLowerCase().trim())
    .join('|');
}

function clubMatchesTeam(clubName: string, teamName?: string | null): boolean {
  if (!teamName) return false;
  const a = clubName.toLowerCase().trim();
  const b = teamName.toLowerCase().trim();
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
}

// Order-independent signature of a schedule, comparing times by instant (not
// string) so format differences (ms vs µs, offset vs Z) don't read as changes.
function schedSig(schedule?: { stage: string; time: string }[]): string {
  return (schedule ?? [])
    .map(s => `${s.stage}@${Number.isNaN(Date.parse(s.time)) ? s.time : Date.parse(s.time)}`)
    .sort()
    .join('|');
}

export function ImportEventRacesModal({ onClose, onImported, existingRaces, activeTeamName }: Props) {
  const [step, setStep] = useState<'event' | 'club' | 'select'>('event');
  const [events, setEvents] = useState<api.EventsListItem[]>([]);
  const [clubs, setClubs] = useState<api.EventsClub[]>([]);
  const [eventId, setEventId] = useState<number | null>(null);
  const [races, setRaces] = useState<api.EventsRace[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [syncTimes, setSyncTimes] = useState(false);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  // Load events and clubs up front (both are public, no auth).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [eventList, clubList] = await Promise.all([api.fetchEventsList(), api.fetchEventsRaceClubs()]);
        if (!cancelled) { setEvents(eventList); setClubs(clubList); }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load events');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Map each incoming race to a local one (by identity) to decide the action:
  //   create — no local match → make a new race (with schedule + medal)
  //   update — local match whose medal (or, if "sync times" is on, schedule) differs
  //   skip   — local match, nothing to change
  const localByKey = new Map(existingRaces.map(r => [raceKey(r), r] as const));
  const localFor = (r: api.EventsRace): Race | undefined => localByKey.get(raceKey({
    boatType: r.boat_type, distance: r.distance, genderCategory: r.gender_category, ageCategory: r.age_category,
  }));
  // What a re-import would change on an existing race, given the sync-times flag.
  const changesFor = (r: api.EventsRace, sync = syncTimes) => {
    const local = localFor(r);
    if (!local) return { local: undefined, medal: false, times: false };
    const medal = !!r.medal && r.medal !== (local.medal ?? null);
    const times = sync && r.schedule.length > 0 && schedSig(r.schedule) !== schedSig(local.schedule);
    return { local, medal, times };
  };
  const actionFor = (r: api.EventsRace, sync = syncTimes): 'create' | 'update' | 'skip' => {
    const c = changesFor(r, sync);
    if (!c.local) return 'create';
    return c.medal || c.times ? 'update' : 'skip';
  };

  const pickEvent = (id: number) => {
    setEventId(id);
    setError('');
    setStep('club');
  };

  const loadRaces = async (clubId: number) => {
    if (eventId === null) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.fetchEventsRaces(eventId, clubId);
      setRaces(data);
      // Pre-select everything actionable — new races and medal updates.
      setSelected(new Set(data.filter(r => actionFor(r) !== 'skip').map(r => r.discipline_id)));
      setStep('select');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load races');
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Toggling "sync times" changes which races are actionable — re-select all of them.
  const toggleSyncTimes = () => {
    setSyncTimes(prev => {
      const next = !prev;
      setSelected(new Set(races.filter(r => actionFor(r, next) !== 'skip').map(r => r.discipline_id)));
      return next;
    });
  };

  // Clubs matching the active team first, then alphabetical.
  const sortedClubs = [...clubs].sort((a, b) => {
    const am = clubMatchesTeam(a.name, activeTeamName);
    const bm = clubMatchesTeam(b.name, activeTeamName);
    if (am !== bm) return am ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const createCount = races.filter(r => actionFor(r) === 'create').length;
  const updateCount = races.filter(r => actionFor(r) === 'update').length;
  const skippedCount = races.filter(r => actionFor(r) === 'skip').length;

  const handleImport = async () => {
    setImporting(true);
    try {
      const toImport = races.filter(r => selected.has(r.discipline_id));
      let created = 0, updated = 0;
      for (let i = 0; i < toImport.length; i++) {
        const r = toImport[i];
        const action = actionFor(r);
        if (action === 'update') {
          const c = changesFor(r);
          const patch: Record<string, unknown> = {};
          if (c.medal) patch.medal = r.medal;
          if (c.times) patch.schedule = r.schedule;
          await api.updateRace(c.local!.id, patch);
          updated++;
        } else if (action === 'create') {
          const id = r.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') + '_' + Date.now() + '_' + i;
          await api.createRace({
            id,
            name: r.name,
            boat_type: r.boat_type,
            num_rows: r.num_rows,
            distance: r.distance,
            gender_category: r.gender_category,
            age_category: r.age_category,
            category: r.category,
            schedule: r.schedule,
            medal: r.medal,
          });
          created++;
        }
      }
      onImported();
      onClose();
      const parts = [`${created} imported`];
      if (updated) parts.push(`${updated} updated`);
      if (skippedCount) parts.push(`${skippedCount} unchanged`);
      alert(parts.join(', '));
    } catch (err) {
      alert('Import failed: ' + (err instanceof Error ? err.message : ''));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-[var(--bg-overlay)] pt-6">
      <div className="bg-[var(--bg-surface)] rounded-xl shadow-2xl w-full max-w-md mx-4 max-h-[85dvh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Import races from event</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] text-xl px-1">&times;</button>
        </div>

        {step === 'event' ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <p className="text-xs text-[var(--text-secondary)] mb-1">Select an event on events.motion.rs:</p>
            {loading && <div className="text-xs text-[var(--text-muted)] text-center py-4">Loading events…</div>}
            {!loading && events.length === 0 && !error && (
              <div className="text-center text-[var(--text-muted)] py-8">No events found</div>
            )}
            {events.map(e => (
              <button
                key={e.id}
                onClick={() => pickEvent(e.id)}
                className="w-full text-left px-3 py-2 rounded-lg border border-[var(--border-default)] hover:bg-[var(--bg-surface-alt)]"
              >
                <div className="text-sm font-medium text-[var(--text-primary)]">{e.name}</div>
                <div className="text-[10px] text-[var(--text-muted)]">
                  {e.year ?? ''}{e.location ? `${e.year ? ' · ' : ''}${e.location}` : ''}
                </div>
              </button>
            ))}
            {error && <div className="text-xs text-red-600">{error}</div>}
          </div>
        ) : step === 'club' ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <p className="text-xs text-[var(--text-secondary)] mb-1">
              Select the club to import races for{activeTeamName ? <> — matches for <b>{activeTeamName}</b> shown first</> : null}:
            </p>
            {sortedClubs.map(c => {
              const isMatch = clubMatchesTeam(c.name, activeTeamName);
              return (
                <button
                  key={c.id}
                  onClick={() => loadRaces(c.id)}
                  disabled={loading}
                  className={`w-full text-left px-3 py-2 rounded-lg border disabled:opacity-50 ${
                    isMatch
                      ? 'border-blue-400 bg-[var(--bg-male)] hover:bg-[var(--bg-male-strong)]'
                      : 'border-[var(--border-default)] hover:bg-[var(--bg-surface-alt)]'
                  }`}
                >
                  <div className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
                    <span>{c.name}</span>
                    {isMatch && <span className="text-[9px] px-1.5 py-0.5 bg-blue-600 text-white rounded-full">match</span>}
                  </div>
                  {c.country && <div className="text-[10px] text-[var(--text-muted)]">{c.country}</div>}
                </button>
              );
            })}
            {clubs.length === 0 && <div className="text-center text-[var(--text-muted)] py-8">No clubs found</div>}
            {error && <div className="text-xs text-red-600">{error}</div>}
            {loading && <div className="text-xs text-[var(--text-muted)] text-center py-2">Loading races…</div>}
            <button onClick={() => setStep('event')} className="text-xs text-[var(--text-muted)] underline mt-1">← Back to events</button>
          </div>
        ) : (
          <>
            <div className="px-4 py-2 border-b space-y-2">
              <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] cursor-pointer">
                <input type="checkbox" checked={syncTimes} onChange={toggleSyncTimes} />
                <span>Sync start times — overwrite existing races' schedule when it changed on the event</span>
              </label>
              <div className="text-xs text-[var(--text-muted)]">
                {createCount} new{updateCount ? ` · ${updateCount} update${updateCount === 1 ? '' : 's'}` : ''} · {skippedCount} unchanged
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {races.map(r => {
                const c = changesFor(r);
                const action = actionFor(r);
                const skip = action === 'skip';
                return (
                  <label
                    key={r.discipline_id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                      skip ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    } ${selected.has(r.discipline_id) ? 'bg-[var(--bg-male)]' : 'hover:bg-[var(--bg-surface-alt)]'}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(r.discipline_id)}
                      disabled={skip}
                      onChange={() => toggle(r.discipline_id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--text-primary)] truncate flex items-center gap-2">
                        <span className="truncate">{r.name}</span>
                        {r.medal && <span>{MEDAL_EMOJI[r.medal as Medal]}</span>}
                        {c.medal && <span className="text-[9px] px-1.5 py-0.5 bg-amber-500 text-white rounded-full">medal</span>}
                        {c.times && <span className="text-[9px] px-1.5 py-0.5 bg-blue-600 text-white rounded-full">time</span>}
                        {skip && <span className="text-[9px] px-1.5 py-0.5 bg-[var(--bg-surface-alt)] text-[var(--text-muted)] rounded-full">exists</span>}
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)]">
                        {r.boat_type === 'small' ? '10s' : '20s'} · {r.gender_category} · {r.age_category}
                        {r.schedule.length > 0 && ` · ${r.schedule.map(s => s.stage).join(', ')}`}
                      </div>
                    </div>
                  </label>
                );
              })}
              {races.length === 0 && (
                <div className="text-center text-[var(--text-muted)] py-8">
                  No races for this club in this event (or its schedule isn't published yet).
                </div>
              )}
            </div>
            <div className="flex gap-2 p-4 border-t">
              <button
                onClick={handleImport}
                disabled={selected.size === 0 || importing}
                className="flex-1 py-2 text-sm bg-green-600 text-white rounded-lg disabled:opacity-50"
              >
                {importing ? 'Importing…' : `Import ${selected.size} race${selected.size === 1 ? '' : 's'}`}
              </button>
              <button onClick={() => setStep('club')} className="px-4 py-2 text-sm bg-[var(--bg-surface-alt)] text-[var(--text-secondary)] rounded-lg">
                Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
