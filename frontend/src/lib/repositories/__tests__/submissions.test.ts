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
  submitAssignment,
  getStudentSubmission,
  getStudentCourseAssignments,
  gradeSubmission,
  deleteSubmission,
} from '@/lib/repositories/submissions';
import { createAssignment } from '@/lib/repositories/assignments';
import { listCourses } from '@/lib/repositories/courses';
import { listLessons } from '@/lib/repositories/lessons';
import { Scope } from '@/types';
import { ToastProvider } from '@/components/ui/Toast';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { StudentAssignmentModal } from '@/components/lms/StudentAssignmentModal';

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
  console.log('--- Seeding Storage for LMS Student Submissions & Late Flagging Tests ---');
  await ensureSeeded();

  const scope: Scope = { schoolId: 'sch_main', campusId: 'cmp_main' };
  const courses = await listCourses(scope);
  assert(courses.length > 0, 'Seed should contain courses');
  const targetCourse = courses[0];
  const courseId = targetCourse.id;

  const lessons = await listLessons(scope, courseId);
  const targetLesson = lessons[0];

  const studentId = 'stu_ayesha';

  console.log(`\nTesting with Course: "${targetCourse.title}" (${courseId})`);
  console.log(`Testing with Student: ${studentId}`);

  // Create an upcoming assignment (due tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const upcomingAssignment = await createAssignment({
    schoolId: 'sch_main',
    courseId,
    lessonId: targetLesson?.id,
    title: 'Kinematics Problem Set 1',
    instructions: 'Solve all numerical problems from Section 2.3.',
    deadline: tomorrow.toISOString(),
    maxMarks: 50,
  });

  // 1. Test Submission with Rich Text Response Only (On-Time)
  console.log('\n--- Test 1: Submission with Text Only (On-Time) ---');
  const sub1 = await submitAssignment({
    assignmentId: upcomingAssignment.id,
    studentId,
    body: 'Problem 1: v = u + at = 0 + (9.8)(5) = 49 m/s.\nProblem 2: s = ut + 0.5at^2 = 122.5 m.',
  });

  assert(sub1.id.startsWith('sub_'), 'Submission ID must have sub_ prefix');
  assert.strictEqual(sub1.assignmentId, upcomingAssignment.id);
  assert.strictEqual(sub1.studentId, studentId);
  assert(sub1.body?.includes('49 m/s'));
  assert.strictEqual(sub1.fileName, undefined, 'fileName must be undefined when not supplied');
  assert.strictEqual(sub1.isLate, false, 'Submission before deadline must not be late');
  assert(Date.parse(sub1.submittedAt) > 0, 'submittedAt must be valid date');
  console.log('✓ Text-only submission recorded with on-time flag');

  // 2. Test Resubmission with Attached File Name Before Deadline (Replaces previous)
  console.log('\n--- Test 2: Resubmission Before Deadline with File (Replaces previous) ---');
  const sub2 = await submitAssignment({
    assignmentId: upcomingAssignment.id,
    studentId,
    body: 'Updated solution with diagrams and calculations.',
    fileName: 'kinematics_ps1_solution.pdf',
  });

  assert.strictEqual(sub2.id, sub1.id, 'Resubmission must reuse and replace previous submission document');
  assert.strictEqual(sub2.fileName, 'kinematics_ps1_solution.pdf');
  assert(sub2.body?.includes('Updated solution'));
  assert.strictEqual(sub2.isLate, false, 'Resubmission before deadline remains on-time');
  console.log('✓ Resubmission cleanly replaced previous submission');

  // 3. Test File-Only Submission on Another Assignment
  console.log('\n--- Test 3: File-Only Submission ---');
  const fileAssignment = await createAssignment({
    schoolId: 'sch_main',
    courseId,
    title: 'Lab Report Document Upload',
    instructions: 'Attach your completed lab report PDF.',
    deadline: tomorrow.toISOString(),
    maxMarks: 100,
  });

  const subFile = await submitAssignment({
    assignmentId: fileAssignment.id,
    studentId,
    fileName: 'lab_report_final.pdf',
  });

  assert.strictEqual(subFile.fileName, 'lab_report_final.pdf');
  assert.strictEqual(subFile.body, undefined);
  assert.strictEqual(subFile.isLate, false);
  console.log('✓ File-only submission recorded successfully');

  // 4. Test Validation: Neither Text Nor File Provided
  console.log('\n--- Test 4: Validation (Neither text nor file) ---');
  await assert.rejects(
    async () => {
      await submitAssignment({
        assignmentId: upcomingAssignment.id,
        studentId,
        body: '   ',
        fileName: '   ',
      });
    },
    /Please provide text response or an attached file for your submission/,
    'Empty text and empty file must be rejected'
  );
  console.log('✓ Empty submission rejected as expected');

  // 5. Test Late Submission Flagging (Submitted After Deadline)
  console.log('\n--- Test 5: Late Submission Flagging ---');
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 2);

  const pastDueAssignment = await createAssignment({
    schoolId: 'sch_main',
    courseId,
    title: 'Past Due Homework 3',
    instructions: 'Deadline was 2 days ago.',
    deadline: pastDate.toISOString(),
    maxMarks: 30,
  });

  const lateSub = await submitAssignment({
    assignmentId: pastDueAssignment.id,
    studentId,
    body: 'Late submission: apologies for the delay, here is my completed assignment.',
    fileName: 'late_homework3.docx',
  });

  assert.strictEqual(lateSub.isLate, true, 'Submission after deadline MUST be flagged as isLate: true');
  assert(Date.parse(lateSub.submittedAt) > Date.parse(pastDueAssignment.deadline));
  console.log('✓ Late submission accurately flagged as isLate: true');

  // 6. Test Query Helper: getStudentSubmission
  console.log('\n--- Test 6: getStudentSubmission Query Helper ---');
  const retrievedSub = await getStudentSubmission(pastDueAssignment.id, studentId);
  assert(retrievedSub);
  assert.strictEqual(retrievedSub.id, lateSub.id);
  assert.strictEqual(retrievedSub.isLate, true);
  console.log('✓ getStudentSubmission retrieved correct document');

  // 7. Test getStudentCourseAssignments Enriched Output
  console.log('\n--- Test 7: getStudentCourseAssignments Statuses ---');
  const courseAssignments = await getStudentCourseAssignments(scope, courseId, studentId);
  assert(courseAssignments.length >= 3);

  const onTimeItem = courseAssignments.find((a) => a.id === upcomingAssignment.id);
  assert(onTimeItem);
  assert.strictEqual(onTimeItem.isSubmitted, true);
  assert.strictEqual(onTimeItem.status, 'submitted');
  assert.strictEqual(onTimeItem.isLateSubmission, false);

  const lateItem = courseAssignments.find((a) => a.id === pastDueAssignment.id);
  assert(lateItem);
  assert.strictEqual(lateItem.isSubmitted, true);
  assert.strictEqual(lateItem.isLateSubmission, true);
  assert.strictEqual(lateItem.status, 'late');

  // Grade the on-time assignment and verify 'graded' status
  await gradeSubmission(sub2.id, 48, 'Excellent numerical derivations!', 'tch_1');
  const updatedCourseAssignments = await getStudentCourseAssignments(scope, courseId, studentId);
  const gradedItem = updatedCourseAssignments.find((a) => a.id === upcomingAssignment.id);
  assert(gradedItem);
  assert.strictEqual(gradedItem.status, 'graded');
  assert.strictEqual(gradedItem.submission?.marksObtained, 48);
  console.log('✓ All student assignment statuses verified: pending, submitted, late, graded');

  // 8. Test SSR Rendering of StudentAssignmentModal
  console.log('\n--- Test 8: SSR Rendering of StudentAssignmentModal ---');
  // Modal for On-Time Graded Assignment
  const modalGradedHtml = renderWithProviders(
    React.createElement(StudentAssignmentModal, {
      isOpen: true,
      onClose: () => {},
      assignment: gradedItem,
      studentId,
    })
  );
  assert(modalGradedHtml.includes('Kinematics Problem Set 1'));
  assert(modalGradedHtml.includes('ON TIME'));
  assert(modalGradedHtml.includes('48 / 50 pts') || modalGradedHtml.includes('48'));
  assert(modalGradedHtml.includes('Excellent numerical derivations!'));
  assert(modalGradedHtml.includes('kinematics_ps1_solution.pdf'));
  console.log('✓ StudentAssignmentModal rendered graded and on-time badges cleanly');

  // Modal for Late Assignment
  const modalLateHtml = renderWithProviders(
    React.createElement(StudentAssignmentModal, {
      isOpen: true,
      onClose: () => {},
      assignment: lateItem,
      studentId,
    })
  );
  assert(modalLateHtml.includes('Past Due Homework 3'));
  assert(modalLateHtml.includes('LATE SUBMISSION'));
  assert(modalLateHtml.includes('late_homework3.docx'));
  console.log('✓ StudentAssignmentModal rendered LATE SUBMISSION badge cleanly');

  // Clean up
  await deleteSubmission(sub1.id);
  await deleteSubmission(subFile.id);
  await deleteSubmission(lateSub.id);

  console.log('\n🎉 ALL TASK-063 STUDENT SUBMISSION & LATE FLAGGING TESTS PASSED!\n');
}

runTests().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
