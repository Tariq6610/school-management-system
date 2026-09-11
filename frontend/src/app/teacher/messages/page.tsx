'use client';

import React, { Suspense } from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { useSession } from '@/components/providers/SessionProvider';
import { MessagingShell } from '@/components/communication';

function TeacherMessagesContent() {
  const { session } = useSession();
  const currentUserId = session?.userId || 'usr_teacher_sana';
  const schoolId = session?.schoolId || 'sch_main';

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <MessagingShell
        key={`teacher-msg-${currentUserId}`}
        currentUserId={currentUserId}
        role="teacher"
        schoolId={schoolId}
      />
    </div>
  );
}

export default function TeacherMessagesPage() {
  return (
    <RouteGuard allowedRoles={['teacher', 'super_admin']}>
      <AppShell pageTitle="Messages">
        <Suspense fallback={<div className="p-8 text-neutral-500">Loading messages...</div>}>
          <TeacherMessagesContent />
        </Suspense>
      </AppShell>
    </RouteGuard>
  );
}
