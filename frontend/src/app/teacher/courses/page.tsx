'use client';

import React from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { TeacherCoursesView } from '@/components/lms';

export default function TeacherCoursesPage() {
  return (
    <RouteGuard allowedRoles={['super_admin', 'school_admin', 'principal', 'teacher']}>
      <AppShell pageTitle="Courses & LMS Authoring">
        <TeacherCoursesView />
      </AppShell>
    </RouteGuard>
  );
}
