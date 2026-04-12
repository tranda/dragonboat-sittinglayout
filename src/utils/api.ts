const API_BASE = '/api';

let authToken: string | null = localStorage.getItem('dragonboat-token');

function headers(json = false): Record<string, string> {
  const h: Record<string, string> = { Accept: 'application/json' };
  if (authToken) h['Authorization'] = `Bearer ${authToken}`;
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
  request('POST', '/logout').catch(() => {});
  authToken = null;
  localStorage.removeItem('dragonboat-token');
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
export function saveLayout(raceId: string, layout: { drummer: number | null; helm: number | null; left: (number | null)[]; right: (number | null)[]; reserves: number[] }) {
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

// Types
export interface ApiUser {
  id: number;
  name: string;
  email: string;
  role: string;
  athlete_id: number | null;
  is_active: boolean;
}

export interface ApiAthlete {
  id: number;
  name: string;
  weight: number;
  gender: 'M' | 'F';
  yearOfBirth?: number;
  isBCP?: boolean;
  preferredSide?: 'left' | 'right' | 'both' | null;
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
}
