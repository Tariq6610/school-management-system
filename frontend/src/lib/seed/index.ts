/**
 * Seed bootstrap and persistence routines.
 * Reference: DATA_MODELS.md §6
 */

import { clearPrefix, getStorageUsage, setItem, STORAGE_KEYS } from '../storage';
import { generateSeedData } from './generator';

export { generateSeedData } from './generator';
export type { SeedData } from './generator';
export { ensureSeeded, forceReseed } from './boot';
export type { BootResult } from './boot';

/**
 * Persist the entire demo-network seed profile into localStorage.
 * Wipes previous data under 'sp:v1:' before writing.
 */
export async function seedDemoNetwork(): Promise<{ bytes: number; formatted: string }> {
  const data = generateSeedData();

  // 1. Wipe existing state
  clearPrefix();

  // 2. Persist collections
  setItem(STORAGE_KEYS.SCHOOLS, [data.school]);
  setItem(STORAGE_KEYS.CAMPUSES, data.campuses);
  setItem(STORAGE_KEYS.ACADEMIC_YEARS, [data.academicYear]);
  setItem(STORAGE_KEYS.USERS, data.users);
  setItem(STORAGE_KEYS.TEACHERS, data.teachers);
  setItem(STORAGE_KEYS.CLASSES, data.classes);
  setItem(STORAGE_KEYS.SUBJECTS, data.subjects);
  setItem(STORAGE_KEYS.TIMETABLE_SLOTS, data.timetableSlots);
  setItem(STORAGE_KEYS.STUDENTS, data.students);
  setItem(STORAGE_KEYS.PARENTS, data.parents);
  setItem(STORAGE_KEYS.STUDENT_PARENTS, data.studentParents);
  setItem(STORAGE_KEYS.ATTENDANCE, data.attendance);
  setItem(STORAGE_KEYS.FEE_STRUCTURES, data.feeStructures);
  setItem(STORAGE_KEYS.FEE_INVOICES, data.feeInvoices);
  setItem(STORAGE_KEYS.EXAMS, data.exams);
  setItem(STORAGE_KEYS.EXAM_RESULTS, data.examResults);
  setItem(STORAGE_KEYS.COURSES, data.courses);
  setItem(STORAGE_KEYS.LESSONS, data.lessons);
  setItem(STORAGE_KEYS.ASSIGNMENTS, data.assignments);
  setItem(STORAGE_KEYS.SUBMISSIONS, data.submissions);
  setItem(STORAGE_KEYS.ANNOUNCEMENTS, data.announcements);
  setItem(STORAGE_KEYS.LEAVE_REQUESTS, data.leaveRequests);
  setItem(STORAGE_KEYS.MESSAGES, data.messages);
  setItem(STORAGE_KEYS.NOTIFICATIONS, data.notifications);
  setItem(STORAGE_KEYS.WHATSAPP_LOG, data.whatsappLog);
  setItem(STORAGE_KEYS.SETTINGS, data.settings);
  setItem(STORAGE_KEYS.META, data.meta);

  // 3. Return storage footprint
  return getStorageUsage();
}
