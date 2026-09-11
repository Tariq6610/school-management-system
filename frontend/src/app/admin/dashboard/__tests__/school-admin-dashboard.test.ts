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
    confirm: () => true,
    location: { href: '' },
  },
  writable: true,
});

import test from 'node:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ensureSeeded } from '@/lib/seed/boot';
import { getSchoolAdminDashboardStats } from '@/lib/repositories/schoolAdminDashboard';
import { SchoolAdminDashboardView, SchoolAdminDashboardViewProps } from '@/components/dashboard/SchoolAdminDashboardView';

test('TASK-073: School Admin Dashboard (Students, Today Attendance, Pending Fees, Upcoming Exams, SSR)', async () => {
  console.log('--- Seeding Storage for School Admin Dashboard Tests ---');
  await ensureSeeded({ force: true });

  const schoolId = 'sch_main';
  const scope = { schoolId };

  console.log('--- Test 1: Verify Students Pillar ---');
  const stats = await getSchoolAdminDashboardStats(scope);

  assert.ok(stats.activeStudents > 0, `Expected activeStudents > 0, got ${stats.activeStudents}`);
  assert.ok(stats.totalStudents >= stats.activeStudents, 'totalStudents should be >= activeStudents');
  assert.ok(stats.totalTeachers > 0, `Expected totalTeachers > 0, got ${stats.totalTeachers}`);
  assert.ok(stats.studentTeacherRatio > 0, `Expected studentTeacherRatio > 0, got ${stats.studentTeacherRatio}`);
  console.log(`  ✓ Students: ${stats.activeStudents} active, ${stats.totalTeachers} teachers, ratio ${stats.studentTeacherRatio}:1`);

  console.log('--- Test 2: Verify Today\'s Attendance Pillar ---');
  const att = stats.todayAttendance;
  assert.ok(att.date.length === 10, 'Expected valid date string YYYY-MM-DD');
  assert.ok(att.totalClasses > 0, `Expected totalClasses > 0, got ${att.totalClasses}`);
  assert.ok(att.attendancePercentage >= 0 && att.attendancePercentage <= 100, `Expected valid attendance rate, got ${att.attendancePercentage}%`);
  assert.ok(att.markedClassesCount + att.unmarkedClassesCount === att.totalClasses, 'Sum of marked and unmarked must equal totalClasses');
  console.log(`  ✓ Today's Attendance: ${att.attendancePercentage}% on ${att.date} (${att.markedClassesCount}/${att.totalClasses} marked)`);

  console.log('--- Test 3: Verify Pending Fees Pillar ---');
  const fees = stats.pendingFees;
  assert.ok(fees.totalBilled > 0, `Expected totalBilled > 0, got ${fees.totalBilled}`);
  assert.ok(fees.totalCollected > 0, `Expected totalCollected > 0, got ${fees.totalCollected}`);
  assert.ok(fees.pendingAmount >= 0, `Expected pendingAmount >= 0, got ${fees.pendingAmount}`);
  assert.ok(fees.collectionRate >= 0 && fees.collectionRate <= 100, `Expected valid collectionRate, got ${fees.collectionRate}%`);
  assert.ok(fees.defaultersCount >= 0, `Expected non-negative defaulters count, got ${fees.defaultersCount}`);
  console.log(`  ✓ Fees: PKR ${fees.totalCollected.toLocaleString()} collected of ${fees.totalBilled.toLocaleString()} (${fees.collectionRate}%), pending PKR ${fees.pendingAmount.toLocaleString()}`);

  console.log('--- Test 4: Verify Upcoming Exams Pillar ---');
  const exams = stats.upcomingExams;
  assert.ok(exams.length > 0, `Expected upcomingExams.length > 0, got ${exams.length}`);
  for (const ex of exams) {
    assert.ok(ex.name.length > 0, 'Exam name must not be empty');
    assert.ok(ex.subjectName.length > 0, 'Subject name must not be empty');
    assert.ok(ex.className.length > 0, 'Class name must not be empty');
    assert.ok(ex.maxMarks > 0, 'Max marks must be > 0');
  }
  console.log(`  ✓ Upcoming Exams: ${exams.length} scheduled assessments loaded`);

  console.log('--- Test 5: SSR Render of SchoolAdminDashboardView ---');
  const html = renderToString(
    React.createElement<SchoolAdminDashboardViewProps>(SchoolAdminDashboardView, {
      schoolId,
      initialData: stats,
    })
  );

  assert.ok(html.includes('School Admin Dashboard'), 'Header text missing');
  assert.ok(html.includes('Enrolled Students'), 'Students card missing');
  assert.ok(html.includes('Pending Fees'), 'Fees card missing');
  assert.ok(html.includes('Upcoming Exams'), 'Upcoming exams card missing');
  assert.ok(html.includes(String(stats.activeStudents)), 'Active students value missing');

  console.log('All TASK-073 School Admin Dashboard tests passed cleanly! 🎉');
});
