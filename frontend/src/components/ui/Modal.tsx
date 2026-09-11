'use client';

import React, { useId } from 'react';
import { useFocusTrap } from './useFocusTrap';

export type ModalSize = 'sm' | 'md' | 'lg';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: ModalSize;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  closeOnBackdropClick?: boolean;
  className?: string;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm', // ~384px - 400px
  md: 'max-w-lg', // ~512px - 540px
  lg: 'max-w-2xl', // ~672px - 720px
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
  closeOnBackdropClick = true,
  className = '',
}: ModalProps) {
  const generatedId = useId();
  const titleId = `modal-title-${generatedId}`;
  const descId = `modal-desc-${generatedId}`;

  const containerRef = useFocusTrap(isOpen, onClose);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      role="presentation"
    >
      {/* Backdrop with overlay shadow/blur */}
      <div
        className="fixed inset-0 bg-ink-900/40 backdrop-blur-xs transition-opacity"
        aria-hidden="true"
        onClick={() => closeOnBackdropClick && onClose()}
      />

      {/* Modal Card */}
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={`
          relative w-full rounded-card bg-surface border border-rule shadow-overlay
          flex flex-col max-h-[90vh] overflow-hidden z-10 my-auto
          focus:outline-none transition-all
          ${sizeClasses[size]}
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
            aria-label="Close dialog"
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

        {/* Content body */}
        <div className="p-5 overflow-y-auto text-body-custom text-ink-900 space-y-4">
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 p-4 border-t border-rule bg-canvas/30">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
