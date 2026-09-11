import { STORAGE_KEYS } from '@/lib/storage';
import { Campus, ID, NewCampus, Scope } from '@/types';
import {
  createCollectionItem,
  deleteCollectionItem,
  getCollectionItem,
  listCollection,
  updateCollectionItem,
} from './base';

export async function listCampuses(scope: Scope): Promise<Campus[]> {
  return listCollection<Campus>(STORAGE_KEYS.CAMPUSES, scope);
}

export async function getCampus(id: ID): Promise<Campus | null> {
  return getCollectionItem<Campus>(STORAGE_KEYS.CAMPUSES, id);
}

export async function createCampus(input: NewCampus): Promise<Campus> {
  return createCollectionItem<Campus>(STORAGE_KEYS.CAMPUSES, input, 'cmp');
}

export async function updateCampus(id: ID, patch: Partial<Campus>): Promise<Campus> {
  return updateCollectionItem<Campus>(STORAGE_KEYS.CAMPUSES, id, patch);
}

export async function deleteCampus(id: ID): Promise<void> {
  return deleteCollectionItem<Campus>(STORAGE_KEYS.CAMPUSES, id);
}
