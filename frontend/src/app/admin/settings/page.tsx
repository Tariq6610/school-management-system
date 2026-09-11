'use client';

import React from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { SettingsView } from '@/components/settings/SettingsView';

export default function AdminSettingsPage() {
  return (
    <RouteGuard allowedRoles={['school_admin', 'super_admin']}>
      <AppShell pageTitle="Settings">
        <SettingsView />
      </AppShell>
    </RouteGuard>
  );
}
