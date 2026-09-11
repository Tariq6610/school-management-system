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
    confirm: () => true,
  },
  writable: true,
});

import React from 'react';
import { renderToString } from 'react-dom/server';
import { ensureSeeded } from '@/lib/seed/boot';
import {
  getClassTimetableGrid,
  getTeacherTimetableGrid,
  getRoomTimetableGrid,
  listDistinctRooms,
  upsertTimetableSlot,
} from '@/lib/repositories/timetableSlots';
import { listClasses } from '@/lib/repositories/classes';
import { listTeachers } from '@/lib/repositories/teachers';
import { listSubjects } from '@/lib/repositories/subjects';
import { setSession } from '@/lib/repositories/session';
import { Scope } from '@/types';
import { ToastProvider } from '@/components/ui/Toast';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { TimetableScheduleViews } from '@/components/timetable/TimetableScheduleViews';

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
  console.log('--- Starting Timetable Views (Class, Teacher, Room) Tests (TASK-056) ---');

  // 1. Seed database and set session
  await ensureSeeded();
  await setSession({
    userId: 'usr_admin',
    role: 'school_admin',
    schoolId: 'sch_main',
    campusId: 'cmp_main',
  });
  const scope: Scope = { schoolId: 'sch_main', campusId: 'cmp_main' };

  // 2. Fetch seed classes, teachers, subjects
  console.log('1. Loading academic entities...');
  const classes = await listClasses(scope);
  const teachers = await listTeachers(scope);
  const subjects = await listSubjects(scope);

  assert.ok(classes.length > 0, 'Seed should contain classes');
  assert.ok(teachers.length > 0, 'Seed should contain teachers');
  assert.ok(subjects.length > 0, 'Seed should contain subjects');

  const targetClass = classes[0];
  const targetTeacher = teachers[0];

  // 3. Test listDistinctRooms
  console.log('2. Testing listDistinctRooms...');
  const distinctRooms = await listDistinctRooms(scope);
  assert.ok(Array.isArray(distinctRooms), 'distinctRooms must be an array');
  assert.ok(distinctRooms.length > 0, 'distinctRooms should find rooms in seeded database');
  console.log(`  ✓ Discovered ${distinctRooms.length} distinct rooms: ${distinctRooms.slice(0, 5).join(', ')}...`);

  // Ensure a known room has a test slot
  const testRoom = distinctRooms[0];
  await upsertTimetableSlot({
    schoolId: 'sch_main',
    campusId: 'cmp_main',
    classId: targetClass.id,
    subjectId: subjects[0].id,
    teacherId: targetTeacher.id,
    dayOfWeek: 2,
    period: 1,
    room: testRoom,
  });

  // 4. Test getClassTimetableGrid
  console.log('3. Testing getClassTimetableGrid for Class schedule view...');
  const classGrid = await getClassTimetableGrid(scope, targetClass.id);
  assert.strictEqual(classGrid.classId, targetClass.id);
  assert.ok(classGrid.slots.length > 0, 'Class should have scheduled slots');
  assert.ok(classGrid.slotMap['2_1'], 'Tuesday Period 1 slot should exist in slotMap');
  assert.strictEqual(classGrid.slotMap['2_1'].room, testRoom);
  console.log(`  ✓ Class grid mapped ${classGrid.slots.length} slots for ${targetClass.grade} - ${targetClass.section}`);

  // 5. Test getTeacherTimetableGrid
  console.log('4. Testing getTeacherTimetableGrid for Faculty schedule view...');
  const teacherGrid = await getTeacherTimetableGrid(scope, targetTeacher.id);
  assert.strictEqual(teacherGrid.teacherId, targetTeacher.id);
  assert.ok(teacherGrid.teacherName.length > 0, 'Teacher name should be enriched');
  assert.ok(teacherGrid.slots.length > 0, 'Teacher should have assigned teaching slots');
  assert.ok(teacherGrid.slotMap['2_1'], 'Tuesday Period 1 should be mapped to teacher');
  assert.strictEqual(teacherGrid.slotMap['2_1'].teacherId, targetTeacher.id);
  assert.ok(teacherGrid.metrics.teachingPeriodsCount >= 1, 'Metrics should count teaching periods');
  assert.ok(teacherGrid.metrics.uniqueClassesCount >= 1, 'Metrics should count unique classes');
  assert.ok(teacherGrid.metrics.uniqueSubjectsCount >= 1, 'Metrics should count unique subjects');
  console.log(`  ✓ Teacher grid mapped ${teacherGrid.slots.length} periods for ${teacherGrid.teacherName} (Teaching: ${teacherGrid.metrics.teachingPeriodsCount}, Classes: ${teacherGrid.metrics.uniqueClassesCount})`);

  // 6. Test getRoomTimetableGrid
  console.log('5. Testing getRoomTimetableGrid for Facility/Room schedule view...');
  const roomGrid = await getRoomTimetableGrid(scope, testRoom);
  assert.strictEqual(roomGrid.room, testRoom);
  assert.ok(roomGrid.slots.length > 0, 'Room should have occupied slots');
  assert.ok(roomGrid.slotMap['2_1'], 'Tuesday Period 1 should be mapped to room');
  assert.strictEqual(roomGrid.slotMap['2_1'].room, testRoom);
  assert.ok(roomGrid.metrics.occupiedPeriodsCount >= 1, 'Metrics should count occupied periods');
  assert.ok(roomGrid.metrics.uniqueClassesCount >= 1, 'Metrics should count unique classes using room');
  console.log(`  ✓ Room grid mapped ${roomGrid.slots.length} occupied periods for ${roomGrid.room}`);

  // 7. Test TimetableScheduleViews SSR rendering
  console.log('6. Testing TimetableScheduleViews SSR rendering...');
  const teacherItems = teachers.map((t) => ({
    id: t.id,
    name: t.employeeNumber || 'Teacher',
    department: t.department,
  }));

  const html = renderWithProviders(
    React.createElement(TimetableScheduleViews, {
      initialClasses: classes,
      initialTeachers: teacherItems,
      initialRooms: distinctRooms,
      initialPeriods: [
        { period: 1, name: 'Period 1', startTime: '08:00', endTime: '08:45', isBreak: false },
        { period: 2, name: 'Break', startTime: '08:45', endTime: '09:00', isBreak: true },
        { period: 3, name: 'Period 2', startTime: '09:00', endTime: '09:45', isBreak: false },
      ],
    })
  );

  assert.ok(html.includes('By Class'), 'Mode button By Class rendered');
  assert.ok(html.includes('By Teacher'), 'Mode button By Teacher rendered');
  assert.ok(html.includes('By Room'), 'Mode button By Room rendered');
  assert.ok(html.includes('Print Timetable'), 'Print button rendered');
  assert.ok(html.includes('Weekly Academic Schedule'), 'Document header rendered');
  assert.ok(html.includes('Period / Time'), 'Table headers rendered');
  console.log('  ✓ TimetableScheduleViews rendered successfully with print header and table structure');

  console.log('\n✅ All TASK-056 Timetable Views tests passed successfully!\n');
}

runTests().catch((err) => {
  console.error('❌ Tests failed:', err);
  process.exit(1);
});
