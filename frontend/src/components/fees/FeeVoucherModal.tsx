'use client';

import React from 'react';
import {
  Campus,
  Class,
  FeeInvoice,
  Student,
  User,
} from '@/types';
import { Button } from '@/components/ui/Button';
import { useBranding } from '@/components/providers/BrandingProvider';
import { NavIcon } from '@/components/shell/NavIcon';

export interface FeeVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: FeeInvoice;
  student?: Student;
  user?: User;
  cls?: Class;
  campus?: Campus;
}

export function FeeVoucherModal({
  isOpen,
  onClose,
  invoice,
  student,
  user,
  cls,
  campus,
}: FeeVoucherModalProps) {
  const { schoolName, formatCurrency } = useBranding();

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const studentName = user?.name || `Student ${student?.admissionNumber || invoice.studentId}`;
  const className = cls ? `${cls.grade} - Section ${cls.section}` : 'Class —';
  const campusName = campus?.name || 'Main Campus';

  const netDue = invoice.totalAmount - invoice.discountAmount;
  const currentBalance = Math.max(0, netDue - invoice.paidAmount);
  
  // A voucher usually has a valid until or due date
  const dueDateFormatted = new Date(invoice.dueDate).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-start bg-black/50 p-4 sm:p-6 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="voucher-modal-title"
    >
      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-neutral-200 overflow-hidden my-auto shrink-0 print:border-none print:shadow-none print:my-0">
        {/* Actions bar (hidden in print) */}
        <div className="flex items-center justify-between gap-2 border-b border-neutral-200 px-4 sm:px-6 py-3 bg-neutral-50 print:hidden overflow-x-auto">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-neutral-800 whitespace-nowrap hidden sm:inline">Fee Voucher</span>
            <span className="text-sm font-bold text-neutral-800 whitespace-nowrap sm:hidden">Voucher</span>
          </div>
          <div className="flex items-center gap-1.5 ml-auto shrink-0">
            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-3xs font-mono font-bold text-emerald-800 border border-emerald-200 mr-1 hidden sm:inline-block">
              {invoice.invoiceNumber}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrint}
              leftIcon={<NavIcon name="printer" className="w-4 h-4" />}
            >
              <span className="hidden sm:inline">Print</span>
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
              aria-label="Close"
            >
              <NavIcon name="x" className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Voucher Body */}
        <div className="p-8 space-y-6 text-neutral-800 text-xs">
          {/* Institutional Header */}
          <div className="border-b-2 border-neutral-800 pb-5">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-lg font-black tracking-tight text-neutral-900 uppercase">
                  {schoolName}
                </h1>
                <p className="text-2xs text-neutral-500 font-medium">
                  Sector F-8/3, Islamabad, Pakistan • Ph: +92 51 111-222-333
                </p>
                <p className="text-2xs font-semibold text-purple-800 mt-0.5">
                  {campusName}
                </p>
              </div>

              <div className="text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="inline-block border border-neutral-800 bg-neutral-900 text-white font-mono font-bold px-2 py-0.5 text-3xs rounded whitespace-nowrap">
                    FEE VOUCHER
                  </span>
                </div>
                <div className="mt-1 font-mono font-bold text-neutral-900 text-xs">
                  {invoice.invoiceNumber}
                </div>
                <div className="text-2xs text-neutral-500">
                  Due Date: <span className="font-bold text-red-600">{dueDateFormatted}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Student & Invoice Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 text-2xs">
            <div>
              <span className="text-neutral-500 block uppercase tracking-wider font-semibold">
                Student Name
              </span>
              <span className="font-bold text-neutral-900 text-xs">{studentName}</span>
            </div>
            <div>
              <span className="text-neutral-500 block uppercase tracking-wider font-semibold">
                Admission / Roll #
              </span>
              <span className="font-mono font-semibold text-neutral-800">
                {student?.admissionNumber || '—'} / Roll {student?.rollNumber || '—'}
              </span>
            </div>
            <div>
              <span className="text-neutral-500 block uppercase tracking-wider font-semibold">
                Class & Section
              </span>
              <span className="font-semibold text-neutral-800">{className}</span>
            </div>
            <div>
              <span className="text-neutral-500 block uppercase tracking-wider font-semibold">
                Billing Month
              </span>
              <span className="font-semibold text-neutral-800">
                {invoice.billingMonth || 'N/A'}
              </span>
            </div>
          </div>

          {/* Line Item Breakdown */}
          <div className="overflow-x-auto border border-neutral-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-2xs">
              <thead className="bg-neutral-100 text-neutral-700 font-semibold uppercase tracking-wider border-b border-neutral-200">
                <tr>
                  <th className="px-3.5 py-2">Fee Description</th>
                  <th className="px-3.5 py-2 text-right">Amount (PKR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-150 bg-white">
                {invoice.lineItems.map((li, idx) => {
                  const isConcession = li.amount < 0;
                  return (
                    <tr key={idx} className={isConcession ? 'bg-emerald-50/50' : undefined}>
                      <td className="px-3.5 py-2 text-neutral-800">
                        {isConcession && (
                          <span className="font-semibold text-emerald-800 mr-1.5">[CONCESSION]</span>
                        )}
                        <span className={isConcession ? 'font-semibold text-emerald-800' : ''}>
                          {li.label}
                        </span>
                      </td>
                      <td
                        className={`px-3.5 py-2 text-right tabular-nums font-medium ${
                          isConcession ? 'font-semibold text-emerald-800' : 'text-neutral-700'
                        }`}
                      >
                        {isConcession ? `-${formatCurrency(Math.abs(li.amount))}` : formatCurrency(li.amount)}
                      </td>
                    </tr>
                  );
                })}
                {!invoice.lineItems.some((i) => i.amount < 0) && invoice.discountAmount > 0 && (
                  <tr className="bg-emerald-50/50">
                    <td className="px-3.5 py-2 font-semibold text-emerald-800">
                      [CONCESSION] Scholarship / Discount
                    </td>
                    <td className="px-3.5 py-2 text-right tabular-nums font-semibold text-emerald-800">
                      -{formatCurrency(invoice.discountAmount)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Financial Summary */}
          <div className="border-t border-neutral-200 pt-3 space-y-1 text-2xs">
            <div className="flex justify-between text-neutral-600">
              <span>Total Fees:</span>
              <span className="tabular-nums font-semibold">{formatCurrency(invoice.totalAmount)}</span>
            </div>
            {invoice.discountAmount > 0 && (
              <div className="flex justify-between text-neutral-600">
                <span>Total Concessions:</span>
                <span className="tabular-nums font-semibold text-emerald-700">
                  -{formatCurrency(invoice.discountAmount)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-neutral-600 pt-1">
              <span>Previous Paid Amount:</span>
              <span className="tabular-nums font-semibold text-emerald-700">
                {formatCurrency(invoice.paidAmount)}
              </span>
            </div>
            <div className="flex justify-between text-sm font-black text-neutral-900 pt-2 border-t border-dashed border-neutral-300 mt-1">
              <span>Total Payable Amount:</span>
              <span className="tabular-nums">
                {formatCurrency(currentBalance)}
              </span>
            </div>
          </div>

          {/* Signatures & Footer Note */}
          <div className="pt-8 flex justify-between items-end border-t border-neutral-200 mt-8">
            <div className="text-center">
              <div className="w-36 border-b border-neutral-400 mb-1" />
              <span className="text-3xs text-neutral-500 uppercase tracking-wider">
                Bank Officer Signature
              </span>
            </div>

            <div className="text-center">
              <div className="w-36 border-b border-neutral-400 mb-1" />
              <span className="text-3xs text-neutral-500 uppercase tracking-wider">
                Bank Stamp
              </span>
            </div>
          </div>

          <div className="text-center text-3xs text-neutral-500 border-t border-neutral-100 pt-3 mt-4">
            Please deposit the payable amount before the due date to avoid late fees. Keep your copy of the voucher safe.
          </div>
        </div>
      </div>
    </div>
  );
}
