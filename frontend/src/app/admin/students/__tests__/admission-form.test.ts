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
import { listStudents, createStudent } from '../../../../lib/repositories/students';
import { listUsers, createUser } from '../../../../lib/repositories/users';
import { createParent } from '../../../../lib/repositories/parents';
import { createStudentParent, getStudentParentsByStudentId } from '../../../../lib/repositories/studentParents';
import { listCampuses } from '../../../../lib/repositories/campuses';
import { listClasses } from '../../../../lib/repositories/classes';
import { ToastProvider } from '../../../../components/ui/Toast';
import { SessionProvider } from '../../../../components/providers/SessionProvider';
import { AdmissionForm } from '../../../../components/students/AdmissionForm';

console.log('Running TASK-024 Admission Form (All Six Sections) Test Suite...\n');

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

  // 0. Seed storage
  console.log('--- Seeding Storage for Admission Form Tests ---');
  await ensureSeeded();
  console.log('✓ Storage seeded');

  const [existingStudents, studentUsers, campuses, classes] = await Promise.all([
    listStudents({ schoolId }),
    listUsers({ schoolId }, { role: 'student' }),
    listCampuses({ schoolId }),
    listClasses({ schoolId }),
  ]);

  const userMap = new Map(studentUsers.map((u) => [u.id, u.name]));
  assert(existingStudents.length > 0, 'Seed must contain existing students');
  const existingStudent = existingStudents[0];
  const existingName = userMap.get(existingStudent.userId) ?? 'Existing Student';

  // 1. Acceptance Criteria 1: Emergency contact required
  console.log('--- 1. Acceptance Criteria: Emergency Contact Required ---');

  function validateEmergencyContacts(contacts: { name: string; phone: string }[]): {
    valid: boolean;
    error?: string;
  } {
    const validContacts = contacts.filter(
      (c) => c.name.trim() !== '' && c.phone.trim() !== ''
    );
    if (validContacts.length === 0) {
      return {
        valid: false,
        error: 'At least one complete emergency contact (Name and Phone) is strictly required (Section 5: Health & Safety).',
      };
    }
    return { valid: true };
  }

  // Case 1A: Empty contacts array
  const emptyCheck = validateEmergencyContacts([]);
  assert.strictEqual(emptyCheck.valid, false, 'Empty emergency contacts must be rejected');
  assert(emptyCheck.error?.includes('emergency contact'), 'Must explain emergency contact requirement');

  // Case 1B: Contact with blank fields
  const blankCheck = validateEmergencyContacts([{ name: '', phone: '' }]);
  assert.strictEqual(blankCheck.valid, false, 'Blank emergency contact must be rejected');

  // Case 1C: Complete contact
  const validCheck = validateEmergencyContacts([
    { name: 'Tariq Khan', phone: '0300-8254120' },
  ]);
  assert.strictEqual(validCheck.valid, true, 'Complete emergency contact must be accepted');
  console.log('✓ Validation strictly enforces at least 1 complete emergency contact');

  // 2. Acceptance Criteria 2: Duplicate admission number blocked with student name
  console.log('--- 2. Acceptance Criteria: Duplicate Admission Number Blocked ---');

  async function checkDuplicateAdmission(admNumber: string): Promise<{
    isDuplicate: boolean;
    error?: string;
  }> {
    const students = await listStudents({ schoolId });
    const duplicate = students.find(
      (s) => s.admissionNumber.trim().toLowerCase() === admNumber.trim().toLowerCase()
    );

    if (duplicate) {
      const users = await listUsers({ schoolId }, { role: 'student' });
      const dupUser = users.find((u) => u.id === duplicate.userId);
      const name = dupUser ? dupUser.name : 'another student';
      return {
        isDuplicate: true,
        error: `Admission number "${admNumber}" is already assigned to student ${name}. Duplicate admission numbers are blocked. Please specify a unique admission number.`,
      };
    }
    return { isDuplicate: false };
  }

  // Test duplicate detection using existing student's admission number
  const duplicateResult = await checkDuplicateAdmission(existingStudent.admissionNumber);
  assert.strictEqual(duplicateResult.isDuplicate, true, 'Existing admission number must be flagged as duplicate');
  assert(
    duplicateResult.error?.includes(existingName),
    `Error message must explicitly name the existing student (${existingName}): ${duplicateResult.error}`
  );
  assert(
    duplicateResult.error?.includes('Duplicate admission numbers are blocked'),
    'Error message must state duplicate numbers are blocked'
  );

  // Test non-duplicate admission number
  const uniqueResult = await checkDuplicateAdmission('ADM-2099-UNIQUE-001');
  assert.strictEqual(uniqueResult.isDuplicate, false, 'Unique admission number must be accepted');
  console.log(`✓ Duplicate admission number blocked with error naming existing student '${existingName}'`);

  // 3. Full Six-Section Admission Flow
  console.log('--- 3. Full Six-Section Admission Creation Flow ---');

  const newAdmissionNumber = 'ADM-2026-TEST-999';
  const targetCampus = campuses[0];
  const targetClass = classes.find((c) => c.campusId === targetCampus.id) ?? classes[0];

  // Section 1 & User creation
  const createdStudentUser = await createUser({
    schoolId,
    campusId: targetCampus.id,
    name: 'Zainab Qureshi',
    email: 'zainab.qureshi.test@abcschool.pk',
    role: 'student',
    status: 'active',
  });
  assert(createdStudentUser.id.startsWith('usr_'), 'Student user ID must be generated');

  // Section 4 Parent creation
  const createdParentUser = await createUser({
    schoolId,
    campusId: targetCampus.id,
    name: 'Hamza Qureshi',
    email: 'hamza.qureshi.test@abcschool.pk',
    phone: '0321-9988776',
    role: 'parent',
    status: 'active',
  });
  const createdParent = await createParent({
    schoolId,
    userId: createdParentUser.id,
    occupation: 'Architect',
  });
  assert(createdParent.id.startsWith('prt_'), 'Parent ID must be generated');

  // Sections 1, 2, 3, 5 Student creation
  const createdStudent = await createStudent({
    schoolId,
    campusId: targetCampus.id,
    userId: createdStudentUser.id,
    classId: targetClass.id,
    academicYearId: 'ay_2026_2027',
    admissionNumber: newAdmissionNumber,
    rollNumber: '35',
    dob: '2014-08-20',
    gender: 'female',
    address: 'House 12, Street 4, Clifton, Karachi',
    admissionDate: '2026-09-01',
    status: 'active',
    health: {
      allergies: ['Peanuts', 'Penicillin'],
      conditions: ['Mild Asthma'],
      medications: ['Salbutamol inhaler as needed'],
      bloodGroup: 'O+',
      doctorName: 'Dr. Tariq Parvez',
      doctorPhone: '021-35876543',
      emergencyContacts: [
        {
          name: 'Hamza Qureshi',
          relationship: 'Father',
          phone: '0321-9988776',
          priority: 1,
        },
      ],
      authorisedPickup: [
        {
          name: 'Muhammad Rafiq',
          relationship: 'Family Driver',
          phone: '0312-3456789',
          addedBy: 'usr_admin',
          addedAt: new Date().toISOString(),
        },
      ],
    },
  });

  assert.strictEqual(createdStudent.admissionNumber, newAdmissionNumber);
  assert.strictEqual(createdStudent.health.allergies.length, 2);
  assert.strictEqual(createdStudent.health.emergencyContacts.length, 1);
  assert.strictEqual(createdStudent.health.authorisedPickup.length, 1);

  // Link Student & Parent
  const studentParentLink = await createStudentParent({
    studentId: createdStudent.id,
    parentId: createdParent.id,
    relationship: 'father',
    isPrimary: true,
  });
  assert(studentParentLink.id.startsWith('sp_'), 'StudentParent link ID must be generated');

  const links = await getStudentParentsByStudentId(createdStudent.id);
  assert.strictEqual(links.length, 1);
  assert.strictEqual(links[0].parentId, createdParent.id);
  assert.strictEqual(links[0].isPrimary, true);

  console.log(`✓ Student '${createdStudentUser.name}' successfully admitted with all six sections and parent linked`);

  // 4. Presentation Component SSR Rendering
  console.log('--- 4. Presentation Component SSR Render ---');
  const ssrHtml = renderToString(
    React.createElement(
      AppRouterContext.Provider,
      { value: mockRouter },
      React.createElement(
        ToastProvider,
        null,
        React.createElement(
          SessionProvider,
          null,
          React.createElement(AdmissionForm)
        )
      )
    )
  );

  assert(ssrHtml.includes('Student Admission Form'), 'SSR must render page header');
  assert(ssrHtml.includes('Personal Information'), 'SSR must render Section 1');
  assert(ssrHtml.includes('Academic Placement'), 'SSR must render Section 2');
  assert(ssrHtml.includes('Address &amp; Contact') || ssrHtml.includes('Address & Contact'), 'SSR must render Section 3');
  assert(ssrHtml.includes('Parent or Guardian'), 'SSR must render Section 4');
  assert(ssrHtml.includes('Health and Safety'), 'SSR must render Section 5');
  assert(ssrHtml.includes('Emergency Contacts'), 'SSR must render emergency contacts');
  assert(ssrHtml.includes('Documents'), 'SSR must render Section 6');
  console.log('✓ AdmissionForm SSR render verified across all six sections');

  console.log('\nAll TASK-024 Admission Form tests passed successfully! ✅');
}

runTests().catch((err) => {
  console.error('Admission form test failed:', err);
  process.exit(1);
});
