'use client';

import React from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { DefaultersListView } from '@/components/fees/DefaultersListView';

export default function DefaultersPage() {
  return (
    <RouteGuard allowedRoles={['super_admin', 'school_admin', 'principal']}>
      <AppShell pageTitle="Fee Defaulter Report">
        <DefaultersListView />
      </AppShell>
    </RouteGuard>
  );
}
