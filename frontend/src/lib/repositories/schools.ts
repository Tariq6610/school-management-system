import { STORAGE_KEYS } from '@/lib/storage';
import { ID, NewSchool, School } from '@/types';
import {
  createCollectionItem,
  deleteCollectionItem,
  getCollectionItem,
  listCollection,
  updateCollectionItem,
} from './base';

export async function listSchools(): Promise<School[]> {
  return listCollection<School>(STORAGE_KEYS.SCHOOLS);
}

export async function getSchool(id: ID): Promise<School | null> {
  return getCollectionItem<School>(STORAGE_KEYS.SCHOOLS, id);
}

export async function createSchool(input: NewSchool): Promise<School> {
  return createCollectionItem<School>(STORAGE_KEYS.SCHOOLS, input, 'sch');
}

export async function updateSchool(id: ID, patch: Partial<School>): Promise<School> {
  return updateCollectionItem<School>(STORAGE_KEYS.SCHOOLS, id, patch);
}

export async function deleteSchool(id: ID): Promise<void> {
  return deleteCollectionItem<School>(STORAGE_KEYS.SCHOOLS, id);
}
