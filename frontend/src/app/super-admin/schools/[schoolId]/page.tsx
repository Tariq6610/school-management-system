'use client';

import React, { use } from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { SchoolDetailView } from '@/components/schools/SchoolDetailView';

interface PageProps {
  params: Promise<{ schoolId: string }>;
}

export default function SuperAdminSchoolDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);

  return (
    <RouteGuard allowedRoles={['super_admin']}>
      <AppShell pageTitle="School Detail">
        <SchoolDetailView schoolId={resolvedParams.schoolId} />
      </AppShell>
    </RouteGuard>
  );
}
