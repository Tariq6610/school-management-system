'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Teacher } from '@/types';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { NavIcon } from '@/components/shell/NavIcon';
import {
  getTeacher,
  getTeacherByUserId,
  listTeachers,
} from '@/lib/repositories/teachers';
import {
  getTeacherAssignmentsOverview,
  TeacherAssignmentOverviewItem,
  createAssignment
} from '@/lib/repositories/assignments';
import { listCourses } from '@/lib/repositories/courses';
import { listLessons } from '@/lib/repositories/lessons';
import { Course, Lesson } from '@/types';
import { AssignmentModal } from '@/components/lms/AssignmentModal';

function getDeadlineStatus(deadlineIso: string): { label: string; tone: 'past' | 'today' | 'upcoming' } {
  const now = new Date();
  const deadline = new Date(deadlineIso);
  if (deadline.getTime() < now.getTime()) return { label: 'Past Due', tone: 'past' };
  const isToday =
    now.getFullYear() === deadline.getFullYear() &&
    now.getMonth() === deadline.getMonth() &&
    now.getDate() === deadline.getDate();
  if (isToday) return { label: 'Due Today', tone: 'today' };
  return { label: 'Upcoming', tone: 'upcoming' };
}

function formatDeadline(deadlineIso: string): string {
  const d = new Date(deadlineIso);
  if (isNaN(d.getTime())) return deadlineIso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const TONE_CLASSES: Record<'past' | 'today' | 'upcoming', string> = {
  past: 'bg-absent-bg text-absent',
  today: 'bg-late-bg text-late',
  upcoming: 'bg-present-bg text-present',
};

/**
 * Cross-course homework overview for teachers — the destination of the
 * "Homework" nav item. Creation and editing stays in the owning course
 * (LMS authoring), so each row deep-links there.
 */
export function TeacherHomeworkView() {
  const router = useRouter();
  const { session } = useSession();
  const { showToast } = useToast();
  const [items, setItems] = useState<TeacherAssignmentOverviewItem[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const load = useCallback(async () => {
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
      if (!activeTeacher) {
        setItems([]);
        return;
      }
      const schoolId = session?.schoolId || activeTeacher.schoolId || 'sch_main';
      const scope = { schoolId };
      const [overview, fetchedCourses] = await Promise.all([
        getTeacherAssignmentsOverview(scope, activeTeacher.id),
        listCourses(scope, { teacherId: activeTeacher.id })
      ]);
      
      const allLessons = (await Promise.all(
        fetchedCourses.map(c => listLessons(scope, c.id))
      )).flat();

      setItems(overview);
      setCourses(fetchedCourses);
      setLessons(allLessons);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load homework.');
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) load();
    });
    return () => {
      ignore = true;
    };
  }, [load]);

  const pastDueCount = items.filter((i) => getDeadlineStatus(i.deadline).tone === 'past').length;
  const dueTodayCount = items.filter((i) => getDeadlineStatus(i.deadline).tone === 'today').length;

  if (loadError) {
    return (
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <ErrorState title="Homework Could Not Be Loaded" message={loadError} onRetry={load} />
      </div>
    );
  }

  const handleSaveAssignment = async (data: {
    title: string;
    instructions: string;
    deadline: string;
    maxMarks: number;
    lessonId?: string;
    submissionType: 'online' | 'offline';
    courseId?: string;
  }) => {
    if (!data.courseId) {
      showToast({ type: 'error', title: 'Course is required' });
      return;
    }
    
    await createAssignment({
      schoolId: session?.schoolId || 'sch_main',
      courseId: data.courseId,
      title: data.title,
      instructions: data.instructions,
      deadline: data.deadline,
      maxMarks: data.maxMarks,
      lessonId: data.lessonId,
      submissionType: data.submissionType,
    });
    showToast({ type: 'success', title: 'Homework created successfully' });
    setIsAddModalOpen(false);
    load();
  };

  return (
    <div className="max-w-7xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-page-title text-ink-900">Homework</h1>
          <p className="text-secondary-meta text-ink-600 mt-1">
            Every homework item across the courses you teach. Create or edit from within the course.
          </p>
        </div>
        <Button variant="primary" leftIcon={<NavIcon name="plus" className="w-4 h-4" />} onClick={() => setIsAddModalOpen(true)}>
          Create Homework
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Total Homework" value={String(items.length)} />
        <StatCard label="Due Today" value={String(dueTodayCount)} />
        <StatCard label="Past Due" value={String(pastDueCount)} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No homework assigned yet"
          description="Open one of your courses to create the first homework item for its students."
          action={{ label: 'Go to Courses', onClick: () => router.push('/teacher/courses') }}
        />
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => {
            const status = getDeadlineStatus(item.deadline);
            return (
              <Link
                key={item.id}
                href={`/teacher/homework/${item.id}`}
                className="block p-4 rounded-card bg-surface border border-rule hover:border-brand-600/40 transition-colors"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-body-custom font-semibold text-ink-900">{item.title}</h3>
                    <p className="text-secondary-meta text-ink-500 mt-0.5">
                      {item.courseTitle} {item.lessonTitle ? `· ${item.lessonTitle}` : ''}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded shrink-0 ${TONE_CLASSES[status.tone]}`}>
                    {status.label}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-secondary-meta text-ink-500">
                  <span>Due {formatDeadline(item.deadline)}</span>
                  <span>{item.submissionCount} submitted</span>
                  {item.missingCount > 0 && <span className="text-absent">{item.missingCount} missing</span>}
                  {item.lateCount > 0 && <span className="text-late">{item.lateCount} late</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Assignment Modal for creating homework globally */}
      <AssignmentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveAssignment}
        lessons={lessons}
        courses={courses}
      />
    </div>
  );
}
