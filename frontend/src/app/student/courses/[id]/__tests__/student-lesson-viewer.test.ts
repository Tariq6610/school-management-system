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
import { listLessons, createLesson } from '@/lib/repositories/lessons';
import { listCourses, getEnrichedCourse } from '@/lib/repositories/courses';
import { Scope, EnrichedCourse } from '@/types';
import { ToastProvider } from '@/components/ui/Toast';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { StudentCourseView } from '@/components/lms/StudentCourseView';

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
  console.log('--- Starting Student Course & Lesson Viewer Tests (TASK-059) ---');
  await ensureSeeded();

  const scope: Scope = { schoolId: 'sch_main', campusId: 'cmp_main' };
  const courses = await listCourses(scope);
  assert.ok(courses.length > 0, 'Seed must have courses');

  const course = courses[0];
  const enriched = await getEnrichedCourse(course.id);
  assert.ok(enriched, 'Must retrieve enriched course');

  // 1. Ensure course has all 3 content types for thorough viewer verification
  console.log('1. Setting up lessons for video, PDF, and notes viewer tests...');
  const videoLesson = await createLesson({
    schoolId: 'sch_main',
    courseId: course.id,
    title: 'Kinematics Video Lecture',
    contentType: 'video',
    durationMinutes: 42,
    contentUrl: 'https://cdn.school.internal/video.mp4',
    body: 'Complete lecture on displacement, velocity, and uniform acceleration.',
  });

  const pdfLesson = await createLesson({
    schoolId: 'sch_main',
    courseId: course.id,
    title: 'Formula Sheet PDF Document',
    contentType: 'pdf',
    contentUrl: '/documents/formula_sheet.pdf',
    body: 'Read reference formulas before attempting exercises.',
  });

  const notesLesson = await createLesson({
    schoolId: 'sch_main',
    courseId: course.id,
    title: 'Detailed Analytical Notes',
    contentType: 'notes',
    body: '## Key Summary\n- Newton First Law: Inertia\n- Newton Second Law: F=ma\n- Newton Third Law: Action=Reaction',
  });

  const allLessons = await listLessons(scope, course.id);
  console.log(`  ✓ Loaded ${allLessons.length} lessons in course`);

  // 2. Test Acceptance Criteria: Video Player Placeholder
  console.log('2. Testing Video Player Placeholder rendering...');
  const videoHtml = renderWithProviders(
    React.createElement(StudentCourseView, {
      course: enriched as EnrichedCourse,
      initialLessons: allLessons,
      initialLessonId: videoLesson.id,
    })
  );

  assert.ok(
    videoHtml.includes('data-testid="video-player-placeholder"'),
    'Acceptance Criteria: Video player placeholder container must be rendered'
  );
  assert.ok(
    videoHtml.includes('Kinematics Video Lecture'),
    'Active video lesson title must be rendered'
  );
  assert.ok(
    videoHtml.includes('42 mins'),
    'Active video lesson duration must be rendered'
  );
  console.log('  ✓ Video player placeholder verified per specification');

  // 3. Test Acceptance Criteria: PDF Document Placeholder
  console.log('3. Testing PDF Document Placeholder rendering...');
  const pdfHtml = renderWithProviders(
    React.createElement(StudentCourseView, {
      course: enriched as EnrichedCourse,
      initialLessons: allLessons,
      initialLessonId: pdfLesson.id,
    })
  );

  assert.ok(
    pdfHtml.includes('data-testid="pdf-document-placeholder"'),
    'Acceptance Criteria: PDF document placeholder container must be rendered'
  );
  assert.ok(
    pdfHtml.includes('formula_sheet.pdf'),
    'PDF document placeholder must display filename/URL'
  );
  assert.ok(
    pdfHtml.includes('Open / Download PDF'),
    'PDF document placeholder must offer simulated download/open action'
  );
  assert.ok(
    pdfHtml.includes('No real files are stored'),
    'PDF document placeholder must mention prototype constraint'
  );
  console.log('  ✓ PDF document placeholder verified per specification');

  // 4. Test Notes Rich Text Reader
  console.log('4. Testing Notes Rich Text Reader rendering...');
  const notesHtml = renderWithProviders(
    React.createElement(StudentCourseView, {
      course: enriched as EnrichedCourse,
      initialLessons: allLessons,
      initialLessonId: notesLesson.id,
    })
  );

  assert.ok(
    notesHtml.includes('data-testid="rich-notes-viewer"'),
    'Rich notes viewer container must be rendered'
  );
  assert.ok(
    notesHtml.includes('Newton First Law: Inertia'),
    'Notes body text must be rendered in rich text viewer'
  );
  assert.ok(
    notesHtml.includes('Detailed Analytical Notes'),
    'Notes lesson title must be rendered'
  );
  console.log('  ✓ Rich notes viewer verified');

  // 5. Test Sequential Course Syllabus / Playlist Sidebar
  console.log('5. Testing Syllabus playlist sidebar...');
  assert.ok(
    notesHtml.includes('Course Syllabus'),
    'Playlist sidebar header must be rendered'
  );
  assert.ok(
    notesHtml.includes('Kinematics Video Lecture'),
    'Video lesson must appear in syllabus list'
  );
  assert.ok(
    notesHtml.includes('Formula Sheet PDF Document'),
    'PDF lesson must appear in syllabus list'
  );
  assert.ok(
    notesHtml.includes('Detailed Analytical Notes'),
    'Notes lesson must appear in syllabus list'
  );
  console.log('  ✓ Syllabus playlist sidebar verified with all ordered units');

  // 6. Test Navigation Buttons
  console.log('6. Testing Next / Previous navigation affordances...');
  assert.ok(
    videoHtml.includes('Prev'),
    'Previous unit button must be rendered'
  );
  assert.ok(
    videoHtml.includes('Next Unit'),
    'Next unit button must be rendered'
  );
  console.log('  ✓ Navigation buttons verified');

  console.log('\n🎉 ALL TASK-059 STUDENT COURSE & LESSON VIEWER TESTS PASSED!\n');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
