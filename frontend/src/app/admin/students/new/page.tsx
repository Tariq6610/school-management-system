'use client';

import React from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { AdmissionForm } from '@/components/students/AdmissionForm';

export default function AdminNewStudentPage() {
  return (
    <RouteGuard allowedRoles={['school_admin', 'super_admin']}>
      <AppShell pageTitle="New Student Admission">
        <AdmissionForm />
      </AppShell>
    </RouteGuard>
  );
}
