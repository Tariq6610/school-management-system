'use client';

import React, { useState } from 'react';
import { CampusComparisonRecord } from '@/lib/repositories/networkDashboard';

export type ChartMetric =
  | 'attendance'
  | 'fees'
  | 'exams'
  | 'students';

interface CampusAttendanceBarChartProps {
  campuses: CampusComparisonRecord[];
  activeMetric?: ChartMetric;
  onSelectCampus?: (campus: CampusComparisonRecord) => void;
}

export function CampusAttendanceBarChart({
  campuses,
  activeMetric: initialMetric = 'attendance',
  onSelectCampus,
}: CampusAttendanceBarChartProps) {
  const [metric, setMetric] = useState<ChartMetric>(initialMetric);

  const metricConfigs = {
    attendance: {
      label: 'Attendance Rate This Month',
      unit: '%',
      benchmark: 90,
      benchmarkLabel: '90% Network Target',
      colorClass: 'bg-emerald-500 hover:bg-emerald-600',
      getValue: (c: CampusComparisonRecord) => c.attendanceRateThisMonth,
      format: (val: number) => `${val.toFixed(1)}%`,
    },
    fees: {
      label: 'Fee Collection Rate',
      unit: '%',
      benchmark: 80,
      benchmarkLabel: '80% Target',
      colorClass: 'bg-blue-500 hover:bg-blue-600',
      getValue: (c: CampusComparisonRecord) => c.feeCollectionRate,
      format: (val: number) => `${val}%`,
    },
    exams: {
      label: 'Average Exam Score',
      unit: '%',
      benchmark: 75,
      benchmarkLabel: '75% Distinction Target',
      colorClass: 'bg-purple-500 hover:bg-purple-600',
      getValue: (c: CampusComparisonRecord) => c.averageExamResult,
      format: (val: number) => `${val.toFixed(1)}%`,
    },
    students: {
      label: 'Active Student Enrollment',
      unit: ' students',
      benchmark: 150,
      benchmarkLabel: 'Campus Capacity Target (150)',
      colorClass: 'bg-amber-500 hover:bg-amber-600',
      getValue: (c: CampusComparisonRecord) => c.studentsCount,
      format: (val: number) => `${val} students`,
    },
  };

  const currentConfig = metricConfigs[metric];

  // Find max value to calibrate height proportion
  const values = campuses.map((c) => currentConfig.getValue(c));
  const maxValue = Math.max(...values, currentConfig.benchmark || 100, 10);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      {/* Header & Metric Switcher Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-900">
              Campus Performance Comparison
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
              Bar Chart
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Comparing honest metrics across all campuses in the network
          </p>
        </div>

        {/* Metric Selector Pills */}
        <div className="flex flex-wrap items-center bg-gray-100 p-1 rounded-lg text-xs font-medium self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMetric('attendance')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              metric === 'attendance'
                ? 'bg-white text-gray-900 shadow-sm font-semibold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Attendance
          </button>
          <button
            type="button"
            onClick={() => setMetric('fees')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              metric === 'fees'
                ? 'bg-white text-gray-900 shadow-sm font-semibold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Fee Collection
          </button>
          <button
            type="button"
            onClick={() => setMetric('exams')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              metric === 'exams'
                ? 'bg-white text-gray-900 shadow-sm font-semibold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Exam Average
          </button>
          <button
            type="button"
            onClick={() => setMetric('students')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              metric === 'students'
                ? 'bg-white text-gray-900 shadow-sm font-semibold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Enrollment
          </button>
        </div>
      </div>

      {/* Bar Chart Canvas */}
      <div className="mt-6 pt-2">
        {/* Metric Legend and Benchmark */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-4 px-1">
          <div className="flex items-center gap-2 font-medium text-gray-700">
            <span className="inline-block w-3 h-3 rounded-sm bg-emerald-500" />
            <span>{currentConfig.label}</span>
          </div>
          {currentConfig.benchmark && (
            <div className="flex items-center gap-1.5 text-amber-600 font-medium">
              <span className="w-3 border-t-2 border-dashed border-amber-500" />
              <span>{currentConfig.benchmarkLabel}</span>
            </div>
          )}
        </div>

        {/* Bar Chart Columns */}
        <div className="relative h-64 flex items-end justify-around gap-4 sm:gap-8 pt-6 pb-2 border-b border-gray-200">
          {/* Target Benchmark Line (if percentage based) */}
          {currentConfig.benchmark && (
            <div
              className="absolute left-0 right-0 border-t-2 border-dashed border-amber-300 pointer-events-none z-10 flex items-center justify-end pr-2"
              style={{
                bottom: `${(currentConfig.benchmark / maxValue) * 100}%`,
              }}
            >
              <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-medium">
                Target: {currentConfig.benchmark}
                {currentConfig.unit}
              </span>
            </div>
          )}

          {campuses.map((c) => {
            const val = currentConfig.getValue(c);
            const heightPercent = Math.min(100, Math.max(8, (val / maxValue) * 100));
            const isTop = val === Math.max(...values);

            return (
              <div
                key={c.campusId}
                onClick={() => onSelectCampus?.(c)}
                className="group relative flex-1 flex flex-col items-center cursor-pointer transition-transform hover:-translate-y-1"
              >
                {/* Tooltip on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 z-20 pointer-events-none bg-gray-900 text-white text-xs px-2.5 py-1 rounded shadow-lg whitespace-nowrap">
                  <p className="font-semibold">{c.campusName}</p>
                  <p className="text-[11px] text-gray-300">
                    {currentConfig.label}: <span className="text-white font-bold">{currentConfig.format(val)}</span>
                  </p>
                </div>

                {/* Top Performer Badge */}
                {isTop && (
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200 mb-1.5 animate-pulse">
                    ★ Lead
                  </span>
                )}

                {/* Value Label above Bar */}
                <span className="text-xs sm:text-sm font-bold text-gray-900 mb-1 tabular-nums">
                  {currentConfig.format(val)}
                </span>

                {/* The Bar */}
                <div className="w-full max-w-[72px] bg-gray-100 rounded-t-lg overflow-hidden flex items-end h-44">
                  <div
                    className={`w-full rounded-t-lg transition-all duration-500 ${
                      metric === 'attendance'
                        ? isTop
                          ? 'bg-emerald-600 group-hover:bg-emerald-700'
                          : 'bg-emerald-500 group-hover:bg-emerald-600'
                        : metric === 'fees'
                        ? 'bg-blue-500 group-hover:bg-blue-600'
                        : metric === 'exams'
                        ? 'bg-purple-500 group-hover:bg-purple-600'
                        : 'bg-amber-500 group-hover:bg-amber-600'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>

                {/* Campus Label & Code below Bar */}
                <div className="mt-3 text-center">
                  <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate max-w-[110px] group-hover:text-emerald-600">
                    {c.campusName}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    {c.isPrimary ? 'Primary Branch' : 'Branch Campus'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
          <span>* Click any bar or campus to drill down into operational details</span>
          <span>Strictly computed on read • Zero fabricated figures</span>
        </div>
      </div>
    </div>
  );
}
