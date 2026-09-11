import { STORAGE_KEYS } from '@/lib/storage';
import { Class, ID, NewTeacher, Scope, Subject, Teacher, TimetableSlot } from '@/types';
import {
  createCollectionItem,
  deleteCollectionItem,
  getCollectionItem,
  listCollection,
  updateCollectionItem,
} from './base';
import { listSubjects, updateSubject } from './subjects';
import { listClasses, updateClass } from './classes';
import { listTimetableSlots } from './timetableSlots';

export interface TeacherFilter {
  department?: string;
  subjectId?: ID;
  campusId?: ID;
  search?: string;
}

export async function listTeachers(scope: Scope, filter?: TeacherFilter): Promise<Teacher[]> {
  return listCollection<Teacher>(STORAGE_KEYS.TEACHERS, scope, (teacher) => {
    if (filter?.campusId && teacher.campusId !== filter.campusId) return false;
    if (filter?.department && teacher.department !== filter.department) return false;
    if (filter?.subjectId && !teacher.subjectIds.includes(filter.subjectId)) return false;
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      if (!teacher.employeeNumber.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

export async function getTeacher(id: ID): Promise<Teacher | null> {
  return getCollectionItem<Teacher>(STORAGE_KEYS.TEACHERS, id);
}

export async function getTeacherByUserId(userId: ID): Promise<Teacher | null> {
  const teachers = await listCollection<Teacher>(STORAGE_KEYS.TEACHERS, undefined, (t) => t.userId === userId);
  return teachers[0] ?? null;
}

export async function createTeacher(input: NewTeacher): Promise<Teacher> {
  return createCollectionItem<Teacher>(STORAGE_KEYS.TEACHERS, input, 'tch');
}

export async function updateTeacher(id: ID, patch: Partial<Teacher>): Promise<Teacher> {
  return updateCollectionItem<Teacher>(STORAGE_KEYS.TEACHERS, id, patch);
}

export async function deleteTeacher(id: ID): Promise<void> {
  return deleteCollectionItem<Teacher>(STORAGE_KEYS.TEACHERS, id);
}

/**
 * Acceptance Criteria helper: Resolves all subjects taught by the teacher.
 */
export async function getTeacherAssignedSubjects(
  teacherId: ID,
  scope?: Scope
): Promise<Subject[]> {
  const effectiveScope: Scope = scope ?? { schoolId: 'sch_main' };
  const subjects = await listSubjects(effectiveScope);
  return subjects.filter((s) => s.teacherId === teacherId);
}

/**
 * Acceptance Criteria helper: Resolves all classes associated with the teacher
 * (both as homeroom class teacher and subject teacher).
 */
export async function getTeacherAssignedClasses(
  teacherId: ID,
  scope?: Scope
): Promise<{ classInfo: Class; isClassTeacher: boolean; subjectCount: number }[]> {
  const effectiveScope: Scope = scope ?? { schoolId: 'sch_main' };
  const [classes, subjects] = await Promise.all([
    listClasses(effectiveScope),
    listSubjects(effectiveScope),
  ]);

  const teacherSubjects = subjects.filter((s) => s.teacherId === teacherId);
  const teacherClassIds = new Set<ID>(teacherSubjects.map((s) => s.classId));

  const result: { classInfo: Class; isClassTeacher: boolean; subjectCount: number }[] = [];

  for (const cls of classes) {
    const isClassTeacher = cls.classTeacherId === teacherId;
    const isSubjectTeacher = teacherClassIds.has(cls.id);

    if (isClassTeacher || isSubjectTeacher) {
      const classSubjectCount = teacherSubjects.filter((s) => s.classId === cls.id).length;
      result.push({
        classInfo: cls,
        isClassTeacher,
        subjectCount: classSubjectCount,
      });
    }
  }

  return result;
}

/**
 * Resolves weekly timetable slots for the teacher.
 */
export async function getTeacherSchedule(
  teacherId: ID,
  scope?: Scope
): Promise<TimetableSlot[]> {
  return listTimetableSlots(scope ?? { schoolId: 'sch_main' }, { teacherId });
}

export interface BulkTeacherAssignmentInput {
  teacherId: ID;
  subjectIds: ID[]; // Target list of subject IDs assigned to this teacher
  homeroomClassIds: ID[]; // Classes where this teacher is assigned as homeroom class teacher
}

/**
 * Acceptance Criteria: Bulk selection and assignment of subjects and classes in one operation.
 * Synchronizes Subject.teacherId, Class.classTeacherId, and Teacher.subjectIds atomically.
 */
export async function bulkAssignTeacher(
  input: BulkTeacherAssignmentInput,
  scope?: Scope
): Promise<{
  teacher: Teacher;
  assignedSubjectsCount: number;
  assignedClassesCount: number;
}> {
  const effectiveScope: Scope = scope ?? { schoolId: 'sch_main' };
  const targetTeacher = await getTeacher(input.teacherId);
  if (!targetTeacher) {
    throw new Error(`Teacher with ID "${input.teacherId}" not found.`);
  }

  const [allSubjects, allClasses] = await Promise.all([
    listSubjects(effectiveScope),
    listClasses(effectiveScope),
  ]);

  const targetSubjectIdSet = new Set<ID>(input.subjectIds);
  const targetHomeroomIdSet = new Set<ID>(input.homeroomClassIds);

  // 1. Synchronize Subject assignments
  for (const subject of allSubjects) {
    const shouldBeAssigned = targetSubjectIdSet.has(subject.id);
    const currentlyAssigned = subject.teacherId === input.teacherId;

    if (shouldBeAssigned && !currentlyAssigned) {
      await updateSubject(subject.id, { teacherId: input.teacherId });
    } else if (!shouldBeAssigned && currentlyAssigned) {
      await updateSubject(subject.id, { teacherId: undefined });
    }
  }

  // 2. Synchronize Homeroom Class Teacher assignments
  for (const cls of allClasses) {
    const shouldBeHomeroom = targetHomeroomIdSet.has(cls.id);
    const currentlyHomeroom = cls.classTeacherId === input.teacherId;

    if (shouldBeHomeroom && !currentlyHomeroom) {
      await updateClass(cls.id, { classTeacherId: input.teacherId });
    } else if (!shouldBeHomeroom && currentlyHomeroom) {
      await updateClass(cls.id, { classTeacherId: undefined });
    }
  }

  // 3. Update Teacher entity's subjectIds
  const updatedTeacher = await updateTeacher(input.teacherId, {
    subjectIds: input.subjectIds,
  });

  return {
    teacher: updatedTeacher,
    assignedSubjectsCount: input.subjectIds.length,
    assignedClassesCount: input.homeroomClassIds.length,
  };
}
