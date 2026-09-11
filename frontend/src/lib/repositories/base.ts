/**
 * Base generic storage operations for all collection repositories.
 * Reference: DEVELOPMENT_GUIDELINES.md §2 & DATA_MODELS.md §7
 */

import { getItem, setItem } from '@/lib/storage';
import { ID, Scope } from '@/types';

export function generateId(prefix: string): string {
  const rand = Math.random().toString(36).substring(2, 8);
  const ts = Date.now().toString(36);
  return `${prefix}_${ts}_${rand}`;
}

export async function listCollection<
  T extends { id: ID; schoolId?: ID; campusId?: ID; classId?: ID }
>(
  key: string,
  scope?: Scope,
  predicate?: (item: T) => boolean
): Promise<T[]> {
  const items = getItem<T[]>(key, []) ?? [];
  return items.filter((item) => {
    if (scope) {
      if (scope.schoolId && item.schoolId && item.schoolId !== scope.schoolId) {
        return false;
      }
      if (scope.campusId && item.campusId && item.campusId !== scope.campusId) {
        return false;
      }
      if (scope.classId && item.classId && item.classId !== scope.classId) {
        return false;
      }
    }
    if (predicate && !predicate(item)) {
      return false;
    }
    return true;
  });
}

export async function getCollectionItem<T extends { id: ID }>(
  key: string,
  id: ID
): Promise<T | null> {
  const items = getItem<T[]>(key, []) ?? [];
  return items.find((i) => i.id === id) ?? null;
}

export async function createCollectionItem<T extends { id: ID }>(
  key: string,
  input: Omit<T, 'id'>,
  idPrefix: string
): Promise<T> {
  const items = getItem<T[]>(key, []) ?? [];
  const newItem = {
    ...input,
    id: generateId(idPrefix),
  } as T;
  items.push(newItem);
  setItem(key, items);
  return newItem;
}

export async function updateCollectionItem<T extends { id: ID }>(
  key: string,
  id: ID,
  patch: Partial<T>
): Promise<T> {
  const items = getItem<T[]>(key, []) ?? [];
  const index = items.findIndex((i) => i.id === id);
  if (index === -1) {
    throw new Error(`Record with id "${id}" not found in collection "${key}"`);
  }
  const updated = { ...items[index], ...patch, id } as T;
  items[index] = updated;
  setItem(key, items);
  return updated;
}

export async function deleteCollectionItem<T extends { id: ID }>(
  key: string,
  id: ID
): Promise<void> {
  const items = getItem<T[]>(key, []) ?? [];
  const filtered = items.filter((i) => i.id !== id);
  setItem(key, filtered);
}

export async function setEntireCollection<T>(key: string, items: T[]): Promise<void> {
  setItem(key, items);
}
