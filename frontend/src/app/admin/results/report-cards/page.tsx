'use client';

import React, { Suspense } from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { ReportCardBatchView } from '@/components/results';

export default function AdminReportCardsPage() {
  return (
    <RouteGuard allowedRoles={['super_admin', 'school_admin', 'principal']}>
      <AppShell pageTitle="Student Report Cards & Batch Print">
        <Suspense
          fallback={
            <div className="p-8 text-center text-ink-500 text-xs">
              Loading report cards...
            </div>
          }
        >
          <ReportCardBatchView />
        </Suspense>
      </AppShell>
    </RouteGuard>
  );
}
