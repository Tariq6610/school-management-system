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
import { getItem, STORAGE_KEYS } from '@/lib/storage';
import { listCourses, getEnrichedCourse } from '@/lib/repositories/courses';
import { listLessons, createLesson, deleteLesson } from '@/lib/repositories/lessons';
import {
  markLessonComplete,
  unmarkLessonComplete,
  toggleLessonCompletion,
  getLessonCompletions,
  isLessonCompleted,
  getCourseProgress,
  getStudentCoursesWithProgress,
} from '@/lib/repositories/lessonCompletions';
import { Scope, Course, EnrichedCourse } from '@/types';
import { ToastProvider } from '@/components/ui/Toast';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { StudentCourseView } from '@/components/lms/StudentCourseView';
import { StudentCoursesView } from '@/components/lms/StudentCoursesView';

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
  console.log('--- Starting Lesson Completion & Course Progress Tests (TASK-060) ---');
  await ensureSeeded();

  const scope: Scope = { schoolId: 'sch_main', campusId: 'cmp_main' };
  const courses = await listCourses(scope);
  assert.ok(courses.length > 0, 'Seeded courses must exist');

  const course = courses[0];
  const studentA = 'stu_ayesha';
  const studentB = 'stu_bilal';

  // 1. Verify "Never Stored" Invariant on Course entity
  console.log('1. Verifying "Computed on Read, Never Stored" invariant...');
  const storedCourses = getItem<Course[]>(STORAGE_KEYS.COURSES, []) ?? [];
  const storedTargetCourse = storedCourses.find((c) => c.id === course.id);
  assert.ok(storedTargetCourse, 'Stored course record must exist');
  assert.strictEqual(
    (storedTargetCourse as unknown as Record<string, unknown>).progress,
    undefined,
    'Acceptance Criteria: Course entity must NOT store progress field'
  );
  assert.strictEqual(
    (storedTargetCourse as unknown as Record<string, unknown>).completedLessons,
    undefined,
    'Acceptance Criteria: Course entity must NOT store completedLessons field'
  );
  assert.strictEqual(
    (storedTargetCourse as unknown as Record<string, unknown>).percentage,
    undefined,
    'Acceptance Criteria: Course entity must NOT store percentage field'
  );
  console.log('  ✓ Verified Course entity contains zero stored progress counters');

  // 2. Test dynamic course progress calculation on initial empty state
  console.log('2. Testing dynamic course progress computation on read...');
  const initialLessons = await listLessons(scope, course.id);
  assert.ok(initialLessons.length >= 5, 'Course must have lessons');
  const initialTotal = initialLessons.length;

  let progress = await getCourseProgress(scope, studentA, course.id);
  assert.strictEqual(progress.totalLessons, initialTotal, `Total lessons should equal ${initialTotal}`);
  assert.strictEqual(progress.completedLessons, 0, 'Initial completed lessons must be 0');
  assert.strictEqual(progress.percentage, 0, 'Initial percentage must be 0');
  assert.strictEqual(progress.fraction, `0/${initialTotal}`, `Initial fraction must be 0/${initialTotal}`);
  assert.strictEqual(progress.isCompleted, false, 'isCompleted must be false');
  console.log(`  ✓ Initial dynamic progress: ${progress.fraction} (${progress.percentage}%)`);

  // 3. Test explicit student action: markLessonComplete
  console.log('3. Testing explicit student action: markLessonComplete...');
  const lesson1 = initialLessons[0];
  const lesson2 = initialLessons[1];

  const completion1 = await markLessonComplete(scope, studentA, course.id, lesson1.id);
  assert.strictEqual(completion1.studentId, studentA);
  assert.strictEqual(completion1.lessonId, lesson1.id);

  let isDone1 = await isLessonCompleted(scope, studentA, lesson1.id);
  assert.strictEqual(isDone1, true, 'Lesson 1 must now be completed');

  progress = await getCourseProgress(scope, studentA, course.id);
  assert.strictEqual(progress.completedLessons, 1);
  assert.strictEqual(progress.fraction, `1/${initialTotal}`);
  assert.strictEqual(progress.percentage, Math.round((1 / initialTotal) * 100));
  assert.ok(progress.completedLessonIds.includes(lesson1.id));
  console.log(`  ✓ Dynamic progress after 1 completion: ${progress.fraction} (${progress.percentage}%)`);

  // Explicit unmarkLessonComplete verification
  await unmarkLessonComplete(scope, studentA, lesson1.id);
  assert.strictEqual(await isLessonCompleted(scope, studentA, lesson1.id), false, 'Lesson 1 must be unmarked');
  await markLessonComplete(scope, studentA, course.id, lesson1.id);

  // Mark lesson 2 complete as well
  await markLessonComplete(scope, studentA, course.id, lesson2.id);
  progress = await getCourseProgress(scope, studentA, course.id);
  assert.strictEqual(progress.completedLessons, 2);
  assert.strictEqual(progress.fraction, `2/${initialTotal}`);
  assert.strictEqual(progress.percentage, Math.round((2 / initialTotal) * 100));
  console.log(`  ✓ Dynamic progress after 2 completions: ${progress.fraction} (${progress.percentage}%)`);

  // 4. Test Student Isolation: Student B has 0 completions
  console.log('4. Testing student progress isolation...');
  const progressB = await getCourseProgress(scope, studentB, course.id);
  assert.strictEqual(progressB.completedLessons, 0, 'Student B completions must be independent');
  assert.strictEqual(progressB.percentage, 0, 'Student B progress must be 0%');
  console.log('  ✓ Verified isolation: Student A completions do not affect Student B');

  // 5. Test toggle completion
  console.log('5. Testing toggleLessonCompletion...');
  const toggleOff = await toggleLessonCompletion(scope, studentA, course.id, lesson1.id);
  assert.strictEqual(toggleOff.completed, false, 'Toggling existing completion must unmark it');

  isDone1 = await isLessonCompleted(scope, studentA, lesson1.id);
  assert.strictEqual(isDone1, false, 'Lesson 1 must now be incomplete');

  progress = await getCourseProgress(scope, studentA, course.id);
  assert.strictEqual(progress.completedLessons, 1, 'Only lesson 2 remains complete');
  assert.strictEqual(progress.fraction, `1/${initialTotal}`);

  const toggleOn = await toggleLessonCompletion(scope, studentA, course.id, lesson1.id);
  assert.strictEqual(toggleOn.completed, true, 'Toggling incomplete lesson must mark it');

  progress = await getCourseProgress(scope, studentA, course.id);
  assert.strictEqual(progress.completedLessons, 2, 'Both lessons complete again');
  console.log('  ✓ Toggle completion verified');

  // 6. Test dynamic adaptation without storage mutation
  console.log('6. Testing dynamic adaptation: adding a new lesson changes denominator on read...');
  const newLesson = await createLesson({
    schoolId: 'sch_main',
    courseId: course.id,
    title: 'Bonus Extra Credit Module',
    contentType: 'notes',
    body: 'Extra study notes',
  });

  const adaptedProgress = await getCourseProgress(scope, studentA, course.id);
  assert.strictEqual(
    adaptedProgress.totalLessons,
    initialTotal + 1,
    'Denominator must dynamically reflect added lesson'
  );
  assert.strictEqual(
    adaptedProgress.fraction,
    `2/${initialTotal + 1}`,
    'Progress fraction must dynamically update to 2/6'
  );
  console.log(`  ✓ Denominator dynamically changed to: ${adaptedProgress.fraction}`);

  // Test deleting lesson
  await deleteLesson(newLesson.id);
  const revertedProgress = await getCourseProgress(scope, studentA, course.id);
  assert.strictEqual(
    revertedProgress.totalLessons,
    initialTotal,
    'Denominator dynamically reverts upon lesson deletion'
  );
  console.log(`  ✓ Denominator dynamically reverted to: ${revertedProgress.fraction}`);

  // 7. Test getStudentCoursesWithProgress
  console.log('7. Testing getStudentCoursesWithProgress...');
  const studentCoursesWithProg = await getStudentCoursesWithProgress(studentA, scope);
  assert.ok(studentCoursesWithProg.length > 0, 'Student courses list must be non-empty');
  const targetCourseProg = studentCoursesWithProg.find((c) => c.id === course.id);
  assert.ok(targetCourseProg, 'Target course must be present');
  assert.ok(targetCourseProg.progress, 'Each course must have computed progress');
  assert.strictEqual(targetCourseProg.progress.completedLessons, 2);
  console.log('  ✓ getStudentCoursesWithProgress verified');

  // 8. Test StudentCourseView UI Rendering
  console.log('8. Testing StudentCourseView UI rendering with progress...');
  const enriched = await getEnrichedCourse(course.id);
  const completionsA = await getLessonCompletions(scope, studentA, course.id);

  const courseViewHtml = renderWithProviders(
    React.createElement(StudentCourseView, {
      course: enriched as EnrichedCourse,
      initialLessons,
      initialLessonId: lesson1.id,
      studentId: studentA,
      initialCompletions: completionsA,
    })
  );

  assert.ok(
    courseViewHtml.includes('data-testid="course-progress-fraction"'),
    'Course view must render progress fraction'
  );
  assert.ok(
    courseViewHtml.includes('data-testid="course-progress-bar"'),
    'Course view must render progress bar'
  );
  assert.ok(
    courseViewHtml.includes('data-testid="mark-complete-button"'),
    'Course view must render Mark Complete button'
  );
  assert.ok(
    courseViewHtml.includes('Completed'),
    'Completed badge or button label must be rendered'
  );
  assert.ok(
    courseViewHtml.includes(`data-testid="lesson-completed-check-${lesson1.id}"`),
    'Syllabus sidebar must render checkmark for completed lesson 1'
  );
  assert.ok(
    courseViewHtml.includes(`data-testid="lesson-completed-check-${lesson2.id}"`),
    'Syllabus sidebar must render checkmark for completed lesson 2'
  );
  console.log('  ✓ StudentCourseView UI renders progress bar, fraction, and checkmarks');

  // 9. Test StudentCoursesView UI Rendering
  console.log('9. Testing StudentCoursesView UI rendering with course progress cards...');
  const coursesViewHtml = renderWithProviders(
    React.createElement(StudentCoursesView, {
      initialCourses: studentCoursesWithProg,
      studentId: studentA,
    })
  );

  assert.ok(
    coursesViewHtml.includes(`data-testid="course-progress-${course.id}"`),
    'Student courses grid must render course progress'
  );
  assert.ok(
    coursesViewHtml.includes(`${progress.completedLessons}/${progress.totalLessons} completed`),
    'Student courses grid must render completed-lessons fraction'
  );
  console.log('  ✓ StudentCoursesView UI renders progress bar and fraction on course cards');

  console.log('\n🎉 ALL TASK-060 LESSON COMPLETION & COURSE PROGRESS TESTS PASSED!\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
