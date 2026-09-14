/**
 * Learning Management System (LMS) entities: Course, Lesson, Assignment, Submission.
 * Reference: DATA_MODELS.md §5
 */

import { ID } from './common';

export interface Course {
  id: ID;
  schoolId: ID;
  campusId: ID;
  subjectId: ID;
  classId: ID;
  teacherId: ID;
  title: string;
  description: string;
  coverColor: string;
}

export interface EnrichedCourse extends Course {
  subjectName: string;
  subjectCode?: string;
  className: string;
  teacherName: string;
  lessonCount: number;
}

export type NewCourse = Omit<Course, 'id'>;

export type LessonContentType = 'video' | 'pdf' | 'notes';

export interface Lesson {
  id: ID;
  schoolId: ID;
  courseId: ID;
  title: string;
  orderIndex: number;
  contentType: LessonContentType;
  contentUrl?: string;
  body?: string;
  durationMinutes?: number;
}

export type NewLesson = Omit<Lesson, 'id' | 'orderIndex'> & { orderIndex?: number };

export interface Assignment {
  id: ID;
  schoolId: ID;
  courseId: ID;
  lessonId?: ID;
  title: string;
  instructions: string;
  deadline: string; // ISO date-time string
  maxMarks: number;
  submissionType?: 'online' | 'offline';
}

export interface EnrichedAssignment extends Assignment {
  lessonTitle?: string;
  submissionCount: number;
  lateCount: number;
  missingCount: number;
}

export type NewAssignment = Omit<Assignment, 'id'>;

export interface Submission {
  id: ID;
  assignmentId: ID;
  studentId: ID;
  body?: string;
  fileName?: string;
  submittedAt: string;
  isLate?: boolean;
  marksObtained?: number;
  feedback?: string;
  gradedBy?: ID;
  gradedAt?: string;
}

export interface StudentAssignmentDetails extends Assignment {
  lessonTitle?: string;
  submission?: Submission;
  isSubmitted: boolean;
  isLateSubmission: boolean;
  status: 'pending' | 'submitted' | 'late' | 'graded';
}

export interface TeacherSubmissionEvaluation {
  studentId: ID;
  studentName: string;
  rollNumber: string;
  admissionNumber: string;
  submission?: Submission;
  status: 'pending' | 'submitted' | 'late' | 'graded';
  isLate: boolean;
}

export type NewSubmission = Omit<Submission, 'id'>;

export interface LessonCompletion {
  id: ID;
  schoolId: ID;
  studentId: ID;
  courseId: ID;
  lessonId: ID;
  completedAt: string; // ISO date-time string
}

export type NewLessonCompletion = Omit<LessonCompletion, 'id'>;

export interface CourseProgress {
  courseId: ID;
  studentId: ID;
  totalLessons: number;
  completedLessons: number;
  fraction: string; // e.g. "3/5"
  percentage: number; // e.g. 60
  isCompleted: boolean;
  completedLessonIds: ID[];
}

export interface EnrichedCourseWithProgress extends EnrichedCourse {
  progress: CourseProgress;
}

export interface StudentSubjectTasks {
  subjectId: ID;
  subjectName: string;
  subjectCode?: string;
  courseId: ID;
  courseTitle: string;
  coverColor: string;
  teacherName: string;
  progress: CourseProgress;
  nextLessons: Lesson[];
  pendingAssignments: Assignment[];
  completedLessonsCount: number;
  totalLessonsCount: number;
  pendingTasksCount: number;
}

export interface StudentDashboardData {
  studentName: string;
  className: string;
  totalCourses: number;
  totalPendingTasks: number;
  overallProgressPercentage: number;
  subjectGroups: StudentSubjectTasks[];
  coursesWithProgress: EnrichedCourseWithProgress[];
}

