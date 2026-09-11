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
import { getSession } from '../../repositories/session';
import {
  DEMO_ACCOUNTS,
  getRoleDashboardRoute,
  signIn,
  signOut,
} from '../auth';

console.log('Running TASK-015 Authentication & Login Test Suite...\n');

async function runTests() {
  // Ensure storage is seeded with test network data
  console.log('--- Seeding storage for auth tests ---');
  await ensureSeeded();
  console.log('✓ Storage seeded');

  // 1. Demo accounts configuration test
  console.log('--- 1. Demo Accounts Configuration Tests ---');
  assert.strictEqual(DEMO_ACCOUNTS.length, 6, 'Must contain exactly 6 demo accounts');

  const expectedEmails = [
    'superadmin@abcschool.pk',
    'admin@abcschool.pk',
    'principal.main@abcschool.pk',
    'teacher.sana@abcschool.pk',
    'parent.khan@abcschool.pk',
    'student.ahmed@abcschool.pk',
  ];

  for (const email of expectedEmails) {
    const found = DEMO_ACCOUNTS.find((acc) => acc.email === email);
    assert(found, `Demo accounts must include ${email}`);
  }
  console.log('✓ All 6 required demo accounts verified per FEATURE_SPECIFICATIONS.md §1');

  // 2. Dashboard routing per role test
  console.log('--- 2. Dashboard Route Mapping Tests ---');
  assert.strictEqual(getRoleDashboardRoute('super_admin'), '/super-admin/dashboard');
  assert.strictEqual(getRoleDashboardRoute('school_admin'), '/admin/dashboard');
  assert.strictEqual(getRoleDashboardRoute('principal'), '/principal/dashboard');
  assert.strictEqual(getRoleDashboardRoute('teacher'), '/teacher/dashboard');
  assert.strictEqual(getRoleDashboardRoute('parent'), '/parent/dashboard');
  assert.strictEqual(getRoleDashboardRoute('student'), '/student/dashboard');
  console.log('✓ Role dashboard routes verified per ROUTE_STRUCTURE.md');

  // 3. Validation tests
  console.log('--- 3. Validation Tests ---');
  const emptyEmailRes = await signIn('', 'any-password');
  assert.strictEqual(emptyEmailRes.success, false);
  assert(emptyEmailRes.error?.includes('email'));

  const emptyPasswordRes = await signIn('admin@abcschool.pk', '');
  assert.strictEqual(emptyPasswordRes.success, false);
  assert(emptyPasswordRes.error?.includes('Password is required'));

  const unknownEmailRes = await signIn('nonexistent@abcschool.pk', 'password123');
  assert.strictEqual(unknownEmailRes.success, false);
  assert(unknownEmailRes.error?.includes('No account found'));
  console.log('✓ Input validation and password requirement verified');

  // 4. Successful login and session creation for all 6 accounts
  console.log('--- 4. Sign-in & Session Creation Tests ---');
  for (const acc of DEMO_ACCOUNTS) {
    const res = await signIn(acc.email, 'password-demo');
    if (!res.success) {
      console.error(`Sign in error for ${acc.email}:`, res.error);
    }
    assert.strictEqual(res.success, true, `Sign in must succeed for ${acc.email}: ${res.error}`);
    assert(res.session, 'Session must be returned on successful sign in');
    assert.strictEqual(res.session?.role, acc.role, 'Session role must match user role');
    assert.strictEqual(res.redirectTo, getRoleDashboardRoute(acc.role), 'Redirect must match role dashboard');

    const storedSession = await getSession();
    assert.strictEqual(storedSession?.userId, res.session?.userId, 'Session must be written to storage');
  }

  // 5. Parent active child resolution test
  console.log('--- 5. Parent Two-Children Link Test ---');
  const parentRes = await signIn('parent.khan@abcschool.pk', 'demo-password');
  assert.strictEqual(parentRes.success, true);
  assert(
    parentRes.session?.activeChildId,
    'Parent session must populate activeChildId for child-switcher'
  );
  assert(
    ['stu_ahmed', 'stu_ayesha'].includes(parentRes.session?.activeChildId ?? ''),
    'Parent activeChildId must be one of the parent’s enrolled children'
  );
  console.log('✓ Parent activeChildId correctly populated for multi-child account');

  // 6. Sign out test
  console.log('--- 6. Sign Out Test ---');
  await signOut();
  const sessionAfterSignOut = await getSession();
  assert.strictEqual(sessionAfterSignOut, null, 'Session must be null after signOut()');
  console.log('✓ Sign out clears session from storage');

  console.log('\nAll TASK-015 Authentication tests passed successfully!');
}

runTests().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});
