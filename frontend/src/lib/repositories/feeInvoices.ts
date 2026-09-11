import { STORAGE_KEYS } from '@/lib/storage';
import {
  AddInvoiceConcessionInput,
  BulkInvoiceParams,
  BulkInvoicePreview,
  FeeInvoice,
  FeeLineItem,
  FeeStructure,
  ID,
  InvoicePreviewItem,
  InvoiceStatus,
  NewFeeInvoice,
  NewPayment,
  Payment,
  Scope,
} from '@/types';
import {
  createCollectionItem,
  deleteCollectionItem,
  generateId,
  getCollectionItem,
  listCollection,
  updateCollectionItem,
} from './base';
import { listActiveStudents } from './students';
import { listUsers } from './users';
import { listCampuses } from './campuses';
import { listClasses } from './classes';
import { listFeeStructures } from './feeStructures';
import { calculateStudentConcessions } from './studentConcessions';

export interface FeeInvoiceFilter {
  studentId?: ID;
  status?: InvoiceStatus;
  feeStructureId?: ID;
  campusId?: ID;
  classId?: ID;
  billingMonth?: string;
  search?: string;
}

/**
 * Format 'YYYY-MM' into a friendly label like 'October 2026'
 */
export function formatBillingMonthLabel(billingMonth: string): string {
  const parts = billingMonth.split('-');
  if (parts.length < 2) return billingMonth;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  if (isNaN(year) || isNaN(month)) return billingMonth;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Checks whether an invoice matches a target billing period
 */
function isInvoiceInPeriod(
  inv: FeeInvoice,
  studentId: ID,
  feeStructureId: ID,
  billingMonth: string,
  billingMonthLabel: string
): boolean {
  if (inv.studentId !== studentId) return false;
  if (inv.feeStructureId !== feeStructureId) return false;

  // 1. Explicit billingMonth property match
  if (inv.billingMonth && inv.billingMonth === billingMonth) {
    return true;
  }

  // 2. Due date in the same YYYY-MM
  if (inv.dueDate && inv.dueDate.startsWith(billingMonth)) {
    return true;
  }

  // 3. Line items reference the month name (e.g., 'October 2026')
  if (
    inv.lineItems?.some((item) =>
      item.label.toLowerCase().includes(billingMonthLabel.toLowerCase())
    )
  ) {
    return true;
  }

  return false;
}

export async function listFeeInvoices(
  scope: Scope,
  filter?: FeeInvoiceFilter
): Promise<FeeInvoice[]> {
  return listCollection<FeeInvoice>(STORAGE_KEYS.FEE_INVOICES, scope, (invoice) => {
    if (filter?.studentId && invoice.studentId !== filter.studentId) return false;
    if (filter?.status && invoice.status !== filter.status) return false;
    if (filter?.feeStructureId && invoice.feeStructureId !== filter.feeStructureId) return false;
    if (filter?.campusId && invoice.campusId !== filter.campusId) return false;
    if (filter?.billingMonth) {
      const monthLabel = formatBillingMonthLabel(filter.billingMonth);
      const inPeriod =
        invoice.billingMonth === filter.billingMonth ||
        (invoice.dueDate && invoice.dueDate.startsWith(filter.billingMonth)) ||
        invoice.lineItems?.some((item) =>
          item.label.toLowerCase().includes(monthLabel.toLowerCase())
        );
      if (!inPeriod) return false;
    }
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      const matchInvNumber = invoice.invoiceNumber?.toLowerCase().includes(q);
      if (!matchInvNumber) return false;
    }
    return true;
  });
}

export async function getFeeInvoice(id: ID): Promise<FeeInvoice | null> {
  return getCollectionItem<FeeInvoice>(STORAGE_KEYS.FEE_INVOICES, id);
}

export async function createFeeInvoice(input: NewFeeInvoice): Promise<FeeInvoice> {
  return createCollectionItem<FeeInvoice>(STORAGE_KEYS.FEE_INVOICES, input, 'inv');
}

export async function updateFeeInvoice(
  id: ID,
  patch: Partial<FeeInvoice>
): Promise<FeeInvoice> {
  return updateCollectionItem<FeeInvoice>(STORAGE_KEYS.FEE_INVOICES, id, patch);
}

/**
 * Find the next sequential receipt number (REC-YYYY-XXXXX)
 */
