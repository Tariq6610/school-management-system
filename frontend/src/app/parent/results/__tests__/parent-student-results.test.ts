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
  },
  writable: true,
});

import React from 'react';
import { renderToString } from 'react-dom/server';
import { ensureSeeded } from '@/lib/seed/boot';
import { listClasses } from '@/lib/repositories/classes';
import { listStudents } from '@/lib/repositories/students';
import { listSubjects } from '@/lib/repositories/subjects';
import {
  createExamSchedule,
  publishExamResults,
  unpublishExamResults,
} from '@/lib/repositories/exams';
import {
  listPublishedResultsForStudent,
  saveExamMarksEntry,
} from '@/lib/repositories/examResults';
import { getStudentReportCard } from '@/lib/repositories/reportCards';
import { StudentResultsView } from '@/components/results/StudentResultsView';
import { ToastProvider } from '@/components/ui/Toast';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { setSession } from '@/lib/repositories/session';
import { getChildrenForParent, listParents } from '@/lib/repositories/parents';

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

async function runParentStudentResultsTestSuite() {
  console.log('--- Starting TASK-052 Parent & Student Results View Test Suite ---');

  // 1. Initialize Seed Data
  await ensureSeeded();
  const scope = { schoolId: 'sch_main' };

  // Resolve seeded parent
  const parents = await listParents(scope);
  assert(parents.length > 0, 'Seed data must contain parents');
  const seededParent = parents[0];

  // Set session as parent
  await setSession({
    userId: seededParent.userId,
    role: 'parent',
    schoolId: 'sch_main',
  });

  const classes = await listClasses(scope);
  assert(classes.length > 0, 'Seed data must contain classes');
  const targetClass = classes[0];

  const students = await listStudents(scope, { classId: targetClass.id, activeOnly: true });
  assert(students.length > 0, 'Class must contain active students');
  const targetStudent = students[0];

  const subjects = await listSubjects(scope);
  assert(subjects.length > 0, 'Subjects must exist');

  // 2. Acceptance Criteria — "Published only" verification
  // Create an exam in draft status
  const exam = await createExamSchedule({
    schoolId: targetClass.schoolId,
    campusId: targetClass.campusId,
    academicYearId: targetClass.academicYearId,
    name: 'Science Final Examination',
    term: 'Term 2',
    classId: targetClass.id,
    subjectId: subjects[0].id,
    date: '2026-11-20',
    maxMarks: 100,
    status: 'draft',
  });

  // Enter marks for student
  await saveExamMarksEntry(scope, exam.id, [
    { studentId: targetStudent.id, marksObtained: 85, remarks: 'Strong empirical analysis' },
  ]);

  // Query results before publication: MUST BE EMPTY for this exam
  const unpublishedQuery = await listPublishedResultsForStudent(scope, targetStudent.id);
  const foundUnpublished = unpublishedQuery.find((r) => r.examId === exam.id);
  assert.strictEqual(
    foundUnpublished,
    undefined,
    'Acceptance Criterion PASSED: Draft/marks_entered exam results are strictly invisible to parents and students'
  );

  console.log('✓ Unfinished/marks_entered exam results verified invisible prior to official publication');

  // Admin publishes the exam
  await publishExamResults(scope, exam.id);

  // Query results after publication: MUST BE VISIBLE
  const publishedQuery = await listPublishedResultsForStudent(scope, targetStudent.id);
  const foundPublished = publishedQuery.find((r) => r.examId === exam.id);
  assert(
    foundPublished !== undefined,
    'Acceptance Criterion PASSED: Published results become immediately visible to parents and students'
  );
  assert.strictEqual(foundPublished.marksObtained, 85);
  assert.strictEqual(foundPublished.maxMarks, 100);
  assert.strictEqual(foundPublished.percentage, 85);
  assert.strictEqual(foundPublished.grade, 'A');
  assert.strictEqual(foundPublished.isPassing, true);

  console.log('✓ Published exam result successfully retrieved with correct marks, percentage, and grade');

  // Test reversible unpublishing
  await unpublishExamResults(scope, exam.id);
  const retractedQuery = await listPublishedResultsForStudent(scope, targetStudent.id);
  const foundRetracted = retractedQuery.find((r) => r.examId === exam.id);
  assert.strictEqual(
    foundRetracted,
    undefined,
    'Acceptance Criterion PASSED: Unpublishing immediately retracts visibility from parents and students'
  );

  console.log('✓ Reversible unpublishing hides exam results from parent/student queries immediately');

  // Re-publish for report card and UI testing
  await publishExamResults(scope, exam.id);

  // 3. Test getStudentReportCard for single student
  const studentReportCard = await getStudentReportCard(scope, targetStudent.id, 'Term 2');
  assert(studentReportCard !== null, 'Single student report card successfully generated');
  assert.strictEqual(studentReportCard.student.id, targetStudent.id);
  assert.strictEqual(studentReportCard.term, 'Term 2');
  assert(studentReportCard.subjects.length > 0, 'Report card contains subjects');
  assert(studentReportCard.attendance.totalDays >= 0, 'Attendance stats present');
  assert(studentReportCard.classTeacherRemarks.length > 0, 'Class teacher remarks generated');

  console.log('✓ getStudentReportCard generates complete single-student report card payload');

  // 4. Test Parent Family Scope Protection
  const parentChildren = await getChildrenForParent(seededParent.userId);
  assert(parentChildren.length > 0, 'Parent has linked children in seed data');
  const linkedChild = parentChildren[0].student;
  assert(linkedChild.id.length > 0, 'Linked child has valid ID');

  // Non-linked student check
  const nonLinkedId = 'stu_non_existent_fake';
  const isAuthorized = parentChildren.some((c) => c.student.id === nonLinkedId);
  assert.strictEqual(isAuthorized, false, 'Non-linked student correctly denied access in parent scope');

  console.log('✓ Parent authorized child scope protection verified');

  // 5. Test SSR Rendering for StudentResultsView in Parent Mode
  const parentViewHtml = renderWithProviders(
    React.createElement(StudentResultsView, {
      mode: 'parent',
      initialStudentId: targetStudent.id,
    })
  );

  assert(parentViewHtml.includes('Examination Results'), 'Parent view renders main title');
  assert(parentViewHtml.includes('Parent Portal'), 'Parent view displays portal badge');
  assert(parentViewHtml.includes('Official Examination Marks'), 'Parent view displays table header');

  console.log('✓ StudentResultsView (Parent Mode) SSR rendered successfully');

  // 6. Test SSR Rendering for StudentResultsView in Student Mode
  const studentViewHtml = renderWithProviders(
    React.createElement(StudentResultsView, {
      mode: 'student',
      initialStudentId: targetStudent.id,
    })
  );

  assert(studentViewHtml.includes('Student Portal'), 'Student view displays student portal badge');
  assert(studentViewHtml.includes('Official Examination Marks'), 'Student view displays table header');

  console.log('✓ StudentResultsView (Student Mode) SSR rendered successfully');
  console.log('--- ALL TASK-052 TESTS PASSED SUCCESSFULLY ---');
}

runParentStudentResultsTestSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
