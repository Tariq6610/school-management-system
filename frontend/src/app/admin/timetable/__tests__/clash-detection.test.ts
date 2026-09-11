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
  detectTimetableClashes,
  upsertTimetableSlot,
  createTimetableSlot,
} from '@/lib/repositories/timetableSlots';
import { listClasses } from '@/lib/repositories/classes';
import { listSubjects } from '@/lib/repositories/subjects';
import { listTeachers } from '@/lib/repositories/teachers';
import { listCampuses, createCampus } from '@/lib/repositories/campuses';
import { setSession } from '@/lib/repositories/session';
import { Scope, DayOfWeek } from '@/types';
import { SlotPickerModal } from '@/components/timetable/SlotPickerModal';

async function runTests() {
  console.log('--- Starting Live Clash Detection Tests (TASK-055) ---');

  // 1. Seed database and set session
  await ensureSeeded();
  await setSession({
    userId: 'usr_admin',
    role: 'school_admin',
    schoolId: 'sch_main',
    campusId: 'cmp_main',
  });
  const scope: Scope = { schoolId: 'sch_main', campusId: 'cmp_main' };

  // 2. Fetch seed classes, subjects, teachers, and campuses
  console.log('1. Loading academic entities for clash tests...');
  const classes = await listClasses(scope);
  const subjects = await listSubjects(scope);
  const teachers = await listTeachers(scope);
  const campuses = await listCampuses({ schoolId: 'sch_main' });

  assert.ok(classes.length >= 2, 'Need at least 2 classes for clash testing');
  assert.ok(teachers.length >= 2, 'Need at least 2 teachers for clash testing');
  assert.ok(subjects.length >= 2, 'Need at least 2 subjects for clash testing');

  const classA = classes[0];
  const classB = classes[1];
  const teacherA = teachers[0];
  const teacherB = teachers[1];
  const subjectA = subjects[0];
  const subjectB = subjects[1];

  console.log(`  ✓ Loaded Class A: ${classA.grade}-${classA.section}, Class B: ${classB.grade}-${classB.section}`);
  console.log(`  ✓ Loaded Teachers: ${teacherA.id}, ${teacherB.id}`);

  // Setup: Assign Teacher A to Class A in Room 301 on Monday (dayOfWeek: 1), Period 3
  console.log('2. Setting up base slot: Teacher A in Class A on Monday Period 3, Room 301...');
  const slotA = await upsertTimetableSlot({
    schoolId: 'sch_main',
    campusId: 'cmp_main',
    classId: classA.id,
    subjectId: subjectA.id,
    teacherId: teacherA.id,
    dayOfWeek: 1,
    period: 3,
    room: 'Room 301',
  });
  assert.ok(slotA.id, 'Base slot should be created');

  // Test 2.1: No clash when assigning Teacher B in Room 402 to Class B on Monday Period 3
  console.log('3. Testing no-clash scenario (different teacher, different room)...');
  const noClashResult = await detectTimetableClashes({
    schoolId: 'sch_main',
    campusId: 'cmp_main',
    classId: classB.id,
    dayOfWeek: 1,
    period: 3,
    teacherId: teacherB.id,
    room: 'Room 402',
  });
  assert.strictEqual(noClashResult.hasClash, false, 'Should have no clash');
  assert.strictEqual(noClashResult.clashes.length, 0, 'Clashes list should be empty');
  console.log('  ✓ No clash correctly identified');

  // Test 2.2: Teacher clash within same campus
  console.log('4. Testing teacher double-booking clash within same campus...');
  const teacherClashResult = await detectTimetableClashes({
    schoolId: 'sch_main',
    campusId: 'cmp_main',
    classId: classB.id,
    dayOfWeek: 1,
    period: 3,
    teacherId: teacherA.id,
    room: 'Room 402',
  });
  assert.strictEqual(teacherClashResult.hasClash, true, 'Should detect teacher clash');
  assert.ok(teacherClashResult.teacherClash, 'teacherClash property should be set');
  assert.strictEqual(teacherClashResult.teacherClash.type, 'teacher');
  assert.ok(
    teacherClashResult.teacherClash.description.includes(classA.grade),
    'Description must name the conflicting class grade'
  );
  assert.ok(
    teacherClashResult.teacherClash.description.includes('Period 3'),
    'Description must name the conflicting period'
  );
  console.log(`  ✓ Teacher clash detected: "${teacherClashResult.teacherClash.description}"`);

  // Test 2.3: Room clash within same campus
  console.log('5. Testing room occupancy clash within same campus...');
  const roomClashResult = await detectTimetableClashes({
    schoolId: 'sch_main',
    campusId: 'cmp_main',
    classId: classB.id,
    dayOfWeek: 1,
    period: 3,
    teacherId: teacherB.id,
    room: 'Room 301',
  });
  assert.strictEqual(roomClashResult.hasClash, true, 'Should detect room clash');
  assert.ok(roomClashResult.roomClash, 'roomClash property should be set');
  assert.strictEqual(roomClashResult.roomClash.type, 'room');
  assert.ok(
    roomClashResult.roomClash.description.includes('Room 301'),
    'Description must name the conflicting room'
  );
  assert.ok(
    roomClashResult.roomClash.description.includes(classA.grade),
    'Description must name the conflicting class'
  );
  console.log(`  ✓ Room clash detected: "${roomClashResult.roomClash.description}"`);

  // Test 2.4: Simultaneous teacher AND room clashes
  console.log('6. Testing simultaneous teacher and room clash...');
  const dualClashResult = await detectTimetableClashes({
    schoolId: 'sch_main',
    campusId: 'cmp_main',
    classId: classB.id,
    dayOfWeek: 1,
    period: 3,
    teacherId: teacherA.id,
    room: 'Room 301',
  });
  assert.strictEqual(dualClashResult.hasClash, true, 'Dual clash should be true');
  assert.strictEqual(dualClashResult.clashes.length, 2, 'Should detect both teacher and room clashes');
  assert.ok(dualClashResult.teacherClash);
  assert.ok(dualClashResult.roomClash);
  console.log('  ✓ Dual clash detected both conflicts');

  // Test 2.5: Self-exclusion when editing slotA
  console.log('7. Testing self-exclusion when editing existing slot...');
  const editSelfResult = await detectTimetableClashes({
    schoolId: 'sch_main',
    campusId: 'cmp_main',
    classId: classA.id,
    dayOfWeek: 1,
    period: 3,
    teacherId: teacherA.id,
    room: 'Room 301',
    excludeSlotId: slotA.id,
  });
  assert.strictEqual(editSelfResult.hasClash, false, 'Editing same slot should not clash with itself');
  console.log('  ✓ Self-exclusion works cleanly without false positives');

  // Test 2.6: Cross-campus teacher clash
  console.log('8. Testing cross-campus teacher clash detection...');
  let secondCampus = campuses.find((c) => c.id !== 'cmp_main');
  if (!secondCampus) {
    secondCampus = await createCampus({
      schoolId: 'sch_main',
      name: 'South Campus',
      address: 'South Avenue',
      isPrimary: false,
    });
  }

  // Schedule Teacher B on South Campus on Friday Period 6
  await createTimetableSlot({
    schoolId: 'sch_main',
    campusId: secondCampus.id,
    classId: 'cls_south_1',
    subjectId: subjectB.id,
    teacherId: teacherB.id,
    dayOfWeek: 5 as DayOfWeek,
    period: 6,
    room: 'Lab-South',
  });

  // Now attempt to schedule Teacher B on Main Campus during Friday Period 6
  const crossCampusResult = await detectTimetableClashes({
    schoolId: 'sch_main',
    campusId: 'cmp_main',
    classId: classA.id,
    dayOfWeek: 5 as DayOfWeek,
    period: 6,
    teacherId: teacherB.id,
    room: 'Room 101',
  });

  assert.strictEqual(crossCampusResult.hasClash, true, 'Cross-campus teacher clash must be detected');
  assert.ok(crossCampusResult.teacherClash, 'Teacher clash should be populated');
  assert.ok(
    crossCampusResult.teacherClash.description.includes(secondCampus.name),
    `Description should mention conflicting campus "${secondCampus.name}"`
  );
  assert.strictEqual(
    crossCampusResult.teacherClash.conflictingCampusName,
    secondCampus.name,
    'Conflicting campus name should match secondCampus.name'
  );
  console.log(`  ✓ Cross-campus teacher conflict detected: "${crossCampusResult.teacherClash.description}"`);

  // Test 2.7: SSR Render of SlotPickerModal with props
  console.log('9. Testing SlotPickerModal SSR rendering...');
  const modalHtml = renderToString(
    React.createElement(SlotPickerModal, {
      isOpen: true,
      onClose: () => {},
      dayName: 'Monday',
      periodName: 'Period 3',
      periodTime: '10:00 - 10:45',
      classNameLabel: `${classA.grade} - ${classA.section}`,
      subjects: [subjectA, subjectB],
      teachers: [
        { id: teacherA.id, name: 'Dr. Smith', department: 'Science' },
        { id: teacherB.id, name: 'Prof. Davis', department: 'Math' },
      ],
      currentSlot: null,
      defaultRoom: 'Room 101',
      schoolId: 'sch_main',
      campusId: 'cmp_main',
      classId: classA.id,
      dayOfWeek: 1,
      period: 3,
      onSave: async () => {},
    })
  );
  assert.ok(modalHtml.includes('Assign Timetable Slot'), 'Modal title rendered');
  assert.ok(modalHtml.includes('Period 3'), 'Period rendered in metadata');
  assert.ok(modalHtml.includes('Dr. Smith'), 'Teacher option rendered');
  assert.ok(modalHtml.includes('Room / Location'), 'Room input rendered');
  console.log('  ✓ SlotPickerModal rendered successfully');

  console.log('\n✅ All TASK-055 Live Clash Detection tests passed successfully!\n');
}

runTests().catch((err) => {
  console.error('❌ Tests failed:', err);
  process.exit(1);
});
