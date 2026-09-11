import assert from 'node:assert';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Button, Input, Select, DatePicker, Textarea } from '../index';

console.log('Running TASK-010 UI Controls Test Suite...\n');

// 1. Button Tests
console.log('--- 1. Button Component Tests ---');
const primaryHtml = renderToString(React.createElement(Button, { variant: 'primary', size: 'md' }, 'Click Me'));
assert(primaryHtml.includes('bg-brand-700'), 'Primary button must contain brand-700 class');
assert(primaryHtml.includes('rounded-control'), 'Button must use rounded-control radius token');
assert(primaryHtml.includes('Click Me'), 'Button must render children text');
assert(primaryHtml.includes('h-9'), 'Size md must render 36px default (h-9)');

const dangerHtml = renderToString(React.createElement(Button, { variant: 'danger' }, 'Delete'));
assert(dangerHtml.includes('bg-absent'), 'Danger button must use bg-absent');

const loadingHtml = renderToString(React.createElement(Button, { isLoading: true }, 'Saving'));
assert(loadingHtml.includes('animate-spin'), 'Loading button must render spinner SVG');
assert(loadingHtml.includes('aria-busy="true"'), 'Loading button must announce aria-busy');

const disabledHtml = renderToString(React.createElement(Button, { disabled: true }, 'Disabled'));
assert(disabledHtml.includes('disabled=""') || disabledHtml.includes('disabled'), 'Disabled button must have disabled attribute');
assert(disabledHtml.includes('opacity-50'), 'Disabled button must have opacity-50');

const touchHtml = renderToString(React.createElement(Button, { size: 'lg' }, 'Touch Target'));
assert(touchHtml.includes('h-11'), 'Size lg must render 44px touch target (h-11)');
console.log('✓ Button variants, sizes, and states verified');

// 2. Input Tests
console.log('--- 2. Input Component Tests ---');
const inputHtml = renderToString(
  React.createElement(Input, {
    label: 'Student Name',
    placeholder: 'Enter name',
    required: true,
  })
);
assert(inputHtml.includes('<label'), 'Input must always render a visible label');
assert(inputHtml.includes('Student Name'), 'Input label text must match prop');
assert(inputHtml.includes('text-absent ml-1'), 'Required input must display asterisk marker');
assert(inputHtml.includes('rounded-control'), 'Input must use rounded-control token');

const errorInputHtml = renderToString(
  React.createElement(Input, {
    label: 'Admission Number',
    error: 'Duplicate admission number',
  })
);
assert(errorInputHtml.includes('role="alert"'), 'Error input must render alert role for error text');
assert(errorInputHtml.includes('Duplicate admission number'), 'Error message text must be visible');
assert(errorInputHtml.includes('border-absent'), 'Error input must have border-absent');
assert(errorInputHtml.includes('aria-invalid="true"'), 'Error input must set aria-invalid="true"');

const prefixInputHtml = renderToString(
  React.createElement(Input, {
    label: 'Tuition Fee',
    prefixText: 'PKR',
    defaultValue: '12,500',
  })
);
assert(prefixInputHtml.includes('PKR'), 'Input must render prefix adornment text');
console.log('✓ Input labels, error alerts, prefixes, and states verified');

// 3. Select Tests
console.log('--- 3. Select Component Tests ---');
const selectHtml = renderToString(
  React.createElement(Select, {
    label: 'Campus',
    defaultValue: 'cmp_main',
    options: [
      { value: 'cmp_main', label: 'Main Campus' },
      { value: 'cmp_girls', label: 'Girls Campus' },
    ],
  })
);
assert(selectHtml.includes('<select'), 'Select must render native select element');
assert(selectHtml.includes('Main Campus'), 'Select must render option labels');
assert(selectHtml.includes('<svg'), 'Select must render custom chevron arrow');
assert(selectHtml.includes('rounded-control'), 'Select must use rounded-control token');
console.log('✓ Select dropdown accessibility and options verified');

// 4. DatePicker Tests
console.log('--- 4. DatePicker Component Tests ---');
const dateHtml = renderToString(
  React.createElement(DatePicker, {
    label: 'Enrollment Date',
    defaultValue: '2026-09-08',
  })
);
assert(dateHtml.includes('type="date"'), 'DatePicker must render type="date"');
assert(dateHtml.includes('Enrollment Date'), 'DatePicker must render visible label');
assert(dateHtml.includes('<svg'), 'DatePicker must render calendar icon');
console.log('✓ DatePicker native calendar and label verified');

// 5. Textarea Tests
console.log('--- 5. Textarea Component Tests ---');
const textareaHtml = renderToString(
  React.createElement(Textarea, {
    label: 'Medical Notes',
    maxLength: 200,
    showCount: true,
    defaultValue: 'No allergies reported.',
  })
);
assert(textareaHtml.includes('<textarea'), 'Textarea must render textarea element');
assert(textareaHtml.includes('Medical Notes'), 'Textarea must render visible label');
assert(textareaHtml.includes('200'), 'Textarea must render character limit count');
console.log('✓ Textarea component and character counter verified');

console.log('\n========================================');
console.log('ALL TASK-010 UI TESTS PASSED! ✅');
console.log('========================================');
