import assert from 'node:assert';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Modal, Drawer, ConfirmDialog } from '../index';

console.log('Running TASK-012 Dialogs & Overlays Test Suite...\n');

// 1. Modal Component Tests
console.log('--- 1. Modal Component Tests ---');
const modalClosedHtml = renderToString(
  React.createElement(Modal, {
    isOpen: false,
    onClose: () => {},
    title: 'Hidden Modal',
  }, 'Hidden Content')
);
assert.strictEqual(modalClosedHtml, '', 'Closed modal must render empty string');

const modalOpenHtml = renderToString(
  React.createElement(Modal, {
    isOpen: true,
    onClose: () => {},
    title: 'Admissions Form',
    description: 'Enter details for new student enrollment',
    size: 'lg',
  }, 'Student form body')
);
assert(modalOpenHtml.includes('role="dialog"'), 'Modal must declare role="dialog"');
assert(modalOpenHtml.includes('aria-modal="true"'), 'Modal must declare aria-modal="true"');
assert(modalOpenHtml.includes('Admissions Form'), 'Modal must render title');
assert(modalOpenHtml.includes('Enter details for new student enrollment'), 'Modal must render description');
assert(modalOpenHtml.includes('max-w-2xl'), 'Size lg must map to max-w-2xl');
assert(modalOpenHtml.includes('rounded-card'), 'Modal card must use rounded-card token');
assert(modalOpenHtml.includes('shadow-overlay'), 'Modal must use shadow-overlay elevation token');
console.log('✓ Modal open/close, sizes, and accessibility attributes verified');

// 2. Drawer Component Tests
console.log('--- 2. Drawer Component Tests ---');
const drawerClosedHtml = renderToString(
  React.createElement(Drawer, {
    isOpen: false,
    onClose: () => {},
    title: 'Student Details',
  }, 'Details Body')
);
assert.strictEqual(drawerClosedHtml, '', 'Closed drawer must render empty string');

const drawerOpenHtml = renderToString(
  React.createElement(Drawer, {
    isOpen: true,
    onClose: () => {},
    title: 'Ahmed Khan · Grade 8-A',
    description: 'Learning profile and attendance history',
  }, 'Profile Content')
);
assert(drawerOpenHtml.includes('role="dialog"'), 'Drawer must declare role="dialog"');
assert(drawerOpenHtml.includes('right-0'), 'Drawer must dock to right edge');
assert(drawerOpenHtml.includes('border-l'), 'Drawer must have left divider border');
assert(drawerOpenHtml.includes('Ahmed Khan · Grade 8-A'), 'Drawer must render title');
console.log('✓ Drawer right slide-over and accessibility verified');

// 3. ConfirmDialog Tests
console.log('--- 3. ConfirmDialog Tests ---');
const recordName = "Ahmed Khan's student record";
const confirmHtml = renderToString(
  React.createElement(ConfirmDialog, {
    isOpen: true,
    onClose: () => {},
    onConfirm: () => {},
    recordName,
    actionType: 'delete',
  })
);
assert(
  confirmHtml.includes("Ahmed Khan&#x27;s student record") || confirmHtml.includes(recordName),
  'ConfirmDialog must prominently display the record name'
);
assert(confirmHtml.includes("Delete Ahmed Khan&#x27;s student record?") || confirmHtml.includes("Delete Ahmed Khan's student record?"), 'Title must explicitly name record to delete');
assert(confirmHtml.includes('bg-absent'), 'Destructive ConfirmDialog must render danger button');
assert(confirmHtml.includes('Cancel'), 'ConfirmDialog must render Cancel button');
console.log('✓ ConfirmDialog record naming and destructive styling verified');

console.log('\n========================================');
console.log('ALL TASK-012 OVERLAYS TESTS PASSED! ✅');
console.log('========================================');
