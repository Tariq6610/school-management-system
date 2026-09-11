'use client';

import React, { use } from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { TeacherProfileView } from '@/components/teachers/TeacherProfileView';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TeacherProfilePage({ params }: PageProps) {
  const resolvedParams = use(params);

  return (
    <RouteGuard allowedRoles={['school_admin', 'super_admin', 'principal']}>
      <AppShell pageTitle="Faculty Profile">
        <TeacherProfileView teacherId={resolvedParams.id} />
      </AppShell>
    </RouteGuard>
  );
}
