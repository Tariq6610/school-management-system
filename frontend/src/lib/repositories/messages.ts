import { STORAGE_KEYS } from '@/lib/storage';
import {
  AuditThreadSummary,
  DirectMessageInput,
  EligibleRecipient,
  ID,
  Message,
  MessageAuditFilter,
  MessageAuditStats,
  MessageThreadSummary,
  NewMessage,
  Role,
  Scope,
} from '@/types';
import {
  createCollectionItem,
  deleteCollectionItem,
  getCollectionItem,
  listCollection,
  updateCollectionItem,
} from './base';
import { getUser } from './users';
import { listStudents } from './students';
import { listTeachers } from './teachers';
import { getClass } from './classes';
import { listSubjects } from './subjects';
import { getChildrenForParent } from './parents';
import { getParentsForStudent } from './studentParents';
import { getCampus } from './campuses';

export async function listMessages(scope?: Scope, threadId?: ID): Promise<Message[]> {
  const msgs = await listCollection<Message>(STORAGE_KEYS.MESSAGES, scope, (msg) => {
    if (threadId && msg.threadId !== threadId) return false;
    return true;
  });
  return msgs.sort((a, b) => (a.sentAt > b.sentAt ? 1 : -1));
}

export async function getMessage(id: ID): Promise<Message | null> {
  return getCollectionItem<Message>(STORAGE_KEYS.MESSAGES, id);
}

export async function sendMessage(input: NewMessage): Promise<Message> {
  const payload = {
    ...input,
    sentAt: input.sentAt || new Date().toISOString(),
  };
  return createCollectionItem<Message>(STORAGE_KEYS.MESSAGES, payload, 'msg');
}

export async function markMessageAsRead(id: ID): Promise<Message> {
  return updateCollectionItem<Message>(STORAGE_KEYS.MESSAGES, id, {
    readAt: new Date().toISOString(),
  });
}

export async function deleteMessage(id: ID): Promise<void> {
  return deleteCollectionItem<Message>(STORAGE_KEYS.MESSAGES, id);
}

/**
 * Retrieves all messages for a specific thread in chronological order (oldest to newest).
 */
export async function getThreadMessages(threadId: ID): Promise<Message[]> {
  const msgs = await listCollection<Message>(
    STORAGE_KEYS.MESSAGES,
    undefined,
    (msg) => msg.threadId === threadId
  );
  return msgs.sort((a, b) => (a.sentAt > b.sentAt ? 1 : -1));
}

/**
 * Marks all unread incoming messages in a thread as read by the current user.
 */
export async function markThreadAsRead(threadId: ID, currentUserId: ID): Promise<number> {
  const msgs = await listCollection<Message>(
    STORAGE_KEYS.MESSAGES,
    undefined,
    (msg) => msg.threadId === threadId && msg.recipientId === currentUserId && !msg.readAt
  );
  const now = new Date().toISOString();
  for (const msg of msgs) {
    await updateCollectionItem<Message>(STORAGE_KEYS.MESSAGES, msg.id, { readAt: now });
  }
  return msgs.length;
}

/**
 * Sends a direct message between two users, automatically determining or reusing the thread.
 */
export async function sendDirectMessage(input: DirectMessageInput): Promise<Message> {
  const trimmedBody = input.body.trim();
  if (!trimmedBody) {
    throw new Error('Message body cannot be empty.');
  }
  if (!input.senderId || !input.recipientId) {
    throw new Error('Both sender and recipient are required.');
  }

  let threadId = input.threadId;
  if (!threadId) {
    // Check if there is an existing thread between these two users
    const allMessages = await listCollection<Message>(
      STORAGE_KEYS.MESSAGES,
      undefined,
      (m) =>
        (m.senderId === input.senderId && m.recipientId === input.recipientId) ||
        (m.senderId === input.recipientId && m.recipientId === input.senderId)
    );
    if (allMessages.length > 0 && allMessages[0].threadId) {
      threadId = allMessages[0].threadId;
    } else {
      const sorted = [input.senderId, input.recipientId].sort();
      threadId = `th_${sorted[0]}_${sorted[1]}`;
    }
  }

  const newMsg: NewMessage = {
    schoolId: input.schoolId,
    threadId,
    senderId: input.senderId,
    recipientId: input.recipientId,
    body: trimmedBody,
    sentAt: new Date().toISOString(),
  };

  return sendMessage(newMsg);
}

/**
 * Returns summaries of all conversation threads for a user, sorted newest-first.
 */
