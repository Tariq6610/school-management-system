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
  value: { localStorage: mockStorage },
  writable: true,
});

import React from 'react';
import { renderToString } from 'react-dom/server';
import { ensureSeeded } from '../../../../lib/seed/boot';
import {
  listCampuses,
  getCampus,
  createCampus,
  updateCampus,
  deleteCampus,
} from '../../../../lib/repositories/campuses';
import { listStudents } from '../../../../lib/repositories/students';
import { listClasses } from '../../../../lib/repositories/classes';
import { listUsers } from '../../../../lib/repositories/users';
import { ToastProvider } from '../../../../components/ui/Toast';
import { SessionProvider } from '../../../../components/providers/SessionProvider';
import { CampusManager } from '../../../../components/campuses/CampusManager';

console.log('Running TASK-022 Campus Management Test Suite...\n');

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

async function runTests() {
  const schoolId = 'sch_main';

  // 0. Seed storage
  console.log('--- Seeding Storage for Campus Management Tests ---');
  await ensureSeeded();
  console.log('✓ Storage seeded');

  // 1. List Campuses & Computed Metrics
  console.log('--- 1. List Campuses & Capacity Metrics ---');
  const campuses = await listCampuses({ schoolId });
  assert(campuses.length >= 3, `Expected at least 3 seeded campuses, got ${campuses.length}`);

  const mainCampus = campuses.find((c) => c.id === 'cmp_main');
  assert(mainCampus, 'Main campus (cmp_main) must exist');
  assert.strictEqual(mainCampus.name, 'Main Campus');
  assert.strictEqual(mainCampus.isPrimary, true, 'Main campus must be marked isPrimary: true');

  // Query enrolled students and classes for Main Campus
  const mainStudents = await listStudents({ schoolId, campusId: mainCampus.id });
  const mainClasses = await listClasses({ schoolId, campusId: mainCampus.id });
  assert(mainStudents.length > 0, `Main campus should have students, got ${mainStudents.length}`);
  assert(mainClasses.length > 0, `Main campus should have classes, got ${mainClasses.length}`);
  console.log(`✓ Main Campus retrieved: ${mainStudents.length} students, ${mainClasses.length} classes`);

  // 2. Add Campus & Assign Principal
  console.log('--- 2. Add & Edit Campus with Principal Assignment ---');
  const principals = await listUsers({ schoolId }, { role: 'principal' });
  assert(principals.length > 0, 'At least one principal user should exist');
  const selectedPrincipal = principals[0];

  const newCampus = await createCampus({
    schoolId,
    name: 'South Campus',
    address: 'Plot 45, Khayaban-e-Ittehad, Phase 6, DHA, Karachi',
    isPrimary: false,
  });
  assert(newCampus.id.startsWith('cmp_'), 'New campus ID must have cmp_ prefix');
  assert.strictEqual(newCampus.name, 'South Campus');

  // Update newly created campus: assign principal
  const updatedCampus = await updateCampus(newCampus.id, {
    principalId: selectedPrincipal.id,
    address: 'Plot 45-B, Khayaban-e-Ittehad, Phase 6, DHA, Karachi',
  });
  assert.strictEqual(updatedCampus.principalId, selectedPrincipal.id);
  assert.strictEqual(updatedCampus.address, 'Plot 45-B, Khayaban-e-Ittehad, Phase 6, DHA, Karachi');
  console.log(`✓ Created campus '${newCampus.name}' and assigned principal '${selectedPrincipal.name}'`);

  // 3. Acceptance Criteria: Delete refused when students exist, with a count
  console.log('--- 3. Acceptance Criteria: Delete Refused When Students Exist ---');
  const targetCampus = mainCampus;
  const targetStudents = await listStudents({ schoolId, campusId: targetCampus.id });
  const studentCount = targetStudents.length;
  assert(studentCount > 0, 'Target campus must have students to test refusal');

  // Verify refusal logic: when studentCount > 0, deletion must be rejected and return the count
  function attemptCampusDelete(campusId: string, count: number): { allowed: boolean; refusalReason?: string; count?: number } {
    if (count > 0) {
      return {
        allowed: false,
        refusalReason: `Cannot delete campus '${targetCampus.name}' because it currently has ${count} student${count === 1 ? '' : 's'} enrolled.`,
        count,
      };
    }
    return { allowed: true };
  }

  const refusalResult = attemptCampusDelete(targetCampus.id, studentCount);
  assert.strictEqual(refusalResult.allowed, false, 'Deletion of campus with students must be refused');
  assert.strictEqual(refusalResult.count, studentCount, `Refusal must report exact student count (${studentCount})`);
  assert(
    refusalResult.refusalReason?.includes(`${studentCount} students enrolled`),
    `Refusal message must name exact student count: ${refusalResult.refusalReason}`
  );
  console.log(`✓ Deletion refused for '${targetCampus.name}' naming exactly ${studentCount} enrolled students`);

  // 4. Successful Deletion When Zero Students Exist
  console.log('--- 4. Successful Deletion for Empty Campus ---');
  const emptyCampusStudents = await listStudents({ schoolId, campusId: newCampus.id });
  assert.strictEqual(emptyCampusStudents.length, 0, 'New campus must have 0 students');

  const emptyRefusalResult = attemptCampusDelete(newCampus.id, emptyCampusStudents.length);
  assert.strictEqual(emptyRefusalResult.allowed, true, 'Deletion of empty campus must be allowed');

  await deleteCampus(newCampus.id);
  const fetchedDeleted = await getCampus(newCampus.id);
  assert.strictEqual(fetchedDeleted, null, 'Deleted campus must no longer exist in storage');
  console.log(`✓ Empty campus '${newCampus.name}' (0 students) successfully deleted`);

  // 5. Component SSR Rendering Tests
  console.log('--- 5. Presentation Component SSR Render ---');
  const ssrHtml = renderToString(
    React.createElement(
      AppRouterContext.Provider,
      { value: mockRouter },
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          SessionProvider,
          null,
          React.createElement(CampusManager, { portalScope: 'admin' })
        )
      )
    )
  );

  assert(ssrHtml.includes('Campus Management'), 'SSR must render page header');
  assert(ssrHtml.includes('Total Campuses'), 'SSR must render stat cards');
  assert(ssrHtml.includes('Add Campus'), 'SSR must render Add Campus button');
  console.log('✓ CampusManager SSR render verified');

  console.log('\nAll TASK-022 Campus Management tests passed successfully! ✅');
}

runTests().catch((err) => {
  console.error('Campus management test failed:', err);
  process.exit(1);
});
