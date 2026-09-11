import { Campus, Class, Exam, ID, Scope, Student, User } from '@/types';
import { getStudent } from './students';
import { getUser } from './users';
import { getClass } from './classes';
import { getCampus } from './campuses';
import {
  calculateStudentAttendanceStats,
  getStudentAttendanceHistory,
} from './attendance';
import {
  getParentStudentFeeOverview,
  ParentStudentFeeOverview,
} from './parentFees';
import { getStudentDashboardData } from './studentDashboard';
import { listExams } from './exams';
import { listSubjects } from './subjects';

export interface ParentChildAttendancePillar {
  percentage: number;
  totalDays: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  leaveCount: number;
  recentStatus?: 'present' | 'absent' | 'late' | 'leave';
  lastMarkedDate?: string;
}

export interface ParentChildHomeworkItem {
  id: ID;
  title: string;
  courseTitle: string;
  subjectName: string;
  deadline: string;
  daysRemaining: number;
  isOverdue: boolean;
  isCompleted: boolean;
}

export interface ParentChildHomeworkPillar {
  totalPendingCount: number;
  items: ParentChildHomeworkItem[];
}

export interface ParentChildNextExamPillar {
  id: ID;
  name: string;
  subjectName: string;
  date: string;
  term: string;
  maxMarks: number;
  daysUntil: number;
  status: Exam['status'];
}

export interface ParentChildDashboardData {
  student: Student;
  user: User;
  classInfo?: Class;
  campus?: Campus;

  // Acceptance Criteria: Attendance, homework, fees, next exam per child
  attendance: ParentChildAttendancePillar;
  homework: ParentChildHomeworkPillar;
  fees: ParentStudentFeeOverview;
  nextExam: ParentChildNextExamPillar | null;
}

/**
 * Loads comprehensive child dashboard data covering all four acceptance pillars:
 * 1. Attendance
 * 2. Homework
 * 3. Fees
 * 4. Next Exam
 */
export async function getParentDashboardChildData(
  studentId: ID,
  schoolId: ID
): Promise<ParentChildDashboardData | null> {
  const student = await getStudent(studentId);
  if (!student) return null;

  const scope: Scope = {
    schoolId,
    campusId: student.campusId,
  };

  const [
    user,
    classInfo,
    campus,
    attendanceStats,
    attendanceHistory,
    feeOverview,
    learningData,
    exams,
    subjects,
  ] = await Promise.all([
    getUser(student.userId),
    student.classId ? getClass(student.classId) : null,
    student.campusId ? getCampus(student.campusId) : null,
    calculateStudentAttendanceStats(scope, studentId),
    getStudentAttendanceHistory(scope, studentId),
    getParentStudentFeeOverview(studentId, schoolId),
    getStudentDashboardData(studentId, scope),
    student.classId ? listExams(scope, { classId: student.classId }) : [],
    listSubjects(scope),
  ]);

  if (!user || !feeOverview) return null;

  // 1. Attendance Pillar
  const lastRecord = attendanceHistory[attendanceHistory.length - 1];
  const attendance: ParentChildAttendancePillar = {
    percentage: attendanceStats.percentage,
    totalDays: attendanceStats.totalDays,
    presentCount: attendanceStats.presentCount,
    absentCount: attendanceStats.absentCount,
    lateCount: attendanceStats.lateCount,
    leaveCount: attendanceStats.leaveCount,
    recentStatus: lastRecord?.status,
    lastMarkedDate: lastRecord?.date,
  };

  // 2. Homework / LMS Pillar
  const now = new Date();
  const homeworkItems: ParentChildHomeworkItem[] = [];

  for (const group of learningData.subjectGroups) {
    for (const assignment of group.pendingAssignments) {
      const deadlineDate = new Date(assignment.deadline);
      const diffMs = deadlineDate.getTime() - now.getTime();
      const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const isOverdue = diffMs < 0;

      homeworkItems.push({
        id: assignment.id,
        title: assignment.title,
        courseTitle: group.courseTitle,
        subjectName: group.subjectName,
        deadline: assignment.deadline.slice(0, 10),
        daysRemaining,
        isOverdue,
        isCompleted: false,
      });
    }
  }

  // Sort homework by earliest deadline
  homeworkItems.sort((a, b) => a.deadline.localeCompare(b.deadline));

  const homework: ParentChildHomeworkPillar = {
    totalPendingCount: homeworkItems.length,
    items: homeworkItems,
  };

  // 3. Next Exam Pillar
  const subjectMap = new Map<string, string>();
  for (const sub of subjects) {
    subjectMap.set(sub.id, sub.name);
  }

  // Filter exams that are in the future or today
  const nowDateStr = now.toISOString().slice(0, 10);
  const futureExams = exams.filter((e) => e.date >= nowDateStr);
  futureExams.sort((a, b) => a.date.localeCompare(b.date));

  const targetExam = futureExams[0] || exams[0] || null;
  let nextExam: ParentChildNextExamPillar | null = null;

  if (targetExam) {
    const examDate = new Date(targetExam.date);
    const diffMs = examDate.getTime() - now.getTime();
    const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    nextExam = {
      id: targetExam.id,
      name: targetExam.name,
      subjectName: subjectMap.get(targetExam.subjectId) || 'General Subject',
      date: targetExam.date,
      term: targetExam.term,
      maxMarks: targetExam.maxMarks,
      daysUntil: Math.max(0, daysUntil),
      status: targetExam.status,
    };
  }

  return {
    student,
    user,
    classInfo: classInfo || undefined,
    campus: campus || undefined,
    attendance,
    homework,
    fees: feeOverview,
    nextExam,
  };
}
