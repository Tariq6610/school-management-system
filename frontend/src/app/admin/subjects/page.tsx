'use client';

import React from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { SubjectManager } from '@/components/subjects/SubjectManager';

export default function AdminSubjectsPage() {
  return (
    <RouteGuard allowedRoles={['school_admin', 'super_admin', 'principal']}>
      <AppShell pageTitle="Curriculum Subjects">
        <SubjectManager />
      </AppShell>
    </RouteGuard>
  );
}
