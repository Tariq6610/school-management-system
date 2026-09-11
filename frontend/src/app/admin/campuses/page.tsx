'use client';

import React from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { CampusManager } from '@/components/campuses/CampusManager';

export default function AdminCampusesPage() {
  return (
    <RouteGuard allowedRoles={['school_admin', 'super_admin']}>
      <AppShell pageTitle="Campus Management">
        <CampusManager portalScope="admin" />
      </AppShell>
    </RouteGuard>
  );
}
