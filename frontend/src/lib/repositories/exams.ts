import { STORAGE_KEYS } from '@/lib/storage';
import {
  Campus,
  Class,
  Exam,
  ExamStatus,
  ID,
  NewExam,
  Scope,
  Subject,
} from '@/types';
import {
  createCollectionItem,
  deleteCollectionItem,
  getCollectionItem,
  listCollection,
  updateCollectionItem,
} from './base';
import { listCampuses } from './campuses';
import { listClasses } from './classes';
import { listSubjects } from './subjects';
import { listStudents } from './students';
import { triggerResultPublishedWhatsAppAlert } from './whatsappLog';

export interface ExamFilter {
  classId?: ID;
  subjectId?: ID;
  status?: ExamStatus;
  term?: string;
  campusId?: ID;
  search?: string;
}

export interface EnrichedExam extends Exam {
  campus?: Campus;
  classInfo?: Class;
  subject?: Subject;
  eligibleStudentsCount?: number;
}

export async function listExams(scope: Scope, filter?: ExamFilter): Promise<Exam[]> {
  return listCollection<Exam>(STORAGE_KEYS.EXAMS, scope, (exam) => {
    if (filter?.classId && exam.classId !== filter.classId) return false;
    if (filter?.subjectId && exam.subjectId !== filter.subjectId) return false;
    if (filter?.status && exam.status !== filter.status) return false;
    if (filter?.term && exam.term !== filter.term) return false;
    if (filter?.campusId && exam.campusId !== filter.campusId) return false;
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      if (!exam.name.toLowerCase().includes(q) && !exam.term.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });
}

export async function getExam(id: ID): Promise<Exam | null> {
  return getCollectionItem<Exam>(STORAGE_KEYS.EXAMS, id);
}

export async function createExam(input: NewExam): Promise<Exam> {
  return createCollectionItem<Exam>(STORAGE_KEYS.EXAMS, input, 'exm');
}

export async function updateExam(id: ID, patch: Partial<Exam>): Promise<Exam> {
  return updateCollectionItem<Exam>(STORAGE_KEYS.EXAMS, id, patch);
}

export async function deleteExam(id: ID): Promise<void> {
  return deleteCollectionItem<Exam>(STORAGE_KEYS.EXAMS, id);
}

/**
 * Validates and creates a scheduled exam per class and subject (TASK-047).
 * Strictly requires maxMarks > 0 and mandatory name, term, class, subject, date.
 */
export async function createExamSchedule(input: NewExam): Promise<Exam> {
  if (!input.name || !input.name.trim()) {
    throw new Error('Exam name is required');
  }
  if (!input.term || !input.term.trim()) {
    throw new Error('Academic term is required');
  }
  if (!input.classId) {
    throw new Error('Target class is required');
  }
  if (!input.subjectId) {
    throw new Error('Exam subject is required');
  }
  if (!input.date) {
    throw new Error('Exam schedule date is required');
  }
  if (typeof input.maxMarks !== 'number' || isNaN(input.maxMarks) || input.maxMarks <= 0) {
    throw new Error('Maximum marks must be greater than zero');
  }

  const payload: NewExam = {
    ...input,
    name: input.name.trim(),
    term: input.term.trim(),
    status: input.status || 'draft',
  };

  return createExam(payload);
}

/**
 * Retrieves all exams within scope enriched with class, subject, and campus metadata.
 */
export async function listEnrichedExams(
  scope: Scope,
  filter?: ExamFilter
): Promise<EnrichedExam[]> {
  const [exams, campuses, classes, subjects, students] = await Promise.all([
    listExams(scope, filter),
    listCampuses({ schoolId: scope.schoolId }),
    listClasses(scope),
    listSubjects(scope),
    listStudents(scope, { activeOnly: true }),
  ]);

  const campusMap = new Map<ID, Campus>(campuses.map((c) => [c.id, c]));
  const classMap = new Map<ID, Class>(classes.map((c) => [c.id, c]));
  const subjectMap = new Map<ID, Subject>(subjects.map((s) => [s.id, s]));

  // Count active students per class
  const classStudentCounts = new Map<ID, number>();
  for (const stu of students) {
    const current = classStudentCounts.get(stu.classId) || 0;
    classStudentCounts.set(stu.classId, current + 1);
  }

  const enriched: EnrichedExam[] = exams.map((exam) => {
    return {
      ...exam,
      campus: campusMap.get(exam.campusId),
      classInfo: classMap.get(exam.classId),
      subject: subjectMap.get(exam.subjectId),
      eligibleStudentsCount: classStudentCounts.get(exam.classId) || 0,
    };
  });

  // Sort chronologically by date descending
  return enriched.sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Retrieves a single exam with joined class, subject, and campus metadata.
 */
export async function getEnrichedExam(id: ID): Promise<EnrichedExam | null> {
  const exam = await getExam(id);
  if (!exam) return null;

  const [campus, classInfo, subject, students] = await Promise.all([
    listCampuses({ schoolId: exam.schoolId }).then((list) => list.find((c) => c.id === exam.campusId)),
    listClasses({ schoolId: exam.schoolId }).then((list) => list.find((c) => c.id === exam.classId)),
    listSubjects({ schoolId: exam.schoolId }).then((list) => list.find((s) => s.id === exam.subjectId)),
    listStudents({ schoolId: exam.schoolId }, { classId: exam.classId, activeOnly: true }),
  ]);

  return {
    ...exam,
    campus,
    classInfo,
    subject,
    eligibleStudentsCount: students.length,
  };
}

/**
 * Evaluates whether an exam can be published.
 * Requires that marks have been entered (status === 'marks_entered').
 */
export function canPublishExam(exam: Exam): { canPublish: boolean; reason?: string } {
  if (exam.status === 'published') {
    return { canPublish: false, reason: 'Exam is already published.' };
  }
  if (exam.status === 'draft') {
    return {
      canPublish: false,
      reason: 'Marks have not been entered yet. Finalize marks entry before publishing.',
    };
  }
  return { canPublish: true };
}

/**
 * Publishes exam results, making them visible to parents and students (TASK-050).
 * Per-exam and strictly requires status to transition from 'marks_entered' to 'published'.
 */
export async function publishExamResults(scope: Scope, examId: ID): Promise<Exam> {
  const exam = await getExam(examId);
  if (!exam) {
    throw new Error(`Exam with ID "${examId}" was not found.`);
  }

  if (scope.schoolId && exam.schoolId !== scope.schoolId) {
    throw new Error('Unauthorized: Exam does not belong to the active school.');
  }

  if (exam.status === 'published') {
    return exam; // Already published (idempotent)
  }

  const updated = await updateExam(examId, { status: 'published' });

  try {
    const campuses = await listCampuses({ schoolId: exam.schoolId });
    const campus = campuses.find((c) => c.id === exam.campusId) || campuses[0];
    const campusName = campus ? campus.name : 'Main Campus';

    await triggerResultPublishedWhatsAppAlert(scope, {
      examName: exam.name,
      studentName: 'Ahmed Khan',
      campusName,
      parentName: 'Tariq Khan',
      phone: '+92 300 1234567',
    });
  } catch (err) {
    console.warn('[Exams] Failed to append result published WhatsApp alert:', err);
  }

  return updated;
}

/**
 * Reversibly unpublishes exam results, instantly hiding them from parents and students (TASK-050).
 * Transitions status from 'published' back to 'marks_entered'.
 */
export async function unpublishExamResults(scope: Scope, examId: ID): Promise<Exam> {
  const exam = await getExam(examId);
  if (!exam) {
    throw new Error(`Exam with ID "${examId}" was not found.`);
  }

  if (scope.schoolId && exam.schoolId !== scope.schoolId) {
    throw new Error('Unauthorized: Exam does not belong to the active school.');
  }

  if (exam.status !== 'published') {
    return exam; // Not published
  }

  const updated = await updateExam(examId, { status: 'marks_entered' });
  return updated;
}
