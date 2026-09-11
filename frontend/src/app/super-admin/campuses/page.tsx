'use client';

import React from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { CampusManager } from '@/components/campuses/CampusManager';

export default function SuperAdminCampusesPage() {
  return (
    <RouteGuard allowedRoles={['super_admin']}>
      <AppShell pageTitle="All Campuses">
        <CampusManager portalScope="super-admin" />
      </AppShell>
    </RouteGuard>
  );
}
