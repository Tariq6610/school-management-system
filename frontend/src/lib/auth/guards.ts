import { Role, Session } from '@/types';
import { RecordToAuthorize, resolveScope } from './scope';

export interface RouteRoleCheckResult {
  allowed: boolean;
  status: 200 | 401 | 403;
  redirect?: string;
  currentRole?: Role;
  reason?: string;
}

export interface RecordScopeCheckResult {
  inScope: boolean;
  status: 200 | 404;
  reason?: string;
}

/**
 * Validates whether the active session role has permission to access a route.
 * Acceptance criteria: Wrong role → 403. Unauthenticated → 401 (/login).
 */
export function checkRouteRole(
  session: Session | null,
  allowedRoles: Role[]
): RouteRoleCheckResult {
  if (!session) {
    return {
      allowed: false,
      status: 401,
      redirect: '/login',
      reason: 'Authentication required to access this resource.',
    };
  }

  if (!allowedRoles.includes(session.role)) {
    return {
      allowed: false,
      status: 403,
      currentRole: session.role,
      reason: `Access restricted. Role "${session.role}" is not authorized for this section. Required: [${allowedRoles.join(', ')}].`,
    };
  }

  return {
    allowed: true,
    status: 200,
    currentRole: session.role,
  };
}

/**
 * Validates whether an entity record belongs to the active user's accessible scope.
 * Acceptance criteria: Out-of-scope record → 404.
 */
export function checkRecordScope(
  record: RecordToAuthorize | null,
  session: Session
): RecordScopeCheckResult {
  if (!record) {
    return {
      inScope: false,
      status: 404,
      reason: 'The requested record does not exist.',
    };
  }

  const { canAccess } = resolveScope(session);

  if (!canAccess(record)) {
    return {
      inScope: false,
      status: 404,
      reason: 'The requested record is outside your current school, campus, or student authorization scope.',
    };
  }

  return {
    inScope: true,
    status: 200,
  };
}
