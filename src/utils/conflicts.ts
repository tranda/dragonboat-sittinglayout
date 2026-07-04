import type { Race, BoatLayout } from '../types';

export interface ConflictGroup {
  sessionLabel: string; // fixed label, e.g. "Too close in time"
  races: { id: string; name: string; scheduledTime: string | null }[];
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

// Warn when an athlete is entered in two races whose scheduled times are closer together
// than `minGapMinutes` — they can't physically get out of one boat and into the next in time.
// Races without a scheduled time are ignored (they can't be timed against anything).
export function computeAthleteConflicts(
  races: Race[],
  layouts: Record<string, BoatLayout>,
  options: ConflictOptions = DEFAULT_CONFLICT_OPTIONS
): Map<number, ConflictGroup[]> {
  const result = new Map<number, ConflictGroup[]>();
  if (!options.enabled) return result;

  const gapMs = Math.max(0, options.minGapMinutes) * 60_000;

  // athleteId → list of the timed races they are entered in
  type TimedRace = { id: string; name: string; time: number; scheduledTime: string };
  const perAthlete = new Map<number, TimedRace[]>();

  for (const race of races) {
    if (!race.scheduledTime) continue;
    const time = new Date(race.scheduledTime).getTime();
    if (Number.isNaN(time)) continue;
    const layout = layouts[race.id];
    if (!layout) continue;

    const ids = new Set<number>();
    layout.left.forEach(id => id !== null && ids.add(id));
    layout.right.forEach(id => id !== null && ids.add(id));
    if (layout.drummer !== null) ids.add(layout.drummer);
    if (layout.helm !== null) ids.add(layout.helm);
    layout.reserves.forEach(id => id !== null && ids.add(id));

    const entry = { id: race.id, name: race.name, time, scheduledTime: race.scheduledTime };
    for (const athleteId of ids) {
      const list = perAthlete.get(athleteId);
      if (list) list.push(entry);
      else perAthlete.set(athleteId, [entry]);
    }
  }

  for (const [athleteId, timedRaces] of perAthlete) {
    if (timedRaces.length < 2) continue;
    // Sort by time, then cluster races whose neighbour gap is under the threshold.
    timedRaces.sort((a, b) => a.time - b.time);

    const groups: ConflictGroup[] = [];
    let cluster: TimedRace[] = [timedRaces[0]];
    const flush = () => {
      if (cluster.length > 1) {
        groups.push({
          sessionLabel: TOO_CLOSE_LABEL,
          races: cluster.map(r => ({ id: r.id, name: r.name, scheduledTime: r.scheduledTime })),
        });
      }
    };
    for (let i = 1; i < timedRaces.length; i++) {
      const prev = timedRaces[i - 1];
      const cur = timedRaces[i];
      if (cur.time - prev.time < gapMs) {
        cluster.push(cur);
      } else {
        flush();
        cluster = [cur];
      }
    }
    flush();
    if (groups.length > 0) result.set(athleteId, groups);
  }

  return result;
}
