/**
 * Administrative and organizational entities: School, Campus, AcademicYear, User.
 * Reference: DATA_MODELS.md §3
 */

import { DesignTokens, ID, ISODate, Role } from './common';

export interface School {
  id: ID;
  name: string;
  address: string;
  timezone: string;
  logoUrl?: string;
  status: 'active' | 'inactive';
}

export type NewSchool = Omit<School, 'id'>;

export interface Campus {
  id: ID;
  schoolId: ID;
  name: string;
  address: string;
  principalId?: ID;
  isPrimary: boolean;
}

export type NewCampus = Omit<Campus, 'id'>;

/**
 * Per-campus design override, used when Settings.branding.designMode is
 * 'per-campus'. Set by super_admin only (DESIGN_SYSTEM customization).
 * One record per campus, id === campusId.
 */
export interface CampusTheme extends DesignTokens {
  id: ID; // === campusId
  schoolId: ID;
  campusId: ID;
  updatedAt: ISODate;
}

export type NewCampusTheme = Omit<CampusTheme, 'id' | 'updatedAt'>;

export interface AcademicYear {
  id: ID;
  schoolId: ID;
  name: string;
  startDate: ISODate;
  endDate: ISODate;
  isCurrent: boolean;
}

export type NewAcademicYear = Omit<AcademicYear, 'id'>;

export interface User {
  id: ID;
  schoolId: ID;
  campusId?: ID;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  avatarUrl?: string;
  status: 'active' | 'inactive';
}

export type NewUser = Omit<User, 'id'>;
