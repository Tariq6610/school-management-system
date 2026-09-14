'use client';

import React from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { TeacherDirectory } from '@/components/teachers/TeacherDirectory';

export default function PrincipalTeachersPage() {
  return (
    <RouteGuard allowedRoles={['principal', 'school_admin', 'super_admin']}>
      <AppShell pageTitle="Campus Faculty">
        <TeacherDirectory />
      </AppShell>
    </RouteGuard>
  );
}
