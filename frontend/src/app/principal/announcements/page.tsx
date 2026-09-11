'use client';

import React from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { useSession } from '@/components/providers/SessionProvider';
import { AnnouncementsListView } from '@/components/communication/AnnouncementsListView';

export default function PrincipalAnnouncementsPage() {
  const { session, activeCampusId } = useSession();
  const schoolId = session?.schoolId || 'sch_main';
  const campusId = activeCampusId || session?.campusId || 'cmp_main';

  return (
    <RouteGuard allowedRoles={['principal', 'school_admin', 'super_admin']}>
      <AppShell pageTitle="Campus Announcements">
        <AnnouncementsListView
          schoolId={schoolId}
          campusId={campusId}
          title="Campus Announcements"
          subtitle="Manage announcements for your campus and class cohorts."
        />
      </AppShell>
    </RouteGuard>
  );
}
