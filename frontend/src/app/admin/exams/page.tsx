'use client';

import React from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { ExamsListView } from '@/components/exams/ExamsListView';

export default function AdminExamsPage() {
  return (
    <RouteGuard allowedRoles={['super_admin', 'school_admin', 'principal']}>
      <AppShell pageTitle="Exams & Assessment Schedules">
        <ExamsListView />
      </AppShell>
    </RouteGuard>
  );
}
