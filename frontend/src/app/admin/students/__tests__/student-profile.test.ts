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
import { listStudents } from '../../../../lib/repositories/students';
import { getUser } from '../../../../lib/repositories/users';
import { getCampus } from '../../../../lib/repositories/campuses';
import { getClass } from '../../../../lib/repositories/classes';
import { ToastProvider } from '../../../../components/ui/Toast';
import { SessionProvider } from '../../../../components/providers/SessionProvider';
import { StudentProfileView } from '../../../../components/students/StudentProfileView';

console.log('Running TASK-025 Student Profile (Six Tabs) Test Suite...\n');

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

  // 2. Locate students for testing
  const ahmed = allStudents.find((s) => s.id === 'stu_ahmed');
  assert(ahmed, 'Ahmed Khan (stu_ahmed) should be present');
  const ahmedUser = await getUser(ahmed.userId);
  assert(ahmedUser, 'Ahmed Khan user record must exist');
  const ahmedCampus = await getCampus(ahmed.campusId);
  const ahmedClass = await getClass(ahmed.classId);

  // Find a student with allergies
  const studentWithAllergies = allStudents.find(
    (s) => s.health?.allergies && s.health.allergies.length > 0
  );
  assert(studentWithAllergies, 'At least one student should have recorded allergies');
  console.log(
    `✓ Found test student with allergies: ${studentWithAllergies.id} (${studentWithAllergies.health?.allergies?.join(', ')})`
  );
  const allergyUser = await getUser(studentWithAllergies.userId);

  // 3. Test component render with Ahmed Khan
  console.log('\n2. Testing StudentProfileView render for Ahmed Khan...');

  const renderedHtml = renderToString(
    React.createElement(
      AppRouterContext.Provider,
      { value: mockRouter },
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          SessionProvider,
          null,
          React.createElement(StudentProfileView, {
            studentId: ahmed.id,
            initialStudent: ahmed,
            initialUser: ahmedUser,
            initialCampus: ahmedCampus,
            initialClass: ahmedClass,
          })
        )
      )
    )
  );

  // Assert Tabs exist in HTML
  assert(renderedHtml.includes('Overview'), 'Should render Overview tab');
  assert(renderedHtml.includes('Attendance'), 'Should render Attendance tab');
  assert(renderedHtml.includes('Fees'), 'Should render Fees tab');
  assert(renderedHtml.includes('Results'), 'Should render Results tab');
  assert(renderedHtml.includes('Health'), 'Should render Health tab');
  assert(renderedHtml.includes('Documents'), 'Should render Documents tab');
  console.log('✓ All 6 tabs rendered in navigation bar.');

  // Assert Header Info
  assert(renderedHtml.includes('Ahmed Khan'), 'Should render student full name');
  assert(renderedHtml.includes(ahmed.admissionNumber), 'Should display student admission number');
  assert(renderedHtml.includes(ahmed.rollNumber), 'Should display student roll number');
  console.log('✓ Student header displays name, admission number, and roll number.');

  // 4. Test Acceptance Criteria: Health tab shows allergies at the very top
  console.log('\n3. Testing Acceptance Criteria: Health tab shows allergies at top...');
  const healthHtml = renderToString(
    React.createElement(
      AppRouterContext.Provider,
      { value: mockRouter },
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          SessionProvider,
          null,
          React.createElement(StudentProfileView, {
            studentId: studentWithAllergies.id,
            initialStudent: studentWithAllergies,
            initialUser: allergyUser,
            initialTab: 'health',
          })
        )
      )
    )
  );

  // Check that the critical safety protocol heading appears
  assert(
    healthHtml.includes('CRITICAL SAFETY PROTOCOL &amp; ALLERGIES') ||
      healthHtml.includes('CRITICAL SAFETY PROTOCOL & ALLERGIES'),
    'Should display critical safety protocol heading in health tab'
  );

  assert(healthHtml.includes('Safety Priority 1'), 'Should mark allergies with Safety Priority 1');

  // Verify the allergy name is present
  const firstAllergy = studentWithAllergies.health!.allergies[0];
  assert(
    healthHtml.includes(firstAllergy),
    `Should display allergy '${firstAllergy}' in alert card`
  );

  // Verify that allergies card appears BEFORE Emergency Contacts and Pickup in the HTML stream
  const allergyPos = healthHtml.indexOf('CRITICAL SAFETY PROTOCOL');
  const medicalPos = healthHtml.indexOf('Medical Conditions &amp; Medications');
  const emergencyPos = healthHtml.indexOf('Designated Emergency Contacts');
  const pickupPos = healthHtml.indexOf('Authorised Pickup Persons');

  assert(allergyPos !== -1, 'Allergy alert must be present');
  assert(emergencyPos !== -1, 'Emergency contacts must be present');
  assert(pickupPos !== -1, 'Pickup persons must be present');
  assert(allergyPos < medicalPos || medicalPos === -1, 'CRITICAL: Allergies section MUST appear before Medical conditions');
  assert(allergyPos < emergencyPos, 'CRITICAL: Allergies section MUST appear before Emergency Contacts');
  assert(allergyPos < pickupPos, 'CRITICAL: Allergies section MUST appear before Authorized Pickup Persons');
  console.log('✓ Acceptance Criteria verified: Allergies shown at top of Health tab before emergency contacts & pickup persons.');

  // 5. Test Student Data Integrity
  console.log('\n4. Testing student data completeness across tabs...');
  assert(ahmed.admissionNumber, 'Ahmed should have an admission number');
  assert(ahmed.rollNumber, 'Ahmed should have a roll number');
  assert(ahmed.gender === 'male', 'Ahmed gender should be male');
  assert(ahmed.classId, 'Ahmed should be assigned to a class');

  // 6. Test Nonexistent Student Handling
  console.log('\n5. Testing nonexistent student graceful handling...');
  const nonExistentHtml = renderToString(
    React.createElement(
      AppRouterContext.Provider,
      { value: mockRouter },
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          SessionProvider,
          null,
          React.createElement(StudentProfileView, { studentId: 'stu_nonexistent_99999' })
        )
      )
    )
  );
  assert(nonExistentHtml.length > 0, 'Should render without throwing error');
  console.log('✓ Nonexistent student rendered safely without crashing.');

  console.log('\n🎉 ALL TASK-025 TESTS PASSED SUCCESSFULLY!');
}

runTests().catch((err) => {
  console.error('\n❌ Test execution failed:');
  console.error(err);
  process.exit(1);
});
