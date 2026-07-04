export interface Athlete {
  id: number;
  name: string;
  weight: number;
  gender: 'M' | 'F';
  yearOfBirth?: number;
  isBCP?: boolean; // manually set — Breast Cancer Paddler designation
  preferredSide?: 'left' | 'right' | 'both' | null;
  isHelm?: boolean;
  isDrummer?: boolean;
  edbfId?: string | null;
  notes?: string | null;
  isRemoved?: boolean;
  isRegistered?: boolean;
  category?: string; // calculated from yearOfBirth + gender via policy (TBD)
  raceAssignments: string[];
}

export type GenderCategory = 'Open' | 'Women' | 'Mixed';
export type AgeCategory = '18U' | '24U' | 'Premier' | 'Senior A' | 'Senior B' | 'Senior C' | 'Senior D' | 'BCP';

// Fixed list of race stages/rounds, shown in the per-race edit dropdown.
export const RACE_STAGES = [
  'Heat 1', 'Heat 2', 'Heat 3', 'Heat 4',
  'Repechage', 'Repechage 1', 'Repechage 2', 'Repechage 3', 'Repechage 4',
  'Semifinal', 'Semifinal 1', 'Semifinal 2', 'Semifinal 3', 'Semifinal 4',
  'Minor Final', 'Grand Final', 'Final',
] as const;
export type RaceStage = (typeof RACE_STAGES)[number];

export interface Race {
  id: string;
  name: string;
  boatType: 'standard' | 'small';
  numRows: number;
  distance: string;
  genderCategory: GenderCategory;
  ageCategory: AgeCategory;
  category: string; // legacy, can be derived
  stage?: string | null; // race round/stage label, e.g. "Semi Final" (from RACE_STAGES)
  scheduledTime?: string | null; // ISO 8601 datetime of the race, or null if unscheduled
}

export interface BoatLayout {
  drummer: number | null;
  helm: number | null;
  left: (number | null)[];
  right: (number | null)[];
  reserves: (number | null)[];
}

export interface AppData {
  athletes: Athlete[];
  benchFactors: {
    standard: number[];
    small: number[];
  };
  races: Race[];
  layouts: Record<string, BoatLayout>;
}

export type SeatPosition =
  | { type: 'left'; row: number }
  | { type: 'right'; row: number }
  | { type: 'drummer' }
  | { type: 'helm' }
  | { type: 'reserve'; index: number }
  | { type: 'bench' };

// --- Policies / Config ---

export interface AgeCategoryRule {
  category: AgeCategory;
  minAge?: number; // athlete age must be >= this
  maxAge?: number; // athlete age must be <= this
}

export interface MixedBoatRatio {
  standard: { minSameGender: number; maxSameGender: number }; // for 20-paddler boat
  small: { minSameGender: number; maxSameGender: number };    // for 10-paddler boat
}

export interface GenderPolicy {
  // Women boat: only gender 'F' allowed
  // Open boat: no restriction
  // Mixed boat: each gender must have between min and max count
  mixedRatio: MixedBoatRatio;
}

export interface AppConfig {
  competitionYear: number;
  ageCategoryRules: AgeCategoryRule[];
  genderPolicy: GenderPolicy;
  reserves?: { standard: number; small: number };
}
