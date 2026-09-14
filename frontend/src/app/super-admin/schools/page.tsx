'use client';

import React from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { SchoolsListView } from '@/components/schools/SchoolsListView';

export default function SuperAdminSchoolsPage() {
  return (
    <RouteGuard allowedRoles={['super_admin']}>
      <AppShell pageTitle="Schools">
        <SchoolsListView />
      </AppShell>
    </RouteGuard>
  );
}
