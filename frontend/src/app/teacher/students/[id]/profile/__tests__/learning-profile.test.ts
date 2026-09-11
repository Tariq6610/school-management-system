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
import { ensureSeeded } from '../../../../../../lib/seed/boot';
import { setSession } from '../../../../../../lib/repositories/session';
import {
  getStudentLearningProfile,
  confirmLearningProfileProposal,
  dismissLearningProfileProposal,
  createLearningProfileNote,
} from '../../../../../../lib/repositories/learningProfiles';
import { LearningProfileView } from '../../../../../../components/teacher/LearningProfileView';
import { ToastProvider } from '../../../../../../components/ui/Toast';
import { SessionProvider } from '../../../../../../components/providers/SessionProvider';

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
  console.log('--- Running TASK-076 Student Learning Profile Tests ---');

  // 1. Seed base data & establish teacher session
  await ensureSeeded();
  const schoolId = 'sch_main';
  const campusId = 'cmp_main';
  const scope = { schoolId, campusId };

  await setSession({
    userId: 'usr_teacher_ahmed',
    role: 'teacher',
    schoolId,
    campusId,
  });

  const testStudentId = 'stu_ayesha';

  // 2. Test getStudentLearningProfile for Teacher View
  console.log('--- 1. Testing getStudentLearningProfile data aggregation ---');
  const teacherProfile = await getStudentLearningProfile(testStudentId, scope, 'teacher');
  assert(teacherProfile !== null, 'Teacher learning profile must not be null');
  assert.strictEqual(teacherProfile.student.id, testStudentId);
  assert.strictEqual(teacherProfile.user.name, 'Ayesha Khan');

  // Verify Subject performance trends
  assert(Array.isArray(teacherProfile.subjectTrends), 'subjectTrends must be an array');
  assert(teacherProfile.subjectTrends.length > 0, 'Must have at least one subject trend');
  const subj1 = teacherProfile.subjectTrends[0];
  assert(typeof subj1.subjectName === 'string', 'Subject must have a name');
  assert(typeof subj1.currentPercentage === 'number', 'Must have current percentage');
  assert(Array.isArray(subj1.assessments), 'Must have assessment history points');
  console.log(`✓ Subject trends aggregated: ${teacherProfile.subjectTrends.length} subjects found`);

  // Verify Attendance trend
  assert(teacherProfile.attendanceTrend !== undefined, 'attendanceTrend must exist');
  assert(typeof teacherProfile.attendanceTrend.overallPercentage === 'number');
  assert(Array.isArray(teacherProfile.attendanceTrend.monthlyTrends), 'monthlyTrends must be an array');
  assert(teacherProfile.attendanceTrend.totalDays > 0, 'Total attendance days must be > 0');
  console.log(`✓ Attendance trend aggregated: ${teacherProfile.attendanceTrend.overallPercentage}% over ${teacherProfile.attendanceTrend.totalDays} days`);

  // Verify Assignment history summary
  assert(teacherProfile.assignmentSummary !== undefined, 'assignmentSummary must exist');
  assert(typeof teacherProfile.assignmentSummary.totalAssigned === 'number');
  assert(typeof teacherProfile.assignmentSummary.onTimeCount === 'number');
  console.log(`✓ Assignment history aggregated: ${teacherProfile.assignmentSummary.submittedCount}/${teacherProfile.assignmentSummary.totalAssigned} submitted`);

  // 3. Acceptance Criteria: Proposals pending until a teacher confirms; no auto-publish
  console.log('--- 2. Verifying Acceptance Criteria: No Auto-Publish ---');
  assert(teacherProfile.proposals.length > 0, 'Must have synthesized candidate proposals');

  // Check that candidate proposals start in 'pending' status
  const pendingProposals = teacherProfile.proposals.filter((p) => p.status === 'pending');
  assert(pendingProposals.length > 0, 'Must have proposals sitting in pending status awaiting teacher validation');
  console.log(`✓ ${pendingProposals.length} candidate proposal(s) currently sitting in pending status`);

  // Query as parent: Must be EMPTY (0 confirmed notes)
  const initialParentProfile = await getStudentLearningProfile(testStudentId, scope, 'parent');
  assert(initialParentProfile !== null);
  assert.strictEqual(
    initialParentProfile.proposals.length,
    0,
    'Parent profile MUST NOT display any pending proposals (no auto-publish)'
  );
  console.log('✓ Acceptance verified: Parent profile displays 0 unpublished notes when proposals are pending');

  // 4. Test Teacher Confirmation Workflow
  console.log('--- 3. Testing Teacher Confirmation Workflow ---');
  const targetProposal = pendingProposals[0];
  const teacherId = 'usr_teacher_ahmed';
  const teacherName = 'Ahmed Hassan';

  const confirmed = await confirmLearningProfileProposal(
    targetProposal.id,
    scope,
    teacherId,
    teacherName
  );
  assert(confirmed !== null, 'Confirmed proposal must be returned');
  assert.strictEqual(confirmed.status, 'confirmed', 'Proposal status must be confirmed');
  assert.strictEqual(confirmed.confirmedByTeacherId, teacherId, 'Confirmed teacher ID must match');
  assert.strictEqual(confirmed.teacherName, teacherName, 'Confirmed teacher name must match');
  assert(confirmed.confirmedAt !== undefined, 'Confirmation timestamp must be recorded');
  console.log(`✓ Proposal "${confirmed.title}" confirmed by teacher ${teacherName}`);

  // Query as parent: Must NOW display exactly 1 confirmed note with teacher attribution
  const parentProfileAfterConfirm = await getStudentLearningProfile(testStudentId, scope, 'parent');
  assert(parentProfileAfterConfirm !== null);
  assert.strictEqual(
    parentProfileAfterConfirm.proposals.length,
    1,
    'Parent profile must now display the single confirmed note'
  );
  assert.strictEqual(parentProfileAfterConfirm.proposals[0].id, targetProposal.id);
  assert.strictEqual(parentProfileAfterConfirm.proposals[0].teacherName, teacherName);
  console.log(`✓ Confirmed note successfully published to parent view with teacher attribution: ${teacherName}`);

  // 5. Test Teacher Edit & Confirm Workflow
  console.log('--- 4. Testing Teacher Edit & Confirm Workflow ---');
  const remainingPending = teacherProfile.proposals.filter(
    (p) => p.status === 'pending' && p.id !== targetProposal.id
  );
  if (remainingPending.length > 0) {
    const editTarget = remainingPending[0];
    const customizedText = 'Teacher Refined Note: Consistently demonstrates critical thinking in coursework.';
    const editedProposal = await confirmLearningProfileProposal(
      editTarget.id,
      scope,
      teacherId,
      teacherName,
      customizedText
    );
    assert(editedProposal !== null);
    assert.strictEqual(editedProposal.status, 'confirmed');
    assert.strictEqual(editedProposal.editedText, customizedText);

    const parentProfileAfterEdit = await getStudentLearningProfile(testStudentId, scope, 'parent');
    assert(parentProfileAfterEdit !== null);
    const editedInParent = parentProfileAfterEdit.proposals.find((p) => p.id === editTarget.id);
    assert(editedInParent !== undefined);
    assert.strictEqual(editedInParent.editedText, customizedText);
    console.log('✓ Teacher edited candidate text before confirming; edited text published to parents');
  }

  // 6. Test Teacher Dismiss Workflow
  console.log('--- 5. Testing Teacher Dismiss Workflow ---');
  const dismissCandidate = teacherProfile.proposals.find(
    (p) => p.status === 'pending' && p.id !== targetProposal.id
  );
  if (dismissCandidate) {
    const dismissed = await dismissLearningProfileProposal(dismissCandidate.id, scope);
    assert.strictEqual(dismissed, true, 'Dismiss proposal must succeed');

    const teacherProfileAfterDismiss = await getStudentLearningProfile(testStudentId, scope, 'teacher');
    assert(teacherProfileAfterDismiss !== null);
    const dismissedInTeacher = teacherProfileAfterDismiss.proposals.find((p) => p.id === dismissCandidate.id);
    assert.strictEqual(dismissedInTeacher, undefined, 'Dismissed proposal must not be visible in teacher active list');

    const parentProfileAfterDismiss = await getStudentLearningProfile(testStudentId, scope, 'parent');
    assert(parentProfileAfterDismiss !== null);
    const dismissedInParent = parentProfileAfterDismiss.proposals.find((p) => p.id === dismissCandidate.id);
    assert.strictEqual(dismissedInParent, undefined, 'Dismissed proposal must never appear on parent view');
    console.log('✓ Dismissed candidate proposal successfully filtered out from all views');
  }

  // 7. Test Authoring Custom Validated Note Directly
  console.log('--- 6. Testing Authoring Custom Validated Note Directly ---');
  const customNote = await createLearningProfileNote(scope, {
    studentId: testStudentId,
    teacherId,
    teacherName,
    category: 'strength',
    title: 'Outstanding Science Project',
    text: 'Designed an exemplary renewable energy model for the annual science fair.',
  });
  assert(customNote !== null);
  assert.strictEqual(customNote.status, 'confirmed');
  assert.strictEqual(customNote.teacherName, teacherName);
  console.log('✓ Teacher created and published custom validated note directly');

  // 8. Test SSR Rendering of LearningProfileView
  console.log('--- 7. Testing SSR Rendering of LearningProfileView ---');
  const updatedTeacherProfile = await getStudentLearningProfile(testStudentId, scope, 'teacher');
  assert(updatedTeacherProfile !== null);

  const html = renderWithProviders(
    React.createElement(LearningProfileView, {
      initialData: updatedTeacherProfile,
      userRole: 'teacher',
    })
  );

  // Assert Header and Student identity
  assert(html.includes('Ayesha Khan'), 'Must render student name');
  assert(html.includes('Differentiation Screen 2'), 'Must render differentiation screen badge');
  assert(html.includes('Subject Performance Over Time'), 'Must render subject performance section');
  assert(html.includes('Attendance Trend for the Year'), 'Must render attendance trend section');
  assert(html.includes('Assignment Submission History'), 'Must render assignment history section');
  assert(html.includes('Strengths &amp; Areas for Improvement') || html.includes('Strengths & Areas for Improvement'), 'Must render strengths & improvements section');

  // Assert Teacher Validation Controls
  assert(html.includes('Teacher Validation'), 'Must render Teacher Validation mode button');
  assert(html.includes('Parent View (Published Only)'), 'Must render Parent View simulation button');
  assert(html.includes('Validated by Ahmed Hassan'), 'Must display confirmed teacher attribution');

  console.log('✓ SSR Rendering of LearningProfileView verified');

  console.log('--- ALL TASK-076 TESTS PASSED SUCCESSFULLY ---');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
