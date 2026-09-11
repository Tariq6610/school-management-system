'use client';

import React, { Suspense } from 'react';
import { AppShell } from '@/components/shell';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { useSession } from '@/components/providers/SessionProvider';
import { WhatsAppMockShell } from '@/components/communication';

function WhatsAppDemoContent() {
  const { session } = useSession();
  const schoolId = session?.schoolId || 'sch_main';

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header with Prototype & Differentiation Badges */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
              Differentiation Screen 5
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase tracking-wider">
              Prototype Only
            </span>
          </div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
            WhatsApp Mock Inbox &amp; Message Log
          </h1>
          <p className="text-xs text-neutral-500 mt-1 max-w-2xl">
            Simulates the parent mobile experience for real school triggers. Reviewing approved Meta Business templates with school leadership ensures zero delays during production onboarding.
          </p>
        </div>
      </div>

      <WhatsAppMockShell schoolId={schoolId} />
    </div>
  );
}

export default function WhatsAppDemoPage() {
  return (
    <RouteGuard allowedRoles={['super_admin', 'school_admin', 'principal', 'teacher', 'parent', 'student']}>
      <AppShell pageTitle="WhatsApp Mock">
        <Suspense fallback={<div className="p-8 text-neutral-500">Loading WhatsApp mock inbox...</div>}>
          <WhatsAppDemoContent />
        </Suspense>
      </AppShell>
    </RouteGuard>
  );
}
