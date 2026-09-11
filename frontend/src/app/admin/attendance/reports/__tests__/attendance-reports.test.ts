import assert from 'node:assert';

// Mock localStorage in Node environment
const store = new Map<string, string>();
const mockStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, String(value));
  },
  removeItem: (key: string) => {
    store.delete(key);
  },
  clear: () => {
    store.clear();
  },
  get length() {
    return store.size;
  },
  key: (index: number) => Array.from(store.keys())[index] ?? null,
};

Object.defineProperty(globalThis, 'localStorage', {
  value: mockStorage,
  writable: true,
});

Object.defineProperty(globalThis, 'window', {
  value: { localStorage: mockStorage },
  writable: true,
});

import React from 'react';
import { renderToString } from 'react-dom/server';
import { ensureSeeded } from '../../../../../lib/seed/boot';
import {
  getClassAttendanceReport,
  getDateRangeAttendanceReport,
  getStudentAttendanceReport,
} from '../../../../../lib/repositories/attendance';
import { listClasses } from '../../../../../lib/repositories/classes';
import { listActiveStudents } from '../../../../../lib/repositories/students';
import { formatCSVCell, generateCSV } from '../../../../../lib/utils/csv';
import { AttendanceReportsView } from '../../../../../components/attendance/AttendanceReportsView';
import { ToastProvider } from '../../../../../components/ui/Toast';
import { SessionProvider } from '../../../../../components/providers/SessionProvider';

// Mock Next.js App Router Context
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { AppRouterContext } = require('next/dist/shared/lib/app-router-context.shared-runtime');
const mockRouter = {
  back: () => {},
  forward: () => {},
  refresh: () => {},
  push: () => {},
  replace: () => {},
  prefetch: () => {},
};

function renderWithProviders(ui: React.ReactElement) {
  return renderToString(
    React.createElement(
      AppRouterContext.Provider,
      { value: mockRouter },
      React.createElement(
        ToastProvider,
        null,
        React.createElement(SessionProvider, null, ui)
      )
    )
  );
}

