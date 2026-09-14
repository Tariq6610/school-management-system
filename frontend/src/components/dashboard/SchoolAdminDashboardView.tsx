'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  SchoolAdminDashboardData,
  getSchoolAdminDashboardStats,
} from '@/lib/repositories/schoolAdminDashboard';
import { Button } from '@/components/ui/Button';
import { NavIcon } from '@/components/shell/NavIcon';

export interface SchoolAdminDashboardViewProps {
  schoolId?: string;
  campusId?: string;
  initialData?: SchoolAdminDashboardData;
}

export function SchoolAdminDashboardView({
  schoolId = 'sch_main',
  campusId,
  initialData,
}: SchoolAdminDashboardViewProps = {}) {
  const [data, setData] = useState<SchoolAdminDashboardData | null>(initialData || null);
  const [isLoading, setIsLoading] = useState(!initialData);

  useEffect(() => {
    let isMounted = true;

    async function loadStats() {
      try {
        const stats = await getSchoolAdminDashboardStats({
          schoolId,
          campusId,
        });
        if (isMounted) {
          setData(stats);
        }
      } catch (err) {
        console.error('Failed to load school admin dashboard stats:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadStats();

    return () => {
      isMounted = false;
    };
  }, [schoolId, campusId]);

  if (isLoading || !data) {
    return (
      <div className="p-8 text-center text-ink-500">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-brand-600 border-t-transparent mb-2" />
        <p className="text-sm">Loading school administration dashboard...</p>
      </div>
    );
  }

  const {
    activeStudents,
    totalStudents,
    newAdmissionsThisMonth,
    studentsByGender,
    totalTeachers,
    studentTeacherRatio,
    todayAttendance,
    pendingFees,
    upcomingExams,
    campusName,
  } = data;

  const malePercent =
    activeStudents > 0 ? Math.round((studentsByGender.male / activeStudents) * 100) : 50;
  const femalePercent = 100 - malePercent;

  return (
    <div className="space-y-8 pb-12">
      {/* Welcome & Quick Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-rule pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-page-title text-ink-900">
              School Admin Dashboard
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-present-bg text-present font-semibold border border-present/20">
              {campusName}
            </span>
          </div>
          <p className="text-secondary-meta text-ink-500 mt-1">
            Real-time daily operations overview • Academic Session 2026–2027
          </p>
        </div>

        {/* Quick Launch Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/students/new">
            <Button variant="primary" size="sm" leftIcon={<NavIcon name="plus" className="w-3.5 h-3.5" />}>
              Admit Student
            </Button>
          </Link>
          <Link href="/admin/attendance">
            <Button variant="secondary" size="sm">
              Mark Register
            </Button>
          </Link>
          <Link href="/admin/fees/invoices">
            <Button variant="secondary" size="sm">
              Generate Invoices
            </Button>
          </Link>
          <Link href="/admin/exams">
            <Button variant="secondary" size="sm">
              Exam Manager
            </Button>
          </Link>
        </div>
      </div>

      {/* Four Core Pillars KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pillar 1: Students */}
        <div className="bg-surface p-5 rounded-card border border-rule shadow-overlay hover:border-brand-600/40 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-control bg-brand-100 text-brand-700">
                <NavIcon name="users" className="w-4.5 h-4.5" />
              </div>
              <span className="text-xs font-semibold text-ink-500 uppercase tracking-wider">
                Enrolled Students
              </span>
            </div>
            <Link href="/admin/students" className="text-xs text-brand-700 hover:underline font-medium shrink-0">
              View All →
            </Link>
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-3xl font-extrabold text-ink-900 tabular-nums">
              {activeStudents}
            </span>
            <span className="text-xs text-ink-500">/ {totalStudents} total</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-ink-500 pt-2 border-t border-rule">
            <span>+{newAdmissionsThisMonth} this month</span>
            <span>Ratio {studentTeacherRatio}:1</span>
          </div>
        </div>

        {/* Pillar 2: Today's Attendance */}
        <div className="bg-surface p-5 rounded-card border border-rule shadow-overlay hover:border-brand-600/40 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-control bg-present-bg text-present">
                <NavIcon name="clipboard-check" className="w-4.5 h-4.5" />
              </div>
              <span className="text-xs font-semibold text-ink-500 uppercase tracking-wider">
                Today&apos;s Attendance
              </span>
            </div>
            <Link href="/admin/attendance" className="text-xs text-brand-700 hover:underline font-medium shrink-0">
              Register →
            </Link>
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-3xl font-extrabold text-present tabular-nums">
              {todayAttendance.attendancePercentage.toFixed(1)}%
            </span>
            <span className="text-xs text-ink-500">present</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-ink-500 pt-2 border-t border-rule">
            <span>
              {todayAttendance.markedClassesCount} of {todayAttendance.totalClasses} classes marked
            </span>
            {todayAttendance.absentCount > 0 && (
              <span className="text-absent font-semibold">{todayAttendance.absentCount} absent</span>
            )}
          </div>
        </div>

        {/* Pillar 3: Pending Fees */}
        <div className="bg-surface p-5 rounded-card border border-rule shadow-overlay hover:border-brand-600/40 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-control bg-absent-bg text-absent">
                <NavIcon name="credit-card" className="w-4.5 h-4.5" />
              </div>
              <span className="text-xs font-semibold text-ink-500 uppercase tracking-wider">
                Pending Fees
              </span>
            </div>
            <Link href="/admin/fees/defaulters" className="text-xs text-absent hover:underline font-medium shrink-0">
              Defaulters →
            </Link>
          </div>
          <div className="flex items-baseline gap-1 mt-3">
            <span className="text-xs text-ink-500 font-semibold">PKR</span>
            <span className="text-2xl font-extrabold text-absent tabular-nums">
              {pendingFees.pendingAmount.toLocaleString('en-PK')}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-ink-500 pt-2 border-t border-rule">
            <span>{pendingFees.collectionRate}% collected</span>
            <span className="text-late font-medium">{pendingFees.defaultersCount} defaulters</span>
          </div>
        </div>

        {/* Pillar 4: Upcoming Exams */}
        <div className="bg-surface p-5 rounded-card border border-rule shadow-overlay hover:border-brand-600/40 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-control bg-accent-100 text-accent-700">
                <NavIcon name="award" className="w-4.5 h-4.5" />
              </div>
              <span className="text-xs font-semibold text-ink-500 uppercase tracking-wider">
                Upcoming Exams
              </span>
            </div>
            <Link href="/admin/exams" className="text-xs text-brand-700 hover:underline font-medium shrink-0">
              Schedule →
            </Link>
          </div>
          <div className="flex items-baseline gap-2 mt-3">
            <span className="text-3xl font-extrabold text-accent-700 tabular-nums">
              {upcomingExams.length}
            </span>
            <span className="text-xs text-ink-500">scheduled</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-ink-500 pt-2 border-t border-rule">
            <span>Next: {upcomingExams[0]?.date || 'None'}</span>
            <span className="text-accent-700 font-medium">Term Exams</span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Operational Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Attendance & Unmarked Register Warning */}
        <div className="space-y-6">
          {/* Today's Register Tracking */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Daily Attendance Summary
                </h3>
                <p className="text-xs text-gray-500">
                  Register records for date: <strong className="text-gray-800">{todayAttendance.date}</strong>
                </p>
              </div>
              <Link href="/admin/attendance">
                <Button variant="secondary" size="sm">
                  View Register Grid →
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-4 gap-2 my-5 text-center">
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                <span className="text-xl font-bold text-emerald-700 tabular-nums">
                  {todayAttendance.presentCount}
                </span>
                <span className="text-[11px] text-emerald-600 block font-medium">Present</span>
              </div>
              <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                <span className="text-xl font-bold text-red-700 tabular-nums">
                  {todayAttendance.absentCount}
                </span>
                <span className="text-[11px] text-red-600 block font-medium">Absent</span>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                <span className="text-xl font-bold text-amber-700 tabular-nums">
                  {todayAttendance.lateCount}
                </span>
                <span className="text-[11px] text-amber-600 block font-medium">Late</span>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <span className="text-xl font-bold text-blue-700 tabular-nums">
                  {todayAttendance.leaveCount}
                </span>
                <span className="text-[11px] text-blue-600 block font-medium">Leave</span>
              </div>
            </div>

            {/* Unmarked Registers Warning Alert (FEATURE_SPECIFICATIONS.md §8) */}
            {todayAttendance.unmarkedClassesCount > 0 ? (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-amber-700 font-bold text-sm">
                    ⚠️ {todayAttendance.unmarkedClassesCount} Unmarked Registers Today
                  </span>
                  <span className="text-xs text-amber-600">
                    (Requires administrative follow-up)
                  </span>
                </div>
                <p className="text-xs text-amber-800 mb-3">
                  The following class sections have not submitted their registers:
                </p>
                <div className="divide-y divide-amber-200/60 max-h-40 overflow-y-auto">
                  {todayAttendance.unmarkedClasses.map((u) => (
                    <div key={u.classId} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-gray-900">{u.className}</span>
                        <span className="text-gray-500 ml-2">Teacher: {u.teacherName}</span>
                      </div>
                      <Link href={`/admin/attendance`}>
                        <span className="text-emerald-700 hover:underline font-medium">
                          Mark Now →
                        </span>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-3">
                <span className="text-xl">✅</span>
                <div>
                  <p className="text-sm font-semibold text-emerald-900">All registers completed!</p>
                  <p className="text-xs text-emerald-700">Every scheduled class section has marked attendance for today.</p>
                </div>
              </div>
            )}
          </div>

          {/* Student Roster & Demographics */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-1">
              Student Demographics & Roster
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Enrolment balance and faculty staffing ratio
            </p>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span className="text-gray-700">Gender Distribution</span>
                  <span className="text-gray-500">{malePercent}% Male • {femalePercent}% Female</span>
                </div>
                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden flex">
                  <div className="bg-blue-500 h-full" style={{ width: `${malePercent}%` }} />
                  <div className="bg-pink-500 h-full" style={{ width: `${femalePercent}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100 text-xs">
                <div className="p-3 rounded-lg bg-gray-50">
                  <span className="text-gray-500 block">Teaching Faculty</span>
                  <span className="text-lg font-bold text-gray-900">{totalTeachers} Teachers</span>
                </div>
                <div className="p-3 rounded-lg bg-gray-50">
                  <span className="text-gray-500 block">Staffing Ratio</span>
                  <span className="text-lg font-bold text-gray-900">{studentTeacherRatio} : 1</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Fees Breakdown & Upcoming Exams */}
        <div className="space-y-6">
          {/* Pending Fees & Defaulters */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Fee Collection & Overdue Status
                </h3>
                <p className="text-xs text-gray-500">
                  Monthly billing cycle performance
                </p>
              </div>
              <Link href="/admin/fees/defaulters">
                <Button variant="secondary" size="sm">
                  Defaulters Ledger →
                </Button>
              </Link>
            </div>

            <div className="my-5">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-gray-700">Collection Rate</span>
                <span className="font-bold text-blue-700">{pendingFees.collectionRate}%</span>
              </div>
              <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, pendingFees.collectionRate)}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-100 text-xs">
                <div>
                  <span className="text-gray-500 block">Billed</span>
                  <span className="font-bold text-gray-800">
                    PKR {pendingFees.totalBilled.toLocaleString('en-PK')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Collected</span>
                  <span className="font-bold text-emerald-600">
                    PKR {pendingFees.totalCollected.toLocaleString('en-PK')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Outstanding</span>
                  <span className="font-bold text-red-600">
                    PKR {pendingFees.pendingAmount.toLocaleString('en-PK')}
                  </span>
                </div>
              </div>
            </div>

            {pendingFees.defaultersCount > 0 && (
              <div className="p-3 bg-red-50 rounded-lg border border-red-200 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-red-900 block">
                    {pendingFees.defaultersCount} Students with Overdue Vouchers
                  </span>
                  <span className="text-[11px] text-red-700">
                    {pendingFees.overdueInvoicesCount} overdue vouchers past grace period
                  </span>
                </div>
                <Link href="/admin/fees/defaulters">
                  <span className="text-xs font-bold text-red-700 hover:underline">
                    Send WhatsApp Reminder →
                  </span>
                </Link>
              </div>
            )}
          </div>

          {/* Upcoming Exams Schedule */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Upcoming & Active Exams
                </h3>
                <p className="text-xs text-gray-500">
                  Scheduled academic assessments
                </p>
              </div>
              <Link href="/admin/exams">
                <Button variant="secondary" size="sm">
                  All Exams →
                </Button>
              </Link>
            </div>

            {upcomingExams.length === 0 ? (
              <p className="py-8 text-center text-xs text-gray-500">
                No examinations scheduled for this term.
              </p>
            ) : (
              <div className="divide-y divide-gray-100 mt-2">
                {upcomingExams.map((ex) => (
                  <div key={ex.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {ex.name}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            ex.status === 'published'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {ex.status === 'published' ? 'Published' : 'Draft / Marks Open'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {ex.subjectName} • {ex.className} ({ex.campusName})
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-gray-800 block">
                        {ex.date}
                      </span>
                      <span className="text-[11px] text-gray-500 block">
                        Max Marks: {ex.maxMarks}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
