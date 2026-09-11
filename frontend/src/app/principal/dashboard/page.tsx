'use client';

import React, { Suspense } from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { useSession } from '@/components/providers/SessionProvider';
import { PrincipalDashboardView } from '@/components/dashboard';

function PrincipalDashboardContent() {
  const { session } = useSession();
  const schoolId = session?.schoolId || 'sch_main';
  const campusId = session?.campusId || 'cmp_main';

  return (
    <div className="max-w-7xl mx-auto">
      <PrincipalDashboardView schoolId={schoolId} campusId={campusId} />
    </div>
  );
}

export default function PrincipalDashboardPage() {
  return (
    <RouteGuard allowedRoles={['principal', 'school_admin', 'super_admin']}>
      <AppShell pageTitle="Principal Dashboard">
        <Suspense fallback={<div className="p-8 text-neutral-500">Loading campus dashboard...</div>}>
          <PrincipalDashboardContent />
        </Suspense>
      </AppShell>
    </RouteGuard>
  );
}
