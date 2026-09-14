'use client';

import React from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { useSession } from '@/components/providers/SessionProvider';
import { ExamsListView } from '@/components/exams/ExamsListView';

export default function PrincipalResultsPage() {
  const { session, activeCampusId } = useSession();
  const campusId = activeCampusId || session?.campusId || 'cmp_main';

  return (
    <RouteGuard allowedRoles={['principal', 'school_admin', 'super_admin']}>
      <AppShell pageTitle="Campus Results">
        <ExamsListView initialCampusId={campusId} />
      </AppShell>
    </RouteGuard>
  );
}
