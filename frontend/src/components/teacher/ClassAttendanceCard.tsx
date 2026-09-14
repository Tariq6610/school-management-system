'use client';

import React from 'react';
import Link from 'next/link';
import { AttendanceDay, AttendanceSummary, Class } from '@/types';
import { Button } from '@/components/ui/Button';
import { NavIcon } from '@/components/shell/NavIcon';
import { formatDateTime } from '@/lib/utils';

export interface ClassAttendanceCardProps {
  classInfo: Class;
  isClassTeacher: boolean;
  isMarked: boolean;
  attendanceDay?: AttendanceDay;
  summary?: AttendanceSummary;
  selectedDate: string;
  studentCount: number;
  campusName: string;
}

export function ClassAttendanceCard({
  classInfo,
  isClassTeacher,
  isMarked,
  attendanceDay,
  summary,
  selectedDate,
  studentCount,
  campusName,
}: ClassAttendanceCardProps) {
  const attendanceHref = `/teacher/classes/${classInfo.id}/attendance?date=${selectedDate}`;

  return (
    <div
      className={`
        flex flex-col justify-between p-5 rounded-xl border transition-all shadow-xs
        ${
          !isMarked
            ? 'bg-amber-50/30 border-amber-200 hover:border-amber-300 ring-1 ring-amber-200/50'
            : 'bg-white border-neutral-200 hover:border-neutral-300'
        }
      `}
    >
      {/* Top Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-neutral-900">
                Grade {classInfo.grade}-{classInfo.section}
              </h3>
              {isClassTeacher && (
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                  Homeroom
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              {campusName} {classInfo.room && `· Room ${classInfo.room}`}
            </p>
          </div>

          {/* Status Badge */}
          {!isMarked ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 motion-safe:animate-pulse">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Needs Marking
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              Marked
            </span>
          )}
        </div>

        {/* Metric & Summary Display */}
        {isMarked && summary ? (
          <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200/80 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500">Daily Presence Rate</span>
              <span className="text-sm font-bold text-emerald-700 font-mono">
                {summary.percentage}%
              </span>
            </div>

            {/* Breakdown mini-pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                {summary.presentCount} Present
              </span>
              {summary.absentCount > 0 && (
                <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">
                  {summary.absentCount} Absent
                </span>
              )}
              {summary.lateCount > 0 && (
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                  {summary.lateCount} Late
                </span>
              )}
              {summary.leaveCount > 0 && (
                <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                  {summary.leaveCount} Leave
                </span>
              )}
            </div>

            {attendanceDay?.markedAt && (
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Marked on {formatDateTime(attendanceDay.markedAt)}
              </p>
            )}
          </div>
        ) : (
          <div className="p-3 bg-amber-100/40 rounded-lg border border-amber-200 text-xs text-amber-900 flex flex-col gap-1">
            <div className="font-semibold flex items-center gap-1.5">
              <NavIcon name="alert-triangle" className="w-4 h-4" /> Register Pending
            </div>
            <p className="text-neutral-600">
              Attendance has not been recorded for {selectedDate}. All active students will default to present upon opening.
            </p>
            <div className="text-[11px] text-neutral-500 mt-1">
              Roster: <strong>{studentCount} active students</strong>
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between gap-3">
        <span className="text-xs text-neutral-500">
          Enrolled: <strong className="text-neutral-700">{studentCount}</strong>
        </span>

        {!isMarked ? (
          <Link href={attendanceHref} className="inline-block">
            <Button
              variant="primary"
              size="sm"
              className="h-9 px-4 text-xs font-semibold flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 border-amber-700 shadow-xs"
            >
              <span>Mark Attendance</span>
              <span>→</span>
            </Button>
          </Link>
        ) : (
          <Link href={attendanceHref} className="inline-block">
            <Button
              variant="secondary"
              size="sm"
              className="h-9 px-3 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
            >
              View / Edit Register
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
