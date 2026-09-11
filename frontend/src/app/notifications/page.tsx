'use client';

import React, { Suspense } from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { useSession } from '@/components/providers/SessionProvider';
import { NotificationCentre } from '@/components/communication';

function NotificationsPageContent() {
  const { session } = useSession();
  const schoolId = session?.schoolId || 'sch_main';
  const recipientId = session?.userId || 'usr_parent_khan';
  const role = session?.role || 'parent';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
          Notification Centre
        </h1>
        <p className="text-xs text-neutral-500 mt-1">
          Review updates, alerts, fee invoices, attendance notices, and class announcements.
        </p>
      </div>

      <NotificationCentre
        recipientId={recipientId}
        schoolId={schoolId}
        role={role}
        isDropdown={false}
      />
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <RouteGuard allowedRoles={['super_admin', 'school_admin', 'principal', 'teacher', 'parent', 'student']}>
      <AppShell pageTitle="Notifications">
        <Suspense fallback={<div className="p-8 text-neutral-500">Loading notifications...</div>}>
          <NotificationsPageContent />
        </Suspense>
      </AppShell>
    </RouteGuard>
  );
}
