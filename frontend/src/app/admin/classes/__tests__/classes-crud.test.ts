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
  listClasses,
  getClass,
  createClassWithValidation,
  validateClassUnique,
  canDeleteClass,
  safeDeleteClass,
} from '../../../../lib/repositories/classes';
import { listCampuses } from '../../../../lib/repositories/campuses';
import { listStudents } from '../../../../lib/repositories/students';
import { listTeachers } from '../../../../lib/repositories/teachers';
import { listUsers } from '../../../../lib/repositories/users';
import { listSubjects } from '../../../../lib/repositories/subjects';
import { listAcademicYears } from '../../../../lib/repositories/academicYears';
import { ToastProvider } from '../../../../components/ui/Toast';
import { SessionProvider } from '../../../../components/providers/SessionProvider';
import { ClassManager } from '../../../../components/classes/ClassManager';
import { ClassDetailView } from '../../../../components/classes/ClassDetailView';

console.log('Running TASK-029 Classes and Sections CRUD Test Suite...\n');

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
  // 1. Seed data
  await ensureSeeded({ force: true });
  const scope = { schoolId: 'sch_main' };

  console.log('1. Testing Acceptance Criteria: Same grade+section allowed at different campuses');
  const campuses = await listCampuses(scope);
  assert(campuses.length >= 2, 'Must have at least 2 campuses');
  const mainCampus = campuses[0];
  const secondaryCampus = campuses[1];

  // Check validation for same grade+section on Main Campus:
  // First, check if Grade 10 - Section Omega exists
  const testGrade = 'Grade 10';
  const testSection = 'Omega';

  const val1 = await validateClassUnique(mainCampus.id, testGrade, testSection, undefined, scope);
  assert.strictEqual(val1.isUnique, true, 'First class should be unique');

  const createdMain = await createClassWithValidation(
    {
      schoolId: 'sch_main',
      campusId: mainCampus.id,
      academicYearId: 'ay_2026_2027',
      grade: testGrade,
      section: testSection,
      capacity: 35,
      room: 'Room 101',
    },
    scope
  );
  assert.strictEqual(createdMain.success, true, 'Should create Grade 10 - Omega at Main Campus');
  assert(createdMain.class, 'Created class must exist');

  // Verify that creating the SAME grade+section at SECONDARY campus SUCCEEDS (Acceptance Criteria!)
  const valSecondary = await validateClassUnique(secondaryCampus.id, testGrade, testSection, undefined, scope);
  assert.strictEqual(
    valSecondary.isUnique,
    true,
    'Acceptance Criteria: Same grade+section MUST be allowed at different campus'
  );

  const createdSecondary = await createClassWithValidation(
    {
      schoolId: 'sch_main',
      campusId: secondaryCampus.id,
      academicYearId: 'ay_2026_2027',
      grade: testGrade,
      section: testSection,
      capacity: 30,
      room: 'Room 201',
    },
    scope
  );
  assert.strictEqual(
    createdSecondary.success,
    true,
    'Should successfully create Grade 10 - Omega at Secondary Campus'
  );
  console.log('✓ Successfully created Grade 10 - Section Omega at both Main and Secondary campuses without collision.');

  // Now verify that attempting duplicate grade+section on the SAME campus is BLOCKED
  const valDuplicateSameCampus = await validateClassUnique(mainCampus.id, testGrade, testSection, undefined, scope);
  assert.strictEqual(
    valDuplicateSameCampus.isUnique,
    false,
    'Duplicate grade+section within the SAME campus must be rejected'
  );
  assert(
    valDuplicateSameCampus.message?.includes('already exists in this campus'),
    'Validation message must clearly explain duplicate within campus'
  );

  const duplicateAttempt = await createClassWithValidation(
    {
      schoolId: 'sch_main',
      campusId: mainCampus.id,
      academicYearId: 'ay_2026_2027',
      grade: testGrade,
      section: testSection,
      capacity: 25,
    },
    scope
  );
  assert.strictEqual(duplicateAttempt.success, false, 'Duplicate creation in same campus must fail');
  console.log('✓ Duplicate grade+section on the same campus was properly blocked with error message.');

  console.log('\n2. Testing safe deletion safeguard with enrolled student count');
  // Find a class with enrolled students
  const allClasses = await listClasses(scope);
  const allStudents = await listStudents(scope);

  // Find class that has students
  const classWithStudents = allClasses.find((c) => allStudents.some((s) => s.classId === c.id));
  assert(classWithStudents, 'Must find a class with enrolled students');

  const enrolledCount = allStudents.filter((s) => s.classId === classWithStudents.id).length;
  assert(enrolledCount > 0, 'Class must have enrolled students');

  // Deletion check
  const deleteCheck = await canDeleteClass(classWithStudents.id, scope);
  assert.strictEqual(deleteCheck.canDelete, false, 'Cannot delete class with enrolled students');
  assert.strictEqual(deleteCheck.studentCount, enrolledCount, 'Student count must match enrolled students');
  assert(deleteCheck.reason?.includes(String(enrolledCount)), 'Reason must specify the exact student count');

  // Attempt safe deletion
  const deleteResult = await safeDeleteClass(classWithStudents.id, scope);
  assert.strictEqual(deleteResult.success, false, 'safeDeleteClass must refuse deletion');
  assert(deleteResult.error?.includes('enrolled student'), 'safeDeleteClass must return descriptive error');

  // Verify class still exists
  const preservedClass = await getClass(classWithStudents.id);
  assert(preservedClass !== null, 'Class must remain intact and not be deleted');
  console.log(`✓ Safe deletion safeguard protected class with ${enrolledCount} enrolled students.`);

  // Now create an empty class and verify safe deletion succeeds
  const emptyClassRes = await createClassWithValidation(
    {
      schoolId: 'sch_main',
      campusId: mainCampus.id,
      academicYearId: 'ay_2026_2027',
      grade: 'Grade 12',
      section: 'TempDelete',
      capacity: 20,
    },
    scope
  );
  assert(emptyClassRes.success && emptyClassRes.class, 'Empty class created');
  const emptyClassId = emptyClassRes.class.id;

  const emptyDeleteCheck = await canDeleteClass(emptyClassId, scope);
  assert.strictEqual(emptyDeleteCheck.canDelete, true, 'Empty class can be deleted');
  assert.strictEqual(emptyDeleteCheck.studentCount, 0, 'Empty class has 0 students');

  const emptyDeleteResult = await safeDeleteClass(emptyClassId, scope);
  assert.strictEqual(emptyDeleteResult.success, true, 'safeDeleteClass succeeds on empty class');

  const verifyDeleted = await getClass(emptyClassId);
  assert.strictEqual(verifyDeleted, null, 'Deleted class no longer exists');
  console.log('✓ Successfully deleted empty class after safe verification.');

  console.log('\n3. Testing class filtering and search');
  const searchResults = await listClasses(scope, { search: 'Grade 8' });
  assert(searchResults.length > 0, 'Must find classes matching "Grade 8"');
  assert(
    searchResults.every((c) => c.grade.includes('Grade 8')),
    'All returned classes must match search query'
  );

  const campusFiltered = await listClasses(scope, { campusId: mainCampus.id });
  assert(
    campusFiltered.every((c) => c.campusId === mainCampus.id),
    'All returned classes must belong to requested campus'
  );
  console.log('✓ Class filtering by search and campus verified.');

  console.log('\n4. Testing UI Component SSR Rendering');
  const teachers = await listTeachers(scope);
  const users = await listUsers(scope);
  const subjects = await listSubjects(scope);
  const academicYears = await listAcademicYears(scope);

  // Render ClassManager
  const managerHtml = renderToString(
    React.createElement(
      AppRouterContext.Provider,
      { value: mockRouter },
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          SessionProvider,
          null,
          React.createElement(ClassManager, {
            initialClasses: allClasses,
            initialCampuses: campuses,
            initialTeachers: teachers,
            initialUsers: users,
            initialStudents: allStudents,
            initialAcademicYears: academicYears,
          })
        )
      )
    )
  );

  assert(managerHtml.includes('Classes &amp; Sections') || managerHtml.includes('Classes & Sections'), 'Must render title');
  assert(managerHtml.includes('Total Classes'), 'Must render Total Classes stat card');
  assert(managerHtml.includes('Add Class'), 'Must render Add Class button');
  console.log('✓ ClassManager component rendered cleanly.');

  // Render ClassDetailView for classWithStudents
  const targetClass = classWithStudents;
  const classStudents = allStudents.filter((s) => s.classId === targetClass.id);
  const classSubjects = subjects.filter((s) => s.classId === targetClass.id);
  const targetCampus = campuses.find((c) => c.id === targetClass.campusId);
  const targetTeacher = teachers.find((t) => t.id === targetClass.classTeacherId);

  const detailHtml = renderToString(
    React.createElement(
      AppRouterContext.Provider,
      { value: mockRouter },
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          SessionProvider,
          null,
          React.createElement(ClassDetailView, {
            classId: targetClass.id,
            initialClass: targetClass,
            initialCampus: targetCampus,
            initialTeacher: targetTeacher,
            initialStudents: classStudents,
            initialSubjects: classSubjects,
            initialUsers: users,
          })
        )
      )
    )
  );

  assert(detailHtml.includes(targetClass.grade), 'Must display class grade');
  assert(detailHtml.includes(targetClass.section), 'Must display class section');
  assert(detailHtml.includes('Student Roster'), 'Must display Student Roster tab');
  assert(detailHtml.includes('Curriculum &amp; Subjects') || detailHtml.includes('Curriculum & Subjects'), 'Must display Curriculum tab');
  console.log('✓ ClassDetailView component rendered cleanly with student roster.');

  console.log('\nALL TASK-029 TESTS PASSED! ✓');
}

runTests().catch((err) => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
