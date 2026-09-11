import { STORAGE_KEYS } from '@/lib/storage';
import {
  Campus,
  Class,
  FeeInvoice,
  ID,
  Scope,
  Student,
  User,
} from '@/types';
import { listCollection } from './base';
import { listCampuses } from './campuses';
import { listClasses } from './classes';
import { getParentsForStudent } from './studentParents';
import { logWhatsAppMessage } from './whatsappLog';

export interface DefaulterStudentSummary {
  student: Student;
  user: User;
  campus?: Campus;
  classInfo?: Class;
  parentName?: string;
  parentPhone?: string;
  overdueInvoices: FeeInvoice[];
  totalOverdueAmount: number;
  maxDaysOverdue: number;
  minDueDate: string;
}

export interface DefaultersReportFilter {
  minDaysOverdue?: number; // e.g. 7, 15, 30, 60
  minAmount?: number; // e.g. 5000, 10000
  campusId?: ID;
  classId?: ID;
  search?: string; // student name, roll number, admission number, parent phone
}

export interface DefaultersReportResult {
  defaulters: DefaulterStudentSummary[];
  totalDefaultersCount: number;
  totalOverdueAmount: number;
  averageDaysOverdue: number;
  criticalOverdueCount: number; // 30+ days overdue
}

/**
 * Calculates days between two date strings (or Date objects).
 * Returns >= 0 if past due.
 */
export function calculateDaysOverdue(dueDateStr: string, referenceDate: Date = new Date()): number {
  const due = new Date(dueDateStr);
  const diffTime = referenceDate.getTime() - due.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Checks whether an invoice is currently overdue.
 */
export function isInvoiceOverdue(invoice: FeeInvoice, referenceDate: Date = new Date()): boolean {
  const remaining = Math.max(0, (invoice.totalAmount - invoice.discountAmount) - invoice.paidAmount);
  if (remaining <= 0) return false;
  if (invoice.status === 'overdue') return true;

  const due = new Date(invoice.dueDate);
  return due.getTime() < referenceDate.getTime();
}

/**
 * Generates the Defaulters Report by analyzing invoices, students, and parent contacts.
 */
export async function getDefaultersReport(
  scope: Scope,
  filter?: DefaultersReportFilter,
  referenceDate: Date = new Date()
): Promise<DefaultersReportResult> {
  const [allInvoices, allStudents, allUsers, allCampuses, allClasses] = await Promise.all([
    listCollection<FeeInvoice>(STORAGE_KEYS.FEE_INVOICES, scope),
    listCollection<Student>(STORAGE_KEYS.STUDENTS, { schoolId: scope.schoolId }),
    listCollection<User>(STORAGE_KEYS.USERS, { schoolId: scope.schoolId }),
    listCampuses({ schoolId: scope.schoolId }),
    listClasses(scope),
  ]);

  const studentsMap = new Map<ID, Student>(allStudents.map((s) => [s.id, s]));
  const usersMap = new Map<ID, User>(allUsers.map((u) => [u.id, u]));
  const campusesMap = new Map<ID, Campus>(allCampuses.map((c) => [c.id, c]));
  const classesMap = new Map<ID, Class>(allClasses.map((c) => [c.id, c]));

  // 1. Filter overdue invoices
  const overdueInvoices = allInvoices.filter((inv) => isInvoiceOverdue(inv, referenceDate));

  // 2. Group overdue invoices by student
  const studentInvoicesMap = new Map<ID, FeeInvoice[]>();
  for (const inv of overdueInvoices) {
    const list = studentInvoicesMap.get(inv.studentId) || [];
    list.push(inv);
    studentInvoicesMap.set(inv.studentId, list);
  }

  // 3. Assemble and enrich defaulters list
  const defaulterList: DefaulterStudentSummary[] = [];

  for (const [studentId, invoices] of studentInvoicesMap.entries()) {
    const student = studentsMap.get(studentId);
    if (!student || student.status !== 'active') {
      // Exclude inactive students
      continue;
    }

    const user = usersMap.get(student.userId);
    if (!user) continue;

    // Apply campus and class filters if set
    if (filter?.campusId && student.campusId !== filter.campusId) {
      continue;
    }
    if (filter?.classId && student.classId !== filter.classId) {
      continue;
    }

    // Overdue calculations
    let totalOverdue = 0;
    let maxDays = 0;
    let earliestDueDate = invoices[0]?.dueDate || '';

    for (const inv of invoices) {
      const remaining = Math.max(0, (inv.totalAmount - inv.discountAmount) - inv.paidAmount);
      totalOverdue += remaining;
      const days = calculateDaysOverdue(inv.dueDate, referenceDate);
      if (days > maxDays) maxDays = days;
      if (!earliestDueDate || inv.dueDate < earliestDueDate) {
        earliestDueDate = inv.dueDate;
      }
    }

    // Acceptance Criteria: Filter by amount and days overdue
    if (filter?.minDaysOverdue !== undefined && maxDays < filter.minDaysOverdue) {
      continue;
    }
    if (filter?.minAmount !== undefined && totalOverdue < filter.minAmount) {
      continue;
    }

    // Search query match (student name, roll, admission number)
    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      const matchName = user.name.toLowerCase().includes(q);
      const matchRoll = student.rollNumber.toLowerCase().includes(q);
      const matchAdm = student.admissionNumber.toLowerCase().includes(q);
      if (!matchName && !matchRoll && !matchAdm) {
        continue;
      }
    }

    // Fetch parent contacts (primary guardian)
    const parents = await getParentsForStudent(student.id);
    const primaryParent = parents[0];
    const parentName = primaryParent ? primaryParent.user.name : undefined;
    const parentPhone = primaryParent
      ? (primaryParent.user.phone || student.health?.emergencyContacts?.[0]?.phone)
      : student.health?.emergencyContacts?.[0]?.phone;

    defaulterList.push({
      student,
      user,
      campus: campusesMap.get(student.campusId),
      classInfo: classesMap.get(student.classId),
      parentName,
      parentPhone,
      overdueInvoices: invoices.sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1)),
      totalOverdueAmount: totalOverdue,
      maxDaysOverdue: maxDays,
      minDueDate: earliestDueDate,
    });
  }

  // Sort descending by max days overdue, then by total overdue amount
  defaulterList.sort((a, b) => {
    if (b.maxDaysOverdue !== a.maxDaysOverdue) {
      return b.maxDaysOverdue - a.maxDaysOverdue;
    }
    return b.totalOverdueAmount - a.totalOverdueAmount;
  });

  // Calculate high-level summary metrics
  const totalDefaultersCount = defaulterList.length;
  const totalOverdueAmount = defaulterList.reduce((acc, d) => acc + d.totalOverdueAmount, 0);
  const averageDaysOverdue =
    totalDefaultersCount > 0
      ? Math.round(defaulterList.reduce((acc, d) => acc + d.maxDaysOverdue, 0) / totalDefaultersCount)
      : 0;
  const criticalOverdueCount = defaulterList.filter((d) => d.maxDaysOverdue >= 30).length;

  return {
    defaulters: defaulterList,
    totalDefaultersCount,
    totalOverdueAmount,
    averageDaysOverdue,
    criticalOverdueCount,
  };
}

