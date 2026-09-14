'use client';

import React, { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Assignment } from '@/types';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { useSession } from '@/components/providers/SessionProvider';
import { getAssignment } from '@/lib/repositories/assignments';
import { TeacherGradingContent } from '@/components/lms/TeacherGradingModal';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonCard } from '@/components/ui/Skeleton';

interface PageProps {
  params: Promise<{ id: string }>;
}

function AssignmentGradingContent({ assignmentId }: { assignmentId: string }) {
  const router = useRouter();
  const { session } = useSession();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setNotFound(false);
    const record = await getAssignment(assignmentId);
    if (!record) {
      setNotFound(true);
    } else {
      setAssignment(record);
    }
    setIsLoading(false);
  }, [assignmentId]);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) load();
    });
    return () => {
      ignore = true;
    };
  }, [load]);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <SkeletonCard />
      </div>
    );
  }

  if (notFound || !assignment) {
    return (
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <ErrorState
          title="Assignment Not Found"
          message={`No assignment exists with id "${assignmentId}". It may have been removed.`}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <TeacherGradingContent
        assignment={assignment}
        schoolId={session?.schoolId || 'sch_main'}
        campusId={session?.campusId}
        onClose={() => router.push('/teacher/homework')}
      />
    </div>
  );
}

export default function TeacherHomeworkGradingPage({ params }: PageProps) {
  const { id } = use(params);

  return (
    <RouteGuard allowedRoles={['teacher', 'school_admin', 'super_admin', 'principal']}>
      <AppShell pageTitle="Grade Homework">
        <AssignmentGradingContent assignmentId={id} />
      </AppShell>
    </RouteGuard>
  );
}
