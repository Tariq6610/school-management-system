/**
 * Fees and payment entities: FeeStructure, FeeInvoice, Payment.
 * Reference: DATA_MODELS.md §5
 */

import { ID, ISODate } from './common';

export type FeeFrequency = 'monthly' | 'term' | 'annual';

export interface FeeStructure {
  id: ID;
  schoolId: ID;
  campusId?: ID;
  academicYearId: ID;
  name: string;
  amount: number;
  frequency: FeeFrequency;
  appliesToClassIds: ID[];
}

export type NewFeeStructure = Omit<FeeStructure, 'id'>;

export type ConcessionType = 'sibling' | 'scholarship' | 'staff_child' | 'special' | 'other';
export type ConcessionDiscountType = 'percentage' | 'fixed';

export interface StudentConcession {
  id: ID;
  schoolId: ID;
  studentId: ID;
  type: ConcessionType;
  name: string; // e.g. "Sibling Concession (15%)", "Merit Scholarship (25%)"
  discountType: ConcessionDiscountType;
  discountValue: number; // e.g. 15 for 15% or 3000 for PKR 3,000
  appliesToFeeStructureIds?: ID[]; // optional restriction
  reason?: string;
  approvedBy?: ID;
  startDate: ISODate;
  endDate?: ISODate;
  isActive: boolean;
}

export type NewStudentConcession = Omit<StudentConcession, 'id'>;

export interface AddInvoiceConcessionInput {
  type: ConcessionType;
  name: string;
  discountType: ConcessionDiscountType;
  discountValue: number;
  reason?: string;
}

export type InvoiceStatus = 'pending' | 'partial' | 'paid' | 'overdue';

export interface FeeLineItem {
  label: string;
  amount: number;
}

export type PaymentMethod = 'cash' | 'cheque' | 'bank';

export interface Payment {
  id: ID;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  receivedBy: ID;
  receivedAt: string;
  receiptNumber: string;
}

export type NewPayment = Omit<Payment, 'id'>;

export interface FeeInvoice {
  id: ID;
  schoolId: ID;
  campusId: ID;
  studentId: ID;
  feeStructureId: ID;
  invoiceNumber: string;
  billingMonth?: string; // e.g. '2026-10' or 'September 2026'
  lineItems: FeeLineItem[];
  totalAmount: number;
  discountAmount: number;
  paidAmount: number;
  dueDate: ISODate;
  status: InvoiceStatus;
  payments: Payment[];
}

export type NewFeeInvoice = Omit<FeeInvoice, 'id'>;

export interface BulkInvoiceParams {
  billingMonth: string; // 'YYYY-MM'
  dueDate: ISODate; // 'YYYY-MM-DD'
  campusId?: ID;
  classId?: ID;
  feeStructureIds?: ID[];
}

export interface InvoicePreviewItem {
  studentId: ID;
  studentName: string;
  admissionNumber: string;
  campusId: ID;
  campusName: string;
  classId: ID;
  className: string;
  feeStructureId: ID;
  feeStructureName: string;
  grossAmount: number;
  discountAmount: number;
  concessionLineItems?: FeeLineItem[];
  netAmount: number;
  isDuplicate: boolean;
  existingInvoiceId?: ID;
}

export interface BulkInvoicePreview {
  billingMonth: string;
  billingMonthLabel: string;
  dueDate: ISODate;
  totalEligibleStudents: number;
  newInvoicesCount: number;
  newInvoicesTotal: number;
  duplicateCount: number;
  duplicateTotal: number;
  items: InvoicePreviewItem[];
}

