import assert from 'node:assert';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Table, TableColumn, Pagination } from '../index';

console.log('Running TASK-011 Table & Pagination Test Suite...\n');

interface TestRecord {
  id: string;
  name: string;
  rollNo: number;
  grade: string;
  marks: number;
  feePaid: number;
}

const sampleData: TestRecord[] = [
  { id: '1', name: 'Ahmed Khan', rollNo: 101, grade: '8-A', marks: 92.5, feePaid: 15000 },
  { id: '2', name: 'Ayesha Siddiqui', rollNo: 102, grade: '8-A', marks: 88.0, feePaid: 15000 },
  { id: '3', name: 'Bilal Ahmad', rollNo: 103, grade: '8-A', marks: 74.0, feePaid: 10000 },
];

const columns: TableColumn<TestRecord>[] = [
  { key: 'rollNo', header: 'Roll No', sortable: true, isNumeric: true, width: '90px' },
  { key: 'name', header: 'Student Name', sortable: true },
  { key: 'grade', header: 'Class', align: 'center' },
  { key: 'marks', header: 'Marks %', sortable: true, align: 'right', isNumeric: true },
  { key: 'feePaid', header: 'Fee Paid', align: 'right', isNumeric: true },
];

// 1. Table Render Tests
console.log('--- 1. Table Render & Sticky Header Tests ---');
const tableHtml = renderToString(
  React.createElement(Table<TestRecord>, {
    columns,
    data: sampleData,
    stickyHeader: true,
    selectable: true,
  })
);

assert(tableHtml.includes('sticky top-0'), 'Table header must have sticky top-0 class');
assert(tableHtml.includes('tabular-nums'), 'Numeric columns must have tabular-nums applied');
assert(tableHtml.includes('Ahmed Khan'), 'Table must render student name');
assert(tableHtml.includes('92.5'), 'Table must render marks percentage');
assert(tableHtml.includes('type="checkbox"'), 'Selectable table must render selection checkboxes');
assert(tableHtml.includes('rounded-card'), 'Table must use rounded-card token');
console.log('✓ Sticky header, row rendering, and tabular-nums verified');

// 2. Empty State Tests
console.log('--- 2. Table Empty State Tests ---');
const emptyHtml = renderToString(
  React.createElement(Table<TestRecord>, {
    columns,
    data: [],
    emptyState: {
      title: 'No students enrolled yet',
      description: 'Add your first student to begin taking attendance.',
      action: { label: 'Admit Student', onClick: () => {} },
    },
  })
);
assert(emptyHtml.includes('No students enrolled yet'), 'Empty table must display empty state title');
assert(emptyHtml.includes('Add your first student'), 'Empty table must display explanation');
assert(emptyHtml.includes('Admit Student'), 'Empty table must render action button');
console.log('✓ Table empty state and action CTA verified');

// 3. Pagination Tests
console.log('--- 3. Pagination Component Tests ---');
// 420 items at default 25/page = 17 pages
const totalItems = 420;
const pageSize = 25;
const expectedPages = Math.ceil(totalItems / pageSize);
assert.strictEqual(expectedPages, 17, '420 items at 25/page must equal 17 pages');

// Page 1 rendering
const page1Html = renderToString(
  React.createElement(Pagination, {
    page: 1,
    pageSize: 25,
    totalItems: 420,
    onPageChange: () => {},
  })
);
assert(page1Html.includes('Showing <strong class="font-semibold text-ink-900">1</strong>'), 'Start item must be 1');
assert(page1Html.includes('<strong class="font-semibold text-ink-900">25</strong>'), 'End item must be 25');
assert(page1Html.includes('<strong class="font-semibold text-ink-900">420</strong>'), 'Total items must be 420');
assert(page1Html.includes('disabled'), 'Previous button on page 1 must be disabled');
assert(page1Html.includes('tabular-nums'), 'Pagination must use tabular numerals for range numbers');

// Page 17 (last page) rendering
const lastPageHtml = renderToString(
  React.createElement(Pagination, {
    page: 17,
    pageSize: 25,
    totalItems: 420,
    onPageChange: () => {},
  })
);
assert(lastPageHtml.includes('Showing <strong class="font-semibold text-ink-900">401</strong>'), 'Page 17 start must be 401');
assert(lastPageHtml.includes('<strong class="font-semibold text-ink-900">420</strong>'), 'Page 17 end must be 420');
console.log('✓ Pagination range calculation, 25/page default, and boundary states verified');

console.log('\n========================================');
console.log('ALL TASK-011 TABLE & PAGINATION TESTS PASSED! ✅');
console.log('========================================');
