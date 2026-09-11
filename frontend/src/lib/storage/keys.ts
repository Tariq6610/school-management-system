/**
 * Storage key constants adhering to DATA_MODELS.md §1:
 * Format: sp:v1:<collection>
 */

export const STORAGE_PREFIX = 'sp:v1:';

export const STORAGE_KEYS = {
  USERS: 'sp:v1:users',
  SCHOOLS: 'sp:v1:schools',
  CAMPUSES: 'sp:v1:campuses',
  ACADEMIC_YEARS: 'sp:v1:academicYears',
  SETTINGS: 'sp:v1:settings',
  SESSION: 'sp:v1:session',
  META: 'sp:v1:meta',
  STUDENTS: 'sp:v1:students',
  PARENTS: 'sp:v1:parents',
  STUDENT_PARENTS: 'sp:v1:studentParents',
  TEACHERS: 'sp:v1:teachers',
  CLASSES: 'sp:v1:classes',
  SUBJECTS: 'sp:v1:subjects',
  TIMETABLE_SLOTS: 'sp:v1:timetableSlots',
  ATTENDANCE: 'sp:v1:attendance',
  FEE_STRUCTURES: 'sp:v1:feeStructures',
  FEE_INVOICES: 'sp:v1:feeInvoices',
  STUDENT_CONCESSIONS: 'sp:v1:studentConcessions',
  COURSES: 'sp:v1:courses',
  LESSONS: 'sp:v1:lessons',
  ASSIGNMENTS: 'sp:v1:assignments',
  SUBMISSIONS: 'sp:v1:submissions',
  EXAMS: 'sp:v1:exams',
  EXAM_RESULTS: 'sp:v1:examResults',
  ANNOUNCEMENTS: 'sp:v1:announcements',
  MESSAGES: 'sp:v1:messages',
  NOTIFICATIONS: 'sp:v1:notifications',
  WHATSAPP_LOG: 'sp:v1:whatsappLog',
  LESSON_COMPLETIONS: 'sp:v1:lessonCompletions',
  LEARNING_PROFILES: 'sp:v1:learningProfiles',
  OUTREACH_LOGS: 'sp:v1:outreachLogs',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS] | string;
