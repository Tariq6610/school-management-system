'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Campus,
  ClassAttendanceMatrixRow,
  ISODate,
  Scope,
  Settings,
} from '@/types';
import {
  getAttendanceMatrix,
  listCampuses,
  getSettings,
} from '@/lib/repositories';
import {
  addDays,
  formatDate,
  getInstructionalWeekDays,
  toISODate,
} from '@/lib/utils';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton';
import { AdminAttendanceGrid } from './AdminAttendanceGrid';
import { NavIcon } from '@/components/shell/NavIcon';

export interface AdminAttendanceOverviewProps {
  initialScope?: Scope;
}

export function AdminAttendanceOverview({
  initialScope,
}: AdminAttendanceOverviewProps) {
  const today = useMemo(() => toISODate(new Date()), []);
  const [currentWeekAnchor, setCurrentWeekAnchor] = useState<ISODate>(today);
  const [viewMode, setViewMode] = useState<'grid' | 'roster'>('grid');

  const [loading, setLoading] = useState<boolean>(true);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [selectedCampusId, setSelectedCampusId] = useState<string>(
    initialScope?.campusId ?? 'all'
  );
  const [statusFilter, setStatusFilter] = useState<'all' | 'unmarked' | 'marked'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [settings, setSettings] = useState<Settings | null>(null);
  const [rows, setRows] = useState<ClassAttendanceMatrixRow[]>([]);

  // Compute instructional week days (Mon-Sat) for the selected anchor
  const weekDays = useMemo(
    () => getInstructionalWeekDays(currentWeekAnchor),
    [currentWeekAnchor]
  );

  const cutoffTime = settings?.attendanceCutoffTime ?? '08:30';

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setLoading(true);
      try {
        const scope: Scope = {
          schoolId: initialScope?.schoolId ?? 'sch_main',
          campusId: selectedCampusId === 'all' ? undefined : selectedCampusId,
        };

        const sett = await getSettings(scope);
        const [camps, matrixRows] = await Promise.all([
          listCampuses(scope),
          getAttendanceMatrix(scope, weekDays, sett?.attendanceCutoffTime ?? '08:30'),
        ]);

        if (isMounted) {
          setSettings(sett);
          setCampuses(camps);
          setRows(matrixRows);
        }
      } catch (err) {
        console.error('Failed to load attendance overview data:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [initialScope?.schoolId, selectedCampusId, weekDays]);

  // Filter rows based on campus, search query, and status filter
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      // 1. Campus
      if (selectedCampusId !== 'all' && row.classInfo.campusId !== selectedCampusId) {
        return false;
      }

      // 2. Search query (matches grade, section, teacher name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const classMatch = `${row.classInfo.grade} ${row.classInfo.section}`
          .toLowerCase()
          .includes(q);
        const teacherMatch = row.teacherName?.toLowerCase().includes(q) ?? false;
        const campusMatch = row.campusName.toLowerCase().includes(q);
        if (!classMatch && !teacherMatch && !campusMatch) {
          return false;
        }
      }

      // 3. Status filter (applied to today or latest instructional day in week)
      if (statusFilter !== 'all') {
        const relevantDate = weekDays.includes(today) ? today : weekDays[0];
        const cell = row.cells[relevantDate];
        if (statusFilter === 'unmarked') {
          // Unmarked or overdue
          if (cell?.isMarked) return false;
        } else if (statusFilter === 'marked') {
          if (!cell?.isMarked) return false;
        }
      }

      return true;
    });
  }, [rows, selectedCampusId, searchQuery, statusFilter, weekDays, today]);

  // Today's statistics across all loaded classes
  const todayStats = useMemo(() => {
    const todayCells = rows
      .map((r) => r.cells[today])
      .filter((c): c is NonNullable<typeof c> => Boolean(c));

    const totalClasses = todayCells.length;
    const markedClasses = todayCells.filter((c) => c.isMarked);
    const markedCount = markedClasses.length;
    const overdueClasses = todayCells.filter((c) => !c.isMarked && c.isPastCutoff);
    const overdueCount = overdueClasses.length;

    let totalPresent = 0;
    let totalAbsent = 0;
    let totalEnrolledInMarked = 0;

    markedClasses.forEach((c) => {
      totalPresent += c.presentCount;
      totalAbsent += c.absentCount;
      totalEnrolledInMarked += (c.summary?.totalStudents ?? (c.presentCount + c.absentCount));
    });

    const averageRate =
      totalEnrolledInMarked > 0
        ? Math.round((totalPresent / totalEnrolledInMarked) * 1000) / 10
        : totalClasses > 0 && markedCount === 0
        ? 0
        : 100;

    return {
      totalClasses,
      markedCount,
      overdueCount,
      overdueClasses,
      totalPresent,
      totalAbsent,
      averageRate,
    };
  }, [rows, today]);

  // List of overdue classes today with teacher information for the urgency banner
  const overdueTodayList = useMemo(() => {
    return rows
      .filter((r) => {
        const cell = r.cells[today];
        return cell && !cell.isMarked && cell.isPastCutoff;
      })
      .map((r) => ({
        id: r.classInfo.id,
        name: `Grade ${r.classInfo.grade}-${r.classInfo.section}`,
        campus: r.campusName,
        teacher: r.teacherName || 'No Teacher Assigned',
      }));
  }, [rows, today]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black tracking-tight text-neutral-900">
              Attendance Overview
            </h1>
            <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-800">
              Administrative Grid
            </span>
          </div>
          <p className="mt-1 text-sm text-neutral-600">
            Monitor class registers across the school, track absentee volumes, and identify overdue registers past morning cutoff.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex rounded-lg border border-neutral-200 bg-neutral-100 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Classes × Dates Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode('roster')}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all ${
                viewMode === 'roster'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Today&apos;s Class Roster
            </button>
          </div>
        </div>
      </div>

      {/* URGENCY ALERT BANNER: Displayed whenever classes are overdue past cutoff */}
      {overdueTodayList.length > 0 && (
        <div className="rounded-xl border-2 border-amber-400 bg-amber-50 p-4.5 shadow-xs animate-in fade-in">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white font-bold text-lg">
                <NavIcon name="alert-triangle" className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-amber-950 text-base">
                  Action Required: {overdueTodayList.length} Class Register{overdueTodayList.length > 1 ? 's' : ''} Overdue Past {cutoffTime} AM Cutoff
                </h3>
                <p className="text-xs text-amber-900 mt-0.5">
                  The morning attendance cutoff has passed. The following registers have not yet been submitted:
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  {overdueTodayList.map((item) => (
                    <Link
                      key={item.id}
                      href={`/teacher/classes/${item.id}/attendance?date=${today}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-900 shadow-2xs hover:bg-amber-100/60 hover:border-amber-400 transition-colors"
                    >
                      <span className="font-bold text-amber-900">{item.name}</span>
                      <span className="text-neutral-500">·</span>
                      <span className="text-neutral-600">{item.teacher}</span>
                      <span className="text-amber-700 font-bold ml-1">Mark →</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Metric StatCards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Overdue Today"
          value={loading ? '...' : todayStats.overdueCount}
          subtitle={
            todayStats.overdueCount > 0
              ? `Past ${cutoffTime} AM cutoff`
              : 'All registers on time'
          }
          trend={
            todayStats.overdueCount > 0
              ? { direction: 'up', value: 'Overdue', label: 'Action required', positiveIsGood: false }
              : undefined
          }
        />

        <StatCard
          label="Today's Attendance Rate"
          value={loading ? '...' : `${todayStats.averageRate}%`}
          subtitle={`${todayStats.markedCount} of ${todayStats.totalClasses} classes marked`}
        />

        <StatCard
          label="Students Absent Today"
          value={loading ? '...' : todayStats.totalAbsent}
          subtitle="Across marked registers"
        />

        <StatCard
          label="Cutoff Policy"
          value={`${cutoffTime} AM`}
          subtitle="Configured morning deadline"
        />
      </div>

      {/* Week Navigator & Filters Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 rounded-xl border border-neutral-200 bg-neutral-50/70 p-4">
        {/* Left: Week Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCurrentWeekAnchor((prev) => addDays(prev, -7))}
            aria-label="Previous Week"
          >
            ← Prev Week
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCurrentWeekAnchor(today)}
            aria-label="Current Week"
            className={currentWeekAnchor === today ? 'font-bold border-purple-300 text-purple-900' : ''}
          >
            Current Week
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setCurrentWeekAnchor((prev) => addDays(prev, 7))}
            aria-label="Next Week"
          >
            Next Week →
          </Button>

          <div className="h-5 w-px bg-neutral-300 mx-1 hidden sm:block" />

          {/* Range summary display */}
          <span className="text-xs font-semibold text-neutral-700">
            {formatDate(weekDays[0], 'medium')} – {formatDate(weekDays[weekDays.length - 1], 'medium')}
          </span>
        </div>

        {/* Right: Filter Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Campus Filter */}
          {campuses.length > 1 && (
            <select
              value={selectedCampusId}
              onChange={(e) => setSelectedCampusId(e.target.value)}
              className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-800 shadow-2xs focus:border-purple-600 focus:outline-hidden"
              aria-label="Filter by Campus"
            >
              <option value="all">All Campuses</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'unmarked' | 'marked')}
            className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-800 shadow-2xs focus:border-purple-600 focus:outline-hidden"
            aria-label="Filter by Status"
          >
            <option value="all">All Statuses</option>
            <option value="unmarked">Unmarked / Overdue Only</option>
            <option value="marked">Marked Only</option>
          </select>

          {/* Search Box */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search class or teacher..."
            className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-800 placeholder-neutral-400 shadow-2xs focus:border-purple-600 focus:outline-hidden min-w-[180px]"
          />
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col gap-4">
          <SkeletonCard />
          <SkeletonTable rows={6} />
        </div>
      ) : viewMode === 'grid' ? (
        /* Matrix Grid View (Classes × Dates) */
        <AdminAttendanceGrid
          rows={filteredRows}
          dates={weekDays}
          today={today}
          cutoffTime={cutoffTime}
        />
      ) : (
        /* Today's Class Roster Detail View */
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-bold text-neutral-900">
              Today&apos;s Roster Overview ({formatDate(today, 'medium')})
            </h2>
            <span className="text-xs text-neutral-500">
              {filteredRows.length} classes enrolled
            </span>
          </div>

          <div className="overflow-x-auto overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xs">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-bold text-neutral-700">
                <tr>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Campus</th>
                  <th className="px-4 py-3">Class Teacher</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Presence %</th>
                  <th className="px-4 py-3">Breakdown</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 text-xs">
                {filteredRows.map((row) => {
                  const cell = row.cells[today];
                  const isMarked = cell?.isMarked ?? false;
                  const isOverdue = !isMarked && (cell?.isPastCutoff ?? false);
                  const registerHref = `/teacher/classes/${row.classInfo.id}/attendance?date=${today}`;

                  return (
                    <tr
                      key={row.classInfo.id}
                      className={`transition-colors ${
                        isOverdue
                          ? 'bg-amber-50/70 hover:bg-amber-100/50'
                          : 'hover:bg-neutral-50'
                      }`}
                    >
                      <td className="px-4 py-3 font-bold text-neutral-900">
                        Grade {row.classInfo.grade}-{row.classInfo.section}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {row.campusName}
                      </td>
                      <td className="px-4 py-3">
                        {row.teacherName ? (
                          <div className="flex flex-col">
                            <span className="font-medium text-neutral-900">
                              {row.teacherName}
                            </span>
                            {row.teacherEmail && (
                              <span className="text-[11px] text-neutral-500">
                                {row.teacherEmail}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-amber-700 italic">
                            No teacher assigned
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isMarked ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                            <NavIcon name="check-circle" className="w-3.5 h-3.5" /> Marked
                          </span>
                        ) : isOverdue ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-200 px-2.5 py-0.5 text-[11px] font-black text-amber-950 border border-amber-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-600 motion-safe:animate-ping" />
                            Needs Marking
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-0.5 text-[11px] font-medium text-neutral-600">
                            Pending Cutoff
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-neutral-900">
                        {isMarked ? `${cell?.summary?.percentage ?? 100}%` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {isMarked && cell?.summary ? (
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span className="text-emerald-700 font-semibold">
                              {cell.summary.presentCount}P
                            </span>
                            <span className="text-rose-700 font-bold">
                              {cell.summary.absentCount}A
                            </span>
                            <span className="text-amber-700 font-medium">
                              {cell.summary.lateCount}L
                            </span>
                            <span className="text-indigo-700 font-medium">
                              {cell.summary.leaveCount}V
                            </span>
                          </div>
                        ) : (
                          <span className="text-neutral-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={registerHref}
                          className={`inline-block rounded-md px-3 py-1 text-xs font-bold transition-colors ${
                            !isMarked
                              ? 'bg-amber-600 text-white hover:bg-amber-700'
                              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 border border-neutral-300'
                          }`}
                        >
                          {!isMarked ? 'Mark Attendance' : 'View Register'}
                        </Link>
                      </td>
                    </tr>
                  );
                })}

                {filteredRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-10 text-center text-sm text-neutral-500"
                    >
                      No classes found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
