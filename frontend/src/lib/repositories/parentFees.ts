import { STORAGE_KEYS } from '@/lib/storage';
import {
  Campus,
  Class,
  FeeInvoice,
  ID,
  Payment,
  PaymentMethod,
  Student,
  User,
} from '@/types';
import { listCollection } from './base';
import { listCampuses } from './campuses';
import { listClasses } from './classes';
import { createCollectionItem } from './base';

export interface EnrichedParentPaymentReceipt {
  id: ID;
  payment: Payment;
  invoiceId: ID;
  invoiceNumber: string;
  billingMonth?: string;
  receiptNumber: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  receivedAt: string;
}

export type ParentFeeDueStatus = 'overdue' | 'due_soon' | 'current' | 'all_paid';

export interface ParentStudentFeeOverview {
  student: Student;
  user: User;
  campus?: Campus;
  classInfo?: Class;
  outstandingBalance: number;
  totalInvoiced: number;
  totalDiscounts: number;
  totalPaid: number;
  nextDueDate: string | null;
  dueStatus: ParentFeeDueStatus;
  daysUntilDue: number | null;
  invoices: FeeInvoice[];
  receipts: EnrichedParentPaymentReceipt[];
}

/**
 * Computes complete fee overview for a student from a parent's perspective.
 */
export async function getParentStudentFeeOverview(
  studentId: ID,
  schoolId: ID,
  referenceDate: Date = new Date()
): Promise<ParentStudentFeeOverview | null> {
  const [students, users, campuses, classes, invoices] = await Promise.all([
    listCollection<Student>(STORAGE_KEYS.STUDENTS, { schoolId }, (s) => s.id === studentId),
    listCollection<User>(STORAGE_KEYS.USERS, { schoolId }),
    listCampuses({ schoolId }),
    listClasses({ schoolId }),
    listCollection<FeeInvoice>(STORAGE_KEYS.FEE_INVOICES, { schoolId }, (inv) => inv.studentId === studentId),
  ]);

  const student = students[0];
  if (!student) return null;

  const user = users.find((u) => u.id === student.userId) || {
    id: student.userId,
    schoolId,
    name: 'Student',
    email: '',
    role: 'student' as const,
    status: 'active' as const,
  };

  const campus = campuses.find((c) => c.id === student.campusId);
  const classInfo = classes.find((c) => c.id === student.classId);

  // Financial aggregates
  let totalInvoiced = 0;
  let totalDiscounts = 0;
  let totalPaid = 0;
  let outstandingBalance = 0;

  const receipts: EnrichedParentPaymentReceipt[] = [];
  const unpaidInvoices: FeeInvoice[] = [];

  for (const inv of invoices) {
    const netDue = Math.max(0, inv.totalAmount - inv.discountAmount);
    const remaining = Math.max(0, netDue - inv.paidAmount);

    totalInvoiced += inv.totalAmount;
    totalDiscounts += inv.discountAmount;
    totalPaid += inv.paidAmount;
    outstandingBalance += remaining;

    if (remaining > 0) {
      unpaidInvoices.push(inv);
    }

    if (Array.isArray(inv.payments)) {
      for (const p of inv.payments) {
        receipts.push({
          id: p.id,
          payment: p,
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber,
          billingMonth: inv.billingMonth,
          receiptNumber: p.receiptNumber || 'N/A',
          amount: p.amount,
          method: p.method,
          reference: p.reference,
          receivedAt: p.receivedAt || inv.dueDate,
        });
      }
    }
  }

  // Determine next due date and due status
  let nextDueDate: string | null = null;
  let dueStatus: ParentFeeDueStatus = 'all_paid';
  let daysUntilDue: number | null = null;

  if (outstandingBalance > 0 && unpaidInvoices.length > 0) {
    // Sort unpaid invoices by dueDate ascending to find earliest due date
    unpaidInvoices.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const earliest = unpaidInvoices[0];
    nextDueDate = earliest.dueDate;

    const dueTime = new Date(nextDueDate).getTime();
    const refTime = referenceDate.getTime();
    const diffMs = dueTime - refTime;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    daysUntilDue = diffDays;

    if (diffDays < 0 || earliest.status === 'overdue') {
      dueStatus = 'overdue';
    } else if (diffDays <= 7) {
      dueStatus = 'due_soon';
    } else {
      dueStatus = 'current';
    }
  }

  // Sort invoices newest first
  const sortedInvoices = [...invoices].sort((a, b) => b.dueDate.localeCompare(a.dueDate));

  // Sort receipts newest first
  receipts.sort((a, b) => (b.receivedAt < a.receivedAt ? -1 : 1));

  return {
    student,
    user,
    campus,
    classInfo,
    outstandingBalance,
    totalInvoiced,
    totalDiscounts,
    totalPaid,
    nextDueDate,
    dueStatus,
    daysUntilDue,
    invoices: sortedInvoices,
    receipts,
  };
}

/**
 * Generates an invoice for the current month if it doesn't already exist.
 * This is a prototype feature that MOCKS the generation process.
 */
export async function generateMonthlyInvoice(
  studentId: ID,
  schoolId: ID
): Promise<{ success: boolean; message: string; invoice?: FeeInvoice }> {
  const now = new Date();
  const currentMonthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  const existingInvoices = await listCollection<FeeInvoice>(
    STORAGE_KEYS.FEE_INVOICES,
    { schoolId },
    (inv) => inv.studentId === studentId && inv.billingMonth === currentMonthName
  );

  if (existingInvoices.length > 0) {
    return {
      success: false,
      message: `Invoice for ${currentMonthName} is already generated.`,
      invoice: existingInvoices[0],
    };
  }

  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + 7);

  const newInvoice: Omit<FeeInvoice, 'id'> = {
    schoolId,
    studentId,
    campusId: 'cam_main',
    feeStructureId: 'fs_mock',
    invoiceNumber: `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
    totalAmount: 5000,
    paidAmount: 0,
    discountAmount: 0,
    dueDate: dueDate.toISOString().split('T')[0],
    status: 'pending',
    billingMonth: currentMonthName,
    lineItems: [
      { label: 'Tuition Fee (Prototype)', amount: 5000 },
    ],
    payments: [],
  };

  const created = await createCollectionItem<FeeInvoice>(STORAGE_KEYS.FEE_INVOICES, newInvoice, 'inv');

  return {
    success: true,
    message: `Successfully generated invoice for ${currentMonthName}.`,
    invoice: created,
  };
}
