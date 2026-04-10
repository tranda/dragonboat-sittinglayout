import * as XLSX from 'xlsx';
import type { Athlete, Race, BoatLayout } from '../types';

export interface ImportResult {
  athletes: Athlete[];
  races: Race[];
  layouts: Record<string, BoatLayout>;
}

export function importFromExcel(file: File): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const result = parseWorkbook(wb);
        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

function parseWorkbook(wb: XLSX.WorkBook): ImportResult {
  const athletes: Athlete[] = [];
  const races: Race[] = [];
  const layouts: Record<string, BoatLayout> = {};

  // Parse Paddlers sheet
  const paddlersSheet = wb.Sheets['Paddlers'];
  if (paddlersSheet) {
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(paddlersSheet, { header: 1 }) as unknown[][];

    // Row 0 = headers with race names starting from column 13 (N)
    const headerRow = rows[0] as string[];
    const raceCols: Record<number, string> = {};
    for (let col = 13; col < (headerRow?.length ?? 0); col++) {
      if (headerRow[col]) raceCols[col] = String(headerRow[col]);
    }

    // Women in women-only races
    const womenRaces = Object.values(raceCols).filter(n => n.includes('Women'));
    const openRaces = Object.values(raceCols).filter(n => n.toLowerCase().includes('open'));

    // Parse athletes starting from row 3
    for (let r = 3; r < rows.length; r++) {
      const row = rows[r] as (string | number | null)[];
      if (!row) continue;
      const name = row[1];
      if (!name || name === 'empty') continue;

      const weight = typeof row[2] === 'number' ? row[2] : 0;
      const yearRaw = row[3];
      const yearOfBirth = typeof yearRaw === 'number' ? yearRaw : undefined;

      const assignments: string[] = [];
      for (const [colStr, raceName] of Object.entries(raceCols)) {
        const col = parseInt(colStr);
        const val = row[col];
        if (val && String(val).trim().toLowerCase() === 'x') {
          assignments.push(raceName);
        }
      }

      // Determine gender
      const inWomen = assignments.some(a => a.includes('Women'));
      const inOpen = assignments.some(a => a.toLowerCase().includes('open'));
      let gender: 'M' | 'F' = 'F';
      if (inOpen && !inWomen) gender = 'M';
      else if (!inWomen && !inOpen) {
        // Guess from first name
        const firstName = String(name).trim().split(' ')[0];
        gender = firstName.endsWith('a') ? 'F' : 'M';
      }

      athletes.push({
        id: r - 2,
        name: String(name).trim(),
        weight,
        gender,
        yearOfBirth,
        raceAssignments: assignments,
      });
    }
  }

  // Parse boat layout sheets
  const skipSheets = ['Paddlers', 'Benches', 'TEMPLATE Standard boat', 'TEMPLATE Small boat'];
  for (const sheetName of wb.SheetNames) {
    if (skipSheets.includes(sheetName)) continue;

    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1 }) as unknown[][];
    if (!rows || rows.length < 10) continue;

    // Determine boat type
    const templateRef = rows[1]?.[0] ? String(rows[1][0]) : '';
    const isSmall = templateRef.includes('Small') || sheetName.startsWith('SM ');
    const boatType = isSmall ? 'small' : 'standard';
    const numRows = isSmall ? 5 : 10;

    const raceId = sheetName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '');
    let distance = '';
    for (const d of ['200m', '500m', '1000m', '2000m']) {
      if (sheetName.includes(d)) { distance = d; break; }
    }

    races.push({
      id: raceId,
      name: sheetName,
      boatType,
      numRows,
      distance,
      category: sheetName.replace(distance, '').trim(),
    });

    // Parse layout
    const findAthleteId = (name: unknown): number | null => {
      if (!name || name === 'Empty' || name === 'empty') return null;
      const n = String(name).trim();
      const found = athletes.find(a => a.name === n);
      return found?.id ?? null;
    };

    // Drummer at row 8, col 5 (0-indexed)
    const drummerName = rows[8]?.[5];
    const drummer = findAthleteId(drummerName);

    // Helm
    const helmRow = isSmall ? 27 : 37;
    const helmName = rows[helmRow]?.[5];
    const helm = findAthleteId(helmName);

    // Seats: left=col 3, right=col 7, rows starting at 13, every 2 rows
    const left: (number | null)[] = [];
    const right: (number | null)[] = [];
    for (let i = 0; i < numRows; i++) {
      const seatRow = 13 + (i * 2);
      left.push(findAthleteId(rows[seatRow]?.[3]));
      right.push(findAthleteId(rows[seatRow]?.[7]));
    }

    layouts[raceId] = { drummer, helm, left, right, reserves: [] };
  }

  return { athletes, races, layouts };
}
