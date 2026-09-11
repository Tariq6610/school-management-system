import { STORAGE_KEYS } from '@/lib/storage';
import { ID, NewWhatsAppLog, Scope, WhatsAppLog } from '@/types';
import {
  createCollectionItem,
  deleteCollectionItem,
  getCollectionItem,
  listCollection,
  updateCollectionItem,
} from './base';

export interface WhatsAppTemplateDefinition {
  id: string;
  trigger: 'Absence' | 'Fee reminder' | 'Homework' | 'Announcement' | 'Result published';
  name: string;
  category: 'UTILITY' | 'MARKETING';
  templateText: string;
  variables: string[];
  description: string;
  metaStatus: 'APPROVED' | 'PENDING' | 'REJECTED';
}

export const WHATSAPP_TEMPLATES: Record<string, WhatsAppTemplateDefinition> = {
  absence: {
    id: 'absence_alert_v1',
    trigger: 'Absence',
    name: 'Student Absence Notification',
    category: 'UTILITY',
    templateText: 'Dear {parent}, {student} was marked absent today, {date}. — {campus}',
    variables: ['parent', 'student', 'date', 'campus'],
    description: 'Triggered when a teacher marks a student absent during class attendance.',
    metaStatus: 'APPROVED',
  },
  fee_reminder: {
    id: 'fee_reminder_v1',
    trigger: 'Fee reminder',
    name: 'Fee Due / Overdue Notice',
    category: 'UTILITY',
    templateText: 'Dear {parent}, fee of Rs {amount} for {student} is due on {date}. — {campus}',
    variables: ['parent', 'amount', 'student', 'date', 'campus'],
    description: 'Triggered by scheduled billing runs or admin manual defaulter reminders.',
    metaStatus: 'APPROVED',
  },
  homework: {
    id: 'homework_assignment_v1',
    trigger: 'Homework',
    name: 'New Homework Assigned',
    category: 'UTILITY',
    templateText: 'New homework in {subject} for {student}, due {date}. — {campus}',
    variables: ['subject', 'student', 'date', 'campus'],
    description: 'Triggered when a teacher assigns new homework or coursework.',
    metaStatus: 'APPROVED',
  },
  announcement: {
    id: 'campus_announcement_v1',
    trigger: 'Announcement',
    name: 'School & Campus Announcement',
    category: 'UTILITY',
    templateText: '{title}\n\n{body}\n— {campus}',
    variables: ['title', 'body', 'campus'],
    description: 'Triggered when school administration publishes an official announcement.',
    metaStatus: 'APPROVED',
  },
  result_published: {
    id: 'exam_result_published_v1',
    trigger: 'Result published',
    name: 'Exam Results Published',
    category: 'UTILITY',
    templateText: 'Results for {exam} are now available for {student}. — {campus}',
    variables: ['exam', 'student', 'campus'],
    description: 'Triggered when an administrator marks an exam status as published.',
    metaStatus: 'APPROVED',
  },
};

export async function listWhatsAppLogs(scope: Scope): Promise<WhatsAppLog[]> {
  const logs = await listCollection<WhatsAppLog>(STORAGE_KEYS.WHATSAPP_LOG, scope);
  return logs.sort((a, b) => (a.sentAt < b.sentAt ? 1 : -1));
}

export async function getWhatsAppLog(id: ID): Promise<WhatsAppLog | null> {
  return getCollectionItem<WhatsAppLog>(STORAGE_KEYS.WHATSAPP_LOG, id);
}

export async function logWhatsAppMessage(input: NewWhatsAppLog): Promise<WhatsAppLog> {
  const payload = {
    ...input,
    sentAt: input.sentAt || new Date().toISOString(),
  };
  return createCollectionItem<WhatsAppLog>(STORAGE_KEYS.WHATSAPP_LOG, payload, 'wal');
}

export async function updateWhatsAppLog(
  id: ID,
  patch: Partial<WhatsAppLog>
): Promise<WhatsAppLog> {
  return updateCollectionItem<WhatsAppLog>(STORAGE_KEYS.WHATSAPP_LOG, id, patch);
}

export async function deleteWhatsAppLog(id: ID): Promise<void> {
  return deleteCollectionItem<WhatsAppLog>(STORAGE_KEYS.WHATSAPP_LOG, id);
}

