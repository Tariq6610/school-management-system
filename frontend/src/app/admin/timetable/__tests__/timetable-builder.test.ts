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
  },
  writable: true,
});

import React from 'react';
import { renderToString } from 'react-dom/server';
import { ensureSeeded } from '@/lib/seed/boot';
import {
  getClassTimetableGrid,
  upsertTimetableSlot,
  deleteTimetableSlotByCoordinates,
} from '@/lib/repositories/timetableSlots';
import { getPeriodConfiguration } from '@/lib/repositories/settings';
import { listClasses } from '@/lib/repositories/classes';
import { listSubjects } from '@/lib/repositories/subjects';
import { listTeachers } from '@/lib/repositories/teachers';
import { listUsers } from '@/lib/repositories/users';
import { setSession } from '@/lib/repositories/session';
import { Scope } from '@/types';
import { ToastProvider } from '@/components/ui/Toast';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { TimetableGrid } from '@/components/timetable/TimetableGrid';
import { SlotPickerModal } from '@/components/timetable/SlotPickerModal';

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
  console.log('--- Starting Timetable Builder Grid Tests (TASK-054) ---');

  // 1. Seed database and set session
  await ensureSeeded();
  await setSession({
    userId: 'usr_admin',
    role: 'school_admin',
    schoolId: 'sch_main',
    campusId: 'cmp_main',
  });
  const scope: Scope = { schoolId: 'sch_main', campusId: 'cmp_main' };

  // 2. Fetch seed classes, subjects, and teachers
  console.log('1. Loading class and academic structures...');
  const classes = await listClasses(scope);
  const subjects = await listSubjects(scope);
  const teachers = await listTeachers(scope);
  const users = await listUsers(scope);

  assert.ok(classes.length > 0, 'Seed should contain classes');
  assert.ok(subjects.length > 0, 'Seed should contain subjects');
  assert.ok(teachers.length > 0, 'Seed should contain teachers');
  const targetClass = classes[0];
  const classSubjects = subjects.filter((s) => s.classId === targetClass.id);
  assert.ok(classSubjects.length > 0, 'Target class should have subjects');
  console.log(`  ✓ Target class loaded: ${targetClass.grade} - ${targetClass.section} with ${classSubjects.length} subjects`);

  // 3. Testing getClassTimetableGrid
  console.log('2. Testing getClassTimetableGrid structured 2D mapping...');
  const grid = await getClassTimetableGrid(scope, targetClass.id);
  assert.strictEqual(grid.classId, targetClass.id);
  assert.ok(Array.isArray(grid.slots), 'grid.slots must be an array');
  assert.ok(grid.slots.length > 0, 'Seeded class should already have scheduled slots');
  assert.ok(grid.slotMap['1_1'], 'Monday period 1 should be indexed in slotMap');
  assert.strictEqual(grid.slotMap['1_1'].dayOfWeek, 1);
  assert.strictEqual(grid.slotMap['1_1'].period, 1);
  assert.ok(grid.slotMap['1_1'].teacherName, 'Slot should have enriched teacherName');
  assert.ok(grid.slotMap['1_1'].subjectName, 'Slot should have enriched subjectName');
  console.log(`  ✓ Grid mapped ${grid.slots.length} slots for ${targetClass.grade} - ${targetClass.section}`);

  // 4. Testing upsertTimetableSlot: Updating an existing cell (e.g. Day 1, Period 1)
  console.log('3. Testing upsertTimetableSlot updating an existing occupied cell...');
  const altSubject = classSubjects.length > 1 ? classSubjects[1] : classSubjects[0];
  const altTeacher = teachers.length > 1 ? teachers[1] : teachers[0];

  const updatedSlot = await upsertTimetableSlot({
    schoolId: targetClass.schoolId,
    campusId: targetClass.campusId,
    classId: targetClass.id,
    subjectId: altSubject.id,
    teacherId: altTeacher.id,
    dayOfWeek: 1,
    period: 1,
    room: 'Lab-A1',
  });

  assert.strictEqual(updatedSlot.subjectId, altSubject.id);
  assert.strictEqual(updatedSlot.teacherId, altTeacher.id);
  assert.strictEqual(updatedSlot.room, 'Lab-A1');

  // Verify in grid
  const refreshedGrid = await getClassTimetableGrid(scope, targetClass.id);
  assert.strictEqual(refreshedGrid.slotMap['1_1'].subjectId, altSubject.id);
  assert.strictEqual(refreshedGrid.slotMap['1_1'].teacherId, altTeacher.id);
  assert.strictEqual(refreshedGrid.slotMap['1_1'].room, 'Lab-A1');
  console.log('  ✓ Existing cell successfully updated with new subject, teacher, and room');

  // 5. Testing upsertTimetableSlot: Assigning an empty cell (e.g. Day 6 Saturday, Period 4)
  console.log('4. Testing upsertTimetableSlot assigning an empty cell...');
  const newSaturdaySlot = await upsertTimetableSlot({
    schoolId: targetClass.schoolId,
    campusId: targetClass.campusId,
    classId: targetClass.id,
    subjectId: classSubjects[0].id,
    teacherId: teachers[0].id,
    dayOfWeek: 6,
    period: 4,
    room: 'Room-Sat-101',
  });

  assert.ok(newSaturdaySlot.id, 'New slot should have an ID');
  assert.strictEqual(newSaturdaySlot.dayOfWeek, 6);
  assert.strictEqual(newSaturdaySlot.period, 4);
  assert.strictEqual(newSaturdaySlot.startTime, '10:30', 'Auto-resolved period 4 start time');
  assert.strictEqual(newSaturdaySlot.endTime, '11:15', 'Auto-resolved period 4 end time');

  const saturdayGrid = await getClassTimetableGrid(scope, targetClass.id);
  assert.ok(saturdayGrid.slotMap['6_4'], 'Saturday Period 4 slot must exist in grid');
  console.log('  ✓ Empty cell successfully assigned with auto-resolved period timing');

  // 6. Testing deleteTimetableSlotByCoordinates
  console.log('5. Testing deleteTimetableSlotByCoordinates...');
  const deleted = await deleteTimetableSlotByCoordinates(scope, targetClass.id, 6, 4);
  assert.strictEqual(deleted, true, 'deleteTimetableSlotByCoordinates should return true');

  const afterDeleteGrid = await getClassTimetableGrid(scope, targetClass.id);
  assert.strictEqual(afterDeleteGrid.slotMap['6_4'], undefined, 'Saturday slot should be removed');
  console.log('  ✓ Slot removed cleanly by dayOfWeek and period coordinates');

  // 7. Testing SlotPickerModal SSR Rendering
  console.log('6. Testing SlotPickerModal SSR rendering...');
  const userMap = new Map(users.map((u) => [u.id, u.name]));
  const teacherOpts = teachers.map((t) => ({
    id: t.id,
    name: userMap.get(t.userId) || t.employeeNumber || 'Teacher',
  }));

  const modalHtml = renderWithProviders(
    React.createElement(SlotPickerModal, {
      isOpen: true,
      onClose: () => {},
      dayName: 'Monday',
      periodName: 'Period 1',
      periodTime: '08:00 - 08:45',
      classNameLabel: `${targetClass.grade} - ${targetClass.section}`,
      subjects: classSubjects,
      teachers: teacherOpts,
      onSave: async () => {},
    })
  );

  assert.ok(modalHtml.includes('Assign Timetable Slot'), 'Modal title should render');
  assert.ok(modalHtml.includes(classSubjects[0].code), 'Subject options must be present');
  assert.ok(modalHtml.includes('Assigned Teacher / Instructor'), 'Teacher label must be present');
  console.log('  ✓ SlotPickerModal rendered cleanly under SSR');

  // 8. Testing TimetableGrid SSR Rendering
  console.log('7. Testing TimetableGrid SSR rendering...');
  const periodDefs = await getPeriodConfiguration(scope);
  const gridHtml = renderWithProviders(
    React.createElement(TimetableGrid, {
      initialClasses: classes,
      initialPeriods: periodDefs,
      initialTeachers: teacherOpts,
      initialSlotMap: grid.slotMap,
    })
  );
  assert.ok(gridHtml.includes('Select Class:'), 'Class selector label should render');
  assert.ok(gridHtml.includes('Monday'), 'Day column should render');
  assert.ok(gridHtml.includes('Friday'), 'Friday column should render');
  assert.ok(gridHtml.includes('Period / Time'), 'Header should render');
  console.log('  ✓ TimetableGrid rendered cleanly under SSR');

  console.log('\n--- ALL TIMETABLE BUILDER GRID TESTS PASSED! ---');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
