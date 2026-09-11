'use client';

import React from 'react';
import { ISODate } from '@/types';

export interface AttendanceSummaryBarProps {
  classNameTitle: string;
  campusName: string;
  date: ISODate;
  onDateChange: (newDate: ISODate) => void;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  leaveCount: number;
  totalStudents: number;
  percentage: number;
  markedByName?: string;
  markedAt?: string;
  editedByName?: string;
  editedAt?: string;
  canEdit?: boolean;
}

export function AttendanceSummaryBar({
  classNameTitle,
  campusName,
  date,
  onDateChange,
  presentCount,
  absentCount,
  lateCount,
  leaveCount,
  totalStudents,
  percentage,
  markedByName,
  markedAt,
  editedByName,
  editedAt,
  canEdit = true,
}: AttendanceSummaryBarProps) {
  const formattedDate = new Date(date).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="bg-surface rounded-xl border border-rule p-4 sm:p-5 shadow-xs space-y-4">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rule pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-ink-900">{classNameTitle}</h1>
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-surface-alt border border-rule text-ink-600">
              {campusName}
            </span>
          </div>
          <p className="text-xs text-ink-500 mt-0.5">
            Daily Attendance Register · {formattedDate}
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="attendance-date" className="text-xs font-medium text-ink-700 sr-only">
            Attendance Date
          </label>
          <input
            id="attendance-date"
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            className="h-9 px-3 rounded-md text-xs font-mono bg-surface-alt border border-rule text-ink-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* Live Metric Tally Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
          {/* Present Chip */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="font-semibold text-sm font-mono">{presentCount}</span>
            <span className="text-ink-600">Present</span>
          </div>

          {/* Absent Chip */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-800 border border-rose-200">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="font-semibold text-sm font-mono">{absentCount}</span>
            <span className="text-ink-600">Absent</span>
          </div>

          {/* Late Chip */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="font-semibold text-sm font-mono">{lateCount}</span>
            <span className="text-ink-600">Late</span>
          </div>

          {/* Leave Chip */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="font-semibold text-sm font-mono">{leaveCount}</span>
            <span className="text-ink-600">Leave</span>
          </div>

          {/* Presence Rate */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-alt text-ink-800 border border-rule">
            <span className="text-ink-500">Presence:</span>
            <span className="font-bold text-sm font-mono text-brand-700">
              {percentage.toFixed(1)}%
            </span>
            <span className="text-[11px] text-ink-400">({presentCount + lateCount}/{totalStudents})</span>
          </div>
        </div>

        {/* Audit Metadata & Status */}
        <div className="text-xs text-ink-500 flex items-center gap-2">
          {markedByName && (
            <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50/70 px-2 py-0.5 rounded border border-emerald-200/60 text-[11px]">
              ✓ Marked by {markedByName}
              {markedAt && ` on ${new Date(markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
            </span>
          )}
          {editedByName && (
            <span className="inline-flex items-center gap-1 text-ink-600 bg-surface-alt px-2 py-0.5 rounded border border-rule text-[11px]">
              (Edited by {editedByName}
              {editedAt && ` on ${new Date(editedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`})
            </span>
          )}
          {!canEdit && (
            <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px] font-medium">
              🔒 Read Only (Edit Window Closed)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
