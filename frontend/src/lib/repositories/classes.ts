import { STORAGE_KEYS } from '@/lib/storage';
import { Class, ID, NewClass, Scope } from '@/types';
import {
  createCollectionItem,
  deleteCollectionItem,
  getCollectionItem,
  listCollection,
  updateCollectionItem,
} from './base';
import { listStudents } from './students';

export interface ClassFilter {
  campusId?: ID;
  grade?: string;
  search?: string;
  academicYearId?: ID;
}

export interface ClassUniqueValidationResult {
  isUnique: boolean;
  message?: string;
}

export interface ClassDeletionCheck {
  canDelete: boolean;
  studentCount: number;
  reason?: string;
}

export async function listClasses(scope: Scope, filter?: ClassFilter): Promise<Class[]> {
  return listCollection<Class>(STORAGE_KEYS.CLASSES, scope, (cls) => {
    if (filter?.campusId && cls.campusId !== filter.campusId) return false;
    if (filter?.grade && cls.grade !== filter.grade) return false;
    if (filter?.academicYearId && cls.academicYearId !== filter.academicYearId) return false;
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      const matchGrade = cls.grade.toLowerCase().includes(q);
      const matchSection = cls.section.toLowerCase().includes(q);
      const matchRoom = cls.room ? cls.room.toLowerCase().includes(q) : false;
      const matchCombo = `${cls.grade} ${cls.section}`.toLowerCase().includes(q);
      const matchDash = `${cls.grade} - ${cls.section}`.toLowerCase().includes(q);
      if (!matchGrade && !matchSection && !matchRoom && !matchCombo && !matchDash) return false;
    }
    return true;
  });
}

export async function getClass(id: ID): Promise<Class | null> {
  return getCollectionItem<Class>(STORAGE_KEYS.CLASSES, id);
}

export async function validateClassUnique(
  campusId: ID,
  grade: string,
  section: string,
  excludeClassId?: ID,
  scope?: Scope
): Promise<ClassUniqueValidationResult> {
  const effectiveScope: Scope = scope ?? { schoolId: 'sch_main' };
  const allClasses = await listCollection<Class>(STORAGE_KEYS.CLASSES, { schoolId: effectiveScope.schoolId });

  // Acceptance Criteria: Same grade+section allowed at different campuses!
  // Only check uniqueness within the *same* campus:
  const duplicate = allClasses.find(
    (c) =>
      c.campusId === campusId &&
      c.grade.trim().toLowerCase() === grade.trim().toLowerCase() &&
      c.section.trim().toLowerCase() === section.trim().toLowerCase() &&
      c.id !== excludeClassId
  );

  if (duplicate) {
    return {
      isUnique: false,
      message: `${grade.trim()} - Section ${section.trim()} already exists in this campus.`,
    };
  }

  return { isUnique: true };
}

export async function createClass(input: NewClass): Promise<Class> {
  return createCollectionItem<Class>(STORAGE_KEYS.CLASSES, input, 'cls');
}

export async function createClassWithValidation(
  input: NewClass,
  scope?: Scope
): Promise<{ success: boolean; class?: Class; error?: string }> {
  const validation = await validateClassUnique(input.campusId, input.grade, input.section, undefined, scope);
  if (!validation.isUnique) {
    return { success: false, error: validation.message };
  }
  const created = await createClass(input);
  return { success: true, class: created };
}

export async function updateClass(id: ID, patch: Partial<Class>): Promise<Class> {
  return updateCollectionItem<Class>(STORAGE_KEYS.CLASSES, id, patch);
}

export async function updateClassWithValidation(
  id: ID,
  patch: Partial<Class>,
  scope?: Scope
): Promise<{ success: boolean; class?: Class; error?: string }> {
  const existing = await getClass(id);
  if (!existing) {
    return { success: false, error: 'Class not found' };
  }

  const campusId = patch.campusId ?? existing.campusId;
  const grade = patch.grade ?? existing.grade;
  const section = patch.section ?? existing.section;

  const validation = await validateClassUnique(campusId, grade, section, id, scope);
  if (!validation.isUnique) {
    return { success: false, error: validation.message };
  }

  const updated = await updateClass(id, patch);
  return { success: true, class: updated };
}

export async function canDeleteClass(classId: ID, scope?: Scope): Promise<ClassDeletionCheck> {
  const effectiveScope: Scope = scope ?? { schoolId: 'sch_main' };
  const allStudents = await listStudents(effectiveScope);
  const enrolledStudents = allStudents.filter((s) => s.classId === classId);

  if (enrolledStudents.length > 0) {
    return {
      canDelete: false,
      studentCount: enrolledStudents.length,
      reason: `Cannot delete class because it has ${enrolledStudents.length} enrolled student${
        enrolledStudents.length === 1 ? '' : 's'
      }. Please reassign or transfer students before deleting this class.`,
    };
  }

  return {
    canDelete: true,
    studentCount: 0,
  };
}

export async function deleteClass(id: ID): Promise<void> {
  return deleteCollectionItem<Class>(STORAGE_KEYS.CLASSES, id);
}

export async function safeDeleteClass(
  classId: ID,
  scope?: Scope
): Promise<{ success: boolean; error?: string }> {
  const check = await canDeleteClass(classId, scope);
  if (!check.canDelete) {
    return { success: false, error: check.reason };
  }
  await deleteClass(classId);
  return { success: true };
}
