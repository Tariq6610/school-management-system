import React from 'react';

export interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'control' | 'card' | 'full' | 'none';
}

/**
 * Base Skeleton primitive matching institutional design tokens.
 * Reference: UI_DESIGN_SYSTEM.md §6
 */
export function Skeleton({
  className = '',
  width,
  height,
  rounded = 'control',
}: SkeletonProps) {
  const roundedClass =
    rounded === 'card'
      ? 'rounded-card'
      : rounded === 'full'
      ? 'rounded-full'
      : rounded === 'none'
      ? 'rounded-none'
      : 'rounded-control';

  const style: React.CSSProperties = {
    width: width !== undefined ? width : undefined,
    height: height !== undefined ? height : undefined,
  };

  return (
    <div
      aria-hidden="true"
      style={style}
      className={`bg-rule/70 motion-safe:animate-pulse shrink-0 ${roundedClass} ${className}`}
    />
  );
}

/**
 * Multi-line text skeleton placeholder.
 */
export function SkeletonText({
  lines = 3,
  className = '',
  lineHeight = 'h-3.5',
}: {
  lines?: number;
  className?: string;
  lineHeight?: string;
}) {
  const widths = ['w-full', 'w-[92%]', 'w-[75%]', 'w-[85%]', 'w-[60%]'];

  return (
    <div aria-hidden="true" className={`space-y-2.5 ${className}`}>
      {Array.from({ length: lines }).map((_, idx) => (
        <Skeleton
          key={idx}
          className={`${lineHeight} ${widths[idx % widths.length]}`}
        />
      ))}
    </div>
  );
}

/**
 * Metric/StatCard skeleton matching StatCard.tsx structure.
 */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-card bg-surface border border-rule p-4 space-y-3 ${className}`}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-4 rounded-full" />
      </div>

      <div className="flex items-baseline gap-2 pt-1">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-5 w-14" />
      </div>

      <Skeleton className="h-3 w-36" />
    </div>
  );
}

/**
 * Table skeleton matching Table.tsx layout.
 */
export function SkeletonTable({
  rows = 5,
  columns = 4,
  className = '',
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-card border border-rule bg-surface overflow-hidden ${className}`}
    >
      {/* Header bar skeleton */}
      <div className="flex items-center gap-4 bg-canvas/90 px-4 py-3 border-b border-rule">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`th-${i}`} className="h-4 flex-1 max-w-[120px]" />
        ))}
      </div>

      {/* Row skeletons */}
      <div className="divide-y divide-rule/60">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div key={`tr-${rowIdx}`} className="flex items-center gap-4 px-4 py-3.5">
            {Array.from({ length: columns }).map((_, colIdx) => (
              <Skeleton
                key={`td-${rowIdx}-${colIdx}`}
                className={`h-4 flex-1 ${colIdx === 0 ? 'max-w-[140px]' : 'max-w-[100px]'}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Single row skeleton for list or table incremental loading.
 */
export function SkeletonRow({
  columns = 4,
  className = '',
}: {
  columns?: number;
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={`flex items-center gap-4 py-3 px-4 ${className}`}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
  );
}

/**
 * Student / Teacher profile header skeleton with avatar and details.
 */
export function SkeletonProfile({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`flex items-center gap-4 p-4 rounded-card bg-surface border border-rule ${className}`}
    >
      <Skeleton rounded="full" className="w-12 h-12 shrink-0" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3.5 w-64" />
      </div>
    </div>
  );
}
