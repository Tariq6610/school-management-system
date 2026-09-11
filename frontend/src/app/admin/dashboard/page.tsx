'use client';

import React, { Suspense } from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { useSession } from '@/components/providers/SessionProvider';
import { SchoolAdminDashboardView } from '@/components/dashboard';

function SchoolAdminDashboardContent() {
  const { session } = useSession();
  const schoolId = session?.schoolId || 'sch_main';
  const campusId = session?.campusId;

  return (
    <div className="max-w-7xl mx-auto">
      <SchoolAdminDashboardView schoolId={schoolId} campusId={campusId} />
    </div>
  );
}

export default function SchoolAdminDashboardPage() {
  return (
    <RouteGuard allowedRoles={['school_admin', 'super_admin']}>
      <AppShell pageTitle="Administration Dashboard">
        <Suspense fallback={<div className="p-8 text-neutral-500">Loading dashboard...</div>}>
          <SchoolAdminDashboardContent />
        </Suspense>
      </AppShell>
    </RouteGuard>
  );
}
