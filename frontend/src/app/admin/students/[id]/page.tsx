'use client';

import React, { use } from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { StudentProfileView } from '@/components/students/StudentProfileView';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function StudentProfilePage({ params }: PageProps) {
  const resolvedParams = use(params);

  return (
    <RouteGuard allowedRoles={['school_admin', 'super_admin', 'principal', 'teacher']}>
      <AppShell pageTitle="Student Profile">
        <StudentProfileView studentId={resolvedParams.id} />
      </AppShell>
    </RouteGuard>
  );
}
