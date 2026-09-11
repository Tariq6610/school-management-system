import React from 'react';

export type StatusType =
  // Attendance statuses
  | 'present'
  | 'absent'
  | 'late'
  | 'leave'
  | 'excused'
  // Fee / invoice statuses
  | 'paid'
  | 'pending'
  | 'overdue'
  | 'partial'
  | 'cancelled'
  // Content / Record lifecycle statuses
  | 'draft'
  | 'published'
  | 'active'
  | 'inactive'
  | 'submitted'
  | 'failed'
  // Exam statuses
  | 'marks_entered';

export interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  size?: 'sm' | 'md';
  showGlyph?: boolean;
  className?: string;
}

interface StatusConfig {
  defaultLabel: string;
  glyph: string;
  colorClass: string;
  ariaDescription: string;
}

const STATUS_CONFIGS: Record<StatusType, StatusConfig> = {
  // Present Family (Teal/Emerald Green)
  present: {
    defaultLabel: 'Present',
    glyph: '✓',
    colorClass: 'bg-present-bg text-present border-present/25',
    ariaDescription: 'Present',
  },
  paid: {
    defaultLabel: 'Paid',
    glyph: '✓',
    colorClass: 'bg-present-bg text-present border-present/25',
    ariaDescription: 'Paid in full',
  },
  published: {
    defaultLabel: 'Published',
    glyph: '✓',
    colorClass: 'bg-present-bg text-present border-present/25',
    ariaDescription: 'Published',
  },
  active: {
    defaultLabel: 'Active',
    glyph: '✓',
    colorClass: 'bg-present-bg text-present border-present/25',
    ariaDescription: 'Active status',
  },
  submitted: {
    defaultLabel: 'Submitted',
    glyph: '✓',
    colorClass: 'bg-present-bg text-present border-present/25',
    ariaDescription: 'Submitted',
  },
  marks_entered: {
    defaultLabel: 'Marks Entered',
    glyph: '✎',
    colorClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    ariaDescription: 'Marks have been entered',
  },

  // Absent Family (Crimson / Deep Coral)
  absent: {
    defaultLabel: 'Absent',
    glyph: '✕',
    colorClass: 'bg-absent-bg text-absent border-absent/25',
    ariaDescription: 'Absent without leave',
  },
  overdue: {
    defaultLabel: 'Overdue',
    glyph: '✕',
    colorClass: 'bg-absent-bg text-absent border-absent/25',
    ariaDescription: 'Overdue payment',
  },
  failed: {
    defaultLabel: 'Failed',
    glyph: '✕',
    colorClass: 'bg-absent-bg text-absent border-absent/25',
    ariaDescription: 'Failed',
  },
  inactive: {
    defaultLabel: 'Inactive',
    glyph: '✕',
    colorClass: 'bg-absent-bg text-absent border-absent/25',
    ariaDescription: 'Inactive',
  },

  // Late Family (Amber / Ochre)
  late: {
    defaultLabel: 'Late',
    glyph: '⏱',
    colorClass: 'bg-late-bg text-late border-late/25',
    ariaDescription: 'Arrived late',
  },
  pending: {
    defaultLabel: 'Pending',
    glyph: '⏱',
    colorClass: 'bg-late-bg text-late border-late/25',
    ariaDescription: 'Pending action',
  },
  partial: {
    defaultLabel: 'Partial',
    glyph: '⏱',
    colorClass: 'bg-late-bg text-late border-late/25',
    ariaDescription: 'Partially paid',
  },

  // Leave Family (Slate / Neutral Ink)
  leave: {
    defaultLabel: 'On Leave',
    glyph: '—',
    colorClass: 'bg-leave-bg text-leave border-leave/25',
    ariaDescription: 'Approved leave of absence',
  },
  excused: {
    defaultLabel: 'Excused',
    glyph: '—',
    colorClass: 'bg-leave-bg text-leave border-leave/25',
    ariaDescription: 'Excused absence',
  },
  draft: {
    defaultLabel: 'Draft',
    glyph: '—',
    colorClass: 'bg-leave-bg text-leave border-leave/25',
    ariaDescription: 'Draft revision',
  },
  cancelled: {
    defaultLabel: 'Cancelled',
    glyph: '—',
    colorClass: 'bg-leave-bg text-leave border-leave/25',
    ariaDescription: 'Cancelled',
  },
};

const SIZE_CLASSES = {
  sm: 'px-2 py-0.5 text-xs gap-1',
  md: 'px-2.5 py-1 text-secondary-meta gap-1.5',
};

/**
 * Institutional StatusBadge component.
 * Acceptance criteria: Shows label + colour, never colour alone.
 * Reference: UI_DESIGN_SYSTEM.md §2 & §5
 */
export function StatusBadge({
  status,
  label,
  size = 'md',
  showGlyph = true,
  className = '',
}: StatusBadgeProps) {
  const config = STATUS_CONFIGS[status] ?? {
    defaultLabel: status,
    glyph: '•',
    colorClass: 'bg-leave-bg text-leave border-leave/25',
    ariaDescription: status,
  };

  const displayText = label ?? config.defaultLabel;

  return (
    <span
      role="status"
      aria-label={`${displayText} (${config.ariaDescription})`}
      className={`inline-flex items-center font-medium rounded-control border shrink-0 select-none ${config.colorClass} ${SIZE_CLASSES[size]} ${className}`}
    >
      {showGlyph && (
        <span aria-hidden="true" className="font-bold leading-none">
          {config.glyph}
        </span>
      )}
      <span className="truncate">{displayText}</span>
    </span>
  );
}
