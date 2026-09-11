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
import {
  getPeriodConfiguration,
  updatePeriodConfiguration,
  resetPeriodConfiguration,
  validatePeriodConfiguration,
  getPresetPeriodConfigurations,
  parseTimeToMinutes,
  DEFAULT_PERIODS,
} from '@/lib/repositories/settings';
import {
  createTimetableSlot,
  getEnrichedTimetableSlots,
} from '@/lib/repositories/timetableSlots';
import { listClasses } from '@/lib/repositories/classes';
import { listTeachers } from '@/lib/repositories/teachers';
import { listSubjects } from '@/lib/repositories/subjects';
import { PeriodDefinition, Scope } from '@/types';
import { PeriodConfigurationEditor } from '@/components/settings/PeriodConfigurationEditor';
import { ToastProvider } from '@/components/ui/Toast';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { setSession } from '@/lib/repositories/session';

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
  console.log('--- Starting Period Configuration and Timetable Slot Tests ---');

  // Seed database
  await ensureSeeded();
  await setSession({
    userId: 'usr_admin',
    role: 'school_admin',
    schoolId: 'sch_main',
    campusId: 'cmp_main',
  });
  const scope: Scope = { schoolId: 'sch_main' };

  // 1. Time parsing helper
  console.log('1. Testing parseTimeToMinutes...');
  assert.strictEqual(parseTimeToMinutes('08:00'), 480);
  assert.strictEqual(parseTimeToMinutes('08:45'), 525);
  assert.strictEqual(parseTimeToMinutes('13:30'), 810);
  assert.strictEqual(parseTimeToMinutes('25:00'), null);
  assert.strictEqual(parseTimeToMinutes('invalid'), null);
  console.log('  ✓ Time parsing works correctly');

  // 2. Retrieval of default period configuration
  console.log('2. Testing getPeriodConfiguration...');
  const initialPeriods = await getPeriodConfiguration(scope);
  assert.ok(Array.isArray(initialPeriods), 'Should return an array of periods');
  assert.ok(initialPeriods.length >= 5, 'Should have at least 5 default periods');
  assert.strictEqual(initialPeriods[0].period, 1);
  assert.strictEqual(initialPeriods[0].startTime, '08:00');
  assert.strictEqual(initialPeriods[0].endTime, '08:45');
  console.log(`  ✓ Default periods loaded: ${initialPeriods.length} periods`);

  // 3. Period configuration validation
  console.log('3. Testing validatePeriodConfiguration...');
  const validCheck = validatePeriodConfiguration(initialPeriods);
  assert.strictEqual(validCheck.isValid, true, 'Default periods should be valid');
  assert.strictEqual(validCheck.errors.length, 0);

  // Inverted times
  const invertedPeriods: PeriodDefinition[] = [
    { period: 1, name: 'Inverted Slot', startTime: '09:00', endTime: '08:00' },
  ];
  const invertedCheck = validatePeriodConfiguration(invertedPeriods);
  assert.strictEqual(invertedCheck.isValid, false, 'Inverted times should be rejected');
  assert.ok(
    invertedCheck.errors.some((e) => e.includes('must be after start time')),
    'Should flag end time before start time'
  );

  // Overlapping times
  const overlappingPeriods: PeriodDefinition[] = [
    { period: 1, name: 'Slot 1', startTime: '08:00', endTime: '09:00' },
    { period: 2, name: 'Slot 2', startTime: '08:45', endTime: '09:30' },
  ];
  const overlapCheck = validatePeriodConfiguration(overlappingPeriods);
  assert.strictEqual(overlapCheck.isValid, false, 'Overlapping periods should be rejected');
  assert.ok(
    overlapCheck.errors.some((e) => e.includes('overlaps with')),
    'Should flag overlapping period slot times'
  );

  // Duplicate period number
  const duplicatePeriods: PeriodDefinition[] = [
    { period: 1, name: 'Slot 1', startTime: '08:00', endTime: '08:45' },
    { period: 1, name: 'Slot 2', startTime: '08:45', endTime: '09:30' },
  ];
  const duplicateCheck = validatePeriodConfiguration(duplicatePeriods);
  assert.strictEqual(duplicateCheck.isValid, false, 'Duplicate period numbers should be rejected');
  assert.ok(
    duplicateCheck.errors.some((e) => e.includes('Duplicate period number')),
    'Should flag duplicate period number'
  );

  // Empty name
  const emptyNamePeriods: PeriodDefinition[] = [
    { period: 1, name: '', startTime: '08:00', endTime: '08:45' },
  ];
  const emptyNameCheck = validatePeriodConfiguration(emptyNamePeriods);
  assert.strictEqual(emptyNameCheck.isValid, false, 'Empty period name should be rejected');
  console.log('  ✓ Period validation rules work as expected');

  // 4. Update and Reset period configurations
  console.log('4. Testing updatePeriodConfiguration and resetPeriodConfiguration...');
  const customPeriods: PeriodDefinition[] = [
    { period: 1, name: 'Math Morning', startTime: '08:00', endTime: '09:00', isBreak: false },
    { period: 2, name: 'Science Morning', startTime: '09:00', endTime: '10:00', isBreak: false },
    { period: 3, name: 'Snack Break', startTime: '10:00', endTime: '10:30', isBreak: true },
    { period: 4, name: 'English Block', startTime: '10:30', endTime: '11:30', isBreak: false },
  ];

  await updatePeriodConfiguration(scope, customPeriods);
  const updatedPeriods = await getPeriodConfiguration(scope);
  assert.strictEqual(updatedPeriods.length, 4);
  assert.strictEqual(updatedPeriods[0].name, 'Math Morning');
  assert.strictEqual(updatedPeriods[2].isBreak, true);

  // Reset back to default
  await resetPeriodConfiguration(scope);
  const resetPeriods = await getPeriodConfiguration(scope);
  assert.strictEqual(resetPeriods.length, DEFAULT_PERIODS.length);
  assert.strictEqual(resetPeriods[0].name, 'Period 1');
  console.log('  ✓ Update and reset period configurations succeed');

  // 5. Presets validation
  console.log('5. Testing preset schedules...');
  const presets = getPresetPeriodConfigurations();
  assert.ok(presets.length >= 3, 'Should provide at least 3 presets');
  for (const preset of presets) {
    const val = validatePeriodConfiguration(preset.periods);
    assert.strictEqual(val.isValid, true, `Preset "${preset.name}" must be valid`);
  }
  console.log(`  ✓ All ${presets.length} presets validated successfully`);

  // 6. Slot creation with period-time auto-synchronization
  console.log('6. Testing timetable slot auto-time assignment...');
  const classes = await listClasses(scope);
  const teachers = await listTeachers(scope);
  const subjects = await listSubjects(scope);

  assert.ok(classes.length > 0, 'Seed should contain classes');
  assert.ok(teachers.length > 0, 'Seed should contain teachers');
  assert.ok(subjects.length > 0, 'Seed should contain subjects');

  const newSlot = await createTimetableSlot({
    schoolId: classes[0].schoolId,
    campusId: classes[0].campusId,
    classId: classes[0].id,
    subjectId: subjects[0].id,
    teacherId: teachers[0].id,
    dayOfWeek: 1,
    period: 1, // startTime and endTime omitted!
  });

  assert.ok(newSlot.id, 'Slot should have an ID');
  assert.strictEqual(newSlot.period, 1);
  assert.strictEqual(newSlot.startTime, '08:00', 'Should auto-assign 08:00 from Period 1');
  assert.strictEqual(newSlot.endTime, '08:45', 'Should auto-assign 08:45 from Period 1');
  console.log('  ✓ Slot creation automatically resolved period start/end times');

  // 7. Enriched timetable slots query
  console.log('7. Testing getEnrichedTimetableSlots...');
  const enriched = await getEnrichedTimetableSlots(scope, { classId: classes[0].id });
  assert.ok(enriched.length > 0, 'Should find enriched slots');
  const sample = enriched.find((s) => s.id === newSlot.id);
  assert.ok(sample, 'Created slot should be found in enriched list');
  assert.ok(sample?.teacherName, 'Should include teacherName');
  assert.ok(sample?.subjectName, 'Should include subjectName');
  assert.ok(sample?.className, 'Should include className');
  assert.ok(sample?.periodName, 'Should include periodName');
  console.log(`  ✓ Enriched slot verified: ${sample?.className} | ${sample?.subjectName} | ${sample?.periodName}`);

  // 8. SSR Rendering
  console.log('8. Testing PeriodConfigurationEditor SSR rendering...');
  const html = renderWithProviders(
    React.createElement(PeriodConfigurationEditor, {
      initialPeriods: DEFAULT_PERIODS,
    })
  );
  assert.ok(html.includes('Timetable Periods &amp; Bell Schedule'), 'Should render title');
  assert.ok(html.includes('Period 1'), 'Should render Period 1 in HTML');
  console.log('  ✓ PeriodConfigurationEditor SSR rendered cleanly');

  console.log('\n--- ALL PERIOD CONFIGURATION TESTS PASSED! ---');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
