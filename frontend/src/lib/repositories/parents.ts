import { STORAGE_KEYS } from '@/lib/storage';
import { Class, ID, NewParent, Parent, Scope, Student, StudentParent, User } from '@/types';
import {
  createCollectionItem,
  deleteCollectionItem,
  getCollectionItem,
  listCollection,
  updateCollectionItem,
} from './base';
import { createUser, deleteUser } from './users';
import { deleteStudentParent } from './studentParents';

export interface ParentFilter {
  search?: string;
  campusId?: ID;
  hasMultipleChildren?: boolean;
}

export interface ParentChildInfo {
  student: Student;
  user: User;
  classInfo?: Class;
  relationship: string;
  isPrimary: boolean;
}

export interface EnrichedParent {
  id: ID;
  parent: Parent;
  user: User;
  children: ParentChildInfo[];
}

export interface CreateParentWithUserInput {
  name: string;
  email: string;
  phone?: string;
  occupation?: string;
  campusId?: ID;
}

export async function listParents(scope: Scope): Promise<Parent[]> {
  return listCollection<Parent>(STORAGE_KEYS.PARENTS, scope);
}

export async function getParent(id: ID): Promise<Parent | null> {
  return getCollectionItem<Parent>(STORAGE_KEYS.PARENTS, id);
}

export async function getParentByUserId(userId: ID): Promise<Parent | null> {
  const parents = await listCollection<Parent>(STORAGE_KEYS.PARENTS, undefined, (p) => p.userId === userId);
  return parents[0] ?? null;
}

export async function createParent(input: NewParent): Promise<Parent> {
  return createCollectionItem<Parent>(STORAGE_KEYS.PARENTS, input, 'prt');
}

export async function updateParent(id: ID, patch: Partial<Parent>): Promise<Parent> {
  return updateCollectionItem<Parent>(STORAGE_KEYS.PARENTS, id, patch);
}

export async function deleteParent(id: ID): Promise<void> {
  return deleteCollectionItem<Parent>(STORAGE_KEYS.PARENTS, id);
}

/**
 * Creates a User with role 'parent' and the associated Parent record.
 */
export async function createParentWithUser(
  input: CreateParentWithUserInput,
  scope: Scope
): Promise<EnrichedParent> {
  const user = await createUser({
    schoolId: scope.schoolId,
    campusId: input.campusId ?? scope.campusId,
    name: input.name,
    email: input.email,
    phone: input.phone,
    role: 'parent',
    status: 'active',
  });

  const parent = await createParent({
    schoolId: scope.schoolId,
    userId: user.id,
    occupation: input.occupation,
  });

  return {
    id: parent.id,
    parent,
    user,
    children: [],
  };
}

/**
 * Returns strictly the children linked to the specified parent user.
 * Acceptance criteria: Lists only that parent's children.
 */
export async function getChildrenForParent(parentUserId: ID): Promise<ParentChildInfo[]> {
  const parent = await getParentByUserId(parentUserId);
  if (!parent) return [];

  // Query links between this parent and students
  const links = await listCollection<StudentParent>(
    STORAGE_KEYS.STUDENT_PARENTS,
    undefined,
    (sp) => sp.parentId === parent.id
  );

  const results: ParentChildInfo[] = [];

  for (const link of links) {
    const student = await getCollectionItem<Student>(STORAGE_KEYS.STUDENTS, link.studentId);
    if (!student) continue;

    const user = await getCollectionItem<User>(STORAGE_KEYS.USERS, student.userId);
    if (!user) continue;

    const classInfo = student.classId
      ? await getCollectionItem<Class>(STORAGE_KEYS.CLASSES, student.classId)
      : undefined;

    results.push({
      student,
      user,
      classInfo: classInfo ?? undefined,
      relationship: link.relationship,
      isPrimary: link.isPrimary,
    });
  }

  return results;
}

/**
 * Returns all enriched parent records with user profiles and linked children.
 * Supports filtering by search (name, phone, email), campus, and multi-child family.
 */
export async function listEnrichedParents(
  scope: Scope,
  filter?: ParentFilter
): Promise<EnrichedParent[]> {
  const rawParents = await listParents(scope);
  const enriched: EnrichedParent[] = [];

  for (const parent of rawParents) {
    const user = await getCollectionItem<User>(STORAGE_KEYS.USERS, parent.userId);
    if (!user) continue;

    const children = await getChildrenForParent(user.id);

    // Apply filters
    if (filter?.hasMultipleChildren && children.length <= 1) {
      continue;
    }

    if (filter?.campusId) {
      const matchesParentCampus = user.campusId === filter.campusId;
      const matchesChildCampus = children.some((c) => c.student.campusId === filter.campusId);
      if (!matchesParentCampus && !matchesChildCampus) {
        continue;
      }
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      const matchName = user.name.toLowerCase().includes(q);
      const matchEmail = user.email.toLowerCase().includes(q);
      const matchPhone = Boolean(user.phone?.includes(q));
      const matchOccupation = Boolean(parent.occupation?.toLowerCase().includes(q));
      const matchChild = children.some((c) => c.user.name.toLowerCase().includes(q));

      if (!matchName && !matchEmail && !matchPhone && !matchOccupation && !matchChild) {
        continue;
      }
    }

    enriched.push({
      id: parent.id,
      parent,
      user,
      children,
    });
  }

  return enriched;
}

/**
 * Safely deletes a parent record, along with their student-parent links and user account.
 */
export async function safeDeleteParent(parentId: ID): Promise<void> {
  const parent = await getParent(parentId);
  if (!parent) return;

  // 1. Remove all student-parent links for this parent
  const links = await listCollection<StudentParent>(
    STORAGE_KEYS.STUDENT_PARENTS,
    undefined,
    (sp) => sp.parentId === parentId
  );
  for (const link of links) {
    await deleteStudentParent(link.id);
  }

  // 2. Delete parent record
  await deleteParent(parentId);

  // 3. Delete user record
  await deleteUser(parent.userId);
}

