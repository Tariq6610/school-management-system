'use client';

import React, { Suspense } from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { useSession } from '@/components/providers/SessionProvider';
import { MessageAuditView } from '@/components/communication';

function PrincipalMessagesAuditContent() {
  const { session } = useSession();
  const schoolId = session?.schoolId || 'sch_main';
  const campusId = session?.campusId;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
            Campus Communications Audit
          </h1>
          <p className="text-xs text-neutral-500 mt-1">
            Campus-level administrative review of teacher–parent messaging threads for student safeguarding.
          </p>
        </div>
      </div>

      <MessageAuditView
        schoolId={schoolId}
        initialCampusId={campusId}
        isPrincipalScoped={Boolean(campusId)}
      />
    </div>
  );
}

export default function PrincipalMessagesAuditPage() {
  return (
    <RouteGuard allowedRoles={['principal', 'super_admin']}>
      <AppShell pageTitle="Message Audit">
        <Suspense fallback={<div className="p-8 text-neutral-500">Loading campus audit...</div>}>
          <PrincipalMessagesAuditContent />
        </Suspense>
      </AppShell>
    </RouteGuard>
  );
}
