'use client';

import React from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { ClassManager } from '@/components/classes/ClassManager';

export default function AdminClassesPage() {
  return (
    <RouteGuard allowedRoles={['school_admin', 'super_admin', 'principal']}>
      <AppShell pageTitle="Classes & Sections">
        <ClassManager />
      </AppShell>
    </RouteGuard>
  );
}
