'use client';

import React, { Suspense } from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { StudentResultsView } from '@/components/results';

export default function StudentResultsPage() {
  return (
    <RouteGuard allowedRoles={['student', 'super_admin']}>
      <AppShell pageTitle="My Examination Results">
        <Suspense
          fallback={
            <div className="p-8 text-center text-sm text-neutral-500">
              Loading my results...
            </div>
          }
        >
          <StudentResultsView mode="student" />
        </Suspense>
      </AppShell>
    </RouteGuard>
  );
}