export async function getNextReceiptNumber(schoolId: ID): Promise<string> {
  const invoices = await listCollection<FeeInvoice>(
    STORAGE_KEYS.FEE_INVOICES,
    { schoolId }
  );

  let maxSeq = 0;
  for (const inv of invoices) {
    for (const p of inv.payments || []) {
      const match = p.receiptNumber?.match(/REC-\d{4}-(\d+)/);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }
  }

  const currentYear = new Date().getFullYear();
  return `REC-${currentYear}-${String(maxSeq + 1).padStart(5, '0')}`;
}

export interface ReceiptLookupResult {
  invoice: FeeInvoice;
  payment: Payment;
}

/**
 * Retrieves an issued payment receipt by its sequential number across all invoices.
 * Guaranteed idempotent and immutable: reprint does not generate a new number.
 */
export async function getPaymentReceiptByNumber(
  schoolId: ID,
  receiptNumber: string
): Promise<ReceiptLookupResult | null> {
  const invoices = await listCollection<FeeInvoice>(
    STORAGE_KEYS.FEE_INVOICES,
    { schoolId }
  );

  for (const inv of invoices) {
    if (Array.isArray(inv.payments)) {
      const match = inv.payments.find((p) => p.receiptNumber === receiptNumber);
      if (match) {
        return {
          invoice: inv,
          payment: match,
        };
      }
    }
  }

  return null;
}

export type RecordPaymentInput = Omit<NewPayment, 'receiptNumber' | 'receivedAt'> & {
  receiptNumber?: string;
  receivedAt?: string;
};

export async function recordPayment(
  invoiceId: ID,
  input: RecordPaymentInput
): Promise<FeeInvoice> {
  const invoice = await getFeeInvoice(invoiceId);
  if (!invoice) {
    throw new Error(`Invoice with id "${invoiceId}" not found`);
  }

  if (input.amount <= 0) {
    throw new Error('Payment amount must be greater than zero');
  }

  const netDue = invoice.totalAmount - invoice.discountAmount;
  const currentBalance = Math.max(0, netDue - invoice.paidAmount);
  if (currentBalance === 0) {
    throw new Error('Invoice is already fully paid');
  }

  const receiptNumber =
    input.receiptNumber || (await getNextReceiptNumber(invoice.schoolId));

  const payment: Payment = {
    ...input,
    id: generateId('pay'),
    receiptNumber,
    receivedAt: input.receivedAt || new Date().toISOString(),
  };

  const newPaidAmount = invoice.paidAmount + payment.amount;
  let newStatus: InvoiceStatus = 'partial';

  if (newPaidAmount >= netDue) {
    newStatus = 'paid';
  } else if (newPaidAmount === 0) {
    newStatus = invoice.status;
  }

  return updateFeeInvoice(invoiceId, {
    paidAmount: newPaidAmount,
    status: newStatus,
    payments: [...(invoice.payments || []), payment],
  });
}

export async function deleteFeeInvoice(id: ID): Promise<void> {
  return deleteCollectionItem<FeeInvoice>(STORAGE_KEYS.FEE_INVOICES, id);
}

/**
 * Preview bulk invoice generation.
 * Evaluates all eligible students and applicable fee structures for the given billing period.
 * Accurately detects existing invoices so duplicates are flagged as skipped.
 */
