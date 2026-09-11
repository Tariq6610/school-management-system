'use client';

import React from 'react';
import { AttendanceDay, User } from '@/types';
import { AttendanceEditWindowCheck } from '@/lib/repositories/attendance';
import { Modal } from '@/components/ui/Modal';
import { formatDateTime } from '@/lib/utils';

interface AttendanceAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  attendanceRecord: AttendanceDay | null;
  markedByUser: User | null;
  editedByUser: User | null;
  editWindowCheck: AttendanceEditWindowCheck | null;
  classNameString: string;
  dateString: string;
}

export function AttendanceAuditModal({
  isOpen,
  onClose,
  attendanceRecord,
  markedByUser,
  editedByUser,
  editWindowCheck,
  classNameString,
  dateString,
}: AttendanceAuditModalProps) {
  if (!attendanceRecord) return null;

  const markerName = markedByUser?.name || attendanceRecord.markedBy;
  const markerEmail = markedByUser?.email || '';
  const markerRole = markedByUser?.role ? markedByUser.role.replace('_', ' ') : 'teacher';

  const editorName = editedByUser?.name || attendanceRecord.editedBy;
  const editorEmail = editedByUser?.email || '';
  const editorRole = editedByUser?.role ? editedByUser.role.replace('_', ' ') : 'staff';

  const isExpired = editWindowCheck?.isExpired ?? false;
  const isAdminOverride = editWindowCheck?.isAdminOverride ?? false;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Attendance Audit Log — ${classNameString}`}
      size="lg"
    >
      <div className="flex flex-col gap-6 py-2">
        {/* Register Summary Header */}
        <div className="flex items-center justify-between p-3.5 bg-neutral-50 border border-neutral-200 rounded-lg text-sm">
          <div>
            <span className="text-neutral-500">Register Date: </span>
            <span className="font-semibold text-neutral-900">{dateString}</span>
          </div>
          <div>
            <span className="text-neutral-500">Document ID: </span>
            <code className="text-xs px-1.5 py-0.5 rounded bg-neutral-200 font-mono text-neutral-800">
              {attendanceRecord.id}
            </code>
          </div>
        </div>

        {/* Timeline of Events */}
        <div className="flex flex-col gap-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Audit Trail & Modification History
          </h4>

          <div className="relative pl-6 border-l-2 border-neutral-200 space-y-6">
            {/* Event 1: Initial Submission */}
            <div className="relative">
              <span className="absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 ring-4 ring-white" />
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-neutral-900">
                    Initial Attendance Submission
                  </span>
                  <span className="text-xs text-neutral-500">
                    {formatDateTime(attendanceRecord.markedAt)}
                  </span>
                </div>
                <p className="text-xs text-neutral-600">
                  Marked by <strong className="text-neutral-800">{markerName}</strong>{' '}
                  <span className="capitalize">({markerRole})</span>
                  {markerEmail && ` • ${markerEmail}`}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                    Present: {attendanceRecord.present.length}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200 font-medium">
                    Absent: {attendanceRecord.absent.length}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                    Late: {attendanceRecord.late.length}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200 font-medium">
                    Leave: {attendanceRecord.leave.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Event 2: Revision (if present) */}
            {attendanceRecord.editedAt && (
              <div className="relative">
                <span className="absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 ring-4 ring-white" />
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-neutral-900">
                      Register Modification / Correction
                    </span>
                    <span className="text-xs text-neutral-500">
                      {formatDateTime(attendanceRecord.editedAt)}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600">
                    Edited by <strong className="text-neutral-800">{editorName}</strong>{' '}
                    <span className="capitalize">({editorRole})</span>
                    {editorEmail && ` • ${editorEmail}`}
                  </p>
                  <p className="text-xs text-neutral-500 italic mt-0.5">
                    Original submission timestamp and marker identity are permanently preserved.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Policy & Safeguarding Information */}
        <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-lg flex flex-col gap-2 text-xs text-neutral-600">
          <div className="font-semibold text-neutral-800 flex items-center justify-between">
            <span>School Attendance Integrity Policy</span>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                isExpired
                  ? isAdminOverride
                    ? 'bg-amber-100 text-amber-900'
                    : 'bg-rose-100 text-rose-900'
                  : 'bg-emerald-100 text-emerald-900'
              }`}
            >
              {isExpired
                ? isAdminOverride
                  ? 'Admin Override Permitted'
                  : 'Register Locked'
                : `Edit Window Active (${editWindowCheck?.hoursRemaining ?? 0}h remaining)`}
            </span>
          </div>
          <p>
            Standard school configuration allows teachers to edit attendance registers within a{' '}
            <strong>{editWindowCheck?.windowHours ?? 48}-hour window</strong> from initial submission.
            Once this window elapses, changes can only be performed by administrators with override permissions to maintain data integrity and safeguarding compliance.
          </p>
        </div>

        {/* Footer actions */}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-neutral-700 bg-white hover:bg-neutral-50 rounded-lg border border-neutral-300 shadow-xs focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 cursor-pointer"
          >
            Close Audit Log
          </button>
        </div>
      </div>
    </Modal>
  );
}
