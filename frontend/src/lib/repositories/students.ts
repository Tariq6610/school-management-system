import { STORAGE_KEYS } from '@/lib/storage';
import { HealthRecord, ID, NewStudent, PickupPerson, Scope, Student, StudentStatus } from '@/types';
import {
  createCollectionItem,
  deleteCollectionItem,
  getCollectionItem,
  listCollection,
  updateCollectionItem,
} from './base';

export interface StudentFilter {
  search?: string;
  status?: StudentStatus;
  gender?: 'male' | 'female';
  academicYearId?: ID;
  classId?: ID;
  activeOnly?: boolean;
}

export async function listStudents(
  scope: Scope,
  filter?: StudentFilter
): Promise<Student[]> {
  return listCollection<Student>(STORAGE_KEYS.STUDENTS, scope, (student) => {
    if (filter?.status && student.status !== filter.status) return false;
    if (filter?.activeOnly && student.status !== 'active') return false;
    if (filter?.classId && student.classId !== filter.classId) return false;
    if (filter?.gender && student.gender !== filter.gender) return false;
    if (filter?.academicYearId && student.academicYearId !== filter.academicYearId) return false;
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      return (
        student.admissionNumber.toLowerCase().includes(q) ||
        student.rollNumber.toLowerCase().includes(q)
      );
    }
    return true;
  });
}

/**
 * List only active students within scope (excludes transferred, graduated, and withdrawn).
 */
export async function listActiveStudents(
  scope: Scope,
  filter?: Omit<StudentFilter, 'activeOnly'>
): Promise<Student[]> {
  return listStudents(scope, { ...filter, activeOnly: true });
}

/**
 * Acceptance Criteria helper: Students eligible for daily attendance marking.
 * Strictly excludes any inactive student (transferred, graduated, withdrawn).
 */
export async function getAttendanceEligibleStudents(
  scope: Scope,
  classId: ID
): Promise<Student[]> {
  return listStudents(scope, { classId, activeOnly: true });
}

/**
 * Acceptance Criteria helper: Students eligible for fee invoice generation.
 * Strictly excludes any inactive student (transferred, graduated, withdrawn).
 */
export async function getInvoicingEligibleStudents(
  scope: Scope,
  classId?: ID
): Promise<Student[]> {
  return listStudents(scope, { classId, activeOnly: true });
}

export async function getStudent(id: ID): Promise<Student | null> {
  return getCollectionItem<Student>(STORAGE_KEYS.STUDENTS, id);
}

export async function createStudent(input: NewStudent): Promise<Student> {
  return createCollectionItem<Student>(STORAGE_KEYS.STUDENTS, input, 'stu');
}

export async function updateStudent(id: ID, patch: Partial<Student>): Promise<Student> {
  return updateCollectionItem<Student>(STORAGE_KEYS.STUDENTS, id, patch);
}

export async function deleteStudent(id: ID): Promise<void> {
  return deleteCollectionItem<Student>(STORAGE_KEYS.STUDENTS, id);
}

export async function getStudentByUserId(userId: ID): Promise<Student | null> {
  const students = await listCollection<Student>(STORAGE_KEYS.STUDENTS, undefined, (s) => s.userId === userId);
  return students[0] ?? null;
}

export async function updateStudentStatus(id: ID, status: StudentStatus): Promise<Student> {
  return updateStudent(id, { status });
}

/**
 * Add an authorized pickup person with full audit trail (addedBy, addedAt).
 */
export async function addAuthorizedPickupPerson(
  studentId: ID,
  person: Omit<PickupPerson, 'addedBy' | 'addedAt'>,
  actorUserId: ID
): Promise<Student> {
  const student = await getStudent(studentId);
  if (!student) {
    throw new Error(`Student ${studentId} not found`);
  }
  const newPickup: PickupPerson = {
    ...person,
    addedBy: actorUserId,
    addedAt: new Date().toISOString(),
  };
  const currentList = student.health?.authorisedPickup ?? [];
  const updatedHealth: HealthRecord = {
    ...student.health,
    allergies: student.health?.allergies ?? [],
    conditions: student.health?.conditions ?? [],
    medications: student.health?.medications ?? [],
    emergencyContacts: student.health?.emergencyContacts ?? [],
    authorisedPickup: [...currentList, newPickup],
  };
  return updateStudent(studentId, { health: updatedHealth });
}

/**
 * Remove an authorized pickup person by phone or name.
 */
export async function removeAuthorizedPickupPerson(
  studentId: ID,
  phoneOrName: string
): Promise<Student> {
  const student = await getStudent(studentId);
  if (!student) {
    throw new Error(`Student ${studentId} not found`);
  }
  const currentList = student.health?.authorisedPickup ?? [];
  const updatedList = currentList.filter(
    (p) => p.phone !== phoneOrName && p.name !== phoneOrName
  );
  const updatedHealth: HealthRecord = {
    ...student.health,
    authorisedPickup: updatedList,
  };
  return updateStudent(studentId, { health: updatedHealth });
}

/**
 * Update student health records (allergies, medical conditions, medications, emergency contacts).
 */
export async function updateStudentHealth(
  studentId: ID,
  healthPatch: Partial<HealthRecord>
): Promise<Student> {
  const student = await getStudent(studentId);
  if (!student) {
    throw new Error(`Student ${studentId} not found`);
  }
  const updatedHealth: HealthRecord = {
    ...student.health,
    ...healthPatch,
  };
  return updateStudent(studentId, { health: updatedHealth });
}