export async function previewBulkInvoiceGeneration(
  scope: Scope,
  params: BulkInvoiceParams
): Promise<BulkInvoicePreview> {
  const billingMonthLabel = formatBillingMonthLabel(params.billingMonth);
  const targetCampus = params.campusId || scope.campusId;
  const studentScope: Scope = { schoolId: scope.schoolId, campusId: targetCampus };

  // 1. Fetch active students in scope
  const students = await listActiveStudents(
    studentScope,
    params.classId ? { classId: params.classId } : undefined
  );

  // 2. Fetch reference data for display labels
  const [studentUsers, campuses, classes, allStructures, existingInvoices] = await Promise.all([
    listUsers({ schoolId: scope.schoolId }, { role: 'student' }),
    listCampuses({ schoolId: scope.schoolId }),
    listClasses(studentScope),
    listFeeStructures({ schoolId: scope.schoolId }),
    listCollection<FeeInvoice>(STORAGE_KEYS.FEE_INVOICES, { schoolId: scope.schoolId }),
  ]);

  const userMap = new Map(studentUsers.map((u) => [u.id, u]));
  const campusMap = new Map(campuses.map((c) => [c.id, c.name]));
  const classMap = new Map(classes.map((c) => [c.id, `${c.grade} - ${c.section}`]));

  // Filter structures if user selected specific ones
  let eligibleStructures: FeeStructure[] = allStructures;
  if (params.feeStructureIds && params.feeStructureIds.length > 0) {
    eligibleStructures = allStructures.filter((s) => params.feeStructureIds!.includes(s.id));
  }

  const items: InvoicePreviewItem[] = [];
  let newInvoicesCount = 0;
  let newInvoicesTotal = 0;
  let duplicateCount = 0;
  let duplicateTotal = 0;

  for (const student of students) {
    const user = userMap.get(student.userId);
    const studentName = user?.name || `Student ${student.admissionNumber}`;
    const campusName = campusMap.get(student.campusId) || 'Main Campus';
    const className = classMap.get(student.classId) || 'Unassigned';

    // Find applicable fee structures for this student's class and campus
    const applicableStructures = eligibleStructures.filter((structure) => {
      // Must apply to the student's class
      if (!structure.appliesToClassIds.includes(student.classId)) {
        return false;
      }
      // If structure has a campus scope, must match student's campus
      if (structure.campusId && structure.campusId !== student.campusId) {
        return false;
      }
      return true;
    });

    for (const structure of applicableStructures) {
      const grossAmount = structure.amount;
      // Calculate concessions explicitly (sibling, scholarships, staff child)
      const concessionResult = await calculateStudentConcessions({
        schoolId: scope.schoolId,
        studentId: student.id,
        feeStructureId: structure.id,
        grossAmount,
      });
      const discountAmount = concessionResult.totalDiscount;
      const netAmount = concessionResult.netAmount;
      const concessionLineItems = concessionResult.lineItems;

      // Check if an invoice for this student, structure, and billing period already exists
      const existing = existingInvoices.find((inv) =>
        isInvoiceInPeriod(inv, student.id, structure.id, params.billingMonth, billingMonthLabel)
      );

      const isDuplicate = Boolean(existing);

      if (isDuplicate) {
        duplicateCount++;
        duplicateTotal += netAmount;
      } else {
        newInvoicesCount++;
        newInvoicesTotal += netAmount;
      }

      items.push({
        studentId: student.id,
        studentName,
        admissionNumber: student.admissionNumber,
        campusId: student.campusId,
        campusName,
        classId: student.classId,
        className,
        feeStructureId: structure.id,
        feeStructureName: structure.name,
        grossAmount,
        discountAmount,
        concessionLineItems,
        netAmount,
        isDuplicate,
        existingInvoiceId: existing?.id,
      });
    }
  }

  return {
    billingMonth: params.billingMonth,
    billingMonthLabel,
    dueDate: params.dueDate,
    totalEligibleStudents: students.length,
    newInvoicesCount,
    newInvoicesTotal,
    duplicateCount,
    duplicateTotal,
    items,
  };
}

/**
 * Execute bulk invoice generation.
 * Generates sequential invoice numbers and creates invoices ONLY for non-duplicate items.
 * Guaranteed idempotent: re-running for the same period creates 0 duplicates.
 */
