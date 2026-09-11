'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { NotFound404 } from '@/components/auth/NotFound404';
import { useSession } from '@/components/providers/SessionProvider';
import { ParentAttendanceCalendar } from '@/components/parent/ParentAttendanceCalendar';
import { getChildrenForParent } from '@/lib/repositories';

function ParentAttendanceContent() {
  const { session } = useSession();
  const searchParams = useSearchParams();
  const paramStudentId = searchParams.get('studentId');

  const [checkingScope, setCheckingScope] = useState<boolean>(Boolean(paramStudentId));
  const [isOutOfScope, setIsOutOfScope] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function verifyParentScope() {
      if (!paramStudentId || !session?.userId) {
        setCheckingScope(false);
        return;
      }

      // If user is parent, strictly verify requested student belongs to parent (ROUTE_STRUCTURE.md §1)
      if (session.role === 'parent') {
        try {
          const linked = await getChildrenForParent(session.userId);
          const authorized = linked.some((c) => c.student.id === paramStudentId);
          if (isMounted) {
            setIsOutOfScope(!authorized);
          }
        } catch (err) {
          console.error('Scope verification failed:', err);
          if (isMounted) setIsOutOfScope(true);
        } finally {
          if (isMounted) setCheckingScope(false);
        }
      } else {
        if (isMounted) setCheckingScope(false);
      }
    }

    verifyParentScope();

    return () => {
      isMounted = false;
    };
  }, [paramStudentId, session?.userId, session?.role]);

  if (checkingScope) {
    return (
      <div className="p-8 text-center text-sm text-neutral-500">
        Verifying family attendance scope...
      </div>
    );
  }

  if (isOutOfScope) {
    return (
      <NotFound404
        resourceName="Student Attendance Record"
        recordId={paramStudentId ?? undefined}
        returnHref="/parent/attendance"
        returnLabel="View Your Enrolled Children"
        message="The requested student attendance record is outside your authorized family scope."
      />
    );
  }

  return <ParentAttendanceCalendar initialStudentId={paramStudentId ?? undefined} />;
}

export default function ParentAttendancePage() {
  return (
    <RouteGuard allowedRoles={['parent', 'student', 'school_admin', 'super_admin']}>
      <AppShell pageTitle="Attendance Calendar">
        <Suspense fallback={<div className="p-8 text-neutral-500">Loading attendance calendar...</div>}>
          <ParentAttendanceContent />
        </Suspense>
      </AppShell>
    </RouteGuard>
  );
}
