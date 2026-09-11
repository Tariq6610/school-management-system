'use client';

import React, { Suspense } from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { CampusComparisonView } from '@/components/dashboard';

function CampusComparisonContent() {
  return (
    <div className="max-w-7xl mx-auto">
      <CampusComparisonView />
    </div>
  );
}

export default function CampusComparisonPage() {
  return (
    <RouteGuard allowedRoles={['super_admin']}>
      <AppShell pageTitle="Campus Comparison">
        <Suspense fallback={<div className="p-8 text-neutral-500">Loading campus comparison...</div>}>
          <CampusComparisonContent />
        </Suspense>
      </AppShell>
    </RouteGuard>
  );
}
