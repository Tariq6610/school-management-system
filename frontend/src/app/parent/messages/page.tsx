'use client';

import React, { Suspense } from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { useSession } from '@/components/providers/SessionProvider';
import { MessagingShell } from '@/components/communication';

function ParentMessagesContent() {
  const { session } = useSession();
  const currentUserId = session?.userId || 'usr_parent_khan';
  const schoolId = session?.schoolId || 'sch_main';

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <MessagingShell
        key={`parent-msg-${currentUserId}`}
        currentUserId={currentUserId}
        role="parent"
        schoolId={schoolId}
      />
    </div>
  );
}

export default function ParentMessagesPage() {
  return (
    <RouteGuard allowedRoles={['parent', 'super_admin']}>
      <AppShell pageTitle="Teacher Chat">
        <Suspense fallback={<div className="p-8 text-neutral-500">Loading chat...</div>}>
          <ParentMessagesContent />
        </Suspense>
      </AppShell>
    </RouteGuard>
  );
}
