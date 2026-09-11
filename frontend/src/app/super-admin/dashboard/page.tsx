'use client';

import React, { Suspense } from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { useSession } from '@/components/providers/SessionProvider';
import { SuperAdminDashboardView } from '@/components/dashboard';

function SuperAdminDashboardContent() {
  const { session } = useSession();
  const schoolId = session?.schoolId || 'sch_main';

  return (
    <div className="max-w-7xl mx-auto">
      <SuperAdminDashboardView schoolId={schoolId} />
    </div>
  );
}

export default function SuperAdminDashboardPage() {
  return (
    <RouteGuard allowedRoles={['super_admin']}>
      <AppShell pageTitle="Network Overview">
        <Suspense fallback={<div className="p-8 text-neutral-500">Loading network overview...</div>}>
          <SuperAdminDashboardContent />
        </Suspense>
      </AppShell>
    </RouteGuard>
  );
}
