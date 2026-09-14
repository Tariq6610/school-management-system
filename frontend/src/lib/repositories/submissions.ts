import { STORAGE_KEYS } from '@/lib/storage';
import {
  Assignment,
  ID,
  NewSubmission,
  Scope,
  StudentAssignmentDetails,
  Submission,
  TeacherSubmissionEvaluation,
} from '@/types';
import {
  createCollectionItem,
  deleteCollectionItem,
  getCollectionItem,
  listCollection,
  updateCollectionItem,
} from './base';
import { getAssignment, listAssignments } from './assignments';
import { listLessons } from './lessons';
import { getCourse } from './courses';
import { listActiveStudents } from './students';
import { listUsers } from './users';

export interface SubmissionFilter {
  assignmentId?: ID;
  studentId?: ID;
}

export interface SubmitAssignmentInput {
  assignmentId: ID;
  studentId: ID;
  body?: string;
  fileName?: string;
}

export async function listSubmissions(
  scope?: Scope,
  filter?: SubmissionFilter
): Promise<Submission[]> {
  return listCollection<Submission>(STORAGE_KEYS.SUBMISSIONS, scope, (sub) => {
    if (filter?.assignmentId && sub.assignmentId !== filter.assignmentId) return false;
    if (filter?.studentId && sub.studentId !== filter.studentId) return false;
    return true;
  });
}

export async function getSubmission(id: ID): Promise<Submission | null> {
  return getCollectionItem<Submission>(STORAGE_KEYS.SUBMISSIONS, id);
}

export async function getStudentSubmission(
  assignmentId: ID,
  studentId: ID
): Promise<Submission | null> {
  const subs = await listSubmissions(undefined, { assignmentId, studentId });
  return subs[0] ?? null;
}

export async function createSubmission(input: NewSubmission): Promise<Submission> {
  return createCollectionItem<Submission>(STORAGE_KEYS.SUBMISSIONS, input, 'sub');
}

export async function updateSubmission(
  id: ID,
  patch: Partial<Submission>
): Promise<Submission> {
  return updateCollectionItem<Submission>(STORAGE_KEYS.SUBMISSIONS, id, patch);
}

/**
 * Submits an assignment on behalf of a student.
 * Acceptance criteria: "Text and filename; late clearly marked" (FEATURE_SPECIFICATIONS.md §12).
 * - Accepts text content (`body`) and/or uploaded file (`fileName`).
 * - Automatically records `submittedAt` timestamp.
 * - Flags `isLate: true` if submitted after assignment deadline.
 * - Resubmission replaces previous submission document.
 */
export async function submitAssignment(input: SubmitAssignmentInput): Promise<Submission> {
  if (!input.assignmentId) {
    throw new Error('Assignment ID is required');
  }
  if (!input.studentId) {
    throw new Error('Student ID is required');
  }

  const hasBody = Boolean(input.body && input.body.trim());
  const hasFile = Boolean(input.fileName && input.fileName.trim());

  if (!hasBody && !hasFile) {
    throw new Error('Please provide text response or an attached file for your submission');
  }

  const assignment = await getAssignment(input.assignmentId);
  if (!assignment) {
    throw new Error(`Assignment with ID "${input.assignmentId}" not found`);
  }

  const now = new Date();
  const deadlineMs = new Date(assignment.deadline).getTime();
  const isLate = now.getTime() > deadlineMs;

  const existingSubmission = await getStudentSubmission(input.assignmentId, input.studentId);

  const payload = {
    body: hasBody ? input.body!.trim() : undefined,
    fileName: hasFile ? input.fileName!.trim() : undefined,
    submittedAt: now.toISOString(),
    isLate,
  };

  if (existingSubmission) {
    // Resubmission replaces previous
    return updateSubmission(existingSubmission.id, payload);
  }

  return createSubmission({
    assignmentId: input.assignmentId,
    studentId: input.studentId,
    ...payload,
  });
}

export async function gradeSubmission(
  idOrTarget: ID | { assignmentId: ID; studentId: ID },
  marksObtained: number,
  feedback: string,
  gradedBy: ID
): Promise<Submission> {
  let current: Submission | null = null;
  let targetAssignmentId: ID;

  if (typeof idOrTarget === 'string') {
    current = await getSubmission(idOrTarget);
    if (!current) {
      throw new Error(`Submission with ID "${idOrTarget}" not found`);
    }
    targetAssignmentId = current.assignmentId;
  } else {
    targetAssignmentId = idOrTarget.assignmentId;
    current = await getStudentSubmission(idOrTarget.assignmentId, idOrTarget.studentId);
  }

  if (typeof marksObtained !== 'number' || isNaN(marksObtained) || marksObtained < 0) {
    throw new Error('Marks obtained must be a non-negative number');
  }

  const assignment = await getAssignment(targetAssignmentId);
  if (!assignment) {
    throw new Error(`Assignment with ID "${targetAssignmentId}" not found`);
  }

  if (marksObtained > assignment.maxMarks) {
    throw new Error(
      `Marks obtained (${marksObtained}) cannot exceed maximum marks (${assignment.maxMarks})`
    );
  }

  const payload = {
    marksObtained: Math.round(marksObtained * 100) / 100,
    feedback: feedback ? feedback.trim() : '',
    gradedBy,
    gradedAt: new Date().toISOString(),
  };

  if (current) {
    return updateSubmission(current.id, payload);
  } else if (typeof idOrTarget !== 'string') {
    // Create an empty submission just to hold the grade
    return createSubmission({
      assignmentId: idOrTarget.assignmentId,
      studentId: idOrTarget.studentId,
      submittedAt: new Date().toISOString(),
      isLate: new Date().getTime() > new Date(assignment.deadline).getTime(),
      ...payload
    });
  } else {
    throw new Error('Unreachable state in gradeSubmission');
  }
}

