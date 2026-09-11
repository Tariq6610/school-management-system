'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Role, User } from '@/types';
import { Avatar, StatusBadge } from '@/components/ui';
import { CampusSwitcher } from './CampusSwitcher';
import { ChildSwitcher } from './ChildSwitcher';
import { useOptionalSession } from '@/components/providers/SessionProvider';
import { NotificationBellTrigger } from '@/components/communication';

export interface TopBarProps {
  role: Role;
  user?: User | null;
  campusName?: string;
  childName?: string;
  pageTitle?: string;
  schoolName?: string;
  className?: string;
}

export function TopBar({
  role,
  user,
  campusName = 'Main Campus',
  childName,
  pageTitle,
  schoolName = 'Beaconhouse Model School',
  className = '',
}: TopBarProps) {
  const sessionContext = useOptionalSession();
  const [profileOpen, setProfileOpen] = useState(false);

  // Synchronize browser document.title with selected campus and page title
  // Acceptance criterion: Selected campus shown in top bar and page title
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const campusPart = campusName ? ` · ${campusName}` : '';
    const schoolPart = schoolName ? ` · ${schoolName}` : '';
    if (pageTitle) {
      document.title = `${pageTitle}${campusPart}${schoolPart}`;
    } else if (campusName) {
      document.title = `${schoolName}${campusPart}`;
    }
  }, [pageTitle, campusName, schoolName]);

  const displayName = user?.name ?? 'Account User';
  const displayEmail = user?.email ?? '';
  const roleLabel = role.replace('_', ' ').toUpperCase();
  const schoolId = sessionContext?.session?.schoolId ?? 'sch_main';
  const recipientId = sessionContext?.session?.userId ?? user?.id ?? (role === 'parent' ? 'usr_parent_khan' : 'usr_teacher_sana');

  return (
    <header
      aria-label="Application Header"
      className={`h-14 border-b border-ink-100 bg-surface/95 backdrop-blur sticky top-0 z-30 px-4 flex items-center justify-between ${className}`}
    >
      {/* Left: Mobile Brand & Context Title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="md:hidden flex items-center gap-2">
          <div className="w-7 h-7 rounded-control bg-primary-600 text-white font-bold flex items-center justify-center text-xs">
            SM
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-ink-900 truncate">
              {pageTitle ?? schoolName}
            </h2>
          </div>
        </div>
      </div>

      {/* Right: Scopes & Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Campus switcher (UI spec §4: always visible in top bar for multi-campus schools) */}
        {role !== 'super_admin' && (
          <CampusSwitcher currentCampusName={campusName} />
        )}

        {/* Parent child switcher (when role is parent) */}
        {role === 'parent' && (
          <ChildSwitcher currentChildName={childName} />
        )}

        {/* Prototype Demo Affordances */}
        <div className="hidden lg:flex items-center gap-1.5">
          <Link
            href="/demo/whatsapp"
            className="px-2 py-1 rounded-control bg-ink-50 hover:bg-ink-100 border border-ink-200/50 text-[11px] font-medium text-ink-700 transition-colors"
          >
            WhatsApp Mock
          </Link>
          <Link
            href="/demo/switch-role"
            className="px-2 py-1 rounded-control bg-pending/10 hover:bg-pending/20 border border-pending/30 text-[11px] font-semibold text-pending transition-colors"
          >
            Switch Role (Demo)
          </Link>
          <Link
            href="/demo/reset"
            className="px-2 py-1 rounded-control bg-late/10 hover:bg-late/20 border border-late/30 text-[11px] font-semibold text-late transition-colors"
          >
            Reset Data (Demo)
          </Link>
        </div>

        {/* Notification Bell */}
        <NotificationBellTrigger
          recipientId={recipientId}
          schoolId={schoolId}
          role={role}
        />

        {/* User Profile Avatar & Dropdown */}
        <div className="relative">
          <button
            type="button"
            aria-expanded={profileOpen}
            aria-label="User profile menu"
            onClick={() => setProfileOpen((prev) => !prev)}
            className="flex items-center gap-1.5 p-1 rounded-control hover:bg-ink-50 transition-colors"
          >
            <Avatar name={displayName} size="sm" />
          </button>

          {profileOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setProfileOpen(false)}
                aria-hidden="true"
              />
              <div
                role="menu"
                aria-label="User Account Menu"
                className="absolute right-0 mt-2 w-56 rounded-card bg-surface border border-ink-100 shadow-overlay p-2 z-50 animate-in fade-in space-y-2"
              >
                <div className="p-2 border-b border-ink-100">
                  <p className="text-xs font-semibold text-ink-900 truncate">{displayName}</p>
                  <p className="text-[11px] text-ink-500 truncate">{displayEmail}</p>
                  <div className="mt-1.5">
                    <StatusBadge status="published" label={roleLabel} size="sm" />
                  </div>
                </div>

                <div className="p-1 space-y-1 text-xs">
                  <Link
                    href="/demo/switch-role"
                    onClick={() => setProfileOpen(false)}
                    className="block px-2.5 py-1.5 rounded-control text-ink-700 hover:bg-ink-50"
                  >
                    Switch Demo Role
                  </Link>
                  <Link
                    href="/demo/reset"
                    onClick={() => setProfileOpen(false)}
                    className="block px-2.5 py-1.5 rounded-control text-ink-700 hover:bg-ink-50"
                  >
                    Reset Prototype Data
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
                      sessionContext?.logout();
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-control text-absent hover:bg-absent/10 font-medium"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
