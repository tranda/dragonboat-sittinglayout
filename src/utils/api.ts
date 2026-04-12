const API_BASE = '/api';

let authToken: string | null = localStorage.getItem('dragonboat-token');
let activeCompetitionId: number | null = (() => {
  try { return JSON.parse(localStorage.getItem('dragonboat-competition') ?? 'null'); }
  catch { return null; }
})();
let activeTeamId: number | null = (() => {
  try { return JSON.parse(localStorage.getItem('dragonboat-team') ?? 'null'); }
  catch { return null; }
})();

export function setCompetitionId(id: number | null) {
  activeCompetitionId = id;
  if (id) localStorage.setItem('dragonboat-competition', JSON.stringify(id));
  else localStorage.removeItem('dragonboat-competition');
}
export function getCompetitionId() { return activeCompetitionId; }

export function setTeamId(id: number | null) {
  activeTeamId = id;
  if (id) localStorage.setItem('dragonboat-team', JSON.stringify(id));
  else localStorage.removeItem('dragonboat-team');
}
export function getTeamId() { return activeTeamId; }

function headers(json = false): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/json' };
  if (authToken) h['Authorization'] = `Bearer ${authToken}`;
  if (activeCompetitionId) h['X-Competition-Id'] = String(activeCompetitionId);
  if (activeTeamId) h['X-Team-Id'] = String(activeTeamId);
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: headers(!!body),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    authToken = null;
    localStorage.removeItem('dragonboat-token');
    window.location.reload();
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || err.message || 'Request failed');
  }
  return res.json();
}

// Auth
export async function login(email: string, password: string) {
  const data = await request<{ token: string; user: ApiUser }>('POST', '/login', { email, password });
  authToken = data.token;
  localStorage.setItem('dragonboat-token', data.token);
  return data;
}

export function logout() {
  request('POST', '/logout').catch(() => {
    // Server-side token cleanup failed — local cleanup still proceeds
  });
  authToken = null;
  localStorage.removeItem('dragonboat-token');
  localStorage.removeItem('dragonboat-competition');
  localStorage.removeItem('dragonboat-team');
  localStorage.removeItem('dragonboat-race');
  localStorage.removeItem('dragonboat-view');
  activeCompetitionId = null;
  activeTeamId = null;
}

export function getToken() { return authToken; }
export function isLoggedIn() { return !!authToken; }

// Init (all data at once)
export function fetchInit() {
  return request<ApiInitData>('GET', '/init');
}

// Athletes
export function createAthlete(data: Record<string, unknown>) {
  return request<ApiAthlete>('POST', '/athletes', data);
}
export function updateAthlete(id: number, data: Record<string, unknown>) {
  return request<ApiAthlete>('PUT', `/athletes/${id}`, data);
}
export function removeAthlete(id: number) {
  return request('DELETE', `/athletes/${id}`);
}
export function restoreAthlete(id: number) {
  return request('POST', `/athletes/${id}/restore`);
}

// Races
export function createRace(data: Record<string, unknown>) {
  return request('POST', '/races', data);
}
export function updateRace(id: string, data: Record<string, unknown>) {
  return request('PUT', `/races/${id}`, data);
}
export function deleteRace(id: string) {
  return request('DELETE', `/races/${id}`);
}
export function duplicateRace(id: string) {
  return request('POST', `/races/${id}/duplicate`);
}
export function reorderRaces(ids: string[]) {
  return request('POST', '/races/reorder', { ids });
}

// Layouts
export function saveLayout(raceId: string, layout: { drummer: number | null; helm: number | null; left: (number | null)[]; right: (number | null)[]; reserves: (number | null)[] }) {
  return request('PUT', `/layouts/${raceId}`, layout);
}

// Config
export function fetchConfig() {
  return request('GET', '/config');
}
export function saveConfigApi(data: Record<string, unknown>) {
  return request('PUT', '/config', data);
}

