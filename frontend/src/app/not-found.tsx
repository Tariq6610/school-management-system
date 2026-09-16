'use client';

import { ErrorState } from '@/components/ui/ErrorState';

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-6">
      <ErrorState
        variant="page"
        title="Page Not Found"
        message="The page you are looking for does not exist or you do not have permission to access it."
        retryLabel="Return Home"
        onRetry={() => {
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.assign('/');
        }}
      />
    </div>
  );
}
