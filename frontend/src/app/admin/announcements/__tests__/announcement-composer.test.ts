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
  updateAnnouncement,
  deleteAnnouncement,
  incrementAnnouncementViews,
  getAnnouncementStatus,
  listEnrichedAnnouncements,
} from '@/lib/repositories/announcements';
import { listCampuses } from '@/lib/repositories/campuses';
import { listClasses } from '@/lib/repositories/classes';
import { listWhatsAppLogs } from '@/lib/repositories/whatsappLog';
import { Scope } from '@/types';
import { ToastProvider } from '@/components/ui/Toast';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { AnnouncementComposerModal } from '@/components/communication/AnnouncementComposerModal';
import { AnnouncementsListView } from '@/components/communication/AnnouncementsListView';

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
  console.log('--- Running TASK-065 Announcement Composer & Targeting Tests ---');

  // 1. Initialize Seed Data
  await ensureSeeded();
  const scope: Scope = { schoolId: 'sch_main', campusId: 'cmp_main' };

  const campuses = await listCampuses(scope);
  assert(campuses.length >= 2, 'Should have campuses seeded');
  const targetCampus = campuses[0];

  const classes = await listClasses(scope);
  assert(classes.length >= 1, 'Should have classes seeded');
  const targetClass = classes[0];

  // 2. Test School-Wide Announcement Creation
  console.log('1. Testing School-Wide Announcement Creation...');
  const schoolAnc = await createAnnouncement({
    schoolId: 'sch_main',
    title: 'Network Spring Break Schedule',
    body: 'School will remain closed from March 20 to March 27 across all branches.',
    authorId: 'usr_admin',
    audience: 'school',
    publishAt: new Date().toISOString(),
  });

  assert(schoolAnc.id, 'Announcement should have an ID');
  assert.strictEqual(schoolAnc.audience, 'school');
  assert.strictEqual(schoolAnc.campusId, undefined, 'School-wide must not have campusId');
  assert.strictEqual(schoolAnc.classId, undefined, 'School-wide must not have classId');
  assert.strictEqual(schoolAnc.viewCount, 0, 'Initial viewCount must be 0');
  console.log('✓ School-wide announcement created with correct scope');

  // 3. Verify WhatsApp Mock Log Append for Immediate Announcement
  console.log('2. Verifying WhatsApp Mock Log Integration...');
  const waLogs = await listWhatsAppLogs(scope);
  const matchedWa = waLogs.find((w) => w.trigger === 'Announcement' && w.body.includes('Network Spring Break'));
  assert(matchedWa, 'Should have logged announcement broadcast to WhatsApp mock log');
  assert(matchedWa.body.includes('ABC School Network'), 'Should include network label in WhatsApp body');
  console.log('✓ WhatsApp mock log entry created per FEATURE_SPECIFICATIONS.md §13 & §16');

  // 4. Test Campus-Targeted Announcement Creation
  console.log('3. Testing Campus-Targeted Announcement...');
  const campusAnc = await createAnnouncement({
    schoolId: 'sch_main',
    campusId: targetCampus.id,
    title: `${targetCampus.name} Science Fair`,
    body: 'All parents are invited to attend the annual science exhibition this Friday.',
    authorId: 'usr_admin',
    audience: 'campus',
    publishAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days
  });

  assert.strictEqual(campusAnc.audience, 'campus');
  assert.strictEqual(campusAnc.campusId, targetCampus.id);
  assert.strictEqual(campusAnc.classId, undefined);
  assert(campusAnc.expiresAt, 'Should have expiry date');
  console.log('✓ Campus-targeted announcement created successfully');

  // 5. Test Class-Targeted Announcement Creation
  console.log('4. Testing Class-Targeted Announcement...');
  const classAnc = await createAnnouncement({
    schoolId: 'sch_main',
    campusId: targetClass.campusId,
    classId: targetClass.id,
    title: `${targetClass.grade} Field Trip Permission Slip`,
    body: 'Please submit signed permission slips by Wednesday for the museum visit.',
    authorId: 'usr_admin',
    audience: 'class',
    publishAt: new Date().toISOString(),
  });

  assert.strictEqual(classAnc.audience, 'class');
  assert.strictEqual(classAnc.campusId, targetClass.campusId);
  assert.strictEqual(classAnc.classId, targetClass.id);
  console.log('✓ Class-targeted announcement created successfully');

  // 6. Test Strict Validation Rules
  console.log('5. Testing Strict Validation Rules...');

  // 6a. Missing title throws
  let missingTitle = false;
  try {
    await createAnnouncement({
      schoolId: 'sch_main',
      title: '   ',
      body: 'Content',
      authorId: 'usr_admin',
      audience: 'school',
      publishAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    missingTitle = true;
    const msg = err instanceof Error ? err.message : '';
    assert(msg.includes('title is required'));
  }
  assert(missingTitle, 'Empty title must be rejected');

  // 6b. Missing body throws
  let missingBody = false;
  try {
    await createAnnouncement({
      schoolId: 'sch_main',
      title: 'Title',
      body: '   ',
      authorId: 'usr_admin',
      audience: 'school',
      publishAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    missingBody = true;
    const msg = err instanceof Error ? err.message : '';
    assert(msg.includes('body is required'));
  }
  assert(missingBody, 'Empty body must be rejected');

  // 6c. Campus audience without campusId throws
  let missingCampus = false;
  try {
    await createAnnouncement({
      schoolId: 'sch_main',
      title: 'Title',
      body: 'Content',
      authorId: 'usr_admin',
      audience: 'campus',
      publishAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    missingCampus = true;
    const msg = err instanceof Error ? err.message : '';
    assert(msg.includes('Campus selection is required'));
  }
  assert(missingCampus, 'Campus audience without campusId must be rejected');

  // 6d. Class audience without classId throws
  let missingClass = false;
  try {
    await createAnnouncement({
      schoolId: 'sch_main',
      campusId: targetCampus.id,
      title: 'Title',
      body: 'Content',
      authorId: 'usr_admin',
      audience: 'class',
      publishAt: new Date().toISOString(),
    });
  } catch (err: unknown) {
    missingClass = true;
    const msg = err instanceof Error ? err.message : '';
    assert(msg.includes('Class selection is required'));
  }
  assert(missingClass, 'Class audience without classId must be rejected');

  // 6e. Expiry date before publish date throws
  let invalidExpiry = false;
  try {
    await createAnnouncement({
      schoolId: 'sch_main',
      title: 'Title',
      body: 'Content',
      authorId: 'usr_admin',
      audience: 'school',
      publishAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    });
  } catch (err: unknown) {
    invalidExpiry = true;
    const msg = err instanceof Error ? err.message : '';
    assert(msg.includes('must be after'));
  }
  assert(invalidExpiry, 'Expiry before publish date must be rejected');
  console.log('✓ Validation rules strictly enforced');

  // 7. Test Announcement Status Computation
  console.log('6. Testing Status Calculations...');
  const now = new Date();
  const activeStatus = getAnnouncementStatus(schoolAnc, now);
  assert.strictEqual(activeStatus, 'active');

  const futureAnc = await createAnnouncement({
    schoolId: 'sch_main',
    title: 'Future Scheduled Test',
    body: 'Upcoming announcement',
    authorId: 'usr_admin',
    audience: 'school',
    publishAt: new Date(Date.now() + 86400000 * 5).toISOString(), // 5 days in future
  });
  const scheduledStatus = getAnnouncementStatus(futureAnc, now);
  assert.strictEqual(scheduledStatus, 'scheduled');

  const expiredAnc = await createAnnouncement({
    schoolId: 'sch_main',
    title: 'Expired Notice',
    body: 'Passed announcement',
    authorId: 'usr_admin',
    audience: 'school',
    publishAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    expiresAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  });
  const expiredStatus = getAnnouncementStatus(expiredAnc, now);
  assert.strictEqual(expiredStatus, 'expired');
  console.log('✓ Active, scheduled, and expired statuses evaluated accurately');

  // 8. Test Aggregate View Count Incrementing
  console.log('7. Testing Aggregate View Count Incrementing...');
  const viewed1 = await incrementAnnouncementViews(schoolAnc.id);
  assert.strictEqual(viewed1.viewCount, 1);
  const viewed2 = await incrementAnnouncementViews(schoolAnc.id);
  assert.strictEqual(viewed2.viewCount, 2);
  const fetched = await getAnnouncement(schoolAnc.id);
  assert.strictEqual(fetched?.viewCount, 2);
  console.log('✓ Aggregate view count incremented without per-user read logs');

  // 9. Test listEnrichedAnnouncements Queries
  console.log('8. Testing Enriched Query & Filtering...');
  const enrichedList = await listEnrichedAnnouncements(scope);
  assert(enrichedList.length >= 3, 'Should return enriched announcements');

  const enrichedCampus = enrichedList.find((e) => e.id === campusAnc.id);
  assert(enrichedCampus?.campusName, 'Campus name should be enriched');

  const enrichedClass = enrichedList.find((e) => e.id === classAnc.id);
  assert(enrichedClass?.className, 'Class name should be enriched');

  // Filter by audience
  const schoolOnly = await listEnrichedAnnouncements(scope, { audience: 'school' });
  assert(schoolOnly.every((a) => a.audience === 'school'));

  const campusOnly = await listEnrichedAnnouncements(scope, { audience: 'campus' });
  assert(campusOnly.every((a) => a.audience === 'campus'));
  console.log('✓ Enriched announcements query and audience filters verified');

  // 9b. Test updateAnnouncement and deleteAnnouncement
  console.log('9. Testing Update and Delete Announcement Operations...');
  const updatedAnc = await updateAnnouncement(schoolAnc.id, {
    title: 'Updated Spring Break Schedule',
  });
  assert.strictEqual(updatedAnc.title, 'Updated Spring Break Schedule');

  await deleteAnnouncement(expiredAnc.id);
  const deletedCheck = await getAnnouncement(expiredAnc.id);
  assert.strictEqual(deletedCheck, null, 'Deleted announcement must not be found');
  console.log('✓ updateAnnouncement and deleteAnnouncement verified');

  // 10. Component SSR Verification: AnnouncementComposerModal
  console.log('9. Testing SSR rendering for AnnouncementComposerModal...');
  const composerHtml = renderWithProviders(
    React.createElement(AnnouncementComposerModal, {
      isOpen: true,
      onClose: () => {},
      onSave: async () => {},
      campuses,
      classes,
    })
  );
  assert(composerHtml.includes('Compose Announcement'), 'Should render modal title');
  assert(composerHtml.includes('Target Audience'), 'Should render audience label');
  assert(composerHtml.includes('Entire School'), 'Should render Entire School option');
  assert(composerHtml.includes('Specific Campus'), 'Should render Specific Campus option');
  assert(composerHtml.includes('Specific Class'), 'Should render Specific Class option');
  console.log('✓ AnnouncementComposerModal SSR rendered cleanly');

  // 11. Component SSR Verification: AnnouncementsListView
  console.log('10. Testing SSR rendering for AnnouncementsListView...');
  const listViewHtml = renderWithProviders(
    React.createElement(AnnouncementsListView, {
      schoolId: 'sch_main',
      title: 'School Announcements',
    })
  );
  assert(listViewHtml.includes('School Announcements'), 'Should render title');
  assert(listViewHtml.includes('Compose Announcement'), 'Should render compose button');
  assert(listViewHtml.includes('Total Announcements'), 'Should render metric cards');
  console.log('✓ AnnouncementsListView SSR rendered cleanly');

  console.log('\n--- ALL TASK-065 ANNOUNCEMENT COMPOSER TESTS PASSED! ---');
}

runTests().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
