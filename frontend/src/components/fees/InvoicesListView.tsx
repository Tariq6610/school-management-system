'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Campus,
  Class,
  FeeInvoice,
  FeeStructure,
  ID,
  Scope,
  Student,
  User,
} from '@/types';
import { listFeeInvoices } from '@/lib/repositories/feeInvoices';
import { listCampuses } from '@/lib/repositories/campuses';
import { listClasses } from '@/lib/repositories/classes';
import { listStudents } from '@/lib/repositories/students';
import { listUsers } from '@/lib/repositories/users';
import { listFeeStructures } from '@/lib/repositories/feeStructures';
import { formatCurrency } from '@/lib/utils/currency';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/ui/Toast';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Pagination } from '@/components/ui/Pagination';
import { InvoicesTable } from './InvoicesTable';
import { BulkInvoiceModal } from './BulkInvoiceModal';

export interface InvoicesListViewProps {
  initialCampusId?: ID;
  initialInvoices?: FeeInvoice[];
  initialCampuses?: Campus[];
  initialClasses?: Class[];
  initialStudents?: Student[];
  initialUsers?: User[];
  initialStructures?: FeeStructure[];
}

export function InvoicesListView({
  initialCampusId,
  initialInvoices,
  initialCampuses,
  initialClasses,
  initialStudents,
  initialUsers,
  initialStructures,
}: InvoicesListViewProps) {
  const { session } = useSession();
  const { showToast } = useToast();
  const schoolId = session?.schoolId ?? 'sch_main';

  // Data states
  const [invoices, setInvoices] = useState<FeeInvoice[]>(initialInvoices || []);
  const [campuses, setCampuses] = useState<Campus[]>(initialCampuses || []);
  const [classes, setClasses] = useState<Class[]>(initialClasses || []);
  const [students, setStudents] = useState<Student[]>(initialStudents || []);
  const [users, setUsers] = useState<User[]>(initialUsers || []);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>(initialStructures || []);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampusFilter, setSelectedCampusFilter] = useState<string>(initialCampusId || '');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Modal state
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  // Lookup maps
  const studentsMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const usersMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const classesMap = useMemo(() => new Map(classes.map((c) => [c.id, c])), [classes]);
  const campusesMap = useMemo(() => new Map(campuses.map((c) => [c.id, c])), [campuses]);
  const feeStructuresMap = useMemo(
    () => new Map(feeStructures.map((f) => [f.id, f])),
    [feeStructures]
  );

  // Load / refresh invoices
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const scope: Scope = {
        schoolId,
        campusId: selectedCampusFilter || undefined,
      };

      const [invList, campList, clsList, stuList, usrList, structList] = await Promise.all([
        listFeeInvoices(scope),
        campuses.length ? Promise.resolve(campuses) : listCampuses({ schoolId }),
        classes.length ? Promise.resolve(classes) : listClasses(scope),
        students.length ? Promise.resolve(students) : listStudents({ schoolId }),
        users.length ? Promise.resolve(users) : listUsers({ schoolId }, { role: 'student' }),
        feeStructures.length ? Promise.resolve(feeStructures) : listFeeStructures({ schoolId }),
      ]);

      setInvoices(invList);
      if (!campuses.length) setCampuses(campList);
      if (!classes.length) setClasses(clsList);
      if (!students.length) setStudents(stuList);
      if (!users.length) setUsers(usrList);
      if (!feeStructures.length) setFeeStructures(structList);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Load failed',
        message: err instanceof Error ? err.message : 'Failed to load invoices from repository',
      });
    } finally {
      setLoading(false);
    }
  }, [schoolId, selectedCampusFilter, campuses, classes, students, users, feeStructures, showToast]);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) {
        loadData();
      }
    });
    return () => {
      ignore = true;
    };
  }, [loadData]);

  // Financial Stats Calculation across current scope
  const stats = useMemo(() => {
    let totalBilled = 0;
    let totalCollected = 0;
    let totalPending = 0;
    let overdueCount = 0;
    let overdueAmount = 0;

    for (const inv of invoices) {
      const net = inv.totalAmount - inv.discountAmount;
      totalBilled += net;
      totalCollected += inv.paidAmount;

      const balance = Math.max(0, net - inv.paidAmount);
      if (inv.status === 'overdue') {
        overdueCount++;
        overdueAmount += balance;
      } else if (balance > 0) {
        totalPending += balance;
      }
    }

    return {
      totalCount: invoices.length,
      totalBilled,
      totalCollected,
      totalPending,
      overdueCount,
      overdueAmount,
    };
  }, [invoices]);

  // Filtered invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Campus filter
      if (selectedCampusFilter && inv.campusId !== selectedCampusFilter) {
        return false;
      }

      // Student and Class lookup
      const student = studentsMap.get(inv.studentId);
      if (selectedClassFilter && student && student.classId !== selectedClassFilter) {
        return false;
      }

      // Status filter
      if (selectedStatusFilter && inv.status !== selectedStatusFilter) {
        return false;
      }

      // Month filter
      if (selectedMonthFilter) {
        const matchMonth =
          inv.billingMonth === selectedMonthFilter ||
          (inv.dueDate && inv.dueDate.startsWith(selectedMonthFilter)) ||
          inv.lineItems?.some((item) =>
            item.label.toLowerCase().includes(selectedMonthFilter.toLowerCase())
          );
        if (!matchMonth) return false;
      }

      // Search query (Student Name, Admission #, Roll #, Invoice #)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const user = student ? usersMap.get(student.userId) : undefined;
        const studentName = user?.name.toLowerCase() || '';
        const adm = student?.admissionNumber.toLowerCase() || '';
        const roll = student?.rollNumber.toLowerCase() || '';
        const invNum = inv.invoiceNumber?.toLowerCase() || '';

        const matches =
          studentName.includes(q) || adm.includes(q) || roll.includes(q) || invNum.includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [
    invoices,
    selectedCampusFilter,
    selectedClassFilter,
    selectedStatusFilter,
    selectedMonthFilter,
    searchQuery,
    studentsMap,
    usersMap,
  ]);

  // Paginated invoices
  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredInvoices.slice(startIndex, startIndex + pageSize);
  }, [filteredInvoices, currentPage, pageSize]);

  const hasActiveFilters = Boolean(
    searchQuery ||
      selectedCampusFilter ||
      selectedClassFilter ||
      selectedStatusFilter ||
      selectedMonthFilter
  );

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
              Fee Invoices & Billing
            </h1>
            <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-800 border border-purple-200">
              {filteredInvoices.length} Invoices
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-neutral-500">
            Generate bulk invoices with instant preview, record payments, and track receivables.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/admin/fees/defaulters">
            <Button
              variant="secondary"
              size="md"
              className="flex items-center gap-2"
            >
              <span>⚠️</span>
              <span>Defaulter Report</span>
            </Button>
          </Link>
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsBulkModalOpen(true)}
            className="flex items-center gap-2 shadow-xs"
          >
            <span>⚡</span>
            <span>Generate Invoices (Bulk)</span>
          </Button>
        </div>
      </div>

      {/* 2. StatCards Financial Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Invoiced"
          value={formatCurrency(stats.totalBilled)}
          subtitle={`${stats.totalCount} total invoices`}
          icon="🧾"
        />
        <StatCard
          label="Total Collected"
          value={formatCurrency(stats.totalCollected)}
          subtitle={
            stats.totalBilled > 0
              ? `${Math.round((stats.totalCollected / stats.totalBilled) * 100)}% collection rate`
              : '0%'
          }
          icon="💳"
        />
        <StatCard
          label="Pending Receivables"
          value={formatCurrency(stats.totalPending)}
          subtitle="Current active dues"
          icon="⏳"
        />
        <StatCard
          label="Overdue Defaulters"
          value={formatCurrency(stats.overdueAmount)}
          subtitle={`${stats.overdueCount} overdue invoices`}
          icon="🚨"
        />
      </div>

      {/* 3. Filter Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-xl border border-neutral-200 bg-neutral-50/80 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search Box */}
          <div className="w-full sm:w-60">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by student, roll, or inv #..."
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-800 placeholder-neutral-400 focus:border-purple-500 focus:outline-hidden shadow-2xs"
            />
          </div>

          {/* Status Filter */}
          <div className="w-full sm:w-36">
            <select
              value={selectedStatusFilter}
              onChange={(e) => {
                setSelectedStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-800 focus:border-purple-500 focus:outline-hidden shadow-2xs"
            >
              <option value="">All Statuses</option>
              <option value="paid">✓ Paid</option>
              <option value="partial">⏱ Partial</option>
              <option value="pending">⏳ Pending</option>
              <option value="overdue">🚨 Overdue</option>
            </select>
          </div>

          {/* Campus Filter */}
          <div className="w-full sm:w-44">
            <select
              value={selectedCampusFilter}
              onChange={(e) => {
                setSelectedCampusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-800 focus:border-purple-500 focus:outline-hidden shadow-2xs"
            >
              <option value="">🌐 All Campuses</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  🏫 {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Class Filter */}
          <div className="w-full sm:w-40">
            <select
              value={selectedClassFilter}
              onChange={(e) => {
                setSelectedClassFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-800 focus:border-purple-500 focus:outline-hidden shadow-2xs"
            >
              <option value="">👥 All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.grade} — Section {cls.section}
                </option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div className="w-full sm:w-40">
            <select
              value={selectedMonthFilter}
              onChange={(e) => {
                setSelectedMonthFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-800 focus:border-purple-500 focus:outline-hidden shadow-2xs"
            >
              <option value="">📅 All Months</option>
              <option value="2026-09">September 2026</option>
              <option value="2026-08">August 2026</option>
              <option value="2026-07">July 2026</option>
              <option value="2026-10">October 2026</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedStatusFilter('');
              setSelectedCampusFilter('');
              setSelectedClassFilter('');
              setSelectedMonthFilter('');
              setCurrentPage(1);
            }}
            className="text-xs font-semibold text-purple-700 hover:text-purple-900 self-start md:self-auto cursor-pointer"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* 4. Table */}
      <InvoicesTable
        invoices={paginatedInvoices}
        studentsMap={studentsMap}
        usersMap={usersMap}
        classesMap={classesMap}
        campusesMap={campusesMap}
        feeStructuresMap={feeStructuresMap}
        isLoading={loading}
      />

      {/* 5. Pagination */}
      {filteredInvoices.length > pageSize && (
        <Pagination
          page={currentPage}
          pageSize={pageSize}
          totalItems={filteredInvoices.length}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      )}

      {/* 6. Bulk Generation Modal */}
      <BulkInvoiceModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={() => {
          loadData();
        }}
        campuses={campuses}
        classes={classes}
        feeStructures={feeStructures}
        initialCampusId={selectedCampusFilter}
      />
    </div>
  );
}
