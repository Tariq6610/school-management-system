'use client';

import React, { useEffect, useState } from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { useSession } from '@/components/providers/SessionProvider';
import {
  ParentOutreachPromptItem,
  getParentOutreachList,
} from '@/lib/repositories/parentOutreach';
import { EngagementOutreachList } from '@/components/dashboard/EngagementOutreachList';

export default function AdminParentEngagementPage() {
  const { session } = useSession();
  const [prompts, setPrompts] = useState<ParentOutreachPromptItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadOutreach() {
      if (!session) return;
      setLoading(true);
      try {
        const scope = {
          schoolId: session.schoolId || 'sch_main',
          campusId: session.campusId,
        };
        const list = await getParentOutreachList(scope);
        if (!ignore) {
          setPrompts(list);
        }
      } catch (err) {
        console.error('Failed to load parent outreach list:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadOutreach();
    return () => {
      ignore = true;
    };
  }, [session]);

  return (
    <RouteGuard allowedRoles={['school_admin', 'super_admin', 'principal']}>
      <AppShell pageTitle="Parent Engagement & Outreach">
        {loading ? (
          <div className="py-20 text-center text-neutral-500 bg-white rounded-2xl border border-neutral-200">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent mb-3" />
            <p className="text-sm font-medium">Scanning parent portal communication logs and activity...</p>
          </div>
        ) : (
          <EngagementOutreachList initialItems={prompts} />
        )}
      </AppShell>
    </RouteGuard>
  );
}
