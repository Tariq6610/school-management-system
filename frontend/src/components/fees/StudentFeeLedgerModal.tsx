'use client';

import React, { useEffect, useState } from 'react';
import { ID } from '@/types';
import {
  getStudentFeeLedger,
  StudentFeeLedgerStatement,
} from '@/lib/repositories/feeDefaulters';
import { formatCurrency } from '@/lib/utils/currency';
import { Button } from '@/components/ui/Button';
import { NavIcon } from '@/components/shell/NavIcon';

export interface StudentFeeLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: ID | null;
  schoolId: ID;
}

export function StudentFeeLedgerModal({
  isOpen,
  onClose,
  studentId,
  schoolId,
}: StudentFeeLedgerModalProps) {
  const [statement, setStatement] = useState<StudentFeeLedgerStatement | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let ignore = false;
    if (isOpen && studentId) {
      Promise.resolve().then(() => {
        if (ignore) return;
        setLoading(true);
        getStudentFeeLedger(studentId, schoolId)
          .then((res) => {
            if (!ignore) setStatement(res);
          })
          .catch((err) => {
            console.error('Failed to load student fee ledger:', err);
          })
          .finally(() => {
            if (!ignore) setLoading(false);
          });
      });
    } else {
      Promise.resolve().then(() => {
        if (!ignore) setStatement(null);
      });
    }

    return () => {
      ignore = true;
    };
  }, [isOpen, studentId, schoolId]);

  if (!isOpen || !studentId) return null;

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static"
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-ledger-title"
    >
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-neutral-200 overflow-hidden my-6 print:border-none print:shadow-none print:my-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 bg-neutral-50/80 print:bg-white print:border-b-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-700 print:hidden">
              <NavIcon name="file-text" className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="student-ledger-title" className="text-xl font-bold text-neutral-900">
                  Student Fee Ledger Statement
                </h2>
                <span className="hidden print:inline-block text-xs font-semibold px-2 py-0.5 rounded bg-neutral-200 text-neutral-800">
                  Official Statement
                </span>
              </div>
              <p className="text-xs text-neutral-500">
                Chronological record of invoices, concessions, payments, and running balance
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-600 transition-colors print:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
            aria-label="Close"
          >
            <NavIcon name="x" className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto print:max-h-none print:overflow-visible">
          {loading ? (
            <div className="py-16 text-center text-neutral-500">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent mb-3" />
              <p className="text-sm font-medium">Generating student ledger statement...</p>
            </div>
          ) : !statement ? (
            <div className="py-12 text-center text-neutral-500">
              <p className="text-sm font-medium">No ledger records found for this student.</p>
            </div>
          ) : (
            <>
              {/* Student Metadata Card */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-neutral-50 border border-neutral-200">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-neutral-900">
                    {statement.user.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-neutral-600">
                    <span>
                      <strong className="text-neutral-700">Admission No:</strong>{' '}
                      <span className="font-mono">{statement.student.admissionNumber}</span>
                    </span>
                    <span>
                      <strong className="text-neutral-700">Roll No:</strong>{' '}
                      <span className="font-mono">{statement.student.rollNumber}</span>
                    </span>
                    <span>
                      <strong className="text-neutral-700">Class:</strong>{' '}
                      {statement.classInfo
                        ? `${statement.classInfo.grade}-${statement.classInfo.section}`
                        : 'N/A'}
                    </span>
                    <span>
                      <strong className="text-neutral-700">Campus:</strong>{' '}
                      {statement.campus?.name || 'Main Campus'}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-neutral-500 uppercase font-bold tracking-wider block">
                    Statement Balance
                  </span>
                  <span
                    className={`text-2xl font-black font-mono ${
                      statement.outstandingBalance > 0
                        ? 'text-rose-600'
                        : 'text-emerald-600'
                    }`}
                  >
                    {formatCurrency(statement.outstandingBalance)}
                  </span>
                </div>
              </div>

              {/* Financial KPI Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-neutral-200 bg-white p-3">
                  <span className="text-xs text-neutral-500 font-medium block">Total Invoiced</span>
                  <span className="text-base font-bold font-mono text-neutral-900">
                    {formatCurrency(statement.totalInvoiced)}
                  </span>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-white p-3">
                  <span className="text-xs text-neutral-500 font-medium block">Concessions / Relief</span>
                  <span className="text-base font-bold font-mono text-purple-700">
                    {statement.totalDiscounted > 0 ? `-${formatCurrency(statement.totalDiscounted)}` : 'PKR 0'}
                  </span>
                </div>
                <div className="rounded-xl border border-neutral-200 bg-white p-3">
                  <span className="text-xs text-neutral-500 font-medium block">Payments Received</span>
                  <span className="text-base font-bold font-mono text-emerald-700">
                    {statement.totalPaid > 0 ? `-${formatCurrency(statement.totalPaid)}` : 'PKR 0'}
                  </span>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3">
                  <span className="text-xs text-rose-600 font-medium block">Current Balance</span>
                  <span className="text-base font-black font-mono text-rose-700">
                    {formatCurrency(statement.outstandingBalance)}
                  </span>
                </div>
              </div>

              {/* Chronological Statement Table */}
              <div className="rounded-xl border border-neutral-200 overflow-hidden bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-neutral-100 text-neutral-700 border-b border-neutral-200 text-xs font-semibold uppercase tracking-wider">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Reference #</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3 text-right">Debit (+)</th>
                        <th className="py-2.5 px-3 text-right">Credit (-)</th>
                        <th className="py-2.5 px-3 text-right">Running Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {statement.entries.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-neutral-500">
                            No ledger transactions recorded yet.
                          </td>
                        </tr>
                      ) : (
                        statement.entries.map((entry) => {
                          const isInvoice = entry.type === 'invoice';
                          const isConcession = entry.type === 'concession';
                          const isPayment = entry.type === 'payment';

                          return (
                            <tr key={entry.id} className="hover:bg-neutral-50/80 transition-colors">
                              <td className="py-2.5 px-3 whitespace-nowrap text-xs text-neutral-600 font-mono">
                                {entry.date}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap text-xs">
                                {isInvoice && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    Invoice
                                  </span>
                                )}
                                {isConcession && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    Concession
                                  </span>
                                )}
                                {isPayment && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                    Payment
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap text-xs font-mono font-semibold text-neutral-800">
                                {entry.referenceNumber}
                              </td>
                              <td className="py-2.5 px-3 text-xs text-neutral-700">
                                {entry.description}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap text-xs text-right font-mono font-semibold text-neutral-900">
                                {entry.debit > 0 ? formatCurrency(entry.debit) : '—'}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap text-xs text-right font-mono font-semibold text-emerald-700">
                                {entry.credit > 0 ? `-${formatCurrency(entry.credit)}` : '—'}
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap text-xs text-right font-mono font-bold text-neutral-900">
                                {formatCurrency(entry.runningBalance)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-neutral-100 border-t-2 border-neutral-300 font-bold text-xs text-neutral-900">
                        <td colSpan={4} className="py-3 px-3 uppercase tracking-wider">
                          Net Ledger Summary
                        </td>
                        <td className="py-3 px-3 text-right font-mono">
                          {formatCurrency(statement.totalInvoiced)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-700">
                          -{formatCurrency(statement.totalDiscounted + statement.totalPaid)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-base text-rose-600">
                          {formatCurrency(statement.outstandingBalance)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Statement Note */}
              <div className="text-xs text-neutral-500 bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                <p>
                  * All transactions shown above reflect official billing records. In accordance with school regulations,
                  all fee concessions, scholarship credits, and partial installments are computed chronologically with a
                  cumulative running balance.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-neutral-200 px-6 py-4 bg-neutral-50 print:hidden">
          <div className="text-xs text-neutral-500">
            Official institutional record • Generated on {new Date().toLocaleDateString('en-GB')}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={onClose}
            >
              Close
            </Button>
            <Button
              variant="primary"
              onClick={handlePrint}
              leftIcon={<NavIcon name="printer" className="w-4 h-4" />}
            >
              Print Statement
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