export async function getConversationThreads(
  userId: ID,
  scope?: Scope
): Promise<MessageThreadSummary[]> {
  const allMsgs = await listCollection<Message>(
    STORAGE_KEYS.MESSAGES,
    scope,
    (msg) => msg.senderId === userId || msg.recipientId === userId
  );

  // Group by threadId
  const threadMap = new Map<ID, Message[]>();
  for (const msg of allMsgs) {
    const list = threadMap.get(msg.threadId) || [];
    list.push(msg);
    threadMap.set(msg.threadId, list);
  }

  const summaries: MessageThreadSummary[] = [];

  for (const [threadId, msgs] of threadMap.entries()) {
    msgs.sort((a, b) => (a.sentAt > b.sentAt ? 1 : -1));
    const lastMessage = msgs[msgs.length - 1];
    const otherUserId =
      lastMessage.senderId === userId ? lastMessage.recipientId : lastMessage.senderId;
    const otherUser = await getUser(otherUserId);

    if (!otherUser) continue;

    const unreadCount = msgs.filter((m) => m.recipientId === userId && !m.readAt).length;

    // Resolve student context
    let studentContext:
      | { studentName?: string; className?: string; subjectNames?: string[] }
      | undefined = undefined;

    if (otherUser.role === 'parent') {
      const children = await getChildrenForParent(otherUser.id);
      if (children.length > 0) {
        const primary = children[0];
        studentContext = {
          studentName: primary.user.name,
          className: primary.classInfo
            ? `${primary.classInfo.grade} - ${primary.classInfo.section}`
            : undefined,
        };
      }
    } else if (otherUser.role === 'teacher') {
      const currentChildren = await getChildrenForParent(userId);
      if (currentChildren.length > 0) {
        studentContext = {
          studentName: currentChildren[0].user.name,
          className: currentChildren[0].classInfo
            ? `${currentChildren[0].classInfo.grade} - ${currentChildren[0].classInfo.section}`
            : undefined,
        };
      }
    }

    summaries.push({
      threadId,
      otherUser,
      lastMessage,
      unreadCount,
      studentContext,
    });
  }

  // Sort newest message first
  return summaries.sort((a, b) => (a.lastMessage.sentAt < b.lastMessage.sentAt ? 1 : -1));
}

/**
 * Returns eligible messaging recipients for a user:
 * - Teachers see parents of students in their campus/classes.
 * - Parents see teachers teaching their children.
 */
export async function getEligibleRecipients(
  userId: ID,
  role: Role,
  scope: Scope
): Promise<EligibleRecipient[]> {
  const results: EligibleRecipient[] = [];
  const seen = new Set<ID>();

  if (role === 'teacher') {
    const students = await listStudents(scope);
    for (const stu of students) {
      const parents = await getParentsForStudent(stu.id);
      const studentUser = await getUser(stu.userId);
      const cls = stu.classId ? await getClass(stu.classId) : null;
      const className = cls ? `${cls.grade} - ${cls.section}` : undefined;

      for (const p of parents) {
        if (!seen.has(p.user.id) && p.user.id !== userId) {
          seen.add(p.user.id);
          results.push({
            userId: p.user.id,
            user: p.user,
            role: 'parent',
            studentName: studentUser?.name,
            className,
          });
        }
      }
    }
  } else if (role === 'parent') {
    const children = await getChildrenForParent(userId);
    const teachers = await listTeachers(scope);

    for (const child of children) {
      const cls = child.classInfo;
      for (const tch of teachers) {
        const tchUser = await getUser(tch.userId);
        if (!tchUser || seen.has(tchUser.id) || tchUser.id === userId) continue;

        const isClassTeacher = cls && cls.classTeacherId === tch.id;
        const subjects = cls ? await listSubjects(scope, { classId: cls.id }) : [];
        const taughtSubjects = subjects
          .filter((s) => s.teacherId === tch.id)
          .map((s) => s.name);

        if (isClassTeacher || taughtSubjects.length > 0 || !cls) {
          seen.add(tchUser.id);
          results.push({
            userId: tchUser.id,
            user: tchUser,
            role: 'teacher',
            studentName: child.user.name,
            className: cls ? `${cls.grade} - ${cls.section}` : undefined,
            subjectNames:
              taughtSubjects.length > 0
                ? taughtSubjects
                : isClassTeacher
                ? ['Class Teacher']
                : undefined,
          });
        }
      }
    }

    if (results.length === 0) {
      for (const tch of teachers) {
        const tchUser = await getUser(tch.userId);
        if (!tchUser || seen.has(tchUser.id) || tchUser.id === userId) continue;
        seen.add(tchUser.id);
        results.push({
          userId: tchUser.id,
          user: tchUser,
          role: 'teacher',
        });
      }
    }
  }

  return results;
}

export interface AuditThreadsResult {
  threads: AuditThreadSummary[];
  stats: MessageAuditStats;
}

