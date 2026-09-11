import assert from 'node:assert';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  StatusBadge,
  StatCard,
  Avatar,
  getInitials,
  getAvatarColor,
  Tabs,
  ToastItem,
  StatusType,
} from '../index';

console.log('Running TASK-013 Badges, Cards, Avatars, Tabs & Toast Test Suite...\n');

// 1. StatusBadge Tests (Acceptance Criteria: label + colour, never colour alone)
console.log('--- 1. StatusBadge Tests ---');

const presentHtml = renderToString(
  React.createElement(StatusBadge, { status: 'present' })
);
assert(presentHtml.includes('role="status"'), 'StatusBadge must have role="status"');
assert(presentHtml.includes('Present'), 'StatusBadge must render text label "Present"');
assert(presentHtml.includes('✓'), 'StatusBadge must render glyph "✓"');
assert(presentHtml.includes('bg-present-bg'), 'StatusBadge must use bg-present-bg');
assert(presentHtml.includes('text-present'), 'StatusBadge must use text-present');

const absentHtml = renderToString(
  React.createElement(StatusBadge, { status: 'absent' })
);
assert(absentHtml.includes('Absent'), 'StatusBadge must render text label "Absent"');
assert(absentHtml.includes('✕'), 'StatusBadge must render glyph "✕"');
assert(absentHtml.includes('bg-absent-bg'), 'StatusBadge must use bg-absent-bg');
assert(absentHtml.includes('text-absent'), 'StatusBadge must use text-absent');

const lateHtml = renderToString(
  React.createElement(StatusBadge, { status: 'late' })
);
assert(lateHtml.includes('Late'), 'StatusBadge must render text label "Late"');
assert(lateHtml.includes('⏱'), 'StatusBadge must render glyph "⏱"');
assert(lateHtml.includes('bg-late-bg'), 'StatusBadge must use bg-late-bg');
assert(lateHtml.includes('text-late'), 'StatusBadge must use text-late');

const leaveHtml = renderToString(
  React.createElement(StatusBadge, { status: 'leave' })
);
assert(leaveHtml.includes('On Leave'), 'StatusBadge must render text label "On Leave"');
assert(leaveHtml.includes('—'), 'StatusBadge must render glyph "—"');
assert(leaveHtml.includes('bg-leave-bg'), 'StatusBadge must use bg-leave-bg');
assert(leaveHtml.includes('text-leave'), 'StatusBadge must use text-leave');

// Verify all core statuses render cleanly
const coreStatuses: StatusType[] = [
  'present', 'absent', 'late', 'leave',
  'paid', 'pending', 'overdue', 'partial',
  'draft', 'published', 'active', 'inactive'
];
for (const st of coreStatuses) {
  const html = renderToString(React.createElement(StatusBadge, { status: st }));
  assert(html.length > 20, `StatusBadge must render valid HTML for ${st}`);
  assert(html.includes('role="status"'), `StatusBadge for ${st} must include role="status"`);
}

// Custom label override
const customLabelHtml = renderToString(
  React.createElement(StatusBadge, { status: 'paid', label: '100% Settled' })
);
assert(customLabelHtml.includes('100% Settled'), 'StatusBadge must accept custom label override');
assert(customLabelHtml.includes('bg-present-bg'), 'Paid with custom label must retain present color token');

console.log('✓ StatusBadge label + colour + glyph accessibility verified across all statuses');

// 2. StatCard Tests
console.log('--- 2. StatCard Tests ---');

const statHtml = renderToString(
  React.createElement(StatCard, {
    label: 'Total Active Students',
    value: 420,
    subtitle: 'Across 3 campuses',
    trend: {
      direction: 'up',
      value: '+5.2%',
      label: 'vs last term',
      positiveIsGood: true,
    },
  })
);

assert(statHtml.includes('Total Active Students'), 'StatCard must render label');
assert(statHtml.includes('420'), 'StatCard must render stat value');
assert(statHtml.includes('tabular-nums'), 'StatCard must use tabular-nums token');
assert(statHtml.includes('text-stat-number'), 'StatCard must use text-stat-number utility');
assert(statHtml.includes('rounded-card'), 'StatCard must use rounded-card token');
assert(statHtml.includes('border-rule'), 'StatCard must use border-rule without elevation');
assert(statHtml.includes('+5.2%'), 'StatCard must render trend value');
assert(statHtml.includes('↑'), 'StatCard up trend must render up arrow glyph');
assert(statHtml.includes('text-present'), 'Favorable trend must render text-present');

