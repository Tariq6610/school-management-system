'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  SchoolAdminDashboardData,
  getSchoolAdminDashboardStats,
} from '@/lib/repositories/schoolAdminDashboard';
import { Button } from '@/components/ui/Button';

export interface PrincipalDashboardViewProps {
  schoolId?: string;
  campusId?: string;
  initialData?: SchoolAdminDashboardData;
}

export function PrincipalDashboardView({
  schoolId = 'sch_main',
  campusId = 'cmp_main',
  initialData,
}: PrincipalDashboardViewProps = {}) {
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
        console.error('Failed to load principal dashboard stats:', err);
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
      <div className="p-8 text-center text-gray-500">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent mb-2" />
        <p className="text-sm">Loading principal dashboard for campus...</p>
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
    classesCount,
  } = data;

  const malePercent =
    activeStudents > 0 ? Math.round((studentsByGender.male / activeStudents) * 100) : 50;
  const femalePercent = 100 - malePercent;

  return (
    <div className="space-y-8 pb-12">
      {/* Principal Header & Campus Jurisdiction Pill */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Principal Dashboard
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
              {campusName}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
              Own Campus Only
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Campus-scoped administrative control • Academic Session 2026–2027
          </p>
        </div>

        {/* Quick Actions for Principal */}
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/principal/attendance">
            <Button variant="primary" size="sm">
              Campus Attendance
            </Button>
          </Link>
          <Link href="/principal/announcements">
            <Button variant="secondary" size="sm">
              Post Announcement
            </Button>
          </Link>
          <Link href="/principal/messages">
            <Button variant="secondary" size="sm">
              Messages
            </Button>
          </Link>
        </div>
      </div>

      {/* Scope Security Alert Banner */}
      <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900">
        <div className="flex items-center gap-2">
          <span className="text-base">🛡️</span>
          <span>
            <strong>Campus Isolation Active:</strong> All metrics, rosters, attendance registers, and exams reflect <strong>{campusName}</strong> only.
          </span>
        </div>
        <span className="text-blue-700 font-medium hidden sm:inline">
          {classesCount} Classes Scoped
        </span>
      </div>

      {/* Four Campus-Scoped Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Campus Students */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Campus Students
            </span>
            <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
              Active
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-gray-900 tabular-nums">
              {activeStudents}
            </span>
            <span className="text-xs text-gray-400">/ {totalStudents} total</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
            <span>+{newAdmissionsThisMonth} this month</span>
            <span>Ratio {studentTeacherRatio}:1</span>
          </div>
        </div>

        {/* Metric 2: Today's Campus Attendance */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Today&apos;s Attendance
            </span>
            <Link href="/principal/attendance" className="text-xs text-emerald-600 hover:underline font-medium">
              Details →
            </Link>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-emerald-600 tabular-nums">
              {todayAttendance.attendancePercentage.toFixed(1)}%
            </span>
            <span className="text-xs text-gray-500">present</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
            <span>{todayAttendance.markedClassesCount} of {todayAttendance.totalClasses} marked</span>
            {todayAttendance.absentCount > 0 && (
              <span className="text-red-600 font-semibold">{todayAttendance.absentCount} absent</span>
            )}
          </div>
        </div>

        {/* Metric 3: Campus Fee Collection */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Fee Efficiency
            </span>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              {pendingFees.collectionRate}%
            </span>
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-xs text-gray-400 font-semibold">PKR</span>
            <span className="text-2xl font-extrabold text-blue-700 tabular-nums">
              {pendingFees.totalCollected.toLocaleString('en-PK')}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
            <span>Pending: PKR {pendingFees.pendingAmount.toLocaleString('en-PK')}</span>
          </div>
        </div>

        {/* Metric 4: Campus Assessments */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs hover:border-emerald-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Campus Exams
            </span>
            <span className="text-xs text-purple-700 font-bold bg-purple-50 px-2 py-0.5 rounded">
              {upcomingExams.length} Total
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-purple-700 tabular-nums">
              {upcomingExams.filter((e) => e.status === 'published').length}
            </span>
            <span className="text-xs text-gray-500">published results</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
            <span>Next: {upcomingExams[0]?.date || 'None'}</span>
            <span className="text-gray-400">Class terms</span>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Register Monitoring & Unmarked Warning */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Campus Daily Registers
                </h3>
                <p className="text-xs text-gray-500">
                  Attendance records for {campusName} ({todayAttendance.date})
                </p>
              </div>
              <Link href="/principal/attendance">
                <Button variant="secondary" size="sm">
                  View Campus Register →
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

            {/* Unmarked registers notice for principal */}
            {todayAttendance.unmarkedClassesCount > 0 ? (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-amber-800 font-bold text-sm">
                    ⚠️ {todayAttendance.unmarkedClassesCount} Class Registers Pending
                  </span>
                </div>
                <div className="divide-y divide-amber-200/60 max-h-40 overflow-y-auto">
                  {todayAttendance.unmarkedClasses.map((u) => (
                    <div key={u.classId} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-gray-900">{u.className}</span>
                        <span className="text-gray-500 ml-2">Teacher: {u.teacherName}</span>
                      </div>
                      <Link href={`/principal/attendance`}>
                        <span className="text-emerald-700 hover:underline font-medium">
                          Follow Up →
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
                  <p className="text-sm font-semibold text-emerald-900">All campus registers submitted</p>
                  <p className="text-xs text-emerald-700">100% register submission achieved for {campusName} today.</p>
                </div>
              </div>
            )}
          </div>

          {/* Campus Demographics */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-1">
              Campus Student Distribution
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Gender balance across enrolled sections at {campusName}
            </p>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs font-semibold mb-1">
                  <span className="text-gray-700">Gender Ratio</span>
                  <span className="text-gray-500">{malePercent}% Male • {femalePercent}% Female</span>
                </div>
                <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden flex">
                  <div className="bg-blue-500 h-full" style={{ width: `${malePercent}%` }} />
                  <div className="bg-pink-500 h-full" style={{ width: `${femalePercent}%` }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-100 text-xs">
                <div className="p-3 rounded-lg bg-gray-50">
                  <span className="text-gray-400 block">Campus Faculty</span>
                  <span className="text-lg font-bold text-gray-900">{totalTeachers} Teachers</span>
                </div>
                <div className="p-3 rounded-lg bg-gray-50">
                  <span className="text-gray-400 block">Campus Staff Ratio</span>
                  <span className="text-lg font-bold text-gray-900">{studentTeacherRatio} : 1</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Campus Exams & Collections */}
        <div className="space-y-6">
          {/* Campus Upcoming Exams */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Campus Exam Assessments
                </h3>
                <p className="text-xs text-gray-500">
                  Scheduled exams for {campusName}
                </p>
              </div>
              <span className="text-xs text-purple-700 font-semibold">
                {upcomingExams.length} Exams
              </span>
            </div>

            {upcomingExams.length === 0 ? (
              <p className="py-8 text-center text-xs text-gray-400">
                No examinations scheduled for this campus yet.
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
                          {ex.status === 'published' ? 'Published' : 'Draft / Open'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {ex.subjectName} • {ex.className}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-gray-800 block">
                        {ex.date}
                      </span>
                      <span className="text-[11px] text-gray-400 block">
                        Max: {ex.maxMarks} marks
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Campus Financial Overview */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Campus Fee Recovery
                </h3>
                <p className="text-xs text-gray-500">
                  Invoiced fee collections for {campusName}
                </p>
              </div>
              <span className="text-xs font-bold text-blue-700">
                {pendingFees.collectionRate}% Recovered
              </span>
            </div>

            <div className="my-4">
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, pendingFees.collectionRate)}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-gray-100 text-xs">
                <div>
                  <span className="text-gray-400 block">Campus Billed</span>
                  <span className="font-bold text-gray-800">
                    PKR {pendingFees.totalBilled.toLocaleString('en-PK')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block">Collected</span>
                  <span className="font-bold text-emerald-600">
                    PKR {pendingFees.totalCollected.toLocaleString('en-PK')}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block">Pending</span>
                  <span className="font-bold text-red-600">
                    PKR {pendingFees.pendingAmount.toLocaleString('en-PK')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
