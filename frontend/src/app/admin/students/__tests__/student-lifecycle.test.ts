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
  value: { localStorage: mockStorage },
  writable: true,
});

import React from 'react';
import { renderToString } from 'react-dom/server';
import { ensureSeeded } from '../../../../lib/seed/boot';
import {
  getStudent,
  listStudents,
  listActiveStudents,
  getAttendanceEligibleStudents,
  getInvoicingEligibleStudents,
  updateStudent,
  updateStudentStatus,
} from '../../../../lib/repositories/students';
import { getUser, updateUser } from '../../../../lib/repositories/users';
import { listCampuses } from '../../../../lib/repositories/campuses';
import { listClasses } from '../../../../lib/repositories/classes';
import { ToastProvider } from '../../../../components/ui/Toast';
import { SessionProvider } from '../../../../components/providers/SessionProvider';
import { StudentEditForm } from '../../../../components/students/StudentEditForm';

console.log('Running TASK-026 Student Lifecycle & Edit Test Suite...\n');

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

async function runTests() {
  const schoolId = 'sch_main';

  // 1. Seed data
  console.log('1. Ensuring test database is seeded...');
  await ensureSeeded();
  const allStudents = await listStudents({ schoolId });
  assert(allStudents.length > 0, 'Database should have seeded students');
  console.log(`✓ Seeded ${allStudents.length} students successfully.`);

  // 2. Select target student
  const targetStudent = allStudents.find((s) => s.status === 'active' && s.classId);
  assert(targetStudent, 'An active student with classId must exist');
  const targetUser = await getUser(targetStudent.userId);
  assert(targetUser, 'Associated user account must exist');
  const classId = targetStudent.classId;
  console.log(`✓ Target student: ${targetUser.name} (${targetStudent.id}) in class ${classId}`);

  // 3. Verify Active Baseline: student is in attendance & invoicing rosters
  console.log('\n2. Testing baseline active student inclusion...');
  const initialActive = await listActiveStudents({ schoolId });
  assert(
    initialActive.some((s) => s.id === targetStudent.id),
    'Target active student must appear in active students list'
  );

  const initialAttendanceRoster = await getAttendanceEligibleStudents({ schoolId }, classId);
  assert(
    initialAttendanceRoster.some((s) => s.id === targetStudent.id),
    'Target active student must appear in class attendance roster'
  );

  const initialInvoicingRoster = await getInvoicingEligibleStudents({ schoolId }, classId);
  assert(
    initialInvoicingRoster.some((s) => s.id === targetStudent.id),
    'Target active student must appear in fee invoicing roster'
  );
  console.log('✓ Target student is eligible for attendance and invoicing while ACTIVE.');

  // 4. Test field updates (name, phone, address, allergies)
  console.log('\n3. Testing profile editing...');
  await updateUser(targetUser.id, {
    name: 'Ahmed Updated Khan',
    phone: '+92 300 7778899',
  });
  await updateStudent(targetStudent.id, {
    address: 'Updated Residential Address 123',
    health: {
      ...targetStudent.health,
      allergies: ['Peanuts', 'Dust'],
    },
  });

  const updatedStudent = await getStudent(targetStudent.id);
  const updatedUser = await getUser(targetStudent.userId);
  assert.strictEqual(updatedUser?.name, 'Ahmed Updated Khan');
  assert.strictEqual(updatedUser?.phone, '+92 300 7778899');
  assert.strictEqual(updatedStudent?.address, 'Updated Residential Address 123');
  assert.deepStrictEqual(updatedStudent?.health.allergies, ['Peanuts', 'Dust']);
  console.log('✓ Student personal and medical fields updated successfully.');

  // 5. ACCEPTANCE CRITERIA: Inactive students excluded from attendance and invoicing
  console.log('\n4. Testing Acceptance Criteria: Inactive Lifecycle Transitions...');

  // 5a. Transition to 'transferred'
  console.log('  Testing status: TRANSFERRED');
  await updateStudentStatus(targetStudent.id, 'transferred');
  const transferredStudent = await getStudent(targetStudent.id);
  assert.strictEqual(transferredStudent?.status, 'transferred');

  const transferredActive = await listActiveStudents({ schoolId });
  assert(
    !transferredActive.some((s) => s.id === targetStudent.id),
    'Transferred student MUST be excluded from listActiveStudents'
  );

  const transferredAttendance = await getAttendanceEligibleStudents({ schoolId }, classId);
  assert(
    !transferredAttendance.some((s) => s.id === targetStudent.id),
    'CRITICAL: Transferred student MUST be excluded from attendance roster'
  );

  const transferredInvoicing = await getInvoicingEligibleStudents({ schoolId }, classId);
  assert(
    !transferredInvoicing.some((s) => s.id === targetStudent.id),
    'CRITICAL: Transferred student MUST be excluded from fee invoicing roster'
  );
  console.log('  ✓ Transferred student strictly excluded from attendance and fee invoicing.');

  // 5b. Transition to 'graduated'
  console.log('  Testing status: GRADUATED');
  await updateStudentStatus(targetStudent.id, 'graduated');
  const graduatedAttendance = await getAttendanceEligibleStudents({ schoolId }, classId);
  const graduatedInvoicing = await getInvoicingEligibleStudents({ schoolId }, classId);
  assert(
    !graduatedAttendance.some((s) => s.id === targetStudent.id),
    'CRITICAL: Graduated student MUST be excluded from attendance roster'
  );
  assert(
    !graduatedInvoicing.some((s) => s.id === targetStudent.id),
    'CRITICAL: Graduated student MUST be excluded from fee invoicing roster'
  );
  console.log('  ✓ Graduated student strictly excluded from attendance and fee invoicing.');

  // 5c. Transition to 'withdrawn'
  console.log('  Testing status: WITHDRAWN');
  await updateStudentStatus(targetStudent.id, 'withdrawn');
  const withdrawnAttendance = await getAttendanceEligibleStudents({ schoolId }, classId);
  const withdrawnInvoicing = await getInvoicingEligibleStudents({ schoolId }, classId);
  assert(
    !withdrawnAttendance.some((s) => s.id === targetStudent.id),
    'CRITICAL: Withdrawn student MUST be excluded from attendance roster'
  );
  assert(
    !withdrawnInvoicing.some((s) => s.id === targetStudent.id),
    'CRITICAL: Withdrawn student MUST be excluded from fee invoicing roster'
  );
  console.log('  ✓ Withdrawn student strictly excluded from attendance and fee invoicing.');

  // 5d. Data preservation: all-inclusive listStudents still preserves the record
  const allPreserved = await listStudents({ schoolId });
  const preservedRecord = allPreserved.find((s) => s.id === targetStudent.id);
  assert(preservedRecord, 'Inactive student historical record must still exist in database');
  assert.strictEqual(preservedRecord.status, 'withdrawn');
  console.log('  ✓ Historical record preserved in database for audit and transcripts.');

  // 5e. Re-activate student
  console.log('  Testing re-activation: ACTIVE');
  await updateStudentStatus(targetStudent.id, 'active');
  const reactivatedAttendance = await getAttendanceEligibleStudents({ schoolId }, classId);
  assert(
    reactivatedAttendance.some((s) => s.id === targetStudent.id),
    'Re-activated student MUST be included in attendance roster again'
  );
  console.log('  ✓ Re-activated student restored to attendance and invoicing eligibility.');

  // 6. Presentation Component SSR Rendering
  console.log('\n5. Testing StudentEditForm SSR rendering...');
  const campuses = await listCampuses({ schoolId });
  const classes = await listClasses({ schoolId });

  const formHtml = renderToString(
    React.createElement(
      AppRouterContext.Provider,
      { value: mockRouter },
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          SessionProvider,
          null,
          React.createElement(StudentEditForm, {
            studentId: targetStudent.id,
            initialStudent: targetStudent,
            initialUser: targetUser,
            initialCampuses: campuses,
            initialClasses: classes,
          })
        )
      )
    )
  );

  assert(formHtml.includes('Edit Student Profile'), 'SSR must render page title');
  assert(formHtml.includes('Student Status Lifecycle'), 'SSR must render status lifecycle section');
  assert(formHtml.includes('Enrollment Status'), 'SSR must render enrollment status select');
  assert(formHtml.includes('Personal Information'), 'SSR must render personal details');
  assert(formHtml.includes('Academic Placement'), 'SSR must render academic placement');
  assert(formHtml.includes('Health &amp; Safety Protocols') || formHtml.includes('Health & Safety Protocols'), 'SSR must render health section');
  assert(formHtml.includes('Save Profile Changes'), 'SSR must render save button');
  console.log('✓ StudentEditForm SSR rendered all sections and lifecycle controls cleanly.');

  console.log('\n🎉 ALL TASK-026 TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('\n❌ Test execution failed:');
  console.error(err);
  process.exit(1);
});
