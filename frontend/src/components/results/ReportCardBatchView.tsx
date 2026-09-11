'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Campus, Class, ID, Scope } from '@/types';
import { listCampuses } from '@/lib/repositories/campuses';
import { listClasses } from '@/lib/repositories/classes';
import {
  ClassReportCardsPayload,
  getClassReportCards,
  StudentReportCardData,
} from '@/lib/repositories/reportCards';
import { ReportCardDocument } from './ReportCardDocument';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { StatCard } from '@/components/ui/StatCard';
import { useSession } from '@/components/providers/SessionProvider';

export interface ReportCardBatchViewProps {
  initialCampusId?: ID;
  initialClassId?: ID;
  initialTerm?: string;
}

export function ReportCardBatchView({
  initialCampusId,
  initialClassId,
  initialTerm,
}: ReportCardBatchViewProps) {
  const { session } = useSession();
  const schoolId = session?.schoolId ?? 'sch_main';

  // Base state
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedCampus, setSelectedCampus] = useState<string>(initialCampusId || '');
  const [selectedClass, setSelectedClass] = useState<string>(initialClassId || '');
  const [selectedTerm, setSelectedTerm] = useState<string>(initialTerm || '');
  const [searchStudentQuery, setSearchStudentQuery] = useState<string>('');
  const [singleStudentFilter, setSingleStudentFilter] = useState<string>('all');

  // Report Card Payload State
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<ClassReportCardsPayload | null>(null);

  // 1. Load Campuses and Classes
  useEffect(() => {
    let ignore = false;
    async function loadMetadata() {
      try {
        const campList = await listCampuses({ schoolId });
        if (ignore) return;
        setCampuses(campList);

        const activeCampusId = selectedCampus || campList[0]?.id || '';
        if (!selectedCampus && activeCampusId) {
          setSelectedCampus(activeCampusId);
        }

        const clsList = await listClasses(
          { schoolId },
          activeCampusId ? { campusId: activeCampusId } : undefined
        );
        if (ignore) return;
        setClasses(clsList);

        if (!selectedClass && clsList.length > 0) {
          setSelectedClass(clsList[0].id);
        }
      } catch (err) {
        console.error('Failed to load initial report cards metadata:', err);
      }
    }

    Promise.resolve().then(() => loadMetadata());
    return () => {
      ignore = true;
    };
  }, [schoolId, selectedCampus, selectedClass]);

  // 2. Load Report Card Data for selected class and term
  const fetchReportCards = useCallback(async () => {
    if (!selectedClass) {
      setLoading(false);
      setPayload(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const scope: Scope = { schoolId, campusId: selectedCampus || undefined };
      const data = await getClassReportCards(
        scope,
        selectedClass,
        selectedTerm || undefined
      );
      setPayload(data);
      if (!selectedTerm && data.term) {
        setSelectedTerm(data.term);
      }
    } catch (err) {
      console.error('Error generating report cards:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to generate class report cards.'
      );
      setPayload(null);
    } finally {
      setLoading(false);
    }
  }, [schoolId, selectedCampus, selectedClass, selectedTerm]);

  useEffect(() => {
    Promise.resolve().then(() => fetchReportCards());
  }, [fetchReportCards]);

  // Filter students based on search or single-student dropdown
  const filteredReportCards = useMemo(() => {
    if (!payload) return [];
    let list = payload.reportCards;

    if (singleStudentFilter && singleStudentFilter !== 'all') {
      list = list.filter((rc) => rc.student.id === singleStudentFilter);
    }

    if (searchStudentQuery.trim()) {
      const q = searchStudentQuery.toLowerCase();
      list = list.filter(
        (rc) =>
          rc.user.name.toLowerCase().includes(q) ||
          rc.student.admissionNumber.toLowerCase().includes(q)
      );
    }

    return list;
  }, [payload, singleStudentFilter, searchStudentQuery]);

  // Handler to print the document
  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  // Class analytics summary
  const summary = useMemo(() => {
    if (!payload || payload.reportCards.length === 0) return null;
    const count = payload.reportCards.length;
    const avgPercentage = Math.round(
      payload.reportCards.reduce((sum, r) => sum + r.overallPercentage, 0) / count
    );
    const passCount = payload.reportCards.filter((r) => r.overallPercentage >= 50).length;
    const passRate = Math.round((passCount / count) * 100);

    return {
      totalStudents: count,
      avgPercentage,
      passRate,
    };
  }, [payload]);

  // Allow custom remarks in memory before printing
  const handleCustomRemarksChange = (studentId: string, newRemarks: string) => {
    if (!payload) return;
    setPayload((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        reportCards: prev.reportCards.map((rc) =>
          rc.student.id === studentId
            ? { ...rc, classTeacherRemarks: newRemarks }
            : rc
        ),
      };
    });
  };

  return (
    <div className="report-cards-container min-h-screen bg-canvas pb-16 print:bg-white print:pb-0">
      {/* Interactive Controls & Header (Hidden in Print View) */}
      <div className="no-print bg-surface border-b border-ink-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Top Bar: Title & Primary Print Action */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href="/admin/exams"
                  className="text-xs font-semibold text-primary-700 hover:text-primary-900 flex items-center gap-1 transition-colors"
                >
                  &larr; Back to Exams Schedule
                </Link>
                <span className="text-ink-300">&bull;</span>
                <span className="text-xs text-ink-500 font-medium">Results & Assessment</span>
              </div>
              <h1 className="text-xl font-bold text-ink-900 tracking-tight flex items-center gap-2">
                <span>📄</span> Report Card Generation & Batch Print
              </h1>
              <p className="text-xs text-ink-600 mt-0.5">
                Produces branded, publication-ready report cards for an entire class cohort in one printable document.
              </p>
            </div>

            {/* Print Buttons */}
            <div className="flex items-center gap-3 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fetchReportCards()}
                disabled={loading}
              >
                ⟳ Refresh Data
              </Button>

              <Button
                variant="primary"
                size="md"
                onClick={handlePrint}
                disabled={loading || !payload || filteredReportCards.length === 0}
                className="gap-2 shadow-sm font-semibold"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                <span>
                  {singleStudentFilter !== 'all'
                    ? 'Print Student Report Card'
                    : `Batch Print Class (${filteredReportCards.length})`}
                </span>
              </Button>
            </div>
          </div>

          {/* Filters Bar: Campus, Class, Term & Student Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-ink-100">
            <Select
              label="Campus"
              value={selectedCampus}
              onChange={(e) => {
                setSelectedCampus(e.target.value);
                setSelectedClass('');
              }}
              options={campuses.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
            />

            <Select
              label="Class & Section"
              value={selectedClass}
              onChange={(e) => {
                setSelectedClass(e.target.value);
                setSingleStudentFilter('all');
              }}
              options={classes.map((c) => ({
                value: c.id,
                label: `Grade ${c.grade} - Section ${c.section}`,
              }))}
            />

            <Select
              label="Examination Term"
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              options={
                payload?.availableTerms.map((t) => ({
                  value: t,
                  label: t,
                })) ?? [{ value: 'Term 1', label: 'Term 1' }]
              }
            />

            <Select
              label="Student View"
              value={singleStudentFilter}
              onChange={(e) => setSingleStudentFilter(e.target.value)}
              options={[
                {
                  value: 'all',
                  label: `Whole Class (${payload?.reportCards.length ?? 0} Students)`,
                },
                ...(payload?.reportCards.map((rc) => ({
                  value: rc.student.id,
                  label: `${rc.user.name} (${rc.student.admissionNumber})`,
                })) ?? []),
              ]}
            />
          </div>

          {/* Search Filter & Print Note */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3 pt-3 border-t border-ink-100/60">
            <div className="w-full sm:w-72">
              <Input
                label=""
                placeholder="Search student by name or admission..."
                value={searchStudentQuery}
                onChange={(e) => setSearchStudentQuery(e.target.value)}
              />
            </div>

            <div className="text-[11px] text-ink-500 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-control flex items-center gap-1.5">
              <span>💡</span>
              <span>
                <strong>Browser Print Tip:</strong> For crisp branded printing, check <em>&ldquo;Background graphics&rdquo;</em> in your browser print options.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Screen Analytics Banner (Screen only) */}
      {summary && (
        <div className="no-print max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Class Enrollment"
              value={`${summary.totalStudents} Students`}
              subtitle={`Grade ${payload?.classObj.grade} - Section ${payload?.classObj.section}`}
            />
            <StatCard
              label="Class Average"
              value={`${summary.avgPercentage}%`}
              subtitle={`Term: ${payload?.term}`}
            />
            <StatCard
              label="Pass Rate"
              value={`${summary.passRate}%`}
              subtitle="Benchmark threshold >= 50%"
            />
          </div>
        </div>
      )}

      {/* Main Content Area: Report Cards / Loading / Error */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 print:m-0 print:p-0 print:max-w-none">
        {loading ? (
          <div className="no-print bg-surface border border-ink-200 rounded-card p-12 text-center my-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent mb-3" />
            <p className="text-sm font-semibold text-ink-900">
              Aggregating academic marks and computing grades...
            </p>
            <p className="text-xs text-ink-500 mt-1">
              Calculating attendance summaries and assembling report card sheets.
            </p>
          </div>
        ) : error ? (
          <div className="no-print bg-rose-50 border border-rose-200 rounded-card p-6 text-center my-8">
            <p className="text-sm font-bold text-rose-800">Error Generating Report Cards</p>
            <p className="text-xs text-rose-600 mt-1">{error}</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fetchReportCards()}
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        ) : !payload || filteredReportCards.length === 0 ? (
          <div className="no-print bg-surface border border-ink-200 rounded-card p-12 text-center my-8">
            <p className="text-sm font-semibold text-ink-800">No Enrolled Students Found</p>
            <p className="text-xs text-ink-500 mt-1">
              Select another class or ensure students are active and enrolled in this cohort.
            </p>
          </div>
        ) : (
          <div className="report-cards-batch-stack space-y-8 print:space-y-0">
            {filteredReportCards.map((reportCard: StudentReportCardData, index: number) => {
              const isLast = index === filteredReportCards.length - 1;
              return (
                <div key={reportCard.student.id} className="relative">
                  {/* Visual Page Break Indicator (Screen only) */}
                  <div className="no-print flex items-center justify-between text-[11px] font-mono text-ink-400 my-4 max-w-4xl mx-auto px-2">
                    <span className="flex items-center gap-1.5">
                      <span>📄 Sheet {index + 1} of {filteredReportCards.length}</span>
                      <span>&bull;</span>
                      <span>{reportCard.user.name}</span>
                    </span>
                    <span>[ A4 Print Page Break ]</span>
                  </div>

                  {/* The Printable Report Card Sheet */}
                  <ReportCardDocument
                    data={reportCard}
                    isBatchItem={!isLast}
                    onRemarksChange={handleCustomRemarksChange}
                  />
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
