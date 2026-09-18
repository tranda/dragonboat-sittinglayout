import { useEffect, useState } from 'react';
import * as api from '../utils/api';
import type { Race } from '../types';

interface Props {
  onClose: () => void;
  onImported: () => void;
  existingRaces: Race[];
}

// A race's identity for skip-existing dedup: boat + distance + gender + age.
// Re-running the import then never re-creates a race already in this competition.
function raceKey(parts: { boatType: string; distance: string; genderCategory: string; ageCategory: string }): string {
  return [parts.boatType, parts.distance, parts.genderCategory, parts.ageCategory]
    .map(p => String(p).toLowerCase().trim())
    .join('|');
}

export function ImportEventRacesModal({ onClose, onImported, existingRaces }: Props) {
  const [step, setStep] = useState<'event' | 'club' | 'select'>('event');
  const [events, setEvents] = useState<api.EventsListItem[]>([]);
  const [clubs, setClubs] = useState<api.EventsClub[]>([]);
  const [eventId, setEventId] = useState<number | null>(null);
  const [races, setRaces] = useState<api.EventsRace[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
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

  const existingKeys = new Set(existingRaces.map(r => raceKey(r)));
  const isExisting = (r: api.EventsRace) => existingKeys.has(raceKey({
    boatType: r.boat_type, distance: r.distance, genderCategory: r.gender_category, ageCategory: r.age_category,
  }));

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
      // Pre-select only races not already present — skip the rest.
      setSelected(new Set(data.filter(r => !isExisting(r)).map(r => r.discipline_id)));
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

  const newRaces = races.filter(r => !isExisting(r));
  const skippedCount = races.length - newRaces.length;

  const handleImport = async () => {
    setImporting(true);
    try {
      const toImport = races.filter(r => selected.has(r.discipline_id));
      let created = 0;
      for (let i = 0; i < toImport.length; i++) {
        const r = toImport[i];
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
        });
        created++;
      }
      onImported();
      onClose();
      alert(`${created} race${created === 1 ? '' : 's'} imported${skippedCount ? `, ${skippedCount} already existed (skipped)` : ''}`);
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
            <p className="text-xs text-[var(--text-secondary)] mb-1">Select the club to import races for:</p>
            {clubs.map(c => (
              <button
                key={c.id}
                onClick={() => loadRaces(c.id)}
                disabled={loading}
                className="w-full text-left px-3 py-2 rounded-lg border border-[var(--border-default)] hover:bg-[var(--bg-surface-alt)] disabled:opacity-50"
              >
                <div className="text-sm font-medium text-[var(--text-primary)]">{c.name}</div>
                {c.country && <div className="text-[10px] text-[var(--text-muted)]">{c.country}</div>}
              </button>
            ))}
            {clubs.length === 0 && <div className="text-center text-[var(--text-muted)] py-8">No clubs found</div>}
            {error && <div className="text-xs text-red-600">{error}</div>}
            {loading && <div className="text-xs text-[var(--text-muted)] text-center py-2">Loading races…</div>}
            <button onClick={() => setStep('event')} className="text-xs text-[var(--text-muted)] underline mt-1">← Back to events</button>
          </div>
        ) : (
          <>
            <div className="px-4 py-2 border-b text-xs text-[var(--text-muted)]">
              {newRaces.length} new · {skippedCount} already exist (skipped)
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {races.map(r => {
                const existing = isExisting(r);
                return (
                  <label
                    key={r.discipline_id}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
                      existing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    } ${selected.has(r.discipline_id) ? 'bg-[var(--bg-male)]' : 'hover:bg-[var(--bg-surface-alt)]'}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(r.discipline_id)}
                      disabled={existing}
                      onChange={() => toggle(r.discipline_id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {r.name}
                        {existing && <span className="ml-2 text-[9px] px-1.5 py-0.5 bg-[var(--bg-surface-alt)] text-[var(--text-muted)] rounded-full">exists</span>}
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
