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
    print: () => {},
  },
  writable: true,
});

import React from 'react';
import { renderToString } from 'react-dom/server';
import { ensureSeeded } from '../../../../../lib/seed/boot';
import {
  listStudents,
  addAuthorizedPickupPerson,
  removeAuthorizedPickupPerson,
  updateStudentHealth,
} from '../../../../../lib/repositories/students';
import { listClasses } from '../../../../../lib/repositories/classes';
import { listUsers } from '../../../../../lib/repositories/users';
import { ClassDetailView } from '../../../../../components/classes/ClassDetailView';
import { PickupPersonList } from '../../../../../components/parent/PickupPersonList';
import { ParentChildProfileView } from '../../../../../components/parent/ParentChildProfileView';
import { ToastProvider } from '../../../../../components/ui/Toast';
import { SessionProvider } from '../../../../../components/providers/SessionProvider';
import { Student } from '../../../../../types';

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
        React.createElement(
          SessionProvider,
          null,
          ui
        )
      )
    )
  );
}

async function runTests() {
  console.log('--- Starting Health and Pickup Screen Tests (TASK-078) ---');

  // 1. Seed database
  await ensureSeeded();
  const scope = { schoolId: 'sch_main' };
  const students = await listStudents(scope);
  assert(students.length > 0, 'Seed students should exist');
  const student = students[0];

  // 2. Test Audit Trail on Authorized Pickup Person (TESTING_CHECKLIST.md:41)
  console.log('Testing: addAuthorizedPickupPerson stores audit trail (addedBy, addedAt)...');
  const actorUserId = 'usr_parent_01';
  const updatedStudent = await addAuthorizedPickupPerson(
    student.id,
    {
      name: 'Grandmother Eleanor',
      relationship: 'Grandmother',
      phone: '+1 555-0199',
    },
    actorUserId
  );

  const pickups = updatedStudent.health.authorisedPickup;
  const added = pickups.find((p) => p.name === 'Grandmother Eleanor');
  assert(added, 'Grandmother Eleanor should be in authorized pickup list');
  assert.strictEqual(added.addedBy, actorUserId, 'addedBy must record the user ID of the authorizer');
  assert(added.addedAt && !isNaN(Date.parse(added.addedAt)), 'addedAt must record valid ISO timestamp');
  console.log('✓ Audit trail verified:', { addedBy: added.addedBy, addedAt: added.addedAt });

  // 3. Test removeAuthorizedPickupPerson
  console.log('Testing: removeAuthorizedPickupPerson removes designated person...');
  const afterRemoval = await removeAuthorizedPickupPerson(student.id, 'Grandmother Eleanor');
  const stillThere = afterRemoval.health.authorisedPickup.some((p) => p.name === 'Grandmother Eleanor');
  assert.strictEqual(stillThere, false, 'Grandmother Eleanor should be removed from pickup list');
  console.log('✓ Pickup removal verified.');

  // 4. Test updateStudentHealth
  console.log('Testing: updateStudentHealth records allergies, conditions, and medications...');
  const healthUpdated = await updateStudentHealth(student.id, {
    allergies: ['Peanuts', 'Bee venom'],
    conditions: ['Mild Asthma'],
    medications: ['Albuterol Inhaler'],
  });
  assert.deepStrictEqual(healthUpdated.health.allergies, ['Peanuts', 'Bee venom']);
  assert.deepStrictEqual(healthUpdated.health.conditions, ['Mild Asthma']);
  assert.deepStrictEqual(healthUpdated.health.medications, ['Albuterol Inhaler']);
  console.log('✓ Student health update verified.');

  // 5. Test Allergy Alerts on Class Roster (Acceptance Criteria)
  console.log('Testing: ClassDetailView displays allergy alerts and banner on roster...');
  const classes = await listClasses(scope);
  const targetClass = classes.find((c) => c.id === student.classId) ?? classes[0];
  const allUsers = await listUsers(scope);

  // Student with allergy
  const studentWithAllergy: Student = {
    ...student,
    health: {
      ...student.health,
      allergies: ['Peanuts', 'Shellfish'],
    },
  };

  const htmlWithAllergies = renderWithProviders(
    React.createElement(ClassDetailView, {
      classId: targetClass.id,
      initialClass: targetClass,
      initialStudents: [studentWithAllergy],
      initialUsers: allUsers,
      initialSubjects: [],
    })
  );

  assert(
    htmlWithAllergies.includes('data-testid="class-allergy-banner"'),
    'ClassDetailView must display class-allergy-banner when students have allergies'
  );
  assert(
    htmlWithAllergies.includes('Class Health Alert: 1 Student with Registered Allergies'),
    'Allergy banner must show correct count of students with allergies'
  );
  assert(
    htmlWithAllergies.includes('Peanuts, Shellfish'),
    'Allergy banner must list specific allergens'
  );
  assert(
    htmlWithAllergies.includes('data-testid="allergy-alert"'),
    'Student row must contain allergy-alert indicator'
  );
  console.log('✓ ClassDetailView allergy banner & row indicators verified.');

  // Student WITHOUT allergies should not show banner
  const studentClean: Student = {
    ...student,
    health: {
      ...student.health,
      allergies: [],
    },
  };

  const htmlClean = renderWithProviders(
    React.createElement(ClassDetailView, {
      classId: targetClass.id,
      initialClass: targetClass,
      initialStudents: [studentClean],
      initialUsers: allUsers,
      initialSubjects: [],
    })
  );
  assert(
    !htmlClean.includes('data-testid="class-allergy-banner"'),
    'ClassDetailView must NOT display class-allergy-banner when no students have allergies'
  );
  assert(
    htmlClean.includes('None reported'),
    'Clean student must show "None reported" in health column'
  );
  console.log('✓ Clean class roster correctly excludes allergy banner.');

  // 6. Test PickupPersonList Component with Audit Trail Display
  console.log('Testing: PickupPersonList renders pickup items and audit trail...');
  const pickupHtml = renderWithProviders(
    React.createElement(PickupPersonList, {
      pickupPersons: [
        {
          name: 'Uncle Robert',
          relationship: 'Uncle',
          phone: '+1 555-4321',
          addedBy: 'usr_parent_01',
          addedAt: '2026-09-01T12:00:00.000Z',
        },
      ],
      onAddPickupPerson: async () => {},
      onRemovePickupPerson: async () => {},
    })
  );
  assert(pickupHtml.includes('Uncle Robert'), 'Must render pickup person name');
  assert(pickupHtml.includes('Uncle'), 'Must render relationship');
  assert(pickupHtml.includes('+1 555-4321'), 'Must render phone');
  assert(pickupHtml.includes('data-testid="pickup-audit-trail"'), 'Must render audit trail section');
  assert(pickupHtml.includes('Authorized on Sep 1, 2026 by ID: usr_parent_01'), 'Must render who and when in audit trail');
  console.log('✓ PickupPersonList audit display verified.');

  // 7. Test ParentChildProfileView Component
  console.log('Testing: ParentChildProfileView renders allergy alerts, conditions, and contacts...');
  const profileHtml = renderWithProviders(
    React.createElement(ParentChildProfileView, {
      student: studentWithAllergy,
      classInfo: targetClass,
      onAddPickupPerson: async () => {},
      onRemovePickupPerson: async () => {},
    })
  );

  assert(
    profileHtml.includes('data-testid="parent-allergy-alert"'),
    'Parent profile must show high-priority medical alert banner when student has allergies'
  );
  assert(
    profileHtml.includes('Peanuts') && profileHtml.includes('Shellfish'),
    'Parent profile alert banner must display all registered allergies'
  );
  console.log('✓ ParentChildProfileView rendered successfully with active allergy warnings.');

  console.log('--- ALL HEALTH AND PICKUP TESTS (TASK-078) PASSED! ---');
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
