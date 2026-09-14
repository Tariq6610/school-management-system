'use client';

import React from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { StudentDirectory } from '@/components/students/StudentDirectory';

export default function PrincipalStudentsPage() {
  return (
    <RouteGuard allowedRoles={['principal', 'school_admin', 'super_admin']}>
      <AppShell pageTitle="Campus Students">
        <StudentDirectory />
      </AppShell>
    </RouteGuard>
  );
}
