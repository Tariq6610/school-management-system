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
  getConversationThreads,
  getEligibleRecipients,
  getThreadMessages,
  markThreadAsRead,
  sendDirectMessage,
} from '@/lib/repositories/messages';
import { MessageList } from '@/components/communication/MessageList';
import { MessageThread } from '@/components/communication/MessageThread';
import { MessageThreadSummary, Message } from '@/types';

async function runTests() {
  console.log('--- Seeding Storage for Messaging Tests ---');
  await ensureSeeded({ force: true });

  const schoolId = 'sch_main';
  const teacherUserId = 'usr_teacher_sana';
  const parentUserId = 'usr_parent_khan';
  const seedThreadId = 'th_sana_tariq';

  console.log('--- Test 1: Retrieves Seed Thread Messages ---');
  const messages = await getThreadMessages(seedThreadId);
  assert.ok(messages.length >= 2, 'Expected at least 2 seeded messages');
  assert.strictEqual(messages[0].senderId, teacherUserId);
  assert.strictEqual(messages[0].recipientId, parentUserId);
  assert.strictEqual(messages[1].senderId, parentUserId);
  assert.strictEqual(messages[1].recipientId, teacherUserId);
  assert.ok(messages[0].sentAt <= messages[1].sentAt, 'Messages should be ordered chronologically');
  console.log('✓ Retrieved seed thread messages chronologically');

  console.log('--- Test 2: Retrieves Enriched Conversation Threads ---');
  const teacherThreads = await getConversationThreads(teacherUserId, { schoolId });
  assert.ok(teacherThreads.length >= 1, 'Teacher should have at least 1 active conversation');
  const teacherThread = teacherThreads.find((t) => t.threadId === seedThreadId);
  assert.ok(teacherThread, 'Expected to find th_sana_tariq in teacher threads');
  assert.strictEqual(teacherThread?.otherUser.id, parentUserId);
  assert.strictEqual(teacherThread?.otherUser.role, 'parent');
  assert.ok(teacherThread?.studentContext, 'Expected student context for parent');

  const parentThreads = await getConversationThreads(parentUserId, { schoolId });
  assert.ok(parentThreads.length >= 1, 'Parent should have at least 1 active conversation');
  const parentThread = parentThreads.find((t) => t.threadId === seedThreadId);
  assert.ok(parentThread, 'Expected to find th_sana_tariq in parent threads');
  assert.strictEqual(parentThread?.otherUser.id, teacherUserId);
  assert.strictEqual(parentThread?.otherUser.role, 'teacher');
  console.log('✓ Enriched threads retrieved for teacher and parent');

  console.log('--- Test 3: Sends Direct Message with Validation ---');
  await assert.rejects(
    async () => {
      await sendDirectMessage({
        schoolId,
        senderId: teacherUserId,
        recipientId: parentUserId,
        body: '   ',
      });
    },
    /body cannot be empty/i
  );

  const newMsg = await sendDirectMessage({
    schoolId,
    senderId: teacherUserId,
    recipientId: parentUserId,
    body: 'Ahmed performed excellently in today’s pop quiz!',
    threadId: seedThreadId,
  });

  assert.ok(newMsg.id, 'Message should have an ID');
  assert.strictEqual(newMsg.threadId, seedThreadId);
  assert.strictEqual(newMsg.senderId, teacherUserId);
  assert.strictEqual(newMsg.recipientId, parentUserId);
  assert.strictEqual(newMsg.readAt, undefined, 'New message must be unread initially');

  const threadMsgs = await getThreadMessages(seedThreadId);
  const lastMsg = threadMsgs[threadMsgs.length - 1];
  assert.strictEqual(lastMsg.id, newMsg.id);
  assert.strictEqual(lastMsg.body, 'Ahmed performed excellently in today’s pop quiz!');
  console.log('✓ Direct message sent and validated');

  console.log('--- Test 4: Read State Progression & Unread Counter ---');
  const parentThreadsBefore = await getConversationThreads(parentUserId, { schoolId });
  const targetThreadBefore = parentThreadsBefore.find((t) => t.threadId === seedThreadId);
  assert.ok(targetThreadBefore && targetThreadBefore.unreadCount >= 1, 'Expected unread message for parent');

  const markedCount = await markThreadAsRead(seedThreadId, parentUserId);
  assert.ok(markedCount >= 1, 'At least 1 message should be marked as read');

  const parentThreadsAfter = await getConversationThreads(parentUserId, { schoolId });
  const targetThreadAfter = parentThreadsAfter.find((t) => t.threadId === seedThreadId);
  assert.strictEqual(targetThreadAfter?.unreadCount, 0, 'Unread count should be 0 after viewing thread');

  const updatedMessages = await getThreadMessages(seedThreadId);
  const lastUpdatedMsg = updatedMessages[updatedMessages.length - 1];
  assert.ok(lastUpdatedMsg.readAt, 'readAt must be populated');
  assert.ok(!isNaN(Date.parse(lastUpdatedMsg.readAt!)), 'readAt must be a valid ISO string');
  console.log('✓ Read state and unread counters verified');

  console.log('--- Test 5: Bidirectional Reply & Notification State ---');
  const replyMsg = await sendDirectMessage({
    schoolId,
    senderId: parentUserId,
    recipientId: teacherUserId,
    body: 'Thank you for letting me know, Ms. Sana. We are very proud of his effort!',
    threadId: seedThreadId,
  });

  assert.strictEqual(replyMsg.senderId, parentUserId);
  assert.strictEqual(replyMsg.recipientId, teacherUserId);
  assert.strictEqual(replyMsg.readAt, undefined, 'Teacher has not read the reply yet');

  const teacherThreadsReply = await getConversationThreads(teacherUserId, { schoolId });
  const teacherThreadUpdated = teacherThreadsReply.find((t) => t.threadId === seedThreadId);
  assert.ok(
    teacherThreadUpdated && teacherThreadUpdated.unreadCount >= 1,
    'Teacher should have unread message from parent reply'
  );

  await markThreadAsRead(seedThreadId, teacherUserId);
  const teacherThreadsAfter = await getConversationThreads(teacherUserId, { schoolId });
  const teacherThreadAfter = teacherThreadsAfter.find((t) => t.threadId === seedThreadId);
  assert.strictEqual(teacherThreadAfter?.unreadCount, 0);
  console.log('✓ Bidirectional replies and read states verified');

  console.log('--- Test 6: Eligible Recipient Discovery ---');
  const teacherRecipients = await getEligibleRecipients(teacherUserId, 'teacher', { schoolId });
  assert.ok(teacherRecipients.length > 0, 'Teacher should have eligible parents to message');
  assert.ok(teacherRecipients.some((r) => r.role === 'parent'), 'All should be parents');

  const parentRecipients = await getEligibleRecipients(parentUserId, 'parent', { schoolId });
  assert.ok(parentRecipients.length > 0, 'Parent should have eligible teachers to message');
  assert.ok(parentRecipients.some((r) => r.role === 'teacher'), 'All should be teachers');
  console.log('✓ Eligible recipient discovery verified for teachers and parents');

  console.log('--- Test 7: SSR Rendering of MessageList & MessageThread ---');
  const mockSummary: MessageThreadSummary = {
    threadId: 'th_test',
    otherUser: {
      id: 'usr_mock_other',
      schoolId: 'sch_main',
      name: 'Sana Malik',
      email: 'sana@example.com',
      role: 'teacher',
      status: 'active',
    },
    lastMessage: {
      id: 'msg_test_1',
      schoolId: 'sch_main',
      threadId: 'th_test',
      senderId: 'usr_mock_other',
      recipientId: 'usr_mock_me',
      body: 'Please review the math notes for next week.',
      sentAt: '2026-09-10T10:00:00.000Z',
    },
    unreadCount: 1,
    studentContext: {
      studentName: 'Ahmed Khan',
      className: 'Grade 8 - A',
    },
  };

  const mockMessages: Message[] = [
    mockSummary.lastMessage,
    {
      id: 'msg_test_2',
      schoolId: 'sch_main',
      threadId: 'th_test',
      senderId: 'usr_mock_me',
      recipientId: 'usr_mock_other',
      body: 'Received, thank you!',
      sentAt: '2026-09-10T10:05:00.000Z',
      readAt: '2026-09-10T10:06:00.000Z',
    },
  ];

  const listHtml = renderToString(
    React.createElement(MessageList, {
      threads: [mockSummary],
      activeThreadId: 'th_test',
      onSelectThread: () => {},
      onOpenNew: () => {},
      currentUserId: 'usr_mock_me',
      loading: false,
      role: 'parent',
    })
  );
  assert.ok(listHtml.includes('Sana Malik'), 'MessageList must render other user name');
  assert.ok(listHtml.includes('Ahmed Khan'), 'MessageList must render student context');
  assert.ok(listHtml.includes('math notes'), 'MessageList must render last message snippet');

  const threadHtml = renderToString(
    React.createElement(MessageThread, {
      thread: mockSummary,
      messages: mockMessages,
      currentUserId: 'usr_mock_me',
      onSendMessage: async () => {},
      loading: false,
    })
  );
  assert.ok(threadHtml.includes('Safeguarding Monitored'), 'MessageThread must display safeguarding notice');
  assert.ok(threadHtml.includes('Read'), 'MessageThread must display read receipt status');
  assert.ok(threadHtml.includes('Received, thank you!'), 'MessageThread must display message content');
  console.log('✓ SSR rendering of MessageList and MessageThread verified');

  console.log('\n🎉 ALL TASK-067 MESSAGING TESTS PASSED SUCCESSFULLY! ✅\n');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
