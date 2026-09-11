'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/shell';
import { Button, StatusBadge, ConfirmDialog } from '@/components/ui';
import { forceReseed } from '@/lib/seed/boot';
import { getStorageUsage } from '@/lib/storage';
import { useToast } from '@/components/ui/Toast';
import { useOptionalSession } from '@/components/providers/SessionProvider';
import { getRoleDashboardRoute } from '@/lib/auth/auth';

/**
 * Reset Prototype Data Page (/demo/reset).
 * Acceptance criteria: Both labelled as prototype-only on screen.
 */
export default function DemoResetPage() {
  const sessionContext = useOptionalSession();
  const { showToast } = useToast();

  const [usage, setUsage] = useState({ bytes: 0, formatted: '0 KB' });
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [lastResetAt, setLastResetAt] = useState<string | null>(null);

  useEffect(() => {
    Promise.resolve().then(() => {
      if (typeof window !== 'undefined') {
        setUsage(getStorageUsage());
      }
    });
  }, [lastResetAt]);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const result = await forceReseed();
      setUsage(result.usage);
      setLastResetAt(new Date().toLocaleTimeString());
      showToast({
        title: 'Prototype data reset',
        message: 'All collections have been restored to initial seed.',
        type: 'success',
      });
    } catch {
      showToast({
        title: 'Reset failed',
        message: 'Unable to complete reset. Check browser console.',
        type: 'error',
      });
    } finally {
      setIsResetting(false);
      setConfirmOpen(false);
    }
  };

  const currentRole = sessionContext?.session?.role ?? 'student';
  const dashboardRoute = getRoleDashboardRoute(currentRole);

  return (
    <AppShell pageTitle="Reset Prototype Data">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Prototype Disclaimer Banner */}
        <div
          role="note"
          aria-label="Prototype notice"
          className="p-4 rounded-card bg-late/10 border border-late/30 space-y-2"
        >
          <div className="flex items-center gap-2">
            <StatusBadge status="late" label="PROTOTYPE ONLY" size="sm" />
            <span className="text-xs font-semibold text-late uppercase tracking-wider">
              Evaluation Affordance
            </span>
          </div>
          <p className="text-xs text-ink-700 leading-relaxed">
            This screen is a prototype-only developer control. It allows evaluators and school
            administrators to wipe all transient browser modifications and restore the clean
            34-teacher, multi-campus initial dataset.
          </p>
        </div>

        {/* Data Maintenance Card */}
        <div className="p-6 rounded-card bg-surface border border-ink-100 shadow-sm space-y-6">
          <div>
            <h1 className="text-page-title font-semibold text-ink-900">
              Wipe and Reseed Storage
            </h1>
            <p className="text-secondary-meta text-ink-600 mt-1">
              Restores initial schools, campuses, teachers, students, and attendance records.
            </p>
          </div>

          {/* Current footprint */}
          <div className="p-4 rounded-control bg-ink-50 border border-ink-200/60 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-ink-500">Current Storage Footprint</p>
              <p className="text-lg font-bold text-ink-900 font-mono mt-0.5">
                {usage.formatted}
              </p>
            </div>
            {lastResetAt && (
              <span className="text-[11px] text-ink-500">
                Last restored at {lastResetAt}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <Button
              variant="danger"
              size="md"
              disabled={isResetting}
              onClick={() => setConfirmOpen(true)}
            >
              {isResetting ? 'Restoring Seed...' : 'Reset All Data to Seed'}
            </Button>

            <Link href={dashboardRoute} className="w-full sm:w-auto">
              <Button variant="secondary" size="md" className="w-full">
                Return to Dashboard
              </Button>
            </Link>
          </div>
        </div>

        {/* Confirmation Modal */}
        <ConfirmDialog
          isOpen={confirmOpen}
          onClose={() => setConfirmOpen(false)}
          onConfirm={handleReset}
          title="Reset Prototype Data?"
          recordName="All browser modifications and attendance marks"
          confirmLabel="Yes, Wipe & Restore Seed"
          actionType="delete"
        />
      </div>
    </AppShell>
  );
}
