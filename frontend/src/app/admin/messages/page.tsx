'use client';

import React, { Suspense } from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { useSession } from '@/components/providers/SessionProvider';
import { MessageAuditView } from '@/components/communication';

function AdminMessagesAuditContent() {
  const { session } = useSession();
  const schoolId = session?.schoolId || 'sch_main';

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
            Communications Audit Log
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Network-wide administrative review of teacher–parent messaging threads for student safeguarding.
          </p>
        </div>
      </div>

      <MessageAuditView schoolId={schoolId} />
    </div>
  );
}

export default function AdminMessagesAuditPage() {
  return (
    <RouteGuard allowedRoles={['school_admin', 'super_admin']}>
      <AppShell pageTitle="Message Audit">
        <Suspense fallback={<div className="p-8 text-neutral-500">Loading audit register...</div>}>
          <AdminMessagesAuditContent />
        </Suspense>
      </AppShell>
    </RouteGuard>
  );
}
