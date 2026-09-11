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
import { createExamSchedule } from '@/lib/repositories/exams';
import { saveExamMarksEntry } from '@/lib/repositories/examResults';
import { getClassReportCards } from '@/lib/repositories/reportCards';
import { ReportCardDocument } from '@/components/results/ReportCardDocument';
import { ReportCardBatchView } from '@/components/results/ReportCardBatchView';
import { ToastProvider } from '@/components/ui/Toast';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { setSession } from '@/lib/repositories/session';

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

async function runReportCardsTestSuite() {
  console.log('--- Starting TASK-051 Report Card Generation & Batch Print Test Suite ---');

  // 1. Initialize Seed Data
  await ensureSeeded();
  const scope = { schoolId: 'sch_main' };

  // Set session as school_admin
  await setSession({
    userId: 'usr_admin_1',
    role: 'school_admin',
    schoolId: 'sch_main',
  });

  // 2. Query Test Class and Active Students
  const classes = await listClasses(scope);
  assert(classes.length > 0, 'Seed data must contain at least one class');
  const targetClass = classes[0];
  const students = await listStudents(scope, { classId: targetClass.id, activeOnly: true });
  assert(students.length > 0, 'Target class must have active students');

  const subjects = await listSubjects(scope);
  assert(subjects.length >= 2, 'Seed data must contain subjects');

  // 3. Create Sample Exams for "Term 1" if needed and enter marks
  const exam1 = await createExamSchedule({
    schoolId: targetClass.schoolId,
    campusId: targetClass.campusId,
    academicYearId: targetClass.academicYearId,
    name: 'Mathematics Midterm Examination',
    term: 'Term 1',
    classId: targetClass.id,
    subjectId: subjects[0].id,
    date: '2026-10-15',
    maxMarks: 100,
    status: 'draft',
  });

  const exam2 = await createExamSchedule({
    schoolId: targetClass.schoolId,
    campusId: targetClass.campusId,
    academicYearId: targetClass.academicYearId,
    name: 'English Language Midterm Examination',
    term: 'Term 1',
    classId: targetClass.id,
    subjectId: subjects[1].id,
    date: '2026-10-18',
    maxMarks: 100,
    status: 'draft',
  });

  // Enter marks for students
  const sampleStudent = students[0];
  await saveExamMarksEntry(scope, exam1.id, [
    { studentId: sampleStudent.id, marksObtained: 88, remarks: 'Excellent grasp of calculus' },
  ]);

  await saveExamMarksEntry(scope, exam2.id, [
    { studentId: sampleStudent.id, marksObtained: 92, remarks: 'Superb literary essay' },
  ]);

  console.log('✓ Test class, subjects, exams, and student scores initialized');

  // 4. Test getClassReportCards Data Aggregation
  const reportCardsPayload = await getClassReportCards(scope, targetClass.id, 'Term 1');

  assert.strictEqual(reportCardsPayload.classObj.id, targetClass.id, 'Class object matches');
  assert.strictEqual(reportCardsPayload.term, 'Term 1', 'Term matches requested term');
  assert(reportCardsPayload.school.name.length > 0, 'School name is populated');
  assert(reportCardsPayload.branding.schoolName.length > 0, 'Branding schoolName is populated');
  assert(reportCardsPayload.branding.primaryColor.length > 0, 'Branding primaryColor is present');
  assert(reportCardsPayload.reportCards.length === students.length, 'Payload contains all class students');

  const sampleReportCard = reportCardsPayload.reportCards.find(
    (rc) => rc.student.id === sampleStudent.id
  );
  assert(sampleReportCard, 'Sample student report card exists in class cohort');

  // Verify Student details
  assert.strictEqual(sampleReportCard.student.admissionNumber, sampleStudent.admissionNumber);
  assert(sampleReportCard.user.name.length > 0, 'User name is populated');
  assert.strictEqual(sampleReportCard.classObj.grade, targetClass.grade);
  assert.strictEqual(sampleReportCard.classObj.section, targetClass.section);

  // Verify Subject Marks and Percentage
  assert(sampleReportCard.subjects.length >= 2, 'Report card contains scheduled subjects');
  const mathSubject = sampleReportCard.subjects.find((s) => s.examId === exam1.id);
  assert(mathSubject, 'Mathematics subject exists on report card');
  assert.strictEqual(mathSubject.maxMarks, 100);
  assert.strictEqual(mathSubject.marksObtained, 88);
  assert.strictEqual(mathSubject.percentage, 88);
  assert.strictEqual(mathSubject.grade, 'A', '88% receives A grade from dynamic scale');

  const engSubject = sampleReportCard.subjects.find((s) => s.examId === exam2.id);
  assert(engSubject, 'English subject exists on report card');
  assert.strictEqual(engSubject.marksObtained, 92);
  assert.strictEqual(engSubject.percentage, 92);
  assert.strictEqual(engSubject.grade, 'A+', '92% receives A+ grade from dynamic scale');

  // Verify Grand Totals mathematically
  const expectedTotalMax = sampleReportCard.subjects.reduce((sum, s) => sum + s.maxMarks, 0);
  assert.strictEqual(sampleReportCard.totalMaxMarks, expectedTotalMax, 'Total max marks matches sum of subject max marks');

  const expectedTotalObtained = sampleReportCard.subjects.reduce((sum, s) => sum + (s.marksObtained ?? 0), 0);
  assert.strictEqual(sampleReportCard.totalMarksObtained, expectedTotalObtained, 'Total marks obtained matches sum of scores');

  const expectedPct = Math.round((expectedTotalObtained / expectedTotalMax) * 1000) / 10;
  assert.strictEqual(sampleReportCard.overallPercentage, expectedPct, 'Overall percentage matches calculated ratio');
  assert(sampleReportCard.overallGrade.length > 0, 'Overall grade derived from grading scale');

  // Verify Attendance Summary
  assert(sampleReportCard.attendance.totalDays >= 0, 'Attendance total days populated');
  assert(typeof sampleReportCard.attendance.percentage === 'number', 'Attendance percentage is numeric');

  // Verify Class Teacher Remarks & Signatures
  assert(sampleReportCard.classTeacherRemarks.length > 0, 'Class teacher qualitative remarks generated');
  assert((sampleReportCard.classTeacherName ?? '').length > 0, 'Class teacher name exists');
  assert((sampleReportCard.principalName ?? '').length > 0, 'Principal name exists');
  assert(sampleReportCard.issueDate.length > 0, 'Issue date exists');

  console.log('✓ getClassReportCards data aggregation verified successfully');

  // 5. Test Acceptance Criterion: Branded & Batch Print Formatting
  // Each student report card must have page-break CSS classes
  const singleDocHtml = renderToString(
    React.createElement(ReportCardDocument, {
      data: sampleReportCard,
      isBatchItem: true,
    })
  );

  assert(singleDocHtml.includes('print-page-break'), 'Document contains print-page-break class');
  assert(singleDocHtml.includes('print-avoid-break'), 'Document contains print-avoid-break class');
  assert(singleDocHtml.includes(sampleReportCard.branding.schoolName), 'Header displays branded school name');
  assert(singleDocHtml.includes(sampleReportCard.campus.name), 'Header displays campus name');
  assert(singleDocHtml.includes('Student Progress Report'), 'Document title badge is present');
  assert(singleDocHtml.includes('Academic Performance'), 'Academic performance table is present');
  assert(singleDocHtml.includes('Attendance Summary'), 'Attendance summary box is present');
  assert(singleDocHtml.includes('Class Teacher'), 'Class teacher signature is present');
  assert(singleDocHtml.includes('Principal'), 'Principal signature is present');
  assert(singleDocHtml.includes('Parent / Guardian'), 'Parent signature line is present');
  assert(singleDocHtml.includes('Grading Scale:'), 'Grading scale reference legend is present');

  console.log('✓ ReportCardDocument branded layout, sections, and print break classes verified');

  // 6. Test Batch View SSR
  const batchViewHtml = renderWithProviders(
    React.createElement(ReportCardBatchView, {
      initialCampusId: targetClass.campusId,
      initialClassId: targetClass.id,
      initialTerm: 'Term 1',
    })
  );

  assert(batchViewHtml.includes('Report Card Generation'), 'Batch view renders main title');
  assert(batchViewHtml.includes('Batch Print Class'), 'Batch view contains batch print button');
  assert(batchViewHtml.includes('Campus'), 'Batch view contains campus selector');
  assert(batchViewHtml.includes('Class'), 'Batch view contains class selector');
  assert(batchViewHtml.includes('Examination Term'), 'Batch view contains term selector');

  console.log('✓ ReportCardBatchView SSR and batch print controls verified');
  console.log('--- ALL TASK-051 TESTS PASSED SUCCESSFULLY ---');
}

runReportCardsTestSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
