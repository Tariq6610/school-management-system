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
  listParents,
  listEnrichedParents,
  createParentWithUser,
} from '../../../../lib/repositories/parents';
import {
  linkStudentParent,
  unlinkStudentParent,
  setPrimaryGuardian,
  getParentsForStudent,
  getSiblingsForStudent,
} from '../../../../lib/repositories/studentParents';
import { listStudents } from '../../../../lib/repositories/students';
import { ToastProvider } from '../../../../components/ui/Toast';
import { SessionProvider } from '../../../../components/providers/SessionProvider';
import { ParentDirectory } from '../../../../components/parents/ParentDirectory';
import { ParentProfileView } from '../../../../components/parents/ParentProfileView';

console.log('Running TASK-031 Parent Records and Student Linking Test Suite...\n');

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
  const scope = { schoolId: 'sch_main', campusId: 'cmp_main' };

  // 1. Boot seed data
  console.log('1. Seeding mock storage...');
  await ensureSeeded({ force: true });

  const parents = await listParents({ schoolId: 'sch_main' });
  assert(parents.length > 0, 'Seed should contain parents');
  console.log(`✓ Seeded ${parents.length} parents.`);

  const students = await listStudents(scope);
  assert(students.length > 0, 'Students should be seeded');

  // 2. Identify Tariq Khan and his seeded children
  console.log('2. Verifying Tariq Khan and seeded children...');
  const enrichedParents = await listEnrichedParents(scope);
  const tariq = enrichedParents.find((p) => p.user.name.includes('Tariq'));
  assert(tariq, 'Tariq Khan parent record should exist in seed');

  console.log(`✓ Found parent: ${tariq.user.name}, children count: ${tariq.children.length}`);
  assert(tariq.children.length >= 2, 'Tariq Khan should have at least 2 children (Ahmed and Ayesha)');

  const ahmedChild = tariq.children.find((c) => c.user.name.includes('Ahmed'));
  const ayeshaChild = tariq.children.find((c) => c.user.name.includes('Ayesha'));
  assert(ahmedChild, 'Ahmed Khan should be linked to Tariq');
  assert(ayeshaChild, 'Ayesha Khan should be linked to Tariq');
  console.log(`✓ Confirmed children: ${ahmedChild.user.name} and ${ayeshaChild.user.name}`);

  // 3. Test Sibling Case (Acceptance Criteria: Sibling case works bidirectionally)
  console.log('3. Testing Sibling Resolution across shared parent links...');
  const ahmedSiblings = await getSiblingsForStudent(ahmedChild.student.id);
  assert(
    ahmedSiblings.some((s) => s.student.id === ayeshaChild.student.id),
    'Ahmed should have Ayesha as a detected sibling'
  );
  console.log(`✓ Ahmed's sibling detected: ${ahmedSiblings[0].user.name}, shared parents: ${ahmedSiblings[0].sharedParentNames.join(', ')}`);

  const ayeshaSiblings = await getSiblingsForStudent(ayeshaChild.student.id);
  assert(
    ayeshaSiblings.some((s) => s.student.id === ahmedChild.student.id),
    'Ayesha should have Ahmed as a detected sibling'
  );
  console.log(`✓ Ayesha's sibling detected: ${ayeshaSiblings[0].user.name}, shared parents: ${ayeshaSiblings[0].sharedParentNames.join(', ')}`);

  // 4. Test Many-to-Many Linking: Create a second parent (Mother: Saima Tariq) and link to both children
  console.log('4. Testing Many-to-Many Linking (Adding second parent to same students)...');
  const saima = await createParentWithUser(
    {
      name: 'Saima Tariq',
      email: 'saima.tariq@example.com',
      phone: '+92 300 9876543',
      occupation: 'Pediatrician',
    },
    scope
  );

  // Link Saima to Ahmed as mother
  await linkStudentParent(ahmedChild.student.id, saima.parent.id, 'mother', false);
  // Link Saima to Ayesha as mother
  await linkStudentParent(ayeshaChild.student.id, saima.parent.id, 'mother', false);

  const ahmedParents = await getParentsForStudent(ahmedChild.student.id);
  assert.strictEqual(ahmedParents.length, 2, 'Ahmed should now have 2 linked parents (Father + Mother)');
  console.log(`✓ Ahmed now has ${ahmedParents.length} linked parents: ${ahmedParents.map((p) => `${p.user.name} (${p.relationship})`).join(', ')}`);

  // 5. Test Dual-Parent Sibling Deduplication:
  // Ahmed and Ayesha now share BOTH Tariq (Father) and Saima (Mother).
  // Sibling list should STILL contain Ayesha exactly ONCE, but with both parents in sharedParentNames!
  console.log('5. Testing Sibling Deduplication with multiple shared parents...');
  const ahmedSiblingsAfterSaima = await getSiblingsForStudent(ahmedChild.student.id);
  assert.strictEqual(
    ahmedSiblingsAfterSaima.filter((s) => s.student.id === ayeshaChild.student.id).length,
    1,
    'Ayesha should appear exactly ONCE in Ahmed siblings despite sharing 2 parents'
  );
  const ayeshaEntry = ahmedSiblingsAfterSaima.find((s) => s.student.id === ayeshaChild.student.id)!;
  assert(
    ayeshaEntry.sharedParentNames.length === 2,
    `Should list both shared parents, got: ${ayeshaEntry.sharedParentNames.join(', ')}`
  );
  console.log(`✓ Sibling deduplication passed: Ayesha listed once with shared parents: ${ayeshaEntry.sharedParentNames.join(' and ')}`);

  // 6. Test Primary Guardian Designation & Toggle
  console.log('6. Testing Primary Guardian toggle...');
  // Currently Tariq is primary for Ahmed
  assert.strictEqual(ahmedParents[0].parent.id, tariq.parent.id, 'Tariq should initially be primary');
  assert.strictEqual(ahmedParents[0].isPrimary, true, 'Tariq should be marked isPrimary');

  // Switch primary to Saima
  await setPrimaryGuardian(ahmedChild.student.id, saima.parent.id);
  const updatedAhmedParents = await getParentsForStudent(ahmedChild.student.id);
  const saimaLink = updatedAhmedParents.find((p) => p.parent.id === saima.parent.id)!;
  const tariqLink = updatedAhmedParents.find((p) => p.parent.id === tariq.parent.id)!;

  assert.strictEqual(saimaLink.isPrimary, true, 'Saima should now be primary guardian');
  assert.strictEqual(tariqLink.isPrimary, false, 'Tariq should now NOT be primary guardian');
  console.log('✓ Primary guardian successfully toggled to mother Saima Tariq');

  // 7. Test Unlinking Guardian
  console.log('7. Testing Unlinking Guardian...');
  await unlinkStudentParent(ahmedChild.student.id, saima.parent.id);
  const remainingAhmedParents = await getParentsForStudent(ahmedChild.student.id);
  assert.strictEqual(remainingAhmedParents.length, 1, 'Ahmed should now have 1 linked parent after unlinking Saima');
  // Since Saima was primary, Tariq should automatically be promoted back to primary
  assert.strictEqual(remainingAhmedParents[0].isPrimary, true, 'Remaining guardian should be promoted to primary');
  console.log(`✓ Unlinked successfully; promoted ${remainingAhmedParents[0].user.name} back to primary.`);

  // 8. Test Filters
  console.log('8. Testing Parent Filters...');
  const multiChildParents = await listEnrichedParents(scope, { hasMultipleChildren: true });
  assert(
    multiChildParents.some((p) => p.parent.id === tariq.parent.id),
    'Tariq should be in multi-child family filter'
  );

  const searchParents = await listEnrichedParents(scope, { search: 'tariq' });
  assert(
    searchParents.some((p) => p.parent.id === tariq.parent.id),
    'Tariq should be returned by search'
  );
  console.log('✓ Parent filters verified.');

  // 9. SSR Component Render Validation
  console.log('9. Validating SSR rendering of ParentDirectory and ParentProfileView...');
  const directoryHtml = renderToString(
    React.createElement(
      AppRouterContext.Provider,
      { value: mockRouter },
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          SessionProvider,
          null,
          React.createElement(ParentDirectory)
        )
      )
    )
  );
  assert(directoryHtml.includes('Parent &amp; Guardian Records'), 'Directory should render title');
  console.log('✓ ParentDirectory rendered successfully via SSR.');

  const profileHtml = renderToString(
    React.createElement(
      AppRouterContext.Provider,
      { value: mockRouter },
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          SessionProvider,
          null,
          React.createElement(ParentProfileView, { parentId: tariq.parent.id })
        )
      )
    )
  );
  assert(profileHtml.includes('Loading parent record') || profileHtml.includes('Parent ID'), 'Profile should render');
  console.log('✓ ParentProfileView rendered successfully via SSR.');

  console.log('\nAll TASK-031 Parent Records and Student Linking tests PASSED! 🎉\n');
}

runTests().catch((err) => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});
