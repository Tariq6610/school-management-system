'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Assignment, Scope, TeacherSubmissionEvaluation } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useSession } from '@/components/providers/SessionProvider';
import {
  getAssignmentSubmissionsWithStudents,
  gradeSubmission,
} from '@/lib/repositories/submissions';

export interface TeacherGradingModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: Assignment | null;
  schoolId: string;
  campusId?: string;
  onGraded?: () => void | Promise<void>;
}

type FilterTab = 'all' | 'submitted' | 'graded' | 'missing';

function formatDateTime(isoString?: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function TeacherGradingModal({
  isOpen,
  onClose,
  assignment,
  schoolId,
  campusId,
  onGraded,
}: TeacherGradingModalProps) {
  if (!isOpen || !assignment) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Review & Grade: ${assignment.title}`}
      description={`Max Marks: ${assignment.maxMarks} pts • Deadline: ${formatDateTime(assignment.deadline)}`}
      size="lg"
      className="max-w-4xl"
    >
      <TeacherGradingContent
        key={`${assignment.id}-${schoolId}-${campusId ?? 'default'}`}
        assignment={assignment}
        schoolId={schoolId}
        campusId={campusId}
        onClose={onClose}
        onGraded={onGraded}
      />
    </Modal>
  );
}

export interface TeacherGradingContentProps {
  assignment: Assignment;
  schoolId: string;
  campusId?: string;
  onClose: () => void;
  onGraded?: () => void | Promise<void>;
}

export function TeacherGradingContent({
  assignment,
  schoolId,
  campusId,
  onClose,
  onGraded,
}: TeacherGradingContentProps) {
  const { session } = useSession();
  const { showToast } = useToast();

  const [evaluations, setEvaluations] = useState<TeacherSubmissionEvaluation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const loadEvaluations = useCallback(async () => {
    setIsLoading(true);
    try {
      const scope: Scope = { schoolId, campusId };
      const data = await getAssignmentSubmissionsWithStudents(scope, assignment.id);
      setEvaluations(data);
      if (data.length > 0) {
        setSelectedStudentId((prev) => {
          if (prev && data.some((e) => e.studentId === prev)) {
            return prev;
          }
          const firstWithSub = data.find((e) => e.submission);
          return firstWithSub ? firstWithSub.studentId : data[0].studentId;
        });
      }
    } catch (err) {
      console.error('[TeacherGradingModal] Failed to load submissions:', err);
      showToast({ type: 'error', title: 'Error', message: 'Failed to load assignment submissions' });
    } finally {
      setIsLoading(false);
    }
  }, [assignment.id, schoolId, campusId, showToast]);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) {
        loadEvaluations();
      }
    });
    return () => {
      ignore = true;
    };
  }, [loadEvaluations]);

  // Compute metrics
  const totalCount = evaluations.length;
  const submittedCount = evaluations.filter((e) => e.submission).length;
  const gradedCount = evaluations.filter((e) => e.status === 'graded').length;
  const lateCount = evaluations.filter((e) => e.isLate).length;
  const missingCount = evaluations.filter((e) => e.status === 'pending').length;

  // Filtered list based on active tab
  const filteredEvaluations = evaluations.filter((item) => {
    if (activeTab === 'submitted') return Boolean(item.submission);
    if (activeTab === 'graded') return item.status === 'graded';
    if (activeTab === 'missing') return item.status === 'pending';
    return true;
  });

  const selectedEvaluation = evaluations.find((e) => e.studentId === selectedStudentId);

  const handleSaveGrade = async (
    target: string | { assignmentId: string; studentId: string },
    marks: number,
    feedback: string
  ) => {
    const teacherId = session?.userId || 'usr_teacher';
    try {
      await gradeSubmission(target, marks, feedback, teacherId);
      showToast({
        type: 'success',
        title: 'Grade saved',
        message: 'Marks and feedback saved successfully',
      });
      await loadEvaluations();
      if (onGraded) {
        await onGraded();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save grade';
      showToast({ type: 'error', title: 'Error', message: msg });
      throw err;
    }
  };

  return (
    <div className="space-y-4">
      {/* Metric Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 bg-neutral-50 rounded-2xl border border-neutral-200/80 text-xs">
        <div className="p-2 bg-white rounded-xl border border-neutral-200/60 shadow-xs">
          <span className="text-neutral-500 block">Total Cohort</span>
          <span className="text-base font-bold text-neutral-900">{totalCount}</span>
        </div>
        <div className="p-2 bg-white rounded-xl border border-neutral-200/60 shadow-xs">
          <span className="text-neutral-500 block">Submitted</span>
          <span className="text-base font-bold text-blue-700">{submittedCount}</span>
        </div>
        <div className="p-2 bg-white rounded-xl border border-neutral-200/60 shadow-xs">
          <span className="text-neutral-500 block">Late</span>
          <span className="text-base font-bold text-amber-700">{lateCount}</span>
        </div>
        <div className="p-2 bg-white rounded-xl border border-neutral-200/60 shadow-xs">
          <span className="text-neutral-500 block">Graded</span>
          <span className="text-base font-bold text-emerald-700">{gradedCount}</span>
        </div>
        <div className="p-2 bg-white rounded-xl border border-neutral-200/60 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-neutral-500 block">Missing</span>
          <span className="text-base font-bold text-rose-700">{missingCount}</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 border-b border-neutral-200 pb-2 overflow-x-auto text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'all'
              ? 'bg-neutral-900 text-white'
              : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          All Students ({totalCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('submitted')}
          className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'submitted'
              ? 'bg-neutral-900 text-white'
              : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          Submitted ({submittedCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('graded')}
          className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'graded'
              ? 'bg-neutral-900 text-white'
              : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          Graded ({gradedCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('missing')}
          className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
            activeTab === 'missing'
              ? 'bg-neutral-900 text-white'
              : 'text-neutral-600 hover:bg-neutral-100'
          }`}
        >
          Missing ({missingCount})
        </button>
      </div>

      {/* Main 2-Column Split: Roster & Grading Screen */}
      {isLoading ? (
        <div className="py-16 text-center text-xs text-neutral-500">
          <div className="inline-block w-6 h-6 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin mb-2" />
          <p>Loading submission roster...</p>
        </div>
      ) : evaluations.length === 0 ? (
        <div className="py-12 text-center text-xs text-neutral-500 bg-neutral-50 rounded-2xl border border-neutral-200">
          <p className="font-semibold text-neutral-700">No students enrolled</p>
          <p className="mt-1">No active student cohort was found for this course.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start min-h-[420px]">
          {/* Left Column: Student Roster List */}
          <div className="md:col-span-5 space-y-1.5 max-h-[460px] overflow-y-auto pr-1">
            {filteredEvaluations.length === 0 ? (
              <div className="p-4 text-center text-xs text-neutral-500 bg-neutral-50 rounded-xl border border-neutral-200">
                No students match the selected tab.
              </div>
            ) : (
              filteredEvaluations.map((item) => {
                const isSelected = item.studentId === selectedStudentId;
                return (
                  <button
                    key={item.studentId}
                    type="button"
                    onClick={() => setSelectedStudentId(item.studentId)}
                    className={`w-full text-left p-3 rounded-xl border transition-all text-xs flex flex-col gap-1.5 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 ring-1 ring-blue-600 shadow-xs'
                        : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/70 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-neutral-900 truncate">
                        {item.studentName}
                      </span>
                      {/* Status Badges */}
                      {item.status === 'graded' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                          {item.submission?.marksObtained} / {assignment.maxMarks} pts
                        </span>
                      ) : item.status === 'late' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                          Late
                        </span>
                      ) : item.status === 'submitted' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 shrink-0">
                          Submitted
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-600 border border-neutral-200 shrink-0">
                          Missing
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-neutral-500">
                      <span>
                        Roll: {item.rollNumber || '—'} • Adm: {item.admissionNumber || '—'}
                      </span>
                      {item.submission && (
                        <span className="text-[10px] text-neutral-500">
                          {formatDateTime(item.submission.submittedAt)}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Right Column: Grading Screen for Selected Student */}
          <div className="md:col-span-7 bg-neutral-50 rounded-2xl border border-neutral-200/80 p-4 max-h-[500px] overflow-y-auto">
            {selectedEvaluation ? (
              <StudentEvaluationPane
                key={`${assignment.id}-${selectedEvaluation.studentId}-${selectedEvaluation.submission?.id ?? 'none'}`}
                assignment={assignment}
                evaluation={selectedEvaluation}
                onSave={handleSaveGrade}
              />
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-neutral-500 text-xs">
                <p>Select a student from the list to review and grade.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Footer */}
      <div className="flex items-center justify-end pt-3 border-t border-neutral-200">
        <Button variant="secondary" size="sm" onClick={onClose}>
          Done
        </Button>
      </div>
    </div>
  );
}

interface StudentEvaluationPaneProps {
  assignment: Assignment;
  evaluation: TeacherSubmissionEvaluation;
  onSave: (target: string | { assignmentId: string; studentId: string }, marks: number, feedback: string) => Promise<void>;
}

function StudentEvaluationPane({
  assignment,
  evaluation,
  onSave,
}: StudentEvaluationPaneProps) {
  const submission = evaluation.submission;
  const [marks, setMarks] = useState<string>(
    submission?.marksObtained !== undefined ? String(submission.marksObtained) : ''
  );
  const [feedback, setFeedback] = useState<string>(submission?.feedback ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If student has not submitted (e.g., offline assignment or missing)
  const isMissing = !submission;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const numericMarks = parseFloat(marks);
    if (isNaN(numericMarks) || numericMarks < 0) {
      setErrorMsg('Please enter a valid marks value (0 or greater).');
      return;
    }
    if (numericMarks > assignment.maxMarks) {
      setErrorMsg(`Marks cannot exceed the maximum of ${assignment.maxMarks} points.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const target = submission ? submission.id : { assignmentId: assignment.id, studentId: evaluation.studentId };
      await onSave(target, numericMarks, feedback);
    } catch {
      // Error handled by parent toast
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Student Details & Submission Header */}
      <div className="border-b border-neutral-200/80 pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="font-bold text-neutral-900 text-sm">{evaluation.studentName}</h4>
            <p className="text-[11px] text-neutral-500">
              Roll No: {evaluation.rollNumber || 'N/A'} • Admission: {evaluation.admissionNumber || 'N/A'}
            </p>
          </div>
          {evaluation.isLate ? (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
              Late Submission
            </span>
          ) : submission ? (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              On Time
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-600 border border-neutral-200">
              Missing File
            </span>
          )}
        </div>
        <p className="text-[10px] text-neutral-500 mt-1">
          {submission ? `Submitted on: ${formatDateTime(submission.submittedAt)}` : 'No file submission on record.'}
        </p>
      </div>

      {/* Submission Content Section */}
      <div className="space-y-3">
        <span className="text-xs font-bold text-neutral-700 block uppercase tracking-wider">
          Student Submission Content
        </span>

        {/* Written Response */}
        {submission?.body ? (
          <div className="bg-white p-3.5 rounded-xl border border-neutral-200/80 text-xs text-neutral-800 whitespace-pre-wrap leading-relaxed shadow-2xs max-h-48 overflow-y-auto">
            {submission.body}
          </div>
        ) : null}

        {/* Attached File */}
        {submission?.fileName ? (
          <div className="flex items-center gap-2.5 p-2.5 bg-white rounded-xl border border-neutral-200/80 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-neutral-800 truncate">
                {submission.fileName}
              </p>
              <p className="text-[10px] text-neutral-500">Attached student document</p>
            </div>
            <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
              File Ready
            </span>
          </div>
        ) : null}

        {(!submission || (!submission.body && !submission.fileName)) && (
          <p className="text-xs text-neutral-500 italic">No text or file attachments found.</p>
        )}
      </div>

      {/* Grading Screen: Marks & Feedback Fields */}
      <div className="pt-2 border-t border-neutral-200/80 space-y-3">
        <span className="text-xs font-bold text-neutral-700 block uppercase tracking-wider">
          Evaluation & Grading
        </span>

        {/* Marks Field */}
        <div>
          <label
            htmlFor="teacher-marks-input"
            className="block text-xs font-semibold text-neutral-700 mb-1"
          >
            Marks Awarded <span className="text-neutral-500">(Max: {assignment.maxMarks} pts)</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              id="teacher-marks-input"
              type="number"
              min="0"
              max={assignment.maxMarks}
              step="0.5"
              required
              value={marks}
              onChange={(e) => setMarks(e.target.value)}
              placeholder={`0 - ${assignment.maxMarks}`}
              className="w-32 px-3 py-2 text-xs bg-white rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-neutral-900"
            />
            <span className="text-xs font-medium text-neutral-500">/ {assignment.maxMarks} points</span>
          </div>
        </div>

        {/* Feedback Field */}
        <div>
          <label
            htmlFor="teacher-feedback-input"
            className="block text-xs font-semibold text-neutral-700 mb-1"
          >
            Written Feedback
          </label>
          <textarea
            id="teacher-feedback-input"
            rows={3}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Provide constructive feedback, notes on improvement, or encouragement..."
            className="w-full px-3 py-2 text-xs bg-white rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed text-neutral-800"
          />
        </div>

        {/* Graded Metadata */}
        {submission?.gradedAt && (
          <p className="text-[10px] text-neutral-500 italic">
            Previously graded on {formatDateTime(submission.gradedAt)}. You may update marks and feedback at any time.
          </p>
        )}

        {errorMsg && (
          <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
            {errorMsg}
          </div>
        )}

        {/* Save Grade Button */}
        <div className="pt-2 flex justify-end">
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSubmitting}
            className="px-5 font-bold"
          >
            {isSubmitting ? 'Saving...' : submission?.marksObtained !== undefined ? 'Update Grade & Feedback' : 'Save Grade & Feedback'}
          </Button>
        </div>
      </div>
    </form>
  );
}
