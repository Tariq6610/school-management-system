'use client';

import React, { useState } from 'react';

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_MAP = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base font-semibold',
};

// 8 accessible, curated color pairs harmonized with the design system tokens
const DETERMINISTIC_PALETTE = [
  { bg: 'bg-[#EDE9FB]', text: 'text-[#4B2FA8]', border: 'border-[#4B2FA8]/20' }, // Brand Iris
  { bg: 'bg-[#E4EEF7]', text: 'text-[#1D5F96]', border: 'border-[#1D5F96]/20' }, // Secondary Blue
  { bg: 'bg-[#E3F3EE]', text: 'text-[#17795E]', border: 'border-[#17795E]/20' }, // Present Emerald
  { bg: 'bg-[#FDF1DC]', text: 'text-[#9A6206]', border: 'border-[#9A6206]/20' }, // Late Amber
  { bg: 'bg-[#FBE9E7]', text: 'text-[#B4322A]', border: 'border-[#B4322A]/20' }, // Coral
  { bg: 'bg-[#F3E8FF]', text: 'text-[#7E22CE]', border: 'border-[#7E22CE]/20' }, // Violet
  { bg: 'bg-[#E0F2FE]', text: 'text-[#0369A1]', border: 'border-[#0369A1]/20' }, // Sky Blue
  { bg: 'bg-[#EDEFF3]', text: 'text-[#4A5265]', border: 'border-[#4A5265]/20' }, // Slate Neutral
];

/**
 * Deterministically pick an avatar color based on the person's name.
 */
export function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % DETERMINISTIC_PALETTE.length;
  return DETERMINISTIC_PALETTE[index];
}

/**
 * Extract 1-2 letter uppercase initials from a person's name.
 */
export function getInitials(name: string): string {
  if (!name) return '?';
  const clean = name.trim().replace(/^(mr\.|mrs\.|ms\.|dr\.|prof\.)\s+/i, '');
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * Institutional Avatar component.
 * Features automatic initials fallback with a deterministic palette.
 * Reference: UI_DESIGN_SYSTEM.md §5
 */
export function Avatar({
  name,
  src,
  size = 'md',
  className = '',
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  const color = getAvatarColor(name || 'Unknown');
  const initials = getInitials(name || 'Unknown');
  const sizeClass = SIZE_MAP[size];

  return (
    <div
      role="img"
      aria-label={name}
      className={`relative inline-flex items-center justify-center rounded-full select-none shrink-0 font-medium overflow-hidden border ${color.border} ${color.bg} ${color.text} ${sizeClass} ${className}`}
    >
      {src && !imageError ? (
        // Using regular img tag for local offline prototype reliability
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <span aria-hidden="true" className="leading-none">
          {initials}
        </span>
      )}
    </div>
  );
}
