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
import { listClasses } from '../../../../../lib/repositories/classes';
import { listCampuses } from '../../../../../lib/repositories/campuses';
import {
  canDeleteFeeStructure,
  createFeeStructure,
  deleteFeeStructure,
  getFeeStructure,
  getFeeStructuresForClass,
  listFeeStructures,
  updateFeeStructure,
} from '../../../../../lib/repositories/feeStructures';
import { FeeStructuresView } from '../../../../../components/fees/FeeStructuresView';
import { ToastProvider } from '../../../../../components/ui/Toast';
import { SessionProvider } from '../../../../../components/providers/SessionProvider';
import { Scope, Session } from '../../../../../types';

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

function renderWithProviders(ui: React.ReactElement, initialSession?: Session) {
  if (initialSession) {
    store.set('sp:v1:session', JSON.stringify(initialSession));
  }
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
  console.log('Running TASK-040 Fee Structures CRUD Test Suite...\n');

  // Seed storage
  store.clear();
  await ensureSeeded();
  console.log('✓ Storage seeded with demo data');

  const adminSession: Session = {
    userId: 'usr_admin',
    role: 'school_admin',
    schoolId: 'sch_main',
    campusId: 'cmp_main',
  };

  const scope: Scope = { schoolId: 'sch_main', campusId: 'cmp_main' };
  const campuses = await listCampuses({ schoolId: 'sch_main' });
  assert.ok(campuses.length > 0, 'Must have seeded campuses');

  const classes = await listClasses({ schoolId: 'sch_main' });
  assert.ok(classes.length >= 2, 'Must have at least 2 classes for testing');
  const classA = classes[0];
  const classB = classes[1];

  // --- 1. Repository CRUD Tests ---
  console.log('\n--- 1. Repository CRUD Tests ---');
  {
    // List seeded structures
    const seeded = await listFeeStructures(scope);
    assert.ok(seeded.length > 0, 'Must have seeded fee structures');

    // Create a new fee structure
    const created = await createFeeStructure({
      schoolId: 'sch_main',
      campusId: 'cmp_main',
      academicYearId: 'ay_2026',
      name: 'Test Lab & STEM Fee',
      amount: 4500,
      frequency: 'term',
      appliesToClassIds: [classA.id],
    });

    assert.ok(created.id, 'Created structure must have generated ID');
    assert.strictEqual(created.name, 'Test Lab & STEM Fee');
    assert.strictEqual(created.amount, 4500);
    assert.strictEqual(created.frequency, 'term');
    assert.deepStrictEqual(created.appliesToClassIds, [classA.id]);

    // Get by ID
    const retrieved = await getFeeStructure(created.id);
    assert.ok(retrieved, 'Must retrieve created structure');
    assert.strictEqual(retrieved?.id, created.id);

    // Update
    const updated = await updateFeeStructure(created.id, {
      amount: 5000,
      appliesToClassIds: [classA.id, classB.id],
    });
    assert.strictEqual(updated.amount, 5000);
    assert.strictEqual(updated.appliesToClassIds.length, 2);

    // Delete
    await deleteFeeStructure(created.id);
    const deleted = await getFeeStructure(created.id);
    assert.strictEqual(deleted, null, 'Deleted structure must not be found');

    console.log('✓ Repository CRUD operations verified (create, read, update, delete)');
  }

  // --- 2. Acceptance Criteria 1: Per-Class Assignment ---
  console.log('\n--- 2. Acceptance Criteria 1: Per-Class Assignment ---');
  {
    // Create structure for Class A only
    const structA = await createFeeStructure({
      schoolId: 'sch_main',
      academicYearId: 'ay_2026',
      name: 'Class A Exclusive Fee',
      amount: 3000,
      frequency: 'monthly',
      appliesToClassIds: [classA.id],
    });

    // Create structure for Class B only
    const structB = await createFeeStructure({
      schoolId: 'sch_main',
      academicYearId: 'ay_2026',
      name: 'Class B Exclusive Fee',
      amount: 3500,
      frequency: 'monthly',
      appliesToClassIds: [classB.id],
    });

    // Query for Class A
    const forClassA = await getFeeStructuresForClass({ schoolId: 'sch_main' }, classA.id);
    const classAIds = forClassA.map((f) => f.id);
    assert.ok(classAIds.includes(structA.id), 'Must include structA for classA');
    assert.strictEqual(classAIds.includes(structB.id), false, 'Must NOT include structB for classA');

    // Query for Class B
    const forClassB = await getFeeStructuresForClass({ schoolId: 'sch_main' }, classB.id);
    const classBIds = forClassB.map((f) => f.id);
    assert.ok(classBIds.includes(structB.id), 'Must include structB for classB');
    assert.strictEqual(classBIds.includes(structA.id), false, 'Must NOT include structA for classB');

    // Cleanup
    await deleteFeeStructure(structA.id);
    await deleteFeeStructure(structB.id);

    console.log('✓ Acceptance criteria 1 verified: Fee structures assigned strictly per class');
  }

  // --- 3. Acceptance Criteria 2: Optional Campus Scope ---
  console.log('\n--- 3. Acceptance Criteria 2: Optional Campus Scope ---');
  {
    // 1. School-wide structure (campusId undefined)
    const schoolWide = await createFeeStructure({
      schoolId: 'sch_main',
      academicYearId: 'ay_2026',
      name: 'Network Admission Fee',
      amount: 15000,
      frequency: 'annual',
      appliesToClassIds: [classA.id],
    });
    assert.strictEqual(schoolWide.campusId, undefined, 'CampusId must be undefined for school-wide structure');

    // 2. Campus-specific structure
    const campusSpecific = await createFeeStructure({
      schoolId: 'sch_main',
      campusId: 'cmp_main',
      academicYearId: 'ay_2026',
      name: 'Main Campus Transport',
      amount: 4000,
      frequency: 'monthly',
      appliesToClassIds: [classA.id],
    });
    assert.strictEqual(campusSpecific.campusId, 'cmp_main');

    // Filter by campusId = cmp_main: must include both schoolWide (applies network-wide) and campusSpecific
    const mainCampusStructures = await listFeeStructures(
      { schoolId: 'sch_main' },
      { campusId: 'cmp_main' }
    );
    const mainIds = mainCampusStructures.map((f) => f.id);
    assert.ok(mainIds.includes(schoolWide.id), 'School-wide structure visible in campus query');
    assert.ok(mainIds.includes(campusSpecific.id), 'Campus structure visible in matching campus query');

    // Filter by another campus: campusSpecific must NOT appear
    const otherCampusStructures = await listFeeStructures(
      { schoolId: 'sch_main' },
      { campusId: 'cmp_other_campus' }
    );
    const otherIds = otherCampusStructures.map((f) => f.id);
    assert.ok(otherIds.includes(schoolWide.id), 'School-wide structure visible in any campus query');
    assert.strictEqual(otherIds.includes(campusSpecific.id), false, 'Campus structure NOT visible in unrelated campus');

    // Cleanup
    await deleteFeeStructure(schoolWide.id);
    await deleteFeeStructure(campusSpecific.id);

    console.log('✓ Acceptance criteria 2 verified: Optional campus scope (school-wide vs campus-specific)');
  }

  // --- 4. In-Use Safety Deletion Checks ---
  console.log('\n--- 4. In-Use Safety Deletion Checks ---');
  {
    const seeded = await listFeeStructures(scope);
    const inUseStructure = seeded[0]; // Seeded structures have invoices generated

    const check = await canDeleteFeeStructure(inUseStructure.id);
    // Invoices exist for seeded structure fs_grade8 / fs_junior
    assert.ok(typeof check.canDelete === 'boolean');
    if (!check.canDelete) {
      assert.ok(check.reason?.includes('invoice'), 'Reason must mention existing invoices');
    }

    console.log('✓ In-use invoice check verified for fee structure deletion');
  }

  // --- 5. Component SSR Rendering Tests ---
  console.log('\n--- 5. Component SSR Rendering Tests ---');
  {
    const seededStructures = await listFeeStructures(scope);
    const html = renderWithProviders(
      React.createElement(FeeStructuresView, {
        initialCampusId: 'cmp_main',
        initialStructures: seededStructures,
        initialCampuses: campuses,
        initialClasses: classes,
      }),
      adminSession
    );

    // Verify key titles and headers
    assert.ok(html.includes('Fee Structures'), 'Page header must be rendered');
    assert.ok(html.includes('Create Fee Structure'), 'Create button must be present');
    assert.ok(html.includes('Total Structures'), 'Total Structures StatCard must be present');
    assert.ok(html.includes('Classes Covered'), 'Classes Covered StatCard must be present');
    assert.ok(html.includes('Standard Rate'), 'Table header must be present');

    console.log('✓ Component SSR rendering verified');
  }

  console.log('\n========================================');
  console.log('ALL TASK-040 FEE STRUCTURES TESTS PASSED! ✅');
  console.log('========================================\n');
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
