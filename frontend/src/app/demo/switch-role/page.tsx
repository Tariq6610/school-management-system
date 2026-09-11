'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/shell';
import { Button, StatusBadge, Avatar } from '@/components/ui';
import { DEMO_ACCOUNTS, DemoAccount, getRoleDashboardRoute } from '@/lib/auth/auth';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/ui/Toast';

/**
 * Switch Demo Role Page (/demo/switch-role).
 * Acceptance criteria: Both labelled as prototype-only on screen.
 */
export default function DemoSwitchRolePage() {
  const router = useRouter();
  const { session, user, login } = useSession();
  const { showToast } = useToast();
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);

  const handleSwitch = async (account: DemoAccount) => {
    setSwitchingTo(account.role);
    try {
      const result = await login(account.email, 'demo1234');
      if (result.success && result.session) {
        showToast({
          title: 'Switched Role',
          message: `Now operating as ${account.name} (${account.roleLabel}).`,
          type: 'success',
        });
        const targetRoute = getRoleDashboardRoute(result.session.role);
        router.push(targetRoute);
      } else {
        showToast({
          title: 'Switch Failed',
          message: result.error ?? 'Unable to activate demo account.',
          type: 'error',
        });
      }
    } finally {
      setSwitchingTo(null);
    }
  };

  return (
    <AppShell pageTitle="Switch Demo Role">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Prototype Disclaimer Banner */}
        <div
          role="note"
          aria-label="Demo notice"
          className="p-4 rounded-card bg-pending/10 border border-pending/30 space-y-2"
        >
          <div className="flex items-center gap-2">
            <StatusBadge status="pending" label="DEMO AFFORDANCE ONLY" size="sm" />
            <span className="text-xs font-semibold text-pending uppercase tracking-wider">
              Prototype Evaluation Tool
            </span>
          </div>
          <p className="text-xs text-ink-700 leading-relaxed">
            Instant role switching is a prototype tool for exploring multi-role workflows without
            logging in and out. This affordance does not exist in production environments and is
            restricted to clickable prototype evaluation.
          </p>
        </div>

        {/* Header */}
        <div>
          <h1 className="text-page-title font-semibold text-ink-900">
            Select an Institutional Role
          </h1>
          <p className="text-secondary-meta text-ink-600 mt-1">
            Experience the platform through different perspectives across administrative, teaching, and family portals.
          </p>
        </div>

        {/* Demo Accounts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DEMO_ACCOUNTS.map((account) => {
            const isCurrent = user?.email === account.email || session?.role === account.role;
            const isTarget = switchingTo === account.role;

            return (
              <div
                key={account.role}
                className={`p-5 rounded-card bg-surface border transition-all space-y-4 ${
                  isCurrent
                    ? 'border-primary-500 ring-2 ring-primary-500/20 shadow-sm'
                    : 'border-ink-100 hover:border-ink-200 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar name={account.name} size="md" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-semibold text-ink-900 truncate">
                          {account.name}
                        </h2>
                        {isCurrent && (
                          <span className="px-1.5 py-0.5 rounded-full bg-primary-100 text-[10px] font-semibold text-primary-800">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-ink-500 truncate">{account.email}</p>
                    </div>
                  </div>

                  <StatusBadge
                    status="published"
                    label={account.roleLabel}
                    size="sm"
                    className="shrink-0 text-[10px]"
                  />
                </div>

                <p className="text-xs text-ink-600 leading-relaxed">
                  {account.description}
                </p>

                <div className="flex items-center justify-between text-[11px] text-ink-400 font-mono pt-1 border-t border-ink-100">
                  <span>Scope: {account.campusLabel ?? 'All Campuses'}</span>
                  <Button
                    variant={isCurrent ? 'secondary' : 'primary'}
                    size="sm"
                    disabled={isCurrent || isTarget}
                    onClick={() => handleSwitch(account)}
                  >
                    {isCurrent ? 'Current Role' : isTarget ? 'Switching...' : 'Switch to Role'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
