/**
 * Staff leave requests: teachers request leave, principals approve or reject.
 * Reference: context/ROUTE_STRUCTURE.md — /principal/leave-requests
 */

import { STORAGE_KEYS } from '@/lib/storage';
import {
  ID,
  LeaveRequest,
  LeaveRequestStatus,
  NewLeaveRequest,
  Scope,
  Teacher,
  User,
} from '@/types';
import {
  createCollectionItem,
  getCollectionItem,
  listCollection,
  updateCollectionItem,
} from './base';
import { listTeachers } from './teachers';
import { listUsers } from './users';

export interface LeaveRequestFilter {
  status?: LeaveRequestStatus;
  teacherId?: ID;
}

export interface EnrichedLeaveRequest extends LeaveRequest {
  teacherName: string;
  teacherEmployeeNumber?: string;
  decidedByName?: string;
  dayCount: number;
}

function validateLeaveRequest(input: Partial<NewLeaveRequest>): void {
  if (!input.teacherId) {
    throw new Error('A teacher must be selected for the leave request');
  }
  if (!input.leaveType || !['sick', 'casual', 'annual', 'other'].includes(input.leaveType)) {
    throw new Error('A valid leave type is required');
  }
  if (!input.startDate || isNaN(Date.parse(input.startDate))) {
    throw new Error('A valid start date is required');
  }
  if (!input.endDate || isNaN(Date.parse(input.endDate))) {
    throw new Error('A valid end date is required');
  }
  if (new Date(input.endDate).getTime() < new Date(input.startDate).getTime()) {
    throw new Error('End date must be on or after the start date');
  }
  if (!input.reason || !input.reason.trim()) {
    throw new Error('A reason for the leave is required');
  }
}

export function calculateLeaveDayCount(startDate: string, endDate: string): number {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  return Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
}

export async function listLeaveRequests(
  scope: Scope,
  filter?: LeaveRequestFilter
): Promise<LeaveRequest[]> {
  return listCollection<LeaveRequest>(STORAGE_KEYS.LEAVE_REQUESTS, scope, (item) => {
    if (filter?.status && item.status !== filter.status) return false;
    if (filter?.teacherId && item.teacherId !== filter.teacherId) return false;
    return true;
  });
}

export async function getLeaveRequest(id: ID): Promise<LeaveRequest | null> {
  return getCollectionItem<LeaveRequest>(STORAGE_KEYS.LEAVE_REQUESTS, id);
}

export async function createLeaveRequest(input: NewLeaveRequest): Promise<LeaveRequest> {
  validateLeaveRequest(input);

  const payload: Omit<LeaveRequest, 'id'> = {
    schoolId: input.schoolId,
    campusId: input.campusId,
    teacherId: input.teacherId,
    leaveType: input.leaveType,
    startDate: input.startDate,
    endDate: input.endDate,
    reason: input.reason.trim(),
    status: 'pending',
    requestedAt: new Date().toISOString(),
  };

  return createCollectionItem<LeaveRequest>(STORAGE_KEYS.LEAVE_REQUESTS, payload, 'lvr');
}

async function decideLeaveRequest(
  id: ID,
  status: 'approved' | 'rejected',
  decidedBy: ID,
  decisionNote?: string
): Promise<LeaveRequest> {
  const current = await getLeaveRequest(id);
  if (!current) {
    throw new Error(`Leave request with id "${id}" not found`);
  }
  if (current.status !== 'pending') {
    throw new Error('This leave request has already been decided');
  }

  return updateCollectionItem<LeaveRequest>(STORAGE_KEYS.LEAVE_REQUESTS, id, {
    status,
    decidedBy,
    decidedAt: new Date().toISOString(),
    decisionNote: decisionNote?.trim() || undefined,
  });
}

export async function approveLeaveRequest(
  id: ID,
  decidedBy: ID,
  decisionNote?: string
): Promise<LeaveRequest> {
  return decideLeaveRequest(id, 'approved', decidedBy, decisionNote);
}

export async function rejectLeaveRequest(
  id: ID,
  decidedBy: ID,
  decisionNote?: string
): Promise<LeaveRequest> {
  return decideLeaveRequest(id, 'rejected', decidedBy, decisionNote);
}

/**
 * Returns leave requests enriched with teacher name/employee number and
 * decision-maker name, sorted with pending requests first (newest first
 * within each status group).
 */
export async function listEnrichedLeaveRequests(
  scope: Scope,
  filter?: LeaveRequestFilter
): Promise<EnrichedLeaveRequest[]> {
  const [requests, teachers, users] = await Promise.all([
    listLeaveRequests(scope, filter),
    listTeachers(scope),
    listUsers(scope),
  ]);

  const teacherMap = new Map<ID, Teacher>(teachers.map((t) => [t.id, t]));
  const userMap = new Map<ID, User>(users.map((u) => [u.id, u]));

  const enriched: EnrichedLeaveRequest[] = requests.map((req) => {
    const teacher = teacherMap.get(req.teacherId);
    const teacherUser = teacher ? userMap.get(teacher.userId) : undefined;

    return {
      ...req,
      teacherName: teacherUser?.name || 'Unknown Teacher',
      teacherEmployeeNumber: teacher?.employeeNumber,
      decidedByName: req.decidedBy ? userMap.get(req.decidedBy)?.name : undefined,
      dayCount: calculateLeaveDayCount(req.startDate, req.endDate),
    };
  });

  const statusOrder: Record<LeaveRequestStatus, number> = { pending: 0, approved: 1, rejected: 2 };

  return enriched.sort((a, b) => {
    const orderDiff = statusOrder[a.status] - statusOrder[b.status];
    if (orderDiff !== 0) return orderDiff;
    return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
  });
}
