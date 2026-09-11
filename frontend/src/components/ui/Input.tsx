'use client';

import React, { forwardRef, InputHTMLAttributes, useId } from 'react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  prefixText?: string;
  suffixText?: string;
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
  touchSize?: boolean; // 44px height for mobile/touch views
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      prefixText,
      suffixText,
      prefixIcon,
      suffixIcon,
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
    const heightClass = touchSize ? 'h-11' : 'h-9'; // 36px default vs 44px touch

    return (
      <div className="w-full flex flex-col space-y-1.5">
        {/* Always visible label per UI_DESIGN_SYSTEM.md §5 */}
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
          {prefixIcon && (
            <div className="absolute left-3 flex items-center pointer-events-none text-ink-400">
              {prefixIcon}
            </div>
          )}
          {prefixText && (
            <span className="absolute left-3 text-secondary-meta font-medium text-ink-400 select-none">
              {prefixText}
            </span>
          )}

          <input
            ref={ref}
            id={id}
            disabled={disabled}
            required={required}
            aria-invalid={hasError ? 'true' : 'false'}
            aria-describedby={
              hasError ? errorId : hint ? hintId : undefined
            }
            className={`
              w-full rounded-control border text-body-custom transition-colors duration-150
              bg-surface text-ink-900 placeholder:text-ink-400
              ${heightClass}
              ${prefixIcon || prefixText ? (prefixText ? 'pl-11' : 'pl-9') : 'px-3'}
              ${suffixIcon || suffixText ? (suffixText ? 'pr-11' : 'pr-9') : 'px-3'}
              ${
                hasError
                  ? 'border-absent focus:border-absent focus:ring-2 focus:ring-absent/30 text-ink-900'
                  : 'border-rule hover:border-ink-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20'
              }
              ${
                disabled
                  ? 'bg-canvas text-ink-400 border-rule/80 cursor-not-allowed select-none'
                  : ''
              }
              focus:outline-none
              ${className}
            `}
            {...props}
          />

          {suffixText && (
            <span className="absolute right-3 text-secondary-meta font-medium text-ink-400 select-none">
              {suffixText}
            </span>
          )}
          {suffixIcon && (
            <div className="absolute right-3 flex items-center pointer-events-none text-ink-400">
              {suffixIcon}
            </div>
          )}
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

Input.displayName = 'Input';
