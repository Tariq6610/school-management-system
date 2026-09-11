'use client';

import React, { forwardRef, InputHTMLAttributes, useId } from 'react';

export interface DatePickerProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string;
  hint?: string;
  touchSize?: boolean;
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  (
    {
      label,
      error,
      hint,
      touchSize = false,
      id: customId,
      required,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = customId || generatedId;
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

    const hasError = Boolean(error);
    const heightClass = touchSize ? 'h-11' : 'h-9';

    return (
      <div className="w-full flex flex-col space-y-1.5">
        {/* Label always visible */}
        <label
          htmlFor={id}
          className={`text-secondary-meta font-medium select-none ${
            disabled ? 'text-ink-400' : 'text-ink-900'
          }`}
        >
          {label}
          {required && <span className="text-absent ml-1" aria-hidden="true">*</span>}
        </label>

        <div className="relative flex items-center w-full">
          <input
            ref={ref}
            type="date"
            id={id}
            disabled={disabled}
            required={required}
            aria-invalid={hasError ? 'true' : 'false'}
            aria-describedby={hasError ? errorId : hint ? hintId : undefined}
            className={`
              w-full rounded-control border text-body-custom transition-colors duration-150
              bg-surface text-ink-900 px-3 pr-9 tabular-nums
              ${heightClass}
              ${
                hasError
                  ? 'border-absent focus:border-absent focus:ring-2 focus:ring-absent/30'
                  : 'border-rule hover:border-ink-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20'
              }
              ${
                disabled
                  ? 'bg-canvas text-ink-400 border-rule/80 cursor-not-allowed select-none'
                  : 'cursor-pointer'
              }
              focus:outline-none
              ${className}
            `}
            {...props}
          />

          <div className="absolute right-3 flex items-center pointer-events-none text-ink-400">
            <svg
              className="w-4 h-4 text-ink-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.75}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
              />
            </svg>
          </div>
        </div>

        {hasError && (
          <p id={errorId} role="alert" className="text-secondary-meta text-absent font-medium mt-1">
            {error}
          </p>
        )}

        {!hasError && hint && (
          <p id={hintId} className="text-secondary-meta text-ink-600 mt-1">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

DatePicker.displayName = 'DatePicker';
