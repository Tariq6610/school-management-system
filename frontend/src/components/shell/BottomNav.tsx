'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Role } from '@/types';
import { Drawer } from '@/components/ui';
import { getMobileNavItems, NavItem } from '@/lib/navigation/nav-items';
import { NavIcon } from './NavIcon';
import { useOptionalSession } from '@/components/providers/SessionProvider';

export interface BottomNavProps {
  role: Role;
  className?: string;
}

/**
 * Mobile Bottom Navigation Bar (< 768px).
 * Acceptance Criteria: Collapses to bottom bar under 768px; at most 5 items.
 */
export function BottomNav({ role, className = '' }: BottomNavProps) {
  const pathname = usePathname();
  const sessionContext = useOptionalSession();
  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false);

  const { primary, more } = getMobileNavItems(role);

  const isItemActive = (href: string) => {
    if (!pathname) return false;
    if (pathname === href) return true;
    if (href !== '/' && pathname.startsWith(href + '/')) return true;
    return false;
  };

  const isAnyMoreActive = more.some((item) => isItemActive(item.href));

  return (
    <>
      <nav
        aria-label="Mobile Bottom Navigation"
        className={`md:hidden fixed bottom-0 inset-x-0 h-16 bg-surface border-t border-ink-100 z-40 flex items-center justify-around px-2 shadow-sm ${className}`}
      >
        {primary.map((item: NavItem) => {
          const active = isItemActive(item.href);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center min-h-[44px] py-1 px-1 rounded-control transition-colors ${
                active ? 'text-primary-700 font-semibold' : 'text-ink-500 hover:text-ink-800'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <NavIcon
                name={item.iconName}
                className={`w-5 h-5 mb-0.5 ${active ? 'text-primary-700' : 'text-ink-400'}`}
              />
              <span className="text-[10px] leading-tight truncate max-w-[64px] text-center">
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* 5th slot: 'More' button if role has additional modules */}
        {more.length > 0 && (
          <button
            type="button"
            aria-label="More navigation options"
            aria-expanded={moreDrawerOpen}
            onClick={() => setMoreDrawerOpen(true)}
            className={`flex-1 flex flex-col items-center justify-center min-h-[44px] py-1 px-1 rounded-control transition-colors ${
              isAnyMoreActive ? 'text-primary-700 font-semibold' : 'text-ink-500 hover:text-ink-800'
            }`}
          >
            <NavIcon
              name="more-horizontal"
              className={`w-5 h-5 mb-0.5 ${isAnyMoreActive ? 'text-primary-700' : 'text-ink-400'}`}
            />
            <span className="text-[10px] leading-tight truncate max-w-[64px] text-center">
              More
            </span>
          </button>
        )}
      </nav>

      {/* Slide-over Drawer for 'More' items on mobile */}
      {more.length > 0 && (
        <Drawer
          isOpen={moreDrawerOpen}
          onClose={() => setMoreDrawerOpen(false)}
          title="More Modules"
        >
          <div className="space-y-4 pt-2">
            <ul className="space-y-1">
              {more.map((item: NavItem) => {
                const active = isItemActive(item.href);
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      onClick={() => setMoreDrawerOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-control text-sm transition-colors ${
                        active
                          ? 'bg-primary-50 text-primary-700 font-semibold'
                          : 'text-ink-700 hover:text-ink-900 hover:bg-ink-50'
                      }`}
                      aria-current={active ? 'page' : undefined}
                    >
                      <NavIcon
                        name={item.iconName}
                        className={`w-5 h-5 ${active ? 'text-primary-700' : 'text-ink-400'}`}
                      />
                      <span className="flex-1 font-medium">{item.label}</span>
                      {item.badge !== undefined && (
                        <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-primary-100 text-primary-800">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>

            <div className="pt-4 border-t border-ink-100 space-y-2">
              <Link
                href="/login"
                onClick={() => setMoreDrawerOpen(false)}
                className="block text-center py-2 px-3 rounded-control text-xs font-medium text-ink-700 bg-ink-50 hover:bg-ink-100"
              >
                Switch Role / Account
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMoreDrawerOpen(false);
                  sessionContext?.logout();
                }}
                className="w-full text-center py-2 px-3 rounded-control text-xs font-semibold text-absent bg-absent/10 hover:bg-absent/20"
              >
                Sign Out
              </button>
            </div>
          </div>
        </Drawer>
      )}
    </>
  );
}
