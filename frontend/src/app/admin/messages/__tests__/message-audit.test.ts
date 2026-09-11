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
    print: () => {},
  },
  writable: true,
});

import React from 'react';
import { renderToString } from 'react-dom/server';
import { ensureSeeded } from '@/lib/seed/boot';
import { getAuditMessageThreads, sendDirectMessage } from '@/lib/repositories/messages';
import { MessageAuditView } from '@/components/communication/MessageAuditView';

async function runTests() {
  console.log('--- Seeding Storage for Message Audit Tests ---');
  await ensureSeeded({ force: true });

  const schoolId = 'sch_main';
  const seedThreadId = 'th_sana_tariq';

  console.log('--- Test 1: Retrieves Network-wide Audit Threads & Stats ---');
  const initialAudit = await getAuditMessageThreads({ schoolId });
  assert.ok(initialAudit.threads.length >= 1, 'Expected at least 1 conversation thread');
  assert.ok(initialAudit.stats.totalThreads >= 1, 'Expected totalThreads >= 1');
  assert.ok(initialAudit.stats.totalMessages >= 2, 'Expected totalMessages >= 2');
  assert.ok(initialAudit.stats.participatingTeachers >= 1, 'Expected at least 1 teacher');
  assert.ok(initialAudit.stats.participatingParents >= 1, 'Expected at least 1 parent');

  const seedThread = initialAudit.threads.find((t) => t.threadId === seedThreadId);
  assert.ok(seedThread, 'Expected seed thread th_sana_tariq to be present');
  assert.strictEqual(seedThread?.teacherUser.name, 'Sana Malik');
  assert.strictEqual(seedThread?.parentUser.name, 'Tariq Khan');
  assert.ok(
    seedThread?.studentName === 'Ahmed Khan' || seedThread?.studentName === 'Ayesha Khan',
    'Expected student name to match parent child'
  );
  console.log('✓ Network-wide audit threads and safeguarding stats verified');

  console.log('--- Test 2: Campus Scoping for Principals ---');
  // Audit filtered by main campus
  const mainCampusId = 'cmp_main';
  const campusAudit = await getAuditMessageThreads({ schoolId }, { campusId: mainCampusId });
  assert.ok(campusAudit.threads.length >= 1, 'Expected threads for main campus');
  for (const t of campusAudit.threads) {
    assert.strictEqual(t.campusId, mainCampusId, 'All returned threads must match campusId');
  }

  // Audit for non-existent campus returns empty list
  const emptyCampusAudit = await getAuditMessageThreads(
    { schoolId },
    { campusId: 'cmp_non_existent' }
  );
  assert.strictEqual(emptyCampusAudit.threads.length, 0);
  assert.strictEqual(emptyCampusAudit.stats.totalThreads, 0);
  assert.strictEqual(emptyCampusAudit.stats.totalMessages, 0);
  console.log('✓ Campus scoping for principals verified');

  console.log('--- Test 3: Search Filtering by Participant & Message Body ---');
  // Search by teacher name
  const teacherSearch = await getAuditMessageThreads({ schoolId }, { search: 'Sana' });
  assert.ok(teacherSearch.threads.length >= 1);
  assert.ok(teacherSearch.threads.some((t) => t.teacherUser.name.includes('Sana')));

  // Search by parent name
  const parentSearch = await getAuditMessageThreads({ schoolId }, { search: 'Tariq' });
  assert.ok(parentSearch.threads.length >= 1);
  assert.ok(parentSearch.threads.some((t) => t.parentUser.name.includes('Tariq')));

  // Search by student name
  const studentSearch = await getAuditMessageThreads({ schoolId }, { search: 'Ahmed' });
  assert.ok(studentSearch.threads.length >= 1);
  assert.ok(studentSearch.threads.some((t) => t.studentName?.includes('Ahmed')));

  // Search by message content
  const contentSearch = await getAuditMessageThreads({ schoolId }, { search: 'geometry' });
  assert.ok(contentSearch.threads.length >= 1);

  // Search by non-existent term
  const noMatchSearch = await getAuditMessageThreads({ schoolId }, { search: 'xyz_random_term_99' });
  assert.strictEqual(noMatchSearch.threads.length, 0);
  console.log('✓ Search filtering across teacher, parent, student, and message body verified');

  console.log('--- Test 4: Chronological Transcript & Read Status Inspection ---');
  // Add another message to verify audit transcript order and read state
  await sendDirectMessage({
    schoolId,
    senderId: 'usr_teacher_sana',
    recipientId: 'usr_parent_khan',
    body: 'Audit verification test message.',
    threadId: seedThreadId,
  });

  const refreshedAudit = await getAuditMessageThreads({ schoolId });
  const targetThread = refreshedAudit.threads.find((t) => t.threadId === seedThreadId);
  assert.ok(targetThread, 'Target thread must exist');
  assert.ok(targetThread.messageCount >= 3, 'Message count must reflect new message');

  const messages = targetThread.messages;
  for (let i = 1; i < messages.length; i++) {
    assert.ok(
      messages[i].sentAt >= messages[i - 1].sentAt,
      'Messages in audit transcript must be in chronological order'
    );
  }

  // The last message was just sent and should be unread
  const lastMessage = messages[messages.length - 1];
  assert.strictEqual(lastMessage.body, 'Audit verification test message.');
  assert.strictEqual(lastMessage.readAt, undefined, 'Last message must be unread');

  // The earlier seeded messages have readAt timestamps
  assert.ok(messages[0].readAt, 'First message must have readAt timestamp');
  console.log('✓ Transcript order and read receipt verification verified');

  console.log('--- Test 5: SSR Rendering of MessageAuditView ---');
  const viewHtml = renderToString(
    React.createElement(MessageAuditView, {
      schoolId,
    })
  );

  assert.ok(
    viewHtml.includes('Student Safeguarding &amp; Compliance Audit Trail') ||
      viewHtml.includes('Student Safeguarding & Compliance Audit Trail'),
    'View must display student safeguarding notice'
  );
  assert.ok(
    viewHtml.includes('Read-Only Audit Mode'),
    'View must display read-only audit indicator'
  );
  assert.ok(
    viewHtml.includes('Print Audit Record'),
    'View must include print / export controls'
  );
  console.log('✓ SSR rendering of MessageAuditView verified');

  console.log('\n🎉 ALL TASK-068 MESSAGE AUDIT TESTS PASSED SUCCESSFULLY! ✅\n');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
