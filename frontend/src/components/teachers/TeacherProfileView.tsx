'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Campus, Class, ID, Scope, Subject, Teacher, TimetableSlot, User } from '@/types';
import { getTeacher, getTeacherAssignedClasses, getTeacherAssignedSubjects, getTeacherSchedule } from '@/lib/repositories/teachers';
import { getUser } from '@/lib/repositories/users';
import { getCampus } from '@/lib/repositories/campuses';
import { listClasses } from '@/lib/repositories/classes';
import { listStudents } from '@/lib/repositories/students';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Table, TableColumn } from '@/components/ui/Table';
import { Tabs } from '@/components/ui/Tabs';
import { NavIcon } from '@/components/shell/NavIcon';

export interface EnrichedSubject extends Subject {
  className: string;
  roomName: string;
}

export interface EnrichedClassItem {
  classInfo: Class;
  isClassTeacher: boolean;
  studentCount: number;
}

export interface TeacherProfileViewProps {
  teacherId: string;
  initialTeacher?: Teacher | null;
  initialUser?: User | null;
  initialCampus?: Campus | null;
  initialSubjects?: EnrichedSubject[];
  initialClasses?: EnrichedClassItem[];
  initialSchedule?: TimetableSlot[];
}

export function TeacherProfileView({
  teacherId,
  initialTeacher,
  initialUser,
  initialCampus,
  initialSubjects,
  initialClasses,
  initialSchedule,
}: TeacherProfileViewProps) {
  const { session } = useSession();
  const { showToast } = useToast();
  const schoolId = session?.schoolId ?? 'sch_main';

  // Loaded state
  const [teacher, setTeacher] = useState<Teacher | null>(initialTeacher ?? null);
  const [user, setUser] = useState<User | null>(initialUser ?? null);
  const [campus, setCampus] = useState<Campus | null>(initialCampus ?? null);
  const [assignedSubjects, setAssignedSubjects] = useState<EnrichedSubject[]>(
    initialSubjects ?? []
  );
  const [assignedClasses, setAssignedClasses] = useState<EnrichedClassItem[]>(
    initialClasses ?? []
  );
  const [schedule, setSchedule] = useState<TimetableSlot[]>(initialSchedule ?? []);
  const [isLoading, setIsLoading] = useState(!initialTeacher);
  const [activeTab, setActiveTab] = useState('subjects');

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const t = await getTeacher(teacherId);
      if (!t) {
        showToast({
          type: 'error',
          title: 'Teacher not found',
          message: 'Could not find teacher record.',
        });
        setIsLoading(false);
        return;
      }

      const scope: Scope = { schoolId, campusId: t.campusId };
      const [u, c, rawSubjects, rawClasses, rawSchedule, allClasses, allStudents] = await Promise.all([
        getUser(t.userId),
        getCampus(t.campusId),
        getTeacherAssignedSubjects(t.id, scope),
        getTeacherAssignedClasses(t.id, scope),
        getTeacherSchedule(t.id, scope),
        listClasses(scope),
        listStudents(scope),
      ]);

      const classMap = new Map<ID, Class>();
      allClasses.forEach((cls) => classMap.set(cls.id, cls));

      // Enrich subjects with class grade/section
      const enrichedSubs: EnrichedSubject[] = rawSubjects.map((s) => {
        const cls = classMap.get(s.classId);
        return {
          ...s,
          className: cls ? `${cls.grade} - Section ${cls.section}` : 'General',
          roomName: cls?.room ?? 'Assigned Room',
        };
      });

      // Enrich classes with student counts
      const enrichedCls: EnrichedClassItem[] = rawClasses.map((item) => {
        const count = allStudents.filter((s) => s.classId === item.classInfo.id).length;
        return {
          classInfo: item.classInfo,
          isClassTeacher: item.isClassTeacher,
          studentCount: count,
        };
      });

      setTeacher(t);
      setUser(u);
      setCampus(c);
      setAssignedSubjects(enrichedSubs);
      setAssignedClasses(enrichedCls);
      setSchedule(rawSchedule);
    } catch (err) {
      console.error('Failed to load teacher profile:', err);
      showToast({
        type: 'error',
        title: 'Error loading faculty',
        message: 'Could not retrieve teacher details.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [teacherId, schoolId, showToast]);

  useEffect(() => {
    let ignore = false;
    if (!initialTeacher) {
      Promise.resolve().then(() => {
        if (!ignore) {
          loadData();
        }
      });
    }
    return () => {
      ignore = true;
    };
  }, [loadData, initialTeacher]);

  // Tab definitions
  const tabItems = useMemo(
    () => [
      { id: 'subjects', label: 'Assigned Subjects', count: assignedSubjects.length },
      { id: 'classes', label: 'Assigned Classes', count: assignedClasses.length },
      { id: 'schedule', label: 'Weekly Timetable', count: schedule.length },
    ],
    [assignedSubjects.length, assignedClasses.length, schedule.length]
  );

  // Subject Table Columns
  const subjectColumns: TableColumn<EnrichedSubject>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Subject Title',
        accessor: (s) => (
          <div>
            <div className="font-semibold text-ink-900 text-sm">{s.name}</div>
            <div className="text-[11px] text-ink-500 font-mono">Code: {s.code}</div>
          </div>
        ),
      },
      {
        key: 'class',
        header: 'Class & Section',
        accessor: (s) => (
          <span className="text-xs font-medium text-ink-800 bg-surface-subtle px-2 py-1 rounded border border-rule">
            {s.className}
          </span>
        ),
      },
      {
        key: 'room',
        header: 'Room',
        accessor: (s) => <span className="text-xs text-ink-600">{s.roomName}</span>,
      },
    ],
    []
  );

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 py-6">
        <div className="h-40 bg-surface rounded-card border border-rule motion-safe:animate-pulse p-6">
          <div className="flex gap-4">
            <div className="w-16 h-16 bg-ink-100 rounded-full"></div>
            <div className="space-y-2 flex-1">
              <div className="h-6 bg-ink-100 rounded w-1/3"></div>
              <div className="h-4 bg-ink-50 rounded w-1/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <h2 className="text-page-title font-semibold text-ink-900">Faculty Record Not Found</h2>
        <p className="text-secondary-meta text-ink-600">
          The requested faculty member ID does not exist in this scope.
        </p>
        <Link href="/admin/teachers">
          <Button variant="primary">Return to Faculty Directory</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Return Link */}
      <div>
        <Link
          href="/admin/teachers"
          className="text-xs text-brand-700 hover:underline flex items-center gap-1 font-medium"
        >
          ← Return to Faculty Directory
        </Link>
      </div>

      {/* Profile Header */}
      <div className="bg-surface rounded-card border border-rule p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <Avatar name={user?.name ?? 'Teacher'} size="lg" />
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h1 className="text-page-title font-bold text-ink-900">{user?.name}</h1>
                <StatusBadge status="active" label="Active Faculty" size="sm" />
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-ink-600">
                <span className="font-mono font-semibold bg-surface-subtle px-2 py-0.5 rounded border border-rule">
                  {teacher.employeeNumber}
                </span>
                <span>·</span>
                <span className="font-medium text-brand-800">{teacher.department}</span>
                <span>·</span>
                <span>{campus?.name ?? 'Main Campus'}</span>
                <span>·</span>
                <span>Joined {teacher.joinedAt}</span>
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-ink-500 pt-1">
                <span className="inline-flex items-center gap-1">
                  <NavIcon name="mail" className="w-3.5 h-3.5" /> {user?.email}
                </span>
                {user?.phone && (
                  <span className="inline-flex items-center gap-1">
                    <NavIcon name="phone" className="w-3.5 h-3.5" /> {user?.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link href={`/admin/teachers/${teacher.id}/assignments`}>
              <Button variant="primary" size="sm">
                Manage Assignments
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Stat Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-rule">
          <StatCard
            label="Assigned Subjects"
            value={assignedSubjects.length}
            subtitle="Curriculum classes taught"
          />
          <StatCard
            label="Assigned Classes"
            value={assignedClasses.length}
            subtitle={
              assignedClasses.some((c) => c.isClassTeacher)
                ? 'Includes Homeroom Class Teacher'
                : 'Subject teaching cohorts'
            }
          />
          <StatCard
            label="Weekly Periods"
            value={schedule.length}
            subtitle="Scheduled timetable slots"
          />
        </div>
      </div>

      {/* Tabs Bar */}
      <Tabs items={tabItems} activeId={activeTab} onChange={setActiveTab} />

      {/* TAB 1: ASSIGNED SUBJECTS (ACCEPTANCE CRITERIA) */}
      {activeTab === 'subjects' && (
        <div className="bg-surface rounded-card border border-rule overflow-hidden">
          <div className="p-4 border-b border-rule flex items-center justify-between">
            <div>
              <h2 className="text-section-title font-semibold text-ink-900">
                Assigned Teaching Subjects
              </h2>
              <p className="text-secondary-meta text-ink-500">
                Courses and academic subjects currently allocated to this faculty member.
              </p>
            </div>
          </div>

          <Table<EnrichedSubject>
            columns={subjectColumns}
            data={assignedSubjects}
            emptyState={{
              title: 'No subjects assigned',
              description: 'This teacher has not been assigned to any subjects yet.',
            }}
          />
        </div>
      )}

      {/* TAB 2: ASSIGNED CLASSES (ACCEPTANCE CRITERIA) */}
      {activeTab === 'classes' && (
        <div className="space-y-4">
          <div className="bg-surface rounded-card border border-rule p-4">
            <h2 className="text-section-title font-semibold text-ink-900">
              Assigned Classes & Cohorts
            </h2>
            <p className="text-secondary-meta text-ink-500">
              Student sections where this faculty member serves as Subject Teacher or Homeroom
              Teacher.
            </p>
          </div>

          {assignedClasses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignedClasses.map((ac) => (
                <div
                  key={ac.classInfo.id}
                  className="bg-surface rounded-card border border-rule p-5 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-ink-900 text-base">
                        {ac.classInfo.grade} - Section {ac.classInfo.section}
                      </h3>
                      <p className="text-xs text-ink-500">{ac.classInfo.room ?? 'Room'}</p>
                    </div>

                    {ac.isClassTeacher ? (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-brand-100 text-brand-900 font-bold border border-brand-300">
                        <NavIcon name="award" className="w-3 h-3" /> Class Teacher
                      </span>
                    ) : (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-subtle text-ink-700 font-medium border border-rule">
                        Subject Faculty
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-ink-600 pt-2 border-t border-rule">
                    <span>Enrolled Students</span>
                    <span className="font-semibold text-ink-900">{ac.studentCount}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-surface rounded-card border border-rule p-12 text-center text-ink-500 text-xs">
              No classes currently assigned.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TIMETABLE SCHEDULE */}
      {activeTab === 'schedule' && (
        <div className="bg-surface rounded-card border border-rule p-6 space-y-4">
          <div>
            <h2 className="text-section-title font-semibold text-ink-900">
              Weekly Timetable Schedule
            </h2>
            <p className="text-secondary-meta text-ink-500">
              Allocated instructional periods throughout the school week.
            </p>
          </div>

          {schedule.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {schedule.map((slot) => (
                <div
                  key={slot.id}
                  className="p-3 bg-surface-subtle rounded border border-rule space-y-1 text-xs"
                >
                  <div className="flex items-center justify-between font-bold text-ink-900">
                    <span>
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][slot.dayOfWeek - 1]} · Period{' '}
                      {slot.period}
                    </span>
                    <span className="font-mono text-[11px] text-brand-700">
                      {slot.startTime} - {slot.endTime}
                    </span>
                  </div>
                  <div className="text-ink-600 font-medium">Class ID: {slot.classId}</div>
                  <div className="text-[11px] text-ink-500">{slot.room ?? 'Main Campus'}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-ink-500 italic py-6 text-center">
              No timetable slots scheduled for this faculty member.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
