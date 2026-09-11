'use client';

import React, { use } from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { TeacherAssignmentMatrix } from '@/components/teachers/TeacherAssignmentMatrix';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TeacherAssignmentsPage({ params }: PageProps) {
  const resolvedParams = use(params);

  return (
    <RouteGuard allowedRoles={['school_admin', 'super_admin']}>
      <AppShell pageTitle="Manage Faculty Assignments">
        <TeacherAssignmentMatrix teacherId={resolvedParams.id} />
      </AppShell>
    </RouteGuard>
  );
}