/**
 * Returns the entire cohort roster for an assignment with submission status,
 * late flag, submitted text/file details, and grading information.
 * Acceptance criteria: "Submissions list shows submitted, late and missing counts. Grading screen: submission content, marks field, feedback field" (FEATURE_SPECIFICATIONS.md §12).
 */
export async function getAssignmentSubmissionsWithStudents(
  scope: Scope,
  assignmentId: ID
): Promise<TeacherSubmissionEvaluation[]> {
  const assignment = await getAssignment(assignmentId);
  if (!assignment) {
    throw new Error(`Assignment with ID "${assignmentId}" not found`);
  }

  const course = await getCourse(assignment.courseId);
  const classId = course?.classId;

  const [cohortStudents, allUsers, submissions] = await Promise.all([
    classId ? listActiveStudents(scope, { classId }) : [],
    listUsers(scope),
    listSubmissions(scope, { assignmentId }),
  ]);

  const userMap = new Map(allUsers.map((u) => [u.id, u.name]));
  const submissionMap = new Map(submissions.map((s) => [s.studentId, s]));
  const deadlineMs = new Date(assignment.deadline).getTime();

  const processedStudentIds = new Set<ID>();
  const evaluations: TeacherSubmissionEvaluation[] = [];

  for (const stu of cohortStudents) {
    processedStudentIds.add(stu.id);
    const submission = submissionMap.get(stu.id);
    const isLate = Boolean(
      submission?.isLate ||
        (submission && new Date(submission.submittedAt).getTime() > deadlineMs)
    );

    let status: 'pending' | 'submitted' | 'late' | 'graded' = 'pending';
    if (submission) {
      if (submission.marksObtained !== undefined) {
        status = 'graded';
      } else if (isLate) {
        status = 'late';
      } else {
        status = 'submitted';
      }
    }

    evaluations.push({
      studentId: stu.id,
      studentName: userMap.get(stu.userId) || `Student #${stu.rollNumber || stu.admissionNumber}`,
      rollNumber: stu.rollNumber || '',
      admissionNumber: stu.admissionNumber || '',
      submission,
      status,
      isLate,
    });
  }

  // Also include any submissions from students not in cohortStudents
  for (const sub of submissions) {
    if (!processedStudentIds.has(sub.studentId)) {
      const isLate = Boolean(
        sub.isLate || new Date(sub.submittedAt).getTime() > deadlineMs
      );
      let status: 'pending' | 'submitted' | 'late' | 'graded' = 'submitted';
      if (sub.marksObtained !== undefined) {
        status = 'graded';
      } else if (isLate) {
        status = 'late';
      }

      evaluations.push({
        studentId: sub.studentId,
        studentName: `Student ${sub.studentId}`,
        rollNumber: '',
        admissionNumber: '',
        submission: sub,
        status,
        isLate,
      });
    }
  }

  evaluations.sort((a, b) => {
    if (a.rollNumber && b.rollNumber) {
      const diff = Number(a.rollNumber) - Number(b.rollNumber);
      if (!isNaN(diff) && diff !== 0) return diff;
      return a.rollNumber.localeCompare(b.rollNumber);
    }
    return a.studentName.localeCompare(b.studentName);
  });

  return evaluations;
}

export async function deleteSubmission(id: ID): Promise<void> {
  return deleteCollectionItem<Submission>(STORAGE_KEYS.SUBMISSIONS, id);
}

/**
 * Returns all assignments for a course enriched with the student's submission status,
 * late flag, lesson title, and evaluation details.
 */
export async function getStudentCourseAssignments(
  scope: Scope,
  courseId: ID,
  studentId: ID
): Promise<StudentAssignmentDetails[]> {
  const [assignments, lessons, studentSubmissions] = await Promise.all([
    listAssignments(scope, courseId),
    listLessons(scope, courseId),
    listSubmissions(scope, { studentId }),
  ]);

  const lessonMap = new Map(lessons.map((l) => [l.id, l.title]));
  const submissionMap = new Map(studentSubmissions.map((s) => [s.assignmentId, s]));

  return assignments.map((assignment: Assignment) => {
    const submission = submissionMap.get(assignment.id);
    const isSubmitted = !!submission;
    const isLateSubmission = Boolean(
      submission?.isLate ||
        (submission && new Date(submission.submittedAt).getTime() > new Date(assignment.deadline).getTime())
    );

    let status: 'pending' | 'submitted' | 'late' | 'graded' = 'pending';
    if (submission) {
      if (submission.marksObtained !== undefined) {
        status = 'graded';
      } else if (isLateSubmission) {
        status = 'late';
      } else {
        status = 'submitted';
      }
    }

    return {
      ...assignment,
      lessonTitle: assignment.lessonId ? lessonMap.get(assignment.lessonId) : undefined,
      submission,
      isSubmitted,
      isLateSubmission,
      status,
    };
  });
}
