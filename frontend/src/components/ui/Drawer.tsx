'use client';

import React, { useId } from 'react';
import { useFocusTrap } from './useFocusTrap';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
  closeOnBackdropClick?: boolean;
  className?: string;
}

export function Drawer({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'max-w-md sm:max-w-lg', // default ~448px - 512px; full width on mobile
  closeOnBackdropClick = true,
  className = '',
}: DrawerProps) {
  const generatedId = useId();
  const titleId = `drawer-title-${generatedId}`;
  const descId = `drawer-desc-${generatedId}`;

  const containerRef = useFocusTrap(isOpen, onClose);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="presentation">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-ink-900/40 backdrop-blur-xs transition-opacity"
        aria-hidden="true"
        onClick={() => closeOnBackdropClick && onClose()}
      />

      {/* Drawer slide-over from right */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div
          ref={containerRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descId : undefined}
          tabIndex={-1}
          className={`
            relative w-screen bg-surface border-l border-rule shadow-overlay
            flex flex-col h-full focus:outline-none z-10 transition-transform
            ${width}
            ${className}
          `}
        >
          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-rule bg-canvas/40">
            <div className="space-y-1 pr-4">
              <h2 id={titleId} className="text-section-heading font-semibold text-ink-900">
                {title}
              </h2>
              {description && (
                <p id={descId} className="text-secondary-meta text-ink-600">
                  {description}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close drawer"
              className="
                inline-flex items-center justify-center h-8 w-8 rounded-control
                text-ink-400 hover:text-ink-900 hover:bg-canvas transition-colors
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600
                cursor-pointer shrink-0
              "
            >
              <svg
                className="h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-5 text-body-custom text-ink-900 space-y-4">
            {children}
          </div>

          {/* Optional Footer */}
          {footer && (
            <div className="flex items-center justify-end gap-2 p-4 border-t border-rule bg-canvas/30 shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
