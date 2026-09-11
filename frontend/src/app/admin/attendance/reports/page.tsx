'use client';

import React, { Suspense } from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { AttendanceReportsView } from '@/components/attendance/AttendanceReportsView';

export default function AdminAttendanceReportsPage() {
  return (
    <RouteGuard allowedRoles={['school_admin', 'super_admin', 'principal']}>
      <AppShell pageTitle="Attendance Reports">
        <Suspense fallback={<div className="p-8 text-neutral-500">Loading attendance reports...</div>}>
          <AttendanceReportsView />
        </Suspense>
      </AppShell>
    </RouteGuard>
  );
}
