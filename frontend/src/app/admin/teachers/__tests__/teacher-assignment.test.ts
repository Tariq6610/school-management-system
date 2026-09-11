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
  listTeachers,
  getTeacher,
  getTeacherAssignedSubjects,
  getTeacherAssignedClasses,
  bulkAssignTeacher,
} from '../../../../lib/repositories/teachers';
import { getUser } from '../../../../lib/repositories/users';
import { listCampuses } from '../../../../lib/repositories/campuses';
import { listClasses, getClass } from '../../../../lib/repositories/classes';
import { listSubjects, getSubject } from '../../../../lib/repositories/subjects';
import { ToastProvider } from '../../../../components/ui/Toast';
import { SessionProvider } from '../../../../components/providers/SessionProvider';
import { TeacherAssignmentMatrix } from '../../../../components/teachers/TeacherAssignmentMatrix';

console.log('Running TASK-028 Teacher Bulk Assignment Test Suite...\n');

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
  const schoolId = 'sch_main';

  // 1. Seed data
  console.log('1. Ensuring test database is seeded...');
  await ensureSeeded();
  const teachers = await listTeachers({ schoolId });
  assert(teachers.length > 0, 'Database should contain seeded teachers');
  console.log(`✓ Seeded ${teachers.length} teachers across campuses.`);

  // 2. Select target teacher (e.g. Sana Tariq or teacher 2)
  const targetTeacher = teachers[1] || teachers[0];
  const targetUser = await getUser(targetTeacher.userId);
  assert(targetUser, 'Associated user account must exist');
  const campusId = targetTeacher.campusId;
  console.log(`✓ Target faculty: ${targetUser.name} (${targetTeacher.employeeNumber})`);

  // 3. Locate classes and subjects available in this campus
  const campusClasses = (await listClasses({ schoolId })).filter((c) => c.campusId === campusId);
  assert(campusClasses.length >= 2, 'Should have at least 2 classes in campus');
  const class1 = campusClasses[0];
  const class2 = campusClasses[1];

  const campusSubjects = (await listSubjects({ schoolId })).filter(
    (s) => s.classId === class1.id || s.classId === class2.id
  );
  assert(campusSubjects.length >= 4, 'Should have subjects available in target classes');

  // 4. ACCEPTANCE CRITERIA: Bulk selection in one screen
  console.log('\n2. Testing Acceptance Criteria: Bulk Assignment in one operation...');
  // Select 3 subjects: 2 from class1, 1 from class2
  const selectedSubjects = [campusSubjects[0], campusSubjects[1], campusSubjects[2]];
  const selectedSubjectIds = selectedSubjects.map((s) => s.id);
  const selectedHomeroomClassIds = [class1.id];

  const bulkResult = await bulkAssignTeacher(
    {
      teacherId: targetTeacher.id,
      subjectIds: selectedSubjectIds,
      homeroomClassIds: selectedHomeroomClassIds,
    },
    { schoolId, campusId }
  );

  assert.strictEqual(
    bulkResult.assignedSubjectsCount,
    3,
    'Should report 3 assigned subjects'
  );
  assert.strictEqual(
    bulkResult.assignedClassesCount,
    1,
    'Should report 1 homeroom class assigned'
  );

  // Verify Subject records in storage were updated
  for (const sId of selectedSubjectIds) {
    const sRecord = await getSubject(sId);
    assert.strictEqual(
      sRecord?.teacherId,
      targetTeacher.id,
      `Subject ${sId} teacherId must be set to target teacher`
    );
  }

  // Verify Class homeroom teacher was set
  const class1Updated = await getClass(class1.id);
  assert.strictEqual(
    class1Updated?.classTeacherId,
    targetTeacher.id,
    'Class 1 classTeacherId must be set to target teacher'
  );

  // Verify Teacher entity subjectIds was updated
  const teacherAfter = await getTeacher(targetTeacher.id);
  assert.deepStrictEqual(
    new Set(teacherAfter?.subjectIds),
    new Set(selectedSubjectIds),
    'Teacher subjectIds array must match assigned subjects'
  );

  // Verify query helpers return new state
  const assignedSubjectsResult = await getTeacherAssignedSubjects(targetTeacher.id, {
    schoolId,
    campusId,
  });
  assert.strictEqual(
    assignedSubjectsResult.length,
    3,
    'getTeacherAssignedSubjects must return exactly 3 subjects'
  );

  const assignedClassesResult = await getTeacherAssignedClasses(targetTeacher.id, {
    schoolId,
    campusId,
  });
  const homeroomClassEntry = assignedClassesResult.find((c) => c.classInfo.id === class1.id);
  assert(homeroomClassEntry, 'Class 1 must be present in assigned classes');
  assert.strictEqual(homeroomClassEntry.isClassTeacher, true, 'Class 1 must be marked isClassTeacher');
  console.log('✓ Bulk assignment of subjects and homeroom class executed successfully in one atomic operation.');

  // 5. Test Bulk Deselection / Reassignment
  console.log('\n3. Testing Bulk Deselection & Removal...');
  // Reduce assignments to just 1 subject, and remove homeroom status
  const reducedSubjectIds = [selectedSubjectIds[0]];
  await bulkAssignTeacher(
    {
      teacherId: targetTeacher.id,
      subjectIds: reducedSubjectIds,
      homeroomClassIds: [],
    },
    { schoolId, campusId }
  );

  // Verify unassigned subjects had teacherId removed
  const unassignedSubject = await getSubject(selectedSubjectIds[1]);
  assert.strictEqual(
    unassignedSubject?.teacherId,
    undefined,
    'Deselected subject teacherId must be cleared'
  );

  // Verify homeroom was cleared
  const class1Cleared = await getClass(class1.id);
  assert.strictEqual(
    class1Cleared?.classTeacherId,
    undefined,
    'Deselected homeroom classTeacherId must be cleared'
  );

  const finalSubjects = await getTeacherAssignedSubjects(targetTeacher.id, {
    schoolId,
    campusId,
  });
  assert.strictEqual(finalSubjects.length, 1, 'Teacher must now only have 1 assigned subject');
  console.log('✓ Bulk deselection synchronized subject and class records cleanly.');

  // 6. Presentation Component SSR Rendering
  console.log('\n4. Testing TeacherAssignmentMatrix SSR Rendering...');
  const campuses = await listCampuses({ schoolId });
  const allClasses = await listClasses({ schoolId });
  const allSubjects = await listSubjects({ schoolId });

  const matrixHtml = renderToString(
    React.createElement(
      AppRouterContext.Provider,
      { value: mockRouter },
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          SessionProvider,
          null,
          React.createElement(TeacherAssignmentMatrix, {
            teacherId: targetTeacher.id,
            initialTeacher: targetTeacher,
            initialUser: targetUser,
            initialCampus: campuses.find((c) => c.id === targetTeacher.campusId),
            initialClasses: allClasses.filter((c) => c.campusId === targetTeacher.campusId),
            initialSubjects: allSubjects,
          })
        )
      )
    )
  );

  assert(matrixHtml.includes('Manage Teaching Assignments'), 'SSR must render page title');
  assert(matrixHtml.includes('Bulk Tools:'), 'SSR must render bulk selection toolstrip');
  assert(matrixHtml.includes('Nominate as Homeroom Class Teacher'), 'SSR must render homeroom toggles');
  assert(matrixHtml.includes('Save All Assignments'), 'SSR must render save action button');
  console.log('✓ TeacherAssignmentMatrix single-screen bulk selection interface rendered cleanly.');

  console.log('\n🎉 ALL TASK-028 TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('\n❌ Test execution failed:');
  console.error(err);
  process.exit(1);
});
