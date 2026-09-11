'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { NotFound404 } from '@/components/auth/NotFound404';
import { useSession } from '@/components/providers/SessionProvider';
import { ParentFeeView } from '@/components/parent/ParentFeeView';
import { getChildrenForParent } from '@/lib/repositories/parents';

function ParentFeeContent() {
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
          console.error('Fee scope verification failed:', err);
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
        Verifying authorized student fee access...
      </div>
    );
  }

  if (isOutOfScope) {
    return (
      <NotFound404
        resourceName="Student Fee Record"
        recordId={paramStudentId ?? undefined}
        returnHref="/parent/fees"
        returnLabel="View Your Enrolled Children"
        message="The requested student fee and billing record is outside your authorized family scope."
      />
    );
  }

  return <ParentFeeView initialStudentId={paramStudentId ?? undefined} />;
}

export default function ParentFeesPage() {
  return (
    <RouteGuard allowedRoles={['parent', 'student', 'school_admin', 'super_admin']}>
      <AppShell pageTitle="Fees & Invoices">
        <Suspense fallback={<div className="p-8 text-neutral-500">Loading fee records...</div>}>
          <ParentFeeContent />
        </Suspense>
      </AppShell>
    </RouteGuard>
  );
}
