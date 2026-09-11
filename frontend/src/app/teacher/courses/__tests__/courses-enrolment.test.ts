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
  createCourse,
  getCourse,
  getEnrichedCourse,
  updateCourse,
  deleteCourse,
  getStudentCourses,
} from '@/lib/repositories/courses';
import { listClasses } from '@/lib/repositories/classes';
import { listSubjects } from '@/lib/repositories/subjects';
import { listTeachers } from '@/lib/repositories/teachers';
import { listStudents } from '@/lib/repositories/students';
import { setSession } from '@/lib/repositories/session';
import { Scope, EnrichedCourse } from '@/types';
import { ToastProvider } from '@/components/ui/Toast';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { TeacherCoursesView } from '@/components/lms/TeacherCoursesView';
import { StudentCoursesView } from '@/components/lms/StudentCoursesView';

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
  console.log('--- Starting Course CRUD & Automatic Class Enrolment Tests (TASK-057) ---');

  // 1. Seed database and set session
  await ensureSeeded();
  await setSession({
    userId: 'usr_admin',
    role: 'school_admin',
    schoolId: 'sch_main',
    campusId: 'cmp_main',
  });
  const scope: Scope = { schoolId: 'sch_main', campusId: 'cmp_main' };

  // 2. Fetch seed classes, subjects, teachers, and students
  console.log('1. Loading academic entities...');
  const classes = await listClasses(scope);
  const subjects = await listSubjects(scope);
  const teachers = await listTeachers(scope);
  const students = await listStudents(scope);

  assert.ok(classes.length >= 2, 'Seed must have at least 2 classes for cohort testing');
  assert.ok(subjects.length > 0, 'Seed must have subjects');
  assert.ok(teachers.length > 0, 'Seed must have teachers');
  assert.ok(students.length >= 2, 'Seed must have students');

  const classA = classes[0];
  const classB = classes[1];
  const teacher = teachers[0];
  const subjectA = subjects.find((s) => s.classId === classA.id) || subjects[0];

  const studentA = students.find((s) => s.classId === classA.id) || students[0];
  const studentB = students.find((s) => s.classId === classB.id) || students[1];

  console.log(`  ✓ Class A: ${classA.grade}-${classA.section}, Student A: ${studentA.id}`);
  console.log(`  ✓ Class B: ${classB.grade}-${classB.section}, Student B: ${studentB.id}`);

  // 3. Test Course Creation (CRUD - Create)
  console.log('2. Testing Course creation with validation...');
  const newCourse = await createCourse({
    schoolId: 'sch_main',
    campusId: 'cmp_main',
    classId: classA.id,
    subjectId: subjectA.id,
    teacherId: teacher.id,
    title: 'Cellular Biology & Genetics',
    description: 'Comprehensive study of cell structures, genetics, and mitosis.',
    coverColor: '#10b981',
  });

  assert.ok(newCourse.id, 'Created course must have an ID');
  assert.strictEqual(newCourse.title, 'Cellular Biology & Genetics');
  assert.strictEqual(newCourse.classId, classA.id);
  assert.strictEqual(newCourse.coverColor, '#10b981');
  console.log(`  ✓ Created course: ${newCourse.id} (${newCourse.title})`);

  // 4. Test Course Read & Enriched queries (CRUD - Read)
  console.log('3. Testing getCourse and getEnrichedCourse...');
  const retrieved = await getCourse(newCourse.id);
  assert.ok(retrieved, 'getCourse must find created course');
  assert.strictEqual(retrieved.id, newCourse.id);

  const enriched = await getEnrichedCourse(newCourse.id);
  assert.ok(enriched, 'getEnrichedCourse must enrich course');
  assert.ok(enriched.subjectName, 'Subject name must be resolved');
  assert.ok(enriched.className.includes(classA.grade), 'Class name must include class grade');
  assert.ok(enriched.teacherName, 'Teacher name must be resolved');
  console.log(`  ✓ Enriched course: Subject="${enriched.subjectName}", Class="${enriched.className}", Instructor="${enriched.teacherName}"`);

  // 5. Test Acceptance Criteria: "Students see courses automatically"
  console.log('4. Testing automatic class enrolment for student in Class A...');
  const studentACourses = await getStudentCourses(studentA.id, scope);
  assert.ok(studentACourses.length > 0, 'Student in Class A must see enrolled courses');
  const foundInStudentA = studentACourses.find((c) => c.id === newCourse.id);
  assert.ok(
    foundInStudentA,
    'Acceptance Criteria Verified: Student A in Class A automatically sees the course!'
  );
  console.log(`  ✓ Student A automatically sees course: "${foundInStudentA.title}"`);

  // Verify class cohort isolation
  console.log('5. Testing cohort isolation: Student in Class B should NOT see Class A course...');
  const studentBCourses = await getStudentCourses(studentB.id, scope);
  const foundInStudentB = studentBCourses.find((c) => c.id === newCourse.id);
  assert.strictEqual(
    foundInStudentB,
    undefined,
    'Student B in Class B must NOT see course assigned to Class A'
  );
  console.log('  ✓ Cohort isolation verified: Student B does not see Class A course');

  // 6. Test Course Update & Cohort Re-assignment (CRUD - Update)
  console.log('6. Testing course update: Re-assigning course to Class B...');
  const updated = await updateCourse(newCourse.id, {
    title: 'Cellular Biology & Genetics (Advanced)',
    classId: classB.id,
  });
  assert.strictEqual(updated.title, 'Cellular Biology & Genetics (Advanced)');
  assert.strictEqual(updated.classId, classB.id);

  // Verify automatic enrolment shift
  const studentBAfterUpdate = await getStudentCourses(studentB.id, scope);
  const foundInStudentBAfter = studentBAfterUpdate.find((c) => c.id === newCourse.id);
  assert.ok(
    foundInStudentBAfter,
    'Student B now automatically sees course after re-assignment to Class B!'
  );

  const studentAAfterUpdate = await getStudentCourses(studentA.id, scope);
  const foundInStudentAAfter = studentAAfterUpdate.find((c) => c.id === newCourse.id);
  assert.strictEqual(
    foundInStudentAAfter,
    undefined,
    'Student A no longer sees course after it was transferred to Class B'
  );
  console.log('  ✓ Course update and dynamic enrollment transition verified cleanly');

  // 7. Test Course Deletion (CRUD - Delete)
  console.log('7. Testing Course deletion...');
  await deleteCourse(newCourse.id);
  const deletedCheck = await getCourse(newCourse.id);
  assert.strictEqual(deletedCheck, null, 'Deleted course must not be found');
  console.log('  ✓ Course deleted successfully');

  // 8. Test SSR UI Rendering of TeacherCoursesView and StudentCoursesView
  console.log('8. Testing TeacherCoursesView SSR rendering...');
  const mockEnrichedCourse: EnrichedCourse = {
    id: 'crs_demo_1',
    schoolId: 'sch_main',
    campusId: 'cmp_main',
    classId: classA.id,
    subjectId: subjectA.id,
    teacherId: teacher.id,
    title: 'Algebra and Functions',
    description: 'Quadratic equations, polynomials, and Cartesian graphing.',
    coverColor: '#8b5cf6',
    subjectName: 'Mathematics',
    subjectCode: 'MATH-6',
    className: `${classA.grade} - Section ${classA.section}`,
    teacherName: 'Zainab Ali',
    lessonCount: 4,
  };

  const teacherHtml = renderWithProviders(
    React.createElement(TeacherCoursesView, {
      initialCourses: [mockEnrichedCourse],
      initialClasses: classes,
      initialSubjects: subjects,
      initialTeachers: teachers.map((t) => ({ id: t.id, name: 'Teacher' })),
    })
  );

  assert.ok(teacherHtml.includes('Total LMS Courses'), 'Teacher view KPI rendered');
  assert.ok(teacherHtml.includes('Create New Course'), 'Create course button rendered');
  assert.ok(teacherHtml.includes('Algebra and Functions'), 'Mock course title rendered');
  assert.ok(teacherHtml.includes('Automatic via Class'), 'Automatic enrollment badge rendered');
  console.log('  ✓ TeacherCoursesView rendered successfully');

  console.log('9. Testing StudentCoursesView SSR rendering...');
  const studentHtml = renderWithProviders(
    React.createElement(StudentCoursesView, {
      initialCourses: [mockEnrichedCourse],
      studentId: studentA.id,
    })
  );

  assert.ok(studentHtml.includes('Automatic Class Enrollment'), 'Student auto-enrollment banner rendered');
  assert.ok(studentHtml.includes('Algebra and Functions'), 'Course card rendered in student view');
  assert.ok(studentHtml.includes('Open Course'), 'Open Course link rendered');
  console.log('  ✓ StudentCoursesView rendered successfully');

  console.log('\n✅ All TASK-057 Course CRUD & Enrolment tests passed successfully!\n');
}

runTests().catch((err) => {
  console.error('❌ Tests failed:', err);
  process.exit(1);
});
