'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { PeriodConfigurationEditor } from '@/components/settings/PeriodConfigurationEditor';
import { TimetableGrid, TimetableScheduleViews } from '@/components/timetable';
import { useSession } from '@/components/providers/SessionProvider';
import { Scope, TimetableSlot, Class } from '@/types';
import { listTimetableSlots } from '@/lib/repositories/timetableSlots';
import { listClasses } from '@/lib/repositories/classes';
import { getPeriodConfiguration } from '@/lib/repositories/settings';
import { Button } from '@/components/ui/Button';

type TimetableTab = 'builder' | 'views' | 'periods' | 'directory';

function AdminTimetableContent() {
  const { session } = useSession();
  const schoolId = session?.schoolId ?? 'sch_main';
  const campusId = session?.campusId;

  const [activeTab, setActiveTab] = useState<TimetableTab>('builder');
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [periodsCount, setPeriodsCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const scope: Scope = { schoolId, campusId };
        const [slotData, classData, periodData] = await Promise.all([
          listTimetableSlots(scope),
          listClasses(scope),
          getPeriodConfiguration(scope),
        ]);

        if (!ignore) {
          setSlots(slotData);
          setClasses(classData);
          setPeriodsCount(periodData.length);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Failed to load timetable overview:', err);
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, [schoolId, campusId]);

  return (
    <div className="max-w-7xl space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
            Timetable Management
          </h1>
          <p className="text-sm text-neutral-600 mt-1">
            Build weekly class schedules, configure periods, and assign subjects and instructors.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/settings">
            <Button variant="secondary" size="sm">
              Global Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Metric Quick Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Configured Periods
          </p>
          <p className="text-2xl font-bold text-purple-700 mt-1">{periodsCount}</p>
          <p className="text-xs text-neutral-500 mt-0.5">Daily time slots & breaks</p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Total Classes
          </p>
          <p className="text-2xl font-bold text-neutral-900 mt-1">{classes.length}</p>
          <p className="text-xs text-neutral-500 mt-0.5">Sections requiring timetables</p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Scheduled Slots
          </p>
          <p className="text-2xl font-bold text-neutral-900 mt-1">{slots.length}</p>
          <p className="text-xs text-neutral-500 mt-0.5">Assigned teaching periods</p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
            Coverage Status
          </p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {classes.length > 0
              ? `${Math.round((slots.length / (classes.length * Math.max(periodsCount, 1) * 5)) * 100)}%`
              : '0%'}
          </p>
          <p className="text-xs text-neutral-500 mt-0.5">Class schedule fill rate</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200">
        <nav className="-mb-px flex space-x-6">
          <button
            type="button"
            onClick={() => setActiveTab('builder')}
            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === 'builder'
                ? 'border-purple-600 text-purple-700 font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            Timetable Builder Grid
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('views')}
            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === 'views'
                ? 'border-purple-600 text-purple-700 font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            Schedule Views & Print
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('periods')}
            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === 'periods'
                ? 'border-purple-600 text-purple-700 font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            Period Times & Bell Schedule
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === 'directory'
                ? 'border-purple-600 text-purple-700 font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            Class Timetable Directory
          </button>
        </nav>
      </div>

      {/* Tab 1: Timetable Builder Grid */}
      {activeTab === 'builder' && <TimetableGrid />}

      {/* Tab 2: Schedule Views & Print (By Class, By Teacher, By Room) */}
      {activeTab === 'views' && <TimetableScheduleViews />}

      {/* Tab 3: Period Configuration */}
      {activeTab === 'periods' && (
        <PeriodConfigurationEditor
          onSaved={(newPeriods) => setPeriodsCount(newPeriods.length)}
        />
      )}

      {/* Tab 3: Directory Overview */}
      {activeTab === 'directory' && (
        <div className="space-y-6">
          <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-xs">
            <h2 className="text-lg font-bold text-neutral-900 mb-2">Class Schedule Directory</h2>
            <p className="text-sm text-neutral-600 mb-6">
              Class sections and their active scheduled slot allocations. Use the upcoming Timetable
              Builder to assign subjects and teachers directly onto the grid.
            </p>

            {loading ? (
              <div className="p-6 text-center text-neutral-500 motion-safe:animate-pulse">
                Loading schedule directory...
              </div>
            ) : classes.length === 0 ? (
              <div className="p-8 text-center text-neutral-500">
                No classes registered yet. Create classes in Classes & Sections to schedule timetables.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes.map((cls) => {
                  const classSlots = slots.filter((s) => s.classId === cls.id);
                  return (
                    <div
                      key={cls.id}
                      className="border border-neutral-200 rounded-xl p-4 bg-neutral-50/50 hover:bg-neutral-50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-neutral-900">
                          {cls.grade} - Section {cls.section}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-800">
                          Room {cls.room || 'TBD'}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-600">
                        Scheduled Slots:{' '}
                        <strong className="text-neutral-900">{classSlots.length}</strong> /{' '}
                        {periodsCount * 5}
                      </p>
                      <div className="w-full bg-neutral-200 rounded-full h-1.5 mt-3 overflow-hidden">
                        <div
                          className="bg-purple-600 h-1.5 rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              (classSlots.length / Math.max(periodsCount * 5, 1)) * 100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminTimetablePage() {
  return (
    <RouteGuard allowedRoles={['super_admin', 'school_admin', 'principal', 'teacher']}>
      <AppShell pageTitle="Timetable Management">
        <AdminTimetableContent />
      </AppShell>
    </RouteGuard>
  );
}
