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
    location: { href: '' },
  },
  writable: true,
});

import test from 'node:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ensureSeeded } from '@/lib/seed/boot';
import {
  listNotifications,
  createNotification,
  markNotificationAsRead,
  markNotificationAsUnread,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
  deleteNotification,
} from '@/lib/repositories/notifications';
import { NotificationCentre, NotificationBellTrigger } from '@/components/communication/NotificationCentre';

test('TASK-069: Notification Centre (Read/unread, Filters, SSR)', async () => {
  console.log('--- Seeding Storage for Notification Tests ---');
  await ensureSeeded({ force: true });

  const schoolId = 'sch_main';
  const scope = { schoolId };
  const parentRecipientId = 'usr_parent_khan';

  console.log('--- Test 1: Retrieve Seed Notifications & Initial Unread Count ---');
  const initialNotes = await listNotifications(scope, parentRecipientId);
  assert.ok(initialNotes.length >= 1, 'Expected seed notifications for parent Khan');
  
  const initialUnreadCount = await getUnreadNotificationCount(scope, parentRecipientId);
  const calculatedUnread = initialNotes.filter((n) => !n.readAt).length;
  assert.strictEqual(initialUnreadCount, calculatedUnread, 'Unread count should match unread items');

  console.log('--- Test 2: Create Notification ---');
  const created = await createNotification({
    schoolId,
    recipientId: parentRecipientId,
    title: 'Test Fee Reminder',
    body: 'Your child fee invoice has been issued.',
    type: 'fee',
  });
  assert.ok(created.id, 'Notification should have an ID');
  assert.strictEqual(created.title, 'Test Fee Reminder');
  assert.strictEqual(created.readAt, undefined, 'Newly created notification should be unread');

  const afterCreateCount = await getUnreadNotificationCount(scope, parentRecipientId);
  assert.strictEqual(afterCreateCount, initialUnreadCount + 1, 'Unread count should increment by 1');

  console.log('--- Test 3: Mark Notification As Read ---');
  const readResult = await markNotificationAsRead(created.id);
  assert.ok(readResult.readAt, 'readAt timestamp should be set');

  const afterReadCount = await getUnreadNotificationCount(scope, parentRecipientId);
  assert.strictEqual(afterReadCount, initialUnreadCount, 'Unread count should decrement back');

  console.log('--- Test 4: Mark Notification As Unread ---');
  const unreadResult = await markNotificationAsUnread(created.id);
  assert.strictEqual(unreadResult.readAt, undefined, 'readAt should be undefined after marking unread');

  const afterUnreadCount = await getUnreadNotificationCount(scope, parentRecipientId);
  assert.strictEqual(afterUnreadCount, initialUnreadCount + 1, 'Unread count should reflect unread status');

  console.log('--- Test 5: Mark All Notifications As Read ---');
  const markAllCount = await markAllNotificationsAsRead(scope, parentRecipientId);
  assert.ok(markAllCount >= 1, 'Should have updated at least one unread notification');

  const finalUnreadCount = await getUnreadNotificationCount(scope, parentRecipientId);
  assert.strictEqual(finalUnreadCount, 0, 'Unread count should be 0 after mark all as read');

  console.log('--- Test 6: Delete Notification ---');
  await deleteNotification(created.id);
  const remaining = await listNotifications(scope, parentRecipientId);
  assert.ok(!remaining.some((n) => n.id === created.id), 'Deleted notification should not exist');

  console.log('--- Test 7: NotificationCentre Component SSR Render ---');
  const centreHtml = renderToString(
    React.createElement(NotificationCentre, {
      recipientId: parentRecipientId,
      schoolId,
      role: 'parent',
      isDropdown: false,
    })
  );
  assert.ok(centreHtml.includes('Notifications'), 'Rendered HTML should include header title');
  assert.ok(centreHtml.includes('All (') && centreHtml.includes('Unread ('), 'Rendered HTML should contain filter toggles');

  console.log('--- Test 8: NotificationBellTrigger Component SSR Render ---');
  const bellHtml = renderToString(
    React.createElement(NotificationBellTrigger, {
      recipientId: parentRecipientId,
      schoolId,
      role: 'parent',
    })
  );
  assert.ok(
    bellHtml.includes('aria-label="Open notifications"') && bellHtml.includes('<svg'),
    'Rendered Bell HTML should include the bell trigger button with an SVG icon'
  );

  console.log('All Notification tests passed cleanly!');
});
