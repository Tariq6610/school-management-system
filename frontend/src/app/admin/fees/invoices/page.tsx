'use client';

import React from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { InvoicesListView } from '@/components/fees/InvoicesListView';

export default function InvoicesPage() {
  return (
    <RouteGuard allowedRoles={['super_admin', 'school_admin', 'principal']}>
      <AppShell pageTitle="Fee Invoices">
        <InvoicesListView />
      </AppShell>
    </RouteGuard>
  );
}
