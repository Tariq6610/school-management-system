/**
 * Fee and invoice balance calculation utilities.
 * Reference: DEVELOPMENT_GUIDELINES.md §8 & DATA_MODELS.md §5
 */

import { FeeInvoice, InvoiceStatus } from '@/types';

export interface InvoiceBalanceOptions {
  /**
   * Additional late fee surcharge to apply if invoice is overdue.
   */
  lateFee?: number;
  /**
   * Anchor comparison date in YYYY-MM-DD format (defaults to current date).
   */
  asOfDate?: string;
}

export interface InvoiceBalanceResult {
  grossAmount: number;
  discountAmount: number;
  subtotal: number;
  lateFee: number;
  netPayable: number;
  totalPaid: number;
  remainingBalance: number;
  isOverdue: boolean;
  effectiveStatus: InvoiceStatus;
}

/**
 * Consolidates discounts, payment receipts, and late fees into an authoritative balance and status.
 * Appears across billing, student profiles, fee collections, and parent portal.
 */
export function invoiceBalance(
  invoice: FeeInvoice,
  options: InvoiceBalanceOptions = {}
): InvoiceBalanceResult {
  const grossAmount = Math.max(0, invoice.totalAmount || 0);
  const discountAmount = Math.max(0, invoice.discountAmount || 0);
  const subtotal = Math.max(0, grossAmount - discountAmount);

  // Sum payments array if present, fallback to invoice.paidAmount
  let totalPaid = 0;
  if (Array.isArray(invoice.payments) && invoice.payments.length > 0) {
    totalPaid = invoice.payments.reduce((acc, p) => acc + (p.amount || 0), 0);
  } else {
    totalPaid = Math.max(0, invoice.paidAmount || 0);
  }

  const asOf = options.asOfDate ?? new Date().toISOString().slice(0, 10);
  const hasDueDatePassed = Boolean(invoice.dueDate && invoice.dueDate < asOf);

  // Check if balance remains before late fee
  const baseRemaining = subtotal - totalPaid;
  const isOverdue = hasDueDatePassed && baseRemaining > 0;

  const lateFee = (isOverdue && options.lateFee && options.lateFee > 0) ? options.lateFee : 0;
  const netPayable = subtotal + lateFee;
  const remainingBalance = Math.max(0, netPayable - totalPaid);

  let effectiveStatus: InvoiceStatus = 'pending';
  if (remainingBalance <= 0) {
    effectiveStatus = 'paid';
  } else if (totalPaid > 0) {
    effectiveStatus = 'partial';
  } else if (isOverdue) {
    effectiveStatus = 'overdue';
  } else {
    effectiveStatus = 'pending';
  }

  return {
    grossAmount,
    discountAmount,
    subtotal,
    lateFee,
    netPayable,
    totalPaid,
    remainingBalance,
    isOverdue,
    effectiveStatus,
  };
}
