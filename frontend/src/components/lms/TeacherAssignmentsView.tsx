'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Teacher } from '@/types';
import { useSession } from '@/components/providers/SessionProvider';
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
} from '@/lib/repositories/assignments';

/**
 * Cross-course "Submissions & Grading" overview for teachers — the
 * destination of the "Assignments" nav item. Each row deep-links to
 * /teacher/assignments/[id] to review and grade that assignment's
 * submissions.
 */
export function TeacherAssignmentsView() {
  const { session } = useSession();
  const [items, setItems] = useState<TeacherAssignmentOverviewItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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
      const overview = await getTeacherAssignmentsOverview({ schoolId }, activeTeacher.id);
      setItems(overview);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load assignments.');
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

  const totalSubmissions = items.reduce((sum, i) => sum + i.submissionCount, 0);
  const totalMissing = items.reduce((sum, i) => sum + i.missingCount, 0);
  const ungraded = items.filter((i) => i.submissionCount > 0).length;

  if (loadError) {
    return (
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <ErrorState title="Assignments Could Not Be Loaded" message={loadError} onRetry={load} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-page-title text-ink-900">Assignments</h1>
        <p className="text-secondary-meta text-ink-600 mt-1">
          Review submissions and grade every assignment across the courses you teach.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="Assignments with Submissions" value={String(ungraded)} />
        <StatCard label="Total Submissions" value={String(totalSubmissions)} />
        <StatCard label="Missing Submissions" value={String(totalMissing)} />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          title="No assignments yet"
          description="Create an assignment inside one of your courses to start collecting submissions."
        />
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/teacher/assignments/${item.id}`}
              className="flex items-center justify-between gap-3 p-4 rounded-card bg-surface border border-rule hover:border-brand-600/40 transition-colors"
            >
              <div className="min-w-0">
                <h3 className="text-body-custom font-semibold text-ink-900 truncate">
                  {item.title}
                  {item.assignmentType === 'test' && (
                    <span className="ml-2 inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200 uppercase tracking-wide align-middle">
                      Test
                    </span>
                  )}
                  {item.assignmentType === 'quiz' && (
                    <span className="ml-2 inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200 uppercase tracking-wide align-middle">
                      Quiz
                    </span>
                  )}
                  {item.assignmentType === 'activity' && (
                    <span className="ml-2 inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200 uppercase tracking-wide align-middle">
                      Activity
                    </span>
                  )}
                </h3>
                <p className="text-secondary-meta text-ink-500 mt-0.5 truncate">{item.courseTitle}</p>
              </div>
              <div className="flex items-center gap-4 shrink-0 text-secondary-meta">
                <span className="text-ink-700 font-medium">{item.submissionCount} submitted</span>
                {item.missingCount > 0 && <span className="text-absent">{item.missingCount} missing</span>}
                <NavIcon name="chart-bar" className="w-4 h-4 text-brand-700" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
