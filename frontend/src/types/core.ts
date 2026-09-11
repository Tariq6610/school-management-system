/**
 * Administrative and organizational entities: School, Campus, AcademicYear, User.
 * Reference: DATA_MODELS.md §3
 */

import { ID, ISODate, Role } from './common';

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
