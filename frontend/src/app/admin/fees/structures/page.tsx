'use client';

import React from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { FeeStructuresView } from '@/components/fees/FeeStructuresView';

export default function FeeStructuresPage() {
  return (
    <RouteGuard allowedRoles={['super_admin', 'school_admin', 'principal']}>
      <AppShell pageTitle="Fee Structures">
        <FeeStructuresView />
      </AppShell>
    </RouteGuard>
  );
}
