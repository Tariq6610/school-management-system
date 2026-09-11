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
  getSettings,
  resetGradingScale,
  updateGradingScale,
} from '@/lib/repositories/settings';
import {
  calculateGrade,
  getPresetGradingScales,
  validateGradingScale,
} from '@/lib/utils/grading';
import {
  createExamSchedule,
} from '@/lib/repositories/exams';
import {
  listExamResultsByExamId,
  recalculateExamResults,
  saveExamMarksEntry,
} from '@/lib/repositories/examResults';
import { listClasses } from '@/lib/repositories/classes';
import { listSubjects } from '@/lib/repositories/subjects';
import { setSession } from '@/lib/repositories/session';
import { GradingScaleEditor } from '@/components/settings/GradingScaleEditor';
import { SettingsView } from '@/components/settings/SettingsView';
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
  console.log('--- Running TASK-049 Grade Calculation from Configurable Scale Test Suite ---');

  await ensureSeeded();
  const schoolId = 'sch_main';
  const scope = { schoolId };

  await setSession({
    userId: 'usr_admin',
    role: 'school_admin',
    schoolId,
    campusId: 'camp_main',
  });

  // TEST 1: Default grading scale is read from settings
  const initialSettings = await getSettings(scope);
  assert(initialSettings.gradingScale && initialSettings.gradingScale.length > 0, 'Settings must contain grading scale');
  const topTier = initialSettings.gradingScale[0];
  assert.strictEqual(topTier.grade, 'A+', 'Default top grade should be A+');
  assert.strictEqual(topTier.minPercentage, 90, 'Default A+ min percentage should be 90');
  console.log('✓ Default grading scale correctly loaded from settings');

  // TEST 2: No hardcoded thresholds — dynamic evaluation against settings
  // Under standard scale, 82% gives 'A'
  const standardGrade = calculateGrade(82, 100, initialSettings.gradingScale);
  assert.strictEqual(standardGrade.grade, 'A', '82% should yield grade A under standard scale');
  assert.strictEqual(standardGrade.percentage, 82);
  assert.strictEqual(standardGrade.isPassing, true);

  // Administrator updates settings to raise 'A' threshold to 85% and 'B' to 70-84.9%
  const customStricterScale = [
    { grade: 'A+', minPercentage: 92, maxPercentage: 100, gpa: 4.0, description: 'Outstanding' },
    { grade: 'A', minPercentage: 85, maxPercentage: 91.9, gpa: 3.7, description: 'Excellent' },
    { grade: 'B', minPercentage: 70, maxPercentage: 84.9, gpa: 3.0, description: 'Good' },
    { grade: 'C', minPercentage: 60, maxPercentage: 69.9, gpa: 2.0, description: 'Pass' },
    { grade: 'F', minPercentage: 0, maxPercentage: 59.9, gpa: 0.0, description: 'Fail' },
  ];

  await updateGradingScale(scope, customStricterScale);
  const updatedSettings = await getSettings(scope);
  assert.strictEqual(updatedSettings.gradingScale.length, 5, 'Custom scale should have 5 tiers');

  // Exact same score of 82% now evaluated against updated settings scale yields 'B'!
  const updatedGrade = calculateGrade(82, 100, updatedSettings.gradingScale);
  assert.strictEqual(
    updatedGrade.grade,
    'B',
    '82% must now evaluate to B under custom scale with zero hardcoded thresholds'
  );
  assert.strictEqual(updatedGrade.gpa, 3.0);
  console.log('✓ Acceptance Criteria verified: Zero hardcoded thresholds; scale is editable in settings');

  // TEST 3: Custom Cambridge and alternative preset scales
  const presets = getPresetGradingScales();
  assert(presets.length >= 4, 'Must provide at least 4 presets');
  const cambridgePreset = presets.find((p) => p.id === 'cambridge-levels');
  assert(cambridgePreset, 'Cambridge preset must exist');

  const cambridgeHigh = calculateGrade(94, 100, cambridgePreset.scale);
  assert.strictEqual(cambridgeHigh.grade, 'A*', '94% should yield A* under Cambridge scale');

  const cambridgeLow = calculateGrade(35, 100, cambridgePreset.scale);
  assert.strictEqual(cambridgeLow.grade, 'U', '35% should yield U under Cambridge scale');
  assert.strictEqual(cambridgeLow.isPassing, false);
  console.log('✓ Custom Cambridge (A* to U) preset evaluated dynamically');

  // TEST 4: Scale validation rules
  // Inverted range
  const invalidInverted = validateGradingScale([
    { grade: 'A', minPercentage: 90, maxPercentage: 80 }, // Inverted: min > max
  ]);
  assert.strictEqual(invalidInverted.isValid, false);
  assert(invalidInverted.errors.some((e) => e.includes('strictly less than maximum')));

  // Duplicate grades
  const invalidDuplicate = validateGradingScale([
    { grade: 'A', minPercentage: 80, maxPercentage: 100 },
    { grade: 'A', minPercentage: 60, maxPercentage: 79.9 },
  ]);
  assert.strictEqual(invalidDuplicate.isValid, false);
  assert(invalidDuplicate.errors.some((e) => e.includes('Duplicate grade')));

  // Empty scale
  const invalidEmpty = validateGradingScale([]);
  assert.strictEqual(invalidEmpty.isValid, false);
  console.log('✓ Scale validation correctly catches invalid, inverted, or duplicate configurations');

  // TEST 5: Recalculation of existing exam results on scale change
  const classes = await listClasses({ schoolId });
  const subjects = await listSubjects({ schoolId });
  const testClass = classes[0];
  const testSubject = subjects[0];

  const exam = await createExamSchedule({
    schoolId,
    campusId: testClass.campusId,
    academicYearId: 'ay_2026_2027',
    name: 'Physics Annual Exam 2026',
    term: 'Annual',
    classId: testClass.id,
    subjectId: testSubject.id,
    date: '2026-11-10',
    maxMarks: 100,
    status: 'draft',
  });

  // Save student mark with 82 marks
  await saveExamMarksEntry(
    { schoolId, campusId: testClass.campusId },
    exam.id,
    [{ studentId: 'stu_test_recalc', marksObtained: 82, remarks: 'Good work' }],
    false
  );

  let results = await listExamResultsByExamId(exam.id);
  const beforeRecalc = results.find((r) => r.studentId === 'stu_test_recalc');
  assert.strictEqual(beforeRecalc?.grade, 'B', 'Under current 85% threshold, 82 is B');

  // Reset scale back to standard (where A is >= 80)
  await resetGradingScale(scope);
  const resetSettings = await getSettings(scope);
  assert.strictEqual(resetSettings.gradingScale[1].minPercentage, 80);

  // Recalculate exam results
  await recalculateExamResults({ schoolId, campusId: testClass.campusId }, exam.id);
  results = await listExamResultsByExamId(exam.id);
  const afterRecalc = results.find((r) => r.studentId === 'stu_test_recalc');
  assert.strictEqual(afterRecalc?.grade, 'A', 'After recalculation against standard scale, 82 is updated to A');
  console.log('✓ Existing exam results successfully recalculated when scale is updated in settings');

  // TEST 6: React SSR Component Rendering
  const renderedEditor = renderWithProviders(
    React.createElement(GradingScaleEditor, {
      initialScale: resetSettings.gradingScale,
    })
  );
  assert(renderedEditor.includes('Academic Grading Scale'), 'Must render editor heading');
  assert(renderedEditor.includes('Interactive Scale Tester'), 'Must render sandbox tester');
  assert(renderedEditor.includes('Apply Quick Preset Template'), 'Must render presets');
  assert(renderedEditor.includes('Standard Percentage'), 'Must render standard percentage preset');

  const renderedSettingsView = renderWithProviders(
    React.createElement(SettingsView)
  );
  assert(renderedSettingsView.includes('School Settings'), 'Must render SettingsView header');
  assert(renderedSettingsView.includes('Grading Scale'), 'Must render grading tab');
  console.log('✓ GradingScaleEditor and SettingsView rendered cleanly via SSR');

  console.log('--- ALL TASK-049 TESTS PASSED SUCCESSFULLY ---');
}

runTests().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});
