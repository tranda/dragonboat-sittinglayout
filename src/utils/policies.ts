import type { AppConfig, Athlete, Race, BoatLayout, AgeCategory } from '../types';

export const DEFAULT_CONFIG: AppConfig = {
  competitionYear: 2026,
  ageCategoryRules: [
    { category: '18U', maxAge: 18 },
    { category: '24U', maxAge: 24 },
    { category: 'Premier' },                    // no age restriction
    { category: 'Senior A', minAge: 40 },
    { category: 'Senior B', minAge: 50 },
    { category: 'Senior C', minAge: 60 },
    { category: 'Senior D', minAge: 70 },
    { category: 'BCP' },                         // no age restriction (breast cancer paddlers)
  ],
  genderPolicy: {
    mixedRatio: {
      standard: { minSameGender: 8, maxSameGender: 12 },  // 20-paddler: each gender 8-12
      small: { minSameGender: 4, maxSameGender: 6 },      // 10-paddler: each gender 4-6
    },
  },
};

const CONFIG_KEY = 'dragonboat-config';

export function loadConfig(): AppConfig {
  try {
    const saved = localStorage.getItem(CONFIG_KEY);
    if (saved) return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
  } catch { /* ignore */ }
  return DEFAULT_CONFIG;
}

export function saveConfig(config: AppConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

/** Calculate athlete's age at competition time */
export function getAthleteAge(athlete: Athlete, competitionYear: number): number | null {
  if (!athlete.yearOfBirth) return null;
  return competitionYear - athlete.yearOfBirth;
}

/** Determine which age category an athlete qualifies for */
export function getAthleteAgeCategory(athlete: Athlete, config: AppConfig): AgeCategory | null {
  const age = getAthleteAge(athlete, config.competitionYear);
  if (age === null) return null;

  // Check from most restrictive to least
  // Youth: must be under max age
  if (age <= 18) return '18U';
  if (age <= 24) return '24U';

  // Seniors: qualify based on min age (higher category = older)
  if (age >= 70) return 'Senior D';
  if (age >= 60) return 'Senior C';
  if (age >= 50) return 'Senior B';
  if (age >= 40) return 'Senior A';

  return 'Premier';
}

/** Check if an athlete is eligible for a race's age category */
export function isEligibleForAgeCategory(athlete: Athlete, raceAgeCategory: AgeCategory, config: AppConfig): boolean {
  const age = getAthleteAge(athlete, config.competitionYear);
  if (age === null) return true; // unknown age = allow (no restriction)

  const rule = config.ageCategoryRules.find(r => r.category === raceAgeCategory);
  if (!rule) return true;

  if (rule.minAge !== undefined && age < rule.minAge) return false;
  if (rule.maxAge !== undefined && age > rule.maxAge) return false;
  return true;
}

/** Check if an athlete's gender is allowed in a race */
export function isEligibleForGender(athlete: Athlete, race: Race): boolean {
  if (race.genderCategory === 'Open') return true;
  if (race.genderCategory === 'Women') return athlete.gender === 'F';
  // Mixed: both genders allowed, ratio enforced separately
  return true;
}

/**
 * Validate mixed boat ratio.
 * Mixed Class rules (IDBF CR2.1.3 / EDBF Amendments):
 * - Ratio applies to PADDLERS only (seated in rows)
 * - Drummers and Helms can be either gender
 * - Standard: min 8, max 10 paddlers of either gender
 * - Small: min 4, max 6 paddlers of either gender
 */
export function validateMixedRatio(
  layout: BoatLayout,
  race: Race,
  athleteMap: Map<number, Athlete>,
  config: AppConfig
): { valid: boolean; womenCount: number; menCount: number; minSameGender: number; maxSameGender: number } {
  if (race.genderCategory !== 'Mixed') {
    return { valid: true, womenCount: 0, menCount: 0, minSameGender: 0, maxSameGender: 0 };
  }

  const ratio = race.boatType === 'standard'
    ? config.genderPolicy.mixedRatio.standard
    : config.genderPolicy.mixedRatio.small;

  let womenCount = 0;
  let menCount = 0;

  // Ratio applies to PADDLERS ONLY — drummer and helm can be either gender
  const paddlerIds = [
    ...layout.left.filter(Boolean),
    ...layout.right.filter(Boolean),
  ].filter(Boolean) as number[];

  for (const id of paddlerIds) {
    const a = athleteMap.get(id);
    if (a?.gender === 'F') womenCount++;
    else if (a?.gender === 'M') menCount++;
  }

  const valid =
    womenCount >= ratio.minSameGender && womenCount <= ratio.maxSameGender &&
    menCount >= ratio.minSameGender && menCount <= ratio.maxSameGender;

  return { valid, womenCount, menCount, minSameGender: ratio.minSameGender, maxSameGender: ratio.maxSameGender };
}

export interface ValidationResult {
  genderViolations: { athleteId: number; message: string }[];
  ageViolations: { athleteId: number; message: string }[];
  mixedRatio: { valid: boolean; womenCount: number; menCount: number; minSameGender: number; maxSameGender: number };
}

/** Full validation of a boat layout against policies */
export function validateLayout(
  layout: BoatLayout,
  race: Race,
  athleteMap: Map<number, Athlete>,
  config: AppConfig
): ValidationResult {
  const genderViolations: { athleteId: number; message: string }[] = [];
  const ageViolations: { athleteId: number; message: string }[] = [];

  const allIds = [
    ...layout.left.filter(Boolean),
    ...layout.right.filter(Boolean),
    layout.drummer,
    layout.helm,
    ...layout.reserves.filter(Boolean),
  ].filter(Boolean) as number[];

  for (const id of allIds) {
    const a = athleteMap.get(id);
    if (!a) continue;

    if (!isEligibleForGender(a, race)) {
      genderViolations.push({ athleteId: id, message: `${a.name}: ${a.gender === 'M' ? 'men' : 'women'} not allowed in ${race.genderCategory} boat` });
    }

    if (!isEligibleForAgeCategory(a, race.ageCategory, config)) {
      const age = getAthleteAge(a, config.competitionYear);
      genderViolations.push({ athleteId: id, message: `${a.name}: age ${age} not eligible for ${race.ageCategory}` });
    }
  }

  const mixedRatio = validateMixedRatio(layout, race, athleteMap, config);

  return { genderViolations, ageViolations, mixedRatio };
}
