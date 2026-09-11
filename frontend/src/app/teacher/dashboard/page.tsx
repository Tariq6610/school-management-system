'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { TeacherDashboardView } from '@/components/teacher/TeacherDashboardView';

function TeacherDashboardContent() {
  const searchParams = useSearchParams();
  const dateParam = searchParams.get('date') || undefined;

  return <TeacherDashboardView initialDate={dateParam} />;
}

export default function TeacherDashboardPage() {
  return (
    <RouteGuard allowedRoles={['teacher', 'school_admin', 'super_admin', 'principal']}>
      <AppShell pageTitle="Teacher Dashboard">
        <Suspense
          fallback={
            <div className="py-20 text-center text-sm text-neutral-500">
              Loading dashboard...
            </div>
          }
        >
          <TeacherDashboardContent />
        </Suspense>
      </AppShell>
    </RouteGuard>
  );
}
