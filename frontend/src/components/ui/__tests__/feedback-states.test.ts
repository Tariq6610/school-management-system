import assert from 'node:assert';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  EmptyState,
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonTable,
  SkeletonRow,
  SkeletonProfile,
  ErrorState,
} from '../index';

console.log('Running TASK-014 Feedback States Test Suite...\n');

// 1. EmptyState Tests
console.log('--- 1. EmptyState Tests ---');

const emptyHtml = renderToString(
  React.createElement(EmptyState, {
    title: 'No students enrolled yet',
    description: 'Add your first student to begin tracking attendance and academic records.',
    action: {
      label: 'Add First Student',
      onClick: () => {},
    },
    secondaryAction: {
      label: 'Import CSV Roster',
      onClick: () => {},
    },
  })
);

assert(emptyHtml.includes('role="region"'), 'EmptyState must declare role="region"');
assert(emptyHtml.includes('No students enrolled yet'), 'EmptyState must render title');
assert(
  emptyHtml.includes('Add your first student to begin tracking attendance and academic records.'),
  'EmptyState must render explanation'
);
assert(emptyHtml.includes('Add First Student'), 'EmptyState must render primary action');
assert(emptyHtml.includes('Import CSV Roster'), 'EmptyState must render secondary action');
assert(emptyHtml.includes('border-dashed'), 'EmptyState must use dashed border container');

const compactEmptyHtml = renderToString(
  React.createElement(EmptyState, {
    title: 'No fee receipts',
    description: 'No transactions recorded for this invoice.',
    compact: true,
  })
);
assert(compactEmptyHtml.includes('p-5'), 'Compact EmptyState must use compact padding');
assert(compactEmptyHtml.includes('No fee receipts'), 'Compact EmptyState must render title');
console.log('✓ EmptyState title, single-line explanation, actions, and compact mode verified');

// 2. Skeleton Loaders Tests
console.log('--- 2. Skeleton Loaders Tests ---');

const baseSkeletonHtml = renderToString(
  React.createElement(Skeleton, {
    className: 'w-24 h-6',
    rounded: 'card',
  })
);
assert(baseSkeletonHtml.includes('animate-pulse'), 'Skeleton must use animate-pulse');
assert(baseSkeletonHtml.includes('bg-rule/70'), 'Skeleton must use bg-rule/70 token');
assert(baseSkeletonHtml.includes('rounded-card'), 'Skeleton must support rounded-card');

const textSkeletonHtml = renderToString(
  React.createElement(SkeletonText, { lines: 4 })
);
assert.strictEqual(
  (textSkeletonHtml.match(/animate-pulse/g) || []).length,
  4,
  'SkeletonText lines=4 must render exactly 4 pulse elements'
);

const cardSkeletonHtml = renderToString(React.createElement(SkeletonCard, {}));
assert(cardSkeletonHtml.includes('rounded-card'), 'SkeletonCard must match rounded-card');
assert(cardSkeletonHtml.includes('border-rule'), 'SkeletonCard must match border-rule');

const tableSkeletonHtml = renderToString(
  React.createElement(SkeletonTable, { rows: 6, columns: 5 })
);
assert(tableSkeletonHtml.includes('bg-canvas/90'), 'SkeletonTable must render header row');
assert(tableSkeletonHtml.includes('divide-rule/60'), 'SkeletonTable must render row separators');

const rowSkeletonHtml = renderToString(
  React.createElement(SkeletonRow, { columns: 4 })
);
assert.strictEqual(
  (rowSkeletonHtml.match(/animate-pulse/g) || []).length,
  4,
  'SkeletonRow columns=4 must render 4 pulse cells'
);

const profileSkeletonHtml = renderToString(React.createElement(SkeletonProfile, {}));
assert(profileSkeletonHtml.includes('rounded-full'), 'SkeletonProfile must render avatar circle');
console.log('✓ Skeleton content-shaped primitives and pulse animations verified');

// 3. ErrorState Tests
console.log('--- 3. ErrorState Tests ---');

const errorCardHtml = renderToString(
  React.createElement(ErrorState, {
    title: 'Unable to load attendance sheet',
    message: 'Check that you have selected an active campus and session, or click retry to reload.',
    onRetry: () => {},
    retryLabel: 'Reload Sheet',
    secondaryAction: {
      label: 'Back to Dashboard',
      onClick: () => {},
    },
    errorDetails: 'ERR_STORAGE_KEY_CORRUPT: attendance_doc_cmp_main_2026_09_08',
  })
);

assert(errorCardHtml.includes('role="alert"'), 'ErrorState must declare role="alert"');
assert(errorCardHtml.includes('aria-live="assertive"'), 'ErrorState must declare aria-live="assertive"');
assert(errorCardHtml.includes('Unable to load attendance sheet'), 'ErrorState must render what happened');
assert(
  errorCardHtml.includes('Check that you have selected an active campus and session'),
  'ErrorState must render what to do'
);
assert(errorCardHtml.includes('Reload Sheet'), 'ErrorState must render retry button');
assert(errorCardHtml.includes('Back to Dashboard'), 'ErrorState must render secondary navigation button');

// Inline error banner
const inlineErrorHtml = renderToString(
  React.createElement(ErrorState, {
    variant: 'inline',
    title: 'Voucher Number Invalid',
    message: 'Challan voucher number must be 8 numeric digits.',
    onRetry: () => {},
    retryLabel: 'Reset',
  })
);
assert(inlineErrorHtml.includes('bg-absent-bg'), 'Inline ErrorState must use bg-absent-bg');
assert(inlineErrorHtml.includes('border-absent/30'), 'Inline ErrorState must use border-absent');
assert(inlineErrorHtml.includes('Voucher Number Invalid'), 'Inline ErrorState must render title');

console.log('✓ ErrorState explicit title, message, retry action, and inline banner verified');

console.log('\nAll TASK-014 feedback states tests passed successfully!');
