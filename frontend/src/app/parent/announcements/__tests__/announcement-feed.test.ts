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
  createAnnouncement,
  getAnnouncement,
  incrementAnnouncementViews,
  getAudienceAnnouncements,
} from '@/lib/repositories/announcements';
import { listCampuses } from '@/lib/repositories/campuses';
import { listClasses } from '@/lib/repositories/classes';
import { Scope } from '@/types';
import { ToastProvider } from '@/components/ui/Toast';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { AnnouncementFeedView } from '@/components/communication/AnnouncementFeedView';
import { AnnouncementDetailModal } from '@/components/communication/AnnouncementDetailModal';

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
  console.log('--- Running TASK-066 Parent & Student Announcement Feed Tests ---');

  // 1. Initialize Seed Data
  await ensureSeeded();
  const scope: Scope = { schoolId: 'sch_main' };

  const campuses = await listCampuses(scope);
  assert(campuses.length >= 2, 'Need at least 2 campuses for targeting tests');
  const campusA = campuses[0];
  const campusB = campuses[1];

  const classes = await listClasses(scope);
  assert(classes.length >= 2, 'Need at least 2 classes for targeting tests');
  const classA = classes[0];
  const classB = classes[1];

  // 2. Create Targeted Announcements
  console.log('1. Setting up targeted announcement scenarios...');

  // 2a. Active School-Wide Announcement
  const schoolAnc = await createAnnouncement({
    schoolId: 'sch_main',
    title: 'School-Wide Annual Holiday Notice',
    body: 'School will be closed next Monday for national holiday observance.',
    authorId: 'usr_admin',
    audience: 'school',
    publishAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  });

  // 2b. Active Campus A Announcement
  const campusAAnc = await createAnnouncement({
    schoolId: 'sch_main',
    campusId: campusA.id,
    title: `${campusA.name} Campus Assembly`,
    body: 'Special assembly on Thursday for Campus A students.',
    authorId: 'usr_admin',
    audience: 'campus',
    publishAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
  });

  // 2c. Active Campus B Announcement (Should NOT be visible to Campus A students)
  const campusBAnc = await createAnnouncement({
    schoolId: 'sch_main',
    campusId: campusB.id,
    title: `${campusB.name} Science Exhibition`,
    body: 'Science fair exclusive to Campus B cohort.',
    authorId: 'usr_admin',
    audience: 'campus',
    publishAt: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
  });

  // 2d. Active Class A Announcement
  const classAAnc = await createAnnouncement({
    schoolId: 'sch_main',
    campusId: classA.campusId,
    classId: classA.id,
    title: `${classA.grade} Class Project Brief`,
    body: 'Group project details for Class A students.',
    authorId: 'usr_admin',
    audience: 'class',
    publishAt: new Date(Date.now() - 1800000).toISOString(), // 30 mins ago
  });

  // 2e. Active Class B Announcement (Should NOT be visible to Class A students)
  const classBAnc = await createAnnouncement({
    schoolId: 'sch_main',
    campusId: classB.campusId,
    classId: classB.id,
    title: `${classB.grade} Class Math Competition`,
    body: 'Math Olympiad selection for Class B.',
    authorId: 'usr_admin',
    audience: 'class',
    publishAt: new Date(Date.now() - 1800000).toISOString(),
  });

  // 2f. Future Scheduled Announcement (Should NOT appear in any student/parent feed)
  const futureAnc = await createAnnouncement({
    schoolId: 'sch_main',
    title: 'Future Secret Exam Schedule',
    body: 'Unpublished draft exam notice.',
    authorId: 'usr_admin',
    audience: 'school',
    publishAt: new Date(Date.now() + 86400000 * 5).toISOString(), // 5 days in future
  });

  // 2g. Expired Announcement (Should NOT appear in feed)
  const expiredAnc = await createAnnouncement({
    schoolId: 'sch_main',
    title: 'Old Expired Sports Notice',
    body: 'Notice that expired yesterday.',
    authorId: 'usr_admin',
    audience: 'school',
    publishAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    expiresAt: new Date(Date.now() - 86400000 * 2).toISOString(), // expired 2 days ago
  });

  // 3. Verify Audience Scoping for Student/Parent in Campus A & Class A
  console.log('2. Verifying Audience Scoping for Campus A & Class A...');
  const studentContext = {
    campusId: campusA.id,
    classId: classA.id,
  };

  const feedForStudent = await getAudienceAnnouncements(scope, studentContext);
  const feedIds = new Set(feedForStudent.map((a) => a.id));

  // Inclusions
  assert(feedIds.has(schoolAnc.id), 'School-wide announcement MUST be in feed');
  assert(feedIds.has(campusAAnc.id), 'Campus A announcement MUST be in feed');
  assert(feedIds.has(classAAnc.id), 'Class A announcement MUST be in feed');

  // Exclusions (Targeting)
  assert(!feedIds.has(campusBAnc.id), 'Campus B announcement MUST NOT be in Campus A feed');
  assert(!feedIds.has(classBAnc.id), 'Class B announcement MUST NOT be in Class A feed');

  // Exclusions (Temporal)
  assert(!feedIds.has(futureAnc.id), 'Scheduled future announcement MUST NOT be visible');
  assert(!feedIds.has(expiredAnc.id), 'Expired announcement MUST NOT be visible');
  console.log('✓ Audience targeting and temporal filtering verified for parent/student feed');

  // 4. Verify Acceptance Criteria: "Aggregate view counts only"
  console.log('3. Verifying Acceptance Criteria — Aggregate View Counts Only...');
  const initialRecord = await getAnnouncement(schoolAnc.id);
  assert(initialRecord);
  const initialViews = initialRecord.viewCount;

  // View incrementing
  await incrementAnnouncementViews(schoolAnc.id);
  await incrementAnnouncementViews(schoolAnc.id);

  const updatedRecord = await getAnnouncement(schoolAnc.id);
  assert(updatedRecord);
  assert.strictEqual(updatedRecord.viewCount, initialViews + 2, 'viewCount should increment');

  // Strict invariant: Document contains only numeric aggregate viewCount, NO per-user tracking
  const rawRecord = updatedRecord as unknown as Record<string, unknown>;
  assert.strictEqual(typeof rawRecord.viewCount, 'number');
  assert.strictEqual(rawRecord.readBy, undefined, 'Must not have readBy array');
  assert.strictEqual(rawRecord.readUsers, undefined, 'Must not have readUsers array');
  assert.strictEqual(rawRecord.unreadParents, undefined, 'Must not track unread parents');
  console.log('✓ Invariant verified: Strictly aggregate view counts, no individual reader tracking');

  // 5. Verify Component SSR: AnnouncementFeedView
  console.log('4. Testing SSR rendering for AnnouncementFeedView...');
  const feedHtml = renderWithProviders(
    React.createElement(AnnouncementFeedView, {
      schoolId: 'sch_main',
      studentContext,
      title: 'Parent Notices',
    })
  );
  assert(feedHtml.includes('Parent Notices'), 'Should render feed title');
  assert(feedHtml.includes('All Notices'), 'Should render All filter pill');
  assert(feedHtml.includes('Campus'), 'Should render Campus filter pill');
  assert(feedHtml.includes('Class'), 'Should render Class filter pill');
  console.log('✓ AnnouncementFeedView SSR markup rendered cleanly');

  // 6. Verify Component SSR: AnnouncementDetailModal
  console.log('5. Testing SSR rendering for AnnouncementDetailModal...');
  const enrichedSchoolAnc = feedForStudent.find((a) => a.id === schoolAnc.id);
  assert(enrichedSchoolAnc);

  const modalHtml = renderWithProviders(
    React.createElement(AnnouncementDetailModal, {
      isOpen: true,
      onClose: () => {},
      announcement: enrichedSchoolAnc,
    })
  );
  assert(modalHtml.includes('School-Wide Annual Holiday Notice'), 'Should render notice title');
  assert(modalHtml.includes('School will be closed next Monday'), 'Should render body');
  assert(modalHtml.includes('views'), 'Should render aggregate view count pill');
  assert(modalHtml.includes('Close Notice'), 'Should render close button');
  console.log('✓ AnnouncementDetailModal SSR markup rendered cleanly with aggregate view pill');

  console.log('\n--- ALL TASK-066 PARENT & STUDENT ANNOUNCEMENT FEED TESTS PASSED! ---');
}

runTests().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
