'use client';

import React, { use } from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { StudentEditForm } from '@/components/students/StudentEditForm';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditStudentPage({ params }: PageProps) {
  const resolvedParams = use(params);

  return (
    <RouteGuard allowedRoles={['school_admin', 'super_admin']}>
      <AppShell pageTitle="Edit Student Profile">
        <StudentEditForm studentId={resolvedParams.id} />
      </AppShell>
    </RouteGuard>
  );
}
