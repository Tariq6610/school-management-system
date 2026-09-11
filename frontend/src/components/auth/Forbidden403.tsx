'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Role } from '@/types';
import { Button, StatusBadge } from '@/components/ui';
import { getRoleDashboardRoute } from '@/lib/auth/auth';
import { useOptionalSession } from '@/components/providers/SessionProvider';

export interface Forbidden403Props {
  allowedRoles?: Role[];
  currentRole?: Role | null;
  message?: string;
  className?: string;
}

/**
 * Institutional 403 Forbidden Component.
 * Acceptance criteria: Wrong role → 403.
 */
export function Forbidden403({
  allowedRoles = [],
  currentRole,
  message,
  className = '',
}: Forbidden403Props) {
  const router = useRouter();
  const sessionContext = useOptionalSession();

  const roleToRoute = currentRole ?? 'student';
  const dashboardRoute = getRoleDashboardRoute(roleToRoute);

  const roleLabel = currentRole ? currentRole.replace('_', ' ') : 'guest';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`min-h-[60vh] flex flex-col items-center justify-center p-6 text-center ${className}`}
    >
      <div className="max-w-md w-full p-8 rounded-card bg-surface border border-absent/25 shadow-overlay space-y-5">
        <div className="flex items-center justify-center gap-2">
          <StatusBadge status="absent" label="403 Forbidden" size="md" />
        </div>

        <div>
          <h2 className="text-page-title text-ink-900 font-semibold">Access Restricted</h2>
          <p className="text-secondary-meta text-ink-600 mt-2">
            {message ??
              `Your current role (${roleLabel}) is not authorized to access this module.`}
          </p>
          {allowedRoles.length > 0 && (
            <p className="text-xs text-ink-500 mt-1 font-mono">
              Authorized roles: {allowedRoles.join(', ')}
            </p>
          )}
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={() => router.push(dashboardRoute)}
          >
            Return to Dashboard
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              if (sessionContext) {
                sessionContext.logout();
              } else {
                router.push('/login');
              }
            }}
          >
            Switch Account
          </Button>
        </div>
      </div>
    </div>
  );
}
