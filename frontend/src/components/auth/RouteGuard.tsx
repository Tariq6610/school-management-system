'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Role } from '@/types';
import { useSession } from '@/components/providers/SessionProvider';
import { SkeletonCard, SkeletonTable } from '@/components/ui';
import { Forbidden403 } from './Forbidden403';

export interface RouteGuardProps {
  allowedRoles: Role[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Route protection component for Next.js app pages and layouts.
 * Enforces role access control:
 * - Loading: Displays content skeletons.
 * - Unauthenticated: Redirects to /login.
 * - Wrong role: Renders 403 Forbidden.
 * - Authorized: Renders children.
 */
export function RouteGuard({ allowedRoles, children, fallback }: RouteGuardProps) {
  const router = useRouter();
  const { session, isAuthenticated, isLoading } = useSession();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4 max-w-5xl mx-auto animate-pulse">
        <SkeletonCard />
        <SkeletonTable rows={4} columns={4} />
      </div>
    );
  }

  if (!isAuthenticated || !session) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-6">
        <p className="text-secondary-meta text-ink-600">
          Redirecting to authentication portal...
        </p>
      </div>
    );
  }

  if (!allowedRoles.includes(session.role)) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <Forbidden403 allowedRoles={allowedRoles} currentRole={session.role} />;
  }

  return <>{children}</>;
}
