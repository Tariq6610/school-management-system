import { STORAGE_KEYS } from '@/lib/storage';
import { Class, ID, NewStudentParent, Parent, Student, StudentParent, User } from '@/types';
import {
  createCollectionItem,
  deleteCollectionItem,
  getCollectionItem,
  listCollection,
  updateCollectionItem,
} from './base';

export async function listStudentParents(): Promise<StudentParent[]> {
  return listCollection<StudentParent>(STORAGE_KEYS.STUDENT_PARENTS);
}

export async function getStudentParent(id: ID): Promise<StudentParent | null> {
  return getCollectionItem<StudentParent>(STORAGE_KEYS.STUDENT_PARENTS, id);
}

export async function getStudentParentsByStudentId(studentId: ID): Promise<StudentParent[]> {
  return listCollection<StudentParent>(
    STORAGE_KEYS.STUDENT_PARENTS,
    undefined,
    (sp) => sp.studentId === studentId
  );
}

export async function getStudentParentsByParentId(parentId: ID): Promise<StudentParent[]> {
  return listCollection<StudentParent>(
    STORAGE_KEYS.STUDENT_PARENTS,
    undefined,
    (sp) => sp.parentId === parentId
  );
}

export async function createStudentParent(input: NewStudentParent): Promise<StudentParent> {
  return createCollectionItem<StudentParent>(STORAGE_KEYS.STUDENT_PARENTS, input, 'sp');
}

export async function updateStudentParent(
  id: ID,
  patch: Partial<StudentParent>
): Promise<StudentParent> {
  return updateCollectionItem<StudentParent>(STORAGE_KEYS.STUDENT_PARENTS, id, patch);
}

export async function deleteStudentParent(id: ID): Promise<void> {
  return deleteCollectionItem<StudentParent>(STORAGE_KEYS.STUDENT_PARENTS, id);
}

export interface EnrichedParentLink {
  linkId: ID;
  parent: Parent;
  user: User;
  relationship: 'father' | 'mother' | 'guardian';
  isPrimary: boolean;
}

export interface SiblingInfo {
  student: Student;
  user: User;
  classInfo?: Class;
  sharedParentNames: string[];
}

/**
 * Links a student to a parent record (Many-to-Many).
 * If isPrimary is requested, clears primary flag on other guardians for this student.
 */
export async function linkStudentParent(
  studentId: ID,
  parentId: ID,
  relationship: 'father' | 'mother' | 'guardian',
  isPrimary?: boolean
): Promise<StudentParent> {
  const existingLinks = await getStudentParentsByStudentId(studentId);
  const existingLink = existingLinks.find((l) => l.parentId === parentId);

  // If first link for this student, default isPrimary to true
  const shouldBePrimary = isPrimary !== undefined ? isPrimary : existingLinks.length === 0;

  if (shouldBePrimary) {
    // Unset primary from all other links
    for (const link of existingLinks) {
      if (link.isPrimary && link.parentId !== parentId) {
        await updateStudentParent(link.id, { isPrimary: false });
      }
    }
  }

  if (existingLink) {
    return updateStudentParent(existingLink.id, {
      relationship,
      isPrimary: shouldBePrimary,
    });
  }

  return createStudentParent({
    studentId,
    parentId,
    relationship,
    isPrimary: shouldBePrimary,
  });
}

/**
 * Unlinks a student and parent relationship.
 * If the unlinked guardian was primary, promotes the next available guardian.
 */
export async function unlinkStudentParent(studentId: ID, parentId: ID): Promise<void> {
  const links = await getStudentParentsByStudentId(studentId);
  const targetLink = links.find((l) => l.parentId === parentId);

  if (!targetLink) return;

  await deleteStudentParent(targetLink.id);

  if (targetLink.isPrimary) {
    const remaining = links.filter((l) => l.id !== targetLink.id);
    if (remaining.length > 0) {
      await updateStudentParent(remaining[0].id, { isPrimary: true });
    }
  }
}

/**
 * Designates a specific parent as the primary guardian for a student.
 */
export async function setPrimaryGuardian(studentId: ID, parentId: ID): Promise<void> {
  const links = await getStudentParentsByStudentId(studentId);

  for (const link of links) {
    const isTarget = link.parentId === parentId;
    if (link.isPrimary !== isTarget) {
      await updateStudentParent(link.id, { isPrimary: isTarget });
    }
  }
}

/**
 * Returns all enriched parent records and user profiles linked to a student.
 */
export async function getParentsForStudent(studentId: ID): Promise<EnrichedParentLink[]> {
  const links = await getStudentParentsByStudentId(studentId);
  const results: EnrichedParentLink[] = [];

  for (const link of links) {
    const parent = await getCollectionItem<Parent>(STORAGE_KEYS.PARENTS, link.parentId);
    if (!parent) continue;

    const user = await getCollectionItem<User>(STORAGE_KEYS.USERS, parent.userId);
    if (!user) continue;

    results.push({
      linkId: link.id,
      parent,
      user,
      relationship: link.relationship,
      isPrimary: link.isPrimary,
    });
  }

  // Sort primary first
  return results.sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0));
}

/**
 * Discovers and returns all sibling students who share at least one parent link.
 * Acceptance criteria: Sibling case works seamlessly across parents.
 */
export async function getSiblingsForStudent(studentId: ID): Promise<SiblingInfo[]> {
  const myLinks = await getStudentParentsByStudentId(studentId);
  if (myLinks.length === 0) return [];

  const parentIdSet = new Set(myLinks.map((l) => l.parentId));

  // Find all links matching any of my parents that belong to another student
  const siblingLinks = await listCollection<StudentParent>(
    STORAGE_KEYS.STUDENT_PARENTS,
    undefined,
    (sp) => parentIdSet.has(sp.parentId) && sp.studentId !== studentId
  );

  if (siblingLinks.length === 0) return [];

  // Group by sibling student ID to avoid duplicate entries for dual-parent matches
  const siblingMap = new Map<string, Set<string>>(); // studentId -> Set of parent IDs
  for (const link of siblingLinks) {
    const set = siblingMap.get(link.studentId) ?? new Set<string>();
    set.add(link.parentId);
    siblingMap.set(link.studentId, set);
  }

  const siblings: SiblingInfo[] = [];

  for (const [sibStudentId, sharedParentIds] of siblingMap.entries()) {
    const student = await getCollectionItem<Student>(STORAGE_KEYS.STUDENTS, sibStudentId);
    if (!student) continue;

    const user = await getCollectionItem<User>(STORAGE_KEYS.USERS, student.userId);
    if (!user) continue;

    const classInfo = student.classId
      ? await getCollectionItem<Class>(STORAGE_KEYS.CLASSES, student.classId)
      : undefined;

    // Get parent names
    const sharedParentNames: string[] = [];
    for (const pId of sharedParentIds) {
      const parent = await getCollectionItem<Parent>(STORAGE_KEYS.PARENTS, pId);
      if (parent) {
        const pUser = await getCollectionItem<User>(STORAGE_KEYS.USERS, parent.userId);
        if (pUser) sharedParentNames.push(pUser.name);
      }
    }

    siblings.push({
      student,
      user,
      classInfo: classInfo ?? undefined,
      sharedParentNames,
    });
  }

  return siblings;
}
