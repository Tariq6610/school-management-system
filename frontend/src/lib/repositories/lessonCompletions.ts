/**
 * Repository for student lesson completions and dynamic course progress computation.
 * Reference: FEATURE_SPECIFICATIONS.md §11
 *
 * ACCEPTANCE CRITERIA: "Computed on read, never stored."
 * Progress percentage and completed counts are never persisted as fields on Course.
 * They are computed dynamically on read by joining active lessons with student completions.
 */

import { getItem, setItem, STORAGE_KEYS } from '@/lib/storage';
import {
  ID,
  LessonCompletion,
  NewLessonCompletion,
  CourseProgress,
  EnrichedCourseWithProgress,
  Scope,
} from '@/types';
import { createCollectionItem, listCollection } from './base';
import { listLessons } from './lessons';
import { getStudentCourses } from './courses';

/**
 * List all lesson completions for a given student, optionally filtered by course.
 */
export async function getLessonCompletions(
  scope: Scope,
  studentId: ID,
  courseId?: ID
): Promise<LessonCompletion[]> {
  return listCollection<LessonCompletion>(
    STORAGE_KEYS.LESSON_COMPLETIONS,
    scope,
    (item) => item.studentId === studentId && (!courseId || item.courseId === courseId)
  );
}

/**
 * Check if a specific lesson is completed by a student.
 */
export async function isLessonCompleted(
  scope: Scope,
  studentId: ID,
  lessonId: ID
): Promise<boolean> {
  const completions = await listCollection<LessonCompletion>(
    STORAGE_KEYS.LESSON_COMPLETIONS,
    scope,
    (item) => item.studentId === studentId && item.lessonId === lessonId
  );
  return completions.length > 0;
}

/**
 * Mark a lesson as complete for a student (idempotent).
 * Explicit student action per FEATURE_SPECIFICATIONS.md §11.
 */
export async function markLessonComplete(
  scope: Scope,
  studentId: ID,
  courseId: ID,
  lessonId: ID
): Promise<LessonCompletion> {
  const schoolId = scope.schoolId || 'sch_main';

  const allCompletions = getItem<LessonCompletion[]>(STORAGE_KEYS.LESSON_COMPLETIONS, []) ?? [];
  const existing = allCompletions.find(
    (c) => c.studentId === studentId && c.lessonId === lessonId
  );

  if (existing) {
    return existing;
  }

  const payload: NewLessonCompletion = {
    schoolId,
    studentId,
    courseId,
    lessonId,
    completedAt: new Date().toISOString(),
  };

  return createCollectionItem<LessonCompletion>(
    STORAGE_KEYS.LESSON_COMPLETIONS,
    payload,
    'lsc'
  );
}

/**
 * Unmark a completed lesson (remove completion record).
 */
export async function unmarkLessonComplete(
  scope: Scope,
  studentId: ID,
  lessonId: ID
): Promise<void> {
  const allCompletions = getItem<LessonCompletion[]>(STORAGE_KEYS.LESSON_COMPLETIONS, []) ?? [];
  const filtered = allCompletions.filter(
    (c) => !(c.studentId === studentId && c.lessonId === lessonId)
  );
  setItem(STORAGE_KEYS.LESSON_COMPLETIONS, filtered);
}

/**
 * Toggle a lesson's completion status for a student.
 * Returns the updated completion state.
 */
export async function toggleLessonCompletion(
  scope: Scope,
  studentId: ID,
  courseId: ID,
  lessonId: ID
): Promise<{ completed: boolean; completion?: LessonCompletion }> {
  const isDone = await isLessonCompleted(scope, studentId, lessonId);
  if (isDone) {
    await unmarkLessonComplete(scope, studentId, lessonId);
    return { completed: false };
  } else {
    const completion = await markLessonComplete(scope, studentId, courseId, lessonId);
    return { completed: true, completion };
  }
}

/**
 * Dynamically computes course progress for a student strictly on read.
 * INVARIANT: Never stored. Derived at read time by querying active lessons and student completions.
 */
export async function getCourseProgress(
  scope: Scope,
  studentId: ID,
  courseId: ID
): Promise<CourseProgress> {
  const [lessons, completions] = await Promise.all([
    listLessons(scope, courseId),
    getLessonCompletions(scope, studentId, courseId),
  ]);

  const activeLessonIdSet = new Set(lessons.map((l) => l.id));
  const validCompletions = completions.filter((c) => activeLessonIdSet.has(c.lessonId));
  const completedLessonIds = Array.from(new Set(validCompletions.map((c) => c.lessonId)));

  const totalLessons = lessons.length;
  const completedLessons = completedLessonIds.length;
  const fraction = totalLessons === 0 ? '0/0' : `${completedLessons}/${totalLessons}`;
  const percentage = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
  const isCompleted = totalLessons > 0 && completedLessons === totalLessons;

  return {
    courseId,
    studentId,
    totalLessons,
    completedLessons,
    fraction,
    percentage,
    isCompleted,
    completedLessonIds,
  };
}

/**
 * Returns student enrolled courses with dynamically computed course progress on read.
 * Used by student courses catalog and student dashboard.
 */
export async function getStudentCoursesWithProgress(
  studentId: ID,
  scope: Scope
): Promise<EnrichedCourseWithProgress[]> {
  const courses = await getStudentCourses(studentId, scope);

  const coursesWithProgress = await Promise.all(
    courses.map(async (course) => {
      const progress = await getCourseProgress(scope, studentId, course.id);
      return {
        ...course,
        progress,
      };
    })
  );

  return coursesWithProgress;
}
