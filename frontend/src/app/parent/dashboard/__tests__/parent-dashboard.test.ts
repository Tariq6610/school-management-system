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
  value: {
    localStorage: mockStorage,
    addEventListener: () => {},
    removeEventListener: () => {},
    print: () => {},
  },
  writable: true,
});

import React from 'react';
import { renderToString } from 'react-dom/server';
import { ensureSeeded } from '../../../../lib/seed/boot';
import { getChildrenForParent } from '../../../../lib/repositories/parents';
import { getParentDashboardChildData } from '../../../../lib/repositories/parentDashboard';
import { ParentDashboardView } from '../../../../components/parent/ParentDashboardView';
import { ToastProvider } from '../../../../components/ui/Toast';
import { SessionProvider } from '../../../../components/providers/SessionProvider';
import { setSession } from '../../../../lib/repositories/session';

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
  console.log('--- Running TASK-075 Parent Dashboard Tests ---');

  // 1. Seed base data & establish parent session
  await ensureSeeded();
  const schoolId = 'sch_main';

  await setSession({
    userId: 'usr_parent_khan',
    role: 'parent',
    schoolId: 'sch_main',
    campusId: 'camp_main',
  });

  // 2. Fetch children linked to parent
  const parentChildren = await getChildrenForParent('usr_parent_khan');
  assert(parentChildren.length >= 2, 'Parent must have at least 2 linked children for multi-child testing');

  const child1 = parentChildren[0];
  const child2 = parentChildren[1];

  console.log(`Testing with Child 1 (${child1.user.name}, ID: ${child1.student.id}) and Child 2 (${child2.user.name}, ID: ${child2.student.id})`);

  // 3. Test Repository: getParentDashboardChildData for Child 1
  const child1Data = await getParentDashboardChildData(child1.student.id, schoolId);
  assert(child1Data !== null, 'Child 1 data must be loaded successfully');
  assert.strictEqual(child1Data.student.id, child1.student.id);
  assert.strictEqual(child1Data.user.id, child1.user.id);

  // Acceptance Criterion Pillar 1: Attendance
  assert(child1Data.attendance !== undefined, 'Child 1 must have attendance pillar');
  assert(typeof child1Data.attendance.percentage === 'number', 'Attendance percentage must be a number');
  assert(typeof child1Data.attendance.presentCount === 'number', 'Present count must be a number');
  assert(typeof child1Data.attendance.absentCount === 'number', 'Absent count must be a number');
  assert(typeof child1Data.attendance.totalDays === 'number', 'Total days must be a number');
  console.log(`✓ Pillar 1 (Attendance) for Child 1: ${child1Data.attendance.percentage}% (${child1Data.attendance.presentCount}/${child1Data.attendance.totalDays} days)`);

  // Acceptance Criterion Pillar 2: Homework
  assert(child1Data.homework !== undefined, 'Child 1 must have homework pillar');
  assert(typeof child1Data.homework.totalPendingCount === 'number', 'Total pending homework count must be a number');
  assert(Array.isArray(child1Data.homework.items), 'Homework items must be an array');
  console.log(`✓ Pillar 2 (Homework) for Child 1: ${child1Data.homework.totalPendingCount} pending assignments`);

  // Acceptance Criterion Pillar 3: Fees
  assert(child1Data.fees !== undefined, 'Child 1 must have fees pillar');
  assert(typeof child1Data.fees.outstandingBalance === 'number', 'Outstanding balance must be a number');
  assert(typeof child1Data.fees.totalInvoiced === 'number', 'Total invoiced must be a number');
  assert(Array.isArray(child1Data.fees.invoices), 'Invoices must be an array');
  console.log(`✓ Pillar 3 (Fees) for Child 1: PKR ${child1Data.fees.outstandingBalance.toLocaleString()} outstanding balance`);

  // Acceptance Criterion Pillar 4: Next Exam
  assert('nextExam' in child1Data, 'Child 1 must have next exam pillar attribute');
  if (child1Data.nextExam) {
    assert(typeof child1Data.nextExam.name === 'string', 'Next exam must have a name');
    assert(typeof child1Data.nextExam.subjectName === 'string', 'Next exam must have a subject name');
    assert(typeof child1Data.nextExam.date === 'string', 'Next exam must have a date');
    assert(typeof child1Data.nextExam.daysUntil === 'number', 'Next exam must have days countdown');
    console.log(`✓ Pillar 4 (Next Exam) for Child 1: ${child1Data.nextExam.name} (${child1Data.nextExam.subjectName}) in ${child1Data.nextExam.daysUntil} days`);
  } else {
    console.log('✓ Pillar 4 (Next Exam) for Child 1: No upcoming exam scheduled (null safely handled)');
  }

  // 4. Test Repository: getParentDashboardChildData for Child 2 (Different child metrics)
  const child2Data = await getParentDashboardChildData(child2.student.id, schoolId);
  assert(child2Data !== null, 'Child 2 data must be loaded successfully');
  assert.strictEqual(child2Data.student.id, child2.student.id);
  assert.notStrictEqual(child1Data.student.id, child2Data.student.id, 'Children must have distinct student records');

  assert(child2Data.attendance !== undefined, 'Child 2 must have attendance pillar');
  assert(child2Data.homework !== undefined, 'Child 2 must have homework pillar');
  assert(child2Data.fees !== undefined, 'Child 2 must have fees pillar');
  assert('nextExam' in child2Data, 'Child 2 must have next exam pillar attribute');
  console.log(`✓ All 4 pillars verified independently for Child 2 (${child2.user.name})`);

  // 5. Test Non-existent child handling
  const nullData = await getParentDashboardChildData('stu_non_existent', schoolId);
  assert.strictEqual(nullData, null, 'Non-existent student must return null gracefully');
  console.log('✓ Non-existent student ID returns null safely');

  // 6. Test SSR Rendering of ParentDashboardView with All 4 Acceptance Pillars
  const viewHtml = renderWithProviders(
    React.createElement(ParentDashboardView, {
      initialStudentId: child1.student.id,
      initialChildData: child1Data,
    })
  );

  // Verify Header & Multi-Child Switcher
  assert(viewHtml.includes('Parent Portal Dashboard'), 'Dashboard must render title');
  assert(viewHtml.includes(child1.user.name), 'Dashboard must render active child name');

  // Verify Pillar 1 UI: Attendance
  assert(viewHtml.includes('Attendance'), 'Must display Attendance pillar card');
  assert(viewHtml.includes('attendance rate'), 'Must display attendance rate label');
  assert(viewHtml.includes(`${child1Data.attendance.percentage}%`), 'Must display attendance percentage');

  // Verify Pillar 2 UI: Homework
  assert(viewHtml.includes('Homework'), 'Must display Homework pillar card');
  assert(viewHtml.includes('tasks pending'), 'Must display tasks pending label');
  assert(viewHtml.includes(`${child1Data.homework.totalPendingCount}`), 'Must display pending assignments count');

  // Verify Pillar 3 UI: Fees
  assert(viewHtml.includes('Fee Balance') || viewHtml.includes('Fee Obligation'), 'Must display Fee pillar card');
  assert(viewHtml.includes('Current Balance'), 'Must display Current Balance label');

  // Verify Pillar 4 UI: Next Exam
  assert(viewHtml.includes('Next Exam') || viewHtml.includes('Upcoming Examination Assessment'), 'Must display Next Exam pillar card');
  if (child1Data.nextExam) {
    assert(viewHtml.includes(child1Data.nextExam.name), 'Must display next exam name');
  }

  // Verify Action Links
  assert(viewHtml.includes('/parent/attendance'), 'Must link to child attendance page');
  assert(viewHtml.includes('/parent/fees'), 'Must link to child fees page');

  console.log('✓ SSR Rendering of ParentDashboardView with all 4 pillars verified');

  console.log('--- ALL TASK-075 TESTS PASSED SUCCESSFULLY ---');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
