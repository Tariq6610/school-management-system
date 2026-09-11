'use client';

import React, { use } from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { InvoiceDetailView } from '@/components/fees/InvoiceDetailView';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function InvoiceDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);

  return (
    <RouteGuard allowedRoles={['school_admin', 'super_admin', 'principal']}>
      <AppShell pageTitle="Invoice Details">
        <InvoiceDetailView invoiceId={resolvedParams.id} />
      </AppShell>
    </RouteGuard>
  );
}
