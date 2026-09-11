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
import { ensureSeeded } from '../../../../lib/seed/boot';
import {
  isPastCutoff,
  getAttendanceMatrix,
} from '../../../../lib/repositories/attendance';
import { getSettings } from '../../../../lib/repositories/settings';
import { listClasses } from '../../../../lib/repositories/classes';
import { AdminAttendanceGrid } from '../../../../components/attendance/AdminAttendanceGrid';
import { AdminAttendanceOverview } from '../../../../components/attendance/AdminAttendanceOverview';
import { ToastProvider } from '../../../../components/ui/Toast';
import { SessionProvider } from '../../../../components/providers/SessionProvider';
import { Class, ClassAttendanceMatrixRow, ISODate } from '../../../../types';

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
  console.log('Running TASK-036 Admin Attendance Overview Grid Test Suite...\n');

  // Seed storage
  store.clear();
  await ensureSeeded();
  console.log('✓ Storage seeded with demo data');

  // --- 1. Cutoff Time & isPastCutoff Evaluation Tests ---
  console.log('\n--- 1. Cutoff Time & isPastCutoff Evaluation Tests ---');
  {
    const today = '2026-09-10';
    const pastDate = '2026-09-08';
    const futureDate = '2026-09-15';

    // Reference now: 2026-09-10 08:00 AM (Before 08:30 AM cutoff)
    const earlyMorning = new Date('2026-09-10T08:00:00');
    assert.strictEqual(
      isPastCutoff(pastDate, '08:30', earlyMorning),
      true,
      'Past dates must always evaluate as past cutoff'
    );
    assert.strictEqual(
      isPastCutoff(futureDate, '08:30', earlyMorning),
      false,
      'Future dates must evaluate as not past cutoff'
    );
    assert.strictEqual(
      isPastCutoff(today, '08:30', earlyMorning),
      false,
      'Today before 08:30 cutoff must evaluate as false'
    );

    // Reference now: 2026-09-10 09:15 AM (After 08:30 AM cutoff)
    const midMorning = new Date('2026-09-10T09:15:00');
    assert.strictEqual(
      isPastCutoff(today, '08:30', midMorning),
      true,
      'Today after 08:30 cutoff must evaluate as true (overdue)'
    );

    // Verify settings has attendanceCutoffTime configured
    const settings = await getSettings({ schoolId: 'sch_main' });
    assert.ok(settings.attendanceCutoffTime, 'Settings must have attendanceCutoffTime');
    assert.strictEqual(settings.attendanceCutoffTime, '08:30');
    console.log('✓ isPastCutoff rules and settings cutoff time verified');
  }

  // --- 2. Multi-date Attendance Matrix Aggregation Tests ---
  console.log('\n--- 2. Multi-date Attendance Matrix Aggregation Tests ---');
  {
    const dates: ISODate[] = ['2026-07-15', '2026-07-16', '2026-09-10'];
    const matrix = await getAttendanceMatrix(
      { schoolId: 'sch_main' },
      dates,
      '08:30',
      new Date('2026-09-10T10:00:00') // Reference: 10:00 AM today (past cutoff)
    );

    const classes = await listClasses({ schoolId: 'sch_main' });
    assert.strictEqual(matrix.length, classes.length, 'Matrix should contain all classes in scope');

    const firstRow = matrix[0];
    assert.ok(firstRow.classInfo, 'Row should contain classInfo');
    assert.ok(firstRow.campusName, 'Row should contain campusName');
    assert.ok(firstRow.totalStudents > 0, 'Class should have enrolled students count');

    // 2026-07-15 is in seed range (seeded 40 days starting 2026-07-15)
    const seededCell = firstRow.cells['2026-07-15'];
    assert.ok(seededCell, 'Cell for 2026-07-15 must exist');
    assert.strictEqual(seededCell.isMarked, true, 'Seeded attendance day must be marked');
    assert.ok(seededCell.summary, 'Marked cell must contain summary metrics');
    assert.ok(seededCell.summary.percentage > 0, 'Marked cell should have calculated presence %');

    // 2026-09-10 is outside seed range and past cutoff
    const todayCell = firstRow.cells['2026-09-10'];
    assert.ok(todayCell, 'Cell for 2026-09-10 must exist');
    assert.strictEqual(todayCell.isMarked, false, 'Unmarked day must evaluate isMarked: false');
    assert.strictEqual(todayCell.isPastCutoff, true, 'Unmarked day past 08:30 must have isPastCutoff: true');

    console.log(`✓ getAttendanceMatrix aggregated ${matrix.length} classes across ${dates.length} dates`);
  }

  // --- 3. Acceptance Criteria: Unmarked Classes Highlighted in Grid ---
  console.log('\n--- 3. Acceptance Criteria: Unmarked Classes Highlighted in Grid ---');
  {
    const mockClass: Class = {
      id: 'cls_test_8a',
      schoolId: 'sch_main',
      campusId: 'cmp_main',
      academicYearId: 'ay_2026',
      grade: 'Grade 8',
      section: 'A',
      classTeacherId: 'tch_sana',
      capacity: 35,
    };

    const mockRows: ClassAttendanceMatrixRow[] = [
      {
        classInfo: mockClass,
        campusName: 'Main Campus',
        teacherName: 'Sana Ahmed',
        teacherEmail: 'teacher.sana@abcschool.pk',
        teacherEmployeeNumber: 'EMP-T-001',
        totalStudents: 28,
        cells: {
          '2026-09-08': {
            date: '2026-09-08',
            isMarked: true,
            isPastCutoff: false,
            summary: {
              totalStudents: 28,
              presentCount: 26,
              absentCount: 2,
              lateCount: 0,
              leaveCount: 0,
              percentage: 92.9,
            },
            presentCount: 26,
            absentCount: 2,
            lateCount: 0,
            leaveCount: 0,
          },
          '2026-09-09': {
            date: '2026-09-09',
            isMarked: false,
            isPastCutoff: true, // Overdue / Needs marking!
            absentCount: 0,
            presentCount: 0,
            lateCount: 0,
            leaveCount: 0,
          },
          '2026-09-10': {
            date: '2026-09-10',
            isMarked: false,
            isPastCutoff: false, // Pre-cutoff / Pending
            absentCount: 0,
            presentCount: 0,
            lateCount: 0,
            leaveCount: 0,
          },
        },
      },
    ];

    const gridHtml = renderWithProviders(
      React.createElement(AdminAttendanceGrid, {
        rows: mockRows,
        dates: ['2026-09-08', '2026-09-09', '2026-09-10'],
        today: '2026-09-10',
        cutoffTime: '08:30',
      })
    );

    // Verify Primary Acceptance Criterion: Unmarked classes past cutoff are highlighted
    assert.ok(
      gridHtml.includes('Needs Marking'),
      'Unmarked class past cutoff must display "Needs Marking" warning badge'
    );
    assert.ok(
      gridHtml.includes('Overdue (Past 08:30)'),
      'Unmarked cell must explicitly state overdue cutoff time'
    );
    assert.ok(
      gridHtml.includes('bg-amber-100') || gridHtml.includes('border-amber-400'),
      'Unmarked cell must feature amber warning highlight'
    );

    // Verify Marked Class display
    assert.ok(
      gridHtml.includes('92.9%'),
      'Marked class cell must display presence rate percentage'
    );
    assert.ok(
      gridHtml.includes('2 absent'),
      'Marked class cell must display absent count chip'
    );

    // Verify Teacher accountability
    assert.ok(
      gridHtml.includes('Sana Ahmed'),
      'Grid must display assigned class teacher name for administrative accountability'
    );
    assert.ok(
      gridHtml.includes('EMP-T-001'),
      'Grid must display teacher employee number'
    );

    // Verify direct link to mark/view register
    assert.ok(
      gridHtml.includes('/teacher/classes/cls_test_8a/attendance?date=2026-09-09'),
      'Unmarked cell must link directly to the attendance register screen'
    );

    console.log('✓ Acceptance criteria verified: Unmarked classes highlighted with warning badges & direct actions');
  }

  // --- 4. AdminAttendanceOverview Component SSR Tests ---
  console.log('\n--- 4. AdminAttendanceOverview Component SSR Tests ---');
  {
    const overviewHtml = renderWithProviders(
      React.createElement(AdminAttendanceOverview, {
        initialScope: { schoolId: 'sch_main' },
      })
    );

    assert.ok(
      overviewHtml.includes('Attendance Overview'),
      'Overview must render main title'
    );
    assert.ok(
      overviewHtml.includes('Administrative Grid'),
      'Overview must render role badge'
    );
    assert.ok(
      overviewHtml.includes('Classes × Dates Grid'),
      'Overview must render view mode toggles'
    );
    assert.ok(
      overviewHtml.includes('Prev Week') && overviewHtml.includes('Next Week'),
      'Overview must render week navigation buttons'
    );

    console.log('✓ AdminAttendanceOverview rendered cleanly with full controls');
  }

  console.log('\n========================================');
  console.log('ALL TASK-036 ADMIN ATTENDANCE TESTS PASSED! ✅');
  console.log('========================================\n');
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
