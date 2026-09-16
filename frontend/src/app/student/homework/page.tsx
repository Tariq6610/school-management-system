'use client';

import React, { Suspense, useEffect, useState, useCallback } from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { useSession } from '@/components/providers/SessionProvider';
import { StudentHomeworkView } from '@/components/lms';
import { getStudentByUserId } from '@/lib/repositories/students';
import { getStudentDashboardData } from '@/lib/repositories/studentDashboard';
import { StudentDashboardData, Scope } from '@/types';

function StudentHomeworkContent() {
  const { session } = useSession();
  const schoolId = session?.schoolId ?? 'sch_main';
  const campusId = session?.campusId;
  const activeStudentId = session?.activeChildId || session?.userId || 'stu_ayesha';

  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadHomework = useCallback(async () => {
    try {
      const scope: Scope = { schoolId, campusId };
      let resolvedId = activeStudentId;
      if (resolvedId.startsWith('usr_')) {
        const studentRec = await getStudentByUserId(resolvedId);
        if (studentRec) resolvedId = studentRec.id;
      }
      const res = await getStudentDashboardData(resolvedId, scope);
      setData(res);
    } catch (err) {
      console.error('Failed to load homework data:', err);
    } finally {
      setLoading(false);
    }
  }, [activeStudentId, schoolId, campusId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadHomework();
  }, [loadHomework]);

  if (loading && !data) {
    return (
      <div className="p-8 text-center text-sm text-neutral-500">
        Loading homework...
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-900">Homework & Assignments</h1>
        <p className="text-secondary-meta text-ink-600 mt-1">
          Review your pending tasks and coursework deadlines.
        </p>
      </div>
      {data && (
        <StudentHomeworkView 
          subjectGroups={data.subjectGroups} 
          studentId={activeStudentId}
          onRefresh={loadHomework}
        />
      )}
    </div>
  );
}

export default function StudentHomeworkPage() {
  return (
    <RouteGuard allowedRoles={['student', 'super_admin']}>
      <AppShell pageTitle="Homework">
        <Suspense fallback={<div className="p-8 text-neutral-500">Loading...</div>}>
          <StudentHomeworkContent />
        </Suspense>
      </AppShell>
    </RouteGuard>
  );
}
