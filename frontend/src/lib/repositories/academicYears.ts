import { STORAGE_KEYS } from '@/lib/storage';
import { AcademicYear, ID, NewAcademicYear, Scope } from '@/types';
import {
  createCollectionItem,
  deleteCollectionItem,
  getCollectionItem,
  listCollection,
  updateCollectionItem,
} from './base';

export async function listAcademicYears(scope: Scope): Promise<AcademicYear[]> {
  return listCollection<AcademicYear>(STORAGE_KEYS.ACADEMIC_YEARS, scope);
}

export async function getAcademicYear(id: ID): Promise<AcademicYear | null> {
  return getCollectionItem<AcademicYear>(STORAGE_KEYS.ACADEMIC_YEARS, id);
}

export async function getCurrentAcademicYear(scope: Scope): Promise<AcademicYear | null> {
  const years = await listCollection<AcademicYear>(STORAGE_KEYS.ACADEMIC_YEARS, scope, (y) => y.isCurrent);
  return years[0] ?? null;
}

export async function createAcademicYear(input: NewAcademicYear): Promise<AcademicYear> {
  return createCollectionItem<AcademicYear>(STORAGE_KEYS.ACADEMIC_YEARS, input, 'ay');
}

export async function updateAcademicYear(
  id: ID,
  patch: Partial<AcademicYear>
): Promise<AcademicYear> {
  return updateCollectionItem<AcademicYear>(STORAGE_KEYS.ACADEMIC_YEARS, id, patch);
}

export async function deleteAcademicYear(id: ID): Promise<void> {
  return deleteCollectionItem<AcademicYear>(STORAGE_KEYS.ACADEMIC_YEARS, id);
}
