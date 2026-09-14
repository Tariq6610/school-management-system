'use client';

import React from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { LeaveRequestsView } from '@/components/staff/LeaveRequestsView';

export default function PrincipalLeaveRequestsPage() {
  return (
    <RouteGuard allowedRoles={['principal', 'school_admin', 'super_admin']}>
      <AppShell pageTitle="Staff Leave Requests">
        <LeaveRequestsView />
      </AppShell>
    </RouteGuard>
  );
}
