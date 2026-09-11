'use client';

import React from 'react';
import Link from 'next/link';
import {
  Campus,
  Class,
  FeeInvoice,
  FeeStructure,
  ID,
  Student,
  User,
} from '@/types';
import { formatCurrency } from '@/lib/utils/currency';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';

export interface InvoicesTableProps {
  invoices: FeeInvoice[];
  studentsMap: Map<ID, Student>;
  usersMap: Map<ID, User>;
  classesMap: Map<ID, Class>;
  campusesMap: Map<ID, Campus>;
  feeStructuresMap: Map<ID, FeeStructure>;
  isLoading?: boolean;
}

export function InvoicesTable({
  invoices,
  studentsMap,
  usersMap,
  classesMap,
  campusesMap,
  feeStructuresMap,
  isLoading,
}: InvoicesTableProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-600 border-t-transparent mb-3" />
        <p className="text-xs text-neutral-500">Loading invoices...</p>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 p-12 text-center bg-white">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 text-xl font-bold mb-3">
          🧾
        </div>
        <h3 className="text-sm font-bold text-neutral-900">No Invoices Found</h3>
        <p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto">
          No fee invoices match the selected search or filter criteria. Generate a batch using the
          bulk generator or clear filters.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-2xs">
      <table className="w-full text-left text-xs text-neutral-700">
        <thead className="bg-neutral-50 text-neutral-800 font-semibold border-b border-neutral-200 uppercase tracking-wider text-2xs sticky top-0 z-10">
          <tr>
            <th className="px-4 py-3">Invoice #</th>
            <th className="px-4 py-3">Student</th>
            <th className="px-4 py-3">Class & Campus</th>
            <th className="px-4 py-3">Fee Structure</th>
            <th className="px-4 py-3">Due Date</th>
            <th className="px-4 py-3 text-right">Total</th>
            <th className="px-4 py-3 text-right">Paid</th>
            <th className="px-4 py-3 text-right">Balance</th>
            <th className="px-4 py-3 text-center">Status</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-150">
          {invoices.map((inv) => {
            const student = studentsMap.get(inv.studentId);
            const user = student ? usersMap.get(student.userId) : undefined;
            const studentName = user?.name || `Student ${student?.admissionNumber || inv.studentId}`;
            const cls = student ? classesMap.get(student.classId) : undefined;
            const campus = campusesMap.get(inv.campusId);
            const feeStructure = feeStructuresMap.get(inv.feeStructureId);

            const netTotal = inv.totalAmount - inv.discountAmount;
            const balanceDue = Math.max(0, netTotal - inv.paidAmount);

            return (
              <tr key={inv.id} className="hover:bg-neutral-50/70 transition-colors">
                {/* Invoice Number */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="font-mono font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded text-xs">
                    {inv.invoiceNumber}
                  </span>
                </td>

                {/* Student */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={studentName} size="sm" />
                    <div>
                      <div className="font-semibold text-neutral-900 hover:text-purple-700">
                        {studentName}
                      </div>
                      <div className="text-2xs text-neutral-500 font-mono">
                        {student?.admissionNumber || '—'}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Class & Campus */}
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-neutral-800 font-medium">
                    {cls ? `${cls.grade} - ${cls.section}` : 'Class —'}
                  </div>
                  <div className="text-2xs text-neutral-500">{campus?.name || 'Main Campus'}</div>
                </td>

                {/* Fee Structure */}
                <td className="px-4 py-3">
                  <div className="font-medium text-neutral-900 truncate max-w-xs">
                    {feeStructure?.name || inv.lineItems?.[0]?.label || 'Tuition Fee'}
                  </div>
                  {inv.discountAmount > 0 && (
                    <span className="inline-block mt-0.5 text-2xs text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                      Concession -{formatCurrency(inv.discountAmount)}
                    </span>
                  )}
                </td>

                {/* Due Date */}
                <td className="px-4 py-3 whitespace-nowrap text-neutral-600">
                  {inv.dueDate}
                </td>

                {/* Total */}
                <td className="px-4 py-3 whitespace-nowrap text-right tabular-nums font-semibold text-neutral-800">
                  {formatCurrency(netTotal)}
                </td>

                {/* Paid */}
                <td className="px-4 py-3 whitespace-nowrap text-right tabular-nums text-emerald-700 font-medium">
                  {formatCurrency(inv.paidAmount)}
                </td>

                {/* Balance Due */}
                <td className="px-4 py-3 whitespace-nowrap text-right tabular-nums font-bold">
                  {balanceDue > 0 ? (
                    <span className={inv.status === 'overdue' ? 'text-rose-600' : 'text-amber-600'}>
                      {formatCurrency(balanceDue)}
                    </span>
                  ) : (
                    <span className="text-neutral-500 font-normal">PKR 0</span>
                  )}
                </td>

                {/* Status */}
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <StatusBadge status={inv.status} />
                </td>

                {/* Actions */}
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <Link
                    href={`/admin/fees/invoices/${inv.id}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 transition-colors shadow-2xs"
                  >
                    View Details →
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
