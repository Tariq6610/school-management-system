/**
 * Common primitive types, roles, scoping, and system metadata.
 * Reference: DATA_MODELS.md §1-3
 */

export type ID = string;
export type ISODate = string;

export type Role =
  | 'super_admin'
  | 'school_admin'
  | 'principal'
  | 'teacher'
  | 'parent'
  | 'student';

export interface Scope {
  schoolId: ID;
  campusId?: ID;
  classId?: ID;
}

export interface Meta {
  schemaVersion: string;
  seededAt: string;
  seedProfile: string;
}

export interface Session {
  userId: ID;
  role: Role;
  schoolId: ID;
  campusId?: ID;
  currentAcademicYearId?: ID;
  activeChildId?: ID; // For parents with multiple children
}

export interface GradeScaleItem {
  grade: string;
  minPercentage: number;
  maxPercentage: number;
  gpa?: number;
  description?: string;
}

export interface BrandingSettings {
  schoolName: string;
  primaryColor: string;
  accentColor: string;
  logoUrl?: string;
}

import type { PeriodDefinition } from './academics';

export interface Settings {
  id: ID;
  schoolId: ID;
  gradingScale: GradeScaleItem[];
  attendanceCutoffTime?: string;
  attendanceEditWindowHours?: number; // Configurable window in hours (default 48 / 2 days)
  attendanceStatuses: ('present' | 'absent' | 'late' | 'leave')[];
  branding: BrandingSettings;
  currency: string; // e.g. 'PKR'
  periods?: PeriodDefinition[];
}

