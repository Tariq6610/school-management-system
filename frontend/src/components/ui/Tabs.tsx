'use client';

import React, { useRef } from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  ariaLabel?: string;
}

/**
 * Institutional Tabs component adhering to "Underline, not pills".
 * Reference: UI_DESIGN_SYSTEM.md §5
 */
export function Tabs({
  items,
  activeId,
  onChange,
  className = '',
  ariaLabel = 'Navigation tabs',
}: TabsProps) {
  const tabsListRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    const enabledTabs = items.filter((item) => !item.disabled);
    const enabledCurrentIndex = enabledTabs.findIndex((item) => item.id === items[currentIndex].id);

    let nextIndex = -1;
    if (e.key === 'ArrowRight') {
      nextIndex = (enabledCurrentIndex + 1) % enabledTabs.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (enabledCurrentIndex - 1 + enabledTabs.length) % enabledTabs.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = enabledTabs.length - 1;
    }

    if (nextIndex !== -1) {
      e.preventDefault();
      const targetTab = enabledTabs[nextIndex];
      onChange(targetTab.id);

      // Focus target element
      const buttons = tabsListRef.current?.querySelectorAll<HTMLButtonElement>('button[role="tab"]');
      const targetButton = Array.from(buttons ?? []).find(
        (btn) => btn.getAttribute('data-tab-id') === targetTab.id
      );
      targetButton?.focus();
    }
  };

  return (
    <div
      ref={tabsListRef}
      role="tablist"
      aria-label={ariaLabel}
      className={`flex items-center gap-6 border-b border-rule overflow-x-auto no-scrollbar ${className}`}
    >
      {items.map((tab, idx) => {
        const isActive = tab.id === activeId;
        const isDisabled = !!tab.disabled;

        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            data-tab-id={tab.id}
            id={`tab-${tab.id}`}
            aria-controls={`panel-${tab.id}`}
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            disabled={isDisabled}
            onClick={() => !isDisabled && onChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            className={`group inline-flex items-center gap-2 pb-3 pt-1 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 -mb-[1px] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 ${
              isActive
                ? 'border-brand-700 text-brand-700'
                : 'border-transparent text-ink-600 hover:text-ink-900 hover:border-rule'
            }`}
          >
            {tab.icon && (
              <span
                aria-hidden="true"
                className={isActive ? 'text-brand-700' : 'text-ink-400 group-hover:text-ink-600'}
              >
                {tab.icon}
              </span>
            )}
            <span>{tab.label}</span>

            {typeof tab.count === 'number' && (
              <span
                className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-semibold tabular-nums transition-colors ${
                  isActive
                    ? 'bg-brand-100 text-brand-700'
                    : 'bg-canvas text-ink-600 border border-rule group-hover:border-ink-400'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
