'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastOptions {
  type: ToastType;
  title: string;
  message?: string;
  /**
   * Optional duration in ms. If omitted, defaults to 4000ms for 'success' & 'info'.
   * For 'error', duration defaults to 0 (persistent until user manually dismisses).
   */
  duration?: number;
}

export interface ToastRecord extends ToastOptions {
  id: string;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => string;
  dismissToast: (id: string) => void;
  toasts: ToastRecord[];
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_THEMES = {
  success: {
    border: 'border-l-4 border-l-present border-rule',
    iconColor: 'text-present',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    ariaRole: 'status' as const,
  },
  error: {
    border: 'border-l-4 border-l-absent border-rule',
    iconColor: 'text-absent',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    ariaRole: 'alert' as const,
  },
  info: {
    border: 'border-l-4 border-l-accent-700 border-rule',
    iconColor: 'text-accent-700',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
    ariaRole: 'status' as const,
  },
};

/**
 * Presentational Toast item component.
 */
export function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastRecord;
  onDismiss: (id: string) => void;
}) {
  const theme = TOAST_THEMES[toast.type];

  return (
    <div
      role={theme.ariaRole}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      className={`pointer-events-auto flex items-start gap-3 p-3.5 bg-surface rounded-control border shadow-overlay transition-all max-w-sm w-full ${theme.border}`}
    >
      <div className={`shrink-0 mt-0.5 ${theme.iconColor}`}>{theme.icon}</div>
      <div className="flex-1 min-w-0 pr-1">
        <h4 className="text-sm font-semibold text-ink-900 leading-snug truncate">
          {toast.title}
        </h4>
        {toast.message && (
          <p className="text-secondary-meta text-ink-600 mt-0.5 line-clamp-3">
            {toast.message}
          </p>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 p-1 text-ink-400 hover:text-ink-900 rounded-control hover:bg-canvas transition-colors cursor-pointer"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

/**
 * Toast Provider managing application-wide toast notifications.
 * Auto-dismisses success & info after 4s; keeps error persistent until manually dismissed.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ type, title, message, duration }: ToastOptions) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const toastRecord: ToastRecord = { id, type, title, message, duration };

      setToasts((prev) => [...prev, toastRecord]);

      // Auto-dismiss logic:
      // Errors persist by default (duration = 0).
      // Success and Info auto-dismiss after 4000ms unless explicitly specified.
      const defaultDuration = type === 'error' ? 0 : 4000;
      const effectiveDuration = duration !== undefined ? duration : defaultDuration;

      if (effectiveDuration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, effectiveDuration);
      }

      return id;
    },
    [dismissToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, dismissToast, toasts }}>
      {children}
      {/* Fixed bottom-right notification stack */}
      <div
        aria-label="Notifications"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Hook to trigger toast notifications anywhere in the app.
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

/**
 * Optional hook that returns null if outside a ToastProvider, avoiding test crashes.
 */
export function useOptionalToast() {
  return useContext(ToastContext);
}
