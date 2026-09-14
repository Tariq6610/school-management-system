'use client';

import React, { useState } from 'react';
import { Assignment, Lesson } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    instructions: string;
    deadline: string;
    maxMarks: number;
    lessonId?: string;
    submissionType: 'online' | 'offline';
    courseId?: string;
  }) => Promise<void>;
  initialAssignment?: Assignment | null;
  lessons: Lesson[];
  courses?: { id: string; title: string }[];
}

export function AssignmentModal({
  isOpen,
  onClose,
  onSave,
  initialAssignment,
  lessons,
  courses,
}: AssignmentModalProps) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialAssignment ? 'Edit Assignment' : 'Create New Assignment'}
      description="Define assignment details, submission deadline, maximum marks, and optional syllabus lesson link."
      size="lg"
    >
      <AssignmentForm
        key={initialAssignment?.id ?? 'new-assignment'}
        initialAssignment={initialAssignment}
        lessons={lessons}
        courses={courses}
        onClose={onClose}
        onSave={onSave}
      />
    </Modal>
  );
}

interface AssignmentFormProps {
  initialAssignment?: Assignment | null;
  lessons: Lesson[];
  courses?: { id: string; title: string }[];
  onClose: () => void;
  onSave: (data: {
    title: string;
    instructions: string;
    deadline: string;
    maxMarks: number;
    lessonId?: string;
    submissionType: 'online' | 'offline';
    courseId?: string;
  }) => Promise<void>;
}

function formatDatetimeForInput(isoString?: string): string {
  if (!isoString) {
    // Default to tomorrow at 23:59
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 0, 0);
    const tzOffset = tomorrow.getTimezoneOffset() * 60000;
    return new Date(tomorrow.getTime() - tzOffset).toISOString().slice(0, 16);
  }

  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

function AssignmentForm({
  initialAssignment,
  lessons,
  courses,
  onClose,
  onSave,
}: AssignmentFormProps) {
  const [title, setTitle] = useState(initialAssignment?.title || '');
  const [instructions, setInstructions] = useState(initialAssignment?.instructions || '');
  const [deadline, setDeadline] = useState(formatDatetimeForInput(initialAssignment?.deadline));
  const [maxMarks, setMaxMarks] = useState<number | ''>(initialAssignment?.maxMarks ?? 100);
  const [lessonId, setLessonId] = useState<string>(initialAssignment?.lessonId || '');
  const [submissionType, setSubmissionType] = useState<'online' | 'offline'>(initialAssignment?.submissionType || 'online');
  const [courseId, setCourseId] = useState<string>(initialAssignment?.courseId || (courses?.[0]?.id ?? ''));

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Assignment title is required');
      return;
    }

    if (!deadline || isNaN(Date.parse(deadline))) {
      setError('A valid deadline date and time is required');
      return;
    }

    if (maxMarks === '' || Number(maxMarks) <= 0) {
      setError('Please provide a positive maximum marks value');
      return;
    }

    if (courses && !courseId) {
      setError('Please select a course for this assignment');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        title: title.trim(),
        instructions: instructions.trim(),
        deadline: new Date(deadline).toISOString(),
        maxMarks: Number(maxMarks),
        lessonId: lessonId.trim() || undefined,
        submissionType,
        courseId: courses ? courseId : undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
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
          <span>{error}</span>
        </div>
      )}

      {/* Assignment Title */}
      <div>
        <label className="block text-xs font-semibold text-neutral-800 mb-1">
          Assignment Title <span className="text-rose-600">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Problem Set 2: Kinematics & Free Fall Dynamics"
          className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 transition-colors"
          required
          autoFocus
        />
      </div>

      {/* Course Selection (only if courses provided) */}
      {courses && (
        <div>
          <label className="block text-xs font-semibold text-neutral-800 mb-1">
            Course <span className="text-rose-600">*</span>
          </label>
          <select
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 transition-colors bg-white"
            required
            disabled={!!initialAssignment}
          >
            <option value="">-- Select Course --</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Optional Lesson Link */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-xs font-semibold text-neutral-800">
            Linked Curriculum Lesson <span className="text-neutral-500 font-normal">(Optional)</span>
          </label>
          <span className="text-[11px] text-neutral-500">
            {lessonId ? 'Attached to lesson unit' : 'General course assignment'}
          </span>
        </div>
        <select
          value={lessonId}
          onChange={(e) => setLessonId(e.target.value)}
          className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 transition-colors bg-white"
        >
          <option value="">No linked lesson (Course-wide)</option>
          {lessons.filter(l => !courses || l.courseId === courseId).map((lesson, idx) => (
            <option key={lesson.id} value={lesson.id}>
              Unit {idx + 1}: {lesson.title} ({lesson.contentType.toUpperCase()})
            </option>
          ))}
        </select>
        <p className="text-[11px] text-neutral-500 mt-1.5">
          Attach this task to a specific lesson or leave unlinked as a broad course milestone.
        </p>
      </div>

      {/* Submission Type */}
      <div>
        <label className="block text-xs font-semibold text-neutral-800 mb-1">
          Submission Type <span className="text-rose-600">*</span>
        </label>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
            <input
              type="radio"
              name="submissionType"
              value="online"
              checked={submissionType === 'online'}
              onChange={() => setSubmissionType('online')}
              className="w-4 h-4 text-purple-600 border-neutral-300 focus:ring-purple-600"
            />
            <span>Online Submission (Soft Copy)</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-neutral-700 cursor-pointer">
            <input
              type="radio"
              name="submissionType"
              value="offline"
              checked={submissionType === 'offline'}
              onChange={() => setSubmissionType('offline')}
              className="w-4 h-4 text-purple-600 border-neutral-300 focus:ring-purple-600"
            />
            <span>Offline (Physical Copy / Classwork)</span>
          </label>
        </div>
        <p className="text-[11px] text-neutral-500 mt-1.5">
          Online submissions require students to upload files or text. Offline submissions can be directly graded by the teacher without student uploads.
        </p>
      </div>

      {/* Deadline & Max Marks Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Deadline */}
        <div>
          <label className="block text-xs font-semibold text-neutral-800 mb-1">
            Submission Deadline <span className="text-rose-600">*</span>
          </label>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 transition-colors bg-white font-mono text-xs"
            required
          />
        </div>

        {/* Maximum Marks */}
        <div>
          <label className="block text-xs font-semibold text-neutral-800 mb-1">
            Maximum Marks <span className="text-rose-600">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              min="1"
              max="1000"
              value={maxMarks}
              onChange={(e) =>
                setMaxMarks(e.target.value === '' ? '' : parseInt(e.target.value, 10))
              }
              placeholder="100"
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 transition-colors bg-white font-mono text-xs"
              required
            />
            <span className="absolute right-3.5 top-2.5 text-xs text-neutral-500 pointer-events-none">
              pts
            </span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div>
        <label className="block text-xs font-semibold text-neutral-800 mb-1">
          Instructions & Guidelines
        </label>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={4}
          placeholder="Provide instructions, required deliverables, rubric criteria, or reference links for students..."
          className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 transition-colors bg-white leading-relaxed"
        />
      </div>

      {/* Form Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? 'Saving...'
            : initialAssignment
            ? 'Update Assignment'
            : 'Create Assignment'}
        </Button>
      </div>
    </form>
  );
}
