'use client';

import React from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { TeacherDirectory } from '@/components/teachers/TeacherDirectory';

export default function AdminTeachersPage() {
  return (
    <RouteGuard allowedRoles={['school_admin', 'super_admin', 'principal']}>
      <AppShell pageTitle="Faculty & Staff">
        <TeacherDirectory />
      </AppShell>
    </RouteGuard>
  );
}
