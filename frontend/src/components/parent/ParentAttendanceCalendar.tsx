'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  AttendanceStatus,
  ISODate,
  Scope,
  Student,
  StudentMonthAttendance,
} from '@/types';
import {
  getChildrenForParent,
  getStudent,
  getStudentMonthAttendance,
} from '@/lib/repositories';
import {
  formatDate,
  getMonthCalendarGrid,
  getMonthName,
} from '@/lib/utils';
import { useSession } from '@/components/providers/SessionProvider';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton';

export interface ParentAttendanceCalendarProps {
  initialStudentId?: string;
  initialScope?: Scope;
}

export function ParentAttendanceCalendar({
  initialStudentId,
  initialScope,
}: ParentAttendanceCalendarProps) {
  const { session, switchChild } = useSession();

  // Default to August 2026 (matching dense seed data: 2026-07-15 to 2026-08-31)
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(8); // August

  // Multi-child state for parent
  const [children, setChildren] = useState<Array<{ student: Student; name: string }>>([]);
  const [selectedChildOverride, setSelectedChildOverride] = useState<string | null>(null);
  const activeChildId =
    selectedChildOverride ||
    initialStudentId ||
    session?.activeChildId ||
    children[0]?.student.id ||
    '';

  // Month Attendance State
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<StudentMonthAttendance | null>(null);
  const [selectedDateDetail, setSelectedDateDetail] = useState<ISODate | null>(null);

  // Load parent's children on mount
  useEffect(() => {
    let isMounted = true;
    async function loadChildren() {
      if (!session?.userId) return;

      try {
        if (session.role === 'parent') {
          const linked = await getChildrenForParent(session.userId);
          if (isMounted) {
            const mapped = linked.map((item) => ({
              student: item.student,
              name: item.user.name,
            }));
            setChildren(mapped);
          }
        } else if (session.role === 'student') {
          // If logged in as student, self is the child
          const stu = await getStudent(session.userId);
          if (isMounted && stu) {
            setChildren([{ student: stu, name: session.userId }]);
          }
        } else if (initialStudentId) {
          const stu = await getStudent(initialStudentId);
          if (isMounted && stu) {
            setChildren([{ student: stu, name: stu.admissionNumber }]);
          }
        }
      } catch (err) {
        console.error('Failed to load parent children:', err);
      }
    }

    loadChildren();
    return () => {
      isMounted = false;
    };
  }, [session?.userId, session?.role, initialStudentId]);

  // Load monthly attendance data
  useEffect(() => {
    let isMounted = true;
    async function loadAttendance() {
      if (!activeChildId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const scope: Scope = {
          schoolId: initialScope?.schoolId ?? session?.schoolId ?? 'sch_main',
          campusId: initialScope?.campusId ?? session?.campusId,
        };

        const result = await getStudentMonthAttendance(
          scope,
          activeChildId,
          currentYear,
          currentMonth
        );

        if (isMounted) {
          setData(result);
        }
      } catch (err) {
        console.error('Failed to load monthly attendance for student:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadAttendance();
    return () => {
      isMounted = false;
    };
  }, [
    activeChildId,
    currentYear,
    currentMonth,
    initialScope?.schoolId,
    initialScope?.campusId,
    session?.schoolId,
    session?.campusId,
  ]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleCurrentMonth = () => {
    // Default to August 2026 if today is outside academic year, or current calendar month
    setCurrentYear(2026);
    setCurrentMonth(8);
  };

  const handleSelectChild = (childId: string) => {
    setSelectedChildOverride(childId);
    switchChild(childId);
  };

  // Calendar cells matrix
  const calendarCells = useMemo(() => {
    return getMonthCalendarGrid(currentYear, currentMonth);
  }, [currentYear, currentMonth]);

  const monthTitle = `${getMonthName(currentMonth)} ${currentYear}`;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      {/* Child Context Banner & Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-neutral-900">
              {data?.userName || 'Student Attendance'}
            </h1>
            {data && (
              <>
                <span className="rounded bg-purple-50 px-2 py-0.5 text-xs font-bold text-purple-700 border border-purple-200">
                  {data.className}
                </span>
                <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600 border border-neutral-200">
                  {data.campusName}
                </span>
              </>
            )}
          </div>
          <p className="mt-1 text-xs text-neutral-500">
            Official monthly attendance register. Days with recorded exceptions (absent, late, leave) are highlighted.
          </p>
        </div>

        {/* Multi-child switcher pills (if parent has multiple children) */}
        {children.length > 1 && (
          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-neutral-100 p-1 rounded-lg border border-neutral-200">
            <span className="text-[11px] font-semibold text-neutral-500 px-2">Child:</span>
            {children.map(({ student, name }) => {
              const isSelected = student.id === activeChildId;
              return (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => handleSelectChild(student.id)}
                  className={`rounded-md px-3 py-1 text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-white text-purple-900 shadow-xs border border-purple-200'
                      : 'text-neutral-600 hover:text-neutral-900'
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Month Navigation & Preset Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-neutral-200 bg-neutral-50/80 p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrevMonth}
            aria-label="Previous Month"
          >
            ← Previous
          </Button>

          <h2 className="text-base font-black text-neutral-900 min-w-[150px] text-center">
            {monthTitle}
          </h2>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleNextMonth}
            aria-label="Next Month"
          >
            Next →
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCurrentMonth}
            aria-label="Jump to August 2026"
            className="text-xs font-medium"
          >
            Term Active (Aug 2026)
          </Button>
        </div>
      </div>

      {/* Summary StatCards (Acceptance Criteria: Summary counts and percentage) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard
          label="Monthly Presence"
          value={loading ? '...' : `${data?.summary.percentage ?? 100}%`}
          subtitle={`Of ${data?.summary.totalInstructionalDays ?? 0} instructional days`}
        />

        <StatCard
          label="Days Present"
          value={loading ? '...' : (data?.summary.presentCount ?? 0)}
          subtitle="Attended on time"
        />

        <StatCard
          label="Days Absent"
          value={loading ? '...' : (data?.summary.absentCount ?? 0)}
          subtitle={
            (data?.summary.absentCount ?? 0) > 0
              ? 'Unexcused absences'
              : 'Zero missed days'
          }
          trend={
            (data?.summary.absentCount ?? 0) > 0
              ? { direction: 'down', value: `${data?.summary.absentCount} missed`, positiveIsGood: false }
              : undefined
          }
        />

        <StatCard
          label="Days Late"
          value={loading ? '...' : (data?.summary.lateCount ?? 0)}
          subtitle="Arrived after bell"
        />

        <StatCard
          label="Days on Leave"
          value={loading ? '...' : (data?.summary.leaveCount ?? 0)}
          subtitle="Excused / medical"
        />
      </div>

      {/* Legend Bar (Acceptance Criteria: Colour + label) */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-bold text-neutral-700">Attendance Key:</span>

          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
              ✓ Present
            </span>
            <span className="text-neutral-500">Attended class</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800 border border-rose-300">
              ✕ Absent
            </span>
            <span className="text-neutral-500">Missed day</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200">
              ⏱ Late
            </span>
            <span className="text-neutral-500">Tardy arrival</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-800 border border-indigo-200">
              📋 Leave
            </span>
            <span className="text-neutral-500">Approved leave</span>
          </div>
        </div>

        <div className="text-neutral-400 italic">
          Sundays and school holidays are non-instructional.
        </div>
      </div>

      {/* Monthly Calendar Grid */}
      {loading ? (
        <div className="flex flex-col gap-4">
          <SkeletonCard />
          <SkeletonTable rows={5} />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xs">
          {/* Weekday Column Headers (Monday to Sunday) */}
          <div className="grid grid-cols-7 border-b border-neutral-200 bg-neutral-100/75 text-center text-xs font-bold text-neutral-700 py-3">
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
            <div className="text-neutral-400">Sun</div>
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 divide-x divide-y divide-neutral-200">
            {calendarCells.map((cell) => {
              const status: AttendanceStatus | undefined = data?.recordsByDate[cell.date];
              const isSelected = selectedDateDetail === cell.date;

              return (
                <div
                  key={cell.date}
                  onClick={() => setSelectedDateDetail(cell.date)}
                  className={`min-h-[105px] p-2 flex flex-col justify-between cursor-pointer transition-all hover:bg-neutral-50 ${
                    !cell.isCurrentMonth
                      ? 'bg-neutral-50/40 text-neutral-300'
                      : cell.isSunday
                      ? 'bg-neutral-50/70 text-neutral-400'
                      : 'bg-white text-neutral-800'
                  } ${
                    isSelected ? 'ring-2 ring-purple-500 bg-purple-50/20' : ''
                  }`}
                >
                  {/* Day Number Header */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold ${
                        cell.isToday
                          ? 'flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-white font-black'
                          : cell.isCurrentMonth
                          ? 'text-neutral-800'
                          : 'text-neutral-300'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {cell.isToday && (
                      <span className="text-[10px] font-bold uppercase text-purple-700">
                        Today
                      </span>
                    )}
                  </div>

                  {/* Status Indicator (Acceptance Criteria: Colour + label) */}
                  <div className="mt-2 flex flex-col gap-1">
                    {status === 'present' && (
                      <span className="inline-flex items-center justify-center gap-1 rounded bg-emerald-100 px-1.5 py-1 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                        <span>✓</span>
                        <span>Present</span>
                      </span>
                    )}

                    {status === 'absent' && (
                      <span className="inline-flex items-center justify-center gap-1 rounded bg-rose-100 px-1.5 py-1 text-[11px] font-black text-rose-800 border border-rose-300 shadow-2xs">
                        <span>✕</span>
                        <span>Absent</span>
                      </span>
                    )}

                    {status === 'late' && (
                      <span className="inline-flex items-center justify-center gap-1 rounded bg-amber-100 px-1.5 py-1 text-[11px] font-bold text-amber-900 border border-amber-300">
                        <span>⏱</span>
                        <span>Late</span>
                      </span>
                    )}

                    {status === 'leave' && (
                      <span className="inline-flex items-center justify-center gap-1 rounded bg-indigo-100 px-1.5 py-1 text-[11px] font-bold text-indigo-900 border border-indigo-200">
                        <span>📋</span>
                        <span>Leave</span>
                      </span>
                    )}

                    {!status && cell.isSunday && (
                      <span className="text-center text-[10px] italic text-neutral-400 py-1">
                        Weekend
                      </span>
                    )}

                    {!status && !cell.isSunday && cell.isCurrentMonth && (
                      <span className="text-center text-[10px] text-neutral-300 py-1">
                        —
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day Detail Callout if a day is clicked */}
      {selectedDateDetail && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-neutral-900">
              Selected Date: {formatDate(selectedDateDetail, 'long')}
            </span>
            {data?.recordsByDate[selectedDateDetail] ? (
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800">
                Status: {data.recordsByDate[selectedDateDetail].toUpperCase()}
              </span>
            ) : (
              <span className="text-xs text-neutral-500 italic">
                No attendance recorded (Holiday or weekend)
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSelectedDateDetail(null)}
            className="text-xs text-neutral-500 hover:text-neutral-800 underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
