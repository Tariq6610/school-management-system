import { getItem, setItem, STORAGE_KEYS } from '@/lib/storage';
import { Class, Exam, ExamResult, ID, NewExamResult, Scope, Subject } from '@/types';
import {
  createCollectionItem,
  deleteCollectionItem,
  getCollectionItem,
  listCollection,
  updateCollectionItem,
} from './base';
import { getExam, updateExam } from './exams';
import { getClass } from './classes';
import { getSubject } from './subjects';
import { listStudents } from './students';
import { getUser } from './users';
import { getSettings } from './settings';
import { calculateGrade } from '@/lib/utils/grading';

export async function listExamResults(): Promise<ExamResult[]> {
  return listCollection<ExamResult>(STORAGE_KEYS.EXAM_RESULTS);
}

export async function listExamResultsByExamId(examId: ID): Promise<ExamResult[]> {
  return listCollection<ExamResult>(
    STORAGE_KEYS.EXAM_RESULTS,
    undefined,
    (res) => res.examId === examId
  );
}

export async function listExamResultsByStudentId(studentId: ID): Promise<ExamResult[]> {
  return listCollection<ExamResult>(
    STORAGE_KEYS.EXAM_RESULTS,
    undefined,
    (res) => res.studentId === studentId
  );
}

export async function getExamResult(id: ID): Promise<ExamResult | null> {
  return getCollectionItem<ExamResult>(STORAGE_KEYS.EXAM_RESULTS, id);
}

export async function createExamResult(input: NewExamResult): Promise<ExamResult> {
  return createCollectionItem<ExamResult>(STORAGE_KEYS.EXAM_RESULTS, input, 'exr');
}

export async function updateExamResult(
  id: ID,
  patch: Partial<ExamResult>
): Promise<ExamResult> {
  return updateCollectionItem<ExamResult>(STORAGE_KEYS.EXAM_RESULTS, id, patch);
}

export async function saveBatchExamResults(
  examId: ID,
  results: { studentId: ID; marksObtained: number | null; grade?: string; remarks?: string }[]
): Promise<ExamResult[]> {
  const allResults = getItem<ExamResult[]>(STORAGE_KEYS.EXAM_RESULTS, []) ?? [];
  const updatedResults: ExamResult[] = [];

  for (const item of results) {
    const existingIndex = allResults.findIndex(
      (r) => r.examId === examId && r.studentId === item.studentId
    );

    if (existingIndex >= 0) {
      const existing = allResults[existingIndex];
      const updated: ExamResult = {
        ...existing,
        ...item,
      };
      allResults[existingIndex] = updated;
      updatedResults.push(updated);
    } else {
      const created: ExamResult = {
        id: `exr_${examId}_${item.studentId}`,
        examId,
        studentId: item.studentId,
        marksObtained: item.marksObtained,
        grade: item.grade,
        remarks: item.remarks,
      };
      allResults.push(created);
      updatedResults.push(created);
    }
  }

  setItem(STORAGE_KEYS.EXAM_RESULTS, allResults);
  return updatedResults;
}

export async function deleteExamResult(id: ID): Promise<void> {
  return deleteCollectionItem<ExamResult>(STORAGE_KEYS.EXAM_RESULTS, id);
}

export interface StudentMarksEntryRow {
  studentId: ID;
  studentName: string;
  rollNumber: string;
  admissionNumber: string;
  marksObtained: number | null;
  percentage?: number;
  grade?: string;
  remarks?: string;
  isAbsent?: boolean;
  resultId?: ID;
}

export interface ExamMarksGridData {
  exam: Exam;
  classInfo: Class;
  subject: Subject;
  studentsCount: number;
  maxMarks: number;
  rows: StudentMarksEntryRow[];
}

export interface MarksEntryItem {
  studentId: ID;
  marksObtained: number | null;
  remarks?: string;
}

export interface SaveExamMarksResult {
  savedResults: ExamResult[];
  errors: Array<{ studentId: ID; error: string }>;
  examStatus: Exam['status'];
}

/**
 * Loads complete grid data for exam marks entry, resolving class, subject,
 * active enrolled students, and existing draft/saved results.
 */
