'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  EnrichedCourse,
  Lesson,
  Scope,
  LessonCompletion,
  CourseProgress,
  StudentAssignmentDetails,
} from '@/types';
import { useSession } from '@/components/providers/SessionProvider';
import { listLessons } from '@/lib/repositories/lessons';
import {
  getLessonCompletions,
  toggleLessonCompletion,
} from '@/lib/repositories/lessonCompletions';
import { getStudentCourseAssignments } from '@/lib/repositories/submissions';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { StudentAssignmentModal } from './StudentAssignmentModal';

function isDeadlineOverdue(deadlineIso: string): boolean {
  return new Date().getTime() > new Date(deadlineIso).getTime();
}

export interface StudentCourseViewProps {
  course: EnrichedCourse;
  initialLessons?: Lesson[];
  initialLessonId?: string;
  studentId?: string;
  initialCompletions?: LessonCompletion[];
}

export function StudentCourseView({
  course,
  initialLessons,
  initialLessonId,
  studentId: propStudentId,
  initialCompletions,
}: StudentCourseViewProps) {
  const { session } = useSession();
  const { showToast } = useToast();
  const schoolId = session?.schoolId ?? course.schoolId ?? 'sch_main';
  const campusId = session?.campusId ?? course.campusId;

  // Resolved active student ID
  const activeStudentId =
    propStudentId || session?.activeChildId || session?.userId || 'stu_ayesha';

  const [lessons, setLessons] = useState<Lesson[]>(initialLessons || []);
  const [loading, setLoading] = useState<boolean>(!initialLessons);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(
    initialLessonId || (initialLessons && initialLessons.length > 0 ? initialLessons[0].id : null)
  );

  // Lesson completions state
  const [completions, setCompletions] = useState<LessonCompletion[]>(initialCompletions || []);
  const [toggling, setToggling] = useState<boolean>(false);

  // Simulated player playback state for video placeholder
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  // Simulated document download toast / notification
  const [downloadSimulated, setDownloadSimulated] = useState<boolean>(false);

  // Tab & Assignments state
  const [activeTab, setActiveTab] = useState<'lessons' | 'assignments'>('lessons');
  const [assignments, setAssignments] = useState<StudentAssignmentDetails[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<StudentAssignmentDetails | null>(null);
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);

  const loadAssignments = useCallback(async () => {
    try {
      const scope: Scope = { schoolId, campusId };
      const data = await getStudentCourseAssignments(scope, course.id, activeStudentId);
      setAssignments(data);
    } catch (err) {
      console.error('Failed to load student course assignments:', err);
    }
  }, [schoolId, campusId, course.id, activeStudentId]);

  const loadLessons = useCallback(async () => {
    try {
      setLoading(true);
      const scope: Scope = { schoolId, campusId };
      const data = await listLessons(scope, course.id);
      setLessons(data);
      if (data.length > 0 && !selectedLessonId) {
        setSelectedLessonId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load lessons for student course view:', err);
    } finally {
      setLoading(false);
    }
  }, [course.id, schoolId, campusId, selectedLessonId]);

  const loadCompletions = useCallback(async () => {
    try {
      const scope: Scope = { schoolId, campusId };
      const comp = await getLessonCompletions(scope, activeStudentId, course.id);
      setCompletions(comp);
    } catch (err) {
      console.error('Failed to load lesson completions:', err);
    }
  }, [schoolId, campusId, activeStudentId, course.id]);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) {
        if (!initialLessons) loadLessons();
        if (!initialCompletions) loadCompletions();
        loadAssignments();
      }
    });
    return () => {
      ignore = true;
    };
  }, [loadLessons, loadCompletions, loadAssignments, initialLessons, initialCompletions]);

  // Current active lesson
  const activeLesson = useMemo(() => {
    if (!lessons.length) return null;
    return lessons.find((l) => l.id === selectedLessonId) || lessons[0];
  }, [lessons, selectedLessonId]);

  // Dynamic course progress computed on read (INVARIANT: Never stored)
  const progress: CourseProgress = useMemo(() => {
    const activeLessonIdSet = new Set(lessons.map((l) => l.id));
    const valid = completions.filter((c) => activeLessonIdSet.has(c.lessonId));
    const completedLessonIds = Array.from(new Set(valid.map((c) => c.lessonId)));
    const totalLessons = lessons.length;
    const completedLessons = completedLessonIds.length;
    const fraction = totalLessons === 0 ? '0/0' : `${completedLessons}/${totalLessons}`;
    const percentage = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
    const isCompleted = totalLessons > 0 && completedLessons === totalLessons;
    return {
      courseId: course.id,
      studentId: activeStudentId,
      totalLessons,
      completedLessons,
      fraction,
      percentage,
      isCompleted,
      completedLessonIds,
    };
  }, [lessons, completions, course.id, activeStudentId]);

  const completedLessonIdSet = useMemo(() => {
    return new Set(progress.completedLessonIds);
  }, [progress.completedLessonIds]);

  const isCurrentLessonCompleted = useMemo(() => {
    if (!activeLesson) return false;
    return completedLessonIdSet.has(activeLesson.id);
  }, [activeLesson, completedLessonIdSet]);

  // Explicit student action to mark/unmark lesson complete
  const handleToggleCompletion = async () => {
    if (!activeLesson) return;
    try {
      setToggling(true);
      const scope: Scope = { schoolId, campusId };
      const res = await toggleLessonCompletion(
        scope,
        activeStudentId,
        course.id,
        activeLesson.id
      );
      if (res.completed && res.completion) {
        setCompletions((prev) => [
          ...prev.filter((c) => c.lessonId !== activeLesson.id),
          res.completion!,
        ]);
        showToast({ type: 'success', title: 'Lesson marked as completed!' });
      } else {
        setCompletions((prev) => prev.filter((c) => c.lessonId !== activeLesson.id));
        showToast({ type: 'info', title: 'Lesson marked as incomplete.' });
      }
    } catch (err) {
      console.error('Failed to toggle completion:', err);
      showToast({ type: 'error', title: 'Failed to update completion status' });
    } finally {
      setToggling(false);
    }
  };

  // Active lesson index
  const activeIndex = useMemo(() => {
    if (!activeLesson) return -1;
    return lessons.findIndex((l) => l.id === activeLesson.id);
  }, [lessons, activeLesson]);

  // Handlers for Next / Previous lesson
  const handlePreviousLesson = () => {
    if (activeIndex > 0) {
      setSelectedLessonId(lessons[activeIndex - 1].id);
      setIsPlaying(false);
      setDownloadSimulated(false);
    }
  };

  const handleNextLesson = () => {
    if (activeIndex >= 0 && activeIndex < lessons.length - 1) {
      setSelectedLessonId(lessons[activeIndex + 1].id);
      setIsPlaying(false);
      setDownloadSimulated(false);
    }
  };

  const handleSelectLesson = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    setIsPlaying(false);
    setDownloadSimulated(false);
  };

  return (
    <div className="space-y-6">
      {/* Course Hero Header */}
      <div
        className="rounded-2xl p-6 sm:p-7 text-white relative overflow-hidden shadow-sm"
        style={{ backgroundColor: course.coverColor || '#4B2FA8' }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/90 text-neutral-900 uppercase tracking-wider backdrop-blur-xs">
              {course.subjectCode || 'SYLLABUS'}
            </span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-black/40 text-white backdrop-blur-xs">
              {course.className}
            </span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-xs">
              Instructor: {course.teacherName}
            </span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/80 text-white backdrop-blur-xs">
              {lessons.length} {lessons.length === 1 ? 'Lesson' : 'Lessons'}
            </span>
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white drop-shadow-xs">
              {course.title}
            </h1>
            <p className="text-xs sm:text-sm text-white/85 mt-1 max-w-3xl leading-relaxed">
              {course.description || 'Welcome to your learning modules and lecture materials.'}
            </p>
          </div>

          {/* Dynamic Course Progress (Computed on read, never stored) */}
          <div className="pt-3 border-t border-white/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white/90">Course Progress:</span>
              <span
                className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-white/20 text-white backdrop-blur-xs"
                data-testid="course-progress-fraction"
              >
                {`${progress.fraction} completed (${progress.percentage}%)`}
              </span>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-64">
              <div className="flex-1 h-2.5 bg-black/30 rounded-full overflow-hidden border border-white/20">
                <div
                  className={`h-full transition-all duration-300 ${
                    progress.percentage === 100 ? 'bg-emerald-400' : 'bg-white'
                  }`}
                  style={{ width: `${progress.percentage}%` }}
                  data-testid="course-progress-bar"
                />
              </div>
              <span className="text-xs font-mono font-bold text-white/90 shrink-0">
                {`${progress.percentage}%`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200">
        <button
          type="button"
          onClick={() => setActiveTab('lessons')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
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
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-neutral-100 text-neutral-600">
            {lessons.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('assignments')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
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
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800">
            {assignments.length}
          </span>
        </button>
      </div>

      {/* Main Two-Column Learning Layout (Lessons Tab) */}
      {activeTab === 'lessons' && (
        loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-96 rounded-2xl bg-neutral-100 border border-neutral-200 animate-pulse" />
            <div className="h-96 rounded-2xl bg-neutral-100 border border-neutral-200 animate-pulse" />
          </div>
        ) : lessons.length === 0 ? (
        /* Empty State */
        <div className="bg-white border-2 border-dashed border-neutral-200 rounded-2xl p-12 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-500 flex items-center justify-center mx-auto text-xl">
            📚
          </div>
          <h3 className="text-base font-bold text-neutral-900">No Lessons Published Yet</h3>
          <p className="text-xs text-neutral-500 max-w-md mx-auto">
            Your instructor has not added learning modules for this course yet. Please check back later.
          </p>
          <div className="pt-2">
            <Link
              href="/student/courses"
              className="text-xs font-bold text-purple-700 hover:text-purple-900"
            >
              &larr; Return to My Courses
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* LEFT: Main Lesson Canvas & Content Viewer */}
          <div className="lg:col-span-2 space-y-4">
            {activeLesson && (
              <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-xs">
                {/* Lesson Header */}
                <div className="p-5 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                        Lesson {activeIndex + 1} of {lessons.length}
                      </span>
                      {activeLesson.contentType === 'video' && (
                        <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200/60 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span>{`Video (${activeLesson.durationMinutes ?? 30} mins)`}</span>
                        </span>
                      )}
                      {activeLesson.contentType === 'pdf' && (
                        <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200/60 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                          <span>PDF Document</span>
                        </span>
                      )}
                      {activeLesson.contentType === 'notes' && (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200/60 flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>Study Notes</span>
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-bold text-neutral-900 mt-2">
                      {activeLesson.title}
                    </h2>
                  </div>

                  {/* Action Buttons: Mark Complete & Navigation */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Button
                      variant={isCurrentLessonCompleted ? 'secondary' : 'primary'}
                      size="sm"
                      onClick={handleToggleCompletion}
                      disabled={toggling}
                      className={`text-xs font-bold transition-all ${
                        isCurrentLessonCompleted
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 ring-1 ring-emerald-400/30'
                          : 'bg-purple-600 hover:bg-purple-700 text-white'
                      }`}
                      data-testid="mark-complete-button"
                      title={isCurrentLessonCompleted ? 'Click to mark incomplete' : 'Mark lesson as complete'}
                    >
                      {isCurrentLessonCompleted ? (
                        <>
                          <svg className="w-3.5 h-3.5 mr-1 text-emerald-600 inline shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Completed</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5 mr-1 inline shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Mark Complete</span>
                        </>
                      )}
                    </Button>

                    <div className="flex items-center gap-1.5 border-l border-neutral-200 pl-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={activeIndex <= 0}
                        onClick={handlePreviousLesson}
                        className="text-xs"
                        title="Previous lesson"
                      >
                        &larr; Prev
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={activeIndex >= lessons.length - 1}
                        onClick={handleNextLesson}
                        className="text-xs"
                        title="Next lesson"
                      >
                        Next &rarr;
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Content Viewer Presentation based on Acceptance Criteria */}
                <div className="p-5 sm:p-6">
                  {/* 1. Video Player Placeholder */}
                  {activeLesson.contentType === 'video' && (
                    <div className="space-y-4" data-testid="video-player-placeholder">
                      <div className="relative aspect-video w-full rounded-2xl bg-neutral-950 overflow-hidden flex flex-col justify-between p-4 sm:p-6 shadow-inner text-white border border-neutral-800 group">
                        {/* Top bar */}
                        <div className="flex items-center justify-between z-10">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                              HD 1080p Stream
                            </span>
                          </div>
                          <span className="text-xs font-mono bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full text-white">
                            {`${activeLesson.durationMinutes ?? 30} mins`}
                          </span>
                        </div>

                        {/* Center Play/Pause Button */}
                        <div className="flex flex-col items-center justify-center gap-3 z-10 my-auto">
                          <button
                            type="button"
                            onClick={() => setIsPlaying(!isPlaying)}
                            className="w-16 h-16 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-lg transform hover:scale-105 active:scale-95 transition-all cursor-pointer backdrop-blur-sm border border-white/20"
                            aria-label={isPlaying ? 'Pause video' : 'Play video'}
                          >
                            {isPlaying ? (
                              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                              </svg>
                            ) : (
                              <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            )}
                          </button>
                          <span className="text-xs text-neutral-300 font-medium">
                            {isPlaying ? 'Streaming simulated video lecture...' : 'Click to start video lecture'}
                          </span>
                        </div>

                        {/* Bottom Controls Scrubber */}
                        <div className="space-y-2 z-10">
                          <div className="w-full bg-neutral-800/80 h-1.5 rounded-full overflow-hidden cursor-pointer">
                            <div
                              className={`bg-purple-500 h-full rounded-full transition-all duration-300 ${
                                isPlaying ? 'w-1/2 animate-pulse' : 'w-1/4'
                              }`}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                            <span>{isPlaying ? '14:32' : '00:00'}</span>
                            <span>{activeLesson.durationMinutes ?? 30}:00</span>
                          </div>
                        </div>

                        {/* Ambient glow */}
                        <div className="absolute inset-0 bg-radial from-purple-900/30 via-transparent to-transparent pointer-events-none" />
                      </div>

                      {/* Video Information & Syllabus Notes */}
                      <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-neutral-800">Video Lecture Source</span>
                          <span className="font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-100 truncate max-w-xs sm:max-w-md">
                            {activeLesson.contentUrl || 'https://lms.academy.internal/stream/mp4-placeholder'}
                          </span>
                        </div>
                        {activeLesson.body && (
                          <div className="pt-2 border-t border-neutral-200/60">
                            <h4 className="text-xs font-bold text-neutral-700 mb-1">Lecture Outline & Guidance</h4>
                            <p className="text-xs text-neutral-600 whitespace-pre-line leading-relaxed">
                              {activeLesson.body}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 2. PDF Document Placeholder */}
                  {activeLesson.contentType === 'pdf' && (
                    <div className="space-y-4" data-testid="pdf-document-placeholder">
                      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 sm:p-10 flex flex-col items-center justify-center text-center shadow-xs">
                        <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-xs mb-3">
                          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        <h3 className="text-sm font-bold text-neutral-900">
                          {activeLesson.contentUrl?.split('/').pop() || `${activeLesson.title}.pdf`}
                        </h3>
                        <p className="text-xs text-neutral-500 mt-1 max-w-sm">
                          Document viewer placeholder. No real files are stored in prototype mode per specification.
                        </p>

                        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                          <span className="text-xs font-mono bg-white px-3 py-1.5 rounded-lg border border-neutral-300 text-neutral-700 shadow-2xs">
                            Format: Adobe PDF (1.4 MB)
                          </span>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setDownloadSimulated(true)}
                            className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
                          >
                            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            <span>Open / Download PDF</span>
                          </Button>
                        </div>

                        {downloadSimulated && (
                          <div className="mt-4 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                            <span>✓ Simulated document download initiated. No real files are stored.</span>
                          </div>
                        )}
                      </div>

                      {/* Reading Guide */}
                      {activeLesson.body && (
                        <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
                          <h4 className="text-xs font-bold text-neutral-800">Reading Guidance</h4>
                          <p className="text-xs text-neutral-600 whitespace-pre-line leading-relaxed">
                            {activeLesson.body}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. Notes Rich Text Viewer */}
                  {activeLesson.contentType === 'notes' && (
                    <div className="space-y-4" data-testid="rich-notes-viewer">
                      <div className="rounded-2xl border border-neutral-200 bg-neutral-50/50 p-6">
                        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neutral-200/80 text-xs font-semibold text-neutral-500">
                          <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          <span>Curriculum Lecture Notes & Rich Text Content</span>
                        </div>

                        <div className="text-neutral-800 text-sm leading-relaxed whitespace-pre-line font-normal">
                          {activeLesson.body || 'No study notes recorded for this lesson.'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Navigation Footer */}
                <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={activeIndex <= 0}
                    onClick={handlePreviousLesson}
                    className="text-xs font-semibold"
                  >
                    &larr; Previous Unit
                  </Button>

                  <span className="text-xs text-neutral-500 font-medium hidden sm:inline">
                    {activeLesson.title}
                  </span>

                  <Button
                    variant="primary"
                    size="sm"
                    disabled={activeIndex >= lessons.length - 1}
                    onClick={handleNextLesson}
                    className="text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    Next Unit &rarr;
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Sequential Syllabus / Course Playlist Sidebar */}
          <div className="space-y-4">
            <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-neutral-900">
                  Course Syllabus
                </h3>
                <span
                  className="text-xs font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 font-mono"
                  data-testid="sidebar-completed-count"
                >
                  {`${progress.completedLessons}/${lessons.length} Done`}
                </span>
              </div>

              {/* Playlist Item List */}
              <div className="space-y-2" role="list" aria-label="Course Playlist">
                {lessons.map((lesson, idx) => {
                  const isSelected = lesson.id === activeLesson?.id;
                  const isDone = completedLessonIdSet.has(lesson.id);

                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      onClick={() => handleSelectLesson(lesson.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-purple-600 bg-purple-50/70 text-purple-950 font-semibold shadow-xs ring-1 ring-purple-600/30'
                          : isDone
                          ? 'border-emerald-200/80 bg-emerald-50/30 hover:bg-emerald-50/60 text-neutral-800'
                          : 'border-neutral-200/80 hover:border-neutral-300 hover:bg-neutral-50 bg-white text-neutral-700'
                      }`}
                      data-testid={`playlist-lesson-${lesson.id}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Number Index or Completed Checkmark */}
                        {isDone ? (
                          <span
                            className="w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 bg-emerald-100 text-emerald-700 border border-emerald-300"
                            title="Completed"
                            data-testid={`lesson-completed-check-${lesson.id}`}
                          >
                            ✓
                          </span>
                        ) : (
                          <span
                            className={`w-6 h-6 rounded-lg text-xs font-mono font-bold flex items-center justify-center shrink-0 ${
                              isSelected
                                ? 'bg-purple-600 text-white'
                                : 'bg-neutral-100 text-neutral-600'
                            }`}
                          >
                            {idx + 1}
                          </span>
                        )}

                        {/* Title & Type */}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs truncate font-medium">
                              {lesson.title}
                            </p>
                            {isDone && (
                              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded shrink-0">
                                Done
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">
                            {lesson.contentType}
                            {lesson.durationMinutes ? ` • ${lesson.durationMinutes}m` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Icon */}
                      <div className="shrink-0 text-neutral-400">
                        {lesson.contentType === 'video' && (
                          <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                        {lesson.contentType === 'pdf' && (
                          <svg className="w-4 h-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                          </svg>
                        )}
                        {lesson.contentType === 'notes' && (
                          <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Back to catalog card */}
            <div className="p-4 bg-white border border-neutral-200 rounded-2xl flex items-center justify-between">
              <span className="text-xs text-neutral-500 font-medium">All Enrolled Courses</span>
              <Link
                href="/student/courses"
                className="text-xs font-bold text-purple-700 hover:text-purple-900"
              >
                Catalog &rarr;
              </Link>
            </div>
          </div>
        </div>
      ))}

      {/* Course Assignments Tab Content */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-neutral-900">
                Course Assignments & Tasks
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Submit your homework solutions, attachments, and track grades for {course.title}.
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-100 font-mono">
              {assignments.length} {assignments.length === 1 ? 'Assignment' : 'Assignments'}
            </span>
          </div>

          {assignments.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-neutral-200 rounded-2xl p-12 text-center shadow-xs space-y-2">
              <div className="w-12 h-12 rounded-full bg-neutral-100 text-neutral-500 flex items-center justify-center mx-auto text-xl">
                📝
              </div>
              <h3 className="text-sm font-bold text-neutral-900">No Assignments Yet</h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                There are currently no assignments assigned for this course.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignments.map((assignment) => {
                const isPast = isDeadlineOverdue(assignment.deadline);

                return (
                  <div
                    key={assignment.id}
                    className="bg-white border border-neutral-200 rounded-2xl p-5 hover:border-neutral-300 hover:shadow-xs transition-all flex flex-col justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        {assignment.lessonId ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            <span>Unit:</span>
                            <span className="truncate max-w-[150px]">
                              {assignment.lessonTitle || 'Lesson'}
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">
                            Course-Wide
                          </span>
                        )}

                        {/* Status Badge */}
                        {assignment.status === 'graded' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 font-mono">
                            Graded: {assignment.submission?.marksObtained}/{assignment.maxMarks}
                          </span>
                        )}
                        {assignment.status === 'late' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Submitted (Late)
                          </span>
                        )}
                        {assignment.status === 'submitted' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Submitted (On Time)
                          </span>
                        )}
                        {assignment.status === 'pending' && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isPast
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {isPast ? 'Past Due' : 'Not Submitted'}
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-neutral-900 line-clamp-1">
                          {assignment.title}
                        </h4>
                        <p className="text-xs text-neutral-600 line-clamp-2 mt-1 leading-relaxed">
                          {assignment.instructions || 'Review assignment requirements and submit your response.'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                      <div className="text-[11px] text-neutral-500">
                        <span>Due: </span>
                        <span className="font-semibold text-neutral-700">
                          {new Date(assignment.deadline).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <Button
                        type="button"
                        variant={assignment.isSubmitted ? 'secondary' : 'primary'}
                        size="sm"
                        onClick={() => {
                          setSelectedAssignment(assignment);
                          setIsAssignmentModalOpen(true);
                        }}
                        className="text-xs font-bold"
                      >
                        {assignment.isSubmitted ? 'View Submission' : 'Submit Work'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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
          await loadAssignments();
        }}
      />
    </div>
  );
}

