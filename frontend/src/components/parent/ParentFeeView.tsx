'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { ID, FeeInvoice, Payment } from '@/types';
import {
  getParentStudentFeeOverview,
  ParentStudentFeeOverview,
  EnrichedParentPaymentReceipt,
} from '@/lib/repositories/parentFees';
import { getChildrenForParent } from '@/lib/repositories/parents';
import { formatCurrency } from '@/lib/utils/currency';
import { useSession } from '@/components/providers/SessionProvider';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { PaymentReceiptModal } from '@/components/fees/PaymentReceiptModal';
import { StudentFeeLedgerModal } from '@/components/fees/StudentFeeLedgerModal';

export interface ParentFeeViewProps {
  initialStudentId?: ID;
  initialOverview?: ParentStudentFeeOverview;
}

export function ParentFeeView({ initialStudentId, initialOverview }: ParentFeeViewProps) {
  const { session, switchChild } = useSession();
  const schoolId = session?.schoolId ?? 'sch_main';

  // Children state
  const [children, setChildren] = useState<Array<{ id: ID; name: string; admissionNumber: string }>>([]);
  const [activeChildId, setActiveChildId] = useState<ID | null>(
    initialStudentId || session?.activeChildId || null
  );

  // Overview state
  const [overview, setOverview] = useState<ParentStudentFeeOverview | null>(initialOverview || null);
  const [loading, setLoading] = useState<boolean>(!initialOverview);
  const [activeTab, setActiveTab] = useState<'invoices' | 'receipts'>('invoices');

  // Modal states
  const [selectedReceiptData, setSelectedReceiptData] = useState<{
    invoice: FeeInvoice;
    payment: Payment;
  } | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState<boolean>(false);
  const [selectedInvoiceForDetail, setSelectedInvoiceForDetail] = useState<FeeInvoice | null>(null);

  // Load parent children
  useEffect(() => {
    let ignore = false;
    async function loadFamilyChildren() {
      if (!session?.userId) return;
      try {
        if (session.role === 'parent') {
          const linked = await getChildrenForParent(session.userId);
          if (!ignore) {
            const mapped = linked.map((item) => ({
              id: item.student.id,
              name: item.user.name,
              admissionNumber: item.student.admissionNumber,
            }));
            setChildren(mapped);
            if (!activeChildId && mapped.length > 0) {
              const defaultId = initialStudentId || session.activeChildId || mapped[0].id;
              setActiveChildId(defaultId);
            }
          }
        } else if (initialStudentId) {
          if (!ignore) setActiveChildId(initialStudentId);
        }
      } catch (err) {
        console.error('Failed to load parent children:', err);
      }
    }

    loadFamilyChildren();
    return () => {
      ignore = true;
    };
  }, [session?.userId, session?.role, session?.activeChildId, initialStudentId, activeChildId]);

  // Handle child switch
  const handleSelectChild = async (childId: ID) => {
    setActiveChildId(childId);
    if (session?.role === 'parent' && switchChild) {
      await switchChild(childId);
    }
  };

  // Load fee overview for active child
  const loadFeeOverview = useCallback(async () => {
    if (!activeChildId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await getParentStudentFeeOverview(activeChildId, schoolId);
      setOverview(res);
    } catch (err) {
      console.error('Failed to load child fee overview:', err);
    } finally {
      setLoading(false);
    }
  }, [activeChildId, schoolId]);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) loadFeeOverview();
    });
    return () => {
      ignore = true;
    };
  }, [loadFeeOverview]);

  // Open receipt download / print modal
  const handleDownloadReceipt = (receiptItem: EnrichedParentPaymentReceipt) => {
    if (!overview) return;
    const inv = overview.invoices.find((i) => i.id === receiptItem.invoiceId);
    if (!inv) return;

    setSelectedReceiptData({
      invoice: inv,
      payment: receiptItem.payment,
    });
    setIsReceiptModalOpen(true);
  };

  // Due status badge styling
  const dueStatusDisplay = useMemo(() => {
    if (!overview) return null;
    if (overview.dueStatus === 'all_paid') {
      return {
        label: 'All Fees Cleared',
        color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        glyph: '✓',
      };
    }
    if (overview.dueStatus === 'overdue') {
      return {
        label: 'Payment Overdue',
        color: 'bg-rose-100 text-rose-800 border-rose-200',
        glyph: '⚠️',
      };
    }
    if (overview.dueStatus === 'due_soon') {
      return {
        label: 'Payment Due Soon',
        color: 'bg-amber-100 text-amber-800 border-amber-200',
        glyph: '⏳',
      };
    }
    return {
      label: 'Upcoming Due Date',
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      glyph: '📅',
    };
  }, [overview]);

  return (
    <div className="space-y-6">
      {/* 1. Multi-child Selector (if parent has multiple children) */}
      {children.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-neutral-100 rounded-xl border border-neutral-200 w-fit">
          <span className="text-xs font-semibold text-neutral-500 px-2">Viewing Child:</span>
          {children.map((child) => {
            const isSelected = child.id === activeChildId;
            return (
              <button
                key={child.id}
                type="button"
                onClick={() => handleSelectChild(child.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  isSelected
                    ? 'bg-white text-purple-800 shadow-xs border border-neutral-200'
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60'
                }`}
              >
                <span>{child.name}</span>
                <span className="font-mono text-[10px] text-neutral-400">({child.admissionNumber})</span>
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-neutral-500 bg-white rounded-2xl border border-neutral-200 shadow-xs">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent mb-3" />
          <p className="text-sm font-medium">Retrieving student fee records & receipts...</p>
        </div>
      ) : !overview ? (
        <div className="py-16 text-center text-neutral-500 bg-white rounded-2xl border border-neutral-200">
          <p className="text-base font-semibold text-neutral-800">No Student Records Found</p>
          <p className="text-xs text-neutral-500 mt-1">Please select an enrolled child to view fee statements.</p>
        </div>
      ) : (
        <>
          {/* 2. Hero Fee Balance & Due Date Card */}
          <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              {/* Left: Child Details & Balance */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-700 font-bold text-base">
                    {overview.user.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-neutral-900">{overview.user.name}</h2>
                    <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono">
                      <span>Adm: {overview.student.admissionNumber}</span>
                      <span>•</span>
                      <span>
                        {overview.classInfo
                          ? `${overview.classInfo.grade}-${overview.classInfo.section}`
                          : 'Standard Class'}
                      </span>
                      <span>•</span>
                      <span>{overview.campus?.name || 'Main Campus'}</span>
                    </div>
                  </div>
                </div>

                {/* Primary Outstanding Balance Display */}
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                    Current Outstanding Balance
                  </div>
                  <div className="flex items-baseline gap-3 mt-1">
                    <span
                      className={`text-3xl sm:text-4xl font-black font-mono tracking-tight ${
                        overview.outstandingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {formatCurrency(overview.outstandingBalance)}
                    </span>
                    {dueStatusDisplay && (
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${dueStatusDisplay.color}`}
                      >
                        <span>{dueStatusDisplay.glyph}</span>
                        <span>{dueStatusDisplay.label}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Next Due Date Box & Quick Action */}
              <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-4 p-4 rounded-xl bg-neutral-50 border border-neutral-200">
                <div>
                  <span className="text-xs font-medium text-neutral-500 block">Next Payment Deadline</span>
                  {overview.nextDueDate ? (
                    <div className="mt-1">
                      <span className="text-base font-bold font-mono text-neutral-900">
                        {overview.nextDueDate}
                      </span>
                      {overview.daysUntilDue !== null && (
                        <span
                          className={`block text-xs font-semibold ${
                            overview.daysUntilDue < 0
                              ? 'text-rose-600'
                              : overview.daysUntilDue <= 7
                              ? 'text-amber-600'
                              : 'text-neutral-500'
                          }`}
                        >
                          {overview.daysUntilDue < 0
                            ? `${Math.abs(overview.daysUntilDue)} days overdue`
                            : overview.daysUntilDue === 0
                            ? 'Due today'
                            : `Due in ${overview.daysUntilDue} days`}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm font-semibold text-emerald-600 mt-1 block">
                      All fees cleared • No pending dues
                    </span>
                  )}
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsLedgerModalOpen(true)}
                  className="flex items-center gap-1.5 shadow-2xs"
                >
                  <span>📜</span>
                  <span>View Full Statement</span>
                </Button>
              </div>
            </div>

            {/* Sub-KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-neutral-100">
              <div className="rounded-xl bg-neutral-50/70 p-3 border border-neutral-200/60">
                <span className="text-xs text-neutral-500 font-medium block">Total Invoiced (Session)</span>
                <span className="text-base font-bold font-mono text-neutral-900">
                  {formatCurrency(overview.totalInvoiced)}
                </span>
              </div>
              <div className="rounded-xl bg-neutral-50/70 p-3 border border-neutral-200/60">
                <span className="text-xs text-neutral-500 font-medium block">Scholarships & Concessions</span>
                <span className="text-base font-bold font-mono text-purple-700">
                  {overview.totalDiscounts > 0 ? `-${formatCurrency(overview.totalDiscounts)}` : 'PKR 0'}
                </span>
              </div>
              <div className="rounded-xl bg-neutral-50/70 p-3 border border-neutral-200/60">
                <span className="text-xs text-neutral-500 font-medium block">Total Payments Made</span>
                <span className="text-base font-bold font-mono text-emerald-700">
                  {overview.totalPaid > 0 ? formatCurrency(overview.totalPaid) : 'PKR 0'}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Tab Navigation */}
          <div className="flex items-center gap-2 border-b border-neutral-200">
            <button
              type="button"
              onClick={() => setActiveTab('invoices')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'invoices'
                  ? 'border-purple-600 text-purple-700'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <span>🧾 Invoices History</span>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                {overview.invoices.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('receipts')}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === 'receipts'
                  ? 'border-purple-600 text-purple-700'
                  : 'border-transparent text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <span>💳 Payment Receipts</span>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                {overview.receipts.length}
              </span>
            </button>
          </div>

          {/* 4. Tab Content: Invoices History */}
          {activeTab === 'invoices' && (
            <div className="rounded-2xl border border-neutral-200 bg-white shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 text-neutral-600 border-b border-neutral-200 text-xs font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Invoice #</th>
                      <th className="py-3 px-4">Period</th>
                      <th className="py-3 px-4">Line Items</th>
                      <th className="py-3 px-4 text-right">Gross (PKR)</th>
                      <th className="py-3 px-4 text-right">Relief</th>
                      <th className="py-3 px-4 text-right">Paid</th>
                      <th className="py-3 px-4 text-right">Balance Due</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {overview.invoices.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-12 text-center text-neutral-400">
                          No invoices generated for this student yet.
                        </td>
                      </tr>
                    ) : (
                      overview.invoices.map((inv) => {
                        const netDue = Math.max(0, inv.totalAmount - inv.discountAmount);
                        const balance = Math.max(0, netDue - inv.paidAmount);

                        return (
                          <tr key={inv.id} className="hover:bg-neutral-50/80 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-xs text-neutral-900">
                              {inv.invoiceNumber}
                            </td>
                            <td className="py-3 px-4 text-xs font-medium text-neutral-700 whitespace-nowrap">
                              {inv.billingMonth || 'Session'}
                            </td>
                            <td className="py-3 px-4 text-xs text-neutral-600 max-w-xs truncate">
                              {inv.lineItems?.map((li) => li.label).join(', ') || 'Standard Fee'}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-xs font-semibold text-neutral-900">
                              {formatCurrency(inv.totalAmount)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-xs font-semibold text-purple-700">
                              {inv.discountAmount > 0 ? `-${formatCurrency(inv.discountAmount)}` : '—'}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-xs font-semibold text-emerald-700">
                              {inv.paidAmount > 0 ? formatCurrency(inv.paidAmount) : '—'}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-xs font-bold text-neutral-900">
                              <span className={balance > 0 ? 'text-rose-600' : 'text-neutral-500'}>
                                {formatCurrency(balance)}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-xs text-neutral-600 whitespace-nowrap">
                              {inv.dueDate}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <StatusBadge status={inv.status} />
                            </td>
                            <td className="py-3 px-4 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setSelectedInvoiceForDetail(inv)}
                                className="text-xs font-semibold text-purple-700 hover:text-purple-900 hover:underline"
                              >
                                Details
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 5. Tab Content: Payment Receipts (Downloadable) */}
          {activeTab === 'receipts' && (
            <div className="rounded-2xl border border-neutral-200 bg-white shadow-xs overflow-hidden">
              <div className="p-4 bg-neutral-50/70 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">Official Payment Receipts</h3>
                  <p className="text-xs text-neutral-500">
                    Sequential receipt numbers issued for all recorded tuition and fee transactions
                  </p>
                </div>
                <span className="text-xs text-neutral-500">
                  {overview.receipts.length} Receipt{overview.receipts.length === 1 ? '' : 's'} available
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-neutral-50 text-neutral-600 border-b border-neutral-200 text-xs font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Receipt #</th>
                      <th className="py-3 px-4">Date Paid</th>
                      <th className="py-3 px-4">Related Invoice</th>
                      <th className="py-3 px-4">Payment Method</th>
                      <th className="py-3 px-4">Reference</th>
                      <th className="py-3 px-4 text-right">Amount Paid</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {overview.receipts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-neutral-400">
                          No payment receipts recorded for this student yet.
                        </td>
                      </tr>
                    ) : (
                      overview.receipts.map((rcpt) => (
                        <tr key={rcpt.id} className="hover:bg-neutral-50/80 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-xs text-emerald-800 whitespace-nowrap">
                            {rcpt.receiptNumber}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-neutral-600 whitespace-nowrap">
                            {rcpt.receivedAt.split('T')[0]}
                          </td>
                          <td className="py-3 px-4 text-xs font-mono text-neutral-800">
                            {rcpt.invoiceNumber}
                          </td>
                          <td className="py-3 px-4 text-xs font-medium uppercase text-neutral-700">
                            {rcpt.method}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-neutral-500">
                            {rcpt.reference || '—'}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-xs font-bold text-emerald-700 whitespace-nowrap">
                            {formatCurrency(rcpt.amount)}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleDownloadReceipt(rcpt)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                              title="Download and print official receipt"
                            >
                              <span>🖨️</span>
                              <span>Download / Print</span>
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Downloadable / Printable Receipt Modal */}
      {selectedReceiptData && overview && (
        <PaymentReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => {
            setIsReceiptModalOpen(false);
            setSelectedReceiptData(null);
          }}
          invoice={selectedReceiptData.invoice}
          payment={selectedReceiptData.payment}
          student={overview.student}
          user={overview.user}
          cls={overview.classInfo}
          campus={overview.campus}
          isReprint={true}
        />
      )}

      {/* Full Fee Ledger Modal */}
      {activeChildId && (
        <StudentFeeLedgerModal
          isOpen={isLedgerModalOpen}
          onClose={() => setIsLedgerModalOpen(false)}
          studentId={activeChildId}
          schoolId={schoolId}
        />
      )}

      {/* Invoice Detail Modal */}
      {selectedInvoiceForDetail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-neutral-900">
                  Invoice {selectedInvoiceForDetail.invoiceNumber}
                </h3>
                <p className="text-xs text-neutral-500 font-mono">
                  Period: {selectedInvoiceForDetail.billingMonth || 'Session'} • Due: {selectedInvoiceForDetail.dueDate}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoiceForDetail(null)}
                className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              >
                ✕
              </button>
            </div>

            {/* Line Items */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-neutral-600 uppercase tracking-wider">Fee Breakdown</h4>
              <div className="rounded-xl border border-neutral-200 divide-y divide-neutral-100 bg-neutral-50/50">
                {selectedInvoiceForDetail.lineItems?.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 text-xs">
                    <span className="text-neutral-800">{item.label}</span>
                    <span className="font-mono font-semibold text-neutral-900">
                      {item.amount < 0
                        ? `-${formatCurrency(Math.abs(item.amount))}`
                        : formatCurrency(item.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="rounded-xl bg-neutral-50 p-3 space-y-1.5 text-xs border border-neutral-200">
              <div className="flex justify-between text-neutral-600">
                <span>Gross Amount:</span>
                <span className="font-mono font-semibold">{formatCurrency(selectedInvoiceForDetail.totalAmount)}</span>
              </div>
              {selectedInvoiceForDetail.discountAmount > 0 && (
                <div className="flex justify-between text-purple-700">
                  <span>Concessions / Relief:</span>
                  <span className="font-mono font-semibold">-{formatCurrency(selectedInvoiceForDetail.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-emerald-700">
                <span>Amount Paid:</span>
                <span className="font-mono font-semibold">{formatCurrency(selectedInvoiceForDetail.paidAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-neutral-200 pt-1.5 font-bold text-neutral-900 text-sm">
                <span>Remaining Balance:</span>
                <span className="font-mono text-rose-600">
                  {formatCurrency(
                    Math.max(
                      0,
                      (selectedInvoiceForDetail.totalAmount - selectedInvoiceForDetail.discountAmount) -
                        selectedInvoiceForDetail.paidAmount
                    )
                  )}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="secondary"
                onClick={() => setSelectedInvoiceForDetail(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
