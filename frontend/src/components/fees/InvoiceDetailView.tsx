'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Campus,
  Class,
  FeeInvoice,
  ID,
  Payment,
  Scope,
  Student,
  User,
} from '@/types';
import { getFeeInvoice, removeInvoiceConcession } from '@/lib/repositories/feeInvoices';
import { getStudent } from '@/lib/repositories/students';
import { getUser, listUsers } from '@/lib/repositories/users';
import { listClasses } from '@/lib/repositories/classes';
import { listCampuses } from '@/lib/repositories/campuses';
import { formatCurrency } from '@/lib/utils/currency';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/ui/Toast';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { RecordPaymentModal } from './RecordPaymentModal';
import { PaymentReceiptModal } from './PaymentReceiptModal';
import { ApplyConcessionModal } from './ApplyConcessionModal';
import { StudentConcessionsModal } from './StudentConcessionsModal';

export interface InvoiceDetailViewProps {
  invoiceId: ID;
  initialInvoice?: FeeInvoice;
}

export function InvoiceDetailView({
  invoiceId,
  initialInvoice,
}: InvoiceDetailViewProps) {
  const { session } = useSession();
  const { showToast } = useToast();
  const schoolId = session?.schoolId ?? 'sch_main';

  // Data states
  const [invoice, setInvoice] = useState<FeeInvoice | null>(initialInvoice || null);
  const [student, setStudent] = useState<Student | null>(null);
  const [studentUser, setStudentUser] = useState<User | null>(null);
  const [cls, setCls] = useState<Class | null>(null);
  const [campus, setCampus] = useState<Campus | null>(null);
  const [adminUsers, setAdminUsers] = useState<Map<ID, User>>(new Map());
  const [loading, setLoading] = useState(!initialInvoice);

  // Modal states
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<Payment | null>(null);
  const [isReceiptReprint, setIsReceiptReprint] = useState(false);
  const [isConcessionModalOpen, setIsConcessionModalOpen] = useState(false);
  const [isStudentConcessionsOpen, setIsStudentConcessionsOpen] = useState(false);

  const loadInvoiceData = useCallback(async () => {
    try {
      const inv = await getFeeInvoice(invoiceId);
      if (!inv) {
        showToast({
          type: 'error',
          title: 'Not found',
          message: `Invoice ${invoiceId} could not be found.`,
        });
        setLoading(false);
        return;
      }
      setInvoice(inv);

      // Load associated student, user, class, campus, and staff
      const scope: Scope = { schoolId, campusId: inv.campusId };
      const [stu, campuses, classes, staffUsers] = await Promise.all([
        getStudent(inv.studentId),
        listCampuses({ schoolId }),
        listClasses(scope),
        listUsers({ schoolId }),
      ]);

      setCampus(campuses.find((c) => c.id === inv.campusId) || null);
      setAdminUsers(new Map(staffUsers.map((u) => [u.id, u])));

      if (stu) {
        setStudent(stu);
        const [u] = await Promise.all([
          getUser(stu.userId),
        ]);
        setStudentUser(u);
        setCls(classes.find((c) => c.id === stu.classId) || null);
      }
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Load failed',
        message: err instanceof Error ? err.message : 'Failed to load invoice details.',
      });
    } finally {
      setLoading(false);
    }
  }, [invoiceId, schoolId, showToast]);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) {
        loadInvoiceData();
      }
    });
    return () => {
      ignore = true;
    };
  }, [loadInvoiceData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-600 border-t-transparent mb-3" />
        <p className="text-xs text-neutral-500">Loading invoice details...</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50 text-rose-600 text-xl font-bold mb-3">
          ⚠️
        </div>
        <h3 className="text-base font-bold text-neutral-900">Invoice Not Found</h3>
        <p className="mt-1 text-xs text-neutral-500">
          The requested invoice does not exist or has been removed.
        </p>
        <Link
          href="/admin/fees/invoices"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800 transition-colors"
        >
          ← Back to Invoices Directory
        </Link>
      </div>
    );
  }

  const netDue = invoice.totalAmount - invoice.discountAmount;
  const balanceDue = Math.max(0, netDue - invoice.paidAmount);
  const isFullyPaid = balanceDue <= 0;
  const studentName = studentUser?.name || `Student ${student?.admissionNumber || invoice.studentId}`;
  const className = cls ? `${cls.grade} — Section ${cls.section}` : 'Class —';

  const handleRemoveConcession = async (idx: number, label: string) => {
    if (!confirm(`Are you sure you want to remove concession "${label}"?`)) return;
    try {
      const updated = await removeInvoiceConcession(invoice.id, idx);
      setInvoice(updated);
      showToast({
        type: 'info',
        title: 'Concession Removed',
        message: `${label} removed from invoice.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove concession';
      showToast({ type: 'error', title: 'Error', message: msg });
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-500 mb-1">
            <Link href="/admin/fees/invoices" className="hover:text-purple-700 font-medium">
              Fee Invoices
            </Link>
            <span>/</span>
            <span className="font-mono text-neutral-800">{invoice.invoiceNumber}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight font-mono">
              {invoice.invoiceNumber}
            </h1>
            <StatusBadge
              status={
                invoice.status === 'paid'
                  ? 'paid'
                  : invoice.status === 'partial'
                  ? 'partial'
                  : invoice.status === 'overdue'
                  ? 'overdue'
                  : 'pending'
              }
              label={
                invoice.status === 'paid'
                  ? 'Fully Paid'
                  : invoice.status === 'partial'
                  ? 'Partially Paid'
                  : invoice.status === 'overdue'
                  ? 'Overdue'
                  : 'Payment Pending'
              }
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/fees/invoices"
            className="rounded-lg border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            ← Invoices Directory
          </Link>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsRecordModalOpen(true)}
            disabled={isFullyPaid}
            className="flex items-center gap-1.5"
          >
            💳 Record Payment
          </Button>
        </div>
      </div>

      {/* 2. Financial KPI StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Invoice Amount"
          value={formatCurrency(invoice.totalAmount)}
          subtitle="Standard curriculum fee"
        />
        <StatCard
          label="Discounts & Concessions"
          value={formatCurrency(invoice.discountAmount)}
          subtitle={invoice.discountAmount > 0 ? 'Concession applied' : 'Standard tuition'}
        />
        <StatCard
          label="Total Amount Paid"
          value={formatCurrency(invoice.paidAmount)}
          subtitle={`${invoice.payments?.length || 0} transaction(s)`}
        />
        <StatCard
          label="Outstanding Balance"
          value={formatCurrency(balanceDue)}
          subtitle={isFullyPaid ? 'Settled in full' : `Due: ${invoice.dueDate}`}
        />
      </div>

      {/* 3. Student & Billing Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Student Profile Card */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-neutral-150">
            <Avatar name={studentName} size="lg" />
            <div>
              <h3 className="text-sm font-bold text-neutral-900">{studentName}</h3>
              <p className="text-2xs text-neutral-500 font-mono">
                Adm: {student?.admissionNumber || '—'} • Roll: {student?.rollNumber || '—'}
              </p>
              <span className="inline-block mt-1 text-2xs font-semibold text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                {className}
              </span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-neutral-500">Campus:</span>
              <span className="font-medium text-neutral-900">{campus?.name || 'Main Campus'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Billing Cycle:</span>
              <span className="font-medium text-neutral-900">{invoice.billingMonth || 'Regular'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Payment Due:</span>
              <span className="font-semibold text-neutral-900">{invoice.dueDate}</span>
            </div>
          </div>

          {student && (
            <div className="pt-2 border-t border-neutral-150">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full text-xs justify-center"
                onClick={() => setIsStudentConcessionsOpen(true)}
              >
                Scholarship & Concession Profiles
              </Button>
            </div>
          )}
        </div>

        {/* Line Items Breakdown Card */}
        <div className="md:col-span-2 rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Fee Breakdown & Line Items</h3>
              <p className="text-2xs text-neutral-500">Every charge and concession is explicitly itemized</p>
            </div>
            {!isFullyPaid && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsConcessionModalOpen(true)}
              >
                + Add Concession
              </Button>
            )}
          </div>

          <div className="overflow-x-auto rounded-xl border border-neutral-200">
            <table className="w-full text-left text-xs text-neutral-800">
              <thead className="bg-neutral-50 text-neutral-700 font-semibold uppercase tracking-wider text-2xs border-b border-neutral-200">
                <tr>
                  <th className="px-4 py-2.5">Item Description</th>
                  <th className="px-4 py-2.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-150">
                {invoice.lineItems.map((item, idx) => {
                  const isConcession = item.amount < 0;
                  return (
                    <tr
                      key={idx}
                      className={isConcession ? 'bg-emerald-50/50 text-emerald-950 font-medium' : undefined}
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {isConcession && (
                              <span className="px-2 py-0.5 text-2xs font-bold rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                                CONCESSION
                              </span>
                            )}
                            <span className={isConcession ? 'font-semibold text-emerald-900' : 'font-medium'}>
                              {item.label}
                            </span>
                          </div>
                          {isConcession && !isFullyPaid && (
                            <button
                              type="button"
                              onClick={() => handleRemoveConcession(idx, item.label)}
                              className="text-2xs text-rose-600 hover:text-rose-700 hover:underline font-semibold ml-2"
                              title="Remove this concession line item"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right tabular-nums ${
                          isConcession
                            ? 'font-bold text-emerald-700'
                            : 'font-medium text-neutral-900'
                        }`}
                      >
                        {isConcession ? `-${formatCurrency(Math.abs(item.amount))}` : formatCurrency(item.amount)}
                      </td>
                    </tr>
                  );
                })}
                {/* Fallback concession row if legacy invoice had discountAmount without negative item */}
                {!invoice.lineItems.some((i) => i.amount < 0) && invoice.discountAmount > 0 && (
                  <tr className="bg-emerald-50/60 font-semibold text-emerald-800">
                    <td className="px-4 py-2.5 flex items-center gap-2">
                      <span className="px-2 py-0.5 text-2xs font-bold rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                        CONCESSION
                      </span>
                      <span>Sibling Concession / Scholarship</span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-emerald-700 font-bold">
                      -{formatCurrency(invoice.discountAmount)}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-neutral-50 border-t-2 border-neutral-200 font-bold text-xs text-neutral-900">
                <tr>
                  <td className="px-4 py-2.5">Net Invoice Total</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">
                    {formatCurrency(netDue)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>

      {/* 4. Payment Transactions & Receipts Log */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">Payment Transactions & History</h3>
            <p className="text-xs text-neutral-500">
              Audited payment log with immutable sequential receipt numbers.
            </p>
          </div>

          <span className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-700">
            {invoice.payments?.length || 0} Payment(s)
          </span>
        </div>

        {(!invoice.payments || invoice.payments.length === 0) ? (
          <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-neutral-500">
            <span className="text-2xl mb-1 block">⏳</span>
            <p className="text-xs font-semibold text-neutral-800">No Payments Recorded Yet</p>
            <p className="text-2xs text-neutral-400 mt-0.5">
              Click &quot;Record Payment&quot; above to log an installment or full fee settlement.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-neutral-200">
            <table className="w-full text-left text-xs text-neutral-700">
              <thead className="bg-neutral-50 text-neutral-800 font-semibold border-b border-neutral-200 uppercase tracking-wider text-2xs">
                <tr>
                  <th className="px-4 py-3">Receipt #</th>
                  <th className="px-4 py-3">Payment Date</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Reference / Cheque</th>
                  <th className="px-4 py-3 text-right">Amount Paid</th>
                  <th className="px-4 py-3">Received By</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-150 bg-white">
                {invoice.payments.map((p) => {
                  const staffUser = adminUsers.get(p.receivedBy);
                  return (
                    <tr key={p.id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded text-xs">
                          {p.receiptNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-neutral-600">
                        {new Date(p.receivedAt).toLocaleDateString('en-US', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="capitalize font-semibold text-neutral-800">
                          {p.method}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-500 font-mono text-2xs">
                        {p.reference || '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right font-bold text-emerald-700 tabular-nums">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-neutral-600">
                        {staffUser?.name || 'Administrator'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setIsReceiptReprint(true);
                            setSelectedPaymentForReceipt(p);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-50 hover:border-purple-300 transition-colors shadow-2xs cursor-pointer"
                        >
                          <span>🖨️</span>
                          <span>Print Receipt</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Record Payment Modal */}
      {isRecordModalOpen && (
        <RecordPaymentModal
          isOpen={isRecordModalOpen}
          onClose={() => setIsRecordModalOpen(false)}
          invoice={invoice}
          onPaymentRecorded={(updated) => {
            setInvoice(updated);
            // Auto open the newly issued receipt in fresh non-reprint mode
            const newest = updated.payments?.[updated.payments.length - 1];
            if (newest) {
              setIsReceiptReprint(false);
              setSelectedPaymentForReceipt(newest);
            }
          }}
        />
      )}

      {/* 6. Payment Receipt Modal */}
      {selectedPaymentForReceipt && (
        <PaymentReceiptModal
          isOpen={Boolean(selectedPaymentForReceipt)}
          onClose={() => setSelectedPaymentForReceipt(null)}
          invoice={invoice}
          payment={selectedPaymentForReceipt}
          student={student || undefined}
          user={studentUser || undefined}
          cls={cls || undefined}
          campus={campus || undefined}
          receiverUser={adminUsers.get(selectedPaymentForReceipt.receivedBy)}
          isReprint={isReceiptReprint}
        />
      )}

      {/* 7. Apply Concession Modal */}
      {isConcessionModalOpen && (
        <ApplyConcessionModal
          isOpen={isConcessionModalOpen}
          onClose={() => setIsConcessionModalOpen(false)}
          invoice={invoice}
          onConcessionApplied={(updated) => {
            setInvoice(updated);
          }}
        />
      )}

      {/* 8. Student Concession Profiles Modal */}
      {isStudentConcessionsOpen && student && (
        <StudentConcessionsModal
          isOpen={isStudentConcessionsOpen}
          onClose={() => setIsStudentConcessionsOpen(false)}
          student={student}
          studentName={studentName}
          scope={{ schoolId }}
          onConcessionsChanged={() => {
            loadInvoiceData();
          }}
        />
      )}
    </div>
  );
}
