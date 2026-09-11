/**
 * Authorization and scope resolution engine.
 * Reference: DEVELOPMENT_GUIDELINES.md §8 & ARCHITECTURE.md Rule 1 & 8
 */

import { ID, Role, Scope, Session } from '@/types';

export interface TargetScopeQuery {
  schoolId?: ID;
  campusId?: ID;
  classId?: ID;
  studentId?: ID;
}

export interface RecordToAuthorize {
  schoolId?: ID;
  campusId?: ID;
  classId?: ID;
  studentId?: ID;
  userId?: ID;
}

export interface ResolvedScope {
  role: Role;
  schoolId: ID;
  campusId?: ID;
  classId?: ID;
  studentId?: ID;
  canSwitchCampus: boolean;
  effectiveScope: Scope;
  canAccess: (record: RecordToAuthorize) => boolean;
}

/**
 * Authoritatively resolves data access scope based on the active user session and optional target query.
 *
 * Rules:
 * - super_admin: Unrestricted access across all schools and campuses. Can switch campuses.
 * - school_admin: Scoped to their schoolId. Can access all campuses in their school and switch campuses.
 * - principal: Strictly locked to their assigned campusId and schoolId. Cannot switch campuses.
 * - teacher: Scoped to their assigned campusId and schoolId.
 * - parent: Scoped to their schoolId, their active child's campus, and strictly their own children.
 * - student: Strictly scoped to their own student record, class, and campus.
 */
export function resolveScope(
  session: Session,
  target?: TargetScopeQuery
): ResolvedScope {
  const role = session.role;
  const schoolId = session.schoolId;

  let effectiveCampusId: ID | undefined;
  let canSwitchCampus = false;

  switch (role) {
    case 'super_admin': {
      canSwitchCampus = true;
      effectiveCampusId = target?.campusId ?? session.campusId;
      break;
    }

    case 'school_admin': {
      canSwitchCampus = true;
      effectiveCampusId = target?.campusId ?? session.campusId;
      break;
    }

    case 'principal': {
      canSwitchCampus = false;
      // Principal is strictly locked to their assigned campus
      effectiveCampusId = session.campusId;
      break;
    }

    case 'teacher': {
      canSwitchCampus = false;
      effectiveCampusId = session.campusId;
      break;
    }

    case 'parent': {
      canSwitchCampus = false;
      effectiveCampusId = target?.campusId ?? session.campusId;
      break;
    }

    case 'student': {
      canSwitchCampus = false;
      effectiveCampusId = session.campusId;
      break;
    }

    default: {
      effectiveCampusId = session.campusId;
    }
  }

  const effectiveScope: Scope = {
    schoolId: target?.schoolId ?? schoolId,
    campusId: effectiveCampusId,
    classId: target?.classId,
  };

  const canAccess = (record: RecordToAuthorize): boolean => {
    // 1. Super admin can see any record
    if (role === 'super_admin') {
      return true;
    }

    // 2. School boundary check: must match schoolId
    if (record.schoolId && record.schoolId !== schoolId) {
      return false;
    }

    // 3. School admin can see any campus within their school
    if (role === 'school_admin') {
      return true;
    }

    // 4. Principal, Teacher, Student are locked to their campus
    if (role === 'principal' || role === 'teacher' || role === 'student') {
      if (record.campusId && session.campusId && record.campusId !== session.campusId) {
        return false;
      }
    }

    // 5. Student is locked to their own studentId / userId
    if (role === 'student') {
      if (record.userId && record.userId !== session.userId) {
        return false;
      }
      if (record.studentId && record.studentId !== session.userId) {
        // In seed, student record ID or userId
        return false;
      }
    }

    // 6. Parent is locked to their activeChildId / children
    if (role === 'parent' && session.activeChildId) {
      if (record.studentId && record.studentId !== session.activeChildId) {
        return false;
      }
    }

    return true;
  };

  return {
    role,
    schoolId,
    campusId: effectiveCampusId,
    classId: target?.classId,
    studentId: role === 'student' ? session.userId : (role === 'parent' ? session.activeChildId : undefined),
    canSwitchCampus,
    effectiveScope,
    canAccess,
  };
}

/**
 * Convenience helper to verify if a session can view or mutate a record.
 */
export function canAccessRecord(session: Session, record: RecordToAuthorize): boolean {
  return resolveScope(session).canAccess(record);
}
