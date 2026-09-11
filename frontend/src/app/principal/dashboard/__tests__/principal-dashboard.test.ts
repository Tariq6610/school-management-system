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
import { PrincipalDashboardView, PrincipalDashboardViewProps } from '@/components/dashboard/PrincipalDashboardView';

test('TASK-074: Principal Dashboard (Strict Campus Scope, Own Campus Only, SSR)', async () => {
  console.log('--- Seeding Storage for Principal Dashboard Tests ---');
  await ensureSeeded({ force: true });

  const schoolId = 'sch_main';

  console.log('--- Test 1: Verify Strict Single-Campus Scoping (Own Campus Only) ---');
  const mainCampusScope = { schoolId, campusId: 'cmp_main' };
  const girlsCampusScope = { schoolId, campusId: 'cmp_girls' };

  const mainStats = await getSchoolAdminDashboardStats(mainCampusScope);
  const girlsStats = await getSchoolAdminDashboardStats(girlsCampusScope);

  // Invariant 1: Campus names must match the scoped campus
  assert.strictEqual(mainStats.campusName, 'Main Campus');
  assert.strictEqual(girlsStats.campusName, 'Girls Campus');

  // Invariant 2: Active students must be strictly isolated to their own campus
  assert.ok(mainStats.activeStudents > 0, 'Main campus must have active students');
  assert.ok(girlsStats.activeStudents > 0, 'Girls campus must have active students');
  assert.notStrictEqual(
    mainStats.activeStudents,
    girlsStats.activeStudents,
    'Main and Girls campus student totals should be distinct'
  );
  console.log(`  ✓ Main Campus Students: ${mainStats.activeStudents} vs Girls Campus Students: ${girlsStats.activeStudents}`);

  // Invariant 3: Teachers must be strictly isolated
  assert.ok(mainStats.totalTeachers > 0, 'Main campus must have teachers');
  assert.ok(girlsStats.totalTeachers > 0, 'Girls campus must have teachers');
  assert.notStrictEqual(
    mainStats.totalTeachers,
    girlsStats.totalTeachers,
    'Main and Girls campus teacher totals should be distinct'
  );
  console.log(`  ✓ Main Campus Faculty: ${mainStats.totalTeachers} vs Girls Campus Faculty: ${girlsStats.totalTeachers}`);

  console.log('--- Test 2: Verify Campus-Scoped Attendance Registers ---');
  assert.ok(
    mainStats.todayAttendance.totalClasses < 21,
    `Main campus classes (${mainStats.todayAttendance.totalClasses}) must be fewer than whole-network classes (21)`
  );
  assert.ok(
    girlsStats.todayAttendance.totalClasses < 21,
    `Girls campus classes (${girlsStats.todayAttendance.totalClasses}) must be fewer than whole-network classes (21)`
  );
  console.log(`  ✓ Main Campus Classes: ${mainStats.todayAttendance.totalClasses}, Girls Campus Classes: ${girlsStats.todayAttendance.totalClasses}`);

  console.log('--- Test 3: Verify Campus-Scoped Fee Recovery ---');
  assert.ok(mainStats.pendingFees.totalBilled > 0);
  assert.ok(girlsStats.pendingFees.totalBilled > 0);
  assert.notStrictEqual(
    mainStats.pendingFees.totalBilled,
    girlsStats.pendingFees.totalBilled,
    'Campus fee totals must reflect own campus billing only'
  );
  console.log(`  ✓ Main Campus Billed: PKR ${mainStats.pendingFees.totalBilled.toLocaleString()} vs Girls: PKR ${girlsStats.pendingFees.totalBilled.toLocaleString()}`);

  console.log('--- Test 4: SSR Render of PrincipalDashboardView ---');
  const html = renderToString(
    React.createElement<PrincipalDashboardViewProps>(PrincipalDashboardView, {
      schoolId,
      campusId: 'cmp_main',
      initialData: mainStats,
    })
  );

  assert.ok(html.includes('Principal Dashboard'), 'Principal header text missing');
  assert.ok(html.includes('Main Campus'), 'Campus jurisdiction badge missing');
  assert.ok(html.includes('Own Campus Only'), 'Own campus only badge missing');
  assert.ok(html.includes('Campus Students'), 'Campus students card missing');
  assert.ok(html.includes(String(mainStats.activeStudents)), 'Active students count missing in SSR HTML');

  console.log('All TASK-074 Principal Dashboard tests passed cleanly! 🎉');
});
