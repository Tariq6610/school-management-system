'use client';

import React from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { TeacherForm } from '@/components/teachers/TeacherForm';

export default function NewTeacherPage() {
  return (
    <RouteGuard allowedRoles={['school_admin', 'super_admin']}>
      <AppShell pageTitle="Add Faculty Member">
        <TeacherForm />
      </AppShell>
    </RouteGuard>
  );
}
