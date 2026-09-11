'use client';

import React from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { StudentCoursesView } from '@/components/lms';

export default function StudentCoursesPage() {
  return (
    <RouteGuard allowedRoles={['super_admin', 'school_admin', 'principal', 'teacher', 'student', 'parent']}>
      <AppShell pageTitle="My Enrolled Courses">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
              My Courses
            </h1>
            <p className="text-sm text-neutral-600 mt-1">
              Access your subjects, explore published lesson materials, and track curriculum progress.
            </p>
          </div>

          <StudentCoursesView />
        </div>
      </AppShell>
    </RouteGuard>
  );
}
