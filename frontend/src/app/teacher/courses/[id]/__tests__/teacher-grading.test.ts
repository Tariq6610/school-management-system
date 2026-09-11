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
} from '@/lib/repositories/assignments';
import {
  submitAssignment,
  gradeSubmission,
  getAssignmentSubmissionsWithStudents,
  getSubmission,
} from '@/lib/repositories/submissions';
import { listCourses } from '@/lib/repositories/courses';
import { listActiveStudents } from '@/lib/repositories/students';
import { Scope } from '@/types';
import { ToastProvider } from '@/components/ui/Toast';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { TeacherGradingModal } from '@/components/lms/TeacherGradingModal';
import { AssignmentManager } from '@/components/lms/AssignmentManager';

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
  console.log('--- Running TASK-064 Teacher Grading & Feedback Tests ---');

  // 1. Initialize Seed Data
  await ensureSeeded();
  const scope: Scope = { schoolId: 'sch_main', campusId: 'cmp_main' };

  const courses = await listCourses(scope);
  assert(courses.length > 0, 'Should have courses seeded');
  const course = courses[0];

  const activeStudents = await listActiveStudents(scope, { classId: course.classId });
  assert(activeStudents.length >= 2, 'Class should have at least 2 enrolled students');
  const student1 = activeStudents[0];
  const student2 = activeStudents[1];

  // 2. Create Assignment with Max Marks = 50 and future deadline
  const assignmentFuture = await createAssignment({
    schoolId: 'sch_main',
    courseId: course.id,
    title: 'Midterm Research Essay',
    instructions: 'Write a comprehensive 500-word analysis with citations.',
    deadline: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days in future
    maxMarks: 50,
  });
  assert.strictEqual(assignmentFuture.maxMarks, 50);

  // 3. Initial Cohort Evaluation Query (Before any submissions)
  const initialEvaluations = await getAssignmentSubmissionsWithStudents(scope, assignmentFuture.id);
  assert(initialEvaluations.length >= activeStudents.length, 'Should return all cohort students');
  const initialEval1 = initialEvaluations.find((e) => e.studentId === student1.id);
  assert(initialEval1, 'Student 1 should be present in evaluation roster');
  assert.strictEqual(initialEval1.status, 'pending', 'Initial status should be pending');
  assert.strictEqual(initialEval1.submission, undefined, 'Initial submission should be undefined');
  console.log('✓ Initial roster correctly reflects missing/pending submissions for all cohort members');

  // 4. Student 1 Submits On Time
  const sub1 = await submitAssignment({
    assignmentId: assignmentFuture.id,
    studentId: student1.id,
    body: 'Here is my complete 500-word research essay analyzing historical trends.',
    fileName: 'research_essay_final.docx',
  });
  assert(sub1.id, 'Submission should be created');
  assert.strictEqual(sub1.isLate, false, 'Submission should be on time');

  // 5. Create Past Assignment & Student 2 Submits Late
  const assignmentPast = await createAssignment({
    schoolId: 'sch_main',
    courseId: course.id,
    title: 'Historical Timeline Diagram',
    instructions: 'Submit a timeline chart.',
    deadline: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    maxMarks: 20,
  });

  const sub2 = await submitAssignment({
    assignmentId: assignmentPast.id,
    studentId: student2.id,
    body: 'Sorry for the slight delay, here is my completed chart.',
    fileName: 'timeline_chart.pdf',
  });
  assert.strictEqual(sub2.isLate, true, 'Submission should be marked late');

  // 6. Test Marks Boundary Validations
  console.log('Testing marks validations...');

  // 6a. Marks greater than maxMarks must throw
  let exceededError = false;
  try {
    await gradeSubmission(sub1.id, 55, 'Too high', 'usr_teacher_1');
  } catch (err: unknown) {
    exceededError = true;
    const msg = err instanceof Error ? err.message : '';
    assert(msg.includes('cannot exceed maximum marks'), `Expected maxMarks error, got: ${msg}`);
  }
  assert(exceededError, 'gradeSubmission must reject marks > maxMarks');

  // 6b. Negative marks must throw
  let negativeError = false;
  try {
    await gradeSubmission(sub1.id, -5, 'Negative marks', 'usr_teacher_1');
  } catch (err: unknown) {
    negativeError = true;
    const msg = err instanceof Error ? err.message : '';
    assert(msg.includes('non-negative number'), `Expected non-negative error, got: ${msg}`);
  }
  assert(negativeError, 'gradeSubmission must reject negative marks');
  console.log('✓ Boundary validations for marksObtained strictly enforced');

  // 7. Teacher Grades Student 1 with Marks and Written Feedback
  const gradedSub1 = await gradeSubmission(
    sub1.id,
    45.5,
    'Exceptional thesis and clear citations. Work on stronger transitional paragraphs.',
    'usr_teacher_1'
  );
  assert.strictEqual(gradedSub1.marksObtained, 45.5, 'Marks should be recorded');
  assert.strictEqual(
    gradedSub1.feedback,
    'Exceptional thesis and clear citations. Work on stronger transitional paragraphs.',
    'Feedback should be recorded'
  );
  assert.strictEqual(gradedSub1.gradedBy, 'usr_teacher_1', 'Teacher ID should be recorded');
  assert(gradedSub1.gradedAt, 'Graded timestamp should be set');

  // Verify persistence via getSubmission
  const fetchedSub1 = await getSubmission(sub1.id);
  assert(fetchedSub1, 'Should find submission');
  assert.strictEqual(fetchedSub1.marksObtained, 45.5);
  assert.strictEqual(
    fetchedSub1.feedback,
    'Exceptional thesis and clear citations. Work on stronger transitional paragraphs.'
  );

  // 8. Verify getAssignmentSubmissionsWithStudents reflects 'graded'
  const updatedEvaluations = await getAssignmentSubmissionsWithStudents(scope, assignmentFuture.id);
  const evalStudent1 = updatedEvaluations.find((e) => e.studentId === student1.id);
  assert(evalStudent1, 'Student 1 must exist in evaluations');
  assert.strictEqual(evalStudent1.status, 'graded');
  assert.strictEqual(evalStudent1.submission?.marksObtained, 45.5);
  assert.strictEqual(
    evalStudent1.submission?.feedback,
    'Exceptional thesis and clear citations. Work on stronger transitional paragraphs.'
  );
  console.log('✓ Marks and written feedback successfully recorded and reflected in cohort roster');

  // 9. Update existing grade and feedback (re-evaluation)
  const revisedSub1 = await gradeSubmission(
    sub1.id,
    48,
    'Updated: Revised score after bonus question review. Outstanding work!',
    'usr_teacher_1'
  );
  assert.strictEqual(revisedSub1.marksObtained, 48);
  assert.strictEqual(
    revisedSub1.feedback,
    'Updated: Revised score after bonus question review. Outstanding work!'
  );
  console.log('✓ Existing grade and written feedback can be successfully updated');

  // 10. Grade Student 2 (Late Submission)
  const gradedSub2 = await gradeSubmission(
    sub2.id,
    16,
    'Good diagram. 2 points deducted for late submission.',
    'usr_teacher_1'
  );
  assert.strictEqual(gradedSub2.marksObtained, 16);
  assert.strictEqual(gradedSub2.feedback, 'Good diagram. 2 points deducted for late submission.');

  const evaluationsPast = await getAssignmentSubmissionsWithStudents(scope, assignmentPast.id);
  const evalStudent2 = evaluationsPast.find((e) => e.studentId === student2.id);
  assert(evalStudent2, 'Student 2 must exist in evaluations');
  assert.strictEqual(evalStudent2.status, 'graded');
  assert.strictEqual(evalStudent2.isLate, true, 'isLate flag remains true after grading');
  console.log('✓ Late submissions can be graded while preserving the late flag');

  // 11. Component SSR Verification: TeacherGradingModal
  console.log('Testing SSR rendering for TeacherGradingModal...');
  const modalHtml = renderWithProviders(
    React.createElement(TeacherGradingModal, {
      isOpen: true,
      onClose: () => {},
      assignment: assignmentFuture,
      schoolId: 'sch_main',
      campusId: 'cmp_main',
    })
  );

  assert(modalHtml.includes('Review &amp; Grade') || modalHtml.includes('Review & Grade'), 'Should render title');
  assert(modalHtml.includes('Midterm Research Essay'), 'Should render assignment title');
  assert(modalHtml.includes('Total Cohort'), 'Should render cohort count metric');
  assert(modalHtml.includes('Submitted'), 'Should render submitted metric');
  assert(modalHtml.includes('Late'), 'Should render late metric');
  assert(modalHtml.includes('Graded'), 'Should render graded metric');
  assert(modalHtml.includes('Missing'), 'Should render missing metric');
  console.log('✓ TeacherGradingModal SSR markup rendered with metrics and modal elements');

  // 12. Component SSR Verification: AssignmentManager with Review & Grade action
  console.log('Testing SSR rendering for AssignmentManager with Review & Grade action...');
  const currentAssignment = await getAssignment(assignmentFuture.id);
  assert(currentAssignment);
  const enrichedAssignments = [{
    ...currentAssignment,
    submissionCount: 1,
    lateCount: 0,
    missingCount: activeStudents.length - 1,
  }];

  const managerHtml = renderWithProviders(
    React.createElement(AssignmentManager, {
      courseId: course.id,
      courseTitle: course.title,
      schoolId: 'sch_main',
      campusId: 'cmp_main',
      initialAssignments: enrichedAssignments,
    })
  );

  assert(managerHtml.includes('Review &amp; Grade') || managerHtml.includes('Review & Grade'), 'Should include Review & Grade button');
  assert(managerHtml.includes('Submitted'), 'Should render Submitted badge');
  assert(managerHtml.includes('Missing'), 'Should render Missing badge');
  console.log('✓ AssignmentManager renders Review & Grade action button on assignment card');

  console.log('\n--- All TASK-064 Teacher Grading & Feedback Tests Passed! ---');
}

runTests().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
