'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  AttendanceDay,
  AttendanceSummary,
  Campus,
  Class,
  DayOfWeek,
  ID,
  ISODate,
  Scope,
  Subject,
  Teacher,
  TimetableSlot,
  User,
} from '@/types';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import {
  getAttendanceByClassAndDate,
  calculateClassDaySummary,
} from '@/lib/repositories/attendance';
import {
  getTeacher,
  getTeacherByUserId,
  listTeachers,
  getTeacherAssignedClasses,
  getTeacherSchedule,
} from '@/lib/repositories/teachers';
import { listCampuses } from '@/lib/repositories/campuses';
import { listStudents } from '@/lib/repositories/students';
import { listSubjects } from '@/lib/repositories/subjects';
import { getUser } from '@/lib/repositories/users';
import { toISODate, formatDate } from '@/lib/utils';
import { ClassAttendanceCard } from './ClassAttendanceCard';

export interface EnrichedClassItem {
  classInfo: Class;
  isClassTeacher: boolean;
  subjectCount: number;
  studentCount: number;
  campusName: string;
  isMarked: boolean;
  attendanceDay?: AttendanceDay;
  summary?: AttendanceSummary;
}

export interface EnrichedScheduleSlot {
  slot: TimetableSlot;
  subjectName: string;
  className: string;
  roomNumber: string;
}

export interface TeacherDashboardViewProps {
  initialDate?: ISODate;
}

