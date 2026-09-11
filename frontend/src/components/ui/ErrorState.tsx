import React, { useState } from 'react';
import { Button } from './Button';

export interface ErrorStateAction {
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface ErrorStateProps {
  title: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  secondaryAction?: ErrorStateAction;
  variant?: 'card' | 'inline' | 'page';
  errorDetails?: string;
  className?: string;
}

/**
 * Institutional ErrorState component.
 * Acceptance criteria: One reusable set used everywhere.
 * Rule: Say what happened and what to do. Never "Something went wrong."
 * Reference: UI_DESIGN_SYSTEM.md §6
 */
export function ErrorState({
  title,
  message,
  onRetry,
  retryLabel = 'Retry',
  secondaryAction,
  variant = 'card',
  errorDetails,
  className = '',
}: ErrorStateProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Warning/Error alert shield icon
  const alertIcon = (
    <svg
      className={variant === 'inline' ? 'w-5 h-5' : 'w-10 h-10'}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );

  if (variant === 'inline') {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className={`flex items-start gap-3 p-3.5 rounded-control border border-absent/30 bg-absent-bg text-ink-900 ${className}`}
      >
        <div className="text-absent shrink-0 mt-0.5">{alertIcon}</div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-absent">{title}</h4>
          <p className="text-secondary-meta text-ink-600 mt-0.5">{message}</p>

          {errorDetails && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-ink-500 hover:text-ink-800 underline cursor-pointer"
              >
                {showDetails ? 'Hide error details' : 'Show error details'}
              </button>
              {showDetails && (
                <pre className="mt-1 p-2 rounded-control bg-surface border border-rule text-xs text-ink-700 font-mono whitespace-pre-wrap overflow-x-auto">
                  {errorDetails}
                </pre>
              )}
            </div>
          )}
        </div>

        {onRetry && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onRetry}
            className="shrink-0"
          >
            {retryLabel}
          </Button>
        )}
      </div>
    );
  }

  const containerClasses =
    variant === 'page'
      ? 'min-h-[50vh] flex flex-col items-center justify-center p-8 text-center'
      : 'p-8 text-center rounded-card border border-absent/20 bg-surface';

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`${containerClasses} ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-absent-bg text-absent mx-auto flex items-center justify-center mb-3">
        {alertIcon}
      </div>

      <h3 className="text-card-title text-ink-900 font-semibold">{title}</h3>
      <p className="text-secondary-meta text-ink-600 max-w-md mx-auto mt-1.5">
        {message}
      </p>

      {errorDetails && (
        <div className="mt-3 max-w-md mx-auto text-left">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-ink-500 hover:text-ink-800 underline cursor-pointer block mx-auto text-center"
          >
            {showDetails ? 'Hide technical details' : 'Show technical details'}
          </button>
          {showDetails && (
            <pre className="mt-2 p-2.5 rounded-control bg-canvas border border-rule text-xs text-ink-700 font-mono whitespace-pre-wrap overflow-x-auto">
              {errorDetails}
            </pre>
          )}
        </div>
      )}

      {(onRetry || secondaryAction) && (
        <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
          {onRetry && (
            <Button variant="primary" size="md" onClick={onRetry}>
              {retryLabel}
            </Button>
          )}

          {secondaryAction && (
            secondaryAction.href ? (
              <a
                href={secondaryAction.href}
                className={`inline-flex items-center justify-center font-medium rounded-control h-9 px-4 text-body-custom transition-colors shadow-xs ${
                  secondaryAction.variant === 'primary'
                    ? 'bg-brand-700 text-surface hover:bg-brand-600'
                    : 'bg-surface text-ink-900 border border-rule hover:bg-canvas'
                }`}
              >
                {secondaryAction.label}
              </a>
            ) : (
              <Button
                variant={secondaryAction.variant ?? 'secondary'}
                size="md"
                onClick={secondaryAction.onClick}
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
