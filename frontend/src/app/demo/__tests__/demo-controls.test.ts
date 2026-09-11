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
import { ensureSeeded, forceReseed } from '../../../lib/seed/boot';
import { DEMO_ACCOUNTS, getRoleDashboardRoute } from '../../../lib/auth/auth';
import { ToastProvider } from '../../../components/ui/Toast';
import { SessionProvider } from '../../../components/providers/SessionProvider';
import DemoResetPage from '../reset/page';
import DemoSwitchRolePage from '../switch-role/page';

console.log('Running TASK-021 Demo Controls (Reset Data, Switch Role) Test Suite...\n');

// Mock AppRouterContext for Next.js App Router hooks
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
  // 0. Seed storage
  console.log('--- 1. Seed & Reset Verification ---');
  await ensureSeeded();

  // Test forceReseed wipes and repopulates
  const resetResult = await forceReseed();
  assert(resetResult.reseeded, 'forceReseed must set reseeded: true');
  assert(resetResult.meta, 'Metadata must exist after forceReseed');
  assert(resetResult.usage.bytes > 0, 'Storage usage must be positive after forceReseed');
  console.log('✓ Data reset (forceReseed) successfully wipes and repopulates demo network');

  // 1. Acceptance Criteria: Both labelled as prototype-only on screen
  console.log('--- 2. On-Screen Prototype-Only Labelling Verification ---');

  // SSR Render /demo/reset
  const resetHtml = renderToString(
    React.createElement(
      AppRouterContext.Provider,
      { value: mockRouter },
      React.createElement(
        ToastProvider,
        null,
        React.createElement(SessionProvider, null, React.createElement(DemoResetPage))
      )
    )
  );
  assert(
    resetHtml.includes('PROTOTYPE ONLY'),
    '/demo/reset must display PROTOTYPE ONLY badge'
  );
  assert(
    resetHtml.includes('prototype-only developer control') ||
      resetHtml.includes('Evaluation Affordance'),
    '/demo/reset must explain prototype-only nature'
  );
  assert(
    resetHtml.includes('Reset All Data to Seed'),
    '/demo/reset must provide reset button'
  );

  // SSR Render /demo/switch-role
  const switchRoleHtml = renderToString(
    React.createElement(
      AppRouterContext.Provider,
      { value: mockRouter },
      React.createElement(
        ToastProvider,
        null,
        React.createElement(SessionProvider, null, React.createElement(DemoSwitchRolePage))
      )
    )
  );
  assert(
    switchRoleHtml.includes('DEMO AFFORDANCE ONLY'),
    '/demo/switch-role must display DEMO AFFORDANCE ONLY badge'
  );
  assert(
    switchRoleHtml.includes('prototype tool for exploring multi-role workflows'),
    '/demo/switch-role must state it is an evaluation tool'
  );

  console.log('✓ Both /demo/reset and /demo/switch-role are prominently labelled as prototype-only on screen');

  // 2. Acceptance Criteria: All 6 demo accounts accessible
  console.log('--- 3. Demo Role Switch Accounts Verification ---');
  assert.strictEqual(DEMO_ACCOUNTS.length, 6, 'Must have exactly 6 demo accounts');

  const expectedRoles = [
    'super_admin',
    'school_admin',
    'principal',
    'teacher',
    'parent',
    'student',
  ];

  for (const role of expectedRoles) {
    const acc = DEMO_ACCOUNTS.find((a) => a.role === role);
    assert(acc, `Demo account for role ${role} must exist`);
    assert(switchRoleHtml.includes(acc.name), `Switch role page must render account for ${acc.name}`);
    const dash = getRoleDashboardRoute(acc.role);
    assert(dash.startsWith('/'), `Role ${acc.role} must map to a valid dashboard route: ${dash}`);
  }

  console.log('✓ All 6 demo accounts verified with explicit role mappings');

  console.log('\nAll TASK-021 Demo Controls tests passed successfully! ✅');
}

runTests().catch((err) => {
  console.error('Demo controls test failed:', err);
  process.exit(1);
});
