'use client';

import React, { forwardRef, TextareaHTMLAttributes, useId, useState } from 'react';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
  showCount?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      hint,
      showCount = false,
      maxLength,
      id: customId,
      required,
      disabled,
      className = '',
      value,
      defaultValue,
      onChange,
      rows = 3,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = customId || generatedId;
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

    const [charCount, setCharCount] = useState<number>(() => {
      if (typeof value === 'string') return value.length;
      if (typeof defaultValue === 'string') return defaultValue.length;
      return 0;
    });

    const hasError = Boolean(error);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharCount(e.target.value.length);
      onChange?.(e);
    };

    return (
      <div className="w-full flex flex-col space-y-1.5">
        {/* Label always visible */}
        <div className="flex items-center justify-between">
          <label
            htmlFor={id}
            className={`text-secondary-meta font-medium select-none ${
              disabled ? 'text-ink-400' : 'text-ink-900'
            }`}
          >
            {label}
            {required && <span className="text-absent ml-1" aria-hidden="true">*</span>}
          </label>
          {showCount && maxLength && (
            <span className="text-secondary-meta text-ink-400 tabular-nums">
              {charCount} / {maxLength}
            </span>
          )}
        </div>

        <textarea
          ref={ref}
          id={id}
          rows={rows}
          maxLength={maxLength}
          disabled={disabled}
          required={required}
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          aria-invalid={hasError ? 'true' : 'false'}
          aria-describedby={hasError ? errorId : hint ? hintId : undefined}
          className={`
            w-full rounded-control border text-body-custom transition-colors duration-150
            bg-surface text-ink-900 p-3 placeholder:text-ink-400
            ${
              hasError
                ? 'border-absent focus:border-absent focus:ring-2 focus:ring-absent/30'
                : 'border-rule hover:border-ink-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20'
            }
            ${
              disabled
                ? 'bg-canvas text-ink-400 border-rule/80 cursor-not-allowed select-none'
                : ''
            }
            focus:outline-none resize-y
            ${className}
          `}
          {...props}
        />

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

Textarea.displayName = 'Textarea';
