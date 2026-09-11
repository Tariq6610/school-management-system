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
import { ensureSeeded } from '../../../../lib/seed/boot';
import { setSession } from '../../../../lib/repositories/session';
import {
  getParentOutreachList,
  logOutreachCall,
  getAllOutreachCalls,
} from '../../../../lib/repositories/parentOutreach';
import { EngagementOutreachList } from '../../../../components/dashboard/EngagementOutreachList';
import { LogOutreachCallModal } from '../../../../components/dashboard/LogOutreachCallModal';
import { ToastProvider } from '../../../../components/ui/Toast';
import { SessionProvider } from '../../../../components/providers/SessionProvider';

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
  console.log('--- Running TASK-077 Parent Engagement Outreach List Tests ---');

  // 1. Seed base data & establish admin session
  await ensureSeeded();
  const schoolId = 'sch_main';
  const campusId = 'cmp_main';
  const scope = { schoolId, campusId };

  await setSession({
    userId: 'usr_admin',
    role: 'school_admin',
    schoolId,
    campusId,
  });

  // 2. Fetch Parent Outreach Prompt List
  console.log('--- 1. Testing getParentOutreachList generation ---');
  const outreachList = await getParentOutreachList(scope);
  assert(Array.isArray(outreachList), 'outreachList must be an array');
  assert(outreachList.length > 0, 'Must contain outreach prompt items');

  const firstPrompt = outreachList[0];
  assert(typeof firstPrompt.parentId === 'string', 'Must have parentId');
  assert(typeof firstPrompt.familyTitle === 'string', 'Must have familyTitle');
  assert(typeof firstPrompt.promptReason === 'string', 'Must have promptReason');
  assert(typeof firstPrompt.primaryPhone === 'string', 'Must have primaryPhone');
  assert(typeof firstPrompt.daysSinceLastActivity === 'number', 'Must have daysSinceLastActivity');
  assert(Array.isArray(firstPrompt.children), 'Must have linked children array');

  // Verify sorted by daysSinceLastActivity descending
  for (let i = 0; i < outreachList.length - 1; i++) {
    assert(
      outreachList[i].daysSinceLastActivity >= outreachList[i + 1].daysSinceLastActivity,
      'List must be sorted by days since last activity descending'
    );
  }
  console.log(`✓ Outreach list verified: ${outreachList.length} families sorted by inactivity gap`);

  // 3. Strict Acceptance Criteria Invariant: No parent-visible score
  console.log('--- 2. Verifying Acceptance Criteria: No parent-visible score ---');
  for (const item of outreachList) {
    assert(!('score' in item), 'Prompt item must NOT contain any numerical engagement score');
    assert(!('rating' in item), 'Prompt item must NOT contain any percentage rating');
    assert(!('rank' in item), 'Prompt item must NOT contain any rank or scoreboard index');
  }
  console.log('✓ Invariant verified: Zero engagement scores, ratings, or rank fields in repository data');

  // 4. Test Log a Call Workflow
  console.log('--- 3. Testing Log a Call Workflow ---');
  const targetFamily = outreachList[0];
  const loggedCall = await logOutreachCall(scope, {
    parentId: targetFamily.parentId,
    familyTitle: targetFamily.familyTitle,
    contactPerson: targetFamily.parentUser.name,
    phoneNumber: targetFamily.primaryPhone,
    outcome: 'spoke_with_parent',
    notes: 'Father works night shifts; confirmed receipt of homework notices and requested WhatsApp circulars.',
    loggedByUserId: 'usr_admin',
    loggedByName: 'School Administrator',
    followUpDate: '2026-09-20',
  });

  assert(loggedCall !== null);
  assert.strictEqual(loggedCall.parentId, targetFamily.parentId);
  assert.strictEqual(loggedCall.outcome, 'spoke_with_parent');
  assert.strictEqual(loggedCall.notes, 'Father works night shifts; confirmed receipt of homework notices and requested WhatsApp circulars.');
  assert(typeof loggedCall.calledAt === 'string');

  const allCalls = await getAllOutreachCalls(scope);
  assert(allCalls.length > 0, 'Outreach calls must be stored');
  const stored = allCalls.find((c) => c.id === loggedCall.id);
  assert(stored !== undefined, 'Logged call must be present in storage');
  console.log(`✓ Logged call successfully saved for ${targetFamily.familyTitle}`);

  // Verify list immediately reflects the logged call
  const updatedList = await getParentOutreachList(scope);
  const updatedItem = updatedList.find((i) => i.parentId === targetFamily.parentId);
  assert(updatedItem !== undefined);
  assert(updatedItem.lastCallRecord !== undefined, 'Family item must now reflect lastCallRecord');
  assert.strictEqual(updatedItem.lastCallRecord.outcome, 'spoke_with_parent');
  console.log('✓ Subsequent prompt list query displays the logged call record');

  // 5. Test SSR Rendering of EngagementOutreachList
  console.log('--- 4. Testing SSR Rendering of EngagementOutreachList ---');
  const html = renderWithProviders(
    React.createElement(EngagementOutreachList, {
      initialItems: updatedList,
    })
  );

  assert(html.includes('Parent Engagement &amp; Outreach') || html.includes('Parent Engagement & Outreach'), 'Must render screen title');
  assert(html.includes('Differentiation Screen 3'), 'Must render differentiation screen badge');
  assert(html.includes('Human-Centred Operational Prompt List (No Parent Score)'), 'Must render humane design policy banner');
  assert(html.includes('Log a call'), 'Must render Log a call button action');
  assert(html.includes('WhatsApp'), 'Must render WhatsApp quick action');
  assert(html.includes(targetFamily.familyTitle), 'Must render family title');

  // Strict invariant: Ensure no score or ranking appears in HTML
  assert(!html.includes('Engagement Score'), 'HTML must NEVER display an Engagement Score label');
  assert(!html.includes('Parent Ranking'), 'HTML must NEVER display a Parent Ranking label');
  console.log('✓ SSR Rendering of EngagementOutreachList verified (Zero scores in HTML output)');

  // 6. Test SSR Rendering of LogOutreachCallModal
  console.log('--- 5. Testing SSR Rendering of LogOutreachCallModal ---');
  const modalHtml = renderWithProviders(
    React.createElement(LogOutreachCallModal, {
      isOpen: true,
      onClose: () => {},
      promptItem: targetFamily,
      onSuccess: () => {},
    })
  );

  assert(modalHtml.includes('Log Outreach Call'), 'Modal must render header');
  assert(modalHtml.includes('Reason for Outreach:'), 'Modal must render outreach reason');
  assert(modalHtml.includes('Spoke with parent'), 'Modal must render outcome option');
  assert(modalHtml.includes('Outreach Notes &amp; Action Plan') || modalHtml.includes('Outreach Notes & Action Plan'), 'Modal must render notes field');
  assert(modalHtml.includes('Save Call Log'), 'Modal must render submit CTA');
  console.log('✓ SSR Rendering of LogOutreachCallModal verified');

  console.log('--- ALL TASK-077 TESTS PASSED SUCCESSFULLY ---');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