/**
 * Retrieves an administrative, read-only audit log of all teacher-parent threads
 * for safeguarding compliance, anti-bullying oversight, and administrative review.
 */
export async function getAuditMessageThreads(
  scope: Scope,
  filter?: MessageAuditFilter
): Promise<AuditThreadsResult> {
  const allMsgs = await listCollection<Message>(STORAGE_KEYS.MESSAGES, {
    schoolId: scope.schoolId,
  });

  // Group by threadId
  const threadMap = new Map<ID, Message[]>();
  for (const msg of allMsgs) {
    const list = threadMap.get(msg.threadId) || [];
    list.push(msg);
    threadMap.set(msg.threadId, list);
  }

  const allThreads: AuditThreadSummary[] = [];

  for (const [threadId, msgs] of threadMap.entries()) {
    msgs.sort((a, b) => (a.sentAt > b.sentAt ? 1 : -1));
    const firstMsg = msgs[0];
    const lastMsg = msgs[msgs.length - 1];

    // Identify participants
    const userIds = Array.from(new Set(msgs.flatMap((m) => [m.senderId, m.recipientId])));
    if (userIds.length < 2) continue;

    const userA = await getUser(userIds[0]);
    const userB = await getUser(userIds[1]);
    if (!userA || !userB) continue;

    const teacherUser =
      userA.role === 'teacher' ? userA : userB.role === 'teacher' ? userB : userA;
    const parentUser =
      userA.role === 'parent' ? userA : userB.role === 'parent' ? userB : userB;

    // Resolve student & class
    let studentName: string | undefined;
    let studentRollNumber: string | undefined;
    let className: string | undefined;
    let campusId: ID | undefined = teacherUser.campusId || parentUser.campusId;

    const children = await getChildrenForParent(parentUser.id);
    if (children.length > 0) {
      const allText = msgs.map((m) => m.body.toLowerCase()).join(' ');
      const matchedChild = children.find((c) =>
        allText.includes(c.user.name.toLowerCase().split(' ')[0])
      );
      const targetChild = matchedChild || children[0];
      studentName = targetChild.user.name;
      studentRollNumber = targetChild.student.rollNumber;
      if (targetChild.classInfo) {
        className = `${targetChild.classInfo.grade} - ${targetChild.classInfo.section}`;
      }
      campusId = targetChild.student.campusId || campusId;
    }

    let campusName: string | undefined;
    if (campusId) {
      const cmp = await getCampus(campusId);
      if (cmp) {
        campusName = cmp.name;
      }
    }

    allThreads.push({
      threadId,
      teacherUser,
      parentUser,
      studentName,
      studentRollNumber,
      className,
      campusId,
      campusName,
      messageCount: msgs.length,
      firstMessageAt: firstMsg.sentAt,
      lastMessageAt: lastMsg.sentAt,
      messages: msgs,
    });
  }

  // Apply filters
  const now = new Date().getTime();
  const filtered = allThreads.filter((t) => {
    // Campus filter
    if (filter?.campusId && t.campusId !== filter.campusId) {
      return false;
    }

    // Date range filter
    if (filter?.dateRange === '7d') {
      const lastMs = new Date(t.lastMessageAt).getTime();
      if (now - lastMs > 7 * 86400000) return false;
    } else if (filter?.dateRange === '30d') {
      const lastMs = new Date(t.lastMessageAt).getTime();
      if (now - lastMs > 30 * 86400000) return false;
    }

    // Search filter (Teacher, Parent, Student, Class, or Message body)
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      const matchTeacher = t.teacherUser.name.toLowerCase().includes(q);
      const matchParent = t.parentUser.name.toLowerCase().includes(q);
      const matchStudent = t.studentName ? t.studentName.toLowerCase().includes(q) : false;
      const matchClass = t.className ? t.className.toLowerCase().includes(q) : false;
      const matchBody = t.messages.some((m) => m.body.toLowerCase().includes(q));
      if (!matchTeacher && !matchParent && !matchStudent && !matchClass && !matchBody) {
        return false;
      }
    }

    return true;
  });

  // Sort newest first
  filtered.sort((a, b) => (a.lastMessageAt < b.lastMessageAt ? 1 : -1));

  // Compute stats
  const teacherSet = new Set<ID>();
  const parentSet = new Set<ID>();
  let totalMessages = 0;

  for (const t of filtered) {
    teacherSet.add(t.teacherUser.id);
    parentSet.add(t.parentUser.id);
    totalMessages += t.messageCount;
  }

  return {
    threads: filtered,
    stats: {
      totalThreads: filtered.length,
      totalMessages,
      participatingTeachers: teacherSet.size,
      participatingParents: parentSet.size,
    },
  };
}

