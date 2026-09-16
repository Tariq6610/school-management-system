'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { StudentCourseView } from '@/components/lms';
import { getEnrichedCourse, EnrichedCourse } from '@/lib/repositories/courses';
import { NavIcon } from '@/components/shell/NavIcon';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function StudentCourseLessonViewerPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const courseId = resolvedParams.id;

  const [course, setCourse] = useState<EnrichedCourse | null>(null);
  const [loading, setLoading] = useState(true);

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
    <RouteGuard allowedRoles={['super_admin', 'school_admin', 'principal', 'teacher', 'student', 'parent']}>
      <AppShell pageTitle={course ? `${course.title} — Learning Modules` : 'Course Viewer'}>
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <Link
              href="/student/courses"
              className="hover:text-neutral-800 transition-colors font-medium flex items-center gap-1"
            >
              <span>&larr;</span>
              <span>My Courses</span>
            </Link>
            <span>/</span>
            <span className="text-neutral-800 font-semibold truncate max-w-xs sm:max-w-md">
              {course ? course.title : 'Course'}
            </span>
          </div>

          {loading ? (
            <div className="h-64 rounded-2xl bg-neutral-100 border border-neutral-200 motion-safe:animate-pulse" />
          ) : course ? (
            <StudentCourseView course={course} />
          ) : (
            <div className="p-10 text-center bg-white border border-neutral-200 rounded-2xl space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
                <NavIcon name="alert-triangle" className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-neutral-900">Course Not Found</h3>
              <p className="text-xs text-neutral-500 max-w-md mx-auto">
                The requested learning module is not available or you may not be enrolled in this cohort.
              </p>
              <div className="pt-2">
                <Link
                  href="/student/courses"
                  className="text-xs font-bold text-primary-700 hover:text-primary-900"
                >
                  Return to Course Catalog &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>
      </AppShell>
    </RouteGuard>
  );
}
