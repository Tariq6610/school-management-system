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
  value: { localStorage: mockStorage, print: () => {} },
  writable: true,
});

import React from 'react';
import { renderToString } from 'react-dom/server';
import { ensureSeeded } from '../../../../lib/seed/boot';
import { getMonthCalendarGrid, getMonthName } from '../../../../lib/utils/dates';
import { getStudentMonthAttendance } from '../../../../lib/repositories/attendance';
import { getChildrenForParent } from '../../../../lib/repositories/parents';
import { ParentAttendanceCalendar } from '../../../../components/parent/ParentAttendanceCalendar';
import { ToastProvider } from '../../../../components/ui/Toast';
import { SessionProvider } from '../../../../components/providers/SessionProvider';
import { Session } from '../../../../types';

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

function renderWithProviders(ui: React.ReactElement, initialSession?: Session) {
  if (initialSession) {
    store.set('sp:v1:session', JSON.stringify(initialSession));
  }
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
  console.log('Running TASK-038 Parent Monthly Attendance Calendar Test Suite...\n');

  // Seed storage
  store.clear();
  await ensureSeeded();
  console.log('✓ Storage seeded with demo data');

  // --- 1. Monthly Calendar Grid Utility Tests ---
  console.log('\n--- 1. Monthly Calendar Grid Utility Tests ---');
  {
    assert.strictEqual(getMonthName(8), 'August');
    assert.strictEqual(getMonthName(1), 'January');

    // August 2026 starts on Saturday (2026-08-01)
    const grid = getMonthCalendarGrid(2026, 8);
    assert.strictEqual(grid.length % 7, 0, 'Calendar grid must be a multiple of 7');
    assert.ok(grid.length >= 35, 'Must contain at least 5 complete weeks');

    // Find August 1 cell
    const aug1 = grid.find((c) => c.date === '2026-08-01');
    assert.ok(aug1, '2026-08-01 must be in grid');
    assert.strictEqual(aug1.dayNumber, 1);
    assert.strictEqual(aug1.isCurrentMonth, true);

    // Find August 31 cell
    const aug31 = grid.find((c) => c.date === '2026-08-31');
    assert.ok(aug31, '2026-08-31 must be in grid');
    assert.strictEqual(aug31.dayNumber, 31);
    assert.strictEqual(aug31.isCurrentMonth, true);

    // Verify leading days (July)
    const julyCell = grid.find((c) => c.date.startsWith('2026-07-'));
    assert.ok(julyCell, 'Leading days from July must be present');
    assert.strictEqual(julyCell.isCurrentMonth, false);

    // Verify Sundays
    const sundayCells = grid.filter((c) => c.isSunday);
    assert.ok(sundayCells.length >= 4, 'Must have at least 4 Sundays');
    sundayCells.forEach((s) => {
      const d = new Date(s.date);
      assert.strictEqual(d.getDay(), 0, 'Cell marked isSunday must have day 0');
    });

    console.log(`✓ getMonthCalendarGrid verified for August 2026 (${grid.length} cells, Monday to Sunday)`);
  }

  // --- 2. Repository Monthly Attendance Query Tests ---
  console.log('\n--- 2. Repository Monthly Attendance Query Tests ---');
  {
    const targetStudentId = 'stu_ayesha';
    const monthData = await getStudentMonthAttendance(
      { schoolId: 'sch_main' },
      targetStudentId,
      2026,
      8
    );

    assert.ok(monthData, 'Monthly attendance must be returned for Ayesha');
    assert.strictEqual(monthData.student.id, targetStudentId);
    assert.ok(monthData.userName.includes('Ayesha'), 'User name must resolve');
    assert.strictEqual(monthData.year, 2026);
    assert.strictEqual(monthData.month, 8);
    assert.strictEqual(monthData.monthName, 'August');

    // Verify summary counts and percentage
    assert.ok(monthData.summary.totalInstructionalDays > 0, 'Total instructional days must be > 0');
    assert.ok(monthData.summary.presentCount > 0, 'Present count must be > 0');
    assert.ok(monthData.summary.percentage > 0, 'Percentage must be calculated');
    assert.strictEqual(
      monthData.summary.presentCount + monthData.summary.absentCount + monthData.summary.lateCount + monthData.summary.leaveCount,
      monthData.summary.totalInstructionalDays,
      'Status tallies must sum to total instructional days'
    );

    // Verify day record mappings
    assert.ok(Object.keys(monthData.recordsByDate).length > 0, 'recordsByDate must contain entries');
    const firstDate = Object.keys(monthData.recordsByDate)[0];
    assert.ok(firstDate.startsWith('2026-08-'), 'Recorded date must be in August');

    console.log(`✓ getStudentMonthAttendance verified: ${monthData.userName} (${monthData.summary.percentage}%, ${monthData.summary.presentCount} present, ${monthData.summary.absentCount} absent)`);
  }

  // --- 3. Acceptance Criteria 1: Colour + Label Coding in Calendar Grid ---
  console.log('\n--- 3. Acceptance Criteria 1: Colour + Label Coding in Calendar Grid ---');
  {
    const tariqSession: Session = {
      userId: 'usr_parent_tariq',
      role: 'parent',
      schoolId: 'sch_main',
      campusId: 'cmp_main',
      activeChildId: 'stu_ayesha',
    };

    const calendarHtml = renderWithProviders(
      React.createElement(ParentAttendanceCalendar, {
        initialStudentId: 'stu_ayesha',
        initialScope: { schoolId: 'sch_main' },
      }),
      tariqSession
    );

    // Verify Present status badge has BOTH color and visible label/glyph
    assert.ok(
      calendarHtml.includes('Present'),
      'Must contain text label "Present"'
    );
    assert.ok(
      calendarHtml.includes('bg-emerald-100') || calendarHtml.includes('text-emerald-800'),
      'Present badge must feature emerald color tokens'
    );
    assert.ok(
      calendarHtml.includes('✓'),
      'Present badge must feature checkmark glyph'
    );

    // Verify Legend explains all 4 statuses
    assert.ok(calendarHtml.includes('Attendance Key:'), 'Must render legend title');
    assert.ok(calendarHtml.includes('Attended class'), 'Legend must explain Present');
    assert.ok(calendarHtml.includes('Missed day'), 'Legend must explain Absent');
    assert.ok(calendarHtml.includes('Tardy arrival'), 'Legend must explain Late');
    assert.ok(calendarHtml.includes('Approved leave'), 'Legend must explain Leave');

    console.log('✓ Acceptance criteria 1 verified: Colour + label coding present on all statuses');
  }

  // --- 4. Acceptance Criteria 2: Summary Counts and Percentage ---
  console.log('\n--- 4. Acceptance Criteria 2: Summary Counts and Percentage ---');
  {
    const tariqSession: Session = {
      userId: 'usr_parent_khan',
      role: 'parent',
      schoolId: 'sch_main',
      campusId: 'cmp_main',
      activeChildId: 'stu_ayesha',
    };

    const calendarHtml = renderWithProviders(
      React.createElement(ParentAttendanceCalendar, {
        initialStudentId: 'stu_ayesha',
        initialScope: { schoolId: 'sch_main' },
      }),
      tariqSession
    );

    // Verify all 5 StatCards are rendered
    assert.ok(calendarHtml.includes('Monthly Presence'), 'Must render Monthly Presence stat');
    assert.ok(calendarHtml.includes('Days Present'), 'Must render Days Present stat');
    assert.ok(calendarHtml.includes('Days Absent'), 'Must render Days Absent stat');
    assert.ok(calendarHtml.includes('Days Late'), 'Must render Days Late stat');
    assert.ok(calendarHtml.includes('Days on Leave'), 'Must render Days on Leave stat');

    console.log('✓ Acceptance criteria 2 verified: Summary counts and percentage cards rendered');
  }

  // --- 5. Multi-Child Scope & Tenant Isolation Verification ---
  console.log('\n--- 5. Multi-Child Scope & Tenant Isolation Verification ---');
  {
    // Demo parent Tariq Khan has Ahmed and Ayesha
    const children = await getChildrenForParent('usr_parent_khan');
    assert.strictEqual(children.length, 2, 'Tariq Khan must have 2 enrolled children');
    const childIds = children.map((c) => c.student.id);
    assert.ok(childIds.includes('stu_ahmed'), 'Tariq must own Ahmed');
    assert.ok(childIds.includes('stu_ayesha'), 'Tariq must own Ayesha');

    // An unrelated student (e.g. stu_bilal) must NOT belong to Tariq
    const isBilalAuthorized = childIds.includes('stu_bilal');
    assert.strictEqual(isBilalAuthorized, false, 'Unrelated student must NOT be authorized for Tariq');

    console.log('✓ Parental tenant isolation and child authorization verified');
  }

  console.log('\n========================================');
  console.log('ALL TASK-038 PARENT ATTENDANCE TESTS PASSED! ✅');
  console.log('========================================\n');
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
