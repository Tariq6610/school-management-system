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
    print: () => {},
  },
  writable: true,
});

import React from 'react';
import { renderToString } from 'react-dom/server';
import { ensureSeeded } from '../../../../../lib/seed/boot';
import {
  createFeeInvoice,
  recordPayment,
} from '../../../../../lib/repositories/feeInvoices';
import {
  calculateDaysOverdue,
  getDefaultersReport,
  getStudentFeeLedger,
  isInvoiceOverdue,
  sendBulkDefaulterReminders,
  sendDefaulterReminder,
} from '../../../../../lib/repositories/feeDefaulters';
import { listWhatsAppLogs } from '../../../../../lib/repositories/whatsappLog';
import { DefaultersListView } from '../../../../../components/fees/DefaultersListView';
import { StudentFeeLedgerModal } from '../../../../../components/fees/StudentFeeLedgerModal';
import { ToastProvider } from '../../../../../components/ui/Toast';
import { SessionProvider } from '../../../../../components/providers/SessionProvider';

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

import { createUser } from '../../../../../lib/repositories/users';
import { createStudent } from '../../../../../lib/repositories/students';

async function runTests() {
  console.log('--- Running TASK-045 Defaulter Report & Student Fee Ledger Tests ---');

  // 1. Seed base data
  await ensureSeeded();
  const schoolId = 'sch_main';

  // Create isolated test students
  const userA = await createUser({
    schoolId,
    name: 'Zaid Defaulter A',
    email: 'zaid_def@example.com',
    role: 'student',
    status: 'active',
  });
  const studentA = await createStudent({
    schoolId,
    campusId: 'camp_main',
    userId: userA.id,
    classId: 'cls_pri_1a',
    academicYearId: 'ay_2026_2027',
    admissionNumber: 'ADM-DEF-001',
    rollNumber: 'DEF-01',
    dob: '2018-05-10',
    gender: 'male',
    address: 'Street 1, Lahore',
    admissionDate: '2026-08-01',
    status: 'active',
    health: {
      allergies: [],
      conditions: [],
      medications: [],
      emergencyContacts: [],
      authorisedPickup: [],
    },
  });

  const userB = await createUser({
    schoolId,
    name: 'Hina Defaulter B',
    email: 'hina_def@example.com',
    role: 'student',
    status: 'active',
  });
  const studentB = await createStudent({
    schoolId,
    campusId: 'camp_gulberg',
    userId: userB.id,
    classId: 'cls_pri_2a',
    academicYearId: 'ay_2026_2027',
    admissionNumber: 'ADM-DEF-002',
    rollNumber: 'DEF-02',
    dob: '2017-09-12',
    gender: 'female',
    address: 'Street 2, Lahore',
    admissionDate: '2026-08-01',
    status: 'active',
    health: {
      allergies: [],
      conditions: [],
      medications: [],
      emergencyContacts: [],
      authorisedPickup: [],
    },
  });

  const now = new Date('2026-10-15T00:00:00Z');

  // Test calculateDaysOverdue helper
  const overdueDays = calculateDaysOverdue('2026-10-01', now);
  assert.strictEqual(overdueDays, 14, '2026-10-01 to 2026-10-15 should be 14 days overdue');
  const futureDays = calculateDaysOverdue('2026-10-25', now);
  assert.strictEqual(futureDays, 0, 'Future due date should have 0 overdue days');

  // 2. Setup test overdue invoices
  // Student A: overdue by 45 days, balance 12,000
  const invA1 = await createFeeInvoice({
    schoolId,
    campusId: studentA.campusId,
    studentId: studentA.id,
    feeStructureId: 'fee_struct_tuition_pri',
    invoiceNumber: 'INV-TEST-DEF-001',
    billingMonth: '2026-08',
    lineItems: [{ label: 'Tuition Fee (Aug 2026)', amount: 15000 }],
    totalAmount: 15000,
    discountAmount: 3000, // net: 12000
    paidAmount: 0,
    dueDate: '2026-08-31', // ~45 days overdue from 2026-10-15
    status: 'overdue',
    payments: [],
  });

  // Student B: overdue by 10 days, balance 5,000
  const invB1 = await createFeeInvoice({
    schoolId,
    campusId: studentB.campusId,
    studentId: studentB.id,
    feeStructureId: 'fee_struct_tuition_pri',
    invoiceNumber: 'INV-TEST-DEF-002',
    billingMonth: '2026-10',
    lineItems: [{ label: 'Tuition Fee (Oct 2026)', amount: 10000 }],
    totalAmount: 10000,
    discountAmount: 0,
    paidAmount: 5000, // partial paid, remaining: 5000
    dueDate: '2026-10-05', // 10 days overdue from 2026-10-15
    status: 'partial',
    payments: [],
  });

  assert(isInvoiceOverdue(invA1, now), 'Invoice A1 should be detected as overdue');
  assert(isInvoiceOverdue(invB1, now), 'Invoice B1 should be detected as overdue (due date past)');

  console.log('✓ Overdue detection verified');

  // 3. Test Defaulter Report without filters
  const reportAll = await getDefaultersReport({ schoolId }, {}, now);
  const foundA = reportAll.defaulters.find((d) => d.student.id === studentA.id);
  const foundB = reportAll.defaulters.find((d) => d.student.id === studentB.id);

  assert(foundA, 'Student A must be in defaulters report');
  assert(foundB, 'Student B must be in defaulters report');
  assert.strictEqual(foundA.totalOverdueAmount, 12000, 'Student A overdue balance must be 12,000');
  assert.strictEqual(foundB.totalOverdueAmount, 5000, 'Student B overdue balance must be 5,000');
  assert.strictEqual(foundA.maxDaysOverdue, 45, 'Student A maxDaysOverdue should be 45');
  assert.strictEqual(foundB.maxDaysOverdue, 10, 'Student B maxDaysOverdue should be 10');

  console.log('✓ Unfiltered defaulters report correctly aggregates overdue totals and days');

  // 4. Test Acceptance Criteria: Filter by Days Overdue
  const reportOverdue15 = await getDefaultersReport(
    { schoolId },
    { minDaysOverdue: 15 },
    now
  );
  const foundAIn15 = reportOverdue15.defaulters.find((d) => d.student.id === studentA.id);
  const foundBIn15 = reportOverdue15.defaulters.find((d) => d.student.id === studentB.id);
  assert(foundAIn15, 'Student A (45 days) must be present when minDaysOverdue is 15');
  assert(!foundBIn15, 'Student B (10 days) must be excluded when minDaysOverdue is 15');

  const reportOverdue30 = await getDefaultersReport(
    { schoolId },
    { minDaysOverdue: 30 },
    now
  );
  assert(
    reportOverdue30.defaulters.every((d) => d.maxDaysOverdue >= 30),
    'All returned defaulters must be at least 30 days overdue'
  );
  console.log('✓ Filter by days overdue verified');

  // 5. Test Acceptance Criteria: Filter by Amount
  const reportAmount10k = await getDefaultersReport(
    { schoolId },
    { minAmount: 10000 },
    now
  );
  const foundAIn10k = reportAmount10k.defaulters.find((d) => d.student.id === studentA.id);
  const foundBIn10k = reportAmount10k.defaulters.find((d) => d.student.id === studentB.id);
  assert(foundAIn10k, 'Student A (12,000) must be present when minAmount is 10,000');
  assert(!foundBIn10k, 'Student B (5,000) must be excluded when minAmount is 10,000');
  assert(
    reportAmount10k.defaulters.every((d) => d.totalOverdueAmount >= 10000),
    'All returned defaulters must owe at least 10,000'
  );
  console.log('✓ Filter by amount verified');

  // 6. Test Combined Filtering (Amount + Days Overdue + Campus)
  const reportCombined = await getDefaultersReport(
    { schoolId },
    {
      minDaysOverdue: 30,
      minAmount: 10000,
      campusId: studentA.campusId,
    },
    now
  );
  assert(
    reportCombined.defaulters.some((d) => d.student.id === studentA.id),
    'Student A matches combined criteria'
  );
  assert(
    !reportCombined.defaulters.some((d) => d.student.id === studentB.id),
    'Student B does not match combined criteria'
  );
  console.log('✓ Combined multi-facet filtering verified');

  // 7. Test WhatsApp Fee Reminder Mock Logging
  const initialLogs = await listWhatsAppLogs({ schoolId });
  const initialLogCount = initialLogs.length;

  const reminderResult = await sendDefaulterReminder(
    { schoolId },
    {
      studentId: studentA.id,
      schoolId,
      campusName: 'Main Campus',
      studentName: 'Ali Khan',
      parentName: 'Tariq Khan',
      parentPhone: '+92 300 9876543',
      overdueAmount: 12000,
      dueDate: '2026-08-31',
    }
  );

  assert(reminderResult.success, 'Fee reminder dispatch must succeed');
  assert(reminderResult.logId, 'Should return created WhatsApp log ID');

  const afterLogs = await listWhatsAppLogs({ schoolId });
  assert.strictEqual(
    afterLogs.length,
    initialLogCount + 1,
    'WhatsApp log collection must increment by 1'
  );
  const createdLog = afterLogs.find((l) => l.id === reminderResult.logId);
  assert(createdLog, 'Created WhatsApp log entry must exist in storage');
  assert.strictEqual(createdLog.template, 'fee_reminder');
  assert.strictEqual(createdLog.status, 'sent');
  assert(createdLog.body.includes('12,000'), 'Body must mention overdue amount');
  assert(createdLog.body.includes('2026-08-31'), 'Body must mention due date');

  // Test Bulk Reminders
  const bulkResult = await sendBulkDefaulterReminders({ schoolId }, [
    {
      studentId: studentA.id,
      schoolId,
      studentName: 'Ali Khan',
      overdueAmount: 12000,
      dueDate: '2026-08-31',
    },
    {
      studentId: studentB.id,
      schoolId,
      studentName: 'Sara Khan',
      overdueAmount: 5000,
      dueDate: '2026-10-05',
    },
  ]);

  assert.strictEqual(bulkResult.sentCount, 2, 'Should have sent 2 bulk reminders');
  const finalLogs = await listWhatsAppLogs({ schoolId });
  assert.strictEqual(finalLogs.length, initialLogCount + 3, 'WhatsApp log should have 3 new entries');
  console.log('✓ WhatsApp fee reminder mock logging verified');

  // 8. Test Student Fee Ledger and Running Balance Invariant
  // Let's record a payment on Student A's invoice
  await recordPayment(invA1.id, {
    amount: 4000,
    method: 'bank',
    reference: 'TRX-LEDGER-001',
    receivedBy: 'usr_admin',
    receivedAt: '2026-09-15T10:00:00Z',
  });

  const ledger = await getStudentFeeLedger(studentA.id, schoolId);
  assert(ledger !== null, 'Student ledger must not be null');
  assert(ledger.entries.length >= 3, 'Should have invoice, concession, and payment entries');

  // Verify running balance invariant
  let running = 0;
  for (const entry of ledger.entries) {
    running += entry.debit - entry.credit;
    assert.strictEqual(
      entry.runningBalance,
      running,
      `Running balance at entry ${entry.referenceNumber} (${entry.runningBalance}) must match cumulative debit-credit (${running})`
    );
  }

  // Final outstanding balance should match
  assert.strictEqual(
    ledger.outstandingBalance,
    running,
    'Statement outstanding balance must match final running balance'
  );
  assert.strictEqual(
    ledger.outstandingBalance,
    8000,
    'Student A remaining balance after 4,000 payment should be 8,000'
  );
  console.log('✓ Student fee ledger running balance invariant verified');

  // 9. Test React SSR rendering for components
  const defaultersHtml = renderWithProviders(
    React.createElement(DefaultersListView, {
      initialCampusId: studentA.campusId,
    })
  );
  assert(defaultersHtml.includes('Student Fee Defaulter Report'), 'DefaultersListView should render header');
  assert(defaultersHtml.includes('Days Overdue'), 'DefaultersListView should render days overdue filter');
  assert(defaultersHtml.includes('Minimum Balance'), 'DefaultersListView should render amount filter');

  const ledgerModalHtml = renderWithProviders(
    React.createElement(StudentFeeLedgerModal, {
      isOpen: true,
      onClose: () => {},
      studentId: studentA.id,
      schoolId,
    })
  );
  assert(ledgerModalHtml.includes('Student Fee Ledger Statement'), 'StudentFeeLedgerModal should render title');
  assert(ledgerModalHtml.includes('Print Statement'), 'StudentFeeLedgerModal should render print button');
  console.log('✓ DefaultersListView and StudentFeeLedgerModal SSR rendering verified');

  console.log('--- ALL TASK-045 TESTS PASSED SUCCESSFULLY ---');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
