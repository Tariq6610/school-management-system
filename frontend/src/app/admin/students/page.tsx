'use client';

import React from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { StudentDirectory } from '@/components/students/StudentDirectory';

export default function AdminStudentsPage() {
  return (
    <RouteGuard allowedRoles={['school_admin', 'super_admin', 'principal']}>
      <AppShell pageTitle="Student Directory">
        <StudentDirectory />
      </AppShell>
    </RouteGuard>
  );
}
