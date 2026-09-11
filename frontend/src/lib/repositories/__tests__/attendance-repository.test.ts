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

import { ensureSeeded } from '../../seed/boot';
import {
  listAttendanceDays,
  getAttendanceByClassAndDate,
  getAttendanceRecord,
  saveAttendance,
  deleteAttendance,
  calculateClassDaySummary,
  getStudentAttendanceHistory,
  calculateStudentAttendanceStats,
  getClassesAttendanceStatusForDate,
  canEditAttendance,
} from '../attendance';
import { listStudents } from '../students';
import { listClasses } from '../classes';

console.log('Running TASK-032 Attendance Repository Test Suite...\n');

async function runTests() {
  const scope = { schoolId: 'sch_main', campusId: 'cmp_main' };

  // 1. Seed validation
  console.log('1. Seeding mock database...');
  await ensureSeeded({ force: true });

  const allAttendanceDays = await listAttendanceDays({ schoolId: 'sch_main' });
  console.log(`✓ Seeded ${allAttendanceDays.length} attendance day documents.`);
  // 21 classes * 40 school days = 840 documents
  assert.strictEqual(
    allAttendanceDays.length,
    840,
    'Seed should contain exactly 840 per-class-per-day documents (21 classes * 40 days)'
  );

  // 2. DATA_MODELS.md §4 Conformance: No per-student rows
  console.log('2. Verifying DATA_MODELS.md §4 schema: per-class-per-day documents, no per-student rows...');
  const sampleDoc = allAttendanceDays[0];
  assert(sampleDoc.id.startsWith('att_cls_'), 'ID must match canonical format att_${classId}_${date}');
  assert(typeof sampleDoc.date === 'string', 'Document must have date string');
  assert(typeof sampleDoc.classId === 'string', 'Document must have classId');
  assert(Array.isArray(sampleDoc.present), 'present must be an array of student IDs');
  assert(Array.isArray(sampleDoc.absent), 'absent must be an array of student IDs');
  assert(Array.isArray(sampleDoc.late), 'late must be an array of student IDs');
  assert(Array.isArray(sampleDoc.leave), 'leave must be an array of student IDs');
  assert(typeof sampleDoc.markedBy === 'string', 'Document must record markedBy');
  assert(typeof sampleDoc.markedAt === 'string', 'Document must record markedAt');

  // Verify elements of arrays are string IDs, NOT objects
  sampleDoc.present.forEach((id) => {
    assert.strictEqual(typeof id, 'string', 'present array must contain student ID strings only');
    assert(!id.includes('{'), 'Must not store nested student rows');
  });
  console.log('✓ Document model matches DATA_MODELS.md §4: single document per class per day.');

  // 3. Retrieval by Class and Date
  console.log('3. Testing getAttendanceByClassAndDate...');
  const classes = await listClasses(scope);
  const targetClass = classes[0];
  const dateStr = sampleDoc.date;

  const retrieved = await getAttendanceByClassAndDate(scope, targetClass.id, dateStr);
  assert(retrieved, 'Should retrieve attendance for target class and date');
  assert.strictEqual(retrieved.classId, targetClass.id);
  assert.strictEqual(retrieved.date, dateStr);

  const byId = await getAttendanceRecord(retrieved.id);
  assert(byId, 'Should retrieve document by ID');
  assert.strictEqual(byId.id, retrieved.id);
  console.log(`✓ Retrieved document ${retrieved.id} successfully.`);

  // 4. On-Read Calculation: Class Day Summary
  console.log('4. Testing calculateClassDaySummary (on-read computation)...');
  const summary = calculateClassDaySummary(retrieved);
  const total =
    retrieved.present.length +
    retrieved.absent.length +
    retrieved.late.length +
    retrieved.leave.length;
  assert.strictEqual(summary.totalStudents, total);
  assert.strictEqual(summary.presentCount, retrieved.present.length);
  assert.strictEqual(summary.absentCount, retrieved.absent.length);
  assert.strictEqual(summary.lateCount, retrieved.late.length);
  assert.strictEqual(summary.leaveCount, retrieved.leave.length);
  assert(summary.percentage >= 0 && summary.percentage <= 100);
  console.log(`✓ Class summary calculated: ${summary.presentCount}/${summary.totalStudents} present (${summary.percentage}%).`);

  // 5. Save Attendance: New Document and Atomic Upsert
  console.log('5. Testing saveAttendance (creation, deduplication, and revision audit)...');
  const testDate = '2026-09-18';
  const testClassId = targetClass.id;
  const testStudents = await listStudents({ schoolId: 'sch_main', classId: testClassId });
  assert(testStudents.length >= 3, 'Target class should have at least 3 students');

  const s1 = testStudents[0].id;
  const s2 = testStudents[1].id;
  const s3 = testStudents[2].id;

  // Create new attendance day
  const created = await saveAttendance(scope, {
    classId: testClassId,
    academicYearId: 'ay_2026',
    date: testDate,
    present: [s1, s2],
    absent: [s3],
    late: [],
    leave: [],
    markedBy: 'tch_test_1',
  });

  assert.strictEqual(created.id, `att_${testClassId}_${testDate}`, 'ID must follow canonical format');
  assert.strictEqual(created.present.length, 2);
  assert.strictEqual(created.absent.length, 1);
  assert.strictEqual(created.markedBy, 'tch_test_1');
  assert(created.markedAt, 'markedAt must be populated');

  // Revision / Edit: Move s3 from absent to late, and test deduplication (pass s1 in both present and absent)
  const initialMarkedAt = created.markedAt;
  const updated = await saveAttendance(scope, {
    classId: testClassId,
    academicYearId: 'ay_2026',
    date: testDate,
    present: [s1, s2],
    absent: [s1], // Deliberate duplicate to test deduplication
    late: [s3],
    leave: [],
    markedBy: 'tch_test_1',
    editedBy: 'tch_reviser',
  });

  assert.strictEqual(updated.id, created.id);
  assert.strictEqual(updated.markedAt, initialMarkedAt, 'Original markedAt must be preserved');
  assert.strictEqual(updated.markedBy, 'tch_test_1', 'Original markedBy must be preserved');
  assert.strictEqual(updated.editedBy, 'tch_reviser', 'editedBy must record reviser');
  assert(updated.editedAt, 'editedAt must be set on revision');
  assert(!updated.absent.includes(s1), 'Deduplication must prevent s1 from being in both present and absent');
  assert(updated.present.includes(s1), 's1 should remain in present');
  assert(updated.late.includes(s3), 's3 should now be late');
  console.log('✓ Save, deduplication, and revision audit trail verified.');

  // Clean up test attendance
  await deleteAttendance(created.id);
  const afterDelete = await getAttendanceRecord(created.id);
  assert.strictEqual(afterDelete, null, 'Deleted attendance should no longer exist');
  console.log('✓ Deletion verified.');

  // 6. On-Read Calculation: Student History and Downward Trend
  console.log('6. Testing getStudentAttendanceHistory & calculateStudentAttendanceStats...');
  const allStudents = await listStudents(scope);
  const normalStudent = allStudents[0];
  const history = await getStudentAttendanceHistory(scope, normalStudent.id);
  assert.strictEqual(history.length, 40, 'Student should have 40 attendance history entries matching 40 school days');
  assert(history[0].date < history[history.length - 1].date, 'History must be sorted chronologically');

  const stats = await calculateStudentAttendanceStats(scope, normalStudent.id);
  assert.strictEqual(stats.totalDays, 40);
  assert(stats.percentage >= 70 && stats.percentage <= 100, `Percentage should be realistic, got ${stats.percentage}%`);
  console.log(`✓ Student ${normalStudent.id} stats: ${stats.percentage}% presence over ${stats.totalDays} days.`);

  // Verify Downward Trend Seed Rule (Student #15 - Bilal)
  console.log('7. Verifying seed data quality rule: student downward trend...');
  const bilal = allStudents[14];
  if (bilal) {
    const bilalHistory = await getStudentAttendanceHistory(scope, bilal.id);
    const first25 = bilalHistory.slice(0, 25);
    const last15 = bilalHistory.slice(25);

    const first25Present = first25.filter((h) => h.status === 'present' || h.status === 'late').length;
    const last15Present = last15.filter((h) => h.status === 'present' || h.status === 'late').length;

    const first25Rate = (first25Present / 25) * 100;
    const last15Rate = (last15Present / 15) * 100;

    console.log(`✓ Bilal (student #15): First 25 days = ${first25Rate.toFixed(1)}%, Last 15 days = ${last15Rate.toFixed(1)}%`);
    assert(
      first25Rate > last15Rate,
      `Bilal should show a downward trend (${first25Rate}% vs ${last15Rate}%)`
    );
  }

  // 8. Class Status for Date (Admin Grid / Teacher Dashboard)
  console.log('8. Testing getClassesAttendanceStatusForDate...');
  const campusClasses = await getClassesAttendanceStatusForDate(scope, sampleDoc.date);
  assert.strictEqual(campusClasses.length, classes.length);
  const markedClass = campusClasses.find((c) => c.classId === targetClass.id);
  assert(markedClass?.isMarked, 'Target class should be marked on sample date');
  assert(markedClass?.summary, 'Marked class should have on-read summary');

  // Unmarked future date
  const futureStatuses = await getClassesAttendanceStatusForDate(scope, '2027-01-01');
  const unmarkedClass = futureStatuses.find((c) => c.classId === targetClass.id);
  assert.strictEqual(unmarkedClass?.isMarked, false, 'Future date should be unmarked');
  assert.strictEqual(unmarkedClass?.summary, undefined);
  console.log('✓ getClassesAttendanceStatusForDate accurately differentiates marked and unmarked classes.');

  // 9. Edit Window Evaluation (canEditAttendance)
  console.log('9. Testing canEditAttendance 24-hour edit window rules...');
  const recentDoc = {
    ...sampleDoc,
    markedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  };
  const teacherRecent = canEditAttendance(recentDoc, 'teacher', 24);
  assert.strictEqual(teacherRecent.canEdit, true, 'Teacher should be able to edit within 24h window');

  const oldDoc = {
    ...sampleDoc,
    markedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(), // 48 hours ago
  };
  const teacherOld = canEditAttendance(oldDoc, 'teacher', 24);
  assert.strictEqual(teacherOld.canEdit, false, 'Teacher should be blocked after 24h window');
  assert(teacherOld.reason?.includes('expired'), 'Reason should explain expiration');

  const adminOld = canEditAttendance(oldDoc, 'school_admin', 24);
  assert.strictEqual(adminOld.canEdit, true, 'School admin can edit anytime (bypass window)');

  const superAdminOld = canEditAttendance(oldDoc, 'super_admin', 24);
  assert.strictEqual(superAdminOld.canEdit, true, 'Super admin can edit anytime');
  console.log('✓ Edit window evaluation conforms to TASK-034 business rules.');

  console.log('\nAll TASK-032 Attendance Repository tests PASSED! 🎉\n');
}

runTests().catch((err) => {
  console.error('\n❌ Test failed with error:', err);
  process.exit(1);
});
