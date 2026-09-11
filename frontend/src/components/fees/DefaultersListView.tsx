'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Campus, Class, ID, Scope } from '@/types';
import {
  DefaulterStudentSummary,
  getDefaultersReport,
  sendBulkDefaulterReminders,
  sendDefaulterReminder,
} from '@/lib/repositories/feeDefaulters';
import { listCampuses } from '@/lib/repositories/campuses';
import { listClasses } from '@/lib/repositories/classes';
import { formatCurrency } from '@/lib/utils/currency';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/ui/Toast';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { StudentFeeLedgerModal } from './StudentFeeLedgerModal';

export interface DefaultersListViewProps {
  initialCampusId?: ID;
  initialCampuses?: Campus[];
  initialClasses?: Class[];
}

export function DefaultersListView({
  initialCampusId,
  initialCampuses,
  initialClasses,
}: DefaultersListViewProps) {
  const { session } = useSession();
  const { showToast } = useToast();
  const schoolId = session?.schoolId ?? 'sch_main';

  // Base data states
  const [campuses, setCampuses] = useState<Campus[]>(initialCampuses || []);
  const [classes, setClasses] = useState<Class[]>(initialClasses || []);
  const [defaulters, setDefaulters] = useState<DefaulterStudentSummary[]>([]);
  const [totalDefaultersCount, setTotalDefaultersCount] = useState<number>(0);
  const [totalOverdueAmount, setTotalOverdueAmount] = useState<number>(0);
  const [averageDaysOverdue, setAverageDaysOverdue] = useState<number>(0);
  const [criticalOverdueCount, setCriticalOverdueCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCampusFilter, setSelectedCampusFilter] = useState<string>(initialCampusId || '');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('');
  const [minDaysOverdue, setMinDaysOverdue] = useState<string>('0');
  const [minAmount, setMinAmount] = useState<string>('0');

  // Selection state for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<ID>>(new Set());
  const [bulkSending, setBulkSending] = useState<boolean>(false);
  const [sendingIndividualId, setSendingIndividualId] = useState<ID | null>(null);

  // Ledger modal state
  const [ledgerStudentId, setLedgerStudentId] = useState<ID | null>(null);
  const [isLedgerOpen, setIsLedgerOpen] = useState<boolean>(false);

  // Initial load for campuses and classes
  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(async () => {
      if (ignore) return;
      try {
        const [campList, clsList] = await Promise.all([
          listCampuses({ schoolId }),
          listClasses({ schoolId }),
        ]);
        if (!ignore) {
          setCampuses(campList);
          setClasses(clsList);
        }
      } catch (err) {
        console.error('Failed to load campuses and classes:', err);
      }
    });
    return () => {
      ignore = true;
    };
  }, [schoolId]);

  // Load report data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const scope: Scope = {
        schoolId,
        campusId: selectedCampusFilter || undefined,
      };

      const report = await getDefaultersReport(scope, {
        minDaysOverdue: minDaysOverdue !== '0' ? parseInt(minDaysOverdue, 10) : undefined,
        minAmount: minAmount !== '0' ? parseInt(minAmount, 10) : undefined,
        campusId: selectedCampusFilter || undefined,
        classId: selectedClassFilter || undefined,
        search: searchQuery.trim() || undefined,
      });

      setDefaulters(report.defaulters);
      setTotalDefaultersCount(report.totalDefaultersCount);
      setTotalOverdueAmount(report.totalOverdueAmount);
      setAverageDaysOverdue(report.averageDaysOverdue);
      setCriticalOverdueCount(report.criticalOverdueCount);
    } catch (err) {
      console.error('Failed to load defaulters report:', err);
      showToast({
        type: 'error',
        title: 'Loading failed',
        message: 'Unable to generate fee defaulter report.',
      });
    } finally {
      setLoading(false);
    }
  }, [
    schoolId,
    selectedCampusFilter,
    selectedClassFilter,
    minDaysOverdue,
    minAmount,
    searchQuery,
    showToast,
  ]);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) loadData();
    });
    return () => {
      ignore = true;
    };
  }, [loadData]);

  // Handle single reminder
  const handleSendReminder = async (item: DefaulterStudentSummary) => {
    setSendingIndividualId(item.student.id);
    try {
      const res = await sendDefaulterReminder(
        { schoolId, campusId: item.student.campusId },
        {
          studentId: item.student.id,
          schoolId,
          campusName: item.campus?.name,
          studentName: item.user.name,
          parentName: item.parentName,
          parentPhone: item.parentPhone,
          overdueAmount: item.totalOverdueAmount,
          dueDate: item.minDueDate,
        }
      );

      showToast({
        type: 'success',
        title: 'Reminder sent',
        message: `WhatsApp reminder for ${item.user.name} logged to communication log (${res.logId}).`,
      });
    } catch {
      showToast({
        type: 'error',
        title: 'Reminder failed',
        message: `Could not send reminder for ${item.user.name}.`,
      });
    } finally {
      setSendingIndividualId(null);
    }
  };

  // Handle bulk reminders
  const handleSendBulkReminders = async () => {
    const selectedItems = defaulters.filter((d) => selectedIds.has(d.student.id));
    if (selectedItems.length === 0) return;

    setBulkSending(true);
    try {
      const targets = selectedItems.map((item) => ({
        studentId: item.student.id,
        schoolId,
        campusName: item.campus?.name,
        studentName: item.user.name,
        parentName: item.parentName,
        parentPhone: item.parentPhone,
        overdueAmount: item.totalOverdueAmount,
        dueDate: item.minDueDate,
      }));

      const res = await sendBulkDefaulterReminders({ schoolId }, targets);

      showToast({
        type: 'success',
        title: 'Bulk reminders sent',
        message: `Successfully logged ${res.sentCount} WhatsApp reminder${res.sentCount === 1 ? '' : 's'} to WhatsApp log.`,
      });

      setSelectedIds(new Set());
    } catch {
      showToast({
        type: 'error',
        title: 'Bulk dispatch error',
        message: 'An error occurred during bulk reminder dispatch.',
      });
    } finally {
      setBulkSending(false);
    }
  };

  // Selection helpers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(defaulters.map((d) => d.student.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleToggleSelect = (studentId: ID) => {
    const updated = new Set(selectedIds);
    if (updated.has(studentId)) {
      updated.delete(studentId);
    } else {
      updated.add(studentId);
    }
    setSelectedIds(updated);
  };

  // Selected totals
  const selectedCount = selectedIds.size;
  const selectedOverdueTotal = useMemo(() => {
    return defaulters
      .filter((d) => selectedIds.has(d.student.id))
      .reduce((acc, d) => acc + d.totalOverdueAmount, 0);
  }, [defaulters, selectedIds]);

  // Options for filter selects
  const daysOverdueOptions = [
    { value: '0', label: 'All Overdue Days' },
    { value: '7', label: '7+ Days Overdue' },
    { value: '15', label: '15+ Days Overdue' },
    { value: '30', label: '30+ Days Overdue (Critical)' },
    { value: '60', label: '60+ Days Overdue' },
  ];

  const amountOptions = [
    { value: '0', label: 'All Outstanding Balances' },
    { value: '5000', label: '≥ PKR 5,000' },
    { value: '10000', label: '≥ PKR 10,000' },
    { value: '25000', label: '≥ PKR 25,000' },
    { value: '50000', label: '≥ PKR 50,000' },
  ];

  const campusOptions = [
    { value: '', label: 'All Campuses' },
    ...campuses.map((c) => ({ value: c.id, label: c.name })),
  ];

  const classOptions = [
    { value: '', label: 'All Classes' },
    ...classes.map((c) => ({
      value: c.id,
      label: `${c.grade}-${c.section}`,
    })),
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation Links */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin/fees/invoices"
              className="text-xs font-semibold text-purple-700 hover:underline"
            >
              ← Back to Invoices
            </Link>
            <span className="text-xs text-neutral-400">•</span>
            <Link
              href="/admin/fees/structures"
              className="text-xs font-semibold text-neutral-600 hover:text-neutral-900"
            >
              Fee Structures
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Student Fee Defaulter Report
          </h1>
          <p className="text-sm text-neutral-600">
            Track overdue student receivables, filter by days and balance, dispatch WhatsApp reminders, and inspect ledgers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => loadData()}
            disabled={loading}
          >
            🔄 Refresh
          </Button>
        </div>
      </div>

      {/* High-level KPI StatCards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Defaulters"
          value={totalDefaultersCount}
          subtitle="Students with overdue balances"
          icon={<span className="text-xl">⚠️</span>}
        />
        <StatCard
          label="Total Overdue Amount"
          value={formatCurrency(totalOverdueAmount)}
          subtitle="Cumulative receivables past due"
          icon={<span className="text-xl">💰</span>}
        />
        <StatCard
          label="Average Days Overdue"
          value={`${averageDaysOverdue} days`}
          subtitle="Mean duration past payment deadline"
          icon={<span className="text-xl">⏳</span>}
        />
        <StatCard
          label="Critical (30+ Days)"
          value={criticalOverdueCount}
          subtitle="Severe payment delays"
          icon={<span className="text-xl">🚨</span>}
          className={criticalOverdueCount > 0 ? 'border-rose-300 bg-rose-50/20' : ''}
        />
      </div>

      {/* Multi-facet Filter Bar */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Days Overdue Filter */}
          <Select
            label="Days Overdue"
            options={daysOverdueOptions}
            value={minDaysOverdue}
            onChange={(e) => setMinDaysOverdue(e.target.value)}
          />

          {/* Overdue Amount Filter */}
          <Select
            label="Minimum Balance"
            options={amountOptions}
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
          />

          {/* Campus Filter */}
          <Select
            label="Campus"
            options={campusOptions}
            value={selectedCampusFilter}
            onChange={(e) => setSelectedCampusFilter(e.target.value)}
          />

          {/* Class Filter */}
          <Select
            label="Class"
            options={classOptions}
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
          />

          {/* Student Search */}
          <Input
            label="Search Student / Phone"
            placeholder="Name, roll #, admission #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Active Filters Reset */}
        {(minDaysOverdue !== '0' ||
          minAmount !== '0' ||
          selectedCampusFilter ||
          selectedClassFilter ||
          searchQuery) && (
          <div className="flex items-center justify-between pt-2 border-t border-neutral-100 text-xs text-neutral-500">
            <span>Filtering active</span>
            <button
              type="button"
              onClick={() => {
                setMinDaysOverdue('0');
                setMinAmount('0');
                setSelectedCampusFilter('');
                setSelectedClassFilter('');
                setSearchQuery('');
              }}
              className="text-purple-700 font-semibold hover:underline"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* Bulk Action Bar (when items selected) */}
      {selectedCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-purple-50 border border-purple-200 p-4 animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-white font-bold text-sm">
              {selectedCount}
            </span>
            <div>
              <p className="text-sm font-semibold text-neutral-900">
                {selectedCount} student{selectedCount === 1 ? '' : 's'} selected
              </p>
              <p className="text-xs text-purple-700 font-mono">
                Total Overdue: {formatCurrency(selectedOverdueTotal)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
              disabled={bulkSending}
            >
              Clear Selection
            </Button>
            <Button
              variant="primary"
              onClick={handleSendBulkReminders}
              disabled={bulkSending}
            >
              {bulkSending ? 'Sending Reminders...' : `📱 Send WhatsApp Reminders (${selectedCount})`}
            </Button>
          </div>
        </div>
      )}

      {/* Defaulters Table */}
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-neutral-50 text-neutral-600 border-b border-neutral-200 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all defaulters"
                    checked={defaulters.length > 0 && selectedIds.size === defaulters.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 rounded border-neutral-300 text-purple-600 focus:ring-purple-500"
                  />
                </th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Class & Campus</th>
                <th className="py-3 px-4">Primary Contact</th>
                <th className="py-3 px-4">Invoices / Due Date</th>
                <th className="py-3 px-4 text-center">Days Overdue</th>
                <th className="py-3 px-4 text-right">Overdue Balance</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-neutral-500">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent mb-3" />
                    <p className="text-sm font-medium">Loading defaulters report...</p>
                  </td>
                </tr>
              ) : defaulters.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-neutral-500">
                    <div className="text-3xl mb-2">🎉</div>
                    <p className="text-base font-semibold text-neutral-800">No Defaulters Found</p>
                    <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                      All students are up-to-date with fee obligations matching your selected criteria.
                    </p>
                  </td>
                </tr>
              ) : (
                defaulters.map((item) => {
                  const isSelected = selectedIds.has(item.student.id);
                  const isCritical = item.maxDaysOverdue >= 30;
                  const isSendingThis = sendingIndividualId === item.student.id;

                  return (
                    <tr
                      key={item.student.id}
                      className={`hover:bg-neutral-50/80 transition-colors ${
                        isSelected ? 'bg-purple-50/40' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          aria-label={`Select ${item.user.name}`}
                          checked={isSelected}
                          onChange={() => handleToggleSelect(item.student.id)}
                          className="h-4 w-4 rounded border-neutral-300 text-purple-600 focus:ring-purple-500"
                        />
                      </td>

                      {/* Student Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-200 text-neutral-700 font-bold text-xs uppercase">
                            {item.user.name.slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-semibold text-neutral-900">{item.user.name}</div>
                            <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono">
                              <span>Adm: {item.student.admissionNumber}</span>
                              <span>•</span>
                              <span>Roll: {item.student.rollNumber}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Class & Campus */}
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium text-neutral-800">
                          {item.classInfo ? `${item.classInfo.grade}-${item.classInfo.section}` : 'N/A'}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {item.campus?.name || 'Main Campus'}
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-3 px-4">
                        <div className="text-sm text-neutral-800 font-medium">
                          {item.parentName || 'Guardian'}
                        </div>
                        <div className="text-xs text-neutral-500 font-mono">
                          {item.parentPhone || '+92 300 0000000'}
                        </div>
                      </td>

                      {/* Invoices */}
                      <td className="py-3 px-4">
                        <div className="text-xs font-semibold text-neutral-800">
                          {item.overdueInvoices.length} overdue invoice{item.overdueInvoices.length === 1 ? '' : 's'}
                        </div>
                        <div className="text-xs text-neutral-500">
                          Due since: <span className="font-mono">{item.minDueDate}</span>
                        </div>
                      </td>

                      {/* Days Overdue Badge */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                            isCritical
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {item.maxDaysOverdue} days
                        </span>
                      </td>

                      {/* Overdue Balance */}
                      <td className="py-3 px-4 text-right">
                        <span className="text-base font-bold font-mono text-rose-600">
                          {formatCurrency(item.totalOverdueAmount)}
                        </span>
                      </td>

                      {/* Row Actions */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSendReminder(item)}
                            disabled={isSendingThis}
                            className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1.5 rounded-lg border border-purple-200 transition-colors disabled:opacity-50"
                            title="Send WhatsApp Reminder"
                          >
                            <span>📱</span>
                            <span>{isSendingThis ? 'Sending...' : 'Remind'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setLedgerStudentId(item.student.id);
                              setIsLedgerOpen(true);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 px-2.5 py-1.5 rounded-lg border border-neutral-200 transition-colors"
                            title="View Student Fee Ledger"
                          >
                            <span>📜</span>
                            <span>Ledger</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Fee Ledger Modal */}
      <StudentFeeLedgerModal
        isOpen={isLedgerOpen}
        onClose={() => {
          setIsLedgerOpen(false);
          setLedgerStudentId(null);
        }}
        studentId={ledgerStudentId}
        schoolId={schoolId}
      />
    </div>
  );
}
