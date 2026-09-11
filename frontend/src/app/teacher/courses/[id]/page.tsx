'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { LessonManager, AssignmentManager } from '@/components/lms';
import { getEnrichedCourse, EnrichedCourse } from '@/lib/repositories/courses';
import { useSession } from '@/components/providers/SessionProvider';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TeacherCourseLessonsPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const courseId = resolvedParams.id;

  const { session } = useSession();
  const schoolId = session?.schoolId ?? 'sch_main';
  const campusId = session?.campusId;

  const [course, setCourse] = useState<EnrichedCourse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'lessons' | 'assignments'>('lessons');

  useEffect(() => {
    async function loadCourseDetails() {
      try {
        setLoading(true);
        const data = await getEnrichedCourse(courseId);
        setCourse(data);
      } catch (err) {
        console.error('Failed to load course details', err);
      } finally {
        setLoading(false);
      }
    }
    loadCourseDetails();
  }, [courseId]);

  return (
    <RouteGuard allowedRoles={['super_admin', 'school_admin', 'principal', 'teacher']}>
      <AppShell
        pageTitle={
          course
            ? `${course.title} — ${activeTab === 'lessons' ? 'Lessons' : 'Assignments'}`
            : 'Course Management'
        }
      >
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Breadcrumb & Top Bar */}
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <Link
              href="/teacher/courses"
              className="hover:text-neutral-800 transition-colors font-medium flex items-center gap-1"
            >
              <span>&larr;</span>
              <span>Back to Courses</span>
            </Link>
            <span>/</span>
            <span className="text-neutral-800 font-semibold truncate max-w-xs sm:max-w-md">
              {course ? course.title : 'Course'}
            </span>
          </div>

          {/* Hero Banner with Course Details */}
          {loading ? (
            <div className="h-36 rounded-2xl bg-neutral-100 border border-neutral-200 motion-safe:animate-pulse" />
          ) : course ? (
            <div
              className="rounded-2xl p-6 text-white relative overflow-hidden shadow-sm"
              style={{ backgroundColor: course.coverColor || '#4B2FA8' }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent pointer-events-none" />

              <div className="relative z-10 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/90 text-neutral-900 uppercase tracking-wider backdrop-blur-xs">
                    {course.subjectCode || 'CURRICULUM'}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-black/40 text-white backdrop-blur-xs">
                    {course.className}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-xs">
                    Instructor: {course.teacherName}
                  </span>
                </div>

                <div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-xs">
                    {course.title}
                  </h1>
                  <p className="text-xs sm:text-sm text-white/85 mt-1 max-w-3xl drop-shadow-2xs">
                    {course.description || 'Course syllabus, units, and learning materials.'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-white border border-neutral-200 rounded-2xl">
              <h3 className="text-sm font-bold text-neutral-900">Course not found</h3>
              <p className="text-xs text-neutral-500 mt-1">
                The requested course module could not be loaded or was removed.
              </p>
              <div className="mt-4">
                <Link
                  href="/teacher/courses"
                  className="text-xs font-semibold text-purple-700 hover:text-purple-900"
                >
                  Return to Course Catalog &rarr;
                </Link>
              </div>
            </div>
          )}

          {/* Module Navigation Tabs */}
          {course && (
            <div className="flex items-center gap-2 border-b border-neutral-200">
              <button
                type="button"
                onClick={() => setActiveTab('lessons')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                  activeTab === 'lessons'
                    ? 'border-purple-600 text-purple-700'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                <span>Syllabus & Lessons</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('assignments')}
                className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
                  activeTab === 'assignments'
                    ? 'border-purple-600 text-purple-700'
                    : 'border-transparent text-neutral-500 hover:text-neutral-800'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
                <span>Course Assignments</span>
              </button>
            </div>
          )}

          {/* Tab Content */}
          {course && activeTab === 'lessons' && (
            <LessonManager
              courseId={course.id}
              courseTitle={course.title}
              schoolId={course.schoolId || schoolId}
              campusId={course.campusId || campusId}
            />
          )}

          {course && activeTab === 'assignments' && (
            <AssignmentManager
              courseId={course.id}
              courseTitle={course.title}
              schoolId={course.schoolId || schoolId}
              campusId={course.campusId || campusId}
            />
          )}
        </div>
      </AppShell>
    </RouteGuard>
  );
}

