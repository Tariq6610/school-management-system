'use client';

import React, { Suspense } from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { AdminAttendanceOverview } from '@/components/attendance/AdminAttendanceOverview';

export default function AdminAttendancePage() {
  return (
    <RouteGuard allowedRoles={['school_admin', 'super_admin', 'principal']}>
      <AppShell pageTitle="Attendance Overview">
        <Suspense fallback={<div className="p-8 text-neutral-500">Loading attendance overview...</div>}>
          <AdminAttendanceOverview />
        </Suspense>
      </AppShell>
    </RouteGuard>
  );
}
