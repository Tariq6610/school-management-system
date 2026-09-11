import React from 'react';
import { Button } from './Button';

export interface EmptyStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export interface EmptyStateProps {
  title: string;
  description: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  icon?: React.ReactNode;
  compact?: boolean;
  className?: string;
}

/**
 * Institutional EmptyState component.
 * Acceptance criteria: Icon, one line of explanation, one action.
 * Reference: UI_DESIGN_SYSTEM.md §5 & §6
 */
export function EmptyState({
  title,
  description,
  action,
  secondaryAction,
  icon,
  compact = false,
  className = '',
}: EmptyStateProps) {
  const defaultIcon = (
    <svg
      className={compact ? 'w-8 h-8' : 'w-12 h-12'}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    </svg>
  );

  return (
    <div
      role="region"
      aria-label={title}
      className={`flex flex-col items-center justify-center text-center rounded-card border border-dashed border-rule bg-surface ${
        compact ? 'p-5' : 'p-8 sm:p-10'
      } ${className}`}
    >
      <div className="text-ink-400 mb-3 flex items-center justify-center">
        {icon ?? defaultIcon}
      </div>

      <h3 className={`font-semibold text-ink-900 ${compact ? 'text-sm' : 'text-card-title'}`}>
        {title}
      </h3>

      <p className={`text-secondary-meta text-ink-600 max-w-md mt-1 ${compact ? 'text-xs' : ''}`}>
        {description}
      </p>

      {(action || secondaryAction) && (
        <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
          {action && (
            action.href ? (
              <a
                href={action.href}
                className={`inline-flex items-center justify-center font-medium rounded-control transition-colors shadow-xs ${
                  action.variant === 'secondary'
                    ? 'bg-surface text-ink-900 border border-rule hover:bg-canvas'
                    : 'bg-brand-700 text-surface hover:bg-brand-600'
                } ${compact ? 'h-8 px-3 text-secondary-meta' : 'h-9 px-4 text-body-custom'}`}
              >
                {action.label}
              </a>
            ) : (
              <Button
                variant={action.variant ?? 'primary'}
                size={compact ? 'sm' : 'md'}
                onClick={action.onClick}
                disabled={action.disabled}
              >
                {action.label}
              </Button>
            )
          )}

          {secondaryAction && (
            secondaryAction.href ? (
              <a
                href={secondaryAction.href}
                className={`inline-flex items-center justify-center font-medium rounded-control transition-colors shadow-xs ${
                  secondaryAction.variant === 'secondary'
                    ? 'bg-surface text-ink-900 border border-rule hover:bg-canvas'
                    : 'bg-brand-700 text-surface hover:bg-brand-600'
                } ${compact ? 'h-8 px-3 text-secondary-meta' : 'h-9 px-4 text-body-custom'}`}
              >
                {secondaryAction.label}
              </a>
            ) : (
              <Button
                variant={secondaryAction.variant ?? 'secondary'}
                size={compact ? 'sm' : 'md'}
                onClick={secondaryAction.onClick}
                disabled={secondaryAction.disabled}
              >
                {secondaryAction.label}
              </Button>
            )
          )}
        </div>
      )}
    </div>
  );
}
