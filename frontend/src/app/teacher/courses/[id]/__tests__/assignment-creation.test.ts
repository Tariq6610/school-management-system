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
  createAssignment,
  getAssignment,
  updateAssignment,
  deleteAssignment,
  getAssignmentsByCourse,
  getAssignmentsByLesson,
  getEnrichedAssignments,
} from '@/lib/repositories/assignments';
import { listLessons } from '@/lib/repositories/lessons';
import { listCourses } from '@/lib/repositories/courses';
import { createSubmission } from '@/lib/repositories/submissions';
import { Scope } from '@/types';
import { ToastProvider } from '@/components/ui/Toast';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { AssignmentManager } from '@/components/lms/AssignmentManager';
import { AssignmentModal } from '@/components/lms/AssignmentModal';

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
  console.log('--- Seeding Storage for LMS Assignment Creation Tests ---');
  await ensureSeeded();

  const scope: Scope = { schoolId: 'sch_main', campusId: 'cmp_main' };
  const courses = await listCourses(scope);
  assert(courses.length > 0, 'Seed should contain courses');
  const targetCourse = courses[0];
  const courseId = targetCourse.id;

  const lessons = await listLessons(scope, courseId);
  assert(lessons.length > 0, 'Course should have lessons for optional linking');
  const targetLesson = lessons[0];

  console.log(`\nTesting with Course: "${targetCourse.title}" (${courseId})`);
  console.log(`Target Lesson for link: "${targetLesson.title}" (${targetLesson.id})`);

  // 1. Test Assignment Creation WITH Optional Lesson Link
  console.log('\n--- Test 1: Assignment Creation WITH Optional Lesson Link ---');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);

  const linkedAssignment = await createAssignment({
    schoolId: 'sch_main',
    courseId,
    lessonId: targetLesson.id,
    title: 'Unit 1 Homework: Vector Addition Lab Report',
    instructions: 'Submit your typed lab calculations in PDF format detailing vector components.',
    deadline: tomorrow.toISOString(),
    maxMarks: 50,
  });

  assert(linkedAssignment.id.startsWith('asn_'), 'Assignment ID must start with asn_');
  assert.strictEqual(linkedAssignment.title, 'Unit 1 Homework: Vector Addition Lab Report');
  assert.strictEqual(linkedAssignment.lessonId, targetLesson.id, 'Lesson ID link must match');
  assert.strictEqual(linkedAssignment.maxMarks, 50);
  assert.strictEqual(linkedAssignment.courseId, courseId);
  console.log('✓ Linked assignment created successfully');

  // 2. Test Assignment Creation WITHOUT Lesson Link (Course-wide)
  console.log('\n--- Test 2: Course-wide Assignment Creation (No Lesson Link) ---');
  const unlinkedAssignment = await createAssignment({
    schoolId: 'sch_main',
    courseId,
    title: 'Midterm Research Project: Renewable Energy Systems',
    instructions: 'Comprehensive literature review on photovoltaic efficiency.',
    deadline: tomorrow.toISOString(),
    maxMarks: 100,
  });

  assert(unlinkedAssignment.id.startsWith('asn_'));
  assert.strictEqual(unlinkedAssignment.title, 'Midterm Research Project: Renewable Energy Systems');
  assert.strictEqual(unlinkedAssignment.lessonId, undefined, 'lessonId must be undefined for course-wide');
  assert.strictEqual(unlinkedAssignment.maxMarks, 100);
  console.log('✓ Course-wide assignment created without lesson link');

  // 3. Test Validation Rules
  console.log('\n--- Test 3: Validation Rules ---');
  // A. Empty Title
  await assert.rejects(
    async () => {
      await createAssignment({
        schoolId: 'sch_main',
        courseId,
        title: '   ',
        instructions: 'Test',
        deadline: tomorrow.toISOString(),
        maxMarks: 50,
      });
    },
    /Assignment title is required/,
    'Empty title must reject'
  );

  // B. Missing Course ID
  await assert.rejects(
    async () => {
      await createAssignment({
        schoolId: 'sch_main',
        courseId: '',
        title: 'Missing course',
        instructions: 'Test',
        deadline: tomorrow.toISOString(),
        maxMarks: 50,
      });
    },
    /Assignment must belong to a course/,
    'Missing courseId must reject'
  );

  // C. Non-positive maxMarks
  await assert.rejects(
    async () => {
      await createAssignment({
        schoolId: 'sch_main',
        courseId,
        title: 'Zero marks assignment',
        instructions: 'Test',
        deadline: tomorrow.toISOString(),
        maxMarks: 0,
      });
    },
    /Maximum marks must be a positive number/,
    'Zero marks must reject'
  );

  // D. Invalid Deadline
  await assert.rejects(
    async () => {
      await createAssignment({
        schoolId: 'sch_main',
        courseId,
        title: 'Invalid deadline assignment',
        instructions: 'Test',
        deadline: 'not-a-date',
        maxMarks: 100,
      });
    },
    /A valid deadline date and time is required/,
    'Invalid deadline date must reject'
  );

  // E. Non-existent Lesson Link
  await assert.rejects(
    async () => {
      await createAssignment({
        schoolId: 'sch_main',
        courseId,
        lessonId: 'lsn_non_existent',
        title: 'Ghost lesson link',
        instructions: 'Test',
        deadline: tomorrow.toISOString(),
        maxMarks: 100,
      });
    },
    /Linked lesson "lsn_non_existent" does not exist/,
    'Non-existent lessonId must reject'
  );
  console.log('✓ Validation rules verified');

  // 4. Test Assignment Queries & Lesson Link Helper
  console.log('\n--- Test 4: Repository Query Helpers ---');
  const courseAssignments = await getAssignmentsByCourse(scope, courseId);
  assert(courseAssignments.some((a) => a.id === linkedAssignment.id));
  assert(courseAssignments.some((a) => a.id === unlinkedAssignment.id));

  const lessonAssignments = await getAssignmentsByLesson(scope, targetLesson.id);
  assert.strictEqual(lessonAssignments.length, 1);
  assert.strictEqual(lessonAssignments[0].id, linkedAssignment.id);
  console.log('✓ getAssignmentsByCourse and getAssignmentsByLesson verified');

  // 5. Test Update Assignment & Changing / Removing Lesson Link
  console.log('\n--- Test 5: Assignment Update (Modifying & Removing Lesson Link) ---');
  // Update deadline and max marks
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  const updated1 = await updateAssignment(linkedAssignment.id, {
    title: 'Unit 1 Homework: Revised Kinematics Lab Report',
    maxMarks: 75,
    deadline: nextWeek.toISOString(),
  });
  assert.strictEqual(updated1.title, 'Unit 1 Homework: Revised Kinematics Lab Report');
  assert.strictEqual(updated1.maxMarks, 75);

  // Clear lesson link (convert from lesson-linked to course-wide)
  const cleared = await updateAssignment(linkedAssignment.id, {
    lessonId: '',
  });
  assert.strictEqual(cleared.lessonId, undefined, 'Empty lessonId must clear link to undefined');

  // Re-link to target lesson
  const relinked = await updateAssignment(linkedAssignment.id, {
    lessonId: targetLesson.id,
  });
  assert.strictEqual(relinked.lessonId, targetLesson.id);
  console.log('✓ Assignment update and lesson link modifications verified');

  // 6. Test Enriched Assignments & Submission Metrics
  console.log('\n--- Test 6: Enriched Assignments & Submission Metrics Calculation ---');
  // Submit an on-time submission and a late submission
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  // Create an assignment that is past due
  const pastDueAssignment = await createAssignment({
    schoolId: 'sch_main',
    courseId,
    lessonId: targetLesson.id,
    title: 'Past Due Assignment',
    instructions: 'Due yesterday',
    deadline: yesterday.toISOString(),
    maxMarks: 20,
  });

  // Student 1 submits on-time (2 days ago)
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  await createSubmission({
    assignmentId: pastDueAssignment.id,
    studentId: 'stu_student1',
    body: 'My submission on time',
    submittedAt: twoDaysAgo.toISOString(),
  });

  // Student 2 submits late (today, after yesterday deadline)
  await createSubmission({
    assignmentId: pastDueAssignment.id,
    studentId: 'stu_student2',
    body: 'My late submission',
    submittedAt: new Date().toISOString(),
  });

  const enriched = await getEnrichedAssignments(scope, courseId);
  const foundPastDue = enriched.find((a) => a.id === pastDueAssignment.id);
  assert(foundPastDue, 'Past due assignment must be in enriched list');
  assert.strictEqual(foundPastDue.lessonTitle, targetLesson.title, 'Lesson title must be enriched');
  assert.strictEqual(foundPastDue.submissionCount, 2, 'Should have 2 submissions total');
  assert.strictEqual(foundPastDue.lateCount, 1, 'Should have 1 late submission');
  assert(foundPastDue.missingCount >= 0, 'Missing count must be non-negative integer');
  console.log(`✓ Enriched metrics: Submissions=${foundPastDue.submissionCount}, Late=${foundPastDue.lateCount}, Missing=${foundPastDue.missingCount}`);

  // 7. Test Assignment Deletion
  console.log('\n--- Test 7: Assignment Deletion ---');
  await deleteAssignment(pastDueAssignment.id);
  const deleted = await getAssignment(pastDueAssignment.id);
  assert.strictEqual(deleted, null, 'Deleted assignment must return null');
  console.log('✓ Assignment deletion verified');

  // 8. Test SSR Rendering of AssignmentManager & AssignmentModal
  console.log('\n--- Test 8: SSR Rendering of Components ---');
  const currentEnriched = await getEnrichedAssignments(scope, courseId);

  // Render AssignmentManager
  const managerHtml = renderWithProviders(
    React.createElement(AssignmentManager, {
      courseId,
      courseTitle: targetCourse.title,
      schoolId: 'sch_main',
      campusId: 'cmp_main',
      initialAssignments: currentEnriched,
      initialLessons: lessons,
    })
  );

  assert(managerHtml.includes('Course Assignments'), 'Manager must render header');
  assert(managerHtml.includes('New Assignment'), 'Manager must render new assignment button');
  assert(managerHtml.includes('Submitted'), 'Manager must render submission metric');
  assert(managerHtml.includes('pts max'), 'Manager must render max marks badge');
  assert(
    managerHtml.includes('Course-Wide') || managerHtml.includes(targetLesson.title),
    'Manager must render lesson link badge or Course-Wide badge'
  );
  console.log('✓ AssignmentManager SSR rendered cleanly');

  // Render AssignmentModal (Create Mode)
  const modalCreateHtml = renderWithProviders(
    React.createElement(AssignmentModal, {
      isOpen: true,
      onClose: () => {},
      onSave: async () => {},
      initialAssignment: null,
      lessons,
    })
  );
  assert(modalCreateHtml.includes('Create New Assignment'), 'Modal must render create title');
  assert(modalCreateHtml.includes('No linked lesson (Course-wide)'), 'Modal must have course-wide option');
  assert(
    modalCreateHtml.includes(targetLesson.title) ||
      modalCreateHtml.includes(targetLesson.title.replace(/&/g, '&amp;')),
    'Modal must list course lessons'
  );
  assert(modalCreateHtml.includes('Maximum Marks'), 'Modal must have marks input');

  // Render AssignmentModal (Edit Mode)
  const modalEditHtml = renderWithProviders(
    React.createElement(AssignmentModal, {
      isOpen: true,
      onClose: () => {},
      onSave: async () => {},
      initialAssignment: linkedAssignment,
      lessons,
    })
  );
  assert(modalEditHtml.includes('Edit Assignment'), 'Modal must render edit title');
  assert(modalEditHtml.includes('Update Assignment'), 'Modal must render update button');
  console.log('✓ AssignmentModal SSR rendered cleanly for create and edit modes');

  console.log('\n🎉 ALL TASK-062 ASSIGNMENT CREATION, DEADLINE & OPTIONAL LESSON LINK TESTS PASSED!\n');
}

runTests().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
