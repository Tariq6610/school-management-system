'use client';

import React from 'react';
import Link from 'next/link';
import { ClassAttendanceMatrixRow, ISODate } from '@/types';
import { formatDate, getWeekdayName } from '@/lib/utils';

export interface AdminAttendanceGridProps {
  rows: ClassAttendanceMatrixRow[];
  dates: ISODate[];
  today: ISODate;
  cutoffTime: string;
}

export function AdminAttendanceGrid({
  rows,
  dates,
  today,
  cutoffTime,
}: AdminAttendanceGridProps) {
  return (
    <div className="w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xs">
      {/* Legend & Policy Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 bg-neutral-50/80 px-4 py-3 text-xs">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-neutral-700">Grid Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-xs border border-emerald-300 bg-emerald-100" />
            <span className="text-neutral-600">Marked (Present % / Absent Count)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-xs border-2 border-amber-400 bg-amber-200" />
            <span className="font-bold text-amber-900">Unmarked / Past Cutoff (Needs Action)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-xs border border-neutral-300 bg-neutral-100" />
            <span className="text-neutral-500">Upcoming / Pre-Cutoff</span>
          </div>
        </div>
        <div className="text-neutral-500">
          Daily Morning Cutoff:{' '}
          <span className="font-semibold text-neutral-800">{cutoffTime} AM</span>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-100/75">
              {/* Sticky Class Column Header */}
              <th className="sticky left-0 z-20 min-w-[240px] border-r border-neutral-200 bg-neutral-100 px-4 py-3 font-bold text-neutral-800">
                Class & Teacher
              </th>

              {/* Date Column Headers */}
              {dates.map((date) => {
                const isToday = date === today;
                const weekday = getWeekdayName(date);
                const formatted = formatDate(date, 'short').slice(0, 5); // DD/MM

                return (
                  <th
                    key={date}
                    className={`min-w-[150px] border-r border-neutral-200 px-3 py-3 text-center transition-colors ${
                      isToday
                        ? 'bg-purple-100/50 font-bold text-purple-900 ring-1 ring-purple-300'
                        : 'text-neutral-700'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center gap-0.5">
                      <div className="flex items-center gap-1">
                        <span className="font-bold">{weekday}</span>
                        {isToday && (
                          <span className="rounded-full bg-purple-600 px-1.5 py-0.2 text-[10px] font-extrabold uppercase text-white">
                            Today
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-normal text-neutral-500">
                        {formatted}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-neutral-200">
            {rows.map((row) => (
              <tr
                key={row.classInfo.id}
                className="transition-colors hover:bg-neutral-50/50"
              >
                {/* Sticky Class Info Column */}
                <td className="sticky left-0 z-10 border-r border-neutral-200 bg-white px-4 py-3.5 shadow-xs">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-900">
                        Grade {row.classInfo.grade}-{row.classInfo.section}
                      </span>
                      <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600 border border-neutral-200">
                        {row.campusName}
                      </span>
                    </div>

                    {/* Teacher Info */}
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-neutral-500">
                      {row.teacherName ? (
                        <>
                          <span className="text-neutral-700 font-medium truncate max-w-[150px]" title={row.teacherName}>
                            👤 {row.teacherName}
                          </span>
                          {row.teacherEmployeeNumber && (
                            <span className="text-[11px] text-neutral-500">
                              ({row.teacherEmployeeNumber})
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="italic text-amber-700">
                          ⚠ No teacher assigned
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-0.5">
                      {row.totalStudents} enrolled students
                    </div>
                  </div>
                </td>

                {/* Date Matrix Cells */}
                {dates.map((date) => {
                  const cell = row.cells[date];
                  const isToday = date === today;

                  if (!cell) {
                    return (
                      <td
                        key={date}
                        className="border-r border-neutral-200 px-3 py-3 text-center text-xs text-neutral-500"
                      >
                        —
                      </td>
                    );
                  }

                  const registerHref = `/teacher/classes/${row.classInfo.id}/attendance?date=${date}`;

                  // 1. Unmarked & Past Cutoff (PRIMARY ACCEPTANCE CRITERIA: HIGHLIGHTED)
                  if (!cell.isMarked && cell.isPastCutoff) {
                    return (
                      <td
                        key={date}
                        className={`border-r border-neutral-200 p-2 text-center transition-all ${
                          isToday ? 'bg-amber-100/70' : 'bg-amber-50/50'
                        }`}
                      >
                        <Link
                          href={registerHref}
                          className="group block rounded-lg border-2 border-amber-400 bg-amber-100/90 p-2.5 text-center shadow-xs transition-all hover:border-amber-500 hover:bg-amber-200 hover:shadow-sm"
                          title={`Unmarked! Cutoff was ${cutoffTime} AM. Click to mark as admin.`}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-300 px-2 py-0.5 text-[11px] font-black text-amber-950 border border-amber-400">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-600 motion-safe:animate-ping" />
                              Needs Marking
                            </span>
                            <span className="text-[10px] font-bold text-amber-900 group-hover:underline">
                              {`Overdue (Past ${cutoffTime})`}
                            </span>
                          </div>
                        </Link>
                      </td>
                    );
                  }

                  // 2. Unmarked & Future or Before Cutoff
                  if (!cell.isMarked && !cell.isPastCutoff) {
                    return (
                      <td
                        key={date}
                        className="border-r border-neutral-200 p-2 text-center"
                      >
                        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-200 bg-neutral-50/60 p-2.5 text-xs text-neutral-500">
                          <span className="text-[11px] font-medium text-neutral-500">
                            {isToday ? 'Pre-cutoff' : 'Pending'}
                          </span>
                          <span className="text-[10px] text-neutral-500">
                            {isToday ? `Due by ${cutoffTime}` : 'Upcoming'}
                          </span>
                        </div>
                      </td>
                    );
                  }

                  // 3. Marked Register
                  return (
                    <td
                      key={date}
                      className="border-r border-neutral-200 p-2 text-center"
                    >
                      <Link
                        href={registerHref}
                        className="group block rounded-lg border border-neutral-200 bg-white p-2.5 text-center shadow-2xs transition-all hover:border-neutral-300 hover:bg-neutral-50"
                        title="Marked register. Click to review or edit."
                      >
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-emerald-700">
                              {`${cell.summary?.percentage ?? 100}%`}
                            </span>
                            <span className="rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-800">
                              ✓
                            </span>
                          </div>

                          {/* Absent badge */}
                          {cell.absentCount > 0 ? (
                            <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">
                              {`${cell.absentCount} absent`}
                            </span>
                          ) : (
                            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                              All present
                            </span>
                          )}
                        </div>
                      </Link>
                    </td>
                  );
                })}
              </tr>
            ))}

            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={dates.length + 1}
                  className="py-12 text-center text-sm text-neutral-500"
                >
                  No classes match the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
