'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Campus,
  Class,
  ClassAttendanceReport,
  DateRangeAttendanceReport,
  ISODate,
  Scope,
  Student,
  StudentAttendanceReport,
} from '@/types';
import {
  getClassAttendanceReport,
  getDateRangeAttendanceReport,
  getStudentAttendanceReport,
  listActiveStudents,
  listCampuses,
  listClasses,
  listUsers,
} from '@/lib/repositories';
import {
  addDays,
  downloadCSV,
  formatDate,
  generateCSV,
  toISODate,
} from '@/lib/utils';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { NavIcon } from '@/components/shell/NavIcon';

export type ReportTab = 'class' | 'student' | 'range';

export interface AttendanceReportsViewProps {
  initialScope?: Scope;
}

export function AttendanceReportsView({ initialScope }: AttendanceReportsViewProps) {
  const { showToast } = useToast();
  const today = useMemo(() => toISODate(new Date()), []);

  // Active Report Tab
  const [activeTab, setActiveTab] = useState<ReportTab>('class');

  // Date Range (default: current academic term / past 40 days to capture seed data: 2026-07-15 to today)
  const [startDate, setStartDate] = useState<ISODate>('2026-07-15');
  const [endDate, setEndDate] = useState<ISODate>(today);

  // Filter selections
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [allStudents, setAllStudents] = useState<Array<{ student: Student; name: string }>>([]);

  const [selectedCampusId, setSelectedCampusId] = useState<string>(initialScope?.campusId ?? 'all');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [studentSearch, setStudentSearch] = useState<string>('');

  // Report Data States
  const [loading, setLoading] = useState<boolean>(true);
  const [classReport, setClassReport] = useState<ClassAttendanceReport | null>(null);
  const [rangeReport, setRangeReport] = useState<DateRangeAttendanceReport | null>(null);
  const [studentReport, setStudentReport] = useState<StudentAttendanceReport | null>(null);

  // Initial lookup data load
  useEffect(() => {
    let isMounted = true;
    async function loadMeta() {
      try {
        const scope: Scope = {
          schoolId: initialScope?.schoolId ?? 'sch_main',
        };
        const [camps, clsList, stus, users] = await Promise.all([
          listCampuses(scope),
          listClasses(scope),
          listActiveStudents(scope),
          listUsers(scope),
        ]);

        if (!isMounted) return;

        setCampuses(camps);
        setClasses(clsList);

        const userMap = new Map(users.map((u) => [u.id, u.name]));
        const enrichedStudents = stus.map((s) => ({
          student: s,
          name: userMap.get(s.userId) ?? `Student ${s.admissionNumber}`,
        }));
        setAllStudents(enrichedStudents);

        if (clsList.length > 0 && !selectedClassId) {
          setSelectedClassId(clsList[0].id);
        }
        if (enrichedStudents.length > 0 && !selectedStudentId) {
          setSelectedStudentId(enrichedStudents[0].student.id);
        }
      } catch (err) {
        console.error('Failed to load report metadata:', err);
      }
    }
    loadMeta();
    return () => {
      isMounted = false;
    };
  }, [initialScope?.schoolId, selectedClassId, selectedStudentId]);

  // Load active report data when filters or tabs change
  useEffect(() => {
    let isMounted = true;

    async function fetchReport() {
      setLoading(true);
      try {
        const scope: Scope = {
          schoolId: initialScope?.schoolId ?? 'sch_main',
          campusId: selectedCampusId === 'all' ? undefined : selectedCampusId,
        };

        if (activeTab === 'class' && selectedClassId) {
          const rep = await getClassAttendanceReport(scope, selectedClassId, startDate, endDate);
          if (isMounted) setClassReport(rep);
        } else if (activeTab === 'range') {
          const rep = await getDateRangeAttendanceReport(scope, startDate, endDate);
          if (isMounted) setRangeReport(rep);
        } else if (activeTab === 'student' && selectedStudentId) {
          const rep = await getStudentAttendanceReport(scope, selectedStudentId, startDate, endDate);
          if (isMounted) setStudentReport(rep);
        }
      } catch (err) {
        console.error('Failed to fetch attendance report:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchReport();

    return () => {
      isMounted = false;
    };
  }, [
    activeTab,
    initialScope?.schoolId,
    selectedCampusId,
    selectedClassId,
    selectedStudentId,
    startDate,
    endDate,
  ]);

  // Quick Preset Handlers
  const handlePreset = (preset: 'today' | 'week' | 'month' | 'term') => {
    if (preset === 'today') {
      setStartDate(today);
      setEndDate(today);
    } else if (preset === 'week') {
      setStartDate(addDays(today, -6));
      setEndDate(today);
    } else if (preset === 'month') {
      setStartDate(addDays(today, -30));
      setEndDate(today);
    } else if (preset === 'term') {
      setStartDate('2026-07-15');
      setEndDate(today);
    }
  };

  // CSV Export Handler (RFC 4180 Compliant)
  const handleExportCSV = () => {
    if (activeTab === 'class') {
      if (!classReport || classReport.students.length === 0) {
        showToast({ title: 'No data to export', message: 'No student attendance records in range.', type: 'info' });
        return;
      }
      const headers = [
        'Roll Number',
        'Student Name',
        'Admission Number',
        'Class',
        'Campus',
        'Total Days',
        'Present',
        'Absent',
        'Late',
        'Leave',
        'Attendance Rate (%)',
      ];
      const rows = classReport.students.map((s) => [
        s.rollNumber,
        s.studentName,
        s.admissionNumber,
        `Grade ${classReport.classInfo.grade}-${classReport.classInfo.section}`,
        classReport.campusName,
        s.totalDays,
        s.presentCount,
        s.absentCount,
        s.lateCount,
        s.leaveCount,
        `${s.percentage}%`,
      ]);
      const csv = generateCSV(headers, rows);
      const filename = `attendance-class-${classReport.classInfo.grade}-${classReport.classInfo.section}-${startDate}-to-${endDate}.csv`;
      downloadCSV(filename, csv);
      showToast({ title: 'Export Successful', message: `Downloaded ${filename}`, type: 'success' });
    } else if (activeTab === 'range') {
      if (!rangeReport || rangeReport.days.length === 0) {
        showToast({ title: 'No data to export', message: 'No attendance data found in date range.', type: 'info' });
        return;
      }
      const headers = [
        'Date',
        'Day of Week',
        'Marked Classes',
        'Total Classes',
        'Total Enrolled',
        'Present',
        'Absent',
        'Late',
        'Leave',
        'Daily Attendance (%)',
      ];
      const rows = rangeReport.days.map((d) => [
        d.date,
        d.dayOfWeek,
        d.markedClasses,
        d.totalClasses,
        d.totalStudents,
        d.presentCount,
        d.absentCount,
        d.lateCount,
        d.leaveCount,
        `${d.percentage}%`,
      ]);
      const csv = generateCSV(headers, rows);
      const filename = `attendance-range-${startDate}-to-${endDate}.csv`;
      downloadCSV(filename, csv);
      showToast({ title: 'Export Successful', message: `Downloaded ${filename}`, type: 'success' });
    } else if (activeTab === 'student') {
      if (!studentReport || studentReport.history.length === 0) {
        showToast({ title: 'No data to export', message: 'No attendance records found for this student.', type: 'info' });
        return;
      }
      const headers = [
        'Date',
        'Student Name',
        'Admission Number',
        'Class',
        'Status',
        'Attendance Document ID',
        'Timestamp',
      ];
      const rows = studentReport.history.map((h) => [
        h.date,
        studentReport.userName,
        studentReport.student.admissionNumber,
        studentReport.className,
        h.status.toUpperCase(),
        h.attendanceDayId,
        h.markedAt,
      ]);
      const csv = generateCSV(headers, rows);
      const filename = `attendance-student-${studentReport.student.admissionNumber}-${startDate}-to-${endDate}.csv`;
      downloadCSV(filename, csv);
      showToast({ title: 'Export Successful', message: `Downloaded ${filename}`, type: 'success' });
    }
  };

  // Filtered Students for Student Picker
  const filteredStudentOptions = useMemo(() => {
    if (!studentSearch.trim()) return allStudents.slice(0, 50);
    const q = studentSearch.toLowerCase().trim();
    return allStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.student.admissionNumber.toLowerCase().includes(q) ||
        s.student.rollNumber.toLowerCase().includes(q)
    );
  }, [allStudents, studentSearch]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      {/* Header & Export Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-neutral-900">
              Attendance Reports
            </h1>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
              CSV Export Ready
            </span>
          </div>
          <p className="mt-1 text-sm text-neutral-600">
            Generate longitudinal attendance reports across classes, individual students, and campus ranges with RFC 4180 CSV export.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.print()}
            aria-label="Print Report"
            leftIcon={<NavIcon name="printer" className="w-3.5 h-3.5" />}
          >
            Print Report
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleExportCSV}
            aria-label="Export CSV"
            className="font-bold"
            leftIcon={<NavIcon name="file-text" className="w-3.5 h-3.5" />}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Tabs Navigation (Underline Style per UI_DESIGN_SYSTEM.md §5) */}
      <div className="flex items-center gap-8 border-b border-neutral-200 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('class')}
          className={`pb-3 border-b-2 transition-all ${
            activeTab === 'class'
              ? 'border-purple-600 text-purple-900 font-bold'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          By Class Cohort
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('range')}
          className={`pb-3 border-b-2 transition-all ${
            activeTab === 'range'
              ? 'border-purple-600 text-purple-900 font-bold'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          By Date Range Trend
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('student')}
          className={`pb-3 border-b-2 transition-all ${
            activeTab === 'student'
              ? 'border-purple-600 text-purple-900 font-bold'
              : 'border-transparent text-neutral-500 hover:text-neutral-800'
          }`}
        >
          By Individual Student
        </button>
      </div>

      {/* Controls & Date Filter Card */}
      <div className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-neutral-50/70 p-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-semibold text-neutral-600 mr-1">Quick Presets:</span>
            <button
              type="button"
              onClick={() => handlePreset('today')}
              className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-neutral-700 hover:bg-neutral-100 font-medium"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handlePreset('week')}
              className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-neutral-700 hover:bg-neutral-100 font-medium"
            >
              Past 7 Days
            </button>
            <button
              type="button"
              onClick={() => handlePreset('month')}
              className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-neutral-700 hover:bg-neutral-100 font-medium"
            >
              Past 30 Days
            </button>
            <button
              type="button"
              onClick={() => handlePreset('term')}
              className="rounded-md border border-purple-200 bg-purple-50 px-2.5 py-1 text-purple-800 hover:bg-purple-100 font-bold"
            >
              Academic Term (40d)
            </button>
          </div>

          {/* Date Pickers */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <label htmlFor="rep-start-date" className="font-medium text-neutral-600">
                From:
              </label>
              <input
                id="rep-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-800 shadow-2xs"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label htmlFor="rep-end-date" className="font-medium text-neutral-600">
                To:
              </label>
              <input
                id="rep-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-800 shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* Dynamic Secondary Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-neutral-200/80">
          {/* Campus Selector */}
          {campuses.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-neutral-600">Campus:</span>
              <select
                value={selectedCampusId}
                onChange={(e) => setSelectedCampusId(e.target.value)}
                className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-800 shadow-2xs"
                aria-label="Filter by Campus"
              >
                <option value="all">All Campuses</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* By Class: Class selector */}
          {activeTab === 'class' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-neutral-600">Class Cohort:</span>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-bold text-neutral-800 shadow-2xs"
                aria-label="Select Class"
              >
                {classes
                  .filter((c) => selectedCampusId === 'all' || c.campusId === selectedCampusId)
                  .map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      Grade {cls.grade}-{cls.section}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* By Student: Student Search and Selector */}
          {activeTab === 'student' && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-neutral-600">Student:</span>
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search by name or admission #..."
                className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs text-neutral-800 shadow-2xs min-w-[200px]"
              />
              <select
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-800 shadow-2xs max-w-[260px]"
                aria-label="Select Student"
              >
                {filteredStudentOptions.map(({ student, name }) => (
                  <option key={student.id} value={student.id}>
                    {name} ({student.admissionNumber})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Sections based on activeTab */}
      {loading ? (
        <div className="flex flex-col gap-4">
          <SkeletonCard />
          <SkeletonTable rows={8} />
        </div>
      ) : activeTab === 'class' ? (
        /* TAB 1: BY CLASS REPORT */
        classReport ? (
          <div className="flex flex-col gap-6">
            {/* StatCards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="Class Attendance Rate"
                value={`${classReport.averagePercentage}%`}
                subtitle={`Across ${classReport.totalInstructionalDays} instructional days`}
              />
              <StatCard
                label="Enrolled Students"
                value={classReport.totalStudents}
                subtitle={`Grade ${classReport.classInfo.grade}-${classReport.classInfo.section}`}
              />
              <StatCard
                label="Total Absences Recorded"
                value={classReport.totalAbsent}
                subtitle="Student-days absent"
              />
              <StatCard
                label="Total Present Days"
                value={classReport.totalPresent}
                subtitle="Student-days attended"
              />
            </div>

            {/* Roster Table */}
            <div className="overflow-x-auto overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xs">
              <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-3">
                <span className="font-bold text-sm text-neutral-900">
                  Student Roster Attendance Breakdown ({formatDate(startDate, 'short')} – {formatDate(endDate, 'short')})
                </span>
                <span className="text-xs text-neutral-500 font-medium">
                  {classReport.students.length} Students
                </span>
              </div>
              <table className="w-full border-collapse text-left text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-100/75 text-xs font-bold text-neutral-700">
                  <tr>
                    <th className="px-4 py-2.5">Roll #</th>
                    <th className="px-4 py-2.5">Student Name</th>
                    <th className="px-4 py-2.5">Admission #</th>
                    <th className="px-4 py-2.5 text-center">Total Days</th>
                    <th className="px-4 py-2.5 text-center text-emerald-700">Present</th>
                    <th className="px-4 py-2.5 text-center text-rose-700">Absent</th>
                    <th className="px-4 py-2.5 text-center text-amber-700">Late</th>
                    <th className="px-4 py-2.5 text-center text-indigo-700">Leave</th>
                    <th className="px-4 py-2.5 text-right">Attendance Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-xs">
                  {classReport.students.map((stu) => (
                    <tr key={stu.studentId} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="px-4 py-2.5 font-bold text-neutral-900">{stu.rollNumber}</td>
                      <td className="px-4 py-2.5 font-medium text-neutral-900">{stu.studentName}</td>
                      <td className="px-4 py-2.5 font-mono text-neutral-600">{stu.admissionNumber}</td>
                      <td className="px-4 py-2.5 text-center font-mono">{stu.totalDays}</td>
                      <td className="px-4 py-2.5 text-center font-mono font-semibold text-emerald-800 bg-emerald-50/30">
                        {stu.presentCount}
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono font-semibold text-rose-800 bg-rose-50/30">
                        {stu.absentCount}
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono text-amber-800">{stu.lateCount}</td>
                      <td className="px-4 py-2.5 text-center font-mono text-indigo-800">{stu.leaveCount}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                            stu.percentage >= 85
                              ? 'bg-emerald-100 text-emerald-800'
                              : stu.percentage >= 75
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-rose-100 text-rose-900'
                          }`}
                        >
                          {stu.percentage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState
            title="No class data available"
            description="No attendance registers recorded for this class cohort in the selected date range."
          />
        )
      ) : activeTab === 'range' ? (
        /* TAB 2: DATE RANGE TREND REPORT */
        rangeReport ? (
          <div className="flex flex-col gap-6">
            {/* StatCards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="Overall Attendance Rate"
                value={`${rangeReport.averagePercentage}%`}
                subtitle="School-wide aggregate"
              />
              <StatCard
                label="Instructional Days"
                value={rangeReport.totalInstructionalDays}
                subtitle={`${formatDate(startDate, 'short')} – ${formatDate(endDate, 'short')}`}
              />
              <StatCard
                label="Total Absences Recorded"
                value={rangeReport.totalAbsent}
                subtitle="Student-days"
              />
              <StatCard
                label="Total Present Days"
                value={rangeReport.totalPresent}
                subtitle="Student-days"
              />
            </div>

            {/* Daily Trend Table */}
            <div className="overflow-x-auto overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xs">
              <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-3">
                <span className="font-bold text-sm text-neutral-900">
                  Daily School Attendance Log ({formatDate(startDate, 'short')} – {formatDate(endDate, 'short')})
                </span>
                <span className="text-xs text-neutral-500 font-medium">
                  {rangeReport.days.length} Recorded Days
                </span>
              </div>
              <table className="w-full border-collapse text-left text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-100/75 text-xs font-bold text-neutral-700">
                  <tr>
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Day</th>
                    <th className="px-4 py-2.5 text-center">Registers Marked</th>
                    <th className="px-4 py-2.5 text-center">Enrolled in Marked</th>
                    <th className="px-4 py-2.5 text-center text-emerald-700">Present</th>
                    <th className="px-4 py-2.5 text-center text-rose-700">Absent</th>
                    <th className="px-4 py-2.5 text-center text-amber-700">Late</th>
                    <th className="px-4 py-2.5 text-center text-indigo-700">Leave</th>
                    <th className="px-4 py-2.5 text-right">Daily Presence %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-xs">
                  {rangeReport.days.map((day) => (
                    <tr key={day.date} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="px-4 py-2.5 font-bold text-neutral-900">{day.date}</td>
                      <td className="px-4 py-2.5 text-neutral-600">{day.dayOfWeek}</td>
                      <td className="px-4 py-2.5 text-center font-mono">
                        {day.markedClasses} / {day.totalClasses}
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono">{day.totalStudents}</td>
                      <td className="px-4 py-2.5 text-center font-mono font-semibold text-emerald-800">
                        {day.presentCount}
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono font-semibold text-rose-800">
                        {day.absentCount}
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono text-amber-800">{day.lateCount}</td>
                      <td className="px-4 py-2.5 text-center font-mono text-indigo-800">{day.leaveCount}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs ${
                            day.percentage >= 90
                              ? 'bg-emerald-100 text-emerald-800'
                              : day.percentage >= 80
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-rose-100 text-rose-900'
                          }`}
                        >
                          {day.percentage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState
            title="No range records found"
            description="No attendance registers recorded across the school in this date window."
          />
        )
      ) : (
        /* TAB 3: BY STUDENT REPORT */
        studentReport ? (
          <div className="flex flex-col gap-6">
            {/* Student Header Card */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold text-neutral-900">
                    {studentReport.userName}
                  </h2>
                  <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-mono font-bold text-neutral-700 border border-neutral-200">
                    Adm: {studentReport.student.admissionNumber}
                  </span>
                  <span className="rounded bg-purple-50 px-2 py-0.5 text-xs font-bold text-purple-700 border border-purple-200">
                    Roll #{studentReport.student.rollNumber}
                  </span>
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  {studentReport.className} · {studentReport.campusName} · Status: {studentReport.student.status.toUpperCase()}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end">
                  <span className="text-xs text-neutral-500 font-medium">Overall Attendance Rate</span>
                  <span className="text-2xl font-black font-mono text-emerald-700">
                    {studentReport.stats.percentage}%
                  </span>
                </div>
              </div>
            </div>

            {/* StatCards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="Days Attended (Present)"
                value={studentReport.stats.presentCount}
                subtitle={`Of ${studentReport.stats.totalDays} total instructional days`}
              />
              <StatCard
                label="Days Absent"
                value={studentReport.stats.absentCount}
                subtitle="Full days missed"
              />
              <StatCard
                label="Days Late"
                value={studentReport.stats.lateCount}
                subtitle="Arrived after morning bell"
              />
              <StatCard
                label="Approved Leave"
                value={studentReport.stats.leaveCount}
                subtitle="Medical / excused leave"
              />
            </div>

            {/* Daily History Table */}
            <div className="overflow-x-auto overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xs">
              <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-4 py-3">
                <span className="font-bold text-sm text-neutral-900">
                  Chronological Daily Attendance History ({formatDate(startDate, 'short')} – {formatDate(endDate, 'short')})
                </span>
                <span className="text-xs text-neutral-500 font-medium">
                  {studentReport.history.length} Entries
                </span>
              </div>
              <table className="w-full border-collapse text-left text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-100/75 text-xs font-bold text-neutral-700">
                  <tr>
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">Status</th>
                    <th className="px-4 py-2.5">Document ID</th>
                    <th className="px-4 py-2.5 text-right">Recorded Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 text-xs">
                  {studentReport.history.map((h) => (
                    <tr key={`${h.date}_${h.attendanceDayId}`} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="px-4 py-2.5 font-bold text-neutral-900">{h.date}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            h.status === 'present'
                              ? 'bg-emerald-100 text-emerald-800'
                              : h.status === 'absent'
                              ? 'bg-rose-100 text-rose-800'
                              : h.status === 'late'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {h.status === 'present' && '✓'}
                          {h.status === 'absent' && '✕'}
                          {h.status === 'late' && '⏱'}
                          {h.status === 'leave' && <NavIcon name="clipboard" className="w-3 h-3" />}
                          {h.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-neutral-500">{h.attendanceDayId}</td>
                      <td className="px-4 py-2.5 text-right text-neutral-500 font-mono">
                        {h.markedAt ? h.markedAt.slice(0, 19).replace('T', ' ') : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState
            title="No student record selected"
            description="Select a student from the picker above to inspect their longitudinal attendance history."
          />
        )
      )}
    </div>
  );
}
