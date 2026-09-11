import { STORAGE_KEYS } from '@/lib/storage';
import { Course, EnrichedCourse, ID, Lesson, NewCourse, Scope } from '@/types';
import {
  createCollectionItem,
  deleteCollectionItem,
  getCollectionItem,
  listCollection,
  updateCollectionItem,
} from './base';
import { listSubjects } from './subjects';
import { listClasses } from './classes';
import { listTeachers } from './teachers';
import { listUsers } from './users';
import { getStudent } from './students';

export type { EnrichedCourse };

export interface CourseFilter {
  teacherId?: ID;
  subjectId?: ID;
  classId?: ID;
  search?: string;
}

export async function listCourses(scope: Scope, filter?: CourseFilter): Promise<Course[]> {
  return listCollection<Course>(STORAGE_KEYS.COURSES, scope, (course) => {
    if (filter?.teacherId && course.teacherId !== filter.teacherId) return false;
    if (filter?.subjectId && course.subjectId !== filter.subjectId) return false;
    if (filter?.classId && course.classId !== filter.classId) return false;
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      const matchTitle = course.title.toLowerCase().includes(q);
      const matchDesc = course.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }
    return true;
  });
}

export async function getCourse(id: ID): Promise<Course | null> {
  return getCollectionItem<Course>(STORAGE_KEYS.COURSES, id);
}

/**
 * Returns enriched courses with human-readable subject names, class names,
 * teacher names, and total lesson counts.
 */
export async function getEnrichedCourses(
  scope: Scope,
  filter?: CourseFilter
): Promise<EnrichedCourse[]> {
  const [courses, subjects, classes, teachers, users, allLessons] = await Promise.all([
    listCourses(scope, filter),
    listSubjects(scope),
    listClasses(scope),
    listTeachers(scope),
    listUsers(scope),
    listCollection<Lesson>(STORAGE_KEYS.LESSONS, scope),
  ]);

  const subjectMap = new Map(subjects.map((s) => [s.id, s]));
  const classMap = new Map(classes.map((c) => [c.id, `${c.grade} - Section ${c.section}`]));
  const userMap = new Map(users.map((u) => [u.id, u.name]));
  const teacherMap = new Map(
    teachers.map((t) => [t.id, userMap.get(t.userId) || t.employeeNumber || 'Teacher'])
  );

  // Lesson counts per course
  const lessonCounts = new Map<string, number>();
  for (const lesson of allLessons) {
    lessonCounts.set(lesson.courseId, (lessonCounts.get(lesson.courseId) || 0) + 1);
  }

  return courses.map((course) => {
    const subject = subjectMap.get(course.subjectId);
    return {
      ...course,
      subjectName: subject?.name || 'Unknown Subject',
      subjectCode: subject?.code,
      className: classMap.get(course.classId) || 'Unknown Class',
      teacherName: teacherMap.get(course.teacherId) || 'Unknown Instructor',
      lessonCount: lessonCounts.get(course.id) || 0,
    };
  });
}

/**
 * Returns a single enriched course by ID.
 */
export async function getEnrichedCourse(id: ID): Promise<EnrichedCourse | null> {
  const course = await getCourse(id);
  if (!course) return null;

  const scope: Scope = { schoolId: course.schoolId, campusId: course.campusId };
  const enrichedList = await getEnrichedCourses(scope, { classId: course.classId });
  return enrichedList.find((c) => c.id === id) || null;
}

/**
 * Automatically retrieves all courses enrolled for a student via their assigned class cohort.
 * Acceptance criteria: "Students see courses automatically" (FEATURE_SPECIFICATIONS.md §11).
 */
export async function getStudentCourses(
  studentId: ID,
  scope?: Scope
): Promise<EnrichedCourse[]> {
  const student = await getStudent(studentId);
  if (!student || !student.classId) {
    return [];
  }

  const effectiveScope: Scope = {
    schoolId: scope?.schoolId || student.schoolId,
    campusId: scope?.campusId || student.campusId,
  };

  return getEnrichedCourses(effectiveScope, { classId: student.classId });
}

export async function createCourse(input: NewCourse): Promise<Course> {
  if (!input.title || !input.title.trim()) {
    throw new Error('Course title is required');
  }
  if (!input.classId) {
    throw new Error('Course must be assigned to a class cohort for student enrollment');
  }
  if (!input.subjectId) {
    throw new Error('Course must be associated with an academic subject');
  }
  if (!input.teacherId) {
    throw new Error('Course must have an assigned instructor');
  }

  const payload: NewCourse = {
    ...input,
    title: input.title.trim(),
    description: input.description?.trim() || '',
    coverColor: input.coverColor || '#6366f1',
  };

  return createCollectionItem<Course>(STORAGE_KEYS.COURSES, payload, 'crs');
}

export async function updateCourse(id: ID, patch: Partial<Course>): Promise<Course> {
  return updateCollectionItem<Course>(STORAGE_KEYS.COURSES, id, patch);
}

export async function deleteCourse(id: ID): Promise<void> {
  return deleteCollectionItem<Course>(STORAGE_KEYS.COURSES, id);
}
