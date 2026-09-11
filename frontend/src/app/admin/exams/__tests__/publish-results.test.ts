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
  canPublishExam,
  createExamSchedule,
  getExam,
  publishExamResults,
  unpublishExamResults,
} from '@/lib/repositories/exams';
import {
  listPublishedResultsForStudent,
  saveExamMarksEntry,
} from '@/lib/repositories/examResults';
import { listClasses } from '@/lib/repositories/classes';
import { listSubjects } from '@/lib/repositories/subjects';
import { listStudents } from '@/lib/repositories/students';
import { setSession } from '@/lib/repositories/session';
import { ExamsListView } from '@/components/exams/ExamsListView';
import { ToastProvider } from '@/components/ui/Toast';
import { SessionProvider } from '@/components/providers/SessionProvider';

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
  console.log('--- Running TASK-050 Publish and Unpublish Results Test Suite ---');

  await ensureSeeded();
  const schoolId = 'sch_main';

  const classes = await listClasses({ schoolId });
  assert(classes.length > 0, 'Classes must be seeded');
  const testClass = classes[0];

  const scope = { schoolId, campusId: testClass.campusId };
  await setSession({
    userId: 'usr_admin',
    role: 'school_admin',
    schoolId,
    campusId: testClass.campusId,
  });

  const subjects = await listSubjects({ schoolId });
  assert(subjects.length > 0, 'Subjects must be seeded');
  const testSubject = subjects[0];

  const students = await listStudents(scope);
  const classStudents = students.filter((s) => s.classId === testClass.id);
  assert(classStudents.length > 0, 'Must have enrolled students in class');
  const student = classStudents[0];

  // 1. Create scheduled exam
  const exam = await createExamSchedule({
    schoolId,
    campusId: testClass.campusId,
    academicYearId: 'ay_2026_2027',
    name: 'Term 1 Final Chemistry Exam',
    term: 'Term 1',
    classId: testClass.id,
    subjectId: testSubject.id,
    date: '2026-11-25',
    maxMarks: 100,
    status: 'draft',
  });

  assert.strictEqual(exam.status, 'draft');

  // Verify draft cannot be published before marks are entered
  const checkDraft = canPublishExam(exam);
  assert.strictEqual(checkDraft.canPublish, false, 'Draft exam cannot be published before marks entry');
  console.log('✓ Draft exam correctly restricted from premature publication');

  // 2. Teacher enters student marks -> status transitions to 'marks_entered'
  await saveExamMarksEntry(
    scope,
    exam.id,
    [{ studentId: student.id, marksObtained: 88, remarks: 'Excellent laboratory work' }],
    true
  );

  const examAfterMarks = await getExam(exam.id);
  assert.strictEqual(examAfterMarks?.status, 'marks_entered');
  console.log('✓ Exam transitioned to "marks_entered" after scoring');

  // 3. Acceptance Criteria: "Invisible to parents until published"
  // Query student's published results from parent/student portal
  const parentResultsUnpublished = await listPublishedResultsForStudent(scope, student.id);
  const foundUnpublished = parentResultsUnpublished.find((r) => r.examId === exam.id);
  assert.strictEqual(
    foundUnpublished,
    undefined,
    'Acceptance Criteria: Results must be completely invisible to parents while unpublished'
  );
  console.log('✓ Acceptance Criteria verified: Unpublished results are strictly invisible to parents and students');

  // 4. Admin publishes the exam
  const checkCanPublish = canPublishExam(examAfterMarks!);
  assert.strictEqual(checkCanPublish.canPublish, true, 'Exam with marks entered can be published');

  const publishedExam = await publishExamResults(scope, exam.id);
  assert.strictEqual(publishedExam.status, 'published');
  console.log('✓ Admin published the exam successfully');

  // 5. Parent query now returns the published results
  const parentResultsPublished = await listPublishedResultsForStudent(scope, student.id);
  const foundPublished = parentResultsPublished.find((r) => r.examId === exam.id);
  assert(foundPublished, 'Published result must be accessible to parents');
  assert.strictEqual(foundPublished.marksObtained, 88);
  assert.strictEqual(foundPublished.maxMarks, 100);
  assert.strictEqual(foundPublished.percentage, 88);
  assert.strictEqual(foundPublished.grade, 'A');
  assert.strictEqual(foundPublished.remarks, 'Excellent laboratory work');
  console.log('✓ Parent and student can view results after official publication');

  // 6. Reversible unpublishing: Admin unpublishes the exam
  const unpublishedExam = await unpublishExamResults(scope, exam.id);
  assert.strictEqual(unpublishedExam.status, 'marks_entered', 'Status must revert to marks_entered');
  console.log('✓ Admin reversibly unpublished the exam');

  // 7. Invisibility confirmed: Parent query immediately returns empty again
  const parentResultsAfterUnpublish = await listPublishedResultsForStudent(scope, student.id);
  const foundAfterUnpublish = parentResultsAfterUnpublish.find((r) => r.examId === exam.id);
  assert.strictEqual(
    foundAfterUnpublish,
    undefined,
    'Results must immediately disappear from parents view upon unpublication'
  );
  console.log('✓ Reversibility verified: Retracted results immediately hidden from parents');

  // 8. UI SSR verification of action buttons
  const enrichedMarksEnteredExam = {
    ...examAfterMarks!,
    status: 'marks_entered' as const,
    classInfo: testClass,
    subject: testSubject,
    eligibleStudentsCount: classStudents.length,
  };

  const renderedMarksEntered = renderWithProviders(
    React.createElement(ExamsListView, {
      initialExams: [enrichedMarksEnteredExam],
    })
  );
  assert(renderedMarksEntered.includes('Publish'), 'Must render Publish action button for marks_entered exam');

  const enrichedPublishedExam = {
    ...examAfterMarks!,
    status: 'published' as const,
    classInfo: testClass,
    subject: testSubject,
    eligibleStudentsCount: classStudents.length,
  };

  const renderedPublished = renderWithProviders(
    React.createElement(ExamsListView, {
      initialExams: [enrichedPublishedExam],
    })
  );
  assert(renderedPublished.includes('Unpublish'), 'Must render Unpublish action button for published exam');
  console.log('✓ ExamsListView UI renders Publish and Unpublish action buttons');

  console.log('--- ALL TASK-050 TESTS PASSED SUCCESSFULLY ---');
}

runTests().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});