export async function clearWhatsAppLogs(scope: Scope): Promise<number> {
  const logs = await listWhatsAppLogs(scope);
  for (const log of logs) {
    await deleteWhatsAppLog(log.id);
  }
  return logs.length;
}

// ---------------------------------------------------------------------------
// Canonical Template Trigger Helpers (FEATURE_SPECIFICATIONS.md §16)
// ---------------------------------------------------------------------------

export async function triggerAbsenceWhatsAppAlert(
  scope: Scope,
  params: {
    parentName: string;
    studentName: string;
    date: string;
    campusName: string;
    phone?: string;
  }
): Promise<WhatsAppLog> {
  const body = `Dear ${params.parentName}, ${params.studentName} was marked absent today, ${params.date}. — ${params.campusName}`;
  return logWhatsAppMessage({
    schoolId: scope.schoolId || 'sch_main',
    recipientName: params.parentName,
    recipientPhone: params.phone || '+92 300 1234567',
    template: WHATSAPP_TEMPLATES.absence.templateText,
    body,
    trigger: 'Absence',
    status: 'delivered',
  });
}

export async function triggerFeeReminderWhatsAppAlert(
  scope: Scope,
  params: {
    parentName: string;
    amount: string | number;
    studentName: string;
    date: string;
    campusName: string;
    phone?: string;
  }
): Promise<WhatsAppLog> {
  const formattedAmount = typeof params.amount === 'number' ? params.amount.toLocaleString('en-PK') : params.amount;
  const body = `Dear ${params.parentName}, fee of Rs ${formattedAmount} for ${params.studentName} is due on ${params.date}. — ${params.campusName}`;
  return logWhatsAppMessage({
    schoolId: scope.schoolId || 'sch_main',
    recipientName: params.parentName,
    recipientPhone: params.phone || '+92 300 1234567',
    template: WHATSAPP_TEMPLATES.fee_reminder.templateText,
    body,
    trigger: 'Fee reminder',
    status: 'delivered',
  });
}

export async function triggerHomeworkWhatsAppAlert(
  scope: Scope,
  params: {
    subject: string;
    studentName: string;
    date: string;
    campusName: string;
    parentName?: string;
    phone?: string;
  }
): Promise<WhatsAppLog> {
  const parent = params.parentName || 'Parent / Guardian';
  const body = `New homework in ${params.subject} for ${params.studentName}, due ${params.date}. — ${params.campusName}`;
  return logWhatsAppMessage({
    schoolId: scope.schoolId || 'sch_main',
    recipientName: parent,
    recipientPhone: params.phone || '+92 300 1234567',
    template: WHATSAPP_TEMPLATES.homework.templateText,
    body,
    trigger: 'Homework',
    status: 'sent',
  });
}

export async function triggerAnnouncementWhatsAppAlert(
  scope: Scope,
  params: {
    title: string;
    body: string;
    campusName: string;
    parentName?: string;
    phone?: string;
  }
): Promise<WhatsAppLog> {
  const messageBody = `${params.title}\n\n${params.body}\n— ${params.campusName}`;
  return logWhatsAppMessage({
    schoolId: scope.schoolId || 'sch_main',
    recipientName: params.parentName || 'All Registered Parents',
    recipientPhone: params.phone || '+92 300 1234567',
    template: WHATSAPP_TEMPLATES.announcement.templateText,
    body: messageBody,
    trigger: 'Announcement',
    status: 'delivered',
  });
}

export async function triggerResultPublishedWhatsAppAlert(
  scope: Scope,
  params: {
    examName: string;
    studentName: string;
    campusName: string;
    parentName?: string;
    phone?: string;
  }
): Promise<WhatsAppLog> {
  const parent = params.parentName || 'Parent / Guardian';
  const body = `Results for ${params.examName} are now available for ${params.studentName}. — ${params.campusName}`;
  return logWhatsAppMessage({
    schoolId: scope.schoolId || 'sch_main',
    recipientName: parent,
    recipientPhone: params.phone || '+92 300 1234567',
    template: WHATSAPP_TEMPLATES.result_published.templateText,
    body,
    trigger: 'Result published',
    status: 'read',
  });
}
