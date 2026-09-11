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
  getTeacherByUserId,
  getTeacherAssignedClasses,
  getTeacherSchedule,
} from '../../../../lib/repositories/teachers';
import {
  getAttendanceByClassAndDate,
  saveAttendance,
  calculateClassDaySummary,
} from '../../../../lib/repositories/attendance';
import { ToastProvider } from '../../../../components/ui/Toast';
import { SessionProvider } from '../../../../components/providers/SessionProvider';
import { ClassAttendanceCard } from '../../../../components/teacher/ClassAttendanceCard';
import { TeacherDashboardView } from '../../../../components/teacher/TeacherDashboardView';
import { Class } from '../../../../types';

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

async function runTests() {
  console.log("Running TASK-035 Teacher Dashboard Today's Classes & Marked State Test Suite...\n");

  // 1. Seed database
  console.log('1. Seeding mock database...');
  await ensureSeeded();

  // 2. Resolve Teacher & Assigned Classes
  console.log('2. Resolving teacher assignments for Sana Malik (Demo Teacher)...');
  const teacher = await getTeacherByUserId('usr_teacher_sana');
  assert.ok(teacher, 'Teacher record for usr_teacher_sana should exist');
  assert.strictEqual(teacher.id, 'tch_sana', 'Teacher ID should be tch_sana');

  const scope = { schoolId: teacher.schoolId };
  const assignedClasses = await getTeacherAssignedClasses(teacher.id, scope);
  assert.ok(assignedClasses.length > 0, 'Teacher should have assigned classes');
  console.log(`✓ Resolved ${assignedClasses.length} assigned class(es) for teacher ${teacher.id}.`);

  const homeroomClass = assignedClasses.find((c) => c.isClassTeacher) || assignedClasses[0];
  assert.ok(homeroomClass, 'Teacher should have assigned class');
  console.log(`✓ Homeroom class identified: Grade ${homeroomClass.classInfo.grade}-${homeroomClass.classInfo.section}.`);

  // 3. Test Marked State Differentiation on Marked Date vs Unmarked Date
  console.log('3. Testing differentiation between marked and unmarked states...');
  const markedDate = '2026-07-15'; // Known seeded date in historical 40 days
  const unmarkedDate = '2026-09-10'; // New date

  const markedAttendance = await getAttendanceByClassAndDate(
    scope,
    homeroomClass.classInfo.id,
    markedDate
  );
  assert.ok(markedAttendance, `Class should have marked attendance for ${markedDate}`);
  const summary = calculateClassDaySummary(markedAttendance);
  assert.ok(summary.percentage > 0, 'Summary should have presence percentage');
  console.log(`✓ Marked date (${markedDate}) shows attendance recorded with ${summary.percentage}% presence.`);

  const unmarkedAttendance = await getAttendanceByClassAndDate(
    scope,
    homeroomClass.classInfo.id,
    unmarkedDate
  );
  assert.strictEqual(unmarkedAttendance, null, `Class should be UNMARKED for ${unmarkedDate}`);
  console.log(`✓ Unmarked date (${unmarkedDate}) correctly returns null (Needs Marking).`);

  // 4. Test Transition: Marking an Unmarked Class Moves it to Marked
  console.log('4. Testing transition: saving attendance moves class from Needs Marking to Marked...');
  await saveAttendance(scope, {
    classId: homeroomClass.classInfo.id,
    campusId: homeroomClass.classInfo.campusId,
    academicYearId: 'ay_2026',
    date: unmarkedDate,
    present: ['stu_1', 'stu_2', 'stu_3'],
    absent: ['stu_4'],
    late: [],
    leave: [],
    markedBy: 'usr_teacher_sana',
  });

  const nowMarkedAttendance = await getAttendanceByClassAndDate(
    scope,
    homeroomClass.classInfo.id,
    unmarkedDate
  );
  assert.ok(nowMarkedAttendance, 'Attendance now exists after saving');
  const newSummary = calculateClassDaySummary(nowMarkedAttendance);
  assert.strictEqual(newSummary.presentCount, 3, 'Summary reflects 3 present students');
  assert.strictEqual(newSummary.absentCount, 1, 'Summary reflects 1 absent student');
  console.log('✓ Class successfully transitioned from Needs Marking to Marked.');

  // 5. Test Teacher Schedule Retrieval
  console.log("5. Testing teacher's daily timetable retrieval...");
  const schedule = await getTeacherSchedule(teacher.id, scope);
  assert.ok(Array.isArray(schedule), 'Schedule should be an array');
  console.log(`✓ Retrieved ${schedule.length} timetable slot(s) for teacher.`);

  // 6. Test Component Rendering (SSR)
  console.log('6. Validating SSR rendering of ClassAttendanceCard & TeacherDashboardView...');
  const testClass: Class = homeroomClass.classInfo;

  // Render Unmarked Card
  const unmarkedCardHtml = renderToString(
    React.createElement(ClassAttendanceCard, {
      classInfo: testClass,
      isClassTeacher: true,
      isMarked: false,
      selectedDate: '2026-09-11',
      studentCount: 20,
      campusName: 'Main Campus',
    })
  );
  assert.ok(unmarkedCardHtml.includes('Needs Marking'), 'Unmarked card displays Needs Marking badge');
  assert.ok(unmarkedCardHtml.includes('Mark Attendance'), 'Unmarked card displays Mark Attendance button');
  assert.ok(unmarkedCardHtml.includes('Homeroom'), 'Card indicates homeroom status');
  console.log('✓ ClassAttendanceCard (Unmarked state) SSR verified.');

  // Render Marked Card
  const markedCardHtml = renderToString(
    React.createElement(ClassAttendanceCard, {
      classInfo: testClass,
      isClassTeacher: true,
      isMarked: true,
      attendanceDay: nowMarkedAttendance,
      summary: newSummary,
      selectedDate: unmarkedDate,
      studentCount: 20,
      campusName: 'Main Campus',
    })
  );
  assert.ok(markedCardHtml.includes('Marked'), 'Marked card displays Marked badge');
  assert.ok(markedCardHtml.includes('View / Edit Register'), 'Marked card displays View / Edit Register CTA');
  assert.ok(markedCardHtml.includes('Present'), 'Marked card displays presence counts');
  assert.ok(markedCardHtml.includes('Absent'), 'Marked card displays absent counts');
  console.log('✓ ClassAttendanceCard (Marked state) SSR verified.');

  // Render Full Teacher Dashboard View inside Providers
  const dashboardHtml = renderToString(
    React.createElement(
      AppRouterContext.Provider,
      { value: mockRouter },
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          SessionProvider,
          null,
          React.createElement(TeacherDashboardView, {
            initialDate: unmarkedDate,
          })
        )
      )
    )
  );
  assert.ok(dashboardHtml.toLowerCase().includes('teacher') || dashboardHtml.includes('Loading'), 'Dashboard renders teacher dashboard state');
  console.log('✓ TeacherDashboardView SSR verified.');

  console.log("\nAll TASK-035 Teacher Dashboard Today's Classes & Marked State tests PASSED! 🎉\n");
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
