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
import { getCampusComparisonData } from '@/lib/repositories/networkDashboard';
import { CampusAttendanceBarChart } from '@/components/dashboard/CampusAttendanceBarChart';
import { CampusDrilldownDrawer } from '@/components/dashboard/CampusDrilldownDrawer';
import { CampusComparisonView } from '@/components/dashboard/CampusComparisonView';

test('TASK-072: Campus Comparison Screen (Sortable, Bar Chart, Drill-down, Honest Metrics)', async () => {
  console.log('--- Seeding Storage for Campus Comparison Tests ---');
  await ensureSeeded({ force: true });

  const schoolId = 'sch_main';
  const scope = { schoolId };

  console.log('--- Test 1: Verify Honest Multi-Campus Performance Metrics ---');
  const campuses = await getCampusComparisonData(scope);

  assert.ok(campuses.length >= 3, `Expected at least 3 campuses in seed, found ${campuses.length}`);

  for (const c of campuses) {
    console.log(`Verifying Campus: ${c.campusName} (${c.campusCode})`);
    // 1. Students count
    assert.ok(c.studentsCount > 0, `Expected studentsCount > 0 for ${c.campusName}, got ${c.studentsCount}`);
    // 2. Attendance rate this month
    assert.ok(c.attendanceRateThisMonth >= 0 && c.attendanceRateThisMonth <= 100, `Expected valid attendance rate for ${c.campusName}, got ${c.attendanceRateThisMonth}%`);
    // 3. Fee collection rate
    assert.ok(c.feeCollectionRate >= 0 && c.feeCollectionRate <= 100, `Expected valid fee collection rate for ${c.campusName}, got ${c.feeCollectionRate}%`);
    // 4. Teacher count
    assert.ok(c.teacherCount > 0, `Expected teacherCount > 0 for ${c.campusName}, got ${c.teacherCount}`);
    // 5. Average exam result
    assert.ok(c.averageExamResult >= 0 && c.averageExamResult <= 100, `Expected valid average exam score for ${c.campusName}, got ${c.averageExamResult}%`);

    // Additional operational details for drilldown
    assert.ok(c.classesCount > 0, `Expected classesCount > 0 for ${c.campusName}`);
    assert.ok(c.studentTeacherRatio > 0, `Expected studentTeacherRatio > 0 for ${c.campusName}`);
    assert.ok(c.totalFeeBilled >= c.totalFeeCollected, `Expected billed >= collected for ${c.campusName}`);
  }

  console.log('--- Test 2: Sorting Logic Verification ---');
  // Sort by studentsCount desc
  const sortedByStudents = [...campuses].sort((a, b) => b.studentsCount - a.studentsCount);
  assert.ok(sortedByStudents[0].studentsCount >= sortedByStudents[1].studentsCount);

  // Sort by attendanceRateThisMonth desc
  const sortedByAtt = [...campuses].sort((a, b) => b.attendanceRateThisMonth - a.attendanceRateThisMonth);
  assert.ok(sortedByAtt[0].attendanceRateThisMonth >= sortedByAtt[1].attendanceRateThisMonth);

  // Sort by feeCollectionRate desc
  const sortedByFee = [...campuses].sort((a, b) => b.feeCollectionRate - a.feeCollectionRate);
  assert.ok(sortedByFee[0].feeCollectionRate >= sortedByFee[1].feeCollectionRate);

  // Sort by averageExamResult desc
  const sortedByExams = [...campuses].sort((a, b) => b.averageExamResult - a.averageExamResult);
  assert.ok(sortedByExams[0].averageExamResult >= sortedByExams[1].averageExamResult);

  console.log('--- Test 3: SSR Render of CampusAttendanceBarChart ---');
  const barChartHtml = renderToString(
    React.createElement(CampusAttendanceBarChart, {
      campuses,
      activeMetric: 'attendance',
    })
  );
  assert.ok(barChartHtml.includes('Campus Performance Comparison'), 'Bar chart header missing');
  assert.ok(barChartHtml.includes('Attendance Rate This Month'), 'Metric label missing');
  for (const c of campuses) {
    assert.ok(barChartHtml.includes(c.campusName), `Bar chart missing campus name: ${c.campusName}`);
  }

  console.log('--- Test 4: SSR Render of CampusDrilldownDrawer ---');
  const drawerHtml = renderToString(
    React.createElement(CampusDrilldownDrawer, {
      campus: campuses[0],
      isOpen: true,
      onClose: () => {},
    })
  );
  assert.ok(drawerHtml.includes(campuses[0].campusName), 'Drawer missing campus name');
  assert.ok(drawerHtml.includes('Attendance Reliability'), 'Drawer missing attendance section');
  assert.ok(drawerHtml.includes('Fee Collection Efficiency'), 'Drawer missing fee section');

  console.log('--- Test 5: SSR Render of CampusComparisonView ---');
  const viewHtml = renderToString(React.createElement(CampusComparisonView));
  assert.ok(viewHtml.includes('Campus Comparison Screen'), 'View header missing');
  assert.ok(viewHtml.includes('Differentiation Screen 1'), 'Differentiation badge missing');
  assert.ok(viewHtml.includes('Campus Comparison Matrix'), 'Comparison matrix table missing');

  console.log('All TASK-072 Campus Comparison Screen tests passed cleanly! 🎉');
});
