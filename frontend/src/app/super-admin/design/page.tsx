'use client';

import React from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { DesignStudio } from '@/components/design/DesignStudio';

export default function SuperAdminDesignPage() {
  return (
    <RouteGuard allowedRoles={['super_admin']}>
      <AppShell pageTitle="Design Studio">
        <DesignStudio />
      </AppShell>
    </RouteGuard>
  );
}
