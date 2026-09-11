'use client';

import React from 'react';
import { AttendanceStatus } from '@/types';

export interface AttendanceStatusControlProps {
  value: AttendanceStatus;
  onChange: (status: AttendanceStatus) => void;
  disabled?: boolean;
  studentId: string;
  studentName?: string;
}

interface StatusOption {
  status: AttendanceStatus;
  label: string;
  shortLabel: string;
  shortcut: string;
  activeClasses: string;
  inactiveClasses: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  {
    status: 'present',
    label: 'Present',
    shortLabel: 'P',
    shortcut: 'P',
    activeClasses: 'bg-emerald-600 text-white font-bold shadow-xs',
    inactiveClasses: 'text-ink-600 hover:text-emerald-700 hover:bg-emerald-50',
  },
  {
    status: 'absent',
    label: 'Absent',
    shortLabel: 'A',
    shortcut: 'A',
    activeClasses: 'bg-rose-600 text-white font-bold shadow-xs',
    inactiveClasses: 'text-ink-600 hover:text-rose-700 hover:bg-rose-50',
  },
  {
    status: 'late',
    label: 'Late',
    shortLabel: 'L',
    shortcut: 'L',
    activeClasses: 'bg-amber-500 text-white font-bold shadow-xs',
    inactiveClasses: 'text-ink-600 hover:text-amber-700 hover:bg-amber-50',
  },
  {
    status: 'leave',
    label: 'Leave',
    shortLabel: 'Lv',
    shortcut: 'V',
    activeClasses: 'bg-indigo-600 text-white font-bold shadow-xs',
    inactiveClasses: 'text-ink-600 hover:text-indigo-700 hover:bg-indigo-50',
  },
];

export function AttendanceStatusControl({
  value,
  onChange,
  disabled = false,
  studentId,
  studentName,
}: AttendanceStatusControlProps) {
  return (
    <div
      id={`status-${studentId}`}
      role="radiogroup"
      aria-label={`Attendance for ${studentName || 'student'}`}
      className="inline-flex items-center p-1 rounded-lg bg-surface-alt border border-rule h-11 select-none"
    >
      {STATUS_OPTIONS.map((opt) => {
        const isSelected = value === opt.status;
        return (
          <button
            key={opt.status}
            type="button"
            role="radio"
            aria-checked={isSelected}
            disabled={disabled}
            onClick={() => onChange(opt.status)}
            className={`
              h-9 px-3 sm:px-4 rounded-md text-xs transition-all duration-150 flex items-center justify-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500
              ${isSelected ? opt.activeClasses : opt.inactiveClasses}
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            title={`Mark ${opt.label} (${opt.shortcut})`}
          >
            <span className="hidden sm:inline font-medium">{opt.label}</span>
            <span className="sm:hidden font-bold">{opt.shortLabel}</span>
            <kbd className={`hidden md:inline-block text-[10px] font-mono px-1 rounded ${isSelected ? 'bg-white/20 text-white' : 'text-ink-400 bg-surface'}`}>
              {opt.shortcut}
            </kbd>
          </button>
        );
      })}
    </div>
  );
}
