'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Assignment, Scope, Student, StudentDashboardData } from '@/types';
import { useSession } from '@/components/providers/SessionProvider';
import { getStudentDashboardData } from '@/lib/repositories/studentDashboard';
import { getStudent } from '@/lib/repositories/students';
import { AnnouncementFeedView } from '@/components/communication';
import { StudentAssignmentModal } from './StudentAssignmentModal';

export interface StudentDashboardViewProps {
  initialData?: StudentDashboardData;
  studentId?: string;
}

export function StudentDashboardView({
  initialData,
  studentId: propStudentId,
}: StudentDashboardViewProps) {
  const { session } = useSession();
  const schoolId = session?.schoolId ?? 'sch_main';
  const campusId = session?.campusId;

  // Resolve student ID
  const activeStudentId =
    propStudentId || session?.activeChildId || session?.userId || 'stu_ayesha';

  const [data, setData] = useState<StudentDashboardData | null>(initialData || null);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const scope: Scope = { schoolId, campusId };
      const [res, stu] = await Promise.all([
        getStudentDashboardData(activeStudentId, scope),
        getStudent(activeStudentId),
      ]);
      setData(res);
      setStudent(stu);
    } catch (err) {
      console.error('Failed to load student dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [activeStudentId, schoolId, campusId]);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore && !initialData) {
        loadDashboard();
      }
    });
    return () => {
      ignore = true;
    };
  }, [loadDashboard, initialData]);

  // Filter subject groups based on subject pill selection
  const filteredSubjectGroups = useMemo(() => {
    if (!data) return [];
    if (selectedSubjectFilter === 'all') return data.subjectGroups;
    return data.subjectGroups.filter((g) => g.subjectId === selectedSubjectFilter);
  }, [data, selectedSubjectFilter]);

  if (loading && !data) {
    return (
      <div className="space-y-6" data-testid="student-dashboard-loading">
        <div className="h-44 rounded-2xl bg-neutral-100 border border-neutral-200 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-28 rounded-2xl bg-neutral-100 border border-neutral-200 animate-pulse" />
          <div className="h-28 rounded-2xl bg-neutral-100 border border-neutral-200 animate-pulse" />
          <div className="h-28 rounded-2xl bg-neutral-100 border border-neutral-200 animate-pulse" />
        </div>
        <div className="h-96 rounded-2xl bg-neutral-100 border border-neutral-200 animate-pulse" />
      </div>
    );
  }

  const dashboardData = data || {
    studentName: 'Student',
    className: 'Class Cohort',
    totalCourses: 0,
    totalPendingTasks: 0,
    overallProgressPercentage: 0,
    subjectGroups: [],
    coursesWithProgress: [],
  };

  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="space-y-8" data-testid="student-dashboard-view">
      {/* Hero Welcome Banner */}
      <div className="rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-purple-900 via-indigo-900 to-neutral-900 text-white shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/20 text-white backdrop-blur-xs font-mono">
                {currentDateFormatted}
              </span>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-500/80 text-white backdrop-blur-xs">
                {dashboardData.className}
              </span>
            </div>
            <Link
              href="/student/courses"
              className="text-xs font-bold text-white/90 hover:text-white underline underline-offset-4 transition-colors"
            >
              Browse All Courses &rarr;
            </Link>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white drop-shadow-xs">
              Welcome back, {dashboardData.studentName}!
            </h1>
            <p className="text-sm text-neutral-200 mt-1 max-w-2xl leading-relaxed">
              Here are your scheduled tasks and learning modules for today. Stay focused, complete your
              assignments, and track your course milestones!
            </p>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        {/* Metric 1: Pending Tasks */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Tasks To Complete
            </p>
            <p
              className="text-2xl sm:text-3xl font-bold text-neutral-900 font-mono tabular-nums"
              data-testid="stat-pending-tasks"
            >
              {dashboardData.totalPendingTasks}
            </p>
            <p className="text-xs text-neutral-500">Upcoming lessons & assignments</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 text-xl font-bold border border-purple-100">
            ✍️
          </div>
        </div>

        {/* Metric 2: Active Enrolled Courses */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Active Courses
            </p>
            <p
              className="text-2xl sm:text-3xl font-bold text-neutral-900 font-mono tabular-nums"
              data-testid="stat-active-courses"
            >
              {dashboardData.totalCourses}
            </p>
            <p className="text-xs text-neutral-500">Subject curriculums</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 text-xl font-bold border border-indigo-100">
            📚
          </div>
        </div>

        {/* Metric 3: Overall Course Completion Progress */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1.5 flex-1 pr-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Overall Progress
            </p>
            <p
              className="text-2xl sm:text-3xl font-bold text-neutral-900 font-mono tabular-nums"
              data-testid="stat-overall-progress"
            >
              {`${dashboardData.overallProgressPercentage}%`}
            </p>
            <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${dashboardData.overallProgressPercentage}%` }}
              />
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 text-xl font-bold border border-emerald-100">
            🎯
          </div>
        </div>
      </div>

      {/* PRIMARY SECTION: Today's Tasks Grouped by Subject (ACCEPTANCE CRITERIA) */}
      <div className="space-y-5" data-testid="subject-tasks-section">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-neutral-900">
                Today&apos;s Tasks
              </h2>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-mono">
                Grouped by Subject
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
              Work through your upcoming lessons, review reading materials, and submit assignments.
            </p>
          </div>

          {/* Subject Filter Pills */}
          {dashboardData.subjectGroups.length > 0 && (
            <div
              className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full"
              role="tablist"
              aria-label="Filter tasks by subject"
            >
              <button
                type="button"
                onClick={() => setSelectedSubjectFilter('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  selectedSubjectFilter === 'all'
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
                data-testid="filter-pill-all"
              >
                All Subjects ({dashboardData.totalPendingTasks})
              </button>

              {dashboardData.subjectGroups.map((group) => (
                <button
                  key={group.subjectId}
                  type="button"
                  onClick={() => setSelectedSubjectFilter(group.subjectId)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    selectedSubjectFilter === group.subjectId
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                  }`}
                  data-testid={`filter-pill-${group.subjectId}`}
                >
                  <span>{group.subjectName}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      selectedSubjectFilter === group.subjectId
                        ? 'bg-white/30 text-white'
                        : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    {group.pendingTasksCount}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Subject Group Cards */}
        {filteredSubjectGroups.length === 0 ? (
          <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto text-xl font-bold">
              🎉
            </div>
            <h3 className="text-base font-bold text-neutral-900">All Tasks Completed!</h3>
            <p className="text-xs sm:text-sm text-neutral-500 max-w-md mx-auto">
              You have completed all pending lessons and assignments for this selection. Great job!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredSubjectGroups.map((group) => (
              <div
                key={group.subjectId}
                className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-xs hover:border-neutral-300 transition-all"
                data-testid={`subject-task-group-${group.subjectId}`}
              >
                {/* Subject Group Header */}
                <div
                  className="p-4 sm:p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative overflow-hidden"
                  style={{ backgroundColor: group.coverColor || '#4B2FA8' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent pointer-events-none" />

                  <div className="relative z-10 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 text-neutral-900 uppercase tracking-wider backdrop-blur-xs">
                        {group.subjectCode || 'SUBJECT'}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-black/40 text-white backdrop-blur-xs">
                        Instructor: {group.teacherName}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-white drop-shadow-xs">
                      {group.subjectName} — {group.courseTitle}
                    </h3>
                  </div>

                  {/* Progress Fraction & Course Link */}
                  <div className="relative z-10 flex items-center gap-3 shrink-0">
                    <div className="text-right hidden sm:block">
                      <span
                        className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-white/20 text-white backdrop-blur-xs block"
                        data-testid={`subject-progress-${group.subjectId}`}
                      >
                        {`${group.progress.fraction} completed (${group.progress.percentage}%)`}
                      </span>
                    </div>

                    <Link
                      href={`/student/courses/${group.courseId}`}
                      className="px-3 py-1.5 bg-white text-neutral-900 hover:bg-neutral-100 rounded-lg text-xs font-bold transition-all shadow-xs shrink-0"
                    >
                      Open Course &rarr;
                    </Link>
                  </div>
                </div>

                {/* Tasks Body for this Subject */}
                <div className="p-5 sm:p-6 space-y-5">
                  {/* Next Lessons to Watch / Study */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>Next Lessons to Watch / Read ({group.nextLessons.length})</span>
                      </h4>
                    </div>

                    {group.nextLessons.length === 0 ? (
                      <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 text-emerald-800 text-xs flex items-center gap-2">
                        <span>✓</span>
                        <span className="font-semibold">All published lessons in this subject have been completed!</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {group.nextLessons.slice(0, 4).map((lesson) => (
                          <div
                            key={lesson.id}
                            className="p-3.5 rounded-xl border border-neutral-200/90 hover:border-purple-300 hover:bg-purple-50/30 transition-all flex flex-col justify-between gap-3 group"
                            data-testid={`lesson-task-${lesson.id}`}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-mono font-bold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded">
                                  Unit {lesson.orderIndex}
                                </span>

                                {lesson.contentType === 'video' && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/60">
                                    {`Video • ${lesson.durationMinutes ?? 30}m`}
                                  </span>
                                )}
                                {lesson.contentType === 'pdf' && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200/60">
                                    PDF Document
                                  </span>
                                )}
                                {lesson.contentType === 'notes' && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                    Study Notes
                                  </span>
                                )}
                              </div>

                              <h5 className="text-xs font-bold text-neutral-900 group-hover:text-purple-700 transition-colors line-clamp-1">
                                {lesson.title}
                              </h5>
                              <p className="text-[11px] text-neutral-500 line-clamp-1">
                                {lesson.body || 'Lesson lecture content and reference resources.'}
                              </p>
                            </div>

                            <div className="pt-2 border-t border-neutral-100 flex items-center justify-end">
                              <Link
                                href={`/student/courses/${group.courseId}?lessonId=${lesson.id}`}
                                className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 hover:text-purple-900"
                              >
                                <span>Start Lesson</span>
                                <span>&rarr;</span>
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Assignments Due */}
                  {group.pendingAssignments.length > 0 && (
                    <div className="space-y-3 pt-2 border-t border-neutral-100">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1.5">
                        <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                        <span>Assignments Due ({group.pendingAssignments.length})</span>
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {group.pendingAssignments.map((assignment) => (
                          <div
                            key={assignment.id}
                            className="p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/20 hover:bg-amber-50/40 transition-all flex flex-col justify-between gap-3"
                            data-testid={`assignment-task-${assignment.id}`}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                  Due: {assignment.deadline ? new Date(assignment.deadline).toLocaleDateString() : 'Scheduled'}
                                </span>
                                <span className="text-[10px] font-mono font-bold text-neutral-600 bg-white px-2 py-0.5 rounded border border-neutral-200">
                                  {assignment.maxMarks} Marks
                                </span>
                              </div>
                              <h5 className="text-xs font-bold text-neutral-900">
                                {assignment.title}
                              </h5>
                              <p className="text-[11px] text-neutral-600 line-clamp-2">
                                {assignment.instructions || 'Review instructions and submit your work before the deadline.'}
                              </p>
                            </div>

                            <div className="pt-2 border-t border-amber-100 flex items-center justify-between">
                              <Link
                                href={`/student/courses/${group.courseId}`}
                                className="text-[11px] font-semibold text-neutral-500 hover:text-neutral-800"
                              >
                                View Course &rarr;
                              </Link>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedAssignment(assignment);
                                  setIsAssignmentModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 text-xs font-bold text-amber-900 bg-amber-200/80 hover:bg-amber-300 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                              >
                                <span>Submit Work</span>
                                <span>&rarr;</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECONDARY SECTION: Course Cards Overview with Progress Fraction */}
      <div className="space-y-4 pt-4 border-t border-neutral-200" data-testid="course-cards-section">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-neutral-900">
              My Enrolled Courses
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500">
              Course cards with completed-lessons fractions and progress tracking.
            </p>
          </div>
          <Link
            href="/student/courses"
            className="text-xs font-bold text-purple-700 hover:text-purple-900"
          >
            View Full Catalog &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dashboardData.coursesWithProgress.map((course) => (
            <div
              key={course.id}
              className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Course Cover Banner */}
                <div
                  className="h-24 p-4 flex flex-col justify-between relative overflow-hidden"
                  style={{ backgroundColor: course.coverColor }}
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

                {/* Course Details & Progress */}
                <div className="p-5 space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 group-hover:text-purple-700 transition-colors line-clamp-1">
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

                  {/* Course Progress Fraction (Computed on read, never stored) */}
                  <div className="pt-2 border-t border-neutral-100 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-neutral-500 font-medium">Progress</span>
                      <span
                        className="font-bold text-neutral-800 font-mono text-[11px]"
                        data-testid={`card-progress-${course.id}`}
                      >
                        {`${course.progress.completedLessons}/${course.progress.totalLessons} completed (${course.progress.percentage}%)`}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          course.progress.percentage === 100
                            ? 'bg-emerald-500'
                            : 'bg-purple-600'
                        }`}
                        style={{ width: `${course.progress.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-700">
                  Enrolled &bull; Active
                </span>
                <Link
                  href={`/student/courses/${course.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                >
                  <span>Open Course</span>
                  <span className="text-sm leading-none">&rarr;</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Announcements & Circulars Section */}
      <div className="space-y-4 pt-6 border-t border-neutral-200">
        <AnnouncementFeedView
          key={`student-feed-${schoolId}-${student?.campusId ?? 'all'}-${student?.classId ?? 'all'}`}
          schoolId={schoolId}
          studentContext={{
            campusId: student?.campusId,
            classId: student?.classId,
          }}
          title="Announcements &amp; Circulars"
          subtitle="Official school announcements and class notices relevant to your cohort."
          limit={3}
        />
      </div>

      {/* Student Assignment Modal */}
      <StudentAssignmentModal
        isOpen={isAssignmentModalOpen}
        onClose={() => {
          setIsAssignmentModalOpen(false);
          setSelectedAssignment(null);
        }}
        assignment={selectedAssignment}
        studentId={activeStudentId}
        onSubmitted={async () => {
          await loadDashboard();
        }}
      />
    </div>
  );
}
