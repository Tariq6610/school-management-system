'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { EnrichedCourse, EnrichedCourseWithProgress, Scope } from '@/types';
import { useSession } from '@/components/providers/SessionProvider';
import { getStudentCoursesWithProgress } from '@/lib/repositories/lessonCompletions';
import { getStudent } from '@/lib/repositories/students';
import { listClasses } from '@/lib/repositories/classes';
import { NavIcon } from '@/components/shell/NavIcon';

export interface StudentCoursesViewProps {
  initialCourses?: (EnrichedCourse | EnrichedCourseWithProgress)[];
  studentId?: string;
}

export function StudentCoursesView({
  initialCourses,
  studentId: propStudentId,
}: StudentCoursesViewProps) {
  const { session } = useSession();
  const schoolId = session?.schoolId ?? 'sch_main';
  const campusId = session?.campusId;

  // Resolve student ID: prop or activeChildId or session.userId
  const activeStudentId = propStudentId || session?.activeChildId || session?.userId || 'stu_ayesha';

  const [courses, setCourses] = useState<(EnrichedCourse | EnrichedCourseWithProgress)[]>(
    initialCourses || []
  );
  const [classNameLabel, setClassNameLabel] = useState<string>('Class Cohort');
  const [loading, setLoading] = useState<boolean>(!initialCourses);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadStudentEnrolments = useCallback(async () => {
    try {
      setLoading(true);
      const scope: Scope = { schoolId, campusId };
      const [student, enrolledCoursesWithProgress, classes] = await Promise.all([
        getStudent(activeStudentId),
        getStudentCoursesWithProgress(activeStudentId, scope),
        listClasses(scope),
      ]);

      if (student?.classId) {
        const matchedClass = classes.find((c) => c.id === student.classId);
        if (matchedClass) {
          setClassNameLabel(`${matchedClass.grade} - Section ${matchedClass.section}`);
        }
      }

      setCourses(enrolledCoursesWithProgress);
      setLoading(false);
    } catch (err) {
      console.error('Failed to load student courses:', err);
      setLoading(false);
    }
  }, [activeStudentId, schoolId, campusId]);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore && !initialCourses) {
        loadStudentEnrolments();
      }
    });
    return () => {
      ignore = true;
    };
  }, [loadStudentEnrolments, initialCourses]);

  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return courses;
    const q = searchQuery.toLowerCase();
    return courses.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.subjectName.toLowerCase().includes(q) ||
        c.teacherName.toLowerCase().includes(q)
    );
  }, [courses, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Automatic Enrolment Banner */}
      <div className="bg-primary-50 border border-primary-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-600 text-white flex items-center justify-center shrink-0 shadow-xs">
            <NavIcon name="book-open" className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-primary-950">
              Automatic Class Enrollment
            </h2>
            <p className="text-xs text-primary-800 mt-0.5">
              You are automatically enrolled in all learning modules published for{' '}
              <strong className="font-semibold text-primary-950 underline decoration-primary-400">
                {classNameLabel}
              </strong>
              . No course codes or invitations needed.
            </p>
          </div>
        </div>

        <div className="text-xs text-primary-900 font-semibold bg-white/80 border border-primary-200 px-3 py-1.5 rounded-xl shrink-0 self-start sm:self-auto">
          {courses.length} {courses.length === 1 ? 'Course' : 'Courses'} Active
        </div>
      </div>

      {/* Search Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search enrolled courses or subjects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs sm:text-sm border border-neutral-300 rounded-xl py-2 px-3 pl-9 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 shadow-xs"
          />
          <svg
            className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Courses Grid */}
      {loading ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center text-neutral-500 shadow-xs motion-safe:animate-pulse">
          Loading your enrolled courses...
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-500 flex items-center justify-center mx-auto">
            <NavIcon name="book-open" className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-neutral-900">No Courses Available</h3>
          <p className="text-xs sm:text-sm text-neutral-500 max-w-md mx-auto">
            {searchQuery
              ? 'No courses match your search query.'
              : 'Your teachers have not published any courses for your class yet. Check back soon!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <div
              key={course.id}
              className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Course Cover Banner */}
                <div
                  className="bg-primary-600 h-28 p-4 flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                  <div className="flex items-center justify-between relative z-10">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 text-neutral-900 uppercase tracking-wider backdrop-blur-xs">
                      {course.subjectCode || 'SUBJECT'}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-black/30 text-white backdrop-blur-xs">
                      {course.lessonCount} {course.lessonCount === 1 ? 'Lesson' : 'Lessons'}
                    </span>
                  </div>

                  <div className="relative z-10">
                    <span className="text-xs font-semibold text-white/90 drop-shadow-xs">
                      {course.subjectName}
                    </span>
                  </div>
                </div>

                {/* Course Details */}
                <div className="p-5 space-y-3">
                  <div>
                    <h3 className="text-base font-bold text-neutral-900 group-hover:text-primary-700 transition-colors line-clamp-1">
                      {course.title}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1 line-clamp-2 min-h-[32px]">
                      {course.description || 'Welcome to this curriculum course module.'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-600">
                    <span className="text-neutral-500">Instructor:</span>
                    <span className="font-semibold text-neutral-900">{course.teacherName}</span>
                  </div>

                  {/* Course Progress Bar & Completed-Lessons Fraction (Computed on read, never stored) */}
                  {'progress' in course && course.progress && (
                    <div className="pt-2 border-t border-neutral-100 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-500 font-medium">Progress</span>
                        <span
                          className="font-bold text-neutral-800 font-mono text-[11px]"
                          data-testid={`course-progress-${course.id}`}
                        >
                          {`${course.progress.completedLessons}/${course.progress.totalLessons} completed (${course.progress.percentage}%)`}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            course.progress.percentage === 100
                              ? 'bg-emerald-500'
                              : 'bg-primary-600'
                          }`}
                          style={{ width: `${course.progress.percentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-700">
                  Enrolled &bull; Active
                </span>
                <Link
                  href={`/student/courses/${course.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                >
                  <span>Open Course</span>
                  <span className="text-sm leading-none">&rarr;</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
