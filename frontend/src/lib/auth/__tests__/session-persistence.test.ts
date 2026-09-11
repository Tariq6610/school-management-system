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

import { ensureSeeded } from '../../seed';
import { getSession, setSession } from '../../repositories/session';
import { getUser } from '../../repositories/users';
import { signIn, signOut } from '../auth';

console.log('Running TASK-016 Session Persistence & Sign Out Test Suite...\n');

async function runTests() {
  // Ensure seeded
  await ensureSeeded();
  console.log('✓ Storage seeded');

  // 1. Initial Login & Session Creation
  console.log('--- 1. Login & Initial Storage Persistence ---');
  const loginRes = await signIn('teacher.sana@abcschool.pk', 'password-123');
  assert.strictEqual(loginRes.success, true, 'Teacher login must succeed');
  assert(loginRes.session, 'Session must exist');

  const rawStorageSession = await getSession();
  assert(rawStorageSession, 'Session must be persisted in storage');
  assert.strictEqual(rawStorageSession.userId, 'usr_teacher_sana');
  assert.strictEqual(rawStorageSession.role, 'teacher');
  assert.strictEqual(rawStorageSession.campusId, 'cmp_main');
  console.log('✓ Session written to storage on login');

  // 2. Refresh Persistence Simulation (Acceptance criterion: Refresh keeps the session)
  console.log('--- 2. Simulated Page Refresh / Re-hydration ---');
  // Re-read directly from storage as if a new page reloaded
  const refreshedSession = await getSession();
  assert(refreshedSession, 'Session must survive page refresh / rehydration');
  assert.strictEqual(refreshedSession.userId, rawStorageSession.userId);
  assert.strictEqual(refreshedSession.role, 'teacher');

  const hydratedUser = await getUser(refreshedSession.userId);
  assert(hydratedUser, 'User record must be resolved from stored session on refresh');
  assert.strictEqual(hydratedUser.name, 'Sana Malik');
  assert.strictEqual(hydratedUser.email, 'teacher.sana@abcschool.pk');
  console.log('✓ Session and user rehydrated successfully without re-login');

  // 3. Campus Switcher Persistence
  console.log('--- 3. Campus Switcher Persistence Across Refresh ---');
  const switchedSession = { ...refreshedSession, campusId: 'cmp_north' };
  await setSession(switchedSession);

  // Re-read as if page refreshed after campus switch
  const reloadedSwitchedSession = await getSession();
  assert.strictEqual(
    reloadedSwitchedSession?.campusId,
    'cmp_north',
    'Campus switch must persist across page refresh'
  );
  console.log('✓ Switched campus persisted in session');

  // 4. Parent Child Switcher Persistence
  console.log('--- 4. Parent Child Switcher Persistence Across Refresh ---');
  const parentLogin = await signIn('parent.khan@abcschool.pk', 'password-123');
  assert.strictEqual(parentLogin.success, true);
  const initialChild = parentLogin.session?.activeChildId;
  assert(initialChild, 'Parent session must have an active child');

  const targetChild = initialChild === 'stu_ahmed' ? 'stu_ayesha' : 'stu_ahmed';
  const updatedParentSession = { ...parentLogin.session!, activeChildId: targetChild };
  await setSession(updatedParentSession);

  // Re-read as if page refreshed
  const reloadedParentSession = await getSession();
  assert.strictEqual(
    reloadedParentSession?.activeChildId,
    targetChild,
    'Selected child must persist across refresh'
  );
  console.log('✓ Switched child persisted across refresh');

  // 5. Sign Out Clears Session (Acceptance criterion: Sign out clears it)
  console.log('--- 5. Sign Out Storage Clearance ---');
  await signOut();

  const sessionAfterSignOut = await getSession();
  assert.strictEqual(sessionAfterSignOut, null, 'Session must be null immediately after signOut()');

  // Re-read as if page refreshed after sign out
  const reloadedAfterSignOut = await getSession();
  assert.strictEqual(
    reloadedAfterSignOut,
    null,
    'Session must remain null across refresh after signing out'
  );
  console.log('✓ Sign out completely purged session from storage');

  console.log('\nAll TASK-016 Session Persistence & Sign Out tests passed successfully!');
}

runTests().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});
