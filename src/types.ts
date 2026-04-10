export interface Athlete {
  id: number;
  name: string;
  weight: number;
  gender: 'M' | 'F';
  yearOfBirth?: number;
  category?: string; // calculated from yearOfBirth + gender via policy (TBD)
  raceAssignments: string[];
}

export type GenderCategory = 'Open' | 'Women' | 'Mixed';
export type AgeCategory = '18U' | '24U' | 'Premier' | 'Senior A' | 'Senior B' | 'Senior C' | 'Senior D' | 'BCP';

export interface Race {
  id: string;
  name: string;
  boatType: 'standard' | 'small';
  numRows: number;
  distance: string;
  genderCategory: GenderCategory;
  ageCategory: AgeCategory;
  category: string; // legacy, can be derived
}

export interface BoatLayout {
  drummer: number | null;
  helm: number | null;
  left: (number | null)[];
  right: (number | null)[];
  reserves: number[];
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
}
