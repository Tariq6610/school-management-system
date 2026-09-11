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
  listSubjects,
  getSubject,
  assignSubjectTeacher,
  deleteSubject,
  bulkCreateSubjectsFromTemplates,
  generateSubjectCode,
} from '../../../../lib/repositories/subjects';
import { listClasses, getClass } from '../../../../lib/repositories/classes';
import { listTeachers, getTeacher } from '../../../../lib/repositories/teachers';
import { listCampuses } from '../../../../lib/repositories/campuses';
import { listUsers } from '../../../../lib/repositories/users';
import { ToastProvider } from '../../../../components/ui/Toast';
import { SessionProvider } from '../../../../components/providers/SessionProvider';
import { BulkSubjectTemplateModal } from '../../../../components/subjects/BulkSubjectTemplateModal';
import { SubjectManager } from '../../../../components/subjects/SubjectManager';
import { ClassDetailView } from '../../../../components/classes/ClassDetailView';

console.log('Running TASK-030 Subjects CRUD and Teacher Assignment Test Suite...\n');

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

  console.log('1. Testing Acceptance Criteria: Bulk add from template list');
  const classes = await listClasses(scope);
  assert(classes.length > 0, 'Must have seeded classes');
  const targetClass = classes[0];

  const teachers = await listTeachers(scope);
  const campusTeacher = teachers.find((t) => t.campusId === targetClass.campusId) ?? teachers[0];

  // Prepare batch templates
  const templatesToAdd = [
    {
      name: 'Computer Studies & ICT',
      code: generateSubjectCode('ICT', targetClass.grade),
      teacherId: campusTeacher.id,
    },
    {
      name: 'Art & Design',
      code: generateSubjectCode('ART', targetClass.grade),
      teacherId: undefined,
    },
    {
      name: 'Physical Education & Sports',
      code: generateSubjectCode('PHE', targetClass.grade),
      teacherId: undefined,
    },
  ];

  // Bulk add to target class
  const addedSubjects = await bulkCreateSubjectsFromTemplates(targetClass.id, templatesToAdd, scope);
  assert.strictEqual(addedSubjects.length, 3, 'Should add all 3 selected templates in bulk');

  // Verify created subject fields
  const ictSubj = addedSubjects.find((s) => s.name === 'Computer Studies & ICT');
  assert(ictSubj, 'ICT subject must be created');
  assert.strictEqual(ictSubj.classId, targetClass.id, 'Must be assigned to target class');
  assert.strictEqual(ictSubj.teacherId, campusTeacher.id, 'Assigned teacher must be stored');

  // Verify duplicate prevention when attempting to re-add same templates
  const secondAttempt = await bulkCreateSubjectsFromTemplates(targetClass.id, templatesToAdd, scope);
  assert.strictEqual(secondAttempt.length, 0, 'Duplicate templates must be skipped and not re-added');

  console.log('✓ Acceptance Criteria: Bulk add from template list verified with duplicate detection.');

  console.log('\n2. Testing Teacher Assignment & Bidirectional Synchronization');
  // Verify teacher record reflects the assigned subject
  const refreshedTeacher = await getTeacher(campusTeacher.id);
  assert(refreshedTeacher, 'Teacher must exist');
  assert(
    refreshedTeacher.subjectIds.includes(ictSubj.id),
    'Teacher.subjectIds must include newly assigned subject'
  );

  // Reassign to a different teacher
  const secondTeacher = teachers.find((t) => t.id !== campusTeacher.id);
  assert(secondTeacher, 'Must have a second teacher');

  await assignSubjectTeacher(ictSubj.id, secondTeacher.id);

  // Check subject record
  const refreshedSubject = await getSubject(ictSubj.id);
  assert.strictEqual(refreshedSubject?.teacherId, secondTeacher.id, 'Subject teacherId must be updated');

  // Check old teacher unlinked
  const oldTeacherCheck = await getTeacher(campusTeacher.id);
  assert(
    !oldTeacherCheck?.subjectIds.includes(ictSubj.id),
    'Old teacher must have subject removed from subjectIds'
  );

  // Check new teacher linked
  const newTeacherCheck = await getTeacher(secondTeacher.id);
  assert(
    newTeacherCheck?.subjectIds.includes(ictSubj.id),
    'New teacher must have subject added to subjectIds'
  );

  console.log('✓ Bidirectional teacher synchronization verified upon assignment and reassignment.');

  console.log('\n3. Testing Subject Deletion & Cleanup');
  const pheSubj = addedSubjects.find((s) => s.name === 'Physical Education & Sports');
  assert(pheSubj, 'PHE subject must exist');

  await deleteSubject(pheSubj.id);
  const verifyDeleted = await getSubject(pheSubj.id);
  assert.strictEqual(verifyDeleted, null, 'Deleted subject must return null');

  // Also delete ictSubj and verify secondTeacher unlinked
  await deleteSubject(ictSubj.id);
  const teacherAfterDelete = await getTeacher(secondTeacher.id);
  assert(
    !teacherAfterDelete?.subjectIds.includes(ictSubj.id),
    'Deleting subject must remove it from teacher subjectIds'
  );
  console.log('✓ Subject deletion and teacher unlink verified.');

  console.log('\n4. Testing Subject Filtering');
  const allSubjects = await listSubjects(scope);
  assert(allSubjects.length > 0, 'Must have subjects');

  const filteredByClass = await listSubjects(scope, { classId: targetClass.id });
  assert(
    filteredByClass.every((s) => s.classId === targetClass.id),
    'All returned subjects must belong to the requested class'
  );

  const filteredBySearch = await listSubjects(scope, { search: 'Mathematics' });
  assert(
    filteredBySearch.every((s) => s.name.includes('Mathematics') || s.code.includes('Mathematics')),
    'Search filter must match subject name or code'
  );
  console.log('✓ Subject querying and filtering verified.');

  console.log('\n5. Testing UI Component SSR Rendering');
  const campuses = await listCampuses(scope);
  const users = await listUsers(scope);
  const teacherNameMap = new Map<string, string>();
  teachers.forEach((t) => teacherNameMap.set(t.id, t.employeeNumber));

  // Render BulkSubjectTemplateModal
  const modalHtml = renderToString(
    React.createElement(
      AppRouterContext.Provider,
      { value: mockRouter },
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          SessionProvider,
          null,
          React.createElement(BulkSubjectTemplateModal, {
            isOpen: true,
            onClose: () => {},
            classInfo: targetClass,
            campusTeachers: teachers,
            teacherNames: teacherNameMap,
            existingSubjects: allSubjects,
            onSuccess: () => {},
          })
        )
      )
    )
  );

  assert(modalHtml.includes('Add Subjects from Template List'), 'Modal must render title');
  assert(modalHtml.includes('Core Curriculum'), 'Modal must render category options');
  assert(modalHtml.includes('Quick Select'), 'Modal must render quick select accelerators');
  console.log('✓ BulkSubjectTemplateModal rendered cleanly.');

  // Render SubjectManager
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
          React.createElement(SubjectManager, {
            initialSubjects: allSubjects,
            initialClasses: classes,
            initialCampuses: campuses,
            initialTeachers: teachers,
            initialUsers: users,
          })
        )
      )
    )
  );

  assert(managerHtml.includes('Curriculum Subjects'), 'SubjectManager must render header');
  assert(managerHtml.includes('Total Subjects'), 'SubjectManager must render Total Subjects stat');
  console.log('✓ SubjectManager directory rendered cleanly.');

  // Render ClassDetailView with curriculum tab
  const classObj = await getClass(targetClass.id);
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
            initialClass: classObj ?? targetClass,
            initialCampus: campuses[0],
            initialTeacher: teachers[0],
            initialStudents: [],
            initialSubjects: allSubjects.filter((s) => s.classId === targetClass.id),
            initialUsers: users,
          })
        )
      )
    )
  );

  assert(detailHtml.includes('Curriculum &amp; Subjects') || detailHtml.includes('Curriculum & Subjects'), 'Must render Curriculum tab');
  console.log('✓ ClassDetailView rendered cleanly.');

  console.log('\nALL TASK-030 TESTS PASSED! ✓');
}

runTests().catch((err) => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
