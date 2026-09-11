'use client';

import React, { forwardRef, SelectHTMLAttributes, useId } from 'react';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options?: SelectOption[];
  error?: string;
  hint?: string;
  placeholder?: string;
  touchSize?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      options,
      error,
      hint,
      placeholder,
      touchSize = false,
      id: customId,
      required,
      disabled,
      className = '',
      children,
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
          <select
            ref={ref}
            id={id}
            disabled={disabled}
            required={required}
            aria-invalid={hasError ? 'true' : 'false'}
            aria-describedby={hasError ? errorId : hint ? hintId : undefined}
            className={`
              w-full rounded-control border text-body-custom transition-colors duration-150
              bg-surface text-ink-900 appearance-none pr-9 pl-3
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
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>

          {/* Accessible chevron down arrow */}
          <div className="absolute right-3 flex items-center pointer-events-none text-ink-400">
            <svg
              className="w-4 h-4 text-ink-600"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
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

Select.displayName = 'Select';
