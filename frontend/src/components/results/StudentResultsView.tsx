'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ID, Scope, Student, User } from '@/types';
import {
  EnrichedPublishedResult,
  listPublishedResultsForStudent,
} from '@/lib/repositories/examResults';
import {
  getStudentReportCard,
  StudentReportCardData,
} from '@/lib/repositories/reportCards';
import { getChildrenForParent } from '@/lib/repositories/parents';
import { getStudent } from '@/lib/repositories/students';
import { getUser } from '@/lib/repositories/users';
import { ReportCardDocument } from './ReportCardDocument';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { useSession } from '@/components/providers/SessionProvider';
import { NavIcon } from '@/components/shell/NavIcon';

export interface StudentResultsViewProps {
  mode: 'parent' | 'student';
  initialStudentId?: ID;
}

export function StudentResultsView({ mode, initialStudentId }: StudentResultsViewProps) {
  const { session } = useSession();
  const schoolId = session?.schoolId ?? 'sch_main';

  // State
  const [children, setChildren] = useState<{ student: Student; user: User }[]>([]);
  const [activeStudentId, setActiveStudentId] = useState<string>(initialStudentId || '');
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [activeUser, setActiveUser] = useState<User | null>(null);

  const [results, setResults] = useState<EnrichedPublishedResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTerm, setSelectedTerm] = useState<string>('all');

  // Report Card Preview Modal State
  const [isReportCardOpen, setIsReportCardOpen] = useState<boolean>(false);
  const [reportCardData, setReportCardData] = useState<StudentReportCardData | null>(null);
  const [loadingReportCard, setLoadingReportCard] = useState<boolean>(false);

  // 1. Resolve Student or Children depending on mode
  useEffect(() => {
    let ignore = false;
    async function resolveActiveStudent() {
      try {
        if (mode === 'parent' && session?.userId) {
          const linked = await getChildrenForParent(session.userId);
          if (ignore) return;
          setChildren(linked);

          const defaultChildId =
            initialStudentId ||
            (linked.some((c) => c.student.id === session.activeChildId)
              ? session.activeChildId
              : linked[0]?.student.id) ||
            '';

          setActiveStudentId(defaultChildId);

          const matched = linked.find((c) => c.student.id === defaultChildId);
          if (matched) {
            setActiveStudent(matched.student);
            setActiveUser(matched.user);
          }
        } else if (mode === 'student' && session?.userId) {
          const st = await getStudent(initialStudentId || session.userId);
          if (ignore) return;
          if (st) {
            setActiveStudent(st);
            setActiveStudentId(st.id);
            const u = await getUser(st.userId);
            if (!ignore && u) setActiveUser(u);
          }
        }
      } catch (err) {
        console.error('Failed to resolve student context for results:', err);
      }
    }

    Promise.resolve().then(() => resolveActiveStudent());
    return () => {
      ignore = true;
    };
  }, [mode, session?.userId, session?.activeChildId, initialStudentId]);

  // 2. Fetch Published Results strictly for the active student
  const fetchPublishedResults = useCallback(async () => {
    if (!activeStudentId) {
      setLoading(false);
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const scope: Scope = { schoolId };
      const published = await listPublishedResultsForStudent(scope, activeStudentId);
      setResults(published);
    } catch (err) {
      console.error('Failed to fetch published results:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [schoolId, activeStudentId]);

  useEffect(() => {
    Promise.resolve().then(() => fetchPublishedResults());
  }, [fetchPublishedResults]);

  // 3. Child selection handler (Parent mode)
  const handleSelectChild = (childId: string) => {
    setActiveStudentId(childId);
    const matched = children.find((c) => c.student.id === childId);
    if (matched) {
      setActiveStudent(matched.student);
      setActiveUser(matched.user);
    }
  };

  // 4. Available terms from published results
  const terms = useMemo(() => {
    const set = new Set<string>();
    results.forEach((r) => {
      if (r.term) set.add(r.term);
    });
    return Array.from(set);
  }, [results]);

  // 5. Filtered results by term
  const filteredResults = useMemo(() => {
    if (selectedTerm === 'all') return results;
    return results.filter((r) => r.term === selectedTerm);
  }, [results, selectedTerm]);

  // 6. Overall Performance KPI summary
  const summary = useMemo(() => {
    if (filteredResults.length === 0) return null;
    const scored = filteredResults.filter((r) => r.percentage !== null);
    if (scored.length === 0) return null;

    const avg = Math.round(
      scored.reduce((sum, r) => sum + (r.percentage ?? 0), 0) / scored.length
    );
    const passCount = scored.filter((r) => (r.percentage ?? 0) >= 50).length;
    const passRate = Math.round((passCount / scored.length) * 100);

    return {
      totalExams: filteredResults.length,
      averagePercentage: avg,
      passRate,
    };
  }, [filteredResults]);

  // 7. Load and Open Report Card preview
  const handleOpenReportCard = async (targetTerm?: string) => {
    if (!activeStudentId) return;
    setLoadingReportCard(true);
    setIsReportCardOpen(true);
    try {
      const scope: Scope = { schoolId };
      const termToLoad = targetTerm || (selectedTerm !== 'all' ? selectedTerm : terms[0] || 'Term 1');
      const data = await getStudentReportCard(scope, activeStudentId, termToLoad);
      setReportCardData(data);
    } catch (err) {
      console.error('Failed to load student report card:', err);
      setReportCardData(null);
    } finally {
      setLoadingReportCard(false);
    }
  };

  const handlePrintModal = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="student-results-container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-ink-100 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary-700 bg-primary-50 px-2 py-0.5 rounded">
              {mode === 'parent' ? 'Parent Portal' : 'Student Portal'}
            </span>
            <span className="text-ink-300">&bull;</span>
            <span className="text-xs text-ink-500 font-medium">Academic Assessment</span>
          </div>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight flex items-center gap-2">
            <NavIcon name="award" className="w-5 h-5" /> Examination Results & Report Cards
          </h1>
          <p className="text-xs text-ink-600 mt-1">
            Official academic assessment scores and downloadable term report cards.
          </p>
        </div>

        {/* View Official Report Card CTA */}
        {results.length > 0 && (
          <Button
            variant="primary"
            size="md"
            onClick={() => handleOpenReportCard()}
            className="shadow-xs font-semibold shrink-0"
            leftIcon={<NavIcon name="file-text" className="w-4 h-4" />}
          >
            View Official Report Card
          </Button>
        )}
      </div>

      {/* Multi-Child Switcher (Parent Mode only) */}
      {mode === 'parent' && children.length > 1 && (
        <div className="bg-surface border border-ink-200 rounded-card p-3 flex flex-wrap items-center gap-3 shadow-xs">
          <span className="text-xs font-bold text-ink-700 uppercase tracking-wider pl-1">
            Select Child:
          </span>
          <div className="flex flex-wrap gap-2">
            {children.map(({ student, user }) => {
              const active = student.id === activeStudentId;
              return (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => handleSelectChild(student.id)}
                  className={`px-3 py-1.5 rounded-control text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? 'bg-primary-700 text-white shadow-xs'
                      : 'bg-ink-100 text-ink-700 hover:bg-ink-200'
                  }`}
                >
                  {user.name} ({student.admissionNumber})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Active Student Profile Banner */}
      {activeUser && activeStudent && (
        <div className="bg-ink-50/70 border border-ink-200 rounded-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-full bg-primary-700 text-white font-bold flex items-center justify-center text-base shadow-xs shrink-0">
              {activeUser.name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')}
            </div>
            <div>
              <h2 className="text-base font-bold text-ink-900">{activeUser.name}</h2>
              <p className="text-xs text-ink-600 font-mono">
                Admission No: {activeStudent.admissionNumber} &bull; Campus:{' '}
                {activeStudent.campusId}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status="published" label="Results Published" size="sm" />
          </div>
        </div>
      )}

      {/* Performance Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="Overall Average"
            value={`${summary.averagePercentage}%`}
            subtitle="Across published assessments"
          />
          <StatCard
            label="Assessments Completed"
            value={summary.totalExams}
            subtitle={selectedTerm === 'all' ? 'All academic terms' : selectedTerm}
          />
          <StatCard
            label="Passing Rate"
            value={`${summary.passRate}%`}
            subtitle="Standard threshold >= 50%"
          />
        </div>
      )}

      {/* Term Filter Tabs */}
      {terms.length > 0 && (
        <div className="flex items-center gap-2 border-b border-ink-200 pb-2">
          <span className="text-xs font-bold text-ink-500 uppercase tracking-wider mr-2">
            Term:
          </span>
          <button
            type="button"
            onClick={() => setSelectedTerm('all')}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
              selectedTerm === 'all'
                ? 'bg-primary-700 text-white'
                : 'bg-ink-100 text-ink-700 hover:bg-ink-200'
            }`}
          >
            All Terms ({results.length})
          </button>
          {terms.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSelectedTerm(t)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                selectedTerm === t
                  ? 'bg-primary-700 text-white'
                  : 'bg-ink-100 text-ink-700 hover:bg-ink-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Published Results Table */}
      <div className="bg-surface border border-ink-200 rounded-card overflow-hidden shadow-xs">
        <div className="p-4 border-b border-ink-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink-900 uppercase tracking-wide">
            Official Examination Marks
          </h2>
          <span className="text-xs text-ink-500">
            Showing {filteredResults.length} published records
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent mb-3" />
            <p className="text-xs text-ink-600 font-medium">Loading published results...</p>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-ink-100 text-ink-400 mx-auto flex items-center justify-center mb-3">
              <NavIcon name="lock" className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-ink-800">
              No Published Results Available
            </h3>
            <p className="text-xs text-ink-500 max-w-md mx-auto mt-1 leading-relaxed">
              Examination marks are strictly invisible until officially reviewed and published
              by the school administration. Once released, verified marks and report cards will
              appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-ink-50 border-b border-ink-200 text-ink-600 font-semibold">
                  <th className="py-3 px-4">Subject & Assessment</th>
                  <th className="py-3 px-3">Term</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3 text-center">Max Marks</th>
                  <th className="py-3 px-3 text-center">Marks Obtained</th>
                  <th className="py-3 px-3 text-center">Percentage</th>
                  <th className="py-3 px-3 text-center">Grade</th>
                  <th className="py-3 px-4">Remarks / Evaluation</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {filteredResults.map((item) => (
                  <tr key={item.id} className="hover:bg-ink-50/50 transition-colors">
                    <td className="py-3 px-4 font-semibold text-ink-900">
                      <div>{item.subjectName}</div>
                      <div className="text-[11px] text-ink-500 font-normal">
                        {item.examName}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-ink-700 font-medium">{item.term}</td>
                    <td className="py-3 px-3 text-ink-500 tabular-nums">{item.examDate}</td>
                    <td className="py-3 px-3 text-center tabular-nums text-ink-700">
                      {item.maxMarks}
                    </td>
                    <td className="py-3 px-3 text-center font-bold tabular-nums text-ink-900">
                      {item.isAbsent ? (
                        <span className="inline-block px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px]">
                          ABS
                        </span>
                      ) : item.marksObtained !== null ? (
                        item.marksObtained
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3 px-3 text-center tabular-nums font-semibold text-ink-800">
                      {item.percentage !== null ? `${item.percentage}%` : '-'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          item.grade === 'A+' || item.grade === 'A'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.grade === 'B' || item.grade === 'C'
                            ? 'bg-blue-100 text-blue-800'
                            : item.grade === 'F'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-ink-100 text-ink-800'
                        }`}
                      >
                        {item.grade || '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-ink-600 text-[11px]">
                      {item.remarks || (item.isPassing ? 'Satisfactory' : 'Needs Improvement')}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <StatusBadge status="published" label="Published" size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Official Student Report Card Document */}
      <Modal
        isOpen={isReportCardOpen}
        onClose={() => setIsReportCardOpen(false)}
        title="Official Student Report Card Preview"
        size="lg"
      >
        <div className="space-y-4">
          <div className="no-print flex items-center justify-between pb-3 border-b border-ink-100">
            <p className="text-xs text-ink-600">
              Verified institutional report card for academic session 2026-2027.
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsReportCardOpen(false)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handlePrintModal}
                leftIcon={<NavIcon name="printer" className="w-4 h-4" />}
              >
                Print Report Card
              </Button>
            </div>
          </div>

          {loadingReportCard ? (
            <div className="p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent mb-2" />
              <p className="text-xs text-ink-500">Generating report card sheet...</p>
            </div>
          ) : !reportCardData ? (
            <div className="p-8 text-center text-xs text-ink-500">
              Unable to generate report card for the requested term. Please verify exam records.
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[75vh] p-2">
              <ReportCardDocument data={reportCardData} isBatchItem={false} />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