/**
 * Parameters for sending a WhatsApp fee reminder.
 */
export interface SendReminderParams {
  studentId: ID;
  schoolId: ID;
  campusName?: string;
  studentName: string;
  parentName?: string;
  parentPhone?: string;
  overdueAmount: number;
  dueDate: string;
}

/**
 * Sends an individual fee reminder, appending to the WhatsApp mock log (`sp:v1:whatsappLog`).
 */
export async function sendDefaulterReminder(
  scope: Scope,
  params: SendReminderParams
): Promise<{ success: boolean; logId: string; message: string }> {
  const recipient = params.parentName || 'Parent / Guardian';
  const phone = params.parentPhone || '+92 300 1234567';
  const campusLabel = params.campusName || 'Main Campus';
  const formattedAmount = params.overdueAmount.toLocaleString('en-PK');

  // WhatsApp template per FEATURE_SPECIFICATIONS.md §16:
  // Fee reminder: Dear {parent}, fee of Rs {amount} for {student} is due on {date}. — {campus}
  const body = `Dear ${recipient}, fee of Rs ${formattedAmount} for ${params.studentName} was due on ${params.dueDate}. Please clear the outstanding balance at your earliest convenience. — ${campusLabel}`;

  const log = await logWhatsAppMessage({
    schoolId: params.schoolId || scope.schoolId,
    recipientName: recipient,
    recipientPhone: phone,
    template: 'fee_reminder',
    body,
    trigger: 'defaulter_reminder',
    status: 'sent',
  });

  return {
    success: true,
    logId: log.id,
    message: body,
  };
}

/**
 * Bulk action: Sends fee reminders to multiple students and appends all to the WhatsApp mock log.
 */
export async function sendBulkDefaulterReminders(
  scope: Scope,
  targets: SendReminderParams[]
): Promise<{ sentCount: number; errorsCount: number }> {
  let sentCount = 0;
  let errorsCount = 0;

  for (const target of targets) {
    try {
      await sendDefaulterReminder(scope, target);
      sentCount++;
    } catch {
      errorsCount++;
    }
  }

  return { sentCount, errorsCount };
}

/**
 * Chronological student fee ledger transaction entry.
 */
export type LedgerEntryType = 'invoice' | 'concession' | 'payment';