export async function getExamMarksGridData(
  scope: Scope,
  examId: ID
): Promise<ExamMarksGridData | null> {
  const exam = await getExam(examId);
  if (!exam) return null;
  if (scope.schoolId && exam.schoolId !== scope.schoolId) return null;
  if (scope.campusId && exam.campusId !== scope.campusId) return null;

  const [classInfo, subject, allStudents, existingResults, settings] = await Promise.all([
    getClass(exam.classId),
    getSubject(exam.subjectId),
    listStudents({ schoolId: exam.schoolId, campusId: exam.campusId }),
    listExamResultsByExamId(examId),
    getSettings(scope),
  ]);

  if (!classInfo || !subject) return null;

  // Filter students for this class and active status
  const classStudents = allStudents.filter(
    (s) => s.classId === exam.classId && (s.status === 'active' || !s.status)
  );

  // Map existing results by studentId
  const resultsByStudentId = new Map<ID, ExamResult>();
  for (const r of existingResults) {
    resultsByStudentId.set(r.studentId, r);
  }

  // Load user names and construct rows
  const rows: StudentMarksEntryRow[] = await Promise.all(
    classStudents.map(async (st) => {
      let studentName = `Student ${st.rollNumber || st.admissionNumber}`;
      if (st.userId) {
        const u = await getUser(st.userId);
        if (u?.name) studentName = u.name;
      }

      const existing = resultsByStudentId.get(st.id);
      const marksObtained = existing ? existing.marksObtained : null;
      let percentage: number | undefined = undefined;
      let grade = existing?.grade;

      if (marksObtained !== null && marksObtained !== undefined && exam.maxMarks > 0) {
        const gradeRes = calculateGrade(marksObtained, exam.maxMarks, settings.gradingScale);
        percentage = gradeRes.percentage;
        grade = gradeRes.grade;
      }

      const isAbsent = existing?.remarks?.toLowerCase().includes('absent') || false;

      return {
        studentId: st.id,
        studentName,
        rollNumber: st.rollNumber || '',
        admissionNumber: st.admissionNumber || '',
        marksObtained,
        percentage,
        grade,
        remarks: existing?.remarks || '',
        isAbsent,
        resultId: existing?.id,
      };
    })
  );

  // Sort rows by roll number (numeric if possible), then student name
  rows.sort((a, b) => {
    const rollA = parseInt(a.rollNumber, 10);
    const rollB = parseInt(b.rollNumber, 10);
    if (!isNaN(rollA) && !isNaN(rollB)) return rollA - rollB;
    return a.studentName.localeCompare(b.studentName);
  });

  return {
    exam,
    classInfo,
    subject,
    studentsCount: rows.length,
    maxMarks: exam.maxMarks,
    rows,
  };
}

/**
 * Saves marks entries for an exam.
 * Rejects values > maxMarks or < 0 inline.
 * Computes provisional grades dynamically from settings.
 * Autosaves as draft and updates exam status to marks_entered when marks are entered.
 */
export async function saveExamMarksEntry(
  scope: Scope,
  examId: ID,
  entries: MarksEntryItem[],
  markAsEntered: boolean = false
): Promise<SaveExamMarksResult> {
  const exam = await getExam(examId);
  if (!exam) {
    throw new Error(`Exam with ID "${examId}" was not found.`);
  }

  const settings = await getSettings(scope);
  const errors: Array<{ studentId: ID; error: string }> = [];
  const validBatch: Array<{
    studentId: ID;
    marksObtained: number | null;
    grade?: string;
    remarks?: string;
  }> = [];

  for (const entry of entries) {
    if (entry.marksObtained !== null && entry.marksObtained !== undefined) {
      if (entry.marksObtained > exam.maxMarks) {
        errors.push({
          studentId: entry.studentId,
          error: `Marks (${entry.marksObtained}) cannot exceed maximum marks (${exam.maxMarks})`,
        });
        continue;
      }
      if (entry.marksObtained < 0) {
        errors.push({
          studentId: entry.studentId,
          error: `Marks (${entry.marksObtained}) cannot be negative`,
        });
        continue;
      }

      const gradeRes = calculateGrade(entry.marksObtained, exam.maxMarks, settings.gradingScale);
      validBatch.push({
        studentId: entry.studentId,
        marksObtained: entry.marksObtained,
        grade: gradeRes.grade,
        remarks: entry.remarks,
      });
    } else {
      // Absent or empty mark
      validBatch.push({
        studentId: entry.studentId,
        marksObtained: null,
        grade: undefined,
        remarks: entry.remarks,
      });
    }
  }

  const savedResults = await saveBatchExamResults(examId, validBatch);

  let examStatus = exam.status;
  if (markAsEntered || (exam.status === 'draft' && validBatch.some((b) => b.marksObtained !== null))) {
    examStatus = 'marks_entered';
    await updateExam(examId, { status: 'marks_entered' });
  }

  return {
    savedResults,
    errors,
    examStatus,
  };
}

/**
 * Recalculates grades for all students on an exam using the latest configured grading scale.
 */
