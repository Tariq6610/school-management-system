'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Campus, Class, Exam, ExamStatus, ID, Scope, Subject } from '@/types';
import {
  deleteExam,
  EnrichedExam,
  listEnrichedExams,
  publishExamResults,
  unpublishExamResults,
} from '@/lib/repositories/exams';
import { listCampuses } from '@/lib/repositories/campuses';
import { listClasses } from '@/lib/repositories/classes';
import { listSubjects } from '@/lib/repositories/subjects';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/ui/Toast';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ExamFormModal } from './ExamFormModal';
import { NavIcon } from '@/components/shell/NavIcon';

export interface ExamsListViewProps {
  initialCampusId?: ID;
  initialExams?: EnrichedExam[];
}

export function ExamsListView({ initialCampusId, initialExams }: ExamsListViewProps) {
  const { session } = useSession();
  const { showToast } = useToast();
  const schoolId = session?.schoolId ?? 'sch_main';

  // Base state
  const [exams, setExams] = useState<EnrichedExam[]>(initialExams || []);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setAllSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState<boolean>(!initialExams);

  // Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCampus, setSelectedCampus] = useState<string>(initialCampusId || '');
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [examToEdit, setExamToEdit] = useState<Exam | null>(null);

  // Load campuses, classes, and subjects on mount
  useEffect(() => {
    let ignore = false;
    async function loadMetadata() {
      try {
        const [campList, clsList, subList] = await Promise.all([
          listCampuses({ schoolId }),
          listClasses({ schoolId }),
          listSubjects({ schoolId }),
        ]);
        if (!ignore) {
          setCampuses(campList);
          setClasses(clsList);
          setAllSubjects(subList);
        }
      } catch (err) {
        console.error('Failed to load exams metadata:', err);
      }
    }

    loadMetadata();
    return () => {
      ignore = true;
    };
  }, [schoolId]);

  // Load enriched exams
  const loadExams = useCallback(async () => {
    setLoading(true);
    try {
      const scope: Scope = {
        schoolId,
        campusId: selectedCampus || undefined,
      };

      const result = await listEnrichedExams(scope, {
        classId: selectedClass || undefined,
        subjectId: selectedSubject || undefined,
        term: selectedTerm || undefined,
        status: (selectedStatus as ExamStatus) || undefined,
        campusId: selectedCampus || undefined,
        search: searchQuery.trim() || undefined,
      });

      setExams(result);
    } catch (err) {
      console.error('Failed to load exams schedule:', err);
      showToast({
        type: 'error',
        title: 'Loading failed',
        message: 'Unable to retrieve exam schedules.',
      });
    } finally {
      setLoading(false);
    }
  }, [
    schoolId,
    selectedCampus,
    selectedClass,
    selectedSubject,
    selectedTerm,
    selectedStatus,
    searchQuery,
    showToast,
  ]);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) loadExams();
    });
    return () => {
      ignore = true;
    };
  }, [loadExams]);

  // Delete exam handler
  const handleDeleteExam = async (exam: EnrichedExam) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete the scheduled exam "${exam.name}" (${exam.term})?`
    );
    if (!confirmed) return;

    try {
      await deleteExam(exam.id);
      showToast({
        type: 'success',
        title: 'Exam deleted',
        message: `Deleted exam "${exam.name}".`,
      });
      setExams((prev) => prev.filter((e) => e.id !== exam.id));
    } catch {
      showToast({
        type: 'error',
        title: 'Delete failed',
        message: 'Could not delete the exam schedule.',
      });
    }
  };

  const handlePublishExam = async (exam: Exam) => {
    const confirmed = window.confirm(
      `Publish results for "${exam.name}"? Published results will become immediately visible to parents and students.`
    );
    if (!confirmed) return;

    try {
      const scope: Scope = { schoolId };
      await publishExamResults(scope, exam.id);
      showToast({
        type: 'success',
        title: 'Results Published',
        message: `Results for "${exam.name}" are now visible to parents and students.`,
      });
      loadExams();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to publish results.';
      showToast({
        type: 'error',
        title: 'Publication Failed',
        message: msg,
      });
    }
  };

  const handleUnpublishExam = async (exam: Exam) => {
    const confirmed = window.confirm(
      `Unpublish results for "${exam.name}"? Results will be retracted and immediately hidden from parents and students.`
    );
    if (!confirmed) return;

    try {
      const scope: Scope = { schoolId };
      await unpublishExamResults(scope, exam.id);
      showToast({
        type: 'info',
        title: 'Results Unpublished',
        message: `Results for "${exam.name}" have been unpublished and hidden from parents.`,
      });
      loadExams();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to unpublish results.';
      showToast({
        type: 'error',
        title: 'Unpublish Failed',
        message: msg,
      });
    }
  };

  // High-level statistics
  const stats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const total = exams.length;
    const upcoming = exams.filter((e) => e.date >= today).length;
    const draft = exams.filter((e) => e.status === 'draft').length;
    const published = exams.filter((e) => e.status === 'published').length;

    return { total, upcoming, draft, published };
  }, [exams]);

  // Filter options
  const campusOptions = [
    { value: '', label: 'All Campuses' },
    ...campuses.map((c) => ({ value: c.id, label: c.name })),
  ];

  const classOptions = [
    { value: '', label: 'All Classes' },
    ...classes.map((c) => ({ value: c.id, label: `${c.grade}-${c.section}` })),
  ];

  const subjectOptions = [
    { value: '', label: 'All Subjects' },
    ...subjects.map((s) => ({ value: s.id, label: `${s.name} (${s.code})` })),
  ];

  const termOptions = [
    { value: '', label: 'All Terms' },
    { value: 'Term 1', label: 'Term 1' },
    { value: 'Midterm', label: 'Midterm' },
    { value: 'Term 2', label: 'Term 2' },
    { value: 'Final Term', label: 'Final Term' },
    { value: 'Monthly Test', label: 'Monthly Test' },
  ];

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'draft', label: 'Draft / Marks Pending' },
    { value: 'marks_entered', label: 'Marks Entered' },
    { value: 'published', label: 'Published' },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
            Examinations & Assessment Schedules
          </h1>
          <p className="text-sm text-neutral-500">
            Schedule and manage academic exams per class and subject, track marks entry, and publish results.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/admin/results/report-cards">
            <Button
              variant="secondary"
              leftIcon={<NavIcon name="file-text" className="w-4 h-4" />}
            >
              Report Cards & Batch Print
            </Button>
          </Link>

          <Button
            variant="primary"
            onClick={() => {
              setExamToEdit(null);
              setIsModalOpen(true);
            }}
            className="shadow-xs"
            leftIcon={<NavIcon name="plus" className="w-4 h-4" />}
          >
            Schedule New Exam
          </Button>
        </div>
      </div>

      {/* 2. StatCards Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Scheduled"
          value={stats.total}
          subtitle="Assessments this academic year"
          icon={<NavIcon name="clipboard-check" className="w-5 h-5" />}
        />
        <StatCard
          label="Upcoming Exams"
          value={stats.upcoming}
          subtitle="Scheduled on or after today"
          icon={<NavIcon name="calendar" className="w-5 h-5" />}
        />
        <StatCard
          label="Marks Pending (Draft)"
          value={stats.draft}
          subtitle="Awaiting teacher scoring"
          icon={<span className="text-xl">⏳</span>}
        />
        <StatCard
          label="Published Results"
          value={stats.published}
          subtitle="Visible on report cards"
          icon={<NavIcon name="award" className="w-5 h-5" />}
        />
      </div>

      {/* 3. Multi-facet Filter Bar */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <Select
            label="Campus"
            options={campusOptions}
            value={selectedCampus}
            onChange={(e) => setSelectedCampus(e.target.value)}
          />
          <Select
            label="Class"
            options={classOptions}
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
          />
          <Select
            label="Subject"
            options={subjectOptions}
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
          />
          <Select
            label="Academic Term"
            options={termOptions}
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
          />
          <Select
            label="Status"
            options={statusOptions}
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          />
          <Input
            label="Search Exam / Term"
            placeholder="e.g. Midterm, Physics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Reset button */}
        {(selectedCampus ||
          selectedClass ||
          selectedSubject ||
          selectedTerm ||
          selectedStatus ||
          searchQuery) && (
          <div className="flex justify-end pt-2 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => {
                setSelectedCampus('');
                setSelectedClass('');
                setSelectedSubject('');
                setSelectedTerm('');
                setSelectedStatus('');
                setSearchQuery('');
              }}
              className="text-xs font-semibold text-purple-700 hover:underline"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* 4. High-density Schedule Table */}
      <div className="rounded-2xl border border-neutral-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-neutral-50 text-neutral-600 border-b border-neutral-200 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Exam Name & Term</th>
                <th className="py-3 px-4">Class & Campus</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Exam Date</th>
                <th className="py-3 px-4 text-center">Max Marks</th>
                <th className="py-3 px-4 text-center">Students</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-neutral-500">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent mb-3" />
                    <p className="text-sm font-medium">Loading examination schedules...</p>
                  </td>
                </tr>
              ) : exams.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-neutral-500">
                    <div className="flex justify-center mb-2 text-neutral-400">
                      <NavIcon name="clipboard" className="w-8 h-8" />
                    </div>
                    <p className="text-base font-semibold text-neutral-800">No Exams Scheduled</p>
                    <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
                      No assessment schedules match your selected filters. Click &quot;Schedule New Exam&quot; to configure one.
                    </p>
                  </td>
                </tr>
              ) : (
                exams.map((exam) => {
                  const today = new Date().toISOString().split('T')[0];
                  const isPast = exam.date < today;
                  const isToday = exam.date === today;

                  return (
                    <tr key={exam.id} className="hover:bg-neutral-50/80 transition-colors">
                      {/* Name & Term */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-neutral-900">{exam.name}</div>
                        <div className="text-xs text-purple-700 font-semibold">{exam.term}</div>
                      </td>

                      {/* Class & Campus */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-neutral-800">
                          {exam.classInfo ? `${exam.classInfo.grade}-${exam.classInfo.section}` : 'N/A'}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {exam.campus?.name || 'Main Campus'}
                        </div>
                      </td>

                      {/* Subject */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-neutral-800">
                          {exam.subject?.name || 'General'}
                        </div>
                        <div className="text-xs font-mono text-neutral-500">
                          {exam.subject?.code || ''}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono text-xs font-semibold text-neutral-900">
                          {exam.date}
                        </div>
                        <span
                          className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            isToday
                              ? 'bg-amber-100 text-amber-800'
                              : isPast
                              ? 'bg-neutral-100 text-neutral-600'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {isToday ? 'Today' : isPast ? 'Completed' : 'Upcoming'}
                        </span>
                      </td>

                      {/* Max Marks */}
                      <td className="py-3 px-4 text-center font-mono font-bold text-xs text-neutral-900">
                        {exam.maxMarks}
                      </td>

                      {/* Eligible Students */}
                      <td className="py-3 px-4 text-center font-mono text-xs text-neutral-600">
                        {exam.eligibleStudentsCount || 0}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        <StatusBadge status={exam.status} />
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/teacher/exams/${exam.id}/marks`}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1.5 rounded-lg border border-purple-200 transition-colors"
                          >
                            <NavIcon name="edit" className="w-3.5 h-3.5" />
                            <span>Marks</span>
                          </Link>
                          {exam.status === 'marks_entered' && (
                            <button
                              type="button"
                              onClick={() => handlePublishExam(exam)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg border border-emerald-200 transition-colors"
                              title="Publish exam results to parents"
                            >
                              <NavIcon name="megaphone" className="w-3.5 h-3.5" />
                              <span>Publish</span>
                            </button>
                          )}
                          {exam.status === 'published' && (
                            <button
                              type="button"
                              onClick={() => handleUnpublishExam(exam)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg border border-amber-200 transition-colors"
                              title="Unpublish exam results (hide from parents)"
                            >
                              <NavIcon name="lock" className="w-3.5 h-3.5" />
                              <span>Unpublish</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setExamToEdit(exam);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors"
                            title="Edit exam details"
                          >
                            <NavIcon name="edit" className="w-4 h-4" />
                          </button>
                          {exam.status === 'draft' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteExam(exam)}
                              className="p-1.5 text-neutral-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete schedule"
                            >
                              <NavIcon name="trash" className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Modal */}
      <ExamFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setExamToEdit(null);
        }}
        examToEdit={examToEdit}
        initialCampusId={selectedCampus || undefined}
        onSaved={() => {
          loadExams();
        }}
      />
    </div>
  );
}
