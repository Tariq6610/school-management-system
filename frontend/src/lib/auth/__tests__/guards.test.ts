import assert from 'node:assert';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { checkRouteRole, checkRecordScope } from '../guards';
import { Forbidden403, NotFound404 } from '../../../components/auth';
import { Session } from '@/types';

console.log('Running TASK-017 Route Guards (Role & Scope) Test Suite...\n');

// 1. Role Guard Logic Tests (Acceptance criterion: Wrong role → 403)
console.log('--- 1. Role Guard Tests (Wrong Role → 403) ---');

const teacherSession: Session = {
  userId: 'usr_teacher_sana',
  role: 'teacher',
  schoolId: 'sch_abc',
  campusId: 'cmp_main',
};

// Teacher accessing teacher route -> 200 OK
const allowedRes = checkRouteRole(teacherSession, ['teacher']);
assert.strictEqual(allowedRes.allowed, true);
assert.strictEqual(allowedRes.status, 200);

// Teacher accessing admin route -> 403 Forbidden
const forbiddenRes = checkRouteRole(teacherSession, ['school_admin', 'super_admin']);
assert.strictEqual(forbiddenRes.allowed, false);
assert.strictEqual(forbiddenRes.status, 403, 'Wrong role must produce status 403');
assert(forbiddenRes.reason?.includes('not authorized'));

// Unauthenticated user -> 401 Redirect to /login
const unauthRes = checkRouteRole(null, ['teacher', 'school_admin']);
assert.strictEqual(unauthRes.allowed, false);
assert.strictEqual(unauthRes.status, 401);
assert.strictEqual(unauthRes.redirect, '/login');

console.log('✓ Role authorization rules verified (Wrong role → 403, Unauthenticated → 401)');

// 2. Scope Guard Logic Tests (Acceptance criterion: Out-of-scope record → 404)
console.log('--- 2. Scope Guard Tests (Out-of-Scope Record → 404) ---');

const principalMainSession: Session = {
  userId: 'usr_principal_main',
  role: 'principal',
  schoolId: 'sch_abc',
  campusId: 'cmp_main',
};

// Main Campus Principal accessing Main Campus record -> in scope
const inScopeCampusRecord = {
  id: 'cls_8a',
  schoolId: 'sch_abc',
  campusId: 'cmp_main',
};
const campusAllowed = checkRecordScope(inScopeCampusRecord, principalMainSession);
assert.strictEqual(campusAllowed.inScope, true);
assert.strictEqual(campusAllowed.status, 200);

// Main Campus Principal accessing Girls Campus record -> 404 Out of Scope
const outOfScopeCampusRecord = {
  id: 'cls_girls_8a',
  schoolId: 'sch_abc',
  campusId: 'cmp_girls',
};
const campusDenied = checkRecordScope(outOfScopeCampusRecord, principalMainSession);
assert.strictEqual(campusDenied.inScope, false);
assert.strictEqual(campusDenied.status, 404, 'Out-of-scope campus record must produce 404');

// Parent accessing their own child vs someone else's child
const parentSession: Session = {
  userId: 'usr_parent_khan',
  role: 'parent',
  schoolId: 'sch_abc',
  campusId: 'cmp_main',
  activeChildId: 'stu_ahmed',
};

// Record of own active child -> in scope
const ownChildRecord = {
  id: 'att_ahmed_sep08',
  schoolId: 'sch_abc',
  campusId: 'cmp_main',
  studentId: 'stu_ahmed',
};
const ownChildCheck = checkRecordScope(ownChildRecord, parentSession);
assert.strictEqual(ownChildCheck.inScope, true);

// Record of other child -> 404 Out of Scope
const otherChildRecord = {
  id: 'att_bilal_sep08',
  schoolId: 'sch_abc',
  campusId: 'cmp_main',
  studentId: 'stu_bilal_other',
};
const otherChildCheck = checkRecordScope(otherChildRecord, parentSession);
assert.strictEqual(otherChildCheck.inScope, false);
assert.strictEqual(otherChildCheck.status, 404, 'Other child record must produce 404');

// Different school record -> 404 Out of Scope
const otherSchoolRecord = {
  id: 'sch_other_record',
  schoolId: 'sch_xyz_different',
};
const otherSchoolCheck = checkRecordScope(otherSchoolRecord, principalMainSession);
assert.strictEqual(otherSchoolCheck.inScope, false);
assert.strictEqual(otherSchoolCheck.status, 404, 'Other school record must produce 404');

console.log('✓ Scope authorization rules verified (Out-of-scope record → 404)');

// 3. Presentation Components Render Tests
console.log('--- 3. Presentation Component Tests ---');

// Mock AppRouterContext so useRouter hook operates normally in Node renderToString
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

// Forbidden403 Component
const forbiddenHtml = renderToString(
  React.createElement(
    AppRouterContext.Provider,
    { value: mockRouter },
    React.createElement(Forbidden403, {
      allowedRoles: ['school_admin', 'super_admin'],
      currentRole: 'teacher',
    })
  )
);
assert(forbiddenHtml.includes('role="alert"'), 'Forbidden403 must declare role="alert"');
assert(forbiddenHtml.includes('403 Forbidden'), 'Forbidden403 must display 403 Forbidden badge');
assert(forbiddenHtml.includes('Access Restricted'), 'Forbidden403 must display headline');
assert(forbiddenHtml.includes('teacher'), 'Forbidden403 must mention current role');
assert(forbiddenHtml.includes('Return to Dashboard'), 'Forbidden403 must offer dashboard button');
assert(forbiddenHtml.includes('Switch Account'), 'Forbidden403 must offer account switch button');

// NotFound404 Component
const notFoundHtml = renderToString(
  React.createElement(
    AppRouterContext.Provider,
    { value: mockRouter },
    React.createElement(NotFound404, {
      resourceName: 'Student',
      recordId: 'stu_unknown_999',
      returnHref: '/admin/students',
      returnLabel: 'Return to Student Directory',
    })
  )
);
assert(notFoundHtml.includes('role="alert"'), 'NotFound404 must declare role="alert"');
assert(notFoundHtml.includes('404 Not Found'), 'NotFound404 must display 404 Not Found badge');
assert(notFoundHtml.includes('Student Not Found or Out of Scope'), 'NotFound404 must mention resource name');
assert(notFoundHtml.includes('stu_unknown_999'), 'NotFound404 must display record ID');
assert(notFoundHtml.includes('Return to Student Directory'), 'NotFound404 must render action button');

console.log('✓ Forbidden403 and NotFound404 components verified');

console.log('\nAll TASK-017 Route Guards tests passed successfully!');
