/**
 * People entities: Student, HealthRecord, Parent, StudentParent, Teacher.
 * Reference: DATA_MODELS.md §3
 */

import { ID, ISODate } from './common';

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  priority: number;
}

export interface PickupPerson {
  name: string;
  relationship: string;
  phone: string;
  photoUrl?: string;
  addedBy: ID;
  addedAt: string;
}

export interface HealthRecord {
  allergies: string[];
  conditions: string[];
  medications: string[];
  bloodGroup?: string;
  doctorName?: string;
  doctorPhone?: string;
  emergencyContacts: EmergencyContact[];
  authorisedPickup: PickupPerson[];
}

export type StudentStatus = 'active' | 'transferred' | 'graduated' | 'withdrawn';

export interface Student {
  id: ID;
  schoolId: ID;
  campusId: ID;
  userId: ID;
  classId: ID;
  academicYearId: ID;
  admissionNumber: string;
  rollNumber: string;
  dob: ISODate;
  gender: 'male' | 'female';
  address: string;
  admissionDate: ISODate;
  status: StudentStatus;
  health: HealthRecord;
}

export type NewStudent = Omit<Student, 'id'>;

export interface Parent {
  id: ID;
  schoolId: ID;
  userId: ID;
  occupation?: string;
}

export type NewParent = Omit<Parent, 'id'>;

export interface StudentParent {
  id: ID;
  studentId: ID;
  parentId: ID;
  relationship: 'father' | 'mother' | 'guardian';
  isPrimary: boolean;
}

export type NewStudentParent = Omit<StudentParent, 'id'>;

export interface Teacher {
  id: ID;
  schoolId: ID;
  campusId: ID;
  userId: ID;
  employeeNumber: string;
  department: string;
  subjectIds: ID[];
  joinedAt: ISODate;
}

export type NewTeacher = Omit<Teacher, 'id'>;

export type LeaveType = 'sick' | 'casual' | 'annual' | 'other';

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
  id: ID;
  schoolId: ID;
  campusId: ID;
  teacherId: ID;
  leaveType: LeaveType;
  startDate: ISODate;
  endDate: ISODate;
  reason: string;
  status: LeaveRequestStatus;
  requestedAt: ISODate;
  decidedBy?: ID;
  decidedAt?: ISODate;
  decisionNote?: string;
}

export type NewLeaveRequest = Omit<
  LeaveRequest,
  'id' | 'status' | 'requestedAt' | 'decidedBy' | 'decidedAt' | 'decisionNote'
>;
