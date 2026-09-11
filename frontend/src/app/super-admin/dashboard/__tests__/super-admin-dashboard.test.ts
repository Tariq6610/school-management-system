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
import {
  getNetworkOverviewStats,
  getNetworkRecentActivity,
} from '@/lib/repositories/networkDashboard';
import { SuperAdminDashboardView } from '@/components/dashboard/SuperAdminDashboardView';
import { RecentActivityFeed } from '@/components/dashboard/RecentActivityFeed';

test('TASK-071: Super Admin Network Dashboard (Five Stats, Recent Activity, SSR)', async () => {
  console.log('--- Seeding Storage for Super Admin Dashboard Tests ---');
  await ensureSeeded({ force: true });

  const schoolId = 'sch_main';
  const scope = { schoolId };

  console.log('--- Test 1: Verify Five Canonical Network Stats ---');
  const stats = await getNetworkOverviewStats(scope);

  // Stat 1: Schools
  assert.ok(stats.schoolsCount >= 1, 'Expected schoolsCount >= 1');
  // Stat 2: Campuses
  assert.ok(stats.campusesCount >= 1, 'Expected campusesCount >= 1');
  // Stat 3: Students
  assert.ok(stats.studentsCount >= 50, 'Expected studentsCount to reflect active students');
  // Stat 4: Teachers
  assert.ok(stats.teachersCount >= 5, 'Expected teachersCount to reflect active faculty');
  // Stat 5: Fee Collection This Month
  assert.ok(stats.feeCollectionThisMonth > 0, 'Expected feeCollectionThisMonth > 0');

  // Supplementary honest metrics
  assert.ok(stats.totalFeeBilled > 0, 'Expected totalFeeBilled > 0');
  assert.ok(stats.overallCollectionRate >= 0 && stats.overallCollectionRate <= 100, 'Collection rate must be valid percentage');
  assert.strictEqual(stats.campuses.length, stats.campusesCount, 'Campuses array length must match campusesCount');

  console.log('Five Stats Summary:');
  console.log(`  1. Schools: ${stats.schoolsCount}`);
  console.log(`  2. Campuses: ${stats.campusesCount}`);
  console.log(`  3. Students: ${stats.studentsCount}`);
  console.log(`  4. Teachers: ${stats.teachersCount}`);
  console.log(`  5. Fee Collection: PKR ${stats.feeCollectionThisMonth.toLocaleString('en-PK')} (${stats.overallCollectionRate}%)`);

  console.log('--- Test 2: Verify Honest Campus Breakdown ---');
  for (const c of stats.campuses) {
    assert.ok(c.campusId, 'Campus must have an ID');
    assert.ok(c.campusName, 'Campus must have a name');
    assert.ok(c.studentCount >= 0, 'Student count must be non-negative');
    assert.ok(c.teacherCount >= 0, 'Teacher count must be non-negative');
    assert.ok(c.attendanceRate >= 0 && c.attendanceRate <= 100, 'Attendance rate must be valid %');
    assert.ok(c.collectionRate >= 0 && c.collectionRate <= 100, 'Fee collection rate must be valid %');
  }

  console.log('--- Test 3: Verify Network Recent Activity Feed ---');
  const activities = await getNetworkRecentActivity(scope, 25);
  assert.ok(activities.length >= 5, 'Expected at least 5 recent activity records');

  // Verify chronological ordering (descending timestamp)
  for (let i = 0; i < activities.length - 1; i++) {
    const current = new Date(activities[i].timestamp).getTime();
    const next = new Date(activities[i + 1].timestamp).getTime();
    assert.ok(current >= next, `Activities must be in descending chronological order: ${activities[i].timestamp} >= ${activities[i + 1].timestamp}`);
  }

  // Verify diverse event categories exist
  const categories = new Set(activities.map((a) => a.category));
  assert.ok(categories.size >= 2, 'Expected activities from multiple event categories');

  console.log('--- Test 4: SSR Render of RecentActivityFeed ---');
  const feedHtml = renderToString(
    React.createElement(RecentActivityFeed, { activities })
  );
  assert.ok(feedHtml.includes('Network Recent Activity'), 'Feed HTML must render title');
  assert.ok(feedHtml.includes('Admissions'), 'Feed HTML must render category filters');
  assert.ok(feedHtml.includes('Fees'), 'Feed HTML must render fee filter');
  assert.ok(feedHtml.includes('Attendance'), 'Feed HTML must render attendance filter');

  console.log('--- Test 5: SSR Render of SuperAdminDashboardView ---');
  const dashHtml = renderToString(
    React.createElement(SuperAdminDashboardView, {
      schoolId,
      initialStats: stats,
      initialActivities: activities,
    })
  );
  assert.ok(dashHtml.includes('Institutional Network Overview'), 'Dashboard must render header');
  assert.ok(dashHtml.includes('1. Schools'), 'Dashboard must render Stat 1 card');
  assert.ok(dashHtml.includes('2. Campuses'), 'Dashboard must render Stat 2 card');
  assert.ok(dashHtml.includes('3. Students'), 'Dashboard must render Stat 3 card');
  assert.ok(dashHtml.includes('4. Teachers'), 'Dashboard must render Stat 4 card');
  assert.ok(dashHtml.includes('5. Month Fees'), 'Dashboard must render Stat 5 card');
  assert.ok(dashHtml.includes('Campus Health Register'), 'Dashboard must render campus comparison register');

  console.log('All TASK-071 Super Admin Network Dashboard tests passed cleanly! 🎉');
});
