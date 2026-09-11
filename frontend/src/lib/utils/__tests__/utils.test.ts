import assert from 'node:assert';
import {
  attendancePercentage,
  calculateAttendanceSummary,
  calculateGrade,
  invoiceBalance,
  formatPKR,
  formatDate,
  toISODate,
  isPastDate,
  formatTime,
} from '../index';
import { resolveScope, canAccessRecord } from '../../auth/scope';
import { FeeInvoice, GradeScaleItem, Session } from '@/types';

console.log('Running TASK-009 Unit Test Suite...\n');

// ==========================================
// 1. ATTENDANCE PERCENTAGE TESTS
// ==========================================
console.log('--- 1. Attendance Percentage Tests ---');

// Standard counts
assert.strictEqual(
  attendancePercentage({ present: 18, absent: 2, late: 0, leave: 0 }),
  90.0,
  '18 present out of 20 must equal 90.0%'
);

// Array of statuses
assert.strictEqual(
  attendancePercentage(['present', 'present', 'present', 'absent']),
  75.0,
  '3 present and 1 absent must equal 75.0%'
);

// Exclude leave from denominator by default
assert.strictEqual(
  attendancePercentage({ present: 9, absent: 1, late: 0, leave: 2 }),
  90.0,
  '10 evaluated days (9 present, 1 absent) excluding 2 leaves must equal 90.0%'
);

// Include leave if requested
assert.strictEqual(
  attendancePercentage({ present: 9, absent: 1, late: 0, leave: 2 }, { excludeLeave: false }),
  75.0,
  '12 total days with 9 present must equal 75.0%'
);

// Late weighting
assert.strictEqual(
  attendancePercentage({ present: 8, absent: 2, late: 2, leave: 0 }, { lateWeight: 0.5 }),
  75.0,
  '8 + (2 * 0.5) = 9 out of 12 = 75.0%'
);

// Zero days (empty)
assert.strictEqual(
  attendancePercentage({ present: 0, absent: 0, late: 0, leave: 0 }),
  0,
  'Zero attendance must return 0%'
);

// Summary calculation helper
const summary = calculateAttendanceSummary({ present: 27, absent: 3, late: 0, leave: 0 });
assert.strictEqual(summary.percentage, 90.0);
assert.strictEqual(summary.totalStudents, 30);
console.log('✓ Attendance percentage calculations verified');


// ==========================================
// 2. DYNAMIC GRADING TESTS
// ==========================================
console.log('--- 2. Dynamic Grading Tests ---');

// Standard scale lookups
const gradeAStar = calculateGrade(95, 100);
assert.strictEqual(gradeAStar.grade, 'A*');
assert.strictEqual(gradeAStar.gpa, 4.0);
assert.strictEqual(gradeAStar.isPassing, true);

const gradeA = calculateGrade(80, 100);
assert.strictEqual(gradeA.grade, 'A');
assert.strictEqual(gradeA.gpa, 3.7);

const gradeB = calculateGrade(74.5, 100);
assert.strictEqual(gradeB.grade, 'B');

const gradeF = calculateGrade(42, 100);
assert.strictEqual(gradeF.grade, 'F');
assert.strictEqual(gradeF.isPassing, false);

// Boundary checks
assert.strictEqual(calculateGrade(89.9, 100).grade, 'A');
assert.strictEqual(calculateGrade(90.0, 100).grade, 'A*');

// Custom scale (e.g. from Settings)
const customScale: GradeScaleItem[] = [
  { grade: 'Distinction', minPercentage: 85, maxPercentage: 100, gpa: 4.0 },
  { grade: 'Merit', minPercentage: 65, maxPercentage: 84.99, gpa: 3.0 },
  { grade: 'Pass', minPercentage: 50, maxPercentage: 64.99, gpa: 2.0 },
  { grade: 'Unsatisfactory', minPercentage: 0, maxPercentage: 49.99, gpa: 0.0 },
];

const customRes = calculateGrade(70, 100, customScale);
assert.strictEqual(customRes.grade, 'Merit');
assert.strictEqual(customRes.gpa, 3.0);

// Invalid max score edge case
const edgeScore = calculateGrade(50, 0);
assert.strictEqual(edgeScore.percentage, 0);
assert.strictEqual(edgeScore.isPassing, false);
console.log('✓ Dynamic grading calculations verified');