export async function generateBulkInvoices(
  scope: Scope,
  params: BulkInvoiceParams
): Promise<{
  createdCount: number;
  skippedCount: number;
  totalAmount: number;
  createdInvoices: FeeInvoice[];
}> {
  const preview = await previewBulkInvoiceGeneration(scope, params);
  const toCreate = preview.items.filter((item) => !item.isDuplicate);

  if (toCreate.length === 0) {
    return {
      createdCount: 0,
      skippedCount: preview.duplicateCount,
      totalAmount: 0,
      createdInvoices: [],
    };
  }

  // Find the highest sequence number among existing invoices
  const existingInvoices = await listCollection<FeeInvoice>(
    STORAGE_KEYS.FEE_INVOICES,
    { schoolId: scope.schoolId }
  );

  let maxSeq = 0;
  for (const inv of existingInvoices) {
    const match = inv.invoiceNumber?.match(/INV-\d{4}-(\d+)/);
    if (match) {
      const seq = parseInt(match[1], 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }

  const currentYear = new Date().getFullYear();
  let seqCounter = maxSeq;
  const createdInvoices: FeeInvoice[] = [];

  for (const item of toCreate) {
    seqCounter++;
    const invoiceNumber = `INV-${currentYear}-${String(seqCounter).padStart(5, '0')}`;

    const lineItems: FeeLineItem[] = [
      {
        label: `${item.feeStructureName} (${preview.billingMonthLabel})`,
        amount: item.grossAmount,
      },
      ...(item.concessionLineItems && item.concessionLineItems.length > 0
        ? item.concessionLineItems
        : item.discountAmount > 0
        ? [{ label: 'Sibling Concession (15%)', amount: -item.discountAmount }]
        : []),
    ];

    const newInvoice = await createFeeInvoice({
      schoolId: scope.schoolId,
      campusId: item.campusId,
      studentId: item.studentId,
      feeStructureId: item.feeStructureId,
      invoiceNumber,
      billingMonth: params.billingMonth,
      dueDate: params.dueDate,
      lineItems,
      totalAmount: item.grossAmount,
      discountAmount: item.discountAmount,
      paidAmount: 0,
      status: 'pending',
      payments: [],
    });

    createdInvoices.push(newInvoice);
  }

  return {
    createdCount: createdInvoices.length,
    skippedCount: preview.duplicateCount,
    totalAmount: preview.newInvoicesTotal,
    createdInvoices,
  };
}

/**
 * Applies an explicit concession or scholarship line item to an invoice.
 * Guaranteed NEVER silent: appends a named negative line item (amount < 0)
 * and recalculates discountAmount, netDue, and invoice status.
 */
export async function applyInvoiceConcession(
  invoiceId: ID,
  concession: AddInvoiceConcessionInput
): Promise<FeeInvoice> {
  const invoice = await getFeeInvoice(invoiceId);
  if (!invoice) {
    throw new Error(`Invoice with id "${invoiceId}" not found`);
  }
  if (invoice.status === 'paid') {
    throw new Error('Cannot add concession to a fully settled invoice');
  }
  if (concession.discountValue <= 0) {
    throw new Error('Concession discount value must be greater than zero');
  }
  if (concession.discountType === 'percentage' && concession.discountValue > 100) {
    throw new Error('Percentage concession cannot exceed 100%');
  }

  const currentRemainingGross = Math.max(0, invoice.totalAmount - invoice.discountAmount);
  let deduction = 0;
  if (concession.discountType === 'percentage') {
    deduction = Math.round((invoice.totalAmount * concession.discountValue) / 100);
  } else {
    deduction = Math.min(currentRemainingGross, concession.discountValue);
  }

  if (deduction <= 0) {
    throw new Error('Calculated concession discount is zero');
  }

  const newDiscountAmount = invoice.discountAmount + deduction;
  const newNetDue = Math.max(0, invoice.totalAmount - newDiscountAmount);

  const lineItemLabel =
    concession.name ||
    `${concession.type === 'scholarship' ? 'Scholarship' : 'Concession'} (${concession.discountValue}${concession.discountType === 'percentage' ? '%' : ''})`;

  const updatedLineItems: FeeLineItem[] = [
    ...invoice.lineItems,
    {
      label: lineItemLabel,
      amount: -deduction,
    },
  ];

  let newStatus: InvoiceStatus = invoice.status;
  if (invoice.paidAmount >= newNetDue) {
    newStatus = 'paid';
  } else if (invoice.paidAmount > 0) {
    newStatus = 'partial';
  }

  return updateFeeInvoice(invoiceId, {
    lineItems: updatedLineItems,
    discountAmount: newDiscountAmount,
    status: newStatus,
  });
}

/**
 * Removes an explicit concession line item by index and recalculates balance and status.
 */
export async function removeInvoiceConcession(
  invoiceId: ID,
  lineItemIndex: number
): Promise<FeeInvoice> {
  const invoice = await getFeeInvoice(invoiceId);
  if (!invoice) {
    throw new Error(`Invoice with id "${invoiceId}" not found`);
  }
  if (lineItemIndex < 0 || lineItemIndex >= invoice.lineItems.length) {
    throw new Error('Invalid line item index');
  }

  const targetItem = invoice.lineItems[lineItemIndex];
  if (targetItem.amount >= 0) {
    throw new Error('Cannot remove a regular fee line item using removeInvoiceConcession');
  }

  const removedDiscount = Math.abs(targetItem.amount);
  const newDiscountAmount = Math.max(0, invoice.discountAmount - removedDiscount);
  const newNetDue = Math.max(0, invoice.totalAmount - newDiscountAmount);

  const updatedLineItems = invoice.lineItems.filter((_, idx) => idx !== lineItemIndex);

  let newStatus: InvoiceStatus = invoice.status;
  if (invoice.paidAmount >= newNetDue && newNetDue > 0) {
    newStatus = 'paid';
  } else if (invoice.paidAmount > 0) {
    newStatus = 'partial';
  } else {
    newStatus = 'pending';
  }

  return updateFeeInvoice(invoiceId, {
    lineItems: updatedLineItems,
    discountAmount: newDiscountAmount,
    status: newStatus,
  });
}


