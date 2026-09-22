'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  AttendanceDay,
  AttendanceSummary,
  Campus,
  Class,
  ID,
  ISODate,
  Scope,
  Teacher,
} from '@/types';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/ui/Toast';
import { DatePicker } from '@/components/ui/DatePicker';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import {
  getAttendanceByClassAndDate,
  calculateClassDaySummary,
} from '@/lib/repositories/attendance';
import {
  getTeacher,
  getTeacherByUserId,
  listTeachers,
  getTeacherAssignedClasses,
} from '@/lib/repositories/teachers';
import { listCampuses } from '@/lib/repositories/campuses';
import { listStudents } from '@/lib/repositories/students';
import { toISODate } from '@/lib/utils';
import { ClassAttendanceCard } from './ClassAttendanceCard';

export interface TeacherClassOverviewItem {
  classInfo: Class;
  isClassTeacher: boolean;
  subjectCount: number;
  studentCount: number;
  campusName: string;
  isMarked: boolean;
  attendanceDay?: AttendanceDay;
  summary?: AttendanceSummary;
}

/**
 * Full "My Classes" hub for teachers — the destination of the "Mark
 * Attendance" nav item. Shows every class a teacher is assigned to
 * (homeroom or subject) for a selectable date, with marked/unmarked status.
 */
export function TeacherClassesView() {
  const { session } = useSession();
  const { showToast } = useToast();

  const [selectedDate, setSelectedDate] = useState<ISODate>(() => toISODate(new Date()));
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [classesList, setClassesList] = useState<TeacherClassOverviewItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unmarked' | 'marked'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadClasses = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      let activeTeacher: Teacher | null = null;
      if (session?.userId) {
        activeTeacher = await getTeacherByUserId(session.userId);
      }
      if (!activeTeacher) {
        activeTeacher = await getTeacher('tch_sana');
        if (!activeTeacher) {
          const allT = await listTeachers({ schoolId: 'sch_main' });
          activeTeacher = allT[0] ?? null;
        }
      }
      setTeacher(activeTeacher);
      if (!activeTeacher) {
        setClassesList([]);
        return;
      }

      const effectiveSchoolId = session?.schoolId || activeTeacher.schoolId || 'sch_main';
      const scope: Scope = { schoolId: effectiveSchoolId };

      const [campuses, rawStudents, assignedClasses] = await Promise.all([
        listCampuses(scope),
        listStudents(scope, { status: 'active' }),
        getTeacherAssignedClasses(activeTeacher.id, scope),
      ]);

      const campusMap = new Map<ID, Campus>();
      campuses.forEach((c) => campusMap.set(c.id, c));

      const enrichedClasses: TeacherClassOverviewItem[] = await Promise.all(
        assignedClasses.map(async (item) => {
          const cls = item.classInfo;
          const campus = campusMap.get(cls.campusId);
          const campusName = campus?.name || 'Main Campus';
          const count = rawStudents.filter((s) => s.classId === cls.id).length;

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

      enrichedClasses.sort((a, b) => {
        if (!a.isMarked && b.isMarked) return -1;
        if (a.isMarked && !b.isMarked) return 1;
        if (a.isClassTeacher && !b.isClassTeacher) return -1;
        if (!a.isClassTeacher && b.isClassTeacher) return 1;
        return a.classInfo.grade.localeCompare(b.classInfo.grade);
      });

      setClassesList(enrichedClasses);
    } catch (err) {
      console.error('Failed to load teacher classes:', err);
      setLoadError(err instanceof Error ? err.message : 'Could not load your classes.');
      showToast({ type: 'error', title: 'Could not load classes', message: 'Please try again.' });
    } finally {
      setIsLoading(false);
    }
  }, [session, selectedDate, showToast]);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) loadClasses();
    });
    return () => {
      ignore = true;
    };
  }, [loadClasses]);

  const filteredClasses = classesList.filter((c) => {
    if (activeFilter === 'unmarked') return !c.isMarked;
    if (activeFilter === 'marked') return c.isMarked;
    return true;
  });

  const unmarkedCount = classesList.filter((c) => !c.isMarked).length;

  if (loadError) {
    return (
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <ErrorState title="Classes Could Not Be Loaded" message={loadError} onRetry={loadClasses} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-page-title text-ink-900">My Classes</h1>
          <p className="text-secondary-meta text-ink-600 mt-1">
            {teacher ? 'Mark daily attendance for every class you teach.' : 'Loading your assigned classes...'}
          </p>
        </div>
        <div className="w-full sm:w-56">
          <DatePicker
            label="Attendance Date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value as ISODate)}
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 border-b border-rule overflow-x-auto">
        {[
          { id: 'all' as const, label: 'All Classes', count: classesList.length },
          { id: 'unmarked' as const, label: 'Needs Marking', count: unmarkedCount },
          { id: 'marked' as const, label: 'Already Marked', count: classesList.length - unmarkedCount },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveFilter(tab.id)}
            className={`px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeFilter === tab.id
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-ink-500 hover:text-ink-900'
            }`}
          >
            {tab.label} <span className="text-ink-400">({tab.count})</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : filteredClasses.length === 0 ? (
        <EmptyState
          title={classesList.length === 0 ? 'No classes assigned yet' : 'No classes match this filter'}
          description={
            classesList.length === 0
              ? 'You have not been assigned as a homeroom or subject teacher for any class.'
              : 'Try a different filter or date.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredClasses.map((item) => (
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
  );
}
