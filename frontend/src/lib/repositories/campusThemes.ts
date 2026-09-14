/**
 * Per-campus design overrides. Used only when Settings.branding.designMode
 * is 'per-campus'. One record per campus (id === campusId), managed
 * exclusively by super_admin.
 */

import { getItem, setItem, STORAGE_KEYS } from '@/lib/storage';
import { CampusTheme, ID, NewCampusTheme, Scope } from '@/types';
import { listCollection } from './base';

export async function listCampusThemes(scope: Scope): Promise<CampusTheme[]> {
  return listCollection<CampusTheme>(STORAGE_KEYS.CAMPUS_THEMES, scope);
}

export async function getCampusTheme(campusId: ID): Promise<CampusTheme | null> {
  const items = getItem<CampusTheme[]>(STORAGE_KEYS.CAMPUS_THEMES, []) ?? [];
  return items.find((t) => t.campusId === campusId) ?? null;
}

/**
 * Creates or replaces the theme override for a campus (upsert, keyed by campusId).
 */
export async function setCampusTheme(input: NewCampusTheme): Promise<CampusTheme> {
  const items = getItem<CampusTheme[]>(STORAGE_KEYS.CAMPUS_THEMES, []) ?? [];
  const now = new Date().toISOString();
  const record: CampusTheme = {
    ...input,
    id: input.campusId,
    updatedAt: now,
  };

  const index = items.findIndex((t) => t.campusId === input.campusId);
  if (index === -1) {
    items.push(record);
  } else {
    items[index] = record;
  }
  setItem(STORAGE_KEYS.CAMPUS_THEMES, items);
  return record;
}

/**
 * Removes a campus's theme override, causing it to fall back to the
 * school-wide default theme.
 */
export async function clearCampusTheme(campusId: ID): Promise<void> {
  const items = getItem<CampusTheme[]>(STORAGE_KEYS.CAMPUS_THEMES, []) ?? [];
  setItem(STORAGE_KEYS.CAMPUS_THEMES, items.filter((t) => t.campusId !== campusId));
}
