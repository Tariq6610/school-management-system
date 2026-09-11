import assert from 'node:assert/strict';

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
import { Scope } from '@/types';
import { createAssignment } from '@/lib/repositories/assignments';
import { createSubmission } from '@/lib/repositories/submissions';
import { markLessonComplete } from '@/lib/repositories/lessonCompletions';
import { getStudentDashboardData } from '@/lib/repositories/studentDashboard';
import { ToastProvider } from '@/components/ui/Toast';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { StudentDashboardView } from '@/components/lms/StudentDashboardView';

// Mock Next.js App Router Context
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { AppRouterContext } = require('next/dist/shared/lib/app-router-context.shared-runtime');
const mockRouter = {
  push: () => {},
  replace: () => {},
  prefetch: () => {},
  back: () => {},
  forward: () => {},
  refresh: () => {},
};

function renderWithProviders(ui: React.ReactElement): string {
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
  console.log('--- Starting Student Learning Dashboard Tests (TASK-061) ---');
  await ensureSeeded();

  const scope: Scope = { schoolId: 'sch_main', campusId: 'cmp_main' };
  const studentId = 'stu_ayesha';

  // 1. Test getStudentDashboardData data aggregation
  console.log('1. Testing getStudentDashboardData data aggregation...');
  const dashboardData = await getStudentDashboardData(studentId, scope);

  assert.ok(dashboardData.studentName.length > 0, 'Student name must be populated');
  assert.ok(dashboardData.className.length > 0, 'Class name must be populated');
  assert.ok(dashboardData.totalCourses > 0, 'Enrolled courses must be greater than 0');
  assert.ok(dashboardData.subjectGroups.length > 0, 'Subject task groups must be non-empty');
  assert.ok(dashboardData.coursesWithProgress.length > 0, 'Courses with progress must be present');
  console.log(`  ✓ Retrieved dashboard for "${dashboardData.studentName}" (${dashboardData.className}) with ${dashboardData.totalCourses} courses`);

  // 2. Test Acceptance Criteria: Tasks are Grouped by Subject
  console.log("2. Verifying Acceptance Criteria: Today's tasks are strictly grouped by subject...");
  for (const group of dashboardData.subjectGroups) {
    assert.ok(group.subjectId, 'Each group must have a valid subjectId');
    assert.ok(group.subjectName, 'Each group must have a subjectName');
    assert.ok(group.courseTitle, 'Each group must link to a courseTitle');
    assert.ok(Array.isArray(group.nextLessons), 'Group must provide nextLessons array');
    assert.ok(Array.isArray(group.pendingAssignments), 'Group must provide pendingAssignments array');
    assert.strictEqual(
      group.pendingTasksCount,
      group.nextLessons.length + group.pendingAssignments.length,
      'Pending tasks count must equal sum of next lessons and pending assignments'
    );
  }
  console.log(`  ✓ Verified ${dashboardData.subjectGroups.length} subject task groups`);

  // 3. Test dynamic task completion: marking a lesson complete reduces pending lessons in that subject
  console.log('3. Testing dynamic task reduction upon lesson completion...');
  const targetGroup = dashboardData.subjectGroups[0];
  assert.ok(targetGroup.nextLessons.length > 0, 'Target subject must have incomplete lessons');
  const lessonToComplete = targetGroup.nextLessons[0];
  const initialPendingLessons = targetGroup.nextLessons.length;

  await markLessonComplete(scope, studentId, targetGroup.courseId, lessonToComplete.id);

  const updatedDashboard = await getStudentDashboardData(studentId, scope);
  const updatedGroup = updatedDashboard.subjectGroups.find((g) => g.subjectId === targetGroup.subjectId);
  assert.ok(updatedGroup, 'Updated group must exist');
  assert.strictEqual(
    updatedGroup.nextLessons.length,
    initialPendingLessons - 1,
    'Completed lesson must be removed from next lessons to watch'
  );
  assert.strictEqual(
    updatedGroup.completedLessonsCount,
    targetGroup.completedLessonsCount + 1,
    'Completed lessons count must increment'
  );
  console.log('  ✓ Incomplete lessons dynamically updated on read');

  // 4. Test assignments in subject groups and submission resolution
  console.log('4. Testing assignments due and submission filtering...');
  const newAssignment = await createAssignment({
    schoolId: 'sch_main',
    courseId: targetGroup.courseId,
    title: 'Kinematics Lab Problem Set',
    instructions: 'Solve problems 1-10',
    deadline: new Date(Date.now() + 86400000 * 3).toISOString(),
    maxMarks: 100,
  });

  const dashboardWithAsn = await getStudentDashboardData(studentId, scope);
  const groupWithAsn = dashboardWithAsn.subjectGroups.find((g) => g.subjectId === targetGroup.subjectId);
  assert.ok(groupWithAsn, 'Group with assignment must exist');
  assert.ok(
    groupWithAsn.pendingAssignments.some((a) => a.id === newAssignment.id),
    'Pending assignment must be listed under the subject'
  );

  // Submit the assignment
  await createSubmission({
    assignmentId: newAssignment.id,
    studentId,
    body: 'My completed lab answers.',
    submittedAt: new Date().toISOString(),
  });

  const dashboardAfterSubmit = await getStudentDashboardData(studentId, scope);
  const groupAfterSubmit = dashboardAfterSubmit.subjectGroups.find((g) => g.subjectId === targetGroup.subjectId);
  assert.ok(groupAfterSubmit, 'Group after submission must exist');
  assert.ok(
    !groupAfterSubmit.pendingAssignments.some((a) => a.id === newAssignment.id),
    'Submitted assignment must no longer be listed as pending'
  );
  console.log('  ✓ Assignments due correctly filtered by submission state');

  // 5. Test Course Cards Progress Invariant (Completed-lessons fraction)
  console.log('5. Testing course cards progress as completed-lessons fraction...');
  for (const course of dashboardAfterSubmit.coursesWithProgress) {
    assert.ok(course.progress, 'Course must have progress');
    assert.ok(course.progress.fraction.includes('/'), 'Progress fraction must be X/Y format');
    assert.strictEqual(typeof course.progress.percentage, 'number');
  }
  console.log('  ✓ Course cards progress verified on read');

  // 6. Test SSR Rendering of StudentDashboardView
  console.log('6. Testing SSR rendering of StudentDashboardView...');
  const html = renderWithProviders(
    React.createElement(StudentDashboardView, {
      initialData: dashboardAfterSubmit,
      studentId,
    })
  );

  assert.ok(html.includes('data-testid="student-dashboard-view"'), 'Dashboard view container rendered');
  assert.ok(html.includes(dashboardAfterSubmit.studentName), 'Student name rendered in welcome banner');
  assert.ok(html.includes('data-testid="stat-pending-tasks"'), 'Pending tasks stat card rendered');
  assert.ok(html.includes('data-testid="stat-active-courses"'), 'Active courses stat card rendered');
  assert.ok(html.includes('data-testid="stat-overall-progress"'), 'Overall progress stat card rendered');
  assert.ok(html.includes('data-testid="subject-tasks-section"'), 'Subject tasks section rendered');
  assert.ok(html.includes('Grouped by Subject'), 'Grouped by Subject badge rendered');
  assert.ok(html.includes('data-testid="course-cards-section"'), 'Course cards section rendered');
  assert.ok(
    html.includes(`data-testid="subject-task-group-${targetGroup.subjectId}"`),
    'Subject task group rendered for target subject'
  );
  console.log('  ✓ StudentDashboardView SSR rendering verified with all widgets and grouped tasks');

  console.log('\n🎉 ALL TASK-061 STUDENT LEARNING DASHBOARD TESTS PASSED!\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
