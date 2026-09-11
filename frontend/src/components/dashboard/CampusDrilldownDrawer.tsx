'use client';

import React from 'react';
import Link from 'next/link';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { CampusComparisonRecord } from '@/lib/repositories/networkDashboard';

interface CampusDrilldownDrawerProps {
  campus: CampusComparisonRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CampusDrilldownDrawer({
  campus,
  isOpen,
  onClose,
}: CampusDrilldownDrawerProps) {
  if (!campus) return null;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={campus.campusName}
      description={`Operational and financial drill-down for ${campus.campusCode} • ${campus.address}`}
      width="max-w-xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <Link href={`/super-admin/campuses`} className="text-xs text-emerald-600 hover:underline">
            Manage in Campus Directory →
          </Link>
          <Button variant="secondary" onClick={onClose} size="sm">
            Close Drill-down
          </Button>
        </div>
      }
    >
      <div className="space-y-6 text-gray-900">
        {/* Campus Overview Banner */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-gray-900">{campus.campusName}</span>
              {campus.isPrimary ? (
                <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  Primary Campus
                </span>
              ) : (
                <span className="text-[11px] font-medium bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  Branch Campus
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <span>📍 {campus.address}</span>
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-500 block">Campus Code</span>
            <span className="text-sm font-mono font-bold text-gray-800">{campus.campusCode}</span>
          </div>
        </div>

        {/* Principal Card */}
        <div className="p-4 rounded-xl border border-gray-200 bg-white">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Campus Leadership
          </h4>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-sm">
              {campus.principalName
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">{campus.principalName}</p>
              <p className="text-xs text-gray-500">{campus.principalEmail || 'No official email assigned'}</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 font-medium">
              Principal
            </span>
          </div>
        </div>

        {/* 4 Key Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg border border-gray-100 bg-gray-50">
            <span className="text-[11px] font-medium text-gray-500 block">Enrolled</span>
            <span className="text-lg font-bold text-gray-900 tabular-nums">
              {campus.studentsCount}
            </span>
            <span className="text-[10px] text-gray-500 block">Active Students</span>
          </div>

          <div className="p-3 rounded-lg border border-gray-100 bg-gray-50">
            <span className="text-[11px] font-medium text-gray-500 block">Faculty</span>
            <span className="text-lg font-bold text-gray-900 tabular-nums">
              {campus.teacherCount}
            </span>
            <span className="text-[10px] text-gray-500 block">Teachers</span>
          </div>

          <div className="p-3 rounded-lg border border-gray-100 bg-gray-50">
            <span className="text-[11px] font-medium text-gray-500 block">Sections</span>
            <span className="text-lg font-bold text-gray-900 tabular-nums">
              {campus.classesCount}
            </span>
            <span className="text-[10px] text-gray-500 block">Active Classes</span>
          </div>

          <div className="p-3 rounded-lg border border-gray-100 bg-gray-50">
            <span className="text-[11px] font-medium text-gray-500 block">Ratio</span>
            <span className="text-lg font-bold text-gray-900 tabular-nums">
              {campus.studentTeacherRatio}:1
            </span>
            <span className="text-[10px] text-gray-500 block">Students / Teacher</span>
          </div>
        </div>

        {/* Attendance Performance */}
        <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-gray-900">Attendance Reliability</h4>
              <p className="text-xs text-gray-500">Based on verified register entries this month</p>
            </div>
            <span className="text-base font-bold text-emerald-700 tabular-nums">
              {campus.attendanceRateThisMonth.toFixed(1)}%
            </span>
          </div>

          <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, campus.attendanceRateThisMonth)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
            <span>Present / Late: {campus.attendancePresentCount}</span>
            <span>Total Recorded: {campus.attendanceTotalCount}</span>
          </div>
        </div>

        {/* Financial Collections */}
        <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-gray-900">Fee Collection Efficiency</h4>
              <p className="text-xs text-gray-500">Collected vs Net Invoiced Fees</p>
            </div>
            <span className="text-base font-bold text-blue-700 tabular-nums">
              {campus.feeCollectionRate}%
            </span>
          </div>

          <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, campus.feeCollectionRate)}%` }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 text-xs">
            <div>
              <span className="text-gray-500 block">Total Billed</span>
              <span className="font-semibold text-gray-900">
                PKR {campus.totalFeeBilled.toLocaleString('en-PK')}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block">Collected</span>
              <span className="font-semibold text-emerald-600">
                PKR {campus.totalFeeCollected.toLocaleString('en-PK')}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block">Pending</span>
              <span className="font-semibold text-red-600">
                PKR {campus.pendingFeeAmount.toLocaleString('en-PK')}
              </span>
            </div>
          </div>
        </div>

        {/* Academic Result Benchmark */}
        <div className="p-4 rounded-xl border border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-gray-900">Exam Results Benchmark</h4>
              <p className="text-xs text-gray-500">Average student score across published assessments</p>
            </div>
            <span className="text-base font-bold text-purple-700 tabular-nums">
              {campus.averageExamResult.toFixed(1)}%
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
            <span>Total Exams Conducted: <strong className="text-gray-800">{campus.examsCount}</strong></span>
          </div>
        </div>

        {/* Quick Nav Actions */}
        <div className="pt-2">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Campus Context Actions
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={`/admin/students`}
              className="text-center px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs font-medium text-gray-700 transition-colors"
            >
              View Student Roster →
            </Link>
            <Link
              href={`/admin/classes`}
              className="text-center px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs font-medium text-gray-700 transition-colors"
            >
              View Class Sections →
            </Link>
            <Link
              href={`/admin/fees/invoices`}
              className="text-center px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs font-medium text-gray-700 transition-colors"
            >
              Fee Vouchers & Ledger →
            </Link>
            <Link
              href={`/admin/teachers`}
              className="text-center px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs font-medium text-gray-700 transition-colors"
            >
              Teacher Directory →
            </Link>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
