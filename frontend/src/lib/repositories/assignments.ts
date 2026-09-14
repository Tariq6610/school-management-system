import { STORAGE_KEYS } from '@/lib/storage';
import { Assignment, EnrichedAssignment, ID, NewAssignment, Scope, Submission } from '@/types';
import {
  createCollectionItem,
  deleteCollectionItem,
  getCollectionItem,
  listCollection,
  updateCollectionItem,
} from './base';
import { getCourse, listCourses } from './courses';
import { getLesson, listLessons } from './lessons';
import { listActiveStudents } from './students';
import { listSubmissions } from './submissions';
import { triggerHomeworkWhatsAppAlert } from './whatsappLog';

export async function listAssignments(scope: Scope, courseId?: ID): Promise<Assignment[]> {
  return listCollection<Assignment>(STORAGE_KEYS.ASSIGNMENTS, scope, (item) => {
    if (courseId && item.courseId !== courseId) return false;
    return true;
  });
}

export async function getAssignment(id: ID): Promise<Assignment | null> {
  return getCollectionItem<Assignment>(STORAGE_KEYS.ASSIGNMENTS, id);
}

export async function getAssignmentsByCourse(scope: Scope, courseId: ID): Promise<Assignment[]> {
  return listAssignments(scope, courseId);
}

export async function getAssignmentsByLesson(scope: Scope, lessonId: ID): Promise<Assignment[]> {
  return listCollection<Assignment>(STORAGE_KEYS.ASSIGNMENTS, scope, (item) => item.lessonId === lessonId);
}

