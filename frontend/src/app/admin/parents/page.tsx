'use client';

import React from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { ParentDirectory } from '@/components/parents/ParentDirectory';

export default function AdminParentsPage() {
  return (
    <RouteGuard allowedRoles={['school_admin', 'super_admin', 'principal']}>
      <AppShell pageTitle="Parent Records & Linking">
        <ParentDirectory />
      </AppShell>
    </RouteGuard>
  );
}