async function runTests() {
  console.log('Running TASK-037 Attendance Reports and CSV Export Test Suite...\n');

  // Seed storage
  store.clear();
  await ensureSeeded();
  console.log('✓ Storage seeded with demo data');

  // --- 1. RFC 4180 CSV Utility Tests ---
  console.log('\n--- 1. RFC 4180 CSV Utility Tests ---');
  {
    assert.strictEqual(formatCSVCell('Simple'), 'Simple');
    assert.strictEqual(formatCSVCell(123), '123');
    assert.strictEqual(formatCSVCell(null), '');
    assert.strictEqual(formatCSVCell(undefined), '');

    // Delimiter escaping tests
    assert.strictEqual(formatCSVCell('Khan, Tariq'), '"Khan, Tariq"', 'Commas must be enclosed in quotes');
    assert.strictEqual(
      formatCSVCell('He said "Hello"'),
      '"He said ""Hello"""',
      'Quotes must be escaped by doubling them'
    );
    assert.strictEqual(
      formatCSVCell('Line 1\nLine 2'),
      '"Line 1\nLine 2"',
      'Newlines must be enclosed in quotes'
    );

    // Full table serialization
    const headers = ['Roll #', 'Student Name', 'Attendance Rate'];
    const rows = [
      ['01', 'Ayesha Khan', '95.5%'],
      ['02', 'Bilal, Ahmed', '82.0%'],
    ];
    const csvOutput = generateCSV(headers, rows);
    assert.strictEqual(
      csvOutput,
      'Roll #,Student Name,Attendance Rate\r\n01,Ayesha Khan,95.5%\r\n02,"Bilal, Ahmed",82.0%',
      'generateCSV must format RFC 4180 compliant CSV with CRLF delimiters'
    );
    console.log('✓ RFC 4180 CSV generation and escaping verified');
  }

  // --- 2. Acceptance Criteria 1: By Class Attendance Report ---
  console.log('\n--- 2. Acceptance Criteria 1: By Class Attendance Report ---');
  {
    const classes = await listClasses({ schoolId: 'sch_main' });
    assert.ok(classes.length > 0, 'Classes must exist in seed');
    const targetClass = classes[0];

    const report = await getClassAttendanceReport(
      { schoolId: 'sch_main' },
      targetClass.id,
      '2026-07-15',
      '2026-08-31'
    );

    assert.ok(report, 'Class attendance report must be generated');
    assert.strictEqual(report.classInfo.id, targetClass.id);
    assert.ok(report.totalInstructionalDays > 0, 'Must contain instructional days');
    assert.ok(report.totalStudents > 0, 'Must contain student count');
    assert.ok(report.averagePercentage > 0, 'Class average percentage must be calculated');
    assert.strictEqual(
      report.students.length,
      report.totalStudents,
      'Every active student in class must have a row in report'
    );

    // Check first student row
    const firstStudent = report.students[0];
    assert.ok(firstStudent.studentName, 'Student name must be populated');
    assert.ok(firstStudent.admissionNumber, 'Admission number must be populated');
    assert.ok(firstStudent.rollNumber, 'Roll number must be populated');
    assert.strictEqual(
      firstStudent.totalDays,
      report.totalInstructionalDays,
      'Student total recorded days should match instructional days'
    );
    assert.ok(firstStudent.percentage >= 0 && firstStudent.percentage <= 100);

    console.log(`✓ By Class report verified: ${report.totalStudents} students across ${report.totalInstructionalDays} instructional days (Average: ${report.averagePercentage}%)`);
  }

  // --- 3. Acceptance Criteria 2: By Date Range Trend Report ---
  console.log('\n--- 3. Acceptance Criteria 2: By Date Range Trend Report ---');
  {
    const startDate = '2026-07-15';
    const endDate = '2026-07-25';

    const report = await getDateRangeAttendanceReport(
      { schoolId: 'sch_main' },
      startDate,
      endDate
    );

    assert.ok(report, 'Date range report must be generated');
    assert.ok(report.totalInstructionalDays > 0, 'Report must contain instructional days');
    assert.ok(report.averagePercentage > 0, 'Overall attendance percentage must be calculated');
    assert.ok(report.days.length > 0, 'Daily rows must be populated');

    const firstDay = report.days[0];
    assert.strictEqual(firstDay.date, startDate);
    assert.ok(firstDay.dayOfWeek, 'Weekday name must be populated');
    assert.ok(firstDay.markedClasses > 0, 'Marked classes count must be > 0');
    assert.ok(firstDay.totalStudents > 0, 'Total enrolled count in marked classes must be > 0');
    assert.ok(firstDay.percentage > 0, 'Daily presence % must be calculated');

    console.log(`✓ By Range report verified: ${report.days.length} days aggregated from ${startDate} to ${endDate} (Average: ${report.averagePercentage}%)`);
  }

  // --- 4. Acceptance Criteria 3: By Student Longitudinal Report ---
  console.log('\n--- 4. Acceptance Criteria 3: By Student Longitudinal Report ---');
  {
    const students = await listActiveStudents({ schoolId: 'sch_main' });
    assert.ok(students.length > 0, 'Students must exist');
    const targetStudent = students[0];

    const report = await getStudentAttendanceReport(
      { schoolId: 'sch_main' },
      targetStudent.id,
      '2026-07-15',
      '2026-08-31'
    );

    assert.ok(report, 'Student report must be generated');
    assert.strictEqual(report.student.id, targetStudent.id);
    assert.ok(report.userName, 'User name must be resolved');
    assert.ok(report.className, 'Class name must be resolved');
    assert.ok(report.stats.totalDays > 0, 'Stats totalDays must be calculated');
    assert.strictEqual(report.history.length, report.stats.totalDays, 'History records must match total days');
    assert.ok(report.stats.percentage > 0, 'Student presence percentage must be calculated');

    // Chronological sort check
    for (let i = 1; i < report.history.length; i++) {
      assert.ok(
        report.history[i].date >= report.history[i - 1].date,
        'History records must be sorted chronologically'
      );
    }

    console.log(`✓ By Student report verified: ${report.userName} with ${report.stats.totalDays} recorded days (${report.stats.percentage}% attendance)`);
  }

  // --- 5. Component SSR & Control Verification ---
  console.log('\n--- 5. Component SSR & Control Verification ---');
  {
    const html = renderWithProviders(
      React.createElement(AttendanceReportsView, {
        initialScope: { schoolId: 'sch_main' },
      })
    );

    assert.ok(html.includes('Attendance Reports'), 'Must render main heading');
    assert.ok(html.includes('By Class Cohort'), 'Must render Class Cohort tab');
    assert.ok(html.includes('By Date Range Trend'), 'Must render Date Range Trend tab');
    assert.ok(html.includes('By Individual Student'), 'Must render Individual Student tab');
    assert.ok(html.includes('Export CSV'), 'Must render Export CSV button');
    assert.ok(html.includes('Print Report'), 'Must render Print Report button');
    assert.ok(html.includes('Academic Term (40d)'), 'Must render Term preset button');

    console.log('✓ AttendanceReportsView rendered cleanly with all tabs and export controls');
  }

  console.log('\n========================================');
  console.log('ALL TASK-037 ATTENDANCE REPORT TESTS PASSED! ✅');
  console.log('========================================\n');
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
