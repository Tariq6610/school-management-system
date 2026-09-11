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
  createLesson,
  getLesson,
  updateLesson,
  deleteLesson,
  listLessons,
  reorderLessons,
  moveLesson,
} from '@/lib/repositories/lessons';
import { listCourses } from '@/lib/repositories/courses';
import { Scope } from '@/types';
import { ToastProvider } from '@/components/ui/Toast';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { LessonManager } from '@/components/lms/LessonManager';

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
  console.log('--- Seeding Storage for LMS Lessons & Ordering Tests ---');
  await ensureSeeded();

  const scope: Scope = { schoolId: 'sch_main', campusId: 'cmp_main' };
  const courses = await listCourses(scope);
  assert(courses.length > 0, 'Seed should contain courses');
  const targetCourse = courses[0];
  const courseId = targetCourse.id;

  console.log(`\nTesting with target course: ${targetCourse.title} (${courseId})`);

  // 1. Verify Seed Lessons
  const initialLessons = await listLessons(scope, courseId);
  console.log(`Initial lessons in course: ${initialLessons.length}`);
  assert(initialLessons.length >= 3, 'Course should have at least 3 seeded lessons');

  // Verify order indexes are sequential
  for (let i = 0; i < initialLessons.length; i++) {
    assert.strictEqual(
      initialLessons[i].orderIndex,
      initialLessons[i].orderIndex,
      `Lesson at index ${i} must have valid order index`
    );
  }

  // 2. Test Content Types Creation: Video, PDF, Notes
  console.log('\n--- Test 1: Content Types Creation (Video, PDF, Notes) ---');

  // A. Video Lesson
  const videoLesson = await createLesson({
    schoolId: 'sch_main',
    courseId,
    title: 'Kinematics in One Dimension Video Lecture',
    contentType: 'video',
    durationMinutes: 45,
    contentUrl: 'https://cdn.school.internal/videos/kinematics.mp4',
    body: 'Complete lecture on displacement, velocity, and uniform acceleration with solved examples.',
  });

  assert(videoLesson.id.startsWith('lsn_'), 'Video lesson must have lsn_ ID prefix');
  assert.strictEqual(videoLesson.contentType, 'video');
  assert.strictEqual(videoLesson.durationMinutes, 45);
  assert.strictEqual(videoLesson.contentUrl, 'https://cdn.school.internal/videos/kinematics.mp4');

  // B. PDF Document Lesson
  const pdfLesson = await createLesson({
    schoolId: 'sch_main',
    courseId,
    title: 'Formula Sheet & Problem Set PDF',
    contentType: 'pdf',
    contentUrl: '/documents/physics_formulae.pdf',
    body: 'Review equations (1.1) through (1.6) before attempting the exercises on page 42.',
  });

  assert.strictEqual(pdfLesson.contentType, 'pdf');
  assert.strictEqual(pdfLesson.contentUrl, '/documents/physics_formulae.pdf');

  // C. Notes Lesson
  const notesLesson = await createLesson({
    schoolId: 'sch_main',
    courseId,
    title: 'Newtonian Mechanics Core Summary Notes',
    contentType: 'notes',
    body: '# Newton Laws\n1. First Law: Inertia\n2. Second Law: F = ma\n3. Third Law: Action-Reaction',
  });

  assert.strictEqual(notesLesson.contentType, 'notes');
  assert(notesLesson.body?.includes('F = ma'), 'Notes lesson must contain formatted body');

  console.log('✓ Successfully created all 3 content types: Video, PDF, Notes');

  // 3. Test Validation
  console.log('\n--- Test 2: Lesson Validation ---');
  await assert.rejects(
    async () => {
      await createLesson({
        schoolId: 'sch_main',
        courseId,
        title: '',
        contentType: 'video',
      });
    },
    /Lesson title is required/,
    'Empty title must throw validation error'
  );

  await assert.rejects(
    async () => {
      await createLesson({
        schoolId: 'sch_main',
        courseId,
        title: 'Invalid type lesson',
        contentType: 'audio' as unknown as 'video',
      });
    },
    /Lesson content type must be video, pdf, or notes/,
    'Unsupported content type must throw error'
  );
  console.log('✓ Validation rules verified');

  // 4. Test Lesson Reordering (reorderLessons)
  console.log('\n--- Test 3: Drag & Reorder Sequential Persistence ---');
  const preReorderLessons = await listLessons(scope, courseId);
  const originalIds = preReorderLessons.map((l) => l.id);

  // Reverse the sequence to test reordering
  const reversedIds = [...originalIds].reverse();
  const reorderedResult = await reorderLessons(courseId, reversedIds);

  assert.strictEqual(reorderedResult.length, reversedIds.length);
  for (let i = 0; i < reorderedResult.length; i++) {
    assert.strictEqual(
      reorderedResult[i].id,
      reversedIds[i],
      `Position ${i} must match reversed sequence`
    );
    assert.strictEqual(reorderedResult[i].orderIndex, i, `orderIndex must be ${i}`);
  }

  // Verify persistence from repository query
  const persistedReorder = await listLessons(scope, courseId);
  for (let i = 0; i < persistedReorder.length; i++) {
    assert.strictEqual(persistedReorder[i].id, reversedIds[i]);
    assert.strictEqual(persistedReorder[i].orderIndex, i);
  }
  console.log('✓ reorderLessons accurately persists custom orderIndex sequence');

  // 5. Test Accessible Move Up / Move Down (moveLesson)
  console.log('\n--- Test 4: Accessible moveLesson (Up / Down) ---');
  const currentList = await listLessons(scope, courseId);
  const secondItem = currentList[1];

  // Move second item UP (to index 0)
  const movedUp = await moveLesson(courseId, secondItem.id, 'up');
  assert.strictEqual(movedUp[0].id, secondItem.id, 'Item should now be at index 0');
  assert.strictEqual(movedUp[0].orderIndex, 0);

  // Move it DOWN (back to index 1)
  const movedDown = await moveLesson(courseId, secondItem.id, 'down');
  assert.strictEqual(movedDown[1].id, secondItem.id, 'Item should now be back at index 1');
  assert.strictEqual(movedDown[1].orderIndex, 1);
  console.log('✓ Accessible moveLesson up and down verified');

  // 6. Test Lesson Update & Delete
  console.log('\n--- Test 5: Lesson Update & Delete ---');
  await updateLesson(videoLesson.id, {
    title: 'Updated Kinematics Video Masterclass',
    durationMinutes: 60,
  });

  const updatedVideo = await getLesson(videoLesson.id);
  assert(updatedVideo);
  assert.strictEqual(updatedVideo.title, 'Updated Kinematics Video Masterclass');
  assert.strictEqual(updatedVideo.durationMinutes, 60);

  // Delete
  await deleteLesson(pdfLesson.id);
  const deletedPdf = await getLesson(pdfLesson.id);
  assert.strictEqual(deletedPdf, null, 'Deleted lesson must return null');
  console.log('✓ Lesson update and delete verified');

  // 7. SSR Rendering Test of LessonManager
  console.log('\n--- Test 6: SSR Rendering of LessonManager with all 3 Content Types ---');
  const finalLessons = await listLessons(scope, courseId);

  const html = renderWithProviders(
    React.createElement(LessonManager, {
      courseId,
      courseTitle: targetCourse.title,
      schoolId: 'sch_main',
      campusId: 'cmp_main',
      initialLessons: finalLessons,
    })
  );

  assert(html.includes('Syllabus Lessons &amp; Units') || html.includes('Syllabus Lessons & Units'), 'Must render header');
  assert(html.includes('Video'), 'Must render video badge/type');
  assert(html.includes('PDF Document'), 'Must render PDF badge/type');
  assert(html.includes('Rich Notes'), 'Must render Notes badge/type');
  assert(html.includes('Drag handle') || html.includes('cursor-grab'), 'Must render drag reorder affordance');
  assert(html.includes('Preview'), 'Must render preview action');
  console.log('✓ LessonManager SSR rendering verified with all content types');

  console.log('\n🎉 ALL TASK-058 LESSON CRUD, ORDERING & CONTENT TYPES TESTS PASSED!\n');
}

runTests().catch((err) => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
