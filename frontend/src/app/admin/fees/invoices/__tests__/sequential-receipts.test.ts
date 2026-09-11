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
  getFeeInvoice,
  getNextReceiptNumber,
  recordPayment,
  getPaymentReceiptByNumber,
} from '../../../../../lib/repositories/feeInvoices';
import { PaymentReceiptModal } from '../../../../../components/fees/PaymentReceiptModal';
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

async function runTests() {
  console.log('Running TASK-044 Sequential Receipts and Reprint Preservation Test Suite...\n');

  // Initialize storage with demo seed data
  store.clear();
  await ensureSeeded();
  console.log('✓ Storage seeded with demo data\n');

  const schoolId = 'sch_main';
  const currentYear = new Date().getFullYear();

  // --- 1. Monotonic Sequential Receipt Generation ---
  console.log('--- 1. Monotonic Sequential Receipt Generation ---');

  const initialNextReceipt = await getNextReceiptNumber(schoolId);
  assert.match(
    initialNextReceipt,
    new RegExp(`^REC-${currentYear}-\\d{5}$`),
    'Receipt number must strictly follow institutional format REC-YYYY-XXXXX'
  );

  const initialSeq = parseInt(initialNextReceipt.split('-')[2], 10);
  assert.ok(initialSeq > 0, 'Initial sequence must be positive');

  // Create a clean invoice for testing
  const invoice1 = await createFeeInvoice({
    schoolId,
    campusId: 'cmp_main',
    studentId: 'stu_seq_test_1',
    feeStructureId: 'fst_middle',
    invoiceNumber: 'INV-2026-77701',
    dueDate: '2026-10-15',
    lineItems: [{ label: 'Tuition Fee', amount: 15000 }],
    totalAmount: 15000,
    discountAmount: 0,
    paidAmount: 0,
    status: 'pending',
    payments: [],
  });

  // Record payment 1
  const paidInv1 = await recordPayment(invoice1.id, {
    amount: 5000,
    method: 'cash',
    receivedBy: 'usr_admin',
  });

  const payment1 = paidInv1.payments[0];
  assert.strictEqual(
    payment1.receiptNumber,
    initialNextReceipt,
    'Issued receipt number must match pre-computed next sequence'
  );

  // Next receipt should strictly increment by 1
  const nextAfterPayment1 = await getNextReceiptNumber(schoolId);
  const nextSeq1 = parseInt(nextAfterPayment1.split('-')[2], 10);
  assert.strictEqual(nextSeq1, initialSeq + 1, 'Receipt sequence must monotonically increase by 1');

  console.log(`✓ Monotonic sequence verified: ${initialNextReceipt} → ${nextAfterPayment1}`);

  // --- 2. Acceptance Criterion: Reprint Strictly Does NOT Issue a New Number ---
  console.log('\n--- 2. Acceptance Criterion: Reprint Does Not Issue a New Number ---');

  const originalReceiptNumber = payment1.receiptNumber;

  // Simulate 15 consecutive reload/reprint queries
  for (let i = 1; i <= 15; i++) {
    const reloaded = await getFeeInvoice(invoice1.id);
    assert.ok(reloaded, 'Invoice must exist');
    assert.strictEqual(
      reloaded.payments[0].receiptNumber,
      originalReceiptNumber,
      `Reprint attempt #${i} must strictly preserve original receipt number without issuing a new one`
    );
  }

  // Ensure getNextReceiptNumber did NOT change during reprints
  const nextAfter15Reprints = await getNextReceiptNumber(schoolId);
  assert.strictEqual(
    nextAfter15Reprints,
    nextAfterPayment1,
    'Reprinting/re-querying must NEVER advance the receipt sequence generator'
  );

  console.log('✓ Acceptance criterion verified: 15 reprints strictly preserved original number, sequence generator untouched');

  // --- 3. Consecutive Installments Distinct Receipt Numbers ---
  console.log('\n--- 3. Multiple Installments Receive Distinct Sequential Numbers ---');

  const paidInv2 = await recordPayment(invoice1.id, {
    amount: 5000,
    method: 'bank',
    reference: 'CHQ-77702',
    receivedBy: 'usr_admin',
  });
  const payment2 = paidInv2.payments[1];

  const paidInv3 = await recordPayment(invoice1.id, {
    amount: 5000,
    method: 'cash',
    receivedBy: 'usr_admin',
  });
  const payment3 = paidInv3.payments[2];

  assert.strictEqual(paidInv3.status, 'paid', 'Status must transition to paid');
  assert.strictEqual(paidInv3.payments.length, 3, 'Invoice must have 3 audited payments');

  assert.notStrictEqual(payment1.receiptNumber, payment2.receiptNumber);
  assert.notStrictEqual(payment2.receiptNumber, payment3.receiptNumber);

  const seq2 = parseInt(payment2.receiptNumber.split('-')[2], 10);
  const seq3 = parseInt(payment3.receiptNumber.split('-')[2], 10);
  assert.strictEqual(seq2, initialSeq + 1, 'Payment 2 must be sequential');
  assert.strictEqual(seq3, initialSeq + 2, 'Payment 3 must be sequential');

  console.log(`✓ Installment sequence verified: ${payment1.receiptNumber} → ${payment2.receiptNumber} → ${payment3.receiptNumber}`);

  // --- 4. Direct Lookup by Receipt Number (getPaymentReceiptByNumber) ---
  console.log('\n--- 4. Direct Lookup by Receipt Number ---');

  const lookupResult = await getPaymentReceiptByNumber(schoolId, payment2.receiptNumber);
  assert.ok(lookupResult, 'Lookup should find matching receipt');
  assert.strictEqual(lookupResult.invoice.id, invoice1.id, 'Lookup must return correct invoice');
  assert.strictEqual(lookupResult.payment.id, payment2.id, 'Lookup must return correct payment record');
  assert.strictEqual(lookupResult.payment.amount, 5000, 'Lookup must return matching amount');

  const nonExistent = await getPaymentReceiptByNumber(schoolId, 'REC-1999-99999');
  assert.strictEqual(nonExistent, null, 'Non-existent receipt number must return null');

  console.log('✓ Direct receipt lookup verified for cashiering audit');

  // --- 5. Component SSR Rendering: Original vs Reprint ---
  console.log('\n--- 5. SSR Rendering: Original vs Reprint Mode ---');

  // Fresh initial receipt rendering
  const freshHtml = renderWithProviders(
    React.createElement(PaymentReceiptModal, {
      isOpen: true,
      onClose: () => {},
      invoice: paidInv3,
      payment: payment1,
      isReprint: false,
    })
  );
  assert.ok(freshHtml.includes('FEE RECEIPT'), 'Receipt modal should include FEE RECEIPT');
  assert.ok(freshHtml.includes(payment1.receiptNumber), 'Receipt modal should render receipt number');
  assert.ok(!freshHtml.includes('DUPLICATE'), 'Fresh receipt should not show DUPLICATE watermark');

  // Reprint mode rendering
  const reprintHtml = renderWithProviders(
    React.createElement(PaymentReceiptModal, {
      isOpen: true,
      onClose: () => {},
      invoice: paidInv3,
      payment: payment1,
      isReprint: true,
    })
  );
  assert.ok(reprintHtml.includes(payment1.receiptNumber), 'Reprint modal must render exact original receipt number');
  assert.ok(reprintHtml.includes('DUPLICATE'), 'Reprint modal must show DUPLICATE badge');
  assert.ok(reprintHtml.includes('REPRINT'), 'Reprint modal must show REPRINT badge');
  assert.ok(reprintHtml.includes('Copy #'), 'Reprint modal must have copy shortcut');

  console.log('✓ Component SSR rendering verified for both fresh and reprint modes');

  console.log('\n========================================');
  console.log('ALL TASK-044 SEQUENTIAL RECEIPTS TESTS PASSED! ✅');
  console.log('========================================\n');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
