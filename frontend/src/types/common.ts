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

export type FontFamily = 'noto' | 'inter' | 'fraunces' | 'jetbrains';

export type BorderRadiusScale = 'none' | 'sm' | 'md' | 'lg' | 'full';

/**
 * "Same design for all campuses" vs "each campus can have its own design".
 * Controlled only by super_admin (DESIGN_SYSTEM customization).
 */
export type DesignMode = 'unified' | 'per-campus';

/**
 * The full set of visual design tokens a super admin can customize —
 * either school-wide (BrandingSettings) or per-campus (CampusTheme).
 */
export interface DesignTokens {
  primaryColor: string; // Primary accent — buttons, links, active states
  accentColor: string; // Secondary accent
  backgroundColor: string; // Page/canvas background
  cardBackground: string; // Card/surface background
  fontFamily: FontFamily;
  borderRadius: BorderRadiusScale;
  /** Which preset template this matches, if any (undefined = fully custom). */
  templateId?: string;
}

export interface BrandingSettings extends Partial<DesignTokens> {
  schoolName: string;
  primaryColor: string;
  accentColor: string;
  logoUrl?: string;
  /** Only meaningful for the school-wide Settings.branding record. */
  designMode?: DesignMode;
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

