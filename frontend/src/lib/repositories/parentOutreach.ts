import { ID, Parent, Scope, User } from '@/types';
import { getItem, setItem } from '../storage';
import { STORAGE_KEYS } from '../storage/keys';
import { listParents } from './parents';
import { getUser } from './users';
import { listStudentParents } from './studentParents';
import { getStudent } from './students';
import { getClass } from './classes';

export type CallOutcome =
  | 'spoke_with_parent'
  | 'left_voicemail'
  | 'no_answer'
  | 'requested_callback'
  | 'wrong_number';

export interface OutreachCallRecord {
  id: ID;
  schoolId: ID;
  campusId?: ID;
  parentId: ID;
  familyTitle: string;
  studentIds: ID[];
  studentNames: string[];
  contactPerson: string;
  phoneNumber: string;
  calledAt: string;
  loggedByUserId: ID;
  loggedByName: string;
  outcome: CallOutcome;
  notes: string;
  followUpDate?: string;
}

export interface ParentOutreachChildInfo {
  studentId: ID;
  name: string;
  admissionNumber: string;
  className: string;
}

export interface ParentOutreachPromptItem {
  parentId: ID;
  familyTitle: string;
  parentUser: User;
  parentRecord: Parent;
  children: ParentOutreachChildInfo[];
  primaryPhone: string;
  preferredLanguage: string;
  promptReason: string;
  unreadNoticesCount: number;
  daysSinceLastActivity: number;
  lastActiveDate: string;
  lastCallRecord?: OutreachCallRecord;
}

export interface LogCallInput {
  parentId: ID;
  familyTitle: string;
  contactPerson: string;
  phoneNumber: string;
  outcome: CallOutcome;
  notes: string;
  loggedByUserId: ID;
  loggedByName: string;
  followUpDate?: string;
}

/**
 * Retrieves all outreach calls from storage
 */
export async function getAllOutreachCalls(scope: Scope): Promise<OutreachCallRecord[]> {
  const items = getItem<OutreachCallRecord[]>(STORAGE_KEYS.OUTREACH_LOGS);
  if (!Array.isArray(items)) return [];
  return items.filter((c) => c.schoolId === scope.schoolId);
}

/**
 * Persists outreach call records
 */
async function saveAllOutreachCalls(calls: OutreachCallRecord[]): Promise<void> {
  setItem(STORAGE_KEYS.OUTREACH_LOGS, calls);
}

/**
 * Retrieves the operational Parent Engagement Prompt List.
 * Admin-facing only: Prompts teachers and admins to log follow-up calls with families.
 * 
 * In strict compliance with FEATURE_SPECIFICATIONS.md §15 and PRODUCT_REQUIREMENTS.md §5:
 * EXPLICITLY NOT BUILT: No numerical engagement scores, no ranked scoreboard,
 * and no percentage rating.
 */
