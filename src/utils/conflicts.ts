import type { Race, BoatLayout } from '../types';

export interface ConflictGroup {
  sessionLabel: string; // e.g. "200m — Mixed" or "500m — Open/Women"
  races: { id: string; name: string }[];
}

// Race scheduling assumption (no real schedule stored):
// - One distance per day → distance defines the "day"
// - First part of day: Mixed crews
// - Second part of day: Open + Women crews
// → Two races collide if same distance AND same gender-grouping (Mixed vs Open+Women)
function getSessionKey(race: Race): { key: string; label: string } {
  const isMixed = race.genderCategory === 'Mixed';
  const groupKey = isMixed ? 'mixed' : 'open-women';
  const groupLabel = isMixed ? 'Mixed' : 'Open/Women';
  return {
    key: `${race.distance}-${groupKey}`,
    label: `${race.distance} — ${groupLabel}`,
  };
}

export function computeAthleteConflicts(
  races: Race[],
  layouts: Record<string, BoatLayout>
): Map<number, ConflictGroup[]> {
  // athleteId → sessionKey → races[]
  const map = new Map<number, Map<string, { label: string; races: { id: string; name: string }[] }>>();

  for (const race of races) {
    const layout = layouts[race.id];
    if (!layout) continue;
    const ids = new Set<number>();
    layout.left.forEach(id => id !== null && ids.add(id));
    layout.right.forEach(id => id !== null && ids.add(id));
    if (layout.drummer !== null) ids.add(layout.drummer);
    if (layout.helm !== null) ids.add(layout.helm);
    layout.reserves.forEach(id => id !== null && ids.add(id));

    const { key, label } = getSessionKey(race);
    for (const id of ids) {
      let perAthlete = map.get(id);
      if (!perAthlete) {
        perAthlete = new Map();
        map.set(id, perAthlete);
      }
      let entry = perAthlete.get(key);
      if (!entry) {
        entry = { label, races: [] };
        perAthlete.set(key, entry);
      }
      entry.races.push({ id: race.id, name: race.name });
    }
  }

  // Keep only groups with more than one race
  const result = new Map<number, ConflictGroup[]>();
  for (const [athleteId, sessions] of map) {
    const conflicts: ConflictGroup[] = [];
    for (const [, entry] of sessions) {
      if (entry.races.length > 1) {
        conflicts.push({ sessionLabel: entry.label, races: entry.races });
      }
    }
    if (conflicts.length > 0) result.set(athleteId, conflicts);
  }
  return result;
}
