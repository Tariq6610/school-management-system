'use client';

import React from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { TeacherHomeworkView } from '@/components/lms';

export default function TeacherHomeworkPage() {
  return (
    <RouteGuard allowedRoles={['teacher', 'school_admin', 'super_admin', 'principal']}>
      <AppShell pageTitle="Homework">
        <TeacherHomeworkView />
      </AppShell>
    </RouteGuard>
  );
}