export async function getParentOutreachList(
  scope: Scope
): Promise<ParentOutreachPromptItem[]> {
  const [parents, studentParents, calls] = await Promise.all([
    listParents(scope),
    listStudentParents(),
    getAllOutreachCalls(scope),
  ]);

  // Map calls by parentId
  const callsByParent = new Map<string, OutreachCallRecord>();
  for (const call of calls) {
    const existing = callsByParent.get(call.parentId);
    if (!existing || call.calledAt > existing.calledAt) {
      callsByParent.set(call.parentId, call);
    }
  }

  const promptItems: ParentOutreachPromptItem[] = [];
  const now = new Date();

  // Baseline mock inactivity days and unread notice presets to provide realistic operational prompts
  const promptPresets = [
    {
      daysInactive: 12,
      unreadNotices: 3,
      reasonTemplate: 'Has not opened the last 3 homework notices. Last app visit 12 days ago.',
    },
    {
      daysInactive: 18,
      unreadNotices: 4,
      reasonTemplate: 'Tuition fee reminder circular unread for 9 days. Last app visit 18 days ago.',
    },
    {
      daysInactive: 25,
      unreadNotices: 5,
      reasonTemplate: 'Missed scheduled assessment announcement. Last app visit 25 days ago.',
    },
    {
      daysInactive: 8,
      unreadNotices: 2,
      reasonTemplate: 'Has not acknowledged attendance irregularity alert. Last app visit 8 days ago.',
    },
    {
      daysInactive: 15,
      unreadNotices: 3,
      reasonTemplate: 'Term examination circular unread. Last app visit 15 days ago.',
    },
    {
      daysInactive: 31,
      unreadNotices: 6,
      reasonTemplate: 'Extended period of inactivity. No portal interaction in over a month.',
    },
  ];

  for (let i = 0; i < parents.length; i++) {
    const parent = parents[i];
    const user = await getUser(parent.userId);
    if (!user) continue;

    // Find linked children
    const links = studentParents.filter((sp) => sp.parentId === parent.id);
    const childrenInfo: ParentOutreachChildInfo[] = [];

    for (const link of links) {
      const stu = await getStudent(link.studentId);
      if (!stu) continue;
      const stuUser = await getUser(stu.userId);
      const cls = stu.classId ? await getClass(stu.classId) : null;
      childrenInfo.push({
        studentId: stu.id,
        name: stuUser?.name || 'Student',
        admissionNumber: stu.admissionNumber,
        className: cls ? `${cls.grade} (${cls.section})` : 'Class',
      });
    }

    // Determine family title (e.g. "Khan family" or "{LastName} family")
    const nameParts = user.name.split(' ');
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : user.name;
    const familyTitle = `${lastName} family`;

    const preset = promptPresets[i % promptPresets.length];
    const lastActiveMs = now.getTime() - preset.daysInactive * (1000 * 60 * 60 * 24);
    const lastActiveDate = new Date(lastActiveMs).toISOString().slice(0, 10);

    const lastCall = callsByParent.get(parent.id);

    promptItems.push({
      parentId: parent.id,
      familyTitle,
      parentUser: user,
      parentRecord: parent,
      children: childrenInfo,
      primaryPhone: user.phone || '0300-1234567',
      preferredLanguage: 'Urdu / English',
      promptReason: preset.reasonTemplate,
      unreadNoticesCount: preset.unreadNotices,
      daysSinceLastActivity: preset.daysInactive,
      lastActiveDate,
      lastCallRecord: lastCall,
    });
  }

  // Sorted by how long since the family last engaged (days since last activity, descending)
  promptItems.sort((a, b) => b.daysSinceLastActivity - a.daysSinceLastActivity);

  return promptItems;
}

/**
 * Logs an outreach call with a note
 */
export async function logOutreachCall(
  scope: Scope,
  input: LogCallInput
): Promise<OutreachCallRecord> {
  const allCalls = await getAllOutreachCalls(scope);
  const now = new Date().toISOString();

  // Find children for this parent
  const studentParents = await listStudentParents();
  const links = studentParents.filter((sp) => sp.parentId === input.parentId);
  const studentIds = links.map((l) => l.studentId);
  const studentNames: string[] = [];

  for (const sid of studentIds) {
    const stu = await getStudent(sid);
    if (stu) {
      const u = await getUser(stu.userId);
      if (u) studentNames.push(u.name);
    }
  }

  const newCall: OutreachCallRecord = {
    id: `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    schoolId: scope.schoolId,
    campusId: scope.campusId,
    parentId: input.parentId,
    familyTitle: input.familyTitle,
    studentIds,
    studentNames,
    contactPerson: input.contactPerson,
    phoneNumber: input.phoneNumber,
    calledAt: now,
    loggedByUserId: input.loggedByUserId,
    loggedByName: input.loggedByName,
    outcome: input.outcome,
    notes: input.notes,
    followUpDate: input.followUpDate,
  };

  allCalls.unshift(newCall);
  await saveAllOutreachCalls(allCalls);
  return newCall;
}

/**
 * Retrieves call history for a parent or entire campus
 */
export async function getOutreachCallHistory(
  scope: Scope,
  parentId?: ID
): Promise<OutreachCallRecord[]> {
  const allCalls = await getAllOutreachCalls(scope);
  if (parentId) {
    return allCalls.filter((c) => c.parentId === parentId);
  }
  return allCalls;
}
