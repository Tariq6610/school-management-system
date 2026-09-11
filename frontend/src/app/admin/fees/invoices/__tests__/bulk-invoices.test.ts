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
  },
  writable: true,
});

import React from 'react';
import { renderToString } from 'react-dom/server';
import { ensureSeeded } from '../../../../../lib/seed/boot';
import { getItem } from '../../../../../lib/storage';
import { STORAGE_KEYS } from '../../../../../lib/storage/keys';
import {
  BulkInvoiceParams,
  FeeInvoice,
  FeeStructure,
  Student,
} from '../../../../../types';
import {
  generateBulkInvoices,
  listFeeInvoices,
  previewBulkInvoiceGeneration,
} from '../../../../../lib/repositories/feeInvoices';
import { listActiveStudents } from '../../../../../lib/repositories/students';
import { listClasses } from '../../../../../lib/repositories/classes';
import { listCampuses } from '../../../../../lib/repositories/campuses';
import { listUsers } from '../../../../../lib/repositories/users';
import { listFeeStructures } from '../../../../../lib/repositories/feeStructures';
import { InvoicesTable } from '../../../../../components/fees/InvoicesTable';

async function runTests() {
  console.log('Running TASK-041 Bulk Invoice Generation with Preview Test Suite...\n');

  // Initialize mock storage with realistic seed data
  store.clear();
  await ensureSeeded();
  console.log('✓ Storage seeded with demo data\n');

  const schoolId = 'sch_main';

  // --- 1. Preview Bulk Invoice Generation Tests ---
  console.log('--- 1. Preview Bulk Invoice Generation Tests ---');

  // Preview for a future month (November 2026) where no invoices exist yet
  const futureParams: BulkInvoiceParams = {
    billingMonth: '2026-11',
    dueDate: '2026-11-10',
  };

  const previewNov = await previewBulkInvoiceGeneration({ schoolId }, futureParams);
  assert.ok(previewNov.totalEligibleStudents > 0, 'Should find eligible active students');
  assert.ok(previewNov.newInvoicesCount > 0, 'Should have positive new invoices to generate');
  assert.ok(previewNov.newInvoicesTotal > 0, 'Should have positive total amount to bill');
  assert.strictEqual(previewNov.duplicateCount, 0, 'Should have 0 duplicates for clean future month');
  assert.strictEqual(previewNov.billingMonthLabel, 'November 2026', 'Billing month label should format correctly');

  // Verify preview items detail
  const firstItem = previewNov.items[0];
  assert.ok(firstItem.studentId, 'Item should have studentId');
  assert.ok(firstItem.studentName, 'Item should have resolved student name');
  assert.ok(firstItem.className, 'Item should have class name');
  assert.ok(firstItem.feeStructureName, 'Item should have fee structure name');
  assert.ok(firstItem.grossAmount > 0, 'Gross amount should be positive');
  assert.strictEqual(firstItem.isDuplicate, false, 'Should not be marked duplicate');

  // Check sibling discount on Ayesha Khan
  const ayeshaItem = previewNov.items.find((item) => item.studentId === 'stu_ayesha');
  if (ayeshaItem) {
    assert.strictEqual(ayeshaItem.discountAmount, 3000, 'Ayesha should have 3000 sibling concession');
    assert.strictEqual(
      ayeshaItem.netAmount,
      ayeshaItem.grossAmount - 3000,
      'Net amount should subtract concession'
    );
  }

  console.log(
    `✓ Preview verified: ${previewNov.newInvoicesCount} invoices totaling PKR ${previewNov.newInvoicesTotal} across ${previewNov.totalEligibleStudents} students`
  );

  // --- 2. Existing Seed Invoices Duplicate Detection in Preview ---
  console.log('\n--- 2. Duplicate Detection in Preview (Current Month) ---');

  // September 2026 is already seeded in the database
  const sepParams: BulkInvoiceParams = {
    billingMonth: '2026-09',
    dueDate: '2026-09-10',
  };

  const previewSep = await previewBulkInvoiceGeneration({ schoolId }, sepParams);
  assert.ok(
    previewSep.duplicateCount > 0,
    'September preview should detect existing seeded invoices as duplicates'
  );
  assert.ok(
    previewSep.duplicateTotal > 0,
    'September duplicate total should be greater than 0'
  );

  const duplicateItem = previewSep.items.find((item) => item.isDuplicate);
  assert.ok(duplicateItem, 'Should find at least one duplicate item in September preview');
  assert.ok(duplicateItem.existingInvoiceId, 'Duplicate item should reference existing invoice ID');

  console.log(
    `✓ Existing invoice duplicate detection verified: detected ${previewSep.duplicateCount} duplicates (PKR ${previewSep.duplicateTotal})`
  );

  // --- 3. Acceptance Criteria: Bulk Generation and Zero Duplicates on Re-Run ---
  console.log('\n--- 3. Acceptance Criteria: Generation & Re-Run Duplicate Prevention ---');

  const invoicesBefore = (getItem<FeeInvoice[]>(STORAGE_KEYS.FEE_INVOICES) || []).length;

  // Generate for November 2026
  const genResult1 = await generateBulkInvoices({ schoolId }, futureParams);
  assert.strictEqual(
    genResult1.createdCount,
    previewNov.newInvoicesCount,
    'Created count should match preview newInvoicesCount'
  );
  assert.strictEqual(
    genResult1.totalAmount,
    previewNov.newInvoicesTotal,
    'Total created amount should match preview total'
  );
  assert.strictEqual(genResult1.skippedCount, 0, 'First run should skip 0');

  const invoicesAfter = (getItem<FeeInvoice[]>(STORAGE_KEYS.FEE_INVOICES) || []).length;
  assert.strictEqual(
    invoicesAfter,
    invoicesBefore + genResult1.createdCount,
    'Storage invoices should increment by created count'
  );

  // Verify generated invoice properties
  const createdInv = genResult1.createdInvoices[0];
  assert.ok(createdInv.invoiceNumber.startsWith('INV-'), 'Invoice number must have INV- prefix');
  assert.strictEqual(createdInv.billingMonth, '2026-11', 'Invoice must have billingMonth set');
  assert.strictEqual(createdInv.dueDate, '2026-11-10', 'Invoice must have dueDate set');
  assert.strictEqual(createdInv.status, 'pending', 'New invoice status must be pending');
  assert.strictEqual(createdInv.paidAmount, 0, 'New invoice paidAmount must be 0');

  console.log(`✓ Batch 1 successfully generated ${genResult1.createdCount} invoices`);

  // RE-RUN TEST: Run exact same batch again for November 2026
  const previewNovReRun = await previewBulkInvoiceGeneration({ schoolId }, futureParams);
  assert.strictEqual(
    previewNovReRun.newInvoicesCount,
    0,
    'Re-run preview must report 0 new invoices to create'
  );
  assert.strictEqual(
    previewNovReRun.duplicateCount,
    previewNov.newInvoicesCount,
    'Re-run preview must report all previous invoices as duplicates (skipped)'
  );

  const genResult2 = await generateBulkInvoices({ schoolId }, futureParams);
  assert.strictEqual(
    genResult2.createdCount,
    0,
    'Re-running generation MUST create 0 new invoices (acceptance criteria)'
  );
  assert.strictEqual(
    genResult2.skippedCount,
    genResult1.createdCount,
    'All invoices must be reported as skipped duplicates'
  );

  const invoicesAfterReRun = (getItem<FeeInvoice[]>(STORAGE_KEYS.FEE_INVOICES) || []).length;
  assert.strictEqual(
    invoicesAfterReRun,
    invoicesAfter,
    'Storage invoice count MUST NOT increase on re-run'
  );

  console.log('✓ Acceptance criteria verified: Re-run creates 0 duplicates and skips existing batch');

  // --- 4. Scoped Generation (Campus and Class filters) ---
  console.log('\n--- 4. Campus & Class Scoped Generation ---');

  const classes = await listClasses({ schoolId });
  const targetClass = classes[0];
  assert.ok(targetClass, 'Target class should exist');

  const classScopedParams: BulkInvoiceParams = {
    billingMonth: '2026-12',
    dueDate: '2026-12-10',
    classId: targetClass.id,
  };

  const classPreview = await previewBulkInvoiceGeneration({ schoolId }, classScopedParams);
  assert.ok(classPreview.newInvoicesCount > 0, 'Class scoped preview should have items');
  for (const item of classPreview.items) {
    assert.strictEqual(item.classId, targetClass.id, 'All preview items must belong to target class');
  }

  const classGen = await generateBulkInvoices({ schoolId }, classScopedParams);
  assert.strictEqual(
    classGen.createdCount,
    classPreview.newInvoicesCount,
    'Class scoped creation count must match class preview'
  );

  console.log(`✓ Class-scoped invoice generation verified (${classGen.createdCount} invoices for class ${targetClass.grade} - ${targetClass.section})`);

  // --- 5. Component SSR Rendering Tests ---
  console.log('\n--- 5. Component SSR Rendering Tests ---');

  const [testInvoices, testStudents, testUsers, testCampuses, testStructures] = await Promise.all([
    listFeeInvoices({ schoolId }),
    listActiveStudents({ schoolId }),
    listUsers({ schoolId }),
    listCampuses({ schoolId }),
    listFeeStructures({ schoolId }),
  ]);

  const studentsMap = new Map<string, Student>(testStudents.map((s) => [s.id, s]));
  const usersMap = new Map(testUsers.map((u) => [u.id, u]));
  const classesMap = new Map(classes.map((c) => [c.id, c]));
  const campusesMap = new Map(testCampuses.map((c) => [c.id, c]));
  const feeStructuresMap = new Map<string, FeeStructure>(testStructures.map((f) => [f.id, f]));

  const html = renderToString(
    React.createElement(InvoicesTable, {
      invoices: testInvoices.slice(0, 10),
      studentsMap,
      usersMap,
      classesMap,
      campusesMap,
      feeStructuresMap,
      isLoading: false,
    })
  );

  assert.ok(html.includes('Invoice #'), 'Table should render header "Invoice #"');
  assert.ok(html.includes('Status'), 'Table should render "Status"');
  assert.ok(html.includes('Due Date'), 'Table should render "Due Date"');

  console.log('✓ InvoicesTable component SSR rendering verified');

  console.log('\n========================================');
  console.log('ALL TASK-041 BULK INVOICES TESTS PASSED! ✅');
  console.log('========================================\n');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