export function TeacherDashboardView({ initialDate }: TeacherDashboardViewProps) {
  const { session } = useSession();
  const { showToast } = useToast();

  const [selectedDate, setSelectedDate] = useState<ISODate>(() => initialDate || toISODate(new Date()));
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [teacherUser, setTeacherUser] = useState<User | null>(null);
  const [classesList, setClassesList] = useState<EnrichedClassItem[]>([]);
  const [scheduleSlots, setScheduleSlots] = useState<EnrichedScheduleSlot[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unmarked' | 'marked'>('all');
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    try {
      // 1. Resolve Teacher record
      let activeTeacher: Teacher | null = null;
      if (session?.userId) {
        activeTeacher = await getTeacherByUserId(session.userId);
      }
      if (!activeTeacher) {
        // Fallback to default demo teacher tch_sana or first available
        activeTeacher = await getTeacher('tch_sana');
        if (!activeTeacher) {
          const allT = await listTeachers({ schoolId: 'sch_main' });
          activeTeacher = allT[0] ?? null;
        }
      }

      setTeacher(activeTeacher);
      if (activeTeacher) {
        const u = await getUser(activeTeacher.userId);
        setTeacherUser(u);
      }

      if (!activeTeacher) {
        setIsLoading(false);
        return;
      }

      const effectiveSchoolId = session?.schoolId || activeTeacher.schoolId || 'sch_main';
      const scope: Scope = { schoolId: effectiveSchoolId };

      // 2. Fetch campuses, students, subjects, and assigned classes
      const [campuses, rawStudents, assignedClasses, rawSchedule, allSubjects] = await Promise.all([
        listCampuses(scope),
        listStudents(scope, { status: 'active' }),
        getTeacherAssignedClasses(activeTeacher.id, scope),
        getTeacherSchedule(activeTeacher.id, scope),
        listSubjects(scope),
      ]);

      const campusMap = new Map<ID, Campus>();
      campuses.forEach((c) => campusMap.set(c.id, c));

      const subjectMap = new Map<ID, Subject>();
      allSubjects.forEach((s) => subjectMap.set(s.id, s));

      // 3. For each assigned class, resolve student count and attendance status for selectedDate
      const enrichedClasses: EnrichedClassItem[] = await Promise.all(
        assignedClasses.map(async (item) => {
          const cls = item.classInfo;
          const campus = campusMap.get(cls.campusId);
          const campusName = campus?.name || 'Main Campus';

          // Count active students in class
          const count = rawStudents.filter((s) => s.classId === cls.id).length;

          // Attendance for selectedDate
          const att = await getAttendanceByClassAndDate(
            { schoolId: effectiveSchoolId, campusId: cls.campusId, classId: cls.id },
            cls.id,
            selectedDate
          );

          const isMarked = Boolean(att);
          const summary = att ? calculateClassDaySummary(att) : undefined;

          return {
            classInfo: cls,
            isClassTeacher: item.isClassTeacher,
            subjectCount: item.subjectCount,
            studentCount: count,
            campusName,
            isMarked,
            attendanceDay: att ?? undefined,
            summary,
          };
        })
      );

      // Sort: Unmarked classes first, then by Homeroom class teacher, then grade
      enrichedClasses.sort((a, b) => {
        if (!a.isMarked && b.isMarked) return -1;
        if (a.isMarked && !b.isMarked) return 1;
        if (a.isClassTeacher && !b.isClassTeacher) return -1;
        if (!a.isClassTeacher && b.isClassTeacher) return 1;
        return a.classInfo.grade.localeCompare(b.classInfo.grade);
      });

      setClassesList(enrichedClasses);

      // 4. Resolve today's timetable slots for teacher
      const jsDay = new Date(selectedDate).getDay();
      // 1 to 6 (Monday to Saturday); if 0 (Sunday), default to 1 (Monday)
      const currentDayOfWeek = (jsDay === 0 ? 1 : jsDay) as DayOfWeek;

      const todaySlots = rawSchedule.filter((slot) => slot.dayOfWeek === currentDayOfWeek);
      todaySlots.sort((a, b) => a.period - b.period);

      const enrichedSlots: EnrichedScheduleSlot[] = todaySlots.map((slot) => {
        const sub = subjectMap.get(slot.subjectId);
        const targetClass = assignedClasses.find((c) => c.classInfo.id === slot.classId);
        const className = targetClass ? `Grade ${targetClass.classInfo.grade}-${targetClass.classInfo.section}` : 'Class';
        return {
          slot,
          subjectName: sub?.name || 'Subject',
          className,
          roomNumber: slot.room || targetClass?.classInfo.room || 'Room',
        };
      });

      setScheduleSlots(enrichedSlots);
    } catch (err) {
      console.error('Failed to load teacher dashboard:', err);
      showToast({
        type: 'error',
        title: 'Dashboard error',
        message: 'Could not load your classes and schedule.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [session, selectedDate, showToast]);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) loadDashboardData();
    });
    return () => {
      ignore = true;
    };
  }, [loadDashboardData]);

  // Derived Metrics
  const { unmarkedClasses, markedClasses, totalStudentsCount, averagePercentage } = useMemo(() => {
    const unmarked = classesList.filter((c) => !c.isMarked);
    const marked = classesList.filter((c) => c.isMarked);

    const totalStudents = classesList.reduce((acc, c) => acc + c.studentCount, 0);

    let totalPct = 0;
    let countWithPct = 0;
    for (const m of marked) {
      if (m.summary) {
        totalPct += m.summary.percentage;
        countWithPct++;
      }
    }
    const avgPct = countWithPct > 0 ? Math.round((totalPct / countWithPct) * 10) / 10 : 0;

    return {
      unmarkedClasses: unmarked,
      markedClasses: marked,
      totalStudentsCount: totalStudents,
      averagePercentage: avgPct,
    };
  }, [classesList]);

  // Filtered classes by active tab
  const displayedClasses = useMemo(() => {
    if (activeFilter === 'unmarked') return unmarkedClasses;
    if (activeFilter === 'marked') return markedClasses;
    return classesList;
  }, [activeFilter, unmarkedClasses, markedClasses, classesList]);

  // Date handlers
  const handleDateStep = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(toISODate(d));
  };

  if (isLoading) {
    return (
      <div className="py-20 text-center text-ink-500">
        <p className="text-sm">Loading your teacher dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Top Welcome & Date Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white border border-neutral-200 rounded-xl shadow-xs">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Welcome, {teacherUser?.name || 'Teacher'}
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Department of {teacher?.department || 'General Education'} · Emp #{teacher?.employeeNumber || '0000'}
          </p>
        </div>

        {/* Date Controls */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={() => handleDateStep(-1)}
            className="px-2.5 h-9 text-xs"
            title="Previous Day"
          >
            ←
          </Button>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
            className="h-9 px-3 text-xs font-semibold bg-neutral-50 border border-neutral-300 rounded-md text-neutral-800 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500"
          />

          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={() => handleDateStep(1)}
            className="px-2.5 h-9 text-xs"
            title="Next Day"
          >
            →
          </Button>

          <Button
            variant="ghost"
            size="sm"
            type="button"
            onClick={() => setSelectedDate(toISODate(new Date()))}
            className="h-9 px-3 text-xs font-medium text-neutral-600 hover:text-neutral-900"
          >
            Today
          </Button>
        </div>
      </div>

      {/* Action Required Callout Banner (if unmarked classes exist) */}
      {unmarkedClasses.length > 0 ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <strong className="text-sm font-bold block">
                {unmarkedClasses.length} Class Register{unmarkedClasses.length === 1 ? '' : 's'} Require Marking
              </strong>
              <span className="text-xs text-amber-800">
                Attendance for {formatDate(selectedDate, 'medium')} has not been completed.
              </span>
            </div>
          </div>

          <Link href={`/teacher/classes/${unmarkedClasses[0].classInfo.id}/attendance?date=${selectedDate}`}>
            <Button
              variant="primary"
              size="sm"
              className="h-9 px-4 text-xs font-semibold bg-amber-600 hover:bg-amber-700 border-amber-700 text-white shadow-xs"
            >
              Mark {unmarkedClasses[0].classInfo.grade}-{unmarkedClasses[0].classInfo.section} Now →
            </Button>
          </Link>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-sm shadow-xs">
          <span className="text-xl">✅</span>
          <div>
            <strong className="font-semibold">All attendance registers are up to date!</strong>
            <p className="text-xs text-emerald-800 mt-0.5">
              All assigned classes for {formatDate(selectedDate, 'medium')} have been recorded.
            </p>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pending Registers"
          value={unmarkedClasses.length}
          subtitle={unmarkedClasses.length > 0 ? 'Requires immediate action' : 'All registers marked'}
        />
        <StatCard
          label="Marked Registers"
          value={markedClasses.length}
          subtitle={`${markedClasses.length} of ${classesList.length} classes completed`}
        />
        <StatCard
          label="Today's Presence"
          value={`${averagePercentage}%`}
          subtitle="Average across marked classes"
        />
        <StatCard
          label="Total Students"
          value={totalStudentsCount}
          subtitle="Enrolled in assigned classes"
        />
      </div>

      {/* Today's Classes & Attendance Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 pb-3">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">Today&apos;s Classes & Registers</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Registers for {formatDate(selectedDate, 'long')}
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 p-1 bg-neutral-100 rounded-lg text-xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                activeFilter === 'all'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              All Classes ({classesList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('unmarked')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                activeFilter === 'unmarked'
                  ? 'bg-amber-100 text-amber-900 shadow-xs'
                  : 'text-neutral-600 hover:text-amber-800'
              }`}
            >
              Needs Marking ({unmarkedClasses.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilter('marked')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                activeFilter === 'marked'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Marked ({markedClasses.length})
            </button>
          </div>
        </div>

        {/* Classes Cards Grid */}
        {displayedClasses.length === 0 ? (
          <div className="py-12 text-center bg-neutral-50 border border-dashed border-neutral-300 rounded-xl text-neutral-500">
            <p className="font-semibold text-sm">No classes found matching filter</p>
            <p className="text-xs text-neutral-500 mt-1">
              {activeFilter === 'unmarked'
                ? 'All registers for this date are marked!'
                : 'No class records available.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedClasses.map((item) => (
              <ClassAttendanceCard
                key={item.classInfo.id}
                classInfo={item.classInfo}
                isClassTeacher={item.isClassTeacher}
                isMarked={item.isMarked}
                attendanceDay={item.attendanceDay}
                summary={item.summary}
                selectedDate={selectedDate}
                studentCount={item.studentCount}
                campusName={item.campusName}
              />
            ))}
          </div>
        )}
      </div>

      {/* Today's Schedule Overview */}
      <div className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-600">
            Today&apos;s Timetable Schedule
          </h3>
          <span className="text-xs text-neutral-500">
            {scheduleSlots.length} Period{scheduleSlots.length === 1 ? '' : 's'} Scheduled
          </span>
        </div>

        {scheduleSlots.length === 0 ? (
          <div className="p-6 bg-white border border-neutral-200 rounded-xl text-center text-xs text-neutral-500">
            No teaching periods scheduled for this day.
          </div>
        ) : (
          <div className="bg-white border border-neutral-200 rounded-xl divide-y divide-neutral-100 shadow-xs overflow-hidden">
            {scheduleSlots.map((item) => (
              <div
                key={item.slot.id}
                className="p-3.5 flex items-center justify-between text-xs hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-brand-50 text-brand-800 font-bold flex items-center justify-center font-mono">
                    P{item.slot.period}
                  </span>
                  <div>
                    <strong className="text-sm font-semibold text-neutral-900 block">
                      {item.subjectName}
                    </strong>
                    <span className="text-neutral-500">
                      {item.slot.startTime} – {item.slot.endTime} · {item.className}
                    </span>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 font-medium">
                  {item.roomNumber}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
