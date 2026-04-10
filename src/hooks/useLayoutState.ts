import { useState, useCallback, useEffect } from 'react';
import type { Race, BoatLayout, AppData, GenderCategory, AgeCategory } from '../types';

const STORAGE_KEY = 'dragonboat-layouts';
const RACES_STORAGE_KEY = 'dragonboat-races';

function loadFromStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveToStorage(key: string, data: unknown) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function useLayoutState(initialData: AppData) {
  const [races, setRaces] = useState<Race[]>(() => {
    const saved = loadFromStorage<Race[]>(RACES_STORAGE_KEY);
    if (saved) {
      // Merge new fields from initial data into saved races
      return saved.map(sr => {
        const initial = initialData.races.find(ir => ir.id === sr.id);
        return {
          ...sr,
          genderCategory: sr.genderCategory ?? initial?.genderCategory ?? 'Open',
          ageCategory: sr.ageCategory ?? initial?.ageCategory ?? 'Premier',
        } as Race;
      });
    }
    return initialData.races;
  });

  const [layouts, setLayouts] = useState<Record<string, BoatLayout>>(() => {
    const saved = loadFromStorage<Record<string, BoatLayout>>(STORAGE_KEY);
    if (saved) {
      // Merge: keep saved layouts, add any missing from initial data
      const merged = { ...initialData.layouts };
      for (const [k, v] of Object.entries(saved)) {
        merged[k] = v;
      }
      return merged;
    }
    return initialData.layouts;
  });

  useEffect(() => {
    saveToStorage(STORAGE_KEY, layouts);
  }, [layouts]);

  useEffect(() => {
    saveToStorage(RACES_STORAGE_KEY, races);
  }, [races]);

  const updateLayout = useCallback((raceId: string, layout: BoatLayout) => {
    setLayouts(prev => ({ ...prev, [raceId]: layout }));
  }, []);

  const resetLayout = useCallback((raceId: string) => {
    if (initialData.layouts[raceId]) {
      setLayouts(prev => ({ ...prev, [raceId]: initialData.layouts[raceId] }));
    }
  }, [initialData]);

  const resetAll = useCallback(() => {
    setLayouts(initialData.layouts);
    setRaces(initialData.races);
  }, [initialData]);

  const addRace = useCallback((name: string, boatType: 'standard' | 'small', distance: string, genderCategory: GenderCategory = 'Open', ageCategory: AgeCategory = 'Senior B') => {
    const id = name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') + '_' + Date.now();
    const numRows = boatType === 'standard' ? 10 : 5;
    const newRace: Race = { id, name, boatType, numRows, distance, genderCategory, ageCategory, category: name };
    const emptyLayout: BoatLayout = {
      drummer: null,
      helm: null,
      left: Array(numRows).fill(null),
      right: Array(numRows).fill(null),
      reserves: [],
    };
    setRaces(prev => [...prev, newRace]);
    setLayouts(prev => ({ ...prev, [id]: emptyLayout }));
    return id;
  }, []);

  const removeRace = useCallback((raceId: string) => {
    setRaces(prev => prev.filter(r => r.id !== raceId));
    setLayouts(prev => {
      const next = { ...prev };
      delete next[raceId];
      return next;
    });
  }, []);

  const duplicateRace = useCallback((raceId: string, newName: string) => {
    const source = races.find(r => r.id === raceId);
    if (!source) return null;
    const id = newName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '') + '_' + Date.now();
    const newRace: Race = { ...source, id, name: newName };
    const layoutCopy: BoatLayout = JSON.parse(JSON.stringify(layouts[raceId]));
    setRaces(prev => [...prev, newRace]);
    setLayouts(prev => ({ ...prev, [id]: layoutCopy }));
    return id;
  }, [races, layouts]);

  const renameRace = useCallback((raceId: string, newName: string) => {
    setRaces(prev => prev.map(r => r.id === raceId ? { ...r, name: newName } : r));
  }, []);

  return {
    races,
    layouts,
    updateLayout,
    resetLayout,
    resetAll,
    addRace,
    removeRace,
    duplicateRace,
    renameRace,
  };
}
