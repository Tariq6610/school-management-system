'use client';

import React from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { StudentDashboardView } from '@/components/lms';

export default function StudentDashboardPage() {
  return (
    <RouteGuard allowedRoles={['super_admin', 'school_admin', 'principal', 'teacher', 'student', 'parent']}>
      <AppShell pageTitle="Student Learning Dashboard">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <StudentDashboardView />
        </div>
      </AppShell>
    </RouteGuard>
  );
}
