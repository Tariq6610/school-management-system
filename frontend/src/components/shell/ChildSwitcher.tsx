'use client';

import React, { useEffect, useState, useRef } from 'react';
import { getChildrenForParent, ParentChildInfo } from '@/lib/repositories/parents';
import { useOptionalSession } from '@/components/providers/SessionProvider';
import { NavIcon } from './NavIcon';

export interface ChildSwitcherProps {
  currentChildName?: string;
  className?: string;
  onChildChange?: (child: ParentChildInfo) => void;
}

/**
 * Institutional Child Switcher Component for Parent Portal.
 * Acceptance criteria: Lists only that parent's children.
 */
export function ChildSwitcher({
  currentChildName,
  className = '',
  onChildChange,
}: ChildSwitcherProps) {
  const sessionContext = useOptionalSession();
  const [children, setChildren] = useState<ParentChildInfo[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const parentUserId = sessionContext?.session?.userId;
  const activeChildId = sessionContext?.session?.activeChildId;

  useEffect(() => {
    let active = true;
    if (parentUserId && sessionContext?.session?.role === 'parent') {
      getChildrenForParent(parentUserId).then((fetchedChildren) => {
        if (!active) return;
        setChildren(fetchedChildren);
      });
    }
    return () => {
      active = false;
    };
  }, [parentUserId, sessionContext?.session?.role]);

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

  const activeChild =
    children.find((c) => c.student.id === activeChildId) ?? children[0];
  const activeChildDisplayName =
    activeChild?.user.name ?? currentChildName ?? 'Select Child';

  // If parent only has 1 child, display static non-dropdown indicator
  if (children.length === 1) {
    return (
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-control bg-primary-50 border border-primary-200 text-xs font-semibold text-primary-800 ${className}`}
      >
        <NavIcon name="user-check" className="w-3.5 h-3.5 text-primary-600 shrink-0" />
        <span className="truncate max-w-[140px] sm:max-w-none">{activeChildDisplayName}</span>
      </div>
    );
  }

  const handleSelectChild = async (child: ParentChildInfo) => {
    setIsOpen(false);
    if (child.student.id === activeChildId) return;

    if (sessionContext?.switchChild) {
      await sessionContext.switchChild(child.student.id);
    }
    onChildChange?.(child);
  };

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Switch child, current child: ${activeChildDisplayName}`}
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-control bg-primary-50 hover:bg-primary-100/70 border border-primary-200 text-xs font-medium text-primary-900 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
      >
        <NavIcon name="user-check" className="w-3.5 h-3.5 text-primary-600 shrink-0" />
        <span className="truncate max-w-[120px] sm:max-w-[160px] font-semibold">
          {activeChildDisplayName}
        </span>
        <svg
          className={`w-3.5 h-3.5 text-primary-600 transition-transform duration-150 ${
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
          aria-label="Linked Children"
          className="absolute left-0 sm:right-0 sm:left-auto mt-1.5 w-56 rounded-card bg-surface border border-ink-100 shadow-overlay py-1 z-50 animate-in fade-in"
        >
          <div className="px-3 py-1.5 border-b border-ink-100 text-[10px] uppercase font-semibold text-ink-400 tracking-wider">
            Switch Child
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            {children.map((child) => {
              const isSelected = child.student.id === activeChild?.student.id;
              return (
                <button
                  key={child.student.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelectChild(child)}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between gap-2 hover:bg-ink-50 transition-colors ${
                    isSelected ? 'text-primary-700 font-semibold bg-primary-50/50' : 'text-ink-700'
                  }`}
                >
                  <div className="truncate">
                    <p className="truncate font-medium">{child.user.name}</p>
                    <p className="text-[10px] text-ink-500 font-normal truncate">
                      Roll: {child.student.rollNumber} · {child.relationship}
                    </p>
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
