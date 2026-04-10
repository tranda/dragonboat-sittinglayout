import * as XLSX from 'xlsx';
import type { Athlete, Race, BoatLayout } from '../types';

export function exportToExcel(
  races: Race[],
  layouts: Record<string, BoatLayout>,
  athleteMap: Map<number, Athlete>
) {
  const wb = XLSX.utils.book_new();

  const getName = (id: number | null) =>
    id !== null ? (athleteMap.get(id)?.name ?? 'Empty') : 'Empty';
  const getWeight = (id: number | null) =>
    id !== null ? (athleteMap.get(id)?.weight ?? 0) : 0;

  for (const race of races) {
    const layout = layouts[race.id];
    if (!layout) continue;

    const rows: (string | number)[][] = [];
    rows.push([race.name, '', race.boatType, race.distance]);
    rows.push([]);
    rows.push(['Row', 'LEFT', 'Weight', '', 'RIGHT', 'Weight']);

    rows.push(['DRUMMER', getName(layout.drummer), getWeight(layout.drummer)]);
    rows.push([]);

    for (let i = 0; i < layout.left.length; i++) {
      rows.push([
        i + 2,
        getName(layout.left[i]),
        getWeight(layout.left[i]),
        '',
        getName(layout.right[i]),
        getWeight(layout.right[i]),
      ]);
    }

    rows.push([]);
    rows.push(['HELM', getName(layout.helm), getWeight(layout.helm)]);
    rows.push([]);
    rows.push(['RESERVES']);
    for (const rid of layout.reserves) {
      rows.push(['', getName(rid), getWeight(rid)]);
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const safeName = race.name.substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  }

  XLSX.writeFile(wb, 'dragon-boat-layout.xlsx');
}