// ==========================================
// 3. INVOICE BALANCE TESTS
// ==========================================
console.log('--- 3. Invoice Balance Tests ---');

const baseInvoice: FeeInvoice = {
  id: 'inv_test_1',
  schoolId: 'sch_abc',
  campusId: 'cmp_main',
  studentId: 'stu_1',
  feeStructureId: 'fs_grade8',
  invoiceNumber: 'INV-2026-001',
  lineItems: [{ label: 'Tuition', amount: 15000 }],
  totalAmount: 15000,
  discountAmount: 2000,
  paidAmount: 0,
  dueDate: '2026-09-10',
  status: 'pending',
  payments: [],
};

// Case 1: Pending with discount
const bal1 = invoiceBalance(baseInvoice, { asOfDate: '2026-09-08' });
assert.strictEqual(bal1.grossAmount, 15000);
assert.strictEqual(bal1.discountAmount, 2000);
assert.strictEqual(bal1.subtotal, 13000);
assert.strictEqual(bal1.remainingBalance, 13000);
assert.strictEqual(bal1.effectiveStatus, 'pending');
assert.strictEqual(bal1.isOverdue, false);

// Case 2: Partial payment
const partialInvoice: FeeInvoice = {
  ...baseInvoice,
  paidAmount: 5000,
  payments: [
    {
      id: 'pay_1',
      amount: 5000,
      method: 'bank',
      receivedBy: 'usr_admin',
      receivedAt: '2026-09-05T10:00:00.000Z',
      receiptNumber: 'RCP-001',
    },
  ],
};
const bal2 = invoiceBalance(partialInvoice, { asOfDate: '2026-09-08' });
assert.strictEqual(bal2.totalPaid, 5000);
assert.strictEqual(bal2.remainingBalance, 8000);
assert.strictEqual(bal2.effectiveStatus, 'partial');

// Case 3: Fully paid
const fullyPaidInvoice: FeeInvoice = {
  ...baseInvoice,
  paidAmount: 13000,
  payments: [
    {
      id: 'pay_1',
      amount: 13000,
      method: 'cash',
      receivedBy: 'usr_admin',
      receivedAt: '2026-09-06T10:00:00.000Z',
      receiptNumber: 'RCP-002',
    },
  ],
};
const bal3 = invoiceBalance(fullyPaidInvoice, { asOfDate: '2026-09-08' });
assert.strictEqual(bal3.remainingBalance, 0);
assert.strictEqual(bal3.effectiveStatus, 'paid');

// Case 4: Overdue with late fee
const overdueInvoice: FeeInvoice = {
  ...baseInvoice,
  dueDate: '2026-08-15', // Past due date
};
const bal4 = invoiceBalance(overdueInvoice, { asOfDate: '2026-09-08', lateFee: 500 });
assert.strictEqual(bal4.isOverdue, true);
assert.strictEqual(bal4.lateFee, 500);
assert.strictEqual(bal4.netPayable, 13500); // 13,000 subtotal + 500 late fee
assert.strictEqual(bal4.remainingBalance, 13500);
assert.strictEqual(bal4.effectiveStatus, 'overdue');
console.log('✓ Fee balance calculations verified');


// ==========================================
// 4. AUTH & SCOPE RESOLUTION TESTS
// ==========================================
console.log('--- 4. Auth & Scope Resolution Tests ---');

// Super Admin: global access
const superAdminSession: Session = {
  userId: 'usr_sa',
  role: 'super_admin',
  schoolId: 'sch_abc',
};
const saScope = resolveScope(superAdminSession, { campusId: 'cmp_north' });
assert.strictEqual(saScope.canSwitchCampus, true);
assert.strictEqual(saScope.effectiveScope.campusId, 'cmp_north');
assert.strictEqual(saScope.canAccess({ schoolId: 'sch_other', campusId: 'cmp_other' }), true);

