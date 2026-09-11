'use client';

import React, { useState } from 'react';
import { ID } from '@/types';
import {
  StudentLearningProfileData,
  confirmLearningProfileProposal,
  dismissLearningProfileProposal,
  createLearningProfileNote,
  ProposalCategory,
} from '@/lib/repositories/learningProfiles';
import { useSession } from '@/components/providers/SessionProvider';
import { Button } from '@/components/ui/Button';
import { ProposedNoteCard } from './ProposedNoteCard';

export interface LearningProfileViewProps {
  initialData: StudentLearningProfileData;
  userRole?: 'teacher' | 'parent' | 'school_admin' | 'super_admin';
}

export function LearningProfileView({
  initialData,
  userRole = 'teacher',
}: LearningProfileViewProps) {
  const { session } = useSession();
  const [data, setData] = useState<StudentLearningProfileData>(initialData);
  const [activeTab, setActiveTab] = useState<'all' | 'strengths' | 'improvements'>('all');
  const [simulatedRole, setSimulatedRole] = useState<'teacher' | 'parent'>(
    userRole === 'parent' ? 'parent' : 'teacher'
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategory, setNewCategory] = useState<ProposalCategory>('strength');
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const teacherName = session?.role === 'teacher' ? 'Faculty Teacher' : 'Teacher';
  const teacherId = session?.userId || 'usr_teacher';
  const scope = {
    schoolId: data.student.schoolId,
    campusId: data.student.campusId,
  };

  // Handle proposal confirmation
  const handleConfirmProposal = async (proposalId: ID, editedText?: string) => {
    try {
      const updated = await confirmLearningProfileProposal(
        proposalId,
        scope,
        teacherId,
        teacherName,
        editedText
      );

      if (updated) {
        setData((prev) => ({
          ...prev,
          proposals: prev.proposals.map((p) => (p.id === proposalId ? updated : p)),
        }));
        setFeedbackMsg(`✓ Proposal confirmed and published as validated note by ${teacherName}.`);
        setTimeout(() => setFeedbackMsg(null), 4000);
      }
    } catch (err) {
      console.error('Failed to confirm proposal:', err);
    }
  };

  // Handle proposal dismissal
  const handleDismissProposal = async (proposalId: ID) => {
    try {
      const ok = await dismissLearningProfileProposal(proposalId, scope);
      if (ok) {
        setData((prev) => ({
          ...prev,
          proposals: prev.proposals.filter((p) => p.id !== proposalId),
        }));
        setFeedbackMsg('Proposal dismissed and removed from candidate list.');
        setTimeout(() => setFeedbackMsg(null), 4000);
      }
    } catch (err) {
      console.error('Failed to dismiss proposal:', err);
    }
  };

  // Handle custom note creation
  const handleAddCustomNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newText.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await createLearningProfileNote(scope, {
        studentId: data.student.id,
        teacherId,
        teacherName,
        category: newCategory,
        title: newTitle.trim(),
        text: newText.trim(),
      });

      setData((prev) => ({
        ...prev,
        proposals: [created, ...prev.proposals],
      }));
      setShowAddModal(false);
      setNewTitle('');
      setNewText('');
      setFeedbackMsg(`✓ Validated note added and published by ${teacherName}.`);
      setTimeout(() => setFeedbackMsg(null), 4000);
    } catch (err) {
      console.error('Failed to create custom note:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter proposals based on view mode (Teacher vs Parent Preview)
  // Acceptance criteria: Proposals pending until a teacher confirms; no auto-publish.
  const isTeacherView = simulatedRole === 'teacher';
  const visibleProposals = isTeacherView
    ? data.proposals.filter((p) => p.status !== 'dismissed')
    : data.proposals.filter((p) => p.status === 'confirmed');

  const filteredProposals = visibleProposals.filter((p) => {
    if (activeTab === 'strengths') return p.category === 'strength';
    if (activeTab === 'improvements') return p.category === 'improvement';
    return true;
  });

  const pendingCount = data.proposals.filter((p) => p.status === 'pending').length;
  const confirmedCount = data.proposals.filter((p) => p.status === 'confirmed').length;

  return (
    <div className="space-y-6">
      {/* 1. Header & Student Identity Banner */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
                Differentiation Screen 2
              </span>
              <span className="text-xs text-neutral-500 font-medium">
                Student Learning Profile &amp; Teacher Validation
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-neutral-900">
              {data.user.name}
            </h1>
            <p className="text-xs text-neutral-500 mt-1 flex flex-wrap items-center gap-3">
              <span>Class: <strong className="text-neutral-800">{data.classInfo ? `${data.classInfo.grade} (${data.classInfo.section})` : 'Class 6-A'}</strong></span>
              <span>•</span>
              <span>Admission: <strong className="font-mono text-neutral-800">{data.student.admissionNumber}</strong></span>
              <span>•</span>
              <span>Roll No: <strong className="font-mono text-neutral-800">{data.student.rollNumber}</strong></span>
              <span>•</span>
              <span>Campus: <strong className="text-neutral-800">{data.campus?.name || 'Main Campus'}</strong></span>
            </p>
          </div>

          {/* View Mode Switcher (Teacher Validation vs Parent Preview) */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200">
              <button
                type="button"
                onClick={() => setSimulatedRole('teacher')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  simulatedRole === 'teacher'
                    ? 'bg-white text-purple-700 shadow-xs border border-neutral-200'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Teacher Validation
                {pendingCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold">
                    {pendingCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setSimulatedRole('parent')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  simulatedRole === 'parent'
                    ? 'bg-white text-emerald-700 shadow-xs border border-neutral-200'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Parent View (Published Only)
              </button>
            </div>

            {isTeacherView && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowAddModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
              >
                + Add Validated Note
              </Button>
            )}
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold animate-in fade-in">
            {feedbackMsg}
          </div>
        )}
      </div>

      {/* Mode Explanatory Notice */}
      {!isTeacherView && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">👁️</span>
            <span>
              <strong>Parent View Preview:</strong> Showing only confirmed, teacher-validated notes. Unconfirmed proposals sit pending in the teacher portal and are strictly hidden from parents.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSimulatedRole('teacher')}
            className="text-xs font-bold text-emerald-800 underline hover:text-emerald-950 ml-4"
          >
            Switch to Teacher Mode
          </button>
        </div>
      )}

      {/* 2. Three Metric Panels: Subjects Trend, Attendance Trend, Assignment History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section 1: Subject Performance Over Time */}
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Subject Performance Over Time</h3>
              <p className="text-[11px] text-neutral-500">Assessment trajectory across terms</p>
            </div>
            <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
              {data.subjectTrends.length} Subjects
            </span>
          </div>

          <div className="space-y-3.5 divide-y divide-neutral-100">
            {data.subjectTrends.map((st) => (
              <div key={st.subjectId} className="pt-3 first:pt-0">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-bold text-neutral-900">{st.subjectName}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        st.trajectory === 'improving'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : st.trajectory === 'declining'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {st.trajectory === 'improving' ? '↗ Improving' : st.trajectory === 'declining' ? '↘ Declining' : '→ Stable'}
                    </span>
                    <span className="font-mono font-bold text-neutral-900">{st.currentPercentage}%</span>
                  </div>
                </div>

                {/* Progress bar sparkline */}
                <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden flex">
                  <div
                    className={`h-full transition-all ${
                      st.currentPercentage >= 80
                        ? 'bg-emerald-500'
                        : st.currentPercentage >= 60
                        ? 'bg-purple-500'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(10, st.currentPercentage))}%` }}
                  />
                </div>

                {/* Individual assessment points */}
                <div className="flex items-center gap-1 mt-1 text-[10px] text-neutral-500 font-mono">
                  {st.assessments.map((a, idx) => (
                    <span key={a.examId} className="hover:text-neutral-700">
                      {a.term.slice(0, 4)}: {a.percentage}%{idx < st.assessments.length - 1 ? ' → ' : ''}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Attendance Trend for the Year */}
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Attendance Trend for the Year</h3>
              <p className="text-[11px] text-neutral-500">Regularity and semester progression</p>
            </div>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded ${
                data.attendanceTrend.recentTrajectory === 'declining'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {data.attendanceTrend.overallPercentage}% Rate
            </span>
          </div>

          {/* Downward Trend Alert (e.g. for Bilal seed data) */}
          {data.attendanceTrend.recentTrajectory === 'declining' && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <strong className="block font-bold">⚠️ Noticeable Attendance Drop</strong>
              <span>
                Recent attendance rate has declined significantly compared to the start of term. Candidate notes propose targeted guardian follow-up.
              </span>
            </div>
          )}

          <div className="space-y-2">
            <span className="text-xs font-semibold text-neutral-600 block">Monthly Rate Breakdown:</span>
            <div className="space-y-2">
              {data.attendanceTrend.monthlyTrends.map((mt) => (
                <div key={mt.month} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-neutral-600">
                    <span>{mt.label}</span>
                    <span className="font-mono font-bold text-neutral-900">
                      {mt.percentage}% ({mt.present}/{mt.total} days)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        mt.percentage >= 85 ? 'bg-emerald-500' : mt.percentage >= 70 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, mt.percentage))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-neutral-100 text-center text-xs">
            <div className="p-2 bg-neutral-50 rounded-lg">
              <span className="text-neutral-500 block text-[10px]">Present</span>
              <span className="font-mono font-bold text-emerald-700">{data.attendanceTrend.presentCount}</span>
            </div>
            <div className="p-2 bg-neutral-50 rounded-lg">
              <span className="text-neutral-500 block text-[10px]">Absent</span>
              <span className="font-mono font-bold text-rose-700">{data.attendanceTrend.absentCount}</span>
            </div>
            <div className="p-2 bg-neutral-50 rounded-lg">
              <span className="text-neutral-500 block text-[10px]">Late/Leave</span>
              <span className="font-mono font-bold text-amber-700">
                {data.attendanceTrend.lateCount + data.attendanceTrend.leaveCount}
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Assignment Submission History */}
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Assignment Submission History</h3>
              <p className="text-[11px] text-neutral-500">LMS tasks and submission discipline</p>
            </div>
            <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
              {data.assignmentSummary.submittedCount}/{data.assignmentSummary.totalAssigned} Done
            </span>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
              <span className="text-[10px] text-emerald-700 block uppercase font-bold">On Time</span>
              <span className="text-lg font-black text-emerald-800 font-mono">
                {data.assignmentSummary.onTimeCount}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100">
              <span className="text-[10px] text-amber-700 block uppercase font-bold">Late</span>
              <span className="text-lg font-black text-amber-800 font-mono">
                {data.assignmentSummary.lateCount}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-100">
              <span className="text-[10px] text-purple-700 block uppercase font-bold">Pending</span>
              <span className="text-lg font-black text-purple-800 font-mono">
                {data.assignmentSummary.pendingCount}
              </span>
            </div>
          </div>

          {/* Recent Assignment Items */}
          <div className="space-y-2 mt-3">
            <span className="text-xs font-semibold text-neutral-600 block">Coursework Tasks:</span>
            {data.assignmentSummary.items.length === 0 ? (
              <p className="text-xs text-neutral-500 py-3 text-center">No assignments recorded.</p>
            ) : (
              <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                {data.assignmentSummary.items.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-lg border border-neutral-100 bg-neutral-50/50 flex items-center justify-between text-xs"
                  >
                    <div>
                      <p className="font-semibold text-neutral-900 truncate max-w-[150px]">{item.title}</p>
                      <p className="text-[10px] text-neutral-500">Due: {item.dueDate}</p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        item.status === 'on_time' || item.status === 'graded'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.status === 'late'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {item.status === 'graded'
                        ? 'Graded'
                        : item.status === 'on_time'
                        ? 'On Time'
                        : item.status === 'late'
                        ? 'Late'
                        : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Section 4: Strengths and Areas for Improvement (Teacher Validation Workflow) */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-neutral-100">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">
              Strengths &amp; Areas for Improvement
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              {isTeacherView
                ? 'System synthesizes candidate notes from exam performance, attendance trends, and LMS tasks. Each proposal sits in a pending state until confirmed, edited, or dismissed by a teacher.'
                : 'Verified educational strengths and growth recommendations validated by faculty teachers.'}
            </p>
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-neutral-100 rounded-xl border border-neutral-200">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                activeTab === 'all' ? 'bg-white text-purple-700 shadow-xs' : 'text-neutral-600'
              }`}
            >
              All ({visibleProposals.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('strengths')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                activeTab === 'strengths' ? 'bg-white text-emerald-700 shadow-xs' : 'text-neutral-600'
              }`}
            >
              Strengths
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('improvements')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                activeTab === 'improvements' ? 'bg-white text-amber-700 shadow-xs' : 'text-neutral-600'
              }`}
            >
              Growth Areas
            </button>
          </div>
        </div>

        {/* Informational Guidance on Teacher Validation */}
        {isTeacherView && pendingCount > 0 && (
          <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 text-xs text-purple-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="font-bold block">
                📝 {pendingCount} candidate proposal{pendingCount > 1 ? 's' : ''} awaiting your validation
              </span>
              <p className="text-purple-800 text-[11px]">
                Acceptance Rule: Proposals sit pending until a teacher confirms; no auto-publish. Confirming will attribute your name ({teacherName}) and publish to the parent portal.
              </p>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px] text-purple-700">
              <span>{confirmedCount} Confirmed</span>
              <span>•</span>
              <span>{pendingCount} Pending</span>
            </div>
          </div>
        )}

        {/* Proposals List */}
        {filteredProposals.length === 0 ? (
          <div className="py-12 text-center text-neutral-500 bg-neutral-50/50 rounded-2xl border border-dashed border-neutral-200">
            <span className="text-3xl block mb-2">📋</span>
            <p className="text-sm font-semibold text-neutral-700">No notes in this category</p>
            <p className="text-xs text-neutral-500 mt-1">
              {!isTeacherView
                ? 'Teacher validation is currently in progress. Confirmed notes will appear here.'
                : 'All proposals have been validated or dismissed.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProposals.map((proposal) => (
              <ProposedNoteCard
                key={proposal.id}
                proposal={proposal}
                isTeacherView={isTeacherView}
                onConfirm={handleConfirmProposal}
                onDismiss={handleDismissProposal}
              />
            ))}
          </div>
        )}
      </div>

      {/* 4. Add Custom Validated Note Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 max-w-lg w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-base font-bold text-neutral-900">
                Author Validated Learning Note
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-neutral-500 hover:text-neutral-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustomNote} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">
                  Category
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewCategory('strength')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      newCategory === 'strength'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-white border-neutral-200 text-neutral-600'
                    }`}
                  >
                    ★ Academic Strength
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCategory('improvement')}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                      newCategory === 'improvement'
                        ? 'bg-amber-50 border-amber-300 text-amber-800'
                        : 'bg-white border-neutral-200 text-neutral-600'
                    }`}
                  >
                    ▲ Area for Improvement
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">
                  Title / Subject Area
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Critical Thinking in Literature"
                  required
                  className="w-full rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">
                  Teacher Observation / Feedback
                </label>
                <textarea
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  rows={4}
                  placeholder="Provide constructive feedback for student and parents..."
                  required
                  className="w-full rounded-xl border border-neutral-200 p-3 text-sm text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  type="button"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                  disabled={isSubmitting || !newTitle.trim() || !newText.trim()}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isSubmitting ? 'Publishing...' : 'Validate & Publish'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
