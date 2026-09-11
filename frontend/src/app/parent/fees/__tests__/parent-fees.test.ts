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
import { ensureSeeded } from '../../../../lib/seed/boot';
import {
  createFeeInvoice,
  recordPayment,
} from '../../../../lib/repositories/feeInvoices';
import { getParentStudentFeeOverview } from '../../../../lib/repositories/parentFees';
import { getChildrenForParent } from '../../../../lib/repositories/parents';
import { createUser } from '../../../../lib/repositories/users';
import { createStudent } from '../../../../lib/repositories/students';
import { ParentFeeView } from '../../../../components/parent/ParentFeeView';
import { ParentDashboardView } from '../../../../components/parent/ParentDashboardView';
import { PaymentReceiptModal } from '../../../../components/fees/PaymentReceiptModal';
import { ToastProvider } from '../../../../components/ui/Toast';
import { SessionProvider } from '../../../../components/providers/SessionProvider';

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

import { setSession } from '../../../../lib/repositories/session';

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
  console.log('--- Running TASK-046 Parent Fee View & Dashboard Balance Tests ---');

  // 1. Seed base data
  await ensureSeeded();
  const schoolId = 'sch_main';

  await setSession({
    userId: 'usr_parent_khan',
    role: 'parent',
    schoolId: 'sch_main',
    campusId: 'camp_main',
    activeChildId: 'stu_ali',
  });

  // Setup isolated test student and invoices
  const userChild = await createUser({
    schoolId,
    name: 'Bilal ParentFee Child',
    email: 'bilal_pf@example.com',
    role: 'student',
    status: 'active',
  });

  const studentChild = await createStudent({
    schoolId,
    campusId: 'camp_main',
    userId: userChild.id,
    classId: 'cls_pri_1a',
    academicYearId: 'ay_2026_2027',
    admissionNumber: 'ADM-PF-001',
    rollNumber: 'PF-01',
    dob: '2018-03-15',
    gender: 'male',
    address: 'Gulberg III, Lahore',
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

  // Invoice 1: Past Due (Overdue) - Gross 20,000, Concession 4,000, Paid 8,000, Remaining 8,000
  const inv1 = await createFeeInvoice({
    schoolId,
    campusId: studentChild.campusId,
    studentId: studentChild.id,
    feeStructureId: 'fee_struct_tuition_pri',
    invoiceNumber: 'INV-PF-001',
    billingMonth: '2026-08',
    lineItems: [{ label: 'Tuition Fee (Aug 2026)', amount: 20000 }],
    totalAmount: 20000,
    discountAmount: 4000,
    paidAmount: 0,
    dueDate: '2026-08-31',
    status: 'pending',
    payments: [],
  });

  // Record an initial payment on Invoice 1
  const updatedInv1 = await recordPayment(inv1.id, {
    amount: 8000,
    method: 'bank',
    reference: 'BANK-ONLINE-101',
    receivedBy: 'usr_admin',
    receivedAt: '2026-09-02T11:00:00Z',
  });

  // Invoice 2: Future Due Date - Gross 10,000, Paid 0, Remaining 10,000
  await createFeeInvoice({
    schoolId,
    campusId: studentChild.campusId,
    studentId: studentChild.id,
    feeStructureId: 'fee_struct_tuition_pri',
    invoiceNumber: 'INV-PF-002',
    billingMonth: '2026-11',
    lineItems: [{ label: 'Tuition Fee (Nov 2026)', amount: 10000 }],
    totalAmount: 10000,
    discountAmount: 0,
    paidAmount: 0,
    dueDate: '2026-11-10',
    status: 'pending',
    payments: [],
  });

  const refDate = new Date('2026-10-15T00:00:00Z');

  // 2. Test getParentStudentFeeOverview
  const overview = await getParentStudentFeeOverview(studentChild.id, schoolId, refDate);
  assert(overview !== null, 'Overview must be returned for valid student');

  assert.strictEqual(overview.totalInvoiced, 30000, 'Total invoiced should be 20,000 + 10,000 = 30,000');
  assert.strictEqual(overview.totalDiscounts, 4000, 'Total concessions should be 4,000');
  assert.strictEqual(overview.totalPaid, 8000, 'Total paid should be 8,000');
  assert.strictEqual(
    overview.outstandingBalance,
    18000,
    'Outstanding balance should be (16,000 - 8,000) + 10,000 = 18,000'
  );

  // Next due date must be the earliest unpaid invoice due date (2026-08-31)
  assert.strictEqual(overview.nextDueDate, '2026-08-31', 'Next due date must match earliest unpaid invoice');
  assert.strictEqual(overview.dueStatus, 'overdue', 'Status must be overdue since 2026-08-31 < 2026-10-15');
  assert(overview.daysUntilDue !== null && overview.daysUntilDue < 0, 'Days until due should be negative');

  // Invoices list verified
  assert.strictEqual(overview.invoices.length, 2, 'Should have 2 invoices');

  // Receipts list verified
  assert.strictEqual(overview.receipts.length, 1, 'Should have 1 recorded payment receipt');
  const rcpt = overview.receipts[0];
  assert.strictEqual(rcpt.amount, 8000);
  assert.strictEqual(rcpt.invoiceNumber, 'INV-PF-001');
  assert.strictEqual(rcpt.method, 'bank');
  assert(rcpt.receiptNumber.startsWith('REC-'), 'Receipt number must follow sequential REC- format');

  console.log('✓ getParentStudentFeeOverview aggregates and receipt collection verified');

  // 3. Test Multi-child Parent Scoping
  // usr_parent_khan has 2 seeded children: Ali and Sara
  const parentChildren = await getChildrenForParent('usr_parent_khan');
  assert(parentChildren.length >= 2, 'usr_parent_khan must have at least 2 linked children');

  const childAli = parentChildren[0];
  const childSara = parentChildren[1];

  const aliOverview = await getParentStudentFeeOverview(childAli.student.id, schoolId, refDate);
  const saraOverview = await getParentStudentFeeOverview(childSara.student.id, schoolId, refDate);

  assert(aliOverview !== null, 'Ali fee overview must exist');
  assert(saraOverview !== null, 'Sara fee overview must exist');
  assert.notStrictEqual(aliOverview.student.id, saraOverview.student.id, 'Children IDs must be distinct');

  console.log('✓ Multi-child parent scoping and isolated fee summaries verified');

  // 4. Test Acceptance Criteria: Receipts Downloadable
  // Verify PaymentReceiptModal renders downloadable/printable receipt with reprint copy badge
  const paymentObj = updatedInv1.payments[0];
  const modalHtml = renderWithProviders(
    React.createElement(PaymentReceiptModal, {
      isOpen: true,
      onClose: () => {},
      invoice: updatedInv1,
      payment: paymentObj,
      student: studentChild,
      user: userChild,
      isReprint: true,
    })
  );

  assert(modalHtml.includes('Payment Receipt'), 'Modal must render payment receipt header');
  assert(modalHtml.includes(paymentObj.receiptNumber), 'Modal must render sequential receipt number');
  assert(modalHtml.includes('Print Receipt'), 'Modal must render print receipt CTA');
  assert(modalHtml.includes('DUPLICATE'), 'Modal must indicate reprint / duplicate copy');

  console.log('✓ Downloadable / printable receipt modal verified');

  // 5. Test Acceptance Criteria: Balance on Dashboard
  // Verify ParentDashboardView renders child fee balance prominently
  const dashboardHtml = renderWithProviders(
    React.createElement(ParentDashboardView, {
      initialStudentId: studentChild.id,
      initialOverview: overview,
    })
  );

  assert(dashboardHtml.includes('Parent Portal Dashboard'), 'Dashboard must render title');
  assert(dashboardHtml.includes('Fee Obligation'), 'Dashboard must render fee obligation header');
  assert(dashboardHtml.includes('Current Balance'), 'Dashboard must render current balance label');
  assert(dashboardHtml.includes('View Invoices &amp; Receipts') || dashboardHtml.includes('View Invoices & Receipts'), 'Dashboard must link to invoices and receipts');

  console.log('✓ Balance on dashboard verified');

  // 6. Test SSR Rendering of ParentFeeView
  const feeViewHtml = renderWithProviders(
    React.createElement(ParentFeeView, {
      initialStudentId: studentChild.id,
      initialOverview: overview,
    })
  );

  assert(feeViewHtml.includes('Current Outstanding Balance'), 'ParentFeeView must render balance banner');
  assert(feeViewHtml.includes('Invoices History'), 'ParentFeeView must render invoices history tab');
  assert(feeViewHtml.includes('Payment Receipts'), 'ParentFeeView must render payment receipts tab');
  assert(feeViewHtml.includes('Next Payment Deadline'), 'ParentFeeView must render next payment deadline');

  console.log('✓ ParentFeeView SSR rendering verified');

  console.log('--- ALL TASK-046 TESTS PASSED SUCCESSFULLY ---');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
