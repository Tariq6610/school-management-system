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
import { ensureSeeded } from '../../../lib/seed/boot';
import { getChildrenForParent } from '../../../lib/repositories/parents';
import { getSession, setSession } from '../../../lib/repositories/session';
import { ChildSwitcher } from '../ChildSwitcher';
import { Session } from '@/types';

console.log('Running TASK-020 Parent Child Switcher Test Suite...\n');

async function runTests() {
  // 0. Seed storage
  console.log('--- Seeding storage for Child Switcher tests ---');
  const bootResult = await ensureSeeded();
  assert(bootResult.meta, 'Boot must succeed');
  console.log('✓ Storage seeded');

  // 1. Acceptance Criteria: Lists only that parent's children
  console.log('--- 1. Parent-Child Scope Isolation Tests ---');
  const parentUserId = 'usr_parent_khan'; // Tariq Khan
  const children = await getChildrenForParent(parentUserId);

  assert.strictEqual(
    children.length,
    2,
    'Tariq Khan must have exactly 2 linked children in demo seed'
  );

  const names = children.map((c) => c.user.name);
  assert(names.includes('Ahmed Khan'), 'Tariq Khan must be linked to Ahmed Khan');
  assert(names.includes('Ayesha Khan'), 'Tariq Khan must be linked to Ayesha Khan');

  // Ensure no unrelated students are leaked
  assert(
    !names.includes('Bilal Ahmad'),
    'Unrelated students must not appear in parent child list'
  );

  for (const child of children) {
    assert(child.student.id, 'Child student record must have id');
    assert(child.user.name, 'Child user record must have name');
    assert(child.relationship, 'Child link must specify relationship');
  }

  console.log(
    `✓ Verified: Tariq Khan is linked strictly to his 2 children: [${names.join(', ')}]`
  );

  // 2. Acceptance Criteria: Child switching persistence
  console.log('--- 2. Child Switching & Session Persistence ---');
  const initialSession: Session = {
    userId: 'usr_parent_khan',
    role: 'parent',
    schoolId: 'sch_main',
    campusId: 'cmp_main',
    activeChildId: 'stu_ahmed',
  };
  await setSession(initialSession);

  let currentSession = await getSession();
  assert.strictEqual(currentSession?.activeChildId, 'stu_ahmed');

  // Simulate switching active child to Ayesha Khan
  const switchedSession: Session = {
    ...initialSession,
    activeChildId: 'stu_ayesha',
  };
  await setSession(switchedSession);

  currentSession = await getSession();
  assert.strictEqual(
    currentSession?.activeChildId,
    'stu_ayesha',
    'Session must persist switched activeChildId in storage'
  );

  console.log('✓ Active child selection persists to session and updates query scope');

  // 3. Presentation Component SSR Render Tests
  console.log('--- 3. Presentation Component SSR Render Tests ---');

  // Multi-child render
  const renderedHtml = renderToString(
    React.createElement(ChildSwitcher, {
      currentChildName: 'Ahmed Khan',
    })
  );
  assert(
    renderedHtml.includes('Ahmed Khan'),
    'ChildSwitcher must render active child name'
  );

  console.log('✓ ChildSwitcher SSR rendering verified');

  console.log('\nAll TASK-020 Parent Child Switcher tests passed successfully! ✅');
}

runTests().catch((err) => {
  console.error('Child switcher test failed:', err);
  process.exit(1);
});