// Test unfavorable trend (e.g. rising unpaid fees)
const feeStatHtml = renderToString(
  React.createElement(StatCard, {
    label: 'Overdue Invoices',
    value: 18,
    trend: {
      direction: 'up',
      value: '+3',
      label: 'this month',
      positiveIsGood: false, // More overdue invoices is bad
    },
  })
);
assert(feeStatHtml.includes('text-absent'), 'Unfavorable trend must render text-absent');
console.log('✓ StatCard tabular numerals, institutional border, and trends verified');

// 3. Avatar Tests
console.log('--- 3. Avatar Tests ---');

assert.strictEqual(getInitials('Ahmed Khan'), 'AK', 'Ahmed Khan -> AK');
assert.strictEqual(getInitials('Fatima'), 'FA', 'Fatima -> FA');
assert.strictEqual(getInitials('Dr. Ayesha Siddiqui'), 'AS', 'Dr. Ayesha Siddiqui -> AS');
assert.strictEqual(getInitials(''), '?', 'Empty string -> ?');

const color1 = getAvatarColor('Ahmed Khan');
const color2 = getAvatarColor('Ahmed Khan');
assert.deepStrictEqual(color1, color2, 'Deterministic palette must return identical color for same name');

const avatarHtml = renderToString(
  React.createElement(Avatar, { name: 'Ahmed Khan', size: 'md' })
);
assert(avatarHtml.includes('role="img"'), 'Avatar must declare role="img"');
assert(avatarHtml.includes('aria-label="Ahmed Khan"'), 'Avatar must have aria-label');
assert(avatarHtml.includes('AK'), 'Avatar must render initials AK');
assert(avatarHtml.includes('w-9 h-9'), 'Size md must map to w-9 h-9');
console.log('✓ Avatar initials extraction, deterministic palette, and accessibility verified');

// 4. Tabs Tests
console.log('--- 4. Tabs Tests ---');

const tabsHtml = renderToString(
  React.createElement(Tabs, {
    items: [
      { id: 'all', label: 'All Students', count: 420 },
      { id: 'unpaid', label: 'Unpaid Fees', count: 18 },
      { id: 'anomalies', label: 'Anomalies', count: 3 },
    ],
    activeId: 'all',
    onChange: () => {},
  })
);

assert(tabsHtml.includes('role="tablist"'), 'Tabs must have role="tablist"');
assert(tabsHtml.includes('role="tab"'), 'Tabs items must have role="tab"');
assert(tabsHtml.includes('aria-selected="true"'), 'Active tab must declare aria-selected="true"');
assert(tabsHtml.includes('aria-selected="false"'), 'Inactive tab must declare aria-selected="false"');
assert(tabsHtml.includes('border-brand-700'), 'Active tab must have border-brand-700 underline');
assert(tabsHtml.includes('text-brand-700'), 'Active tab must have text-brand-700');
assert(tabsHtml.includes('420'), 'Tabs must render count badges');
assert(tabsHtml.includes('border-b-2'), 'Tabs must use underline (border-b-2), not pills');
console.log('✓ Tabs underline styling, counts, and accessibility roles verified');

// 5. Toast Tests
console.log('--- 5. Toast Tests ---');

const toastSuccessHtml = renderToString(
  React.createElement(ToastItem, {
    toast: {
      id: 'toast-1',
      type: 'success',
      title: 'Student saved',
      message: 'Ahmed Khan has been enrolled.',
    },
    onDismiss: () => {},
  })
);
assert(toastSuccessHtml.includes('role="status"'), 'Success toast must declare role="status"');
assert(toastSuccessHtml.includes('border-l-present'), 'Success toast must have present border');
assert(toastSuccessHtml.includes('Student saved'), 'Toast must display title');
assert(toastSuccessHtml.includes('Ahmed Khan has been enrolled.'), 'Toast must display message');
assert(toastSuccessHtml.includes('Dismiss notification'), 'Toast must have accessible dismiss button');

const toastErrorHtml = renderToString(
  React.createElement(ToastItem, {
    toast: {
      id: 'toast-2',
      type: 'error',
      title: 'Validation Failed',
      message: 'Fee voucher code is missing.',
    },
    onDismiss: () => {},
  })
);
assert(toastErrorHtml.includes('role="alert"'), 'Error toast must declare role="alert"');
assert(toastErrorHtml.includes('border-l-absent'), 'Error toast must have absent border');
console.log('✓ Toast success/error presentation, borders, and accessibility verified');

console.log('\nAll TASK-013 tests passed successfully!');
