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
import { FeeInvoice, Payment } from '../../../../../types';
import {
  createFeeInvoice,
  getFeeInvoice,
  getNextReceiptNumber,
  recordPayment,
} from '../../../../../lib/repositories/feeInvoices';
import { invoiceBalance } from '../../../../../lib/utils/fees';
import { RecordPaymentModal } from '../../../../../components/fees/RecordPaymentModal';
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
  console.log('Running TASK-042 Payment Recording, Partial Payments, and Balance Test Suite...\n');

  // Initialize storage
  store.clear();
  await ensureSeeded();
  console.log('✓ Storage seeded with demo data\n');

  const schoolId = 'sch_main';

  // --- 1. Partial Payment & Status Transitions ---
  console.log('--- 1. Partial Payment & Balance Invariant Tests ---');

  // Create a clean pending invoice for testing
  const testInvoice = await createFeeInvoice({
    schoolId,
    campusId: 'cmp_main',
    studentId: 'stu_test_p1',
    feeStructureId: 'fst_test_1',
    invoiceNumber: 'INV-2026-99901',
    billingMonth: '2026-10',
    dueDate: '2026-10-10',
    lineItems: [{ label: 'Monthly Tuition (October 2026)', amount: 15000 }],
    totalAmount: 15000,
    discountAmount: 3000, // Sibling concession
    paidAmount: 0,
    status: 'pending',
    payments: [],
  });

  const netDue = testInvoice.totalAmount - testInvoice.discountAmount; // 12,000
  assert.strictEqual(netDue, 12000, 'Net due should be 12,000 (15,000 - 3,000)');

  // Record first partial payment of PKR 5,000
  const afterPayment1 = await recordPayment(testInvoice.id, {
    amount: 5000,
    method: 'bank',
    reference: 'TXN-BANK-001',
    receivedBy: 'usr_admin',
    receivedAt: '2026-10-05T10:00:00.000Z',
  });

  assert.strictEqual(afterPayment1.paidAmount, 5000, 'Paid amount should be 5,000');
  assert.strictEqual(afterPayment1.status, 'partial', 'Status must transition to partial');
  assert.strictEqual(afterPayment1.payments.length, 1, 'Payments array should have 1 item');

  const payment1 = afterPayment1.payments[0];
  assert.ok(payment1.receiptNumber.startsWith('REC-'), 'Receipt number must have REC- prefix');
  assert.strictEqual(payment1.amount, 5000, 'Payment amount should be 5,000');
  assert.strictEqual(payment1.method, 'bank', 'Payment method should match');

  const bal1 = invoiceBalance(afterPayment1);
  assert.strictEqual(bal1.remainingBalance, 7000, 'Remaining balance must be 7,000 (12,000 - 5,000)');
  assert.strictEqual(bal1.effectiveStatus, 'partial', 'Effective status must be partial');

  console.log('✓ Partial payment verified: status moved pending → partial, balance: PKR 7,000');

  // --- 2. Full Settlement & Status Transition to Paid ---
  console.log('\n--- 2. Full Settlement & Final Balance Invariant ---');

  // Pay the remaining 7,000
  const afterPayment2 = await recordPayment(testInvoice.id, {
    amount: 7000,
    method: 'cash',
    reference: 'CASH-REC-002',
    receivedBy: 'usr_admin',
    receivedAt: '2026-10-08T14:30:00.000Z',
  });

  assert.strictEqual(afterPayment2.paidAmount, 12000, 'Total paid amount should now equal net due (12,000)');
  assert.strictEqual(afterPayment2.status, 'paid', 'Status must transition to paid');
  assert.strictEqual(afterPayment2.payments.length, 2, 'Payments array should now have 2 items');

  const bal2 = invoiceBalance(afterPayment2);
  assert.strictEqual(bal2.remainingBalance, 0, 'Remaining balance must be strictly 0');
  assert.strictEqual(bal2.effectiveStatus, 'paid', 'Effective status must be paid');

  console.log('✓ Full settlement verified: status moved partial → paid, balance: PKR 0');

  // --- 3. Sequential Receipt Numbers & Reprint Preservation ---
  console.log('\n--- 3. Sequential Receipt Numbering & Preservation ---');

  const payment2 = afterPayment2.payments[1];
  assert.notStrictEqual(
    payment1.receiptNumber,
    payment2.receiptNumber,
    'Each new payment must receive a distinct sequential receipt number'
  );

  // Parse sequence digits
  const seq1 = parseInt(payment1.receiptNumber.split('-')[2], 10);
  const seq2 = parseInt(payment2.receiptNumber.split('-')[2], 10);
  assert.strictEqual(seq2, seq1 + 1, 'Receipt numbers must increment monotonically');

  // Reprint / Re-fetch verification: fetching the invoice again keeps original receipt numbers
  const reloadedInvoice = await getFeeInvoice(testInvoice.id);
  assert.ok(reloadedInvoice, 'Invoice should exist');
  assert.strictEqual(
    reloadedInvoice.payments[0].receiptNumber,
    payment1.receiptNumber,
    'Reprinting/re-viewing must never generate a new receipt number'
  );

  // Directly verify getNextReceiptNumber predicts the next sequence in order
  const peekNext = await getNextReceiptNumber(schoolId);
  assert.strictEqual(
    peekNext,
    `REC-${new Date().getFullYear()}-${String(seq2 + 1).padStart(5, '0')}`,
    'getNextReceiptNumber accurately generates next sequential receipt ID'
  );
  assert.strictEqual(
    reloadedInvoice.payments[1].receiptNumber,
    payment2.receiptNumber,
    'Original receipt number preserved on reload'
  );

  console.log(`✓ Sequential receipts verified: ${payment1.receiptNumber} → ${payment2.receiptNumber} (preserved on reload)`);

  // --- 4. Payment Validation Safeguards ---
  console.log('\n--- 4. Payment Validation Safeguards ---');

  // Attempting to pay on a fully paid invoice should throw
  let completedInvoiceError = false;
  try {
    await recordPayment(testInvoice.id, {
      amount: 1000,
      method: 'cash',
      receivedBy: 'usr_admin',
    });
  } catch {
    completedInvoiceError = true;
  }
  assert.ok(completedInvoiceError, 'Recording payment on fully paid invoice must be rejected');

  // Attempting negative or zero amount
  const newInvoiceForZeroTest = await createFeeInvoice({
    schoolId,
    campusId: 'cmp_main',
    studentId: 'stu_test_p2',
    feeStructureId: 'fst_test_1',
    invoiceNumber: 'INV-2026-99902',
    dueDate: '2026-10-10',
    lineItems: [{ label: 'Tuition', amount: 10000 }],
    totalAmount: 10000,
    discountAmount: 0,
    paidAmount: 0,
    status: 'pending',
    payments: [],
  });

  let zeroAmountError = false;
  try {
    await recordPayment(newInvoiceForZeroTest.id, {
      amount: 0,
      method: 'cash',
      receivedBy: 'usr_admin',
    });
  } catch {
    zeroAmountError = true;
  }
  assert.ok(zeroAmountError, 'Payment with amount <= 0 must be rejected');

  console.log('✓ Validation safeguards verified: overpayment and zero amount properly blocked');

  // --- 5. Multiple Installments Running Balance Test ---
  console.log('\n--- 5. Multiple Installments Running Balance Test ---');

  const multiInstallmentInvoice = await createFeeInvoice({
    schoolId,
    campusId: 'cmp_main',
    studentId: 'stu_test_p3',
    feeStructureId: 'fst_test_1',
    invoiceNumber: 'INV-2026-99903',
    dueDate: '2026-10-10',
    lineItems: [{ label: 'Tuition', amount: 30000 }],
    totalAmount: 30000,
    discountAmount: 0,
    paidAmount: 0,
    status: 'pending',
    payments: [],
  });

  const installments = [10000, 10000, 10000];
  let curInv: FeeInvoice = multiInstallmentInvoice;

  for (let i = 0; i < installments.length; i++) {
    const amt = installments[i];
    curInv = await recordPayment(curInv.id, {
      amount: amt,
      method: 'bank',
      reference: `INST-${i + 1}`,
      receivedBy: 'usr_admin',
    });

    const expectedPaid = (i + 1) * 10000;
    const expectedBalance = 30000 - expectedPaid;
    const expectedStatus = expectedBalance === 0 ? 'paid' : 'partial';

    assert.strictEqual(curInv.paidAmount, expectedPaid, `Paid amount after installment ${i + 1} must match`);
    assert.strictEqual(curInv.status, expectedStatus, `Status after installment ${i + 1} must be ${expectedStatus}`);
    assert.strictEqual(
      invoiceBalance(curInv).remainingBalance,
      expectedBalance,
      `Balance after installment ${i + 1} must be ${expectedBalance}`
    );
  }

  console.log('✓ 3-installment payment cycle verified with consistent running balances');

  // --- 6. Component SSR Rendering Tests ---
  console.log('\n--- 6. Component SSR Rendering Tests ---');

  const testPayment: Payment = {
    id: 'pay_test_ssr',
    amount: 5000,
    method: 'bank',
    reference: 'REF-SSR-01',
    receivedBy: 'usr_admin',
    receivedAt: '2026-09-10T12:00:00.000Z',
    receiptNumber: 'REC-2026-09999',
  };

  const receiptHtml = renderWithProviders(
    React.createElement(PaymentReceiptModal, {
      isOpen: true,
      onClose: () => {},
      invoice: afterPayment1,
      payment: testPayment,
    })
  );
  assert.ok(receiptHtml.includes('FEE RECEIPT'), 'Receipt modal should render "FEE RECEIPT"');
  assert.ok(receiptHtml.includes('REC-2026-09999'), 'Receipt modal should render receipt number');

  const recordModalHtml = renderWithProviders(
    React.createElement(RecordPaymentModal, {
      isOpen: true,
      onClose: () => {},
      invoice: afterPayment1,
      onPaymentRecorded: () => {},
    })
  );
  assert.ok(recordModalHtml.includes('Record Payment'), 'Record modal should render "Record Payment"');

  console.log('✓ Component SSR rendering verified');

  console.log('\n========================================');
  console.log('ALL TASK-042 PAYMENT RECORDING TESTS PASSED! ✅');
  console.log('========================================\n');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
