'use client';

import React from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { TeacherCoursesView } from '@/components/lms';

export default function TeacherCoursesPage() {
  return (
    <RouteGuard allowedRoles={['super_admin', 'school_admin', 'principal', 'teacher']}>
      <AppShell pageTitle="Courses & LMS Authoring">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
              LMS Course Management
            </h1>
            <p className="text-sm text-neutral-600 mt-1">
              Create curriculum modules, manage courses, and assign to class cohorts with automatic student enrollment.
            </p>
          </div>

          <TeacherCoursesView />
        </div>
      </AppShell>
    </RouteGuard>
  );
}
