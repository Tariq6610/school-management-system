'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Scope } from '@/types';
import {
  getNetworkOverviewStats,
  getNetworkRecentActivity,
  NetworkActivityItem,
  NetworkOverviewStats,
} from '@/lib/repositories/networkDashboard';
import { RecentActivityFeed } from './RecentActivityFeed';
import { formatPKR } from '@/lib/utils';

export interface SuperAdminDashboardViewProps {
  schoolId?: string;
  initialStats?: NetworkOverviewStats;
  initialActivities?: NetworkActivityItem[];
}

export function SuperAdminDashboardView({
  schoolId = 'sch_main',
  initialStats,
  initialActivities,
}: SuperAdminDashboardViewProps) {
  const [stats, setStats] = useState<NetworkOverviewStats | null>(initialStats || null);
  const [activities, setActivities] = useState<NetworkActivityItem[]>(initialActivities || []);
  const [loading, setLoading] = useState(!initialStats);

  const scope: Scope = useMemo(() => ({ schoolId }), [schoolId]);

  useEffect(() => {
    let isMounted = true;

    async function loadDashboard() {
      try {
        const [statsData, activitiesData] = await Promise.all([
          getNetworkOverviewStats(scope),
          getNetworkRecentActivity(scope, 20),
        ]);

        if (isMounted) {
          setStats(statsData);
          setActivities(activitiesData);
        }
      } catch (err) {
        console.error('[SuperAdminDashboardView] Failed to load dashboard:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [scope]);

  if (loading || !stats) {
    return (
      <div className="p-8 text-center text-neutral-500 text-sm">
        <div className="inline-block animate-spin text-xl mb-2">⚙️</div>
        <p>Loading network overview...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 1. Header & Differentiation Callout */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black uppercase tracking-wider">
              Network Command Centre
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 text-[10px] font-bold">
              Multi-Campus Oversight
            </span>
          </div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
            Institutional Network Overview
          </h1>
          <p className="text-xs text-neutral-500 mt-1 max-w-2xl">
            Centralized intelligence across all campuses, students, faculty, fee collections, and compliance activities.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/super-admin/campus-comparison"
            className="px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <span>📊</span> Compare Campuses
          </Link>
          <Link
            href="/super-admin/schools"
            className="px-3 py-2 rounded-xl bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-semibold border border-neutral-200 shadow-2xs transition-colors"
          >
            View Schools
          </Link>
          <Link
            href="/super-admin/campuses"
            className="px-3 py-2 rounded-xl bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-semibold border border-neutral-200 shadow-2xs transition-colors"
          >
            Manage Campuses
          </Link>
        </div>
      </div>

      {/* 2. Five Canonical Stats Cards (FEATURE_SPECIFICATIONS.md §2) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Stat 1: Schools */}
        <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
              1. Schools
            </span>
            <span className="text-base p-1.5 rounded-lg bg-neutral-100 text-neutral-700">🏫</span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-neutral-900 block tracking-tight">
              {stats.schoolsCount}
            </span>
            <span className="text-[10px] text-neutral-500 font-medium">Institutions in network</span>
          </div>
        </div>

        {/* Stat 2: Campuses */}
        <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
              2. Campuses
            </span>
            <span className="text-base p-1.5 rounded-lg bg-indigo-50 text-indigo-700">📍</span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-indigo-950 block tracking-tight">
              {stats.campusesCount}
            </span>
            <span className="text-[10px] text-neutral-500 font-medium">Operational branches</span>
          </div>
        </div>

        {/* Stat 3: Students */}
        <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
              3. Students
            </span>
            <span className="text-base p-1.5 rounded-lg bg-emerald-50 text-emerald-700">🎓</span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-emerald-950 block tracking-tight">
              {stats.studentsCount}
            </span>
            <span className="text-[10px] text-emerald-700 font-medium">Enrolled network-wide</span>
          </div>
        </div>

        {/* Stat 4: Teachers */}
        <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
              4. Teachers
            </span>
            <span className="text-base p-1.5 rounded-lg bg-sky-50 text-sky-700">👨‍🏫</span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-sky-950 block tracking-tight">
              {stats.teachersCount}
            </span>
            <span className="text-[10px] text-sky-700 font-medium">Active instructional staff</span>
          </div>
        </div>

        {/* Stat 5: Fee Collection This Month */}
        <div className="bg-white rounded-2xl p-4 border border-neutral-200/80 shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-1 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
              5. Month Fees
            </span>
            <span className="text-base p-1.5 rounded-lg bg-amber-50 text-amber-700">💳</span>
          </div>
          <div className="mt-3">
            <span className="text-xl font-black text-amber-950 block tracking-tight truncate">
              {formatPKR(stats.feeCollectionThisMonth)}
            </span>
            <span className="text-[10px] text-amber-700 font-bold">
              {stats.overallCollectionRate}% collection rate
            </span>
          </div>
        </div>
      </div>

      {/* 3. Campus Network Performance Summary Table */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-neutral-100 flex items-center justify-between gap-3 bg-neutral-50/50">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
              <span>🏫</span> Campus Health Register
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Comparative overview of students, faculty, collection rate, and attendance per campus.
            </p>
          </div>
          <Link
            href="/super-admin/campus-comparison"
            className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 transition-colors"
          >
            Detailed Analytics →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50/80 text-[11px] font-semibold text-neutral-600 uppercase tracking-wider">
                <th className="py-3 px-4">Campus</th>
                <th className="py-3 px-4 text-center">Students</th>
                <th className="py-3 px-4 text-center">Faculty</th>
                <th className="py-3 px-4 text-center">Attendance %</th>
                <th className="py-3 px-4 text-center">Fee Collection %</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-medium">
              {stats.campuses.map((c) => (
                <tr key={c.campusId} className="hover:bg-neutral-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-neutral-900">{c.campusName}</div>
                    <div className="text-[10px] text-neutral-500 font-mono">Code: {c.campusCode || 'MAIN'}</div>
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-neutral-800">
                    {c.studentCount}
                  </td>
                  <td className="py-3 px-4 text-center text-neutral-700">
                    {c.teacherCount}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-sky-50 text-sky-800 border border-sky-200">
                      {c.attendanceRate}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {c.collectionRate}% ({formatPKR(c.feeCollected)})
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <Link
                      href="/super-admin/campus-comparison"
                      className="text-[11px] font-bold text-purple-700 hover:text-purple-900 transition-colors"
                    >
                      Compare →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Recent Activity Feed (Acceptance criteria: Five stats plus recent activity) */}
      <RecentActivityFeed activities={activities} />
    </div>
  );
}
