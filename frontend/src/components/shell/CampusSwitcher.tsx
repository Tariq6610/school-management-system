'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Campus } from '@/types';
import { listCampuses } from '@/lib/repositories/campuses';
import { useOptionalSession } from '@/components/providers/SessionProvider';
import { NavIcon } from './NavIcon';

export interface CampusSwitcherProps {
  currentCampusName?: string;
  className?: string;
  onCampusChange?: (campus: Campus) => void;
}

/**
 * Institutional Campus Switcher Component.
 * Acceptance criteria:
 * - Selected campus shown in top bar and page title.
 * - Scopes all queries.
 * - Suppressed for single-campus schools per UI_DESIGN_SYSTEM.md §4.
 */
export function CampusSwitcher({
  currentCampusName,
  className = '',
  onCampusChange,
}: CampusSwitcherProps) {
  const sessionContext = useOptionalSession();
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const schoolId = sessionContext?.session?.schoolId;
  const activeCampusId = sessionContext?.session?.campusId;

  useEffect(() => {
    let active = true;
    if (schoolId) {
      listCampuses({ schoolId })
        .then((fetchedCampuses) => {
          if (!active) return;
          setCampuses(fetchedCampuses);
          setHasLoaded(true);
        })
        .catch(() => {
          if (!active) return;
          setHasLoaded(true);
        });
    }
    return () => {
      active = false;
    };
  }, [schoolId]);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Single-campus schools never see the control (UI_DESIGN_SYSTEM.md §4)
  if (hasLoaded && campuses.length <= 1) {
    return null;
  }

  const activeCampus =
    campuses.find((c) => c.id === activeCampusId) ?? campuses[0];
  const activeCampusName =
    activeCampus?.name ?? currentCampusName ?? 'Main Campus';

  const handleSelectCampus = async (campus: Campus) => {
    setIsOpen(false);
    if (campus.id === activeCampusId) return;

    if (sessionContext?.switchCampus) {
      await sessionContext.switchCampus(campus.id);
    }
    onCampusChange?.(campus);
  };

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Switch campus, current campus: ${activeCampusName}`}
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-control bg-ink-50 hover:bg-ink-100 border border-ink-200/70 text-xs font-medium text-ink-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
      >
        <NavIcon name="map-pin" className="w-3.5 h-3.5 text-primary-600 shrink-0" />
        <span className="truncate max-w-[130px] sm:max-w-[180px] font-semibold">
          {activeCampusName}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-ink-500 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label="Campuses"
          className="absolute left-0 sm:right-0 sm:left-auto mt-1.5 w-52 rounded-card bg-surface border border-ink-100 shadow-overlay py-1 z-50 animate-in fade-in"
        >
          <div className="px-3 py-1.5 border-b border-ink-100 text-[10px] uppercase font-semibold text-ink-400 tracking-wider">
            Switch Campus
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {campuses.map((campus) => {
              const isSelected = campus.id === activeCampus?.id;
              return (
                <button
                  key={campus.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectCampus(campus)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 hover:bg-ink-50 transition-colors ${
                    isSelected ? 'text-primary-700 font-semibold bg-primary-50/50' : 'text-ink-700'
                  }`}
                >
                  <div className="truncate">
                    <p className="truncate font-medium">{campus.name}</p>
                    {campus.isPrimary && (
                      <span className="text-[10px] text-ink-400 font-normal">Primary Campus</span>
                    )}
                  </div>
                  {isSelected && (
                    <svg
                      className="w-4 h-4 text-primary-600 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
