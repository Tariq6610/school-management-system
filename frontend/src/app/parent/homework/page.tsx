'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { NotFound404 } from '@/components/auth/NotFound404';
import { useSession } from '@/components/providers/SessionProvider';
import { getChildrenForParent } from '@/lib/repositories';
import { getParentDashboardChildData, ParentChildDashboardData } from '@/lib/repositories/parentDashboard';
import { ParentHomeworkView } from '@/components/parent/ParentHomeworkView';

function ParentHomeworkContent() {
  const { session } = useSession();
  const searchParams = useSearchParams();
  const paramStudentId = searchParams.get('studentId');
  const activeChildId = paramStudentId || session?.activeChildId;

  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<ParentChildDashboardData | null>(null);
  const [isOutOfScope, setIsOutOfScope] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchData() {
      if (!activeChildId || !session?.userId || !session?.schoolId) {
        setLoading(false);
        return;
      }

      if (session.role === 'parent') {
        try {
          const linked = await getChildrenForParent(session.userId);
          const authorized = linked.some((c) => c.student.id === activeChildId);
          if (!authorized) {
            if (isMounted) setIsOutOfScope(true);
            return;
          }

          const dashboardData = await getParentDashboardChildData(activeChildId, session.schoolId);
          if (isMounted) {
            setData(dashboardData);
          }
        } catch (err) {
          console.error('Scope verification or data fetch failed:', err);
          if (isMounted) setIsOutOfScope(true);
        } finally {
          if (isMounted) setLoading(false);
        }
      } else {
        if (isMounted) setLoading(false);
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [activeChildId, session?.userId, session?.schoolId, session?.role, session?.activeChildId]);

  if (!activeChildId) {
    return (
      <div className="p-8 text-center text-sm text-neutral-500">
        Please select a child from the top navigation to view their homework.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-sm text-neutral-500">
        Loading student homework...
      </div>
    );
  }

  if (isOutOfScope || !data) {
    return (
      <NotFound404
        resourceName="Student Homework Record"
        recordId={activeChildId as string}
        returnHref="/parent/homework"
        returnLabel="View Your Enrolled Children"
        message="The requested student homework record is outside your authorized family scope."
      />
    );
  }

  return (
    <div className="max-w-7xl space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-900">Homework & Assignments</h1>
        <p className="text-secondary-meta text-ink-600 mt-1">
          Review pending tasks and coursework deadlines for {data.user.name}.
        </p>
      </div>
      <ParentHomeworkView homework={data.homework} />
    </div>
  );
}

export default function ParentHomeworkPage() {
  return (
    <RouteGuard allowedRoles={['parent']}>
      <AppShell pageTitle="Homework">
        <Suspense fallback={<div className="p-8 text-neutral-500">Loading homework view...</div>}>
          <ParentHomeworkContent />
        </Suspense>
      </AppShell>
    </RouteGuard>
  );
}
