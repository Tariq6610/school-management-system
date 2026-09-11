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
  applyInvoiceConcession,
  removeInvoiceConcession,
  previewBulkInvoiceGeneration,
} from '../../../../../lib/repositories/feeInvoices';
import {
  createStudentConcession,
  listStudentConcessions,
  deleteStudentConcession,
  calculateStudentConcessions,
  hasEnrolledSiblings,
} from '../../../../../lib/repositories/studentConcessions';
import { invoiceBalance } from '../../../../../lib/utils/fees';
import { ApplyConcessionModal } from '../../../../../components/fees/ApplyConcessionModal';
import { StudentConcessionsModal } from '../../../../../components/fees/StudentConcessionsModal';
import { ToastProvider } from '../../../../../components/ui/Toast';
import { SessionProvider } from '../../../../../components/providers/SessionProvider';
import { Student } from '../../../../../types';

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
  console.log('Running TASK-043 Discounts, Scholarships & Sibling Concession Test Suite...\n');

  // Initialize storage with demo seed data
  store.clear();
  await ensureSeeded();
  console.log('✓ Storage seeded with demo data\n');

  const schoolId = 'sch_main';

  // --- 1. Sibling Concession Auto-Detection & Explicit Line Items ---
  console.log('--- 1. Sibling Concession & Never-Silent Acceptance Rule ---');

  // Ayesha Khan has sibling Bilal Khan sharing parent Tariq Khan
  const isAyeshaSibling = await hasEnrolledSiblings(schoolId, 'stu_ayesha');
  assert.strictEqual(isAyeshaSibling, true, 'Ayesha Khan must have detected enrolled siblings');

  const ayeshaConcessions = await calculateStudentConcessions({
    schoolId,
    studentId: 'stu_ayesha',
    feeStructureId: 'fst_grade1_8',
    grossAmount: 20000,
  });

  // Acceptance Criterion: "Visible as line items, never silent"
  assert.strictEqual(ayeshaConcessions.totalDiscount, 3000, 'Sibling discount should be 15% of 20,000 (3,000)');
  assert.strictEqual(ayeshaConcessions.netAmount, 17000, 'Net amount must be 17,000');
  assert.strictEqual(ayeshaConcessions.lineItems.length, 1, 'Must have 1 explicit concession line item');
  assert.strictEqual(ayeshaConcessions.lineItems[0].label, 'Sibling Concession (15%)', 'Line item label must be explicit');
  assert.strictEqual(ayeshaConcessions.lineItems[0].amount, -3000, 'Line item must be explicitly negative (-3000), never a silent reduction');

  console.log('✓ Sibling concession verified: explicit line item label and negative amount (-3000), never silent');

  // --- 2. Student Concession Profile CRUD & Multiple Concessions ---
  console.log('\n--- 2. Student Concession CRUD & Multiple Concessions ---');

  const testStudentId = 'stu_test_cnc_1';

  // Assign Merit Scholarship (25%)
  const scholarship = await createStudentConcession({
    schoolId,
    studentId: testStudentId,
    type: 'scholarship',
    name: 'Merit Scholarship (25%)',
    discountType: 'percentage',
    discountValue: 25,
    reason: 'Top 5% in entrance exam',
    startDate: '2026-09-01',
    isActive: true,
  });
  assert.ok(scholarship.id.startsWith('cnc_'), 'Concession must receive cnc_ ID');

  // Assign Staff Child Concession (50%)
  const staffConcession = await createStudentConcession({
    schoolId,
    studentId: testStudentId,
    type: 'staff_child',
    name: 'Staff Child Concession (50%)',
    discountType: 'percentage',
    discountValue: 50,
    startDate: '2026-09-01',
    isActive: true,
  });

  // List student concessions
  const listed = await listStudentConcessions({ schoolId }, { studentId: testStudentId, isActive: true });
  assert.strictEqual(listed.length, 2, 'Should have 2 active concessions for test student');

  // Calculate combined concessions on PKR 10,000 fee
  const combined = await calculateStudentConcessions({
    schoolId,
    studentId: testStudentId,
    feeStructureId: 'fst_test',
    grossAmount: 10000,
  });

  // 25% of 10,000 = 2,500; 50% of 10,000 = 5,000; Total = 7,500
  assert.strictEqual(combined.totalDiscount, 7500, 'Total discount should be sum of both concessions (7,500)');
  assert.strictEqual(combined.netAmount, 2500, 'Net amount should be 2,500');
  assert.strictEqual(combined.lineItems.length, 2, 'Must have 2 distinct explicit line items');
  assert.strictEqual(combined.lineItems[0].amount, -2500, 'Merit scholarship line item must be -2500');
  assert.strictEqual(combined.lineItems[1].amount, -5000, 'Staff child line item must be -5000');

  console.log('✓ Multiple concessions verified: both Merit (25%) and Staff Child (50%) appear as itemized rows');

  // Clean up one concession
  await deleteStudentConcession(staffConcession.id);
  const afterDelete = await listStudentConcessions({ schoolId }, { studentId: testStudentId });
  assert.strictEqual(afterDelete.length, 1, 'Only 1 concession should remain after deletion');

  // --- 3. Ad-Hoc Concession Application to Existing Invoices ---
  console.log('\n--- 3. Ad-Hoc Concession Application to Invoices (applyInvoiceConcession) ---');

  const baseInvoice = await createFeeInvoice({
    schoolId,
    campusId: 'cmp_main',
    studentId: 'stu_test_inv_cnc',
    feeStructureId: 'fst_test_1',
    invoiceNumber: 'INV-2026-88801',
    dueDate: '2026-10-15',
    lineItems: [
      { label: 'Standard Tuition', amount: 20000 },
      { label: 'Laboratory Fee', amount: 2000 },
    ],
    totalAmount: 22000,
    discountAmount: 0,
    paidAmount: 0,
    status: 'pending',
    payments: [],
  });

  // Apply a 20% Special Relief concession
  const updatedInvoice = await applyInvoiceConcession(baseInvoice.id, {
    type: 'special',
    name: 'Special Financial Relief (20%)',
    discountType: 'percentage',
    discountValue: 20,
    reason: 'Approved by School Board',
  });

  // 20% of 22,000 totalAmount = 4,400
  assert.strictEqual(updatedInvoice.discountAmount, 4400, 'discountAmount should update to 4,400');
  assert.strictEqual(updatedInvoice.lineItems.length, 3, 'Invoice must now have 3 line items');
  
  const concessionItem = updatedInvoice.lineItems[2];
  assert.strictEqual(concessionItem.label, 'Special Financial Relief (20%)', 'Line item label must match');
  assert.strictEqual(concessionItem.amount, -4400, 'Line item amount must be negative deduction (-4400)');

  // Verify balance helper
  const bal = invoiceBalance(updatedInvoice);
  assert.strictEqual(bal.grossAmount, 22000, 'Gross amount is preserved at 22,000 (never silently reduced)');
  assert.strictEqual(bal.discountAmount, 4400, 'Discount amount is 4,400');
  assert.strictEqual(bal.netPayable, 17600, 'Net payable is 17,600');
  assert.strictEqual(bal.remainingBalance, 17600, 'Remaining balance is 17,600');

  console.log('✓ Ad-hoc concession applied: line item added, balance and net receivable updated strictly');

  // --- 4. Concession Removal & Balance Recalculation ---
  console.log('\n--- 4. Concession Line Item Removal (removeInvoiceConcession) ---');

  const afterRemoval = await removeInvoiceConcession(updatedInvoice.id, 2);
  assert.strictEqual(afterRemoval.lineItems.length, 2, 'Line item count should revert to 2');
  assert.strictEqual(afterRemoval.discountAmount, 0, 'discountAmount should revert to 0');
  
  const balReverted = invoiceBalance(afterRemoval);
  assert.strictEqual(balReverted.remainingBalance, 22000, 'Remaining balance should revert to 22,000');
  assert.strictEqual(balReverted.netPayable, 22000, 'Net payable should revert to 22,000');

  console.log('✓ Concession removal verified: line item purged, discountAmount and balance cleanly restored');

  // --- 5. Safeguards & Validation Safeguards ---
  console.log('\n--- 5. Concession Safeguards & Boundaries ---');

  // Attempting to apply concession with invalid percentages or values
  let zeroValueError = false;
  try {
    await applyInvoiceConcession(baseInvoice.id, {
      type: 'scholarship',
      name: 'Zero Concession',
      discountType: 'percentage',
      discountValue: 0,
    });
  } catch {
    zeroValueError = true;
  }
  assert.ok(zeroValueError, 'Discount value <= 0 must be rejected');

  let over100Error = false;
  try {
    await applyInvoiceConcession(baseInvoice.id, {
      type: 'scholarship',
      name: 'Impossible Scholarship',
      discountType: 'percentage',
      discountValue: 120,
    });
  } catch {
    over100Error = true;
  }
  assert.ok(over100Error, 'Percentage concession > 100% must be rejected');

  // Attempting to remove regular non-negative line item using removeInvoiceConcession
  let regularItemRemovalError = false;
  try {
    await removeInvoiceConcession(afterRemoval.id, 0); // index 0 is positive Tuition item
  } catch {
    regularItemRemovalError = true;
  }
  assert.ok(regularItemRemovalError, 'Cannot remove regular positive tuition item via concession removal');

  console.log('✓ Safeguards verified: zero values, >100% percentages, and non-concession removals blocked');

  // --- 6. Bulk Generation with Concessions Verification ---
  console.log('\n--- 6. Bulk Invoicing with Concession Integration ---');

  const preview = await previewBulkInvoiceGeneration(
    { schoolId },
    {
      billingMonth: '2026-11',
      dueDate: '2026-11-10',
    }
  );

  const ayeshaPreview = preview.items.find((it) => it.studentId === 'stu_ayesha');
  assert.ok(ayeshaPreview, 'Ayesha Khan must be in preview');
  assert.strictEqual(ayeshaPreview.discountAmount, 3000, 'Ayesha Khan must have 3,000 sibling concession in preview');
  assert.ok(ayeshaPreview.concessionLineItems && ayeshaPreview.concessionLineItems.length > 0, 'Preview must have explicit concession line items');
  assert.strictEqual(ayeshaPreview.concessionLineItems[0].amount, -3000, 'Concession line item must be -3,000');

  console.log('✓ Bulk invoice preview includes explicit itemized concessions');

  // --- 7. Component SSR Rendering Tests ---
  console.log('\n--- 7. Component SSR Rendering Tests ---');

  const dummyStudent: Student = {
    id: 'stu_dummy_ssr',
    schoolId,
    campusId: 'cmp_main',
    userId: 'usr_ayesha',
    classId: 'cls_grade10_a',
    academicYearId: 'ay_2026_2027',
    admissionNumber: 'ADM-9999',
    rollNumber: '99',
    dob: '2010-05-14',
    gender: 'female',
    address: 'Demo Address',
    admissionDate: '2020-08-01',
    status: 'active',
    health: {
      bloodGroup: 'B+',
      allergies: [],
      medications: [],
      conditions: [],
      doctorName: 'Dr. SSR',
      emergencyContacts: [],
      authorisedPickup: [],
    },
  };

  const applyModalHtml = renderWithProviders(
    React.createElement(ApplyConcessionModal, {
      isOpen: true,
      onClose: () => {},
      invoice: updatedInvoice,
      onConcessionApplied: () => {},
    })
  );
  assert.ok(applyModalHtml.includes('Apply Discount or Concession'), 'Apply modal should render title');
  assert.ok(applyModalHtml.includes('Concession Category'), 'Apply modal should render category');
  assert.ok(applyModalHtml.includes('Quick Percentage Presets'), 'Apply modal should render preset shortcuts');

  const studentConcessionsModalHtml = renderWithProviders(
    React.createElement(StudentConcessionsModal, {
      isOpen: true,
      onClose: () => {},
      student: dummyStudent,
      studentName: 'Ayesha Khan',
      scope: { schoolId },
    })
  );
  assert.ok(
    studentConcessionsModalHtml.includes('Student Concessions') &&
      studentConcessionsModalHtml.includes('Scholarships'),
    'Student concessions modal should render title'
  );

  console.log('✓ Component SSR rendering verified for ApplyConcessionModal and StudentConcessionsModal');

  console.log('\n========================================');
  console.log('ALL TASK-043 DISCOUNTS & CONCESSIONS TESTS PASSED! ✅');
  console.log('========================================\n');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
