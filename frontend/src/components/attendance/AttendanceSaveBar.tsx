'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { NavIcon } from '@/components/shell/NavIcon';

export interface AttendanceSaveBarProps {
  presentCount: number;
  absentCount: number;
  lateCount: number;
  leaveCount: number;
  totalStudents: number;
  isSaving: boolean;
  canEdit?: boolean;
  onSave: () => void;
  onMarkAllPresent: () => void;
}

export function AttendanceSaveBar({
  presentCount,
  absentCount,
  lateCount,
  leaveCount,
  totalStudents,
  isSaving,
  canEdit = true,
  onSave,
  onMarkAllPresent,
}: AttendanceSaveBarProps) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3.5 bg-surface/95 backdrop-blur-md border-t border-rule shadow-lg transition-all">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left Side: Summary Tally */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-ink-900">Total: {totalStudents}</span>
          <span className="text-ink-400">·</span>
          <span className="text-emerald-700 font-medium">{presentCount} Present</span>
          <span className="text-ink-400">·</span>
          <span className={`${absentCount > 0 ? 'text-rose-700 font-bold' : 'text-ink-500'}`}>
            {absentCount} Absent
          </span>
          {lateCount > 0 && (
            <>
              <span className="text-ink-400">·</span>
              <span className="text-amber-700 font-medium">{lateCount} Late</span>
            </>
          )}
          {leaveCount > 0 && (
            <>
              <span className="text-ink-400">·</span>
              <span className="text-indigo-700 font-medium">{leaveCount} Leave</span>
            </>
          )}
        </div>

        {/* Right Side: Actions */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {canEdit && (
            <Button
              variant="secondary"
              size="md"
              type="button"
              onClick={onMarkAllPresent}
              disabled={isSaving}
              className="text-xs h-11"
            >
              Mark All Present
            </Button>
          )}

          <Button
            variant={canEdit ? 'primary' : 'secondary'}
            size="md"
            type="button"
            onClick={onSave}
            disabled={isSaving || !canEdit}
            isLoading={isSaving}
            className="h-11 px-6 text-sm font-semibold shadow-sm disabled:cursor-not-allowed"
            title={!canEdit ? 'Attendance register is locked because the edit window has expired.' : 'Save changes (Ctrl+S)'}
          >
            {isSaving ? (
              'Saving Attendance...'
            ) : !canEdit ? (
              <>
                <span className="inline-flex items-center gap-1.5"><NavIcon name="lock" className="w-3.5 h-3.5" /> Register Locked</span>
                <span className="text-[11px] font-normal opacity-80">(Read-Only)</span>
              </>
            ) : (
              <>
                <span>Save Attendance</span>
                <kbd className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/20 text-white">
                  Ctrl+S
                </kbd>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
