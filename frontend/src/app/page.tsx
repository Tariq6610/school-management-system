'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/providers/SessionProvider';
import { useBoot } from '@/components/providers/BootProvider';
import { getRoleDashboardRoute } from '@/lib/auth/auth';

/**
 * Root route.
 * Per context/ROUTE_STRUCTURE.md: "/" redirects to /login, or to the
 * user's role dashboard if a session already exists.
 */
export default function RootPage() {
  const router = useRouter();
  const { isReady } = useBoot();
  const { isAuthenticated, isLoading, role } = useSession();

  useEffect(() => {
    if (!isReady || isLoading) return;

    if (isAuthenticated && role) {
      router.replace(getRoleDashboardRoute(role));
    } else {
      router.replace('/login');
    }
  }, [isReady, isLoading, isAuthenticated, role, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-canvas text-ink-900">
      <div className="h-8 w-8 rounded-full border-2 border-brand-700 border-t-transparent animate-spin" aria-hidden />
      <p className="text-secondary-meta text-ink-500">Loading…</p>
    </main>
  );
}
