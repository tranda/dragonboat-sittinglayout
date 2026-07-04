import type { Race, BoatLayout } from '../types';

export interface ConflictGroup {
  sessionLabel: string; // fixed label, e.g. "Too close in time"
  races: { id: string; name: string; stage: string; scheduledTime: string }[];
}

export interface ConflictOptions {
  enabled: boolean;      // master on/off toggle
  minGapMinutes: number; // two races closer than this (in minutes) are a conflict
}

export const DEFAULT_CONFLICT_OPTIONS: ConflictOptions = {
  enabled: true,
  minGapMinutes: 30,
};

const TOO_CLOSE_LABEL = 'Too close in time';

// Warn when an athlete is entered in two DIFFERENT crews whose scheduled rounds fall closer
// together than `minGapMinutes` — they can't be in two boats on the water at once. Each crew
// can have several scheduled rounds (Heat, Repechage, Final...); every round is considered.
// Rounds of the same crew never conflict with each other.
export function computeAthleteConflicts(
  races: Race[],
  layouts: Record<string, BoatLayout>,
  options: ConflictOptions = DEFAULT_CONFLICT_OPTIONS
): Map<number, ConflictGroup[]> {
  const result = new Map<number, ConflictGroup[]>();
  if (!options.enabled) return result;

  const gapMs = Math.max(0, options.minGapMinutes) * 60_000;

  // athleteId → every scheduled round they are entered in (across all their crews)
  type Entry = { raceId: string; name: string; stage: string; iso: string; time: number };
  const perAthlete = new Map<number, Entry[]>();

  for (const race of races) {
    if (!race.schedule || race.schedule.length === 0) continue;
    const layout = layouts[race.id];
    if (!layout) continue;

    const ids = new Set<number>();
    layout.left.forEach(id => id !== null && ids.add(id));
    layout.right.forEach(id => id !== null && ids.add(id));
    if (layout.drummer !== null) ids.add(layout.drummer);
    if (layout.helm !== null) ids.add(layout.helm);
    layout.reserves.forEach(id => id !== null && ids.add(id));
    if (ids.size === 0) continue;

    for (const slot of race.schedule) {
      if (!slot.time) continue;
      const time = new Date(slot.time).getTime();
      if (Number.isNaN(time)) continue;
      const entry: Entry = { raceId: race.id, name: race.name, stage: slot.stage, iso: slot.time, time };
      for (const athleteId of ids) {
        const list = perAthlete.get(athleteId);
        if (list) list.push(entry);
        else perAthlete.set(athleteId, [entry]);
      }
    }
  }

  for (const [athleteId, entries] of perAthlete) {
    if (entries.length < 2) continue;
    entries.sort((a, b) => a.time - b.time);

    const groups: ConflictGroup[] = [];
    let cluster: Entry[] = [entries[0]];
    const flush = () => {
      // A conflict needs rounds from at least two DIFFERENT crews within the window.
      const distinctRaces = new Set(cluster.map(e => e.raceId));
      if (distinctRaces.size > 1) {
        groups.push({
          sessionLabel: TOO_CLOSE_LABEL,
          races: cluster.map(e => ({ id: e.raceId, name: e.name, stage: e.stage, scheduledTime: e.iso })),
        });
      }
    };
    for (let i = 1; i < entries.length; i++) {
      if (entries[i].time - entries[i - 1].time < gapMs) {
        cluster.push(entries[i]);
      } else {
        flush();
        cluster = [entries[i]];
      }
    }
    flush();
    if (groups.length > 0) result.set(athleteId, groups);
  }

  return result;
}
