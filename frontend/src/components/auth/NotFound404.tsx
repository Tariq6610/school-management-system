'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button, StatusBadge } from '@/components/ui';

export interface NotFound404Props {
  resourceName?: string;
  recordId?: string;
  returnHref?: string;
  returnLabel?: string;
  message?: string;
  className?: string;
}

/**
 * Institutional 404 Out-of-Scope Component.
 * Acceptance criteria: Out-of-scope record → 404.
 */
export function NotFound404({
  resourceName = 'Record',
  recordId,
  returnHref,
  returnLabel = 'Return to Overview',
  message,
  className = '',
}: NotFound404Props) {
  const router = useRouter();

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`min-h-[50vh] flex flex-col items-center justify-center p-6 text-center ${className}`}
    >
      <div className="max-w-md w-full p-8 rounded-card bg-surface border border-late/30 shadow-overlay space-y-5">
        <div className="flex items-center justify-center gap-2">
          <StatusBadge status="late" label="404 Not Found" size="md" />
        </div>

        <div>
          <h2 className="text-card-title text-ink-900 font-semibold text-lg">
            {`${resourceName} Not Found or Out of Scope`}
          </h2>
          <p className="text-secondary-meta text-ink-600 mt-2">
            {message ??
              `The requested ${resourceName.toLowerCase()} record is not available or is outside your current authorized campus/school scope.`}
          </p>
          {recordId && (
            <p className="text-xs text-ink-400 font-mono mt-1">ID: {recordId}</p>
          )}
        </div>

        <div className="pt-2 flex items-center justify-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              if (returnHref) {
                router.push(returnHref);
              } else {
                router.back();
              }
            }}
          >
            {returnLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
