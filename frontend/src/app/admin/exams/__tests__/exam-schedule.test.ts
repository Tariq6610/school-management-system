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
import { ensureSeeded } from '../../../../lib/seed/boot';
import {
  createExamSchedule,
  getExam,
  listEnrichedExams,
  listExams,
  updateExam,
  deleteExam,
} from '../../../../lib/repositories/exams';
import { listClasses } from '../../../../lib/repositories/classes';
import { listSubjects } from '../../../../lib/repositories/subjects';
import { setSession } from '../../../../lib/repositories/session';
import { ExamsListView } from '../../../../components/exams/ExamsListView';
import { ExamFormModal } from '../../../../components/exams/ExamFormModal';
import { ToastProvider } from '../../../../components/ui/Toast';
import { SessionProvider } from '../../../../components/providers/SessionProvider';

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
  console.log('--- Running TASK-047 Exam Creation and Schedule Test Suite ---');

  // 1. Seed base data
  await ensureSeeded();
  const schoolId = 'sch_main';

  await setSession({
    userId: 'usr_admin',
    role: 'school_admin',
    schoolId: 'sch_main',
    campusId: 'camp_main',
  });

  const classes = await listClasses({ schoolId });
  assert(classes.length > 0, 'Should have classes seeded');
  const targetClass = classes[0];

  const subjects = await listSubjects({ schoolId });
  assert(subjects.length > 0, 'Should have subjects seeded');
  const targetSubject = subjects.find((s) => s.classId === targetClass.id) || subjects[0];

  // 2. Acceptance Criteria: Exam creation per class and subject
  const newExam = await createExamSchedule({
    schoolId,
    campusId: targetClass.campusId,
    academicYearId: 'ay_2026_2027',
    name: 'Midterm Examination 2026',
    term: 'Midterm',
    classId: targetClass.id,
    subjectId: targetSubject.id,
    date: '2026-10-20',
    maxMarks: 100,
    status: 'draft',
  });

  assert(newExam.id.startsWith('exm_'), 'Exam ID must be generated with exm_ prefix');
  assert.strictEqual(newExam.name, 'Midterm Examination 2026');
  assert.strictEqual(newExam.term, 'Midterm');
  assert.strictEqual(newExam.classId, targetClass.id, 'Exam must be scheduled per specified class');
  assert.strictEqual(newExam.subjectId, targetSubject.id, 'Exam must be scheduled per specified subject');
  assert.strictEqual(newExam.maxMarks, 100);
  assert.strictEqual(newExam.status, 'draft', 'Newly scheduled exam should default to draft');

  const retrieved = await getExam(newExam.id);
  assert(retrieved !== null, 'Exam must be retrieved from storage');
  assert.strictEqual(retrieved.id, newExam.id);

  console.log('✓ Exam creation per class and subject verified');

  // 3. Validation Constraints
  // Zero or negative maxMarks rejected
  await assert.rejects(
    async () => {
      await createExamSchedule({
        schoolId,
        campusId: targetClass.campusId,
        academicYearId: 'ay_2026_2027',
        name: 'Invalid Marks Exam',
        term: 'Midterm',
        classId: targetClass.id,
        subjectId: targetSubject.id,
        date: '2026-10-20',
        maxMarks: 0,
        status: 'draft',
      });
    },
    /Maximum marks must be greater than zero/,
    'Zero maximum marks must be rejected'
  );

  // Missing required fields rejected
  await assert.rejects(
    async () => {
      await createExamSchedule({
        schoolId,
        campusId: targetClass.campusId,
        academicYearId: 'ay_2026_2027',
        name: '',
        term: 'Midterm',
        classId: targetClass.id,
        subjectId: targetSubject.id,
        date: '2026-10-20',
        maxMarks: 100,
        status: 'draft',
      });
    },
    /Exam name is required/,
    'Empty exam name must be rejected'
  );

  console.log('✓ Validation constraints (maxMarks > 0, required fields) verified');

  // 4. Multi-facet Schedule Filtering
  const classFilterResults = await listExams({ schoolId }, { classId: targetClass.id });
  assert(
    classFilterResults.some((e) => e.id === newExam.id),
    'Filtering by classId must find the created exam'
  );

  const subjectFilterResults = await listExams({ schoolId }, { subjectId: targetSubject.id });
  assert(
    subjectFilterResults.some((e) => e.id === newExam.id),
    'Filtering by subjectId must find the created exam'
  );

  const termFilterResults = await listExams({ schoolId }, { term: 'Midterm' });
  assert(
    termFilterResults.some((e) => e.id === newExam.id),
    'Filtering by term must find the created exam'
  );

  const draftFilterResults = await listExams({ schoolId }, { status: 'draft' });
  assert(
    draftFilterResults.some((e) => e.id === newExam.id),
    'Filtering by status draft must find the created exam'
  );

  console.log('✓ Multi-facet schedule filtering verified');

  // 5. Enriched Exams Listing
  const enrichedList = await listEnrichedExams({ schoolId });
  const enrichedExam = enrichedList.find((e) => e.id === newExam.id);
  assert(enrichedExam !== undefined, 'Enriched exam must be returned');
  assert(enrichedExam.classInfo !== undefined, 'Enriched exam must have joined classInfo');
  assert(enrichedExam.subject !== undefined, 'Enriched exam must have joined subject');
  assert(typeof enrichedExam.eligibleStudentsCount === 'number', 'Must compute student count');

  console.log('✓ Enriched exam listings with joined metadata verified');

  // 6. Update and Delete
  const updated = await updateExam(newExam.id, { maxMarks: 75 });
  assert.strictEqual(updated.maxMarks, 75, 'Exam maxMarks must be updated to 75');

  // 7. SSR Component Rendering
  const listViewHtml = renderWithProviders(
    React.createElement(ExamsListView, {
      initialCampusId: targetClass.campusId,
      initialExams: [enrichedExam],
    })
  );

  assert(
    listViewHtml.includes('Examinations &amp; Assessment Schedules') ||
    listViewHtml.includes('Examinations & Assessment Schedules'),
    'ExamsListView must render title'
  );
  assert(listViewHtml.includes('Schedule New Exam'), 'ExamsListView must render schedule CTA');
  assert(listViewHtml.includes('Midterm Examination 2026'), 'ExamsListView must render exam row');

  const modalHtml = renderWithProviders(
    React.createElement(ExamFormModal, {
      isOpen: true,
      onClose: () => {},
      onSaved: () => {},
      initialCampusId: targetClass.campusId,
      initialClasses: [targetClass],
      initialSubjects: [targetSubject],
    })
  );

  assert(modalHtml.includes('Schedule New Exam'), 'ExamFormModal must render modal header');
  assert(modalHtml.includes('Maximum Marks'), 'ExamFormModal must render max marks input');
  assert(modalHtml.includes('Academic Term'), 'ExamFormModal must render term selector');

  console.log('✓ ExamsListView and ExamFormModal SSR rendering verified');

  // Clean up test exam
  await deleteExam(newExam.id);
  const postDelete = await getExam(newExam.id);
  assert.strictEqual(postDelete, null, 'Deleted exam should no longer exist');

  console.log('--- ALL TASK-047 TESTS PASSED SUCCESSFULLY ---');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
