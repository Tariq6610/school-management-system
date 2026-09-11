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
    confirm: () => true,
  },
  writable: true,
});

import React from 'react';
import { renderToString } from 'react-dom/server';
import { ensureSeeded } from '@/lib/seed/boot';
import { getSettings, updateSettings } from '@/lib/repositories/settings';
import { setSession } from '@/lib/repositories/session';
import { AttendanceSettingsEditor } from '@/components/settings/AttendanceSettingsEditor';
import { BrandingSettingsEditor } from '@/components/settings/BrandingSettingsEditor';
import { ToastProvider } from '@/components/ui/Toast';
import { SessionProvider } from '@/components/providers/SessionProvider';

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
  console.log('--- Running TASK-079 General & Attendance Settings Test Suite ---');

  await ensureSeeded();
  const schoolId = 'sch_main';
  const scope = { schoolId };

  await setSession({
    userId: 'usr_admin',
    role: 'school_admin',
    schoolId,
    campusId: 'camp_main',
  });

  // TEST 1: Default general settings are read from seeded data
  const initialSettings = await getSettings(scope);
  assert.strictEqual(initialSettings.attendanceCutoffTime, '08:30', 'Default cutoff time should be 08:30');
  assert.strictEqual(initialSettings.attendanceEditWindowHours, 48, 'Default edit window should be 48 hours');
  assert(initialSettings.attendanceStatuses.includes('present'), 'Statuses should include present');
  assert.strictEqual(initialSettings.currency, 'PKR', 'Default currency should be PKR');
  console.log('✓ Default settings correctly loaded from repository');

  // TEST 2: Update attendance settings
  await updateSettings({
    attendanceCutoffTime: '09:00',
    attendanceEditWindowHours: 24,
    attendanceStatuses: ['present', 'absent', 'late'], // Dropped 'leave'
  }, scope);

  const updatedAttendance = await getSettings(scope);
  assert.strictEqual(updatedAttendance.attendanceCutoffTime, '09:00');
  assert.strictEqual(updatedAttendance.attendanceEditWindowHours, 24);
  assert(!updatedAttendance.attendanceStatuses.includes('leave'), 'Leave should have been dropped');
  console.log('✓ Attendance policies successfully updated');

  // TEST 3: Update branding settings
  await updateSettings({
    branding: {
      schoolName: 'New Test Academy',
      primaryColor: '#000000',
      accentColor: '#111111',
    },
    currency: 'USD',
  }, scope);

  const updatedBranding = await getSettings(scope);
  assert.strictEqual(updatedBranding.branding.schoolName, 'New Test Academy');
  assert.strictEqual(updatedBranding.branding.primaryColor, '#000000');
  assert.strictEqual(updatedBranding.currency, 'USD');
  console.log('✓ Institution branding successfully updated');

  // TEST 4: React SSR Component Rendering
  const renderedAttendanceEditor = renderWithProviders(
    React.createElement(AttendanceSettingsEditor as any, { initialSettings: updatedAttendance })
  );
  assert(renderedAttendanceEditor.includes('Attendance Operations'), 'Must render attendance editor heading');
  assert(renderedAttendanceEditor.includes('Daily Cutoff Time'), 'Must render cutoff input');
  
  const renderedBrandingEditor = renderWithProviders(
    React.createElement(BrandingSettingsEditor as any, { initialSettings: updatedBranding })
  );
  assert(renderedBrandingEditor.includes('Institution Branding'), 'Must render branding editor heading');
  assert(renderedBrandingEditor.includes('Institution Name'), 'Must render school name input');

  console.log('✓ AttendanceSettingsEditor and BrandingSettingsEditor rendered cleanly via SSR');

  console.log('--- ALL TASK-079 TESTS PASSED SUCCESSFULLY ---');
}

runTests().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});
