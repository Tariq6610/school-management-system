'use client';

import { useEffect } from 'react';
import { ErrorState } from '@/components/ui/ErrorState';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <ErrorState
        variant="page"
        title="Application Error"
        message="An unexpected error occurred while loading this page. Please try again or contact support if the issue persists."
        onRetry={reset}
        retryLabel="Try again"
        errorDetails={process.env.NODE_ENV === 'development' ? error.message : undefined}
      />
    </div>
  );
}