// Users (admin only)
export function fetchUsers() {
  return request<ApiUser[]>('GET', '/users');
}
export function createUser(data: Record<string, unknown>) {
  return request('POST', '/users', data);
}
export function updateUser(id: number, data: Record<string, unknown>) {
  return request('PUT', `/users/${id}`, data);
}
export function deleteUser(id: number) {
  return request('DELETE', `/users/${id}`);
}

// PDF token
export async function getPdfToken(): Promise<string> {
  const data = await request<{ token: string }>('POST', '/pdf-token');
  return data.token;
}

// Competitions
export function fetchCompetitions() {
  return request<ApiCompetitionFull[]>('GET', '/competitions');
}
export function createCompetition(data: Record<string, unknown>) {
  return request<ApiCompetitionFull>('POST', '/competitions', data);
}
export function updateCompetition(id: number, data: Record<string, unknown>) {
  return request<ApiCompetitionFull>('PUT', `/competitions/${id}`, data);
}
export function deleteCompetition(id: number) {
  return request('DELETE', `/competitions/${id}`);
}
export function addTeamToCompetition(compId: number, teamId: number) {
  return request('POST', `/competitions/${compId}/teams`, { team_id: teamId });
}
export function removeTeamFromCompetition(compId: number, teamId: number) {
  return request('DELETE', `/competitions/${compId}/teams/${teamId}`);
}

export interface ApiCompetitionFull {
  id: number;
  name: string;
  year: number;
  location: string | null;
  is_active: boolean;
  teams?: { id: number; name: string }[];
}

// Teams
export function fetchTeams() {
  return request<ApiTeam[]>('GET', '/teams');
}
export function createTeam(data: Record<string, unknown>) {
  return request<ApiTeam>('POST', '/teams', data);
}
export function updateTeam(id: number, data: Record<string, unknown>) {
  return request<ApiTeam>('PUT', `/teams/${id}`, data);
}
export function deleteTeam(id: number) {
  return request('DELETE', `/teams/${id}`);
}

export interface ApiTeam {
  id: number;
  name: string;
  country: string | null;
  type: string;
  users_count?: number;
  athletes_count?: number;
}

// Activity log
export function fetchActivityLog(limit = 50) {
  return request<ActivityLogEntry[]>('GET', `/activity-log?limit=${limit}`);
}

export interface ActivityLogEntry {
  id: number;
  user_name: string | null;
  action: string;
  entity_type: string;
  entity_name: string | null;
  details: string | null;
  created_at: string;
}

// Types
export interface ApiUser {
  id: number;
  name: string;
  email: string;
  role: string;
  athlete_id: number | null;
  is_active: boolean;
  team?: { id: number; name: string } | null;
}

export interface ApiCompetition {
  id: number;
  name: string;
  year: number;
  location: string | null;
  isActive: boolean;
}

export interface ApiAthlete {
  id: number;
  name: string;
  weight: number;
  gender: 'M' | 'F';
  yearOfBirth?: number;
  isBCP?: boolean;
  preferredSide?: 'left' | 'right' | 'both' | null;
  isHelm?: boolean;
  isDrummer?: boolean;
  edbfId?: string | null;
  notes?: string | null;
  isRemoved?: boolean;
  raceAssignments: string[];
}

export interface ApiInitData {
  athletes: ApiAthlete[];
  races: Array<{
    id: string;
    name: string;
    boatType: 'standard' | 'small';
    numRows: number;
    distance: string;
    genderCategory: string;
    ageCategory: string;
    category: string;
  }>;
  layouts: Record<string, {
    drummer: number | null;
    helm: number | null;
    left: (number | null)[];
    right: (number | null)[];
    reserves: number[];
  }>;
  config: {
    competitionYear: number;
    genderPolicy: unknown;
    ageCategoryRules: unknown;
  };
  benchFactors: Record<string, number[]>;
  user: ApiUser;
  teams: { id: number; name: string }[];
  competitions: ApiCompetition[];
  activeTeamId: number | null;
  activeCompetitionId: number | null;
}