export async function createAssignment(input: NewAssignment): Promise<Assignment> {
  if (!input.title || !input.title.trim()) {
    throw new Error('Assignment title is required');
  }
  if (!input.courseId) {
    throw new Error('Assignment must belong to a course');
  }
  if (typeof input.maxMarks !== 'number' || isNaN(input.maxMarks) || input.maxMarks <= 0) {
    throw new Error('Maximum marks must be a positive number');
  }
  if (!input.deadline || isNaN(Date.parse(input.deadline))) {
    throw new Error('A valid deadline date and time is required');
  }

  // Validate optional lesson link if provided
  let normalizedLessonId: ID | undefined = undefined;
  if (input.lessonId && input.lessonId.trim()) {
    const lesson = await getLesson(input.lessonId.trim());
    if (!lesson) {
      throw new Error(`Linked lesson "${input.lessonId}" does not exist`);
    }
    if (lesson.courseId !== input.courseId) {
      throw new Error(`Linked lesson does not belong to the specified course`);
    }
    normalizedLessonId = lesson.id;
  }

  const payload: NewAssignment = {
    ...input,
    title: input.title.trim(),
    instructions: input.instructions?.trim() || '',
    deadline: new Date(input.deadline).toISOString(),
    maxMarks: Math.round(input.maxMarks),
    lessonId: normalizedLessonId,
    submissionType: input.submissionType || 'online',
  };

  const created = await createCollectionItem<Assignment>(STORAGE_KEYS.ASSIGNMENTS, payload, 'asn');

  try {
    const course = await getCourse(input.courseId);
    const dateStr = new Date(payload.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    await triggerHomeworkWhatsAppAlert(
      { schoolId: course?.schoolId || 'sch_main' },
      {
        subject: course?.title || 'Coursework',
        studentName: 'Ahmed Khan',
        date: dateStr,
        campusName: 'Main Campus',
        parentName: 'Tariq Khan',
        phone: '+92 300 1234567',
      }
    );
  } catch (err) {
    console.warn('[Assignments] Failed to append homework WhatsApp alert:', err);
  }

  return created;
}

export async function updateAssignment(
  id: ID,
  patch: Partial<Assignment>
): Promise<Assignment> {
  const current = await getAssignment(id);
  if (!current) {
    throw new Error(`Assignment with ID "${id}" not found`);
  }

  if (patch.title !== undefined && !patch.title.trim()) {
    throw new Error('Assignment title cannot be empty');
  }
  if (patch.maxMarks !== undefined && (typeof patch.maxMarks !== 'number' || isNaN(patch.maxMarks) || patch.maxMarks <= 0)) {
    throw new Error('Maximum marks must be a positive number');
  }
  if (patch.deadline !== undefined && (!patch.deadline || isNaN(Date.parse(patch.deadline)))) {
    throw new Error('A valid deadline date and time is required');
  }

  const targetCourseId = patch.courseId || current.courseId;
  let normalizedLessonId = patch.lessonId;

  if (patch.lessonId !== undefined) {
    if (patch.lessonId && patch.lessonId.trim()) {
      const lesson = await getLesson(patch.lessonId.trim());
      if (!lesson) {
        throw new Error(`Linked lesson "${patch.lessonId}" does not exist`);
      }
      if (lesson.courseId !== targetCourseId) {
        throw new Error(`Linked lesson does not belong to the course`);
      }
      normalizedLessonId = lesson.id;
    } else {
      normalizedLessonId = undefined;
    }
  }

  return updateCollectionItem<Assignment>(STORAGE_KEYS.ASSIGNMENTS, id, {
    ...patch,
    ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
    ...(patch.instructions !== undefined ? { instructions: patch.instructions.trim() } : {}),
    ...(patch.deadline !== undefined ? { deadline: new Date(patch.deadline).toISOString() } : {}),
    ...(patch.maxMarks !== undefined ? { maxMarks: Math.round(patch.maxMarks) } : {}),
    ...(patch.lessonId !== undefined ? { lessonId: normalizedLessonId } : {}),
    ...(patch.submissionType !== undefined ? { submissionType: patch.submissionType } : {}),
  });
}

export async function deleteAssignment(id: ID): Promise<void> {
  return deleteCollectionItem<Assignment>(STORAGE_KEYS.ASSIGNMENTS, id);
}

/**
 * Returns enriched assignments for a course, including linked lesson title
 * and submission metrics (submitted, late, missing) computed against class enrollment.
 * Acceptance criteria: "Optional lesson link", "Submissions list shows submitted, late and missing counts".
 */
export async function getEnrichedAssignments(
  scope: Scope,
  courseId: ID
): Promise<EnrichedAssignment[]> {
  const [assignments, course, lessons, allSubmissions] = await Promise.all([
    listAssignments(scope, courseId),
    getCourse(courseId),
    listLessons(scope, courseId),
    listSubmissions(scope),
  ]);

  // Lessons map for fast lookup of lessonTitle
  const lessonMap = new Map(lessons.map((l) => [l.id, l.title]));

  // Eligible cohort students to compute missing submissions count
  const enrolledStudents =
    course && course.classId
      ? await listActiveStudents(scope, { classId: course.classId })
      : [];

  const totalEnrolledCount = enrolledStudents.length;

  return assignments.map((assignment) => {
    const assignmentSubmissions = allSubmissions.filter(
      (s: Submission) => s.assignmentId === assignment.id
    );

    const submissionCount = assignmentSubmissions.length;
    const assignmentDeadlineMs = new Date(assignment.deadline).getTime();

    // Late submissions: submitted strictly after deadline
    const lateCount = assignmentSubmissions.filter((s: Submission) => {
      const submittedMs = new Date(s.submittedAt).getTime();
      return submittedMs > assignmentDeadlineMs;
    }).length;

    // Missing submissions: enrolled active students who have not submitted
    const submittedStudentIds = new Set(assignmentSubmissions.map((s) => s.studentId));
    let missingCount = 0;
    if (totalEnrolledCount > 0) {
      missingCount = enrolledStudents.filter((stu) => !submittedStudentIds.has(stu.id)).length;
    }

    return {
      ...assignment,
      lessonTitle: assignment.lessonId ? lessonMap.get(assignment.lessonId) : undefined,
      submissionCount,
      lateCount,
      missingCount,
    };
  });
}

export interface TeacherAssignmentOverviewItem extends EnrichedAssignment {
  courseTitle: string;
}

/**
 * Aggregates assignments across every course a teacher owns, for the
 * cross-course /teacher/homework and /teacher/assignments views.
 * Sorted soonest-deadline first.
 */
export async function getTeacherAssignmentsOverview(
  scope: Scope,
  teacherId: ID
): Promise<TeacherAssignmentOverviewItem[]> {
  const courses = await listCourses(scope, { teacherId });

  const perCourse = await Promise.all(
    courses.map(async (course) => {
      const enriched = await getEnrichedAssignments(scope, course.id);
      return enriched.map((a) => ({ ...a, courseTitle: course.title }));
    })
  );

  return perCourse
    .flat()
    .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());
}
