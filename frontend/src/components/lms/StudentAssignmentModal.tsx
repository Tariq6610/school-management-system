'use client';

import React, { useState } from 'react';
import { Assignment, StudentAssignmentDetails } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { submitAssignment } from '@/lib/repositories/submissions';
import { useToast } from '@/components/ui/Toast';

export interface StudentAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: (Assignment | StudentAssignmentDetails) | null;
  studentId: string;
  onSubmitted?: () => void | Promise<void>;
}

function isDeadlineOverdue(deadlineIso: string): boolean {
  return new Date().getTime() > new Date(deadlineIso).getTime();
}

export function StudentAssignmentModal({
  isOpen,
  onClose,
  assignment,
  studentId,
  onSubmitted,
}: StudentAssignmentModalProps) {
  if (!isOpen || !assignment) return null;

  const submissionId =
    'submission' in assignment && assignment.submission
      ? assignment.submission.id
      : 'new';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={assignment.title}
      description={`Maximum marks: ${assignment.maxMarks} pts • Deadline: ${new Date(
        assignment.deadline
      ).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })}`}
      size="lg"
    >
      <StudentAssignmentForm
        key={`${assignment.id}-${studentId}-${submissionId}`}
        assignment={assignment}
        studentId={studentId}
        onClose={onClose}
        onSubmitted={onSubmitted}
      />
    </Modal>
  );
}

interface StudentAssignmentFormProps {
  assignment: Assignment | StudentAssignmentDetails;
  studentId: string;
  onClose: () => void;
  onSubmitted?: () => void | Promise<void>;
}

