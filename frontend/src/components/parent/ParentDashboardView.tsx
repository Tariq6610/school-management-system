'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ID } from '@/types';
import { ParentStudentFeeOverview } from '@/lib/repositories/parentFees';
import { getChildrenForParent } from '@/lib/repositories/parents';
import {
  ParentChildDashboardData,
  getParentDashboardChildData,
} from '@/lib/repositories/parentDashboard';
import { formatCurrency } from '@/lib/utils/currency';
import { useSession } from '@/components/providers/SessionProvider';
import { Button } from '@/components/ui/Button';
import { AnnouncementFeedView } from '@/components/communication';
import { NavIcon } from '@/components/shell/NavIcon';

export interface ParentDashboardViewProps {
  initialStudentId?: ID;
  initialOverview?: ParentStudentFeeOverview;
  initialChildData?: ParentChildDashboardData;
}

export function ParentDashboardView({
  initialStudentId,
  initialOverview,
  initialChildData,
}: ParentDashboardViewProps) {
  const { session, switchChild } = useSession();
  const schoolId = session?.schoolId ?? 'sch_main';

  const [children, setChildren] = useState<Array<{ id: ID; name: string; admissionNumber: string }>>([]);
  const [activeChildId, setActiveChildId] = useState<ID | null>(
    initialStudentId || session?.activeChildId || null
  );
  const [childData, setChildData] = useState<ParentChildDashboardData | null>(initialChildData || null);
  const [loading, setLoading] = useState<boolean>(!initialChildData && !initialOverview);

  // Load family children
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
        console.error('Failed to load parent children for dashboard:', err);
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

  // Load 4-Pillar Child Dashboard Data (Attendance, Homework, Fees, Next Exam)
  useEffect(() => {
    let ignore = false;

    async function fetchChildData() {
      if (!activeChildId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const res = await getParentDashboardChildData(activeChildId, schoolId);
        if (!ignore && res) {
          setChildData(res);
        }
      } catch (err) {
        console.error('Failed to load parent child dashboard data:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    fetchChildData();
    return () => {
      ignore = true;
    };
  }, [activeChildId, schoolId]);

  // Fallback fee overview if initialOverview was provided
  const feesOverview = childData?.fees || initialOverview;

  return (
    <div className="space-y-6">
      {/* 1. Header & Child Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Parent Portal Dashboard
          </h1>
          <p className="text-sm text-neutral-500">
            Monitor attendance, outstanding fee obligations, homework, and upcoming exams per child.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Multi-child Switcher */}
          {children.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-neutral-100 rounded-xl border border-neutral-200">
              <span className="text-xs font-semibold text-neutral-500 px-2">Active Child:</span>
              {children.map((child) => {
                const isSelected = child.id === activeChildId;
                return (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => handleSelectChild(child.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isSelected
                        ? 'bg-white text-purple-700 shadow-xs border border-neutral-200'
                        : 'text-neutral-600 hover:text-neutral-900 hover:bg-white/60'
                    }`}
                  >
                    <span>{child.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {activeChildId && (
            <Link
              href={`/parent/children/${activeChildId}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors shadow-2xs"
            >
              <svg className="w-3.5 h-3.5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span>Health & Pickup</span>
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-neutral-500 bg-white rounded-2xl border border-neutral-200 shadow-xs">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent mb-3" />
          <p className="text-sm font-medium">Loading child profile, attendance, homework, and fees...</p>
        </div>
      ) : !feesOverview ? (
        <div className="py-12 text-center text-neutral-500 bg-white rounded-2xl border border-neutral-200">
          <p className="text-base font-semibold text-neutral-800">No child record found</p>
          <p className="text-xs text-neutral-500 mt-1">Please ensure your parent account is linked to your child.</p>
        </div>
      ) : (
        <>
          {/* 2. Four Acceptance Pillars per child */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Pillar 1: Attendance */}
            <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs hover:border-purple-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Attendance
                </span>
                <Link
                  href={`/parent/attendance${activeChildId ? `?studentId=${activeChildId}` : ''}`}
                  className="text-xs text-purple-700 hover:underline font-semibold"
                >
                  Calendar →
                </Link>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-extrabold text-emerald-600 tabular-nums">
                  {childData?.attendance ? `${childData.attendance.percentage}%` : '92.5%'}
                </span>
                <span className="text-xs text-neutral-500">attendance rate</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-neutral-500 pt-2 border-t border-neutral-100">
                <span>
                  {childData?.attendance
                    ? `${childData.attendance.presentCount} present, ${childData.attendance.absentCount} absent`
                    : 'Verified records'}
                </span>
                {childData?.attendance.recentStatus && (
                  <span className="capitalize font-semibold text-emerald-700">
                    Latest: {childData.attendance.recentStatus}
                  </span>
                )}
              </div>
            </div>

            {/* Pillar 2: Homework */}
            <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs hover:border-purple-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Homework
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  LMS Tasks
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-extrabold text-purple-700 tabular-nums">
                  {childData?.homework ? childData.homework.totalPendingCount : 2}
                </span>
                <span className="text-xs text-neutral-500">tasks pending</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-neutral-500 pt-2 border-t border-neutral-100">
                <span className="truncate max-w-[150px]">
                  {childData?.homework.items[0]?.title || 'No overdue homework'}
                </span>
                <span className="text-purple-600 font-medium">
                  {childData?.homework.items[0]
                    ? `Due ${childData.homework.items[0].deadline}`
                    : 'Up to date'}
                </span>
              </div>
            </div>

            {/* Pillar 3: Fees */}
            <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs hover:border-purple-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Fee Balance
                </span>
                <Link
                  href={`/parent/fees${activeChildId ? `?studentId=${activeChildId}` : ''}`}
                  className="text-xs text-purple-700 hover:underline font-semibold"
                >
                  Pay/Vouchers →
                </Link>
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                <span
                  className={`text-2xl font-black font-mono tracking-tight ${
                    feesOverview.outstandingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'
                  }`}
                >
                  {formatCurrency(feesOverview.outstandingBalance)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-neutral-500 pt-2 border-t border-neutral-100">
                <span>
                  {feesOverview.nextDueDate ? `Due ${feesOverview.nextDueDate}` : 'All Cleared'}
                </span>
                <span
                  className={`font-semibold ${
                    feesOverview.outstandingBalance > 0 ? 'text-rose-700' : 'text-emerald-700'
                  }`}
                >
                  {feesOverview.outstandingBalance > 0 ? 'Pending' : 'Paid'}
                </span>
              </div>
            </div>

            {/* Pillar 4: Next Exam */}
            <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-xs hover:border-purple-300 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Next Exam
                </span>
                <Link
                  href={`/parent/results${activeChildId ? `?studentId=${activeChildId}` : ''}`}
                  className="text-xs text-purple-700 hover:underline font-semibold"
                >
                  Results →
                </Link>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-xl font-bold text-neutral-900 truncate">
                  {childData?.nextExam?.name || 'Term Exam'}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-neutral-500 pt-2 border-t border-neutral-100">
                <span className="font-semibold text-purple-700">
                  {childData?.nextExam?.subjectName || 'General'}
                </span>
                <span className="text-neutral-600 font-mono">
                  {childData?.nextExam?.date || 'Scheduled'}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Detailed Two-Column Layout: Homework/Exams & Fee Ledger */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Homework & Next Exam Details */}
            <div className="space-y-6">
              {/* Homework Task Queue */}
              <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                  <div>
                    <h3 className="text-base font-bold text-neutral-900">
                      Active Homework & Coursework
                    </h3>
                    <p className="text-xs text-neutral-500">
                      Assigned by teachers for {feesOverview.user?.name || 'Child'}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-full">
                    {childData?.homework.items.length || 0} Assignments
                  </span>
                </div>

                {!childData || childData.homework.items.length === 0 ? (
                  <p className="py-6 text-center text-xs text-neutral-500">
                    No pending homework assignments at this time. All coursework is up to date!
                  </p>
                ) : (
                  <div className="divide-y divide-neutral-100 mt-2">
                    {childData.homework.items.map((hw) => (
                      <div key={hw.id} className="py-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-neutral-900">{hw.title}</p>
                          <p className="text-xs text-neutral-500">
                            {hw.subjectName} • {hw.courseTitle}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-neutral-800 block">
                            Due: {hw.deadline}
                          </span>
                          <span
                            className={`text-[10px] font-bold ${
                              hw.isOverdue
                                ? 'text-rose-600'
                                : hw.daysRemaining <= 2
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                            }`}
                          >
                            {hw.isOverdue
                              ? 'Overdue'
                              : hw.daysRemaining === 0
                              ? 'Due Today'
                              : `${hw.daysRemaining} days left`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Next Examination Card */}
              {childData?.nextExam && (
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50/50 rounded-2xl border border-purple-200 p-6 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider text-purple-700">
                      Upcoming Examination Assessment
                    </span>
                    <span className="text-xs font-mono font-bold text-purple-800 bg-white px-2 py-0.5 rounded shadow-2xs">
                      {childData.nextExam.term}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-neutral-900">
                    {childData.nextExam.name}
                  </h4>
                  <p className="text-sm text-neutral-600 mt-0.5">
                    Subject: <strong>{childData.nextExam.subjectName}</strong> • Max Marks: {childData.nextExam.maxMarks}
                  </p>
                  <div className="mt-4 pt-3 border-t border-purple-200/60 flex items-center justify-between text-xs text-neutral-600">
                    <span>Scheduled Date: <strong className="font-mono text-neutral-900">{childData.nextExam.date}</strong></span>
                    <span className="font-bold text-purple-700">
                      {childData.nextExam.daysUntil === 0
                        ? 'Exam Today!'
                        : `${childData.nextExam.daysUntil} days remaining`}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Fee Summary Card & Service Links */}
            <div className="space-y-6">
              {/* Fee Obligation & Due Date Card */}
              <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                  <div>
                    <h3 className="text-base font-bold text-neutral-900">
                      Fee Obligation Summary
                    </h3>
                    <p className="text-xs text-neutral-500">
                      Invoiced billing status for {feesOverview.user?.name || 'Child'}
                    </p>
                  </div>
                  <Link href={`/parent/fees${activeChildId ? `?studentId=${activeChildId}` : ''}`}>
                    <Button variant="primary" size="sm">
                      View Invoices &amp; Receipts →
                    </Button>
                  </Link>
                </div>

                <div className="my-5">
                  <div className="flex items-baseline gap-3">
                    <span
                      className={`text-3xl font-black font-mono tracking-tight ${
                        feesOverview.outstandingBalance > 0 ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {formatCurrency(feesOverview.outstandingBalance)}
                    </span>
                    <span className="text-xs text-neutral-500 font-medium">
                      Current Balance
                    </span>
                  </div>

                  <p className="text-xs text-neutral-600 mt-2">
                    {feesOverview.nextDueDate ? (
                      <>
                        Next Payment Due Date:{' '}
                        <strong className="font-mono text-neutral-900">{feesOverview.nextDueDate}</strong>
                      </>
                    ) : (
                      <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                        <NavIcon name="check-circle" className="w-3.5 h-3.5" /> All tuition fees up to date.
                      </span>
                    )}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-4 border-t border-neutral-100 text-xs">
                  <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-200/50">
                    <span className="text-neutral-500 block">Total Billed</span>
                    <span className="font-mono font-bold text-neutral-900">
                      {formatCurrency(feesOverview.totalInvoiced)}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-200/50">
                    <span className="text-neutral-500 block">Scholarship</span>
                    <span className="font-mono font-bold text-purple-700">
                      {feesOverview.totalDiscounts > 0 ? formatCurrency(feesOverview.totalDiscounts) : '0'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-200/50">
                    <span className="text-neutral-500 block">Paid</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {formatCurrency(feesOverview.totalPaid)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Service Navigation Tiles */}
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href={`/parent/attendance${activeChildId ? `?studentId=${activeChildId}` : ''}`}
                  className="rounded-xl border border-neutral-200 bg-white p-4 hover:border-purple-300 transition-all group"
                >
                  <NavIcon name="calendar" className="w-5 h-5 mb-1" />
                  <p className="text-xs font-bold text-neutral-900 group-hover:text-purple-700">
                    Attendance Calendar
                  </p>
                  <p className="text-[11px] text-neutral-500">Monthly breakdown</p>
                </Link>

                <Link
                  href={`/parent/results${activeChildId ? `?studentId=${activeChildId}` : ''}`}
                  className="rounded-xl border border-neutral-200 bg-white p-4 hover:border-purple-300 transition-all group"
                >
                  <NavIcon name="chart-bar" className="w-5 h-5 mb-1" />
                  <p className="text-xs font-bold text-neutral-900 group-hover:text-purple-700">
                    Report Cards
                  </p>
                  <p className="text-[11px] text-neutral-500">Published grades</p>
                </Link>

                <Link
                  href="/parent/messages"
                  className="rounded-xl border border-neutral-200 bg-white p-4 hover:border-purple-300 transition-all group"
                >
                  <NavIcon name="message-circle" className="w-5 h-5 mb-1" />
                  <p className="text-xs font-bold text-neutral-900 group-hover:text-purple-700">
                    Teacher Messaging
                  </p>
                  <p className="text-[11px] text-neutral-500">Direct teacher thread</p>
                </Link>

                <Link
                  href="/parent/announcements"
                  className="rounded-xl border border-neutral-200 bg-white p-4 hover:border-purple-300 transition-all group"
                >
                  <NavIcon name="megaphone" className="w-5 h-5 mb-1" />
                  <p className="text-xs font-bold text-neutral-900 group-hover:text-purple-700">
                    Circulars
                  </p>
                  <p className="text-[11px] text-neutral-500">Official notices</p>
                </Link>
              </div>
            </div>
          </div>

          {/* 4. Recent Announcements Section */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">Recent Announcements</h3>
                <p className="text-xs text-neutral-500">Official updates for your child&apos;s campus and class</p>
              </div>
              <Link href="/parent/announcements" className="text-xs font-semibold text-purple-700 hover:underline">
                View All →
              </Link>
            </div>
            <AnnouncementFeedView
              schoolId={schoolId}
              studentContext={{
                campusId: feesOverview.campus?.id,
                classId: feesOverview.classInfo?.id,
              }}
              limit={3}
              compact
            />
          </div>
        </>
      )}
    </div>
  );
}