export interface StudentLedgerEntry {
  id: string;
  date: string;
  type: LedgerEntryType;
  referenceNumber: string; // e.g. INV-2026-0001 or REC-2026-00001
  description: string;
  debit: number; // Charges incurred
  credit: number; // Payments or discounts received
  runningBalance: number;
}

export interface StudentFeeLedgerStatement {
  student: Student;
  user: User;
  campus?: Campus;
  classInfo?: Class;
  totalInvoiced: number;
  totalDiscounted: number;
  totalPaid: number;
  outstandingBalance: number;
  entries: StudentLedgerEntry[];
}

/**
 * Computes a comprehensive chronological student fee ledger with running balance.
 * Guaranteed invariant: runningBalance = cumulative(debit - credit).
 */
export async function getStudentFeeLedger(
  studentId: ID,
  schoolId: ID
): Promise<StudentFeeLedgerStatement | null> {
  const [student, user, campuses, classes, invoices] = await Promise.all([
    listCollection<Student>(STORAGE_KEYS.STUDENTS, { schoolId }, (s) => s.id === studentId).then(
      (res) => res[0] ?? null
    ),
    listCollection<User>(STORAGE_KEYS.USERS, { schoolId }),
    listCampuses({ schoolId }),
    listClasses({ schoolId }),
    listCollection<FeeInvoice>(STORAGE_KEYS.FEE_INVOICES, { schoolId }, (inv) => inv.studentId === studentId),
  ]);

  if (!student) return null;

  const studentUser = user.find((u) => u.id === student.userId) || {
    id: student.userId,
    schoolId,
    name: 'Unknown Student',
    email: '',
    role: 'student' as const,
    status: 'active' as const,
  };

  const campus = campuses.find((c) => c.id === student.campusId);
  const classInfo = classes.find((c) => c.id === student.classId);

  // Collect raw ledger items
  interface RawTransaction {
    date: string;
    type: LedgerEntryType;
    referenceNumber: string;
    description: string;
    debit: number;
    credit: number;
  }

  const rawTransactions: RawTransaction[] = [];
  let totalInvoiced = 0;
  let totalDiscounted = 0;
  let totalPaid = 0;

  for (const inv of invoices) {
    // 1. Invoice gross charges (debit)
    const grossAmount = inv.totalAmount;
    totalInvoiced += grossAmount;

    rawTransactions.push({
      date: inv.dueDate, // Invoicing effective date / due date
      type: 'invoice',
      referenceNumber: inv.invoiceNumber,
      description: `Invoice generated (${inv.billingMonth || 'Standard Term'}) — ${inv.lineItems?.map((li) => li.label).join(', ') || 'Tuition & Fees'}`,
      debit: grossAmount,
      credit: 0,
    });

    // 2. Concession / Scholarship applied (credit against invoice)
    if (inv.discountAmount > 0) {
      totalDiscounted += inv.discountAmount;
      rawTransactions.push({
        date: inv.dueDate,
        type: 'concession',
        referenceNumber: inv.invoiceNumber,
        description: `Concession / Scholarship applied to ${inv.invoiceNumber}`,
        debit: 0,
        credit: inv.discountAmount,
      });
    }

    // 3. Payments made on this invoice (credit)
    if (Array.isArray(inv.payments)) {
      for (const p of inv.payments) {
        totalPaid += p.amount;
        rawTransactions.push({
          date: p.receivedAt ? p.receivedAt.split('T')[0] : inv.dueDate,
          type: 'payment',
          referenceNumber: p.receiptNumber || 'N/A',
          description: `Payment received (${p.method.toUpperCase()}${p.reference ? ` - Ref: ${p.reference}` : ''})`,
          debit: 0,
          credit: p.amount,
        });
      }
    }
  }

  // Sort transactions chronologically
  rawTransactions.sort((a, b) => {
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }
    // For same date, place invoices first, then concessions, then payments
    const order: Record<LedgerEntryType, number> = { invoice: 1, concession: 2, payment: 3 };
    return order[a.type] - order[b.type];
  });

  // Calculate running balance after each entry
  let currentBalance = 0;
  const entries: StudentLedgerEntry[] = rawTransactions.map((tx, idx) => {
    currentBalance += tx.debit - tx.credit;
    return {
      id: `led_${studentId}_${idx + 1}`,
      date: tx.date,
      type: tx.type,
      referenceNumber: tx.referenceNumber,
      description: tx.description,
      debit: tx.debit,
      credit: tx.credit,
      runningBalance: currentBalance,
    };
  });

  const outstandingBalance = (totalInvoiced - totalDiscounted) - totalPaid;

  return {
    student,
    user: studentUser,
    campus,
    classInfo,
    totalInvoiced,
    totalDiscounted,
    totalPaid,
    outstandingBalance: Math.max(0, outstandingBalance),
    entries,
  };
}
