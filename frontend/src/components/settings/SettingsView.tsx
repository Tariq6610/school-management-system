'use client';

import React, { useState } from 'react';
import { GradingScaleEditor } from './GradingScaleEditor';
import { PeriodConfigurationEditor } from './PeriodConfigurationEditor';
import { AttendanceSettingsEditor } from './AttendanceSettingsEditor';
import { BrandingSettingsEditor } from './BrandingSettingsEditor';

type SettingsTab = 'grading' | 'timetable' | 'attendance' | 'branding';

export function SettingsView() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('grading');

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
          School Settings & Configurations
        </h1>
        <p className="text-sm text-neutral-600 mt-1">
          Manage academic grading scales, period schedules, operational cutoffs, and institutional preferences.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-neutral-200">
        <nav className="-mb-px flex space-x-6">
          <button
            type="button"
            onClick={() => setActiveTab('grading')}
            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === 'grading'
                ? 'border-purple-600 text-purple-700 font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            Academic & Grading Scale
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('timetable')}
            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === 'timetable'
                ? 'border-purple-600 text-purple-700 font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            Timetable & Periods
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('attendance')}
            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === 'attendance'
                ? 'border-purple-600 text-purple-700 font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            Attendance & Operations
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('branding')}
            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeTab === 'branding'
                ? 'border-purple-600 text-purple-700 font-semibold'
                : 'border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300'
            }`}
          >
            General & Branding
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'grading' && <GradingScaleEditor />}

      {activeTab === 'timetable' && <PeriodConfigurationEditor />}

      {activeTab === 'attendance' && <AttendanceSettingsEditor />}

      {activeTab === 'branding' && <BrandingSettingsEditor />}
    </div>
  );
}
