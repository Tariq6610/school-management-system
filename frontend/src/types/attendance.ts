/**
 * Attendance domain types — Per-class-per-day document model.
 * Reference: DATA_MODELS.md §4
 */

import { ID, ISODate } from './common';

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave';

export interface AttendanceDay {
  id: ID; // e.g. "att_cls_8a_2026-09-07"
  schoolId: ID;
  campusId: ID;
  classId: ID;
  academicYearId: ID;
  date: ISODate;
  present: ID[]; // student IDs
  absent: ID[];
  late: ID[];
  leave: ID[];
  markedBy: ID;
  markedAt: string;
  editedBy?: ID;
  editedAt?: string;
}

export type SaveAttendanceInput = Omit<
  AttendanceDay,
  'id' | 'markedAt' | 'schoolId' | 'campusId'
> & {
  id?: ID;
  schoolId?: ID;
  campusId?: ID;
  markedAt?: string;
};

export interface AttendanceSummary {
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  leaveCount: number;
  percentage: number;
}

export interface AttendanceFilter {
  date?: ISODate;
  startDate?: ISODate;
  endDate?: ISODate;
  classId?: ID;
  campusId?: ID;
  academicYearId?: ID;
}

export interface StudentAttendanceRecord {
  date: ISODate;
  status: AttendanceStatus;
  attendanceDayId: ID;
  markedAt: string;
  editedAt?: string;
}

export interface StudentAttendanceStats {
  studentId: ID;
  totalDays: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  leaveCount: number;
  percentage: number;
}

import { Class } from './academics';

export interface ClassAttendanceStatus {
  classId: ID;
  className: string;
  campusId: ID;
  isMarked: boolean;
  attendanceDay?: AttendanceDay;
  summary?: AttendanceSummary;
}

export interface ClassAttendanceMatrixCell {
  date: ISODate;
  isMarked: boolean;
  isPastCutoff: boolean;
  attendanceDay?: AttendanceDay;
  summary?: AttendanceSummary;
  absentCount: number;
  presentCount: number;
  lateCount: number;
  leaveCount: number;
}

export interface ClassAttendanceMatrixRow {
  classInfo: Class;
  campusName: string;
  teacherName?: string;
  teacherEmail?: string;
  teacherEmployeeNumber?: string;
  totalStudents: number;
  cells: Record<ISODate, ClassAttendanceMatrixCell>;
}

import { Student } from './people';

export interface ClassStudentAttendanceRow {
  studentId: ID;
  studentName: string;
  admissionNumber: string;
  rollNumber: string;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  leaveCount: number;
  totalDays: number;
  percentage: number;
}

export interface ClassAttendanceReport {
  classInfo: Class;
  campusName: string;
  startDate: ISODate;
  endDate: ISODate;
  totalInstructionalDays: number;
  totalStudents: number;
  averagePercentage: number;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalLeave: number;
  students: ClassStudentAttendanceRow[];
}

export interface DateRangeAttendanceDayRow {
  date: ISODate;
  dayOfWeek: string;
  totalClasses: number;
  markedClasses: number;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  leaveCount: number;
  percentage: number;
}

export interface DateRangeAttendanceReport {
  startDate: ISODate;
  endDate: ISODate;
  totalInstructionalDays: number;
  averagePercentage: number;
  totalPresent: number;
  totalAbsent: number;
  totalLate: number;
  totalLeave: number;
  days: DateRangeAttendanceDayRow[];
}

export interface StudentAttendanceReport {
  student: Student;
  userName: string;
  className: string;
  campusName: string;
  startDate?: ISODate;
  endDate?: ISODate;
  stats: StudentAttendanceStats;
  history: StudentAttendanceRecord[];
}

export interface StudentMonthAttendance {
  student: Student;
  userName: string;
  className: string;
  campusName: string;
  year: number;
  month: number;
  monthName: string;
  summary: {
    presentCount: number;
    absentCount: number;
    lateCount: number;
    leaveCount: number;
    totalInstructionalDays: number;
    percentage: number;
  };
  recordsByDate: Record<ISODate, AttendanceStatus>;
}

