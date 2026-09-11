/**
 * Repository helper for aggregating Student Learning Dashboard data.
 * Reference: FEATURE_SPECIFICATIONS.md §11
 *
 * "Student learning dashboard. 'Today's tasks' grouped by subject:
 * lessons to watch, assignments due, quizzes to take.
 * Course cards show progress as a completed-lessons fraction."
 */

import { ID, Scope, StudentDashboardData, StudentSubjectTasks } from '@/types';
import { getStudent } from './students';
import { getUser } from './users';
import { listClasses } from './classes';
import { listLessons } from './lessons';
import { listAssignments } from './assignments';
import { listSubmissions } from './submissions';
import { getStudentCoursesWithProgress } from './lessonCompletions';

/**
 * Retrieve aggregated student dashboard data grouped by subject.
 */
export async function getStudentDashboardData(
  studentId: ID,
  scope: Scope
): Promise<StudentDashboardData> {
  const [student, enrolledCourses, classes] = await Promise.all([
    getStudent(studentId),
    getStudentCoursesWithProgress(studentId, scope),
    listClasses(scope),
  ]);

  let studentName = 'Student';
  if (student?.userId) {
    const user = await getUser(student.userId);
    if (user?.name) {
      studentName = user.name;
    }
  }
  let className = 'Class Cohort';

  if (student?.classId) {
    const matchedClass = classes.find((c) => c.id === student.classId);
    if (matchedClass) {
      className = `${matchedClass.grade} — Section ${matchedClass.section}`;
    }
  }

  // Fetch student submissions to identify pending assignments
  const submissions = await listSubmissions(scope, { studentId });
  const submittedAssignmentIds = new Set(submissions.map((s) => s.assignmentId));

  // Build subject-grouped task bundles
  const subjectGroups: StudentSubjectTasks[] = await Promise.all(
    enrolledCourses.map(async (course) => {
      const [lessons, assignments] = await Promise.all([
        listLessons(scope, course.id),
        listAssignments(scope, course.id),
      ]);

      const completedLessonSet = new Set(course.progress.completedLessonIds);
      const nextLessons = lessons.filter((l) => !completedLessonSet.has(l.id));

      const pendingAssignments = assignments.filter(
        (a) => !submittedAssignmentIds.has(a.id)
      );

      const pendingTasksCount = nextLessons.length + pendingAssignments.length;

      return {
        subjectId: course.subjectId,
        subjectName: course.subjectName,
        subjectCode: course.subjectCode,
        courseId: course.id,
        courseTitle: course.title,
        coverColor: course.coverColor,
        teacherName: course.teacherName,
        progress: course.progress,
        nextLessons,
        pendingAssignments,
        completedLessonsCount: course.progress.completedLessons,
        totalLessonsCount: course.progress.totalLessons,
        pendingTasksCount,
      };
    })
  );

  // Calculate overall metrics
  const totalCourses = enrolledCourses.length;
  const totalPendingTasks = subjectGroups.reduce((acc, g) => acc + g.pendingTasksCount, 0);

  const totalLessonsAllCourses = enrolledCourses.reduce(
    (acc, c) => acc + c.progress.totalLessons,
    0
  );
  const totalCompletedLessonsAllCourses = enrolledCourses.reduce(
    (acc, c) => acc + c.progress.completedLessons,
    0
  );

  const overallProgressPercentage =
    totalLessonsAllCourses === 0
      ? 0
      : Math.round((totalCompletedLessonsAllCourses / totalLessonsAllCourses) * 100);

  return {
    studentName,
    className,
    totalCourses,
    totalPendingTasks,
    overallProgressPercentage,
    subjectGroups,
    coursesWithProgress: enrolledCourses,
  };
}
