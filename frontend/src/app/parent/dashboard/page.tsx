'use client';

import React, { Suspense } from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { ParentDashboardView } from '@/components/parent/ParentDashboardView';

export default function ParentDashboardPage() {
  return (
    <RouteGuard allowedRoles={['parent', 'school_admin', 'super_admin']}>
      <AppShell pageTitle="Parent Dashboard">
        <Suspense fallback={<div className="p-8 text-neutral-500">Loading parent dashboard...</div>}>
          <ParentDashboardView />
        </Suspense>
      </AppShell>
    </RouteGuard>
  );
}
