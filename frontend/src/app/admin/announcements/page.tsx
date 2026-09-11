'use client';

import React from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { useSession } from '@/components/providers/SessionProvider';
import { AnnouncementsListView } from '@/components/communication/AnnouncementsListView';

export default function AdminAnnouncementsPage() {
  const { session } = useSession();
  const schoolId = session?.schoolId || 'sch_main';

  return (
    <RouteGuard allowedRoles={['school_admin', 'super_admin']}>
      <AppShell pageTitle="Announcements">
        <AnnouncementsListView schoolId={schoolId} />
      </AppShell>
    </RouteGuard>
  );
}
