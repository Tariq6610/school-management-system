/**
 * Exams and assessment entities: Exam, ExamResult.
 * Reference: DATA_MODELS.md §5
 */

import { ID, ISODate } from './common';

export type ExamStatus = 'draft' | 'marks_entered' | 'published';

export interface Exam {
  id: ID;
  schoolId: ID;
  campusId: ID;
  academicYearId: ID;
  name: string;
  term: string;
  classId: ID;
  subjectId: ID;
  date: ISODate;
  maxMarks: number;
  status: ExamStatus;
}

export type NewExam = Omit<Exam, 'id'>;

export interface ExamResult {
  id: ID;
  examId: ID;
  studentId: ID;
  marksObtained: number | null;
  grade?: string;
  remarks?: string;
}

export type NewExamResult = Omit<ExamResult, 'id'>;
