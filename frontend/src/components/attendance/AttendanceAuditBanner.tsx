'use client';

import React from 'react';
import { AttendanceDay, User } from '@/types';
import { AttendanceEditWindowCheck } from '@/lib/repositories/attendance';
import { formatDateTime } from '@/lib/utils';
import { NavIcon } from '@/components/shell/NavIcon';

interface AttendanceAuditBannerProps {
  attendanceRecord: AttendanceDay | null;
  markedByUser: User | null;
  editedByUser: User | null;
  editWindowCheck: AttendanceEditWindowCheck | null;
  onViewAuditHistory: () => void;
}

export function AttendanceAuditBanner({
  attendanceRecord,
  markedByUser,
  editedByUser,
  editWindowCheck,
  onViewAuditHistory,
}: AttendanceAuditBannerProps) {
  if (!attendanceRecord) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-lg text-sm text-neutral-600">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-neutral-200 text-neutral-600 text-xs font-semibold">
            i
          </span>
          <span>
            <strong>Unmarked Register</strong> — All active students defaulted to Present. Click Save below to record the register.
          </span>
        </div>
        <span className="text-xs font-medium px-2 py-0.5 rounded bg-neutral-200/60 text-neutral-600">
          New Register
        </span>
      </div>
    );
  }

  const isExpired = editWindowCheck?.isExpired ?? false;
  const isAdminOverride = editWindowCheck?.isAdminOverride ?? false;
  const markerName = markedByUser?.name || attendanceRecord.markedBy;
  const markerRole = markedByUser?.role ? markedByUser.role.replace('_', ' ') : 'teacher';
  const editorName = editedByUser?.name || attendanceRecord.editedBy;
  const editorRole = editedByUser?.role ? editedByUser.role.replace('_', ' ') : 'staff';

  return (
    <div className="flex flex-col gap-2 p-4 bg-white border border-neutral-200 rounded-lg shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Audit Details */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm text-neutral-800">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
              <NavIcon name="check-circle" className="w-3.5 h-3.5" />
            </span>
            <span>
              Marked by <strong className="font-semibold text-neutral-900">{markerName}</strong>{' '}
              <span className="text-xs text-neutral-500 capitalize">({markerRole})</span> on{' '}
              <span className="font-medium text-neutral-700">
                {formatDateTime(attendanceRecord.markedAt)}
              </span>
            </span>
          </div>

          {attendanceRecord.editedAt && (
            <div className="flex items-center gap-2 text-xs text-neutral-500 pl-7">
              <span>
                Last revised by <strong className="font-medium text-neutral-700">{editorName}</strong>{' '}
                <span className="capitalize">({editorRole})</span> on{' '}
                {formatDateTime(attendanceRecord.editedAt)}
              </span>
            </div>
          )}
        </div>

        {/* Status Pill & Audit Modal Trigger */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isExpired ? (
            isAdminOverride ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Admin Override Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                Locked (Window Expired)
              </span>
            )
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Edit Window Open ({editWindowCheck?.hoursRemaining ?? 0}h {editWindowCheck?.minutesRemaining ?? 0}m left)
            </span>
          )}

          <button
            type="button"
            onClick={onViewAuditHistory}
            className="px-2.5 py-1 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded border border-neutral-300 transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 cursor-pointer"
            title="View complete audit log and history"
          >
            Audit Trail
          </button>
        </div>
      </div>

      {/* Lock Notice or Admin Override Notice */}
      {isExpired && !isAdminOverride && (
        <div className="mt-1 flex items-start gap-2 p-2.5 bg-rose-50/80 border border-rose-200 rounded text-xs text-rose-800">
          <span className="font-bold text-rose-600"><NavIcon name="lock" className="w-3.5 h-3.5" /></span>
          <div>
            <strong>Read-Only Mode:</strong> The {editWindowCheck?.windowHours ?? 48}-hour edit window for this register has expired. All controls are locked. If an error needs correction, please contact an administrator.
          </div>
        </div>
      )}

      {isAdminOverride && (
        <div className="mt-1 flex items-start gap-2 p-2.5 bg-amber-50/80 border border-amber-200 rounded text-xs text-amber-800">
          <span className="font-bold text-amber-600"><NavIcon name="activity" className="w-3.5 h-3.5" /></span>
          <div>
            <strong>Administrator Override:</strong> The standard edit window for teachers has expired. You are authorized to modify this register as an administrator. Any saves will update the audit trail with your account details.
          </div>
        </div>
      )}
    </div>
  );
}
