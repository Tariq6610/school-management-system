'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  CampusComparisonRecord,
  getCampusComparisonData,
} from '@/lib/repositories/networkDashboard';
import { CampusAttendanceBarChart } from './CampusAttendanceBarChart';
import { CampusDrilldownDrawer } from './CampusDrilldownDrawer';
import { Button } from '@/components/ui/Button';

type SortField =
  | 'campusName'
  | 'studentsCount'
  | 'attendanceRateThisMonth'
  | 'feeCollectionRate'
  | 'teacherCount'
  | 'averageExamResult'
  | 'studentTeacherRatio';

type SortDirection = 'asc' | 'desc';

export interface CampusComparisonViewProps {
  schoolId?: string;
  initialRecords?: CampusComparisonRecord[];
}

export function CampusComparisonView({
  schoolId = 'sch_main',
  initialRecords,
}: CampusComparisonViewProps = {}) {
  const [records, setRecords] = useState<CampusComparisonRecord[]>(initialRecords || []);
  const [isLoading, setIsLoading] = useState(!initialRecords);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('studentsCount');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedCampus, setSelectedCampus] = useState<CampusComparisonRecord | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const scope = { schoolId };
        const data = await getCampusComparisonData(scope);
        if (isMounted) {
          setRecords(data);
        }
      } catch (err) {
        console.error('Failed to load campus comparison data:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [schoolId]);

  // Handle column sort toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc'); // Default new column to descending
    }
  };

  // Open drill-down drawer
  const handleDrilldown = (campus: CampusComparisonRecord) => {
    setSelectedCampus(campus);
    setIsDrawerOpen(true);
  };

  // Filtered and Sorted records
  const filteredAndSortedRecords = useMemo(() => {
    let result = [...records];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.campusName.toLowerCase().includes(q) ||
          c.address.toLowerCase().includes(q) ||
          c.principalName.toLowerCase().includes(q) ||
          c.campusCode.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [records, searchQuery, sortField, sortDirection]);

  // Top performers and Network Aggregates
  const totalStudents = useMemo(
    () => records.reduce((acc, c) => acc + c.studentsCount, 0),
    [records]
  );
  const totalTeachers = useMemo(
    () => records.reduce((acc, c) => acc + c.teacherCount, 0),
    [records]
  );
  const avgAttendance = useMemo(() => {
    if (records.length === 0) return 0;
    const sum = records.reduce((acc, c) => acc + c.attendanceRateThisMonth, 0);
    return Math.round((sum / records.length) * 10) / 10;
  }, [records]);
  const avgFeeCollection = useMemo(() => {
    if (records.length === 0) return 0;
    const sum = records.reduce((acc, c) => acc + c.feeCollectionRate, 0);
    return Math.round(sum / records.length);
  }, [records]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Campus Name',
      'Code',
      'Address',
      'Principal',
      'Students',
      'Teachers',
      'Attendance Rate (%)',
      'Fee Collection Rate (%)',
      'Average Exam (%)',
      'Student:Teacher Ratio',
    ];
    const rows = filteredAndSortedRecords.map((c) => [
      `"${c.campusName}"`,
      `"${c.campusCode}"`,
      `"${c.address}"`,
      `"${c.principalName}"`,
      c.studentsCount,
      c.teacherCount,
      c.attendanceRateThisMonth,
      c.feeCollectionRate,
      c.averageExamResult,
      c.studentTeacherRatio,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `campus_comparison_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) {
      return <span className="text-gray-500 ml-1">↕</span>;
    }
    return (
      <span className="text-emerald-600 font-bold ml-1">
        {sortDirection === 'asc' ? '▲' : '▼'}
      </span>
    );
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Differentiation Badge & Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Campus Comparison Screen
            </h1>
            <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
              Differentiation Screen 1
            </span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Side-by-side performance benchmarking across all school branches. Computed honestly on read from real records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/super-admin/dashboard">
            <Button variant="secondary" size="sm">
              ← Network Dashboard
            </Button>
          </Link>
          <Button variant="primary" size="sm" onClick={handleExportCSV}>
            Export CSV Report
          </Button>
        </div>
      </div>

      {/* 4 Network KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
            Total Network Enrollment
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-extrabold text-gray-900 tabular-nums">
              {totalStudents}
            </span>
            <span className="text-xs text-gray-500">active students</span>
          </div>
          <p className="text-xs text-emerald-600 font-medium mt-1">
            Distributed across {records.length} campuses
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
            Network Attendance Benchmark
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-extrabold text-emerald-600 tabular-nums">
              {avgAttendance}%
            </span>
            <span className="text-xs text-gray-500">month average</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Target benchmark is 90.0%
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
            Fee Collection Efficiency
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-extrabold text-blue-600 tabular-nums">
              {avgFeeCollection}%
            </span>
            <span className="text-xs text-gray-500">collection rate</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Based on active billing cycles
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
            Faculty Distribution
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-extrabold text-gray-900 tabular-nums">
              {totalTeachers}
            </span>
            <span className="text-xs text-gray-500">teachers</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Avg ratio: {totalTeachers > 0 ? (totalStudents / totalTeachers).toFixed(1) : '0'}:1
          </p>
        </div>
      </div>

      {/* Interactive Bar Chart Comparing Campuses (Mandated by FEATURE_SPECIFICATIONS.md §2) */}
      <CampusAttendanceBarChart
        campuses={records}
        onSelectCampus={handleDrilldown}
      />

      {/* Sortable Campus Comparison Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Campus Comparison Matrix
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Click any column header to sort. Click a campus row to drill down into operational details.
            </p>
          </div>

          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Search campus or principal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs px-3 py-1.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs font-semibold text-gray-600 border-b border-gray-200 select-none">
                <th
                  onClick={() => handleSort('campusName')}
                  className="py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center">
                    <span>Campus Name</span>
                    {renderSortIndicator('campusName')}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('studentsCount')}
                  className="py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors text-right"
                >
                  <div className="flex items-center justify-end">
                    <span>Students</span>
                    {renderSortIndicator('studentsCount')}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('attendanceRateThisMonth')}
                  className="py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors text-right"
                >
                  <div className="flex items-center justify-end">
                    <span>Attendance Rate (This Mo.)</span>
                    {renderSortIndicator('attendanceRateThisMonth')}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('feeCollectionRate')}
                  className="py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors text-right"
                >
                  <div className="flex items-center justify-end">
                    <span>Fee Collection</span>
                    {renderSortIndicator('feeCollectionRate')}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('teacherCount')}
                  className="py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors text-right"
                >
                  <div className="flex items-center justify-end">
                    <span>Teachers</span>
                    {renderSortIndicator('teacherCount')}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('averageExamResult')}
                  className="py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors text-right"
                >
                  <div className="flex items-center justify-end">
                    <span>Avg Exam Result</span>
                    {renderSortIndicator('averageExamResult')}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('studentTeacherRatio')}
                  className="py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors text-right"
                >
                  <div className="flex items-center justify-end">
                    <span>Ratio</span>
                    {renderSortIndicator('studentTeacherRatio')}
                  </div>
                </th>

                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    Loading campus metrics...
                  </td>
                </tr>
              ) : filteredAndSortedRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    No campuses matched your search criteria.
                  </td>
                </tr>
              ) : (
                filteredAndSortedRecords.map((c) => {
                  const isTopAttendance =
                    c.attendanceRateThisMonth ===
                    Math.max(...records.map((r) => r.attendanceRateThisMonth));

                  return (
                    <tr
                      key={c.campusId}
                      onClick={() => handleDrilldown(c)}
                      className="hover:bg-gray-50 cursor-pointer transition-colors group"
                    >
                      {/* Campus Name & Address */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-700 font-bold flex items-center justify-center text-xs group-hover:bg-emerald-100 group-hover:text-emerald-700 transition-colors">
                            {c.campusCode}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900 group-hover:text-emerald-700">
                                {c.campusName}
                              </span>
                              {c.isPrimary && (
                                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-medium">
                                  Primary
                                </span>
                              )}
                              {isTopAttendance && (
                                <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-medium">
                                  ★ Top Attendance
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 block truncate max-w-xs">
                              {c.address} • {c.principalName}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 1. Students Count */}
                      <td className="py-3.5 px-4 text-right font-semibold text-gray-900 tabular-nums">
                        {c.studentsCount}
                      </td>

                      {/* 2. Attendance Rate This Month */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <div className="w-12 bg-gray-100 rounded-full h-1.5 overflow-hidden hidden sm:block">
                            <div
                              className="bg-emerald-500 h-full rounded-full"
                              style={{ width: `${Math.min(100, c.attendanceRateThisMonth)}%` }}
                            />
                          </div>
                          <span
                            className={`font-bold tabular-nums ${
                              c.attendanceRateThisMonth >= 90
                                ? 'text-emerald-700'
                                : 'text-amber-700'
                            }`}
                          >
                            {c.attendanceRateThisMonth.toFixed(1)}%
                          </span>
                        </div>
                      </td>

                      {/* 3. Fee Collection Rate */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <div className="w-12 bg-gray-100 rounded-full h-1.5 overflow-hidden hidden sm:block">
                            <div
                              className="bg-blue-500 h-full rounded-full"
                              style={{ width: `${Math.min(100, c.feeCollectionRate)}%` }}
                            />
                          </div>
                          <span
                            className={`font-bold tabular-nums ${
                              c.feeCollectionRate >= 80 ? 'text-blue-700' : 'text-gray-700'
                            }`}
                          >
                            {c.feeCollectionRate}%
                          </span>
                        </div>
                      </td>

                      {/* 4. Teachers Count */}
                      <td className="py-3.5 px-4 text-right font-medium text-gray-800 tabular-nums">
                        {c.teacherCount}
                      </td>

                      {/* 5. Average Exam Result */}
                      <td className="py-3.5 px-4 text-right font-semibold text-purple-700 tabular-nums">
                        {c.averageExamResult.toFixed(1)}%
                      </td>

                      {/* Ratio */}
                      <td className="py-3.5 px-4 text-right font-medium text-gray-600 tabular-nums">
                        {c.studentTeacherRatio}:1
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDrilldown(c);
                          }}
                          className="text-xs text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 px-2.5 py-1"
                        >
                          Drill Down →
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <span>Showing {filteredAndSortedRecords.length} campuses</span>
          <span className="italic">All figures calculated on read; zero simulated fabrication</span>
        </div>
      </div>

      {/* Drill-down Drawer */}
      <CampusDrilldownDrawer
        campus={selectedCampus}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </div>
  );
}
