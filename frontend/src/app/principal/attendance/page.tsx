'use client';

import React, { Suspense } from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { AdminAttendanceOverview } from '@/components/attendance/AdminAttendanceOverview';

export default function PrincipalAttendancePage() {
  return (
    <RouteGuard allowedRoles={['principal', 'school_admin', 'super_admin']}>
      <AppShell pageTitle="Campus Attendance">
        <Suspense fallback={<div className="p-8 text-neutral-500">Loading campus attendance...</div>}>
          <AdminAttendanceOverview />
        </Suspense>
      </AppShell>
    </RouteGuard>
  );
}
