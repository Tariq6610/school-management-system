'use client';

import React from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { TeacherClassesView } from '@/components/teacher';

export default function TeacherClassesPage() {
  return (
    <RouteGuard allowedRoles={['teacher', 'school_admin', 'super_admin', 'principal']}>
      <AppShell pageTitle="My Classes">
        <TeacherClassesView />
      </AppShell>
    </RouteGuard>
  );
}
