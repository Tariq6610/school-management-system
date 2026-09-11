'use client';

import React, { use } from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { ParentProfileView } from '@/components/parents/ParentProfileView';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AdminParentDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);

  return (
    <RouteGuard allowedRoles={['school_admin', 'super_admin', 'principal']}>
      <AppShell pageTitle="Parent Profile">
        <ParentProfileView parentId={resolvedParams.id} />
      </AppShell>
    </RouteGuard>
  );
}
