'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Assignment, EnrichedAssignment, Lesson, Scope } from '@/types';
import {
  getEnrichedAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
} from '@/lib/repositories/assignments';
import { listLessons } from '@/lib/repositories/lessons';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { AssignmentModal } from './AssignmentModal';
import { TeacherGradingModal } from './TeacherGradingModal';

export interface AssignmentManagerProps {
  courseId: string;
  courseTitle: string;
  schoolId: string;
  campusId?: string;
  initialAssignments?: EnrichedAssignment[];
  initialLessons?: Lesson[];
}

function getDeadlineStatus(deadlineIso: string): {
  label: string;
  variant: 'past-due' | 'due-today' | 'upcoming';
} {
  const now = new Date();
  const deadline = new Date(deadlineIso);

  if (deadline.getTime() < now.getTime()) {
    return { label: 'Past Due', variant: 'past-due' };
  }

  const isToday =
    now.getFullYear() === deadline.getFullYear() &&
    now.getMonth() === deadline.getMonth() &&
    now.getDate() === deadline.getDate();

  if (isToday) {
    return { label: 'Due Today', variant: 'due-today' };
  }

  return { label: 'Upcoming', variant: 'upcoming' };
}

function formatDeadlineDate(deadlineIso: string): string {
  const d = new Date(deadlineIso);
  if (isNaN(d.getTime())) return deadlineIso;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function AssignmentManager({
  courseId,
  courseTitle,
  schoolId,
  campusId,
  initialAssignments,
  initialLessons,
}: AssignmentManagerProps) {
  const { showToast } = useToast();
  const [assignments, setAssignments] = useState<EnrichedAssignment[]>(initialAssignments || []);
  const [lessons, setLessons] = useState<Lesson[]>(initialLessons || []);
  const [loading, setLoading] = useState<boolean>(!initialAssignments);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [deletingAssignmentId, setDeletingAssignmentId] = useState<string | null>(null);
  const [gradingAssignment, setGradingAssignment] = useState<Assignment | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const scope: Scope = { schoolId, campusId };
      const [enrichedAssignments, courseLessons] = await Promise.all([
        getEnrichedAssignments(scope, courseId),
        listLessons(scope, courseId),
      ]);
      setAssignments(enrichedAssignments);
      setLessons(courseLessons);
    } catch (err) {
      console.error('Failed to load course assignments', err);
      showToast({ type: 'error', title: 'Error', message: 'Could not load assignments' });
    } finally {
      setLoading(false);
    }
  }, [courseId, schoolId, campusId, showToast]);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore && !initialAssignments) {
        loadData();
      }
    });
    return () => {
      ignore = true;
    };
  }, [initialAssignments, loadData]);

  // Handle Save (Create or Update)
  const handleSaveAssignment = async (data: {
    title: string;
    instructions: string;
    deadline: string;
    maxMarks: number;
    lessonId?: string;
  }) => {
    if (editingAssignment) {
      await updateAssignment(editingAssignment.id, {
        title: data.title,
        instructions: data.instructions,
        deadline: data.deadline,
        maxMarks: data.maxMarks,
        lessonId: data.lessonId,
      });
      showToast({ type: 'success', title: 'Assignment updated' });
      setEditingAssignment(null);
    } else {
      await createAssignment({
        schoolId,
        courseId,
        title: data.title,
        instructions: data.instructions,
        deadline: data.deadline,
        maxMarks: data.maxMarks,
        lessonId: data.lessonId,
      });
      showToast({ type: 'success', title: 'Assignment created' });
      setIsAddModalOpen(false);
    }
    await loadData();
  };

  // Handle Delete
  const handleDeleteAssignment = async () => {
    if (!deletingAssignmentId) return;
    try {
      await deleteAssignment(deletingAssignmentId);
      showToast({ type: 'success', title: 'Assignment deleted' });
      setDeletingAssignmentId(null);
      await loadData();
    } catch (err) {
      console.error('Failed to delete assignment', err);
      showToast({ type: 'error', title: 'Failed to delete assignment' });
    }
  };

  // Aggregated metrics across all assignments
  const totalSubmissions = assignments.reduce((acc, a) => acc + a.submissionCount, 0);
  const totalLate = assignments.reduce((acc, a) => acc + a.lateCount, 0);
  const totalMissing = assignments.reduce((acc, a) => acc + a.missingCount, 0);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-neutral-900">Course Assignments</h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
              {assignments.length} {assignments.length === 1 ? 'Assignment' : 'Assignments'}
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Manage student tasks, deadlines, and submissions for{' '}
            <span className="font-medium text-neutral-700">{courseTitle}</span>.
            Assignments can link to curriculum units or remain course-wide.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setEditingAssignment(null);
            setIsAddModalOpen(true);
          }}
          className="shrink-0"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>New Assignment</span>
        </Button>
      </div>

      {/* Metric Counters Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            Total Tasks
          </span>
          <p className="text-xl font-bold text-neutral-900 mt-1">{assignments.length}</p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
            Submissions
          </span>
          <p className="text-xl font-bold text-emerald-800 mt-1">{totalSubmissions}</p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
            Late Submissions
          </span>
          <p className="text-xl font-bold text-amber-800 mt-1">{totalLate}</p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-2xs">
          <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">
            Pending / Missing
          </span>
          <p className="text-xl font-bold text-rose-800 mt-1">{totalMissing}</p>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 bg-neutral-100/70 border border-neutral-200 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : assignments.length === 0 ? (
        /* Empty State */
        <div className="bg-white border-2 border-dashed border-neutral-200 rounded-2xl p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900">No assignments created</h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
              Create assignments with due dates, maximum marks, and optional links to curriculum lessons.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingAssignment(null);
              setIsAddModalOpen(true);
            }}
          >
            Create First Assignment
          </Button>
        </div>
      ) : (
        /* Assignments List */
        <div className="space-y-3" role="list" aria-label="Course Assignments List">
          {assignments.map((assignment) => {
            const status = getDeadlineStatus(assignment.deadline);

            return (
              <div
                key={assignment.id}
                role="listitem"
                className="bg-white border border-neutral-200 rounded-2xl p-5 hover:border-neutral-300 hover:shadow-xs transition-all space-y-3"
              >
                {/* Header Row: Title, Optional Lesson Badge, Status, Actions */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-neutral-900 truncate">
                        {assignment.title}
                      </h3>

                      {/* Optional Lesson Link Badge */}
                      {assignment.lessonId ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/70">
                          <svg
                            className="w-3 h-3 text-purple-600 shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                            />
                          </svg>
                          <span className="truncate max-w-[200px] sm:max-w-xs">
                            {assignment.lessonTitle || 'Linked Unit'}
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-neutral-600 border border-neutral-200">
                          Course-Wide
                        </span>
                      )}

                      {/* Max Marks Badge */}
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
                        {assignment.maxMarks} pts max
                      </span>
                    </div>

                    {/* Instructions Snippet */}
                    {assignment.instructions && (
                      <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                        {assignment.instructions}
                      </p>
                    )}
                  </div>

                  {/* Actions (Edit / Delete) */}
                  <div className="flex items-center gap-2 self-end sm:self-start shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingAssignment(assignment)}
                      className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors text-xs font-semibold"
                      title="Edit assignment details"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingAssignmentId(assignment.id)}
                      className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors text-xs font-semibold"
                      title="Delete assignment"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Submissions Stats & Deadline Row */}
                <div className="pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  {/* Deadline with Status Badge */}
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500">Deadline:</span>
                    <span className="font-semibold text-neutral-800">
                      {formatDeadlineDate(assignment.deadline)}
                    </span>

                    {status.variant === 'past-due' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        Past Due
                      </span>
                    )}
                    {status.variant === 'due-today' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        Due Today
                      </span>
                    )}
                    {status.variant === 'upcoming' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Upcoming
                      </span>
                    )}
                  </div>

                  {/* Submissions Breakdown Badges & Grade Action */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setGradingAssignment(assignment)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 transition-colors shadow-2xs cursor-pointer"
                      title="Open grading and feedback screen"
                    >
                      <span>Review & Grade</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGradingAssignment(assignment)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-medium bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-700 transition-colors cursor-pointer text-xs"
                      title="View submitted students"
                    >
                      <span className="font-bold text-neutral-900">{assignment.submissionCount}</span>{' '}
                      Submitted
                    </button>

                    {assignment.lateCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setGradingAssignment(assignment)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-medium bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 transition-colors cursor-pointer text-xs"
                        title="View late submissions"
                      >
                        <span className="font-bold text-amber-900">{assignment.lateCount}</span> Late
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setGradingAssignment(assignment)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-medium bg-rose-50/60 hover:bg-rose-100/70 border border-rose-200/70 text-rose-800 transition-colors cursor-pointer text-xs"
                      title="View missing submissions"
                    >
                      <span className="font-bold text-rose-900">{assignment.missingCount}</span> Missing
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assignment Modal (Create / Edit) */}
      <AssignmentModal
        isOpen={isAddModalOpen || editingAssignment !== null}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingAssignment(null);
        }}
        onSave={handleSaveAssignment}
        initialAssignment={editingAssignment}
        lessons={lessons}
      />

      {/* Teacher Grading & Review Modal */}
      <TeacherGradingModal
        isOpen={gradingAssignment !== null}
        onClose={() => setGradingAssignment(null)}
        assignment={gradingAssignment}
        schoolId={schoolId}
        campusId={campusId}
        onGraded={loadData}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deletingAssignmentId !== null}
        onClose={() => setDeletingAssignmentId(null)}
        title="Delete Assignment"
        description="Are you sure you want to remove this assignment? Any student submissions associated with this assignment will no longer be accessible."
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
            <svg
              className="w-4 h-4 shrink-0 text-rose-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>The assignment will be permanently deleted. This action cannot be undone.</span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDeletingAssignmentId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDeleteAssignment}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Delete Assignment
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
