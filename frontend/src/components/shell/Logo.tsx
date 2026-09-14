'use client';

import React, { useState } from 'react';
import { useBranding } from '@/components/providers/BrandingProvider';

export interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<LogoProps['size']>, string> = {
  sm: 'w-7 h-7 rounded-[8px] text-xs',
  md: 'w-9 h-9 rounded-control text-sm',
  lg: 'w-12 h-12 rounded-card text-lg',
};

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'S';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Institutional logo mark: renders the school's real, uploaded logo image
 * when one is set, falling back to a simple initials badge in the current
 * theme's primary color (never a broken image, and always in sync with
 * whatever accent color Design Studio has configured — no separate,
 * possibly mismatched, static image).
 */
export function Logo({ size = 'md', className = '' }: LogoProps) {
  const { schoolName, logoUrl } = useBranding();
  const [imageFailed, setImageFailed] = useState(false);

  const showImage = !!logoUrl && !imageFailed;
  const sizeClass = SIZE_CLASSES[size];

  if (showImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={`${schoolName} logo`}
        className={`${sizeClass} object-cover shrink-0 ${className}`}
        onError={() => setImageFailed(true)}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} shrink-0 flex items-center justify-center font-bold text-white bg-brand-700 shadow-sm ${className}`}
      aria-label={`${schoolName} logo`}
      role="img"
    >
      {getInitials(schoolName)}
    </div>
  );
}
