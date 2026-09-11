'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { NotFound404 } from '@/components/auth/NotFound404';
import { useSession } from '@/components/providers/SessionProvider';
import { StudentResultsView } from '@/components/results';
import { getChildrenForParent } from '@/lib/repositories';

function ParentResultsContent() {
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
          console.error('Scope verification failed for results:', err);
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
        Verifying authorized student results scope...
      </div>
    );
  }

  if (isOutOfScope) {
    return (
      <NotFound404
        resourceName="Student Examination Results"
        recordId={paramStudentId ?? undefined}
        returnHref="/parent/results"
        returnLabel="View Your Enrolled Children"
        message="The requested examination results and report card are outside your authorized family scope."
      />
    );
  }

  return (
    <StudentResultsView
      mode="parent"
      initialStudentId={paramStudentId ?? undefined}
    />
  );
}

export default function ParentResultsPage() {
  return (
    <RouteGuard allowedRoles={['parent', 'super_admin']}>
      <AppShell pageTitle="Examination Results & Report Cards">
        <Suspense
          fallback={
            <div className="p-8 text-center text-sm text-neutral-500">
              Loading examination results...
            </div>
          }
        >
          <ParentResultsContent />
        </Suspense>
      </AppShell>
    </RouteGuard>
  );
}
