import type { Race, BoatLayout } from '../types';

export interface ConflictGroup {
  sessionLabel: string; // fixed label, e.g. "Back-to-back races"
  races: { id: string; name: string }[];
}

const BACK_TO_BACK_LABEL = 'Back-to-back races';

// Warn when an athlete is entered in two CONSECUTIVE races, in the order the user has
// arranged them (drag-to-reorder). The `races` array is already in that display order, so
// "consecutive" means adjacent positions in the array — the athlete has no time to get out
// of one boat and into the next.
export function computeAthleteConflicts(
  races: Race[],
  layouts: Record<string, BoatLayout>
): Map<number, ConflictGroup[]> {
  // athleteId → sorted list of race indices (positions in the ordered races array)
  const positions = new Map<number, number[]>();

  races.forEach((race, index) => {
    const layout = layouts[race.id];
    if (!layout) return;
    const ids = new Set<number>();
    layout.left.forEach(id => id !== null && ids.add(id));
    layout.right.forEach(id => id !== null && ids.add(id));
    if (layout.drummer !== null) ids.add(layout.drummer);
    if (layout.helm !== null) ids.add(layout.helm);
    layout.reserves.forEach(id => id !== null && ids.add(id));

    for (const id of ids) {
      const list = positions.get(id);
      if (list) list.push(index);
      else positions.set(id, [index]);
    }
  });

  const result = new Map<number, ConflictGroup[]>();
  for (const [athleteId, indices] of positions) {
    // indices are already ascending (races iterated in order)
    const groups: ConflictGroup[] = [];
    let run: number[] = [];
    const flush = () => {
      if (run.length > 1) {
        groups.push({
          sessionLabel: BACK_TO_BACK_LABEL,
          races: run.map(i => ({ id: races[i].id, name: races[i].name })),
        });
      }
      run = [];
    };
    for (const idx of indices) {
      if (run.length === 0 || idx === run[run.length - 1] + 1) {
        run.push(idx);
      } else {
        flush();
        run.push(idx);
      }
    }
    flush();
    if (groups.length > 0) result.set(athleteId, groups);
  }
  return result;
}