function StudentAssignmentForm({
  assignment,
  studentId,
  onClose,
  onSubmitted,
}: StudentAssignmentFormProps) {
  const { showToast } = useToast();

  const details = 'submission' in assignment ? (assignment as StudentAssignmentDetails) : null;
  const existingSubmission = details?.submission;

  const [body, setBody] = useState<string>(existingSubmission?.body || '');
  const [fileName, setFileName] = useState<string>(existingSubmission?.fileName || '');
  const [isEditing, setIsEditing] = useState<boolean>(!existingSubmission);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const deadlineMs = new Date(assignment.deadline).getTime();
  const isPastDeadline = isDeadlineOverdue(assignment.deadline);

  const isExistingLate = Boolean(
    existingSubmission?.isLate ||
      (existingSubmission &&
        new Date(existingSubmission.submittedAt).getTime() > deadlineMs)
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!body.trim() && !fileName.trim()) {
      setError('Please provide written solution text or an attached file name.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const submission = await submitAssignment({
        assignmentId: assignment.id,
        studentId,
        body: body.trim() || undefined,
        fileName: fileName.trim() || undefined,
      });

      if (submission.isLate) {
        showToast({
          type: 'info',
          title: 'Submitted (Late)',
          message: 'Your assignment was submitted after the deadline and is flagged as Late.',
        });
      } else {
        showToast({
          type: 'success',
          title: 'Submitted Successfully',
          message: 'Your assignment submission was recorded on time.',
        });
      }

      setIsEditing(false);
      if (onSubmitted) {
        await onSubmitted();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Assignment Meta Banner */}
      <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {/* Optional Lesson Badge */}
            {assignment.lessonId ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                <span>Unit:</span>
                <span>{details?.lessonTitle || 'Curriculum Lesson'}</span>
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-200/60 text-neutral-700 border border-neutral-300">
                Course-Wide Assignment
              </span>
            )}

            {/* Max Marks */}
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-white text-neutral-700 border border-neutral-200">
              {assignment.maxMarks} Marks Total
            </span>
          </div>

          {/* Submission Status Pill */}
          <div>
            {existingSubmission ? (
              isExistingLate ? (
                <span
                  data-testid="badge-submission-late"
                  className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200"
                >
                  LATE SUBMISSION
                </span>
              ) : (
                <span
                  data-testid="badge-submission-ontime"
                  className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200"
                >
                  ON TIME
                </span>
              )
            ) : isPastDeadline ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                PAST DUE
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                DUE SOON
              </span>
            )}
          </div>
        </div>

        {/* Instructions */}
        {assignment.instructions && (
          <div className="text-xs text-neutral-700 space-y-1">
            <span className="font-bold text-neutral-900 block">Instructions:</span>
            <p className="whitespace-pre-line leading-relaxed text-neutral-600">
              {assignment.instructions}
            </p>
          </div>
        )}
      </div>

      {/* Deadline Warning Banner */}
      {isPastDeadline && isEditing && (
        <div
          data-testid="late-deadline-warning"
          className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl flex items-start gap-2.5"
        >
          <span className="text-base leading-none">⚠️</span>
          <div>
            <span className="font-bold block">Past Submission Deadline:</span>
            <span>
              The deadline was on{' '}
              {new Date(assignment.deadline).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
              . Submissions submitted now will be clearly marked as <strong>LATE</strong>.
            </span>
          </div>
        </div>
      )}

      {/* Existing Graded Feedback Banner */}
      {existingSubmission && existingSubmission.marksObtained !== undefined && (
        <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
              Teacher Evaluation
            </span>
            <span className="text-sm font-extrabold text-purple-900 bg-white px-3 py-0.5 rounded-xl border border-purple-200 shadow-2xs font-mono">
              {existingSubmission.marksObtained} / {assignment.maxMarks} pts
            </span>
          </div>
          {existingSubmission.feedback && (
            <p className="text-xs text-purple-800 whitespace-pre-line leading-relaxed">
              &ldquo;{existingSubmission.feedback}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* View Mode (Already Submitted & Not currently editing) */}
      {existingSubmission && !isEditing ? (
        <div className="space-y-4 p-5 rounded-2xl bg-white border border-neutral-200">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-neutral-900">Your Submitted Work</h4>
              <p className="text-[11px] text-neutral-500">
                Submitted on{' '}
                {new Date(existingSubmission.submittedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </p>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="text-xs font-semibold"
            >
              Resubmit Work
            </Button>
          </div>

          {/* Submission Text */}
          {existingSubmission.body ? (
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-neutral-700 block">Written Response:</span>
              <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-800 whitespace-pre-line leading-relaxed font-mono">
                {existingSubmission.body}
              </div>
            </div>
          ) : (
            <p className="text-xs text-neutral-500 italic">No written text provided.</p>
          )}

          {/* Attached File */}
          {existingSubmission.fileName && (
            <div className="space-y-1 pt-1">
              <span className="text-[11px] font-bold text-neutral-700 block">Attached File:</span>
              <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-50 text-purple-800 border border-purple-200 text-xs font-medium">
                <svg className="w-4 h-4 text-purple-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span className="font-mono">{existingSubmission.fileName}</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end pt-3 border-t border-neutral-100">
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      ) : (
        /* Submission Form (New or Resubmission) */
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {existingSubmission && (
            <div className="p-2.5 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-xl flex items-center justify-between">
              <span>Resubmitting will replace your previous answer.</span>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="font-bold underline ml-2 text-blue-900 hover:text-blue-950 text-xs"
              >
                Cancel Resubmission
              </button>
            </div>
          )}

          {/* Written Answer */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-neutral-800">
                Written Response / Solution Text
              </label>
              <span className="text-[11px] text-neutral-500">Rich text / markdown supported</span>
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              placeholder="Type or paste your complete solution, explanations, calculations, or answer notes here..."
              className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 transition-colors bg-white font-mono text-xs leading-relaxed"
            />
          </div>

          {/* File Upload Simulator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-neutral-800">
                Uploaded File Attachment <span className="text-neutral-500 font-normal">(PDF, DOCX, ZIP)</span>
              </label>
              <span className="text-[11px] text-neutral-500">Prototype file placeholder</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="e.g. physics_lab_report_final.pdf"
                className="w-full text-sm px-3.5 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 transition-colors bg-white font-mono text-xs"
              />
              {fileName && (
                <button
                  type="button"
                  onClick={() => setFileName('')}
                  className="px-2 py-2 text-xs text-neutral-500 hover:text-rose-600"
                  title="Clear file"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Simulated file presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-neutral-500">Quick Attach:</span>
              <button
                type="button"
                onClick={() => setFileName('assignment_solution_doc.pdf')}
                className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors border border-neutral-200"
              >
                + solution_doc.pdf
              </button>
              <button
                type="button"
                onClick={() => setFileName('lab_report_worksheet.docx')}
                className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors border border-neutral-200"
              >
                + worksheet.docx
              </button>
              <button
                type="button"
                onClick={() => setFileName('project_archive.zip')}
                className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors border border-neutral-200"
              >
                + project.zip
              </button>
            </div>
          </div>

          {/* Modal Actions */}
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
              className={isPastDeadline ? 'bg-amber-700 hover:bg-amber-800' : undefined}
            >
              {isSubmitting
                ? 'Submitting...'
                : existingSubmission
                ? isPastDeadline
                  ? 'Resubmit (Will be Marked Late)'
                  : 'Resubmit Assignment'
                : isPastDeadline
                ? 'Submit Assignment (Late)'
                : 'Submit Assignment'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
