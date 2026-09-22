'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Role } from '@/types';
import { useSession } from '@/components/providers/SessionProvider';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { getCampus } from '@/lib/repositories/campuses';
import { getStudent } from '@/lib/repositories/students';
import { getUser } from '@/lib/repositories/users';

export interface AppShellProps {
  allowedRoles?: Role[];
  pageTitle?: string;
  children: React.ReactNode;
}

/**
 * Master Application Shell.
 * Acceptance criteria:
 * - Nav differs per role.
 * - Collapses to bottom bar under 768px.
 */
export function AppShell({ allowedRoles, pageTitle, children }: AppShellProps) {
  const { session, user } = useSession();
  const pathname = usePathname();
  const [campusName, setCampusName] = useState<string>('Main Campus');
  const [childName, setChildName] = useState<string | undefined>(undefined);

  const activeRole: Role = session?.role ?? 'student';

  // ── Scroll position save/restore across tab navigations ──────────────────
  // Since AppShell remounts on every page, we manually persist scroll position
  // per-path in sessionStorage so switching tabs feels seamless.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Tell browser not to auto-restore scroll (we do it ourselves)
    history.scrollRestoration = 'manual';

    const key = `__scroll__${pathname}`;

    // Restore saved scroll position after content renders
    const saved = sessionStorage.getItem(key);
    if (saved) {
      const y = parseInt(saved, 10);
      // rAF ensures content is painted before we scroll
      const raf = requestAnimationFrame(() => {
        window.scrollTo({ top: y, behavior: 'instant' });
      });
      return () => {
        cancelAnimationFrame(raf);
        sessionStorage.setItem(key, String(window.scrollY));
      };
    }

    return () => {
      sessionStorage.setItem(key, String(window.scrollY));
    };
  }, [pathname]);
  // ─────────────────────────────────────────────────────────────────────────

  // Load campus name from repository
  useEffect(() => {
    let active = true;
    if (session?.campusId) {
      getCampus(session.campusId).then((campus) => {
        if (!active) return;
        if (campus) {
          setCampusName(campus.name);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [session?.campusId]);

  // Load active child name for parent role
  useEffect(() => {
    let active = true;
    if (session?.role === 'parent' && session.activeChildId) {
      getStudent(session.activeChildId).then(async (student) => {
        if (!active) return;
        if (student) {
          const studentUser = await getUser(student.userId);
          if (!active) return;
          if (studentUser) {
            setChildName(studentUser.name);
          }
        }
      });
    }
    return () => {
      active = false;
    };
  }, [session?.role, session?.activeChildId]);

  const displayChildName = session?.role === 'parent' ? childName : undefined;

  const shellContent = (
    <div className="min-h-screen bg-bg flex text-ink-900 antialiased selection:bg-primary-100 selection:text-primary-800">
      {/* Desktop Sidebar (>= 768px) */}
      <Sidebar role={activeRole} user={user} />

      {/* Main Content Flow */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Bar */}
        <TopBar
          role={activeRole}
          user={user}
          campusName={campusName}
          childName={displayChildName}
          pageTitle={pageTitle}
        />

        {/* Content Viewport */}
        <main className="flex-1 min-w-0 p-4 md:p-6 lg:p-8 pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation (< 768px) */}
      <BottomNav role={activeRole} />
    </div>
  );

  // If allowedRoles is provided, enforce RouteGuard
  if (allowedRoles && allowedRoles.length > 0) {
    return <RouteGuard allowedRoles={allowedRoles}>{shellContent}</RouteGuard>;
  }

  return shellContent;
}
