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
import { ensureSeeded } from '../../../../../../lib/seed/boot';
import {
  canEditAttendance,
  saveAttendance,
} from '../../../../../../lib/repositories/attendance';
import { getSettings } from '../../../../../../lib/repositories/settings';
import { AttendanceAuditBanner } from '../../../../../../components/attendance/AttendanceAuditBanner';
import { AttendanceAuditModal } from '../../../../../../components/attendance/AttendanceAuditModal';
import { AttendanceDay, User } from '../../../../../../types';

async function runTests() {
  console.log('Running TASK-034 Attendance Save, Edit Window & Audit Trail Test Suite...\n');

  // 1. Seed database
  console.log('1. Seeding mock database...');
  await ensureSeeded();
  const settings = await getSettings();
  assert.strictEqual(
    settings.attendanceEditWindowHours,
    48,
    'Default attendance edit window should be 48 hours (2 days)'
  );
  console.log('✓ Configurable edit window verified in settings: 48 hours.');

  // 2. Test canEditAttendance within window
  console.log('2. Testing edit window evaluation within allowed window...');
  const now = new Date();
  const recentTime = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
  const freshRecord: AttendanceDay = {
    id: 'att_test_fresh',
    schoolId: 'sch_default',
    campusId: 'cmp_main',
    classId: 'cls_1',
    academicYearId: 'ay_2026',
    date: '2026-09-10',
    present: ['stu_1', 'stu_2'],
    absent: [],
    late: [],
    leave: [],
    markedBy: 'usr_tariq',
    markedAt: recentTime,
  };

  const freshTeacherCheck = canEditAttendance(freshRecord, 'teacher', 48);
  assert.strictEqual(freshTeacherCheck.canEdit, true, 'Teacher should be allowed to edit within 48 hours');
  assert.strictEqual(freshTeacherCheck.isExpired, false, 'Fresh record should not be expired');
  assert.strictEqual(freshTeacherCheck.isAdminOverride, false, 'No admin override needed within window');
  assert.strictEqual(freshTeacherCheck.hoursRemaining >= 45, true, 'Should indicate ~46 hours remaining');
  console.log(`✓ Teacher edit allowed within window (${freshTeacherCheck.hoursRemaining}h remaining).`);

  // 3. Test canEditAttendance outside window for teacher (Locked / Blocked)
  console.log('3. Testing edit window expiry for teacher role (> 48h)...');
  const expiredTime = new Date(now.getTime() - 50 * 60 * 60 * 1000).toISOString(); // 50 hours ago
  const expiredRecord: AttendanceDay = {
    id: 'att_test_expired',
    schoolId: 'sch_default',
    campusId: 'cmp_main',
    classId: 'cls_1',
    academicYearId: 'ay_2026',
    date: '2026-09-08',
    present: ['stu_1', 'stu_2'],
    absent: [],
    late: [],
    leave: [],
    markedBy: 'usr_tariq',
    markedAt: expiredTime,
  };

  const expiredTeacherCheck = canEditAttendance(expiredRecord, 'teacher', 48);
  assert.strictEqual(expiredTeacherCheck.canEdit, false, 'Teacher should be blocked from editing after 48h');
  assert.strictEqual(expiredTeacherCheck.isExpired, true, 'Record should be marked expired');
  assert.strictEqual(expiredTeacherCheck.hoursRemaining, 0, 'Hours remaining should be 0');
  assert.strictEqual(typeof expiredTeacherCheck.reason, 'string', 'Should provide helpful reason to user');
  console.log('✓ Teacher edit blocked when edit window expired.');

  // 4. Test admin override outside window (Super Admin & School Admin)
  console.log('4. Testing admin override for expired registers...');
  const schoolAdminCheck = canEditAttendance(expiredRecord, 'school_admin', 48);
  assert.strictEqual(schoolAdminCheck.canEdit, true, 'School Admin must have permission to edit expired registers');
  assert.strictEqual(schoolAdminCheck.isAdminOverride, true, 'Should flag admin override as active');

  const superAdminCheck = canEditAttendance(expiredRecord, 'super_admin', 48);
  assert.strictEqual(superAdminCheck.canEdit, true, 'Super Admin must have permission to edit expired registers');
  assert.strictEqual(superAdminCheck.isAdminOverride, true, 'Should flag admin override as active');
  console.log('✓ Administrative override verified for School Admin and Super Admin.');

  // 5. Test Audit Trail Preservation & Revision Tracking
  console.log('5. Testing audit trail persistence and revision tracking...');
  const scope = { schoolId: 'sch_default', campusId: 'cmp_main', classId: 'cls_audit_test' };
  const initialDate = '2026-09-09';

  // Initial creation by teacher
  const initialSave = await saveAttendance(scope, {
    classId: 'cls_audit_test',
    campusId: 'cmp_main',
    academicYearId: 'ay_2026',
    date: initialDate,
    present: ['stu_1', 'stu_2', 'stu_3'],
    absent: [],
    late: [],
    leave: [],
    markedBy: 'usr_tariq',
  });

  assert.strictEqual(initialSave.markedBy, 'usr_tariq', 'Original markedBy preserved');
  assert.ok(initialSave.markedAt, 'markedAt timestamp created');
  assert.strictEqual(initialSave.editedBy, undefined, 'No editedBy on initial creation');
  assert.strictEqual(initialSave.editedAt, undefined, 'No editedAt on initial creation');

  // Revision by admin
  const revisionSave = await saveAttendance(scope, {
    classId: 'cls_audit_test',
    campusId: 'cmp_main',
    academicYearId: 'ay_2026',
    date: initialDate,
    present: ['stu_1'],
    absent: ['stu_2'],
    late: ['stu_3'],
    leave: [],
    markedBy: 'usr_tariq', // original marker
    editedBy: 'usr_admin', // revising user
  });

  assert.strictEqual(revisionSave.markedBy, 'usr_tariq', 'Original marker MUST remain immutable');
  assert.strictEqual(revisionSave.markedAt, initialSave.markedAt, 'Original markedAt timestamp MUST remain immutable');
  assert.strictEqual(revisionSave.editedBy, 'usr_admin', 'Revision records editedBy user');
  assert.ok(revisionSave.editedAt, 'Revision records editedAt timestamp');
  console.log('✓ Audit trail immutability verified: markedBy/markedAt preserved, editedBy/editedAt updated.');

  // 6. Test Component Rendering (SSR)
  console.log('6. Validating SSR rendering of AttendanceAuditBanner and AttendanceAuditModal...');
  const mockTeacher: User = {
    id: 'usr_tariq',
    schoolId: 'sch_default',
    email: 'tariq.teacher@demo.com',
    name: 'Tariq Teacher',
    role: 'teacher',
    status: 'active',
  };

  const mockAdmin: User = {
    id: 'usr_admin',
    schoolId: 'sch_default',
    email: 'admin@demo.com',
    name: 'Principal Tariq',
    role: 'school_admin',
    status: 'active',
  };

  // Render Banner (Fresh state)
  const bannerFreshHtml = renderToString(
    React.createElement(AttendanceAuditBanner, {
      attendanceRecord: revisionSave,
      markedByUser: mockTeacher,
      editedByUser: mockAdmin,
      editWindowCheck: freshTeacherCheck,
      onViewAuditHistory: () => {},
    })
  );
  assert.ok(bannerFreshHtml.includes('Tariq Teacher'), 'Banner renders marker name');
  assert.ok(bannerFreshHtml.includes('Principal Tariq'), 'Banner renders editor name');
  assert.ok(bannerFreshHtml.includes('Edit Window Open'), 'Banner indicates open window');
  console.log('✓ AttendanceAuditBanner (Open window) rendered cleanly.');

  // Render Banner (Locked state)
  const bannerLockedHtml = renderToString(
    React.createElement(AttendanceAuditBanner, {
      attendanceRecord: expiredRecord,
      markedByUser: mockTeacher,
      editedByUser: null,
      editWindowCheck: expiredTeacherCheck,
      onViewAuditHistory: () => {},
    })
  );
  assert.ok(bannerLockedHtml.includes('Locked (Window Expired)'), 'Banner indicates locked register');
  assert.ok(bannerLockedHtml.includes('Read-Only Mode'), 'Banner warns teacher of read-only mode');
  console.log('✓ AttendanceAuditBanner (Locked state) rendered cleanly.');

  // Render Modal
  const modalHtml = renderToString(
    React.createElement(AttendanceAuditModal, {
      isOpen: true,
      onClose: () => {},
      attendanceRecord: revisionSave,
      markedByUser: mockTeacher,
      editedByUser: mockAdmin,
      editWindowCheck: freshTeacherCheck,
      classNameString: 'Grade 6-A',
      dateString: '2026-09-09',
    })
  );
  assert.ok(modalHtml.includes('Attendance Audit Log'), 'Modal renders title');
  assert.ok(modalHtml.includes('Initial Attendance Submission'), 'Modal renders submission event');
  assert.ok(modalHtml.includes('Register Modification / Correction'), 'Modal renders modification event');
  assert.ok(modalHtml.includes('School Attendance Integrity Policy'), 'Modal renders policy notice');
  console.log('✓ AttendanceAuditModal rendered cleanly with full timeline.');

  console.log('\nAll TASK-034 Save, Edit Window & Audit Trail tests PASSED! 🎉\n');
}

runTests().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
