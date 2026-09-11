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
  listWhatsAppLogs,
  triggerAbsenceWhatsAppAlert,
  triggerFeeReminderWhatsAppAlert,
  triggerHomeworkWhatsAppAlert,
  triggerAnnouncementWhatsAppAlert,
  triggerResultPublishedWhatsAppAlert,
  clearWhatsAppLogs,
  WHATSAPP_TEMPLATES,
} from '@/lib/repositories/whatsappLog';
import { WhatsAppPhoneView } from '@/components/communication/WhatsAppPhoneView';
import { WhatsAppControlPanel } from '@/components/communication/WhatsAppControlPanel';
import { WhatsAppMockShell } from '@/components/communication/WhatsAppMockShell';

test('TASK-070: WhatsApp Mock Inbox and Message Log (All five templates, Real triggers, SSR)', async () => {
  console.log('--- Seeding Storage for WhatsApp Mock Tests ---');
  await ensureSeeded({ force: true });

  const schoolId = 'sch_main';
  const scope = { schoolId };
  const campusName = 'Main Campus';
  const parentName = 'Tariq Khan';
  const studentName = 'Ahmed Khan';
  const phone = '+92 306 7890123';

  console.log('--- Test 1: Verify Initial Seed Logs ---');
  const initialLogs = await listWhatsAppLogs(scope);
  assert.ok(initialLogs.length >= 2, 'Expected at least 2 seed WhatsApp logs');

  console.log('--- Test 2: Trigger Template 1 (Absence) ---');
  // Template: Dear {parent}, {student} was marked absent today, {date}. — {campus}
  const dateStr = '10 Sep 2026';
  const absenceLog = await triggerAbsenceWhatsAppAlert(scope, {
    parentName,
    studentName,
    date: dateStr,
    campusName,
    phone,
  });
  assert.strictEqual(absenceLog.trigger, 'Absence');
  assert.strictEqual(
    absenceLog.body,
    `Dear ${parentName}, ${studentName} was marked absent today, ${dateStr}. — ${campusName}`
  );
  assert.strictEqual(absenceLog.recipientPhone, phone);
  assert.strictEqual(absenceLog.recipientName, parentName);

  console.log('--- Test 3: Trigger Template 2 (Fee Reminder) ---');
  // Template: Dear {parent}, fee of Rs {amount} for {student} is due on {date}. — {campus}
  const feeLog = await triggerFeeReminderWhatsAppAlert(scope, {
    parentName,
    studentName,
    amount: 15000,
    date: '15 Sep 2026',
    campusName,
    phone,
  });
  assert.strictEqual(feeLog.trigger, 'Fee reminder');
  assert.ok(feeLog.body.includes(`Dear ${parentName}, fee of Rs 15,000 for ${studentName} is due on 15 Sep 2026. — ${campusName}`));

  console.log('--- Test 4: Trigger Template 3 (Homework) ---');
  // Template: New homework in {subject} for {student}, due {date}. — {campus}
  const hwLog = await triggerHomeworkWhatsAppAlert(scope, {
    subject: 'Mathematics',
    studentName,
    date: 'Friday, 18 Sep',
    campusName,
    parentName,
    phone,
  });
  assert.strictEqual(hwLog.trigger, 'Homework');
  assert.strictEqual(
    hwLog.body,
    `New homework in Mathematics for ${studentName}, due Friday, 18 Sep. — ${campusName}`
  );

  console.log('--- Test 5: Trigger Template 4 (Announcement) ---');
  // Template: {title}\n\n{body}\n— {campus}
  const title = 'Sports Day Scheduled';
  const announcementBody = 'The annual sports gala will be held this Saturday.';
  const annLog = await triggerAnnouncementWhatsAppAlert(scope, {
    title,
    body: announcementBody,
    campusName,
    parentName,
    phone,
  });
  assert.strictEqual(annLog.trigger, 'Announcement');
  assert.strictEqual(
    annLog.body,
    `${title}\n\n${announcementBody}\n— ${campusName}`
  );

  console.log('--- Test 6: Trigger Template 5 (Result Published) ---');
  // Template: Results for {exam} are now available for {student}. — {campus}
  const examName = 'Mid-Term Examinations 2026';
  const resultLog = await triggerResultPublishedWhatsAppAlert(scope, {
    examName,
    studentName,
    campusName,
    parentName,
    phone,
  });
  assert.strictEqual(resultLog.trigger, 'Result published');
  assert.strictEqual(
    resultLog.body,
    `Results for ${examName} are now available for ${studentName}. — ${campusName}`
  );

  console.log('--- Test 7: Verify Meta Template Registry Metadata ---');
  const templateKeys = Object.keys(WHATSAPP_TEMPLATES);
  assert.strictEqual(templateKeys.length, 5, 'Must define all five Meta templates');
  assert.ok(WHATSAPP_TEMPLATES.absence, 'Absence template must exist');
  assert.ok(WHATSAPP_TEMPLATES.fee_reminder, 'Fee reminder template must exist');
  assert.ok(WHATSAPP_TEMPLATES.homework, 'Homework template must exist');
  assert.ok(WHATSAPP_TEMPLATES.announcement, 'Announcement template must exist');
  assert.ok(WHATSAPP_TEMPLATES.result_published, 'Result published template must exist');

  for (const tmpl of Object.values(WHATSAPP_TEMPLATES)) {
    assert.strictEqual(tmpl.metaStatus, 'APPROVED', `Template ${tmpl.id} must be approved`);
    assert.ok(tmpl.variables.length >= 2, `Template ${tmpl.id} must define variable placeholders`);
  }

  console.log('--- Test 8: Verify Log Persistence & Total Count ---');
  const allLogs = await listWhatsAppLogs(scope);
  assert.strictEqual(
    allLogs.length,
    initialLogs.length + 5,
    'All 5 triggers must append to the WhatsApp log'
  );

  console.log('--- Test 9: SSR Render of WhatsAppPhoneView ---');
  const phoneHtml = renderToString(
    React.createElement(WhatsAppPhoneView, {
      logs: allLogs,
      selectedRecipient: 'all',
      onSelectRecipient: () => {},
      uniqueRecipients: ['Tariq Khan'],
    })
  );
  assert.ok(phoneHtml.includes('ABC School Network'), 'Phone view must display school name');
  assert.ok(phoneHtml.includes('Official Business Account'), 'Phone view must display verified status');
  assert.ok(phoneHtml.includes('TODAY'), 'Phone view must display date pills');
  assert.ok(phoneHtml.includes('Dear Tariq Khan'), 'Phone view must render conversation bubbles');

  console.log('--- Test 10: SSR Render of WhatsAppControlPanel ---');
  const controlHtml = renderToString(
    React.createElement(WhatsAppControlPanel, {
      logs: allLogs,
      onTriggerAbsence: async () => {},
      onTriggerFeeReminder: async () => {},
      onTriggerHomework: async () => {},
      onTriggerAnnouncement: async () => {},
      onTriggerResultPublished: async () => {},
      onClearLogs: async () => {},
      triggering: false,
    })
  );
  assert.ok(controlHtml.includes('Simulate Real School Triggers'), 'Control panel must include simulator');
  assert.ok(controlHtml.includes('1. Absence Alert'), 'Must have Absence trigger button');
  assert.ok(controlHtml.includes('2. Fee Reminder'), 'Must have Fee Reminder trigger button');
  assert.ok(controlHtml.includes('3. Homework Alert'), 'Must have Homework trigger button');
  assert.ok(controlHtml.includes('4. Announcement'), 'Must have Announcement trigger button');
  assert.ok(controlHtml.includes('5. Result Published'), 'Must have Result Published trigger button');
  assert.ok(controlHtml.includes('Meta WhatsApp Templates'), 'Must have Meta compliance tab');

  console.log('--- Test 11: SSR Render of WhatsAppMockShell ---');
  const shellHtml = renderToString(
    React.createElement(WhatsAppMockShell, { schoolId })
  );
  assert.ok(shellHtml.includes('ABC School Network'), 'Shell should render phone view');

  console.log('--- Test 12: Clear WhatsApp Logs ---');
  const clearedCount = await clearWhatsAppLogs(scope);
  assert.strictEqual(clearedCount, allLogs.length, 'All logs should be deleted');
  const postClear = await listWhatsAppLogs(scope);
  assert.strictEqual(postClear.length, 0, 'Log should be empty after clear');

  console.log('All TASK-070 WhatsApp Mock tests passed cleanly! 🎉');
});