// School Admin: scoped to school, can switch campuses
const schoolAdminSession: Session = {
  userId: 'usr_admin',
  role: 'school_admin',
  schoolId: 'sch_abc',
  campusId: 'cmp_main',
};
const adminScope = resolveScope(schoolAdminSession, { campusId: 'cmp_girls' });
assert.strictEqual(adminScope.canSwitchCampus, true);
assert.strictEqual(adminScope.effectiveScope.campusId, 'cmp_girls');
assert.strictEqual(adminScope.canAccess({ schoolId: 'sch_abc', campusId: 'cmp_girls' }), true);
assert.strictEqual(adminScope.canAccess({ schoolId: 'sch_other' }), false, 'Must block other schools');

// Principal: locked to their campus
const principalSession: Session = {
  userId: 'usr_principal',
  role: 'principal',
  schoolId: 'sch_abc',
  campusId: 'cmp_main',
};
const principalScope = resolveScope(principalSession, { campusId: 'cmp_north' });
assert.strictEqual(principalScope.canSwitchCampus, false, 'Principal cannot switch campus');
assert.strictEqual(principalScope.effectiveScope.campusId, 'cmp_main', 'Campus must remain locked to cmp_main');
assert.strictEqual(principalScope.canAccess({ schoolId: 'sch_abc', campusId: 'cmp_main' }), true);
assert.strictEqual(principalScope.canAccess({ schoolId: 'sch_abc', campusId: 'cmp_north' }), false);

// Parent: locked to active child
const parentSession: Session = {
  userId: 'usr_parent',
  role: 'parent',
  schoolId: 'sch_abc',
  campusId: 'cmp_main',
  activeChildId: 'stu_ahmed',
};
const parentScope = resolveScope(parentSession);
assert.strictEqual(parentScope.canAccess({ schoolId: 'sch_abc', studentId: 'stu_ahmed' }), true);
assert.strictEqual(parentScope.canAccess({ schoolId: 'sch_abc', studentId: 'stu_other' }), false);

// Student: locked to own userId
const studentSession: Session = {
  userId: 'stu_ahmed',
  role: 'student',
  schoolId: 'sch_abc',
  campusId: 'cmp_main',
};
assert.strictEqual(canAccessRecord(studentSession, { schoolId: 'sch_abc', studentId: 'stu_ahmed' }), true);
assert.strictEqual(canAccessRecord(studentSession, { schoolId: 'sch_abc', studentId: 'stu_other' }), false);
console.log('✓ Scope resolution and role access checks verified');


// ==========================================
// 5. CURRENCY & DATE FORMATTING TESTS
// ==========================================
console.log('--- 5. Currency & Date Formatting Tests ---');

// PKR currency
assert.strictEqual(formatPKR(12500), 'PKR 12,500');
assert.strictEqual(formatPKR(12500, { prefix: 'Rs.' }), 'Rs. 12,500');
assert.strictEqual(formatPKR(12500, { prefix: '' }), '12,500');
assert.strictEqual(formatPKR(12500.5, { decimals: 2 }), 'PKR 12,500.50');
assert.strictEqual(formatPKR(1500000, { compact: true }), 'PKR 1.5M');
assert.strictEqual(formatPKR(45000, { compact: true }), 'PKR 45K');
assert.strictEqual(formatPKR(-500), '-PKR 500');
assert.strictEqual(formatPKR(NaN), 'PKR 0');

// Date formatting
assert.strictEqual(formatDate('2026-09-08', 'medium'), '08 Sep 2026');
assert.strictEqual(formatDate('2026-09-08', 'short'), '08/09/2026');
assert.strictEqual(formatDate('2026-09-08', 'long'), 'September 8, 2026');
assert.strictEqual(formatDate('2026-09-08', 'iso'), '2026-09-08');
assert.strictEqual(formatDate(null), '—');

// ISO string generation
const fixedDate = new Date(2026, 8, 8); // Sep 8, 2026
assert.strictEqual(toISODate(fixedDate), '2026-09-08');

// Past date comparison
assert.strictEqual(isPastDate('2026-09-01', '2026-09-08'), true);
assert.strictEqual(isPastDate('2026-09-15', '2026-09-08'), false);

// Time format
assert.strictEqual(formatTime('14:30'), '02:30 PM');
assert.strictEqual(formatTime('09:15'), '09:15 AM');
console.log('✓ Currency and date formatting verified');

console.log('\n========================================');
console.log('ALL TASK-009 UNIT TESTS PASSED! ✅');
console.log('========================================');