export async function recalculateExamResults(
  scope: Scope,
  examId: ID
): Promise<ExamResult[]> {
  const exam = await getExam(examId);
  if (!exam) {
    throw new Error(`Exam with ID "${examId}" not found.`);
  }

  const [settings, results] = await Promise.all([
    getSettings(scope),
    listExamResultsByExamId(examId),
  ]);

  const updatedEntries: Array<{
    studentId: ID;
    marksObtained: number | null;
    grade?: string;
    remarks?: string;
  }> = results.map((res) => {
    if (res.marksObtained !== null && res.marksObtained !== undefined && exam.maxMarks > 0) {
      const gradeRes = calculateGrade(res.marksObtained, exam.maxMarks, settings.gradingScale);
      return {
        studentId: res.studentId,
        marksObtained: res.marksObtained,
        grade: gradeRes.grade,
        remarks: res.remarks,
      };
    }
    return {
      studentId: res.studentId,
      marksObtained: null,
      grade: undefined,
      remarks: res.remarks,
    };
  });

  return saveBatchExamResults(examId, updatedEntries);
}

export interface EnrichedPublishedResult {
  id: ID;
  examId: ID;
  studentId: ID;
  examName: string;
  term: string;
  examDate: string;
  subjectName: string;
  classGrade: string;
  classSection: string;
  maxMarks: number;
  marksObtained: number | null;
  percentage: number | null;
  grade: string | null;
  gpa?: number;
  description?: string;
  isPassing: boolean;
  remarks?: string;
  isAbsent: boolean;
}

/**
 * Retrieves exam results for a student that are strictly in PUBLISHED status (TASK-050).
 * Acceptance criteria: Invisible to parents until published.
 * Any exam in 'draft' or 'marks_entered' status is omitted.
 */
export async function listPublishedResultsForStudent(
  scope: Scope,
  studentId: ID
): Promise<EnrichedPublishedResult[]> {
  const [allStudentResults, allExams, allSubjects, allClasses, settings] = await Promise.all([
    listExamResultsByStudentId(studentId),
    listCollection<Exam>(STORAGE_KEYS.EXAMS, scope),
    listCollection<Subject>(STORAGE_KEYS.SUBJECTS, scope),
    listCollection<Class>(STORAGE_KEYS.CLASSES, scope),
    getSettings(scope),
  ]);

  // Index published exams only
  const publishedExamsMap = new Map<ID, Exam>();
  for (const exam of allExams) {
    if (exam.status === 'published') {
      publishedExamsMap.set(exam.id, exam);
    }
  }

  const subjectsMap = new Map<ID, Subject>(allSubjects.map((s) => [s.id, s]));
  const classesMap = new Map<ID, Class>(allClasses.map((c) => [c.id, c]));

  const publishedResults: EnrichedPublishedResult[] = [];

  for (const res of allStudentResults) {
    const parentExam = publishedExamsMap.get(res.examId);
    if (!parentExam) {
      // Invisible to parents: Exam is in draft or marks_entered status (or from another scope)
      continue;
    }

    const subject = subjectsMap.get(parentExam.subjectId);
    const cls = classesMap.get(parentExam.classId);

    const isAbsent = res.remarks?.toLowerCase().includes('absent') || false;
    let percentage: number | null = null;
    let grade: string | null = res.grade || null;
    let gpa: number | undefined = undefined;
    let description: string | undefined = undefined;
    let isPassing = false;

    if (!isAbsent && res.marksObtained !== null && res.marksObtained !== undefined && parentExam.maxMarks > 0) {
      const gradeRes = calculateGrade(res.marksObtained, parentExam.maxMarks, settings.gradingScale);
      percentage = gradeRes.percentage;
      grade = gradeRes.grade;
      gpa = gradeRes.gpa;
      description = gradeRes.description;
      isPassing = gradeRes.isPassing;
    }

    publishedResults.push({
      id: res.id,
      examId: parentExam.id,
      studentId: res.studentId,
      examName: parentExam.name,
      term: parentExam.term,
      examDate: parentExam.date,
      subjectName: subject?.name || 'Subject',
      classGrade: cls?.grade || '',
      classSection: cls?.section || '',
      maxMarks: parentExam.maxMarks,
      marksObtained: isAbsent ? null : res.marksObtained,
      percentage,
      grade,
      gpa,
      description,
      isPassing,
      remarks: res.remarks,
      isAbsent,
    });
  }

  // Sort by exam date descending
  return publishedResults.sort((a, b) => b.examDate.localeCompare(a.examDate));
}
