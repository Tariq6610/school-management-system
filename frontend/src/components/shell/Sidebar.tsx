'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Role, User } from '@/types';
import { Avatar, StatusBadge } from '@/components/ui';
import { getRoleNavSections, NavItem } from '@/lib/navigation/nav-items';
import { NavIcon } from './NavIcon';
import { Logo } from './Logo';
import { useOptionalSession } from '@/components/providers/SessionProvider';
import { useBranding } from '@/components/providers/BrandingProvider';

export interface SidebarProps {
  role: Role;
  user?: User | null;
  schoolName?: string;
  className?: string;
}

export function Sidebar({
  role,
  user,
  schoolName,
  className = '',
}: SidebarProps) {
  const pathname = usePathname();
  const sessionContext = useOptionalSession();
  const { schoolName: brandedSchoolName } = useBranding();
  const displaySchoolName = schoolName ?? brandedSchoolName;
  const sections = getRoleNavSections(role);

  const roleLabel = role.replace('_', ' ').toUpperCase();

  const isItemActive = (href: string) => {
    if (!pathname) return false;
    if (pathname === href) return true;
    if (href !== '/' && pathname.startsWith(href + '/')) return true;
    return false;
  };

  const displayName = user?.name ?? 'Account User';
  const displayEmail = user?.email ?? '';

  return (
    <aside
      aria-label="Desktop Primary Navigation"
      className={`hidden md:flex flex-col w-60 shrink-0 border-r border-ink-100 bg-surface min-h-screen sticky top-0 h-screen z-20 ${className}`}
    >
      {/* Header / Brand */}
      <div className="p-4 border-b border-ink-100 flex flex-col gap-1.5">
        <div className="flex items-center gap-2.5">
          <Logo size="md" />
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-semibold text-ink-900 truncate" title={displaySchoolName}>
              {displaySchoolName}
            </h1>
            <p className="text-[11px] text-ink-500 truncate">School Management</p>
          </div>
        </div>

        <div className="pt-1 flex items-center justify-between">
          <StatusBadge
            status="published"
            label={roleLabel}
            size="sm"
            className="text-[10px] tracking-wide py-0.5"
          />
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-5">
        {sections.map((sec, idx) => (
          <div key={sec.sectionTitle ?? idx} className="space-y-1">
            {sec.sectionTitle && (
              <h2 className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 px-2 py-1">
                {sec.sectionTitle}
              </h2>
            )}

            <ul className="space-y-0.5">
              {sec.items.map((item: NavItem) => {
                const active = isItemActive(item.href);
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-2.5 px-2.5 py-2 rounded-control text-sm transition-colors duration-150 ${
                        active
                          ? 'bg-primary-50 text-primary-700 font-semibold'
                          : 'text-ink-700 hover:text-ink-900 hover:bg-ink-50'
                      }`}
                      aria-current={active ? 'page' : undefined}
                    >
                      <NavIcon
                        name={item.iconName}
                        className={`w-4 h-4 shrink-0 ${
                          active ? 'text-primary-700' : 'text-ink-500'
                        }`}
                      />
                      <span className="truncate flex-1">{item.label}</span>
                      {item.badge !== undefined && (
                        <span className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-primary-100 text-primary-800">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer / User & Sign out */}
      <div className="p-3 border-t border-ink-100 bg-surface flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar name={displayName} size="sm" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-ink-900 truncate" title={displayName}>
              {displayName}
            </p>
            <p className="text-[10px] text-ink-500 truncate" title={displayEmail}>
              {displayEmail}
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-label="Sign out"
          title="Sign out"
          onClick={() => sessionContext?.logout()}
          className="p-1.5 rounded-control text-ink-400 hover:text-ink-900 hover:bg-ink-100 transition-colors"
        >
          <NavIcon name="log-out" className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
}
