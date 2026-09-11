/**
 * Academic structures: Class, Subject, TimetableSlot.
 * Reference: DATA_MODELS.md §3
 */

import { ID } from './common';

export interface Class {
  id: ID;
  schoolId: ID;
  campusId: ID;
  academicYearId: ID;
  grade: string; // e.g. "Grade 8"
  section: string; // e.g. "A"
  classTeacherId?: ID;
  room?: string;
  capacity: number;
}

export type NewClass = Omit<Class, 'id'>;

export interface Subject {
  id: ID;
  schoolId: ID;
  classId: ID;
  name: string;
  code: string;
  teacherId?: ID;
}

export type NewSubject = Omit<Subject, 'id'>;

export interface PeriodDefinition {
  period: number;
  name: string;
  startTime: string; // e.g. "08:00"
  endTime: string; // e.g. "08:45"
  isBreak?: boolean;
}

export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6; // Mon-Sat

export interface TimetableSlot {
  id: ID;
  schoolId: ID;
  campusId: ID;
  classId: ID;
  subjectId: ID;
  teacherId: ID;
  dayOfWeek: DayOfWeek;
  period: number;
  startTime: string; // e.g. "08:00"
  endTime: string; // e.g. "08:45"
  room?: string;
}

export type NewTimetableSlot = Omit<TimetableSlot, 'id' | 'startTime' | 'endTime'> & {
  startTime?: string;
  endTime?: string;
};

export interface EnrichedTimetableSlot extends TimetableSlot {
  teacherName?: string;
  subjectName?: string;
  subjectCode?: string;
  className?: string;
  periodName?: string;
  isBreak?: boolean;
}

