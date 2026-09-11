'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import { GradeScaleItem, ID, Scope } from '@/types';
import {
  ExamMarksGridData,
  getExamMarksGridData,
  MarksEntryItem,
  saveExamMarksEntry,
  StudentMarksEntryRow,
} from '@/lib/repositories/examResults';
import { getSettings } from '@/lib/repositories/settings';
import { calculateGrade } from '@/lib/utils/grading';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/ui/Toast';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export interface MarksEntryGridProps {
  examId: ID;
  initialData?: ExamMarksGridData;
  onSaved?: () => void;
}

interface StudentRowState {
  marksObtainedStr: string;
  remarks: string;
  isAbsent: boolean;
  isOverMax: boolean;
  errorMessage?: string;
}

export function MarksEntryGrid({ examId, initialData, onSaved }: MarksEntryGridProps) {
  const { session } = useSession();
  const { showToast } = useToast();
  const schoolId = session?.schoolId ?? 'sch_main';

  // Data & loading state
  const [data, setData] = useState<ExamMarksGridData | null>(initialData || null);
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [gradingScale, setGradingScale] = useState<GradeScaleItem[]>([]);

  // Search filter
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Row input states: key = studentId
  const [rowStates, setRowStates] = useState<Record<ID, StudentRowState>>(() => {
    if (!initialData) return {};
    const initial: Record<ID, StudentRowState> = {};
    for (const r of initialData.rows) {
      initial[r.studentId] = {
        marksObtainedStr: r.marksObtained !== null && r.marksObtained !== undefined ? String(r.marksObtained) : '',
        remarks: r.remarks || '',
        isAbsent: r.isAbsent || false,
        isOverMax: false,
      };
    }
    return initial;
  });

  // Autosave and feedback state
  const [autosaveStatus, setAutosaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Active focused row index for keyboard tracking
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Load initial data and grading scale if not passed
  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const scope: Scope = { schoolId };
        const [gridData, settings] = await Promise.all([
          initialData ? Promise.resolve(initialData) : getExamMarksGridData(scope, examId),
          getSettings(scope),
        ]);

        if (!ignore) {
          if (settings.gradingScale) {
            setGradingScale(settings.gradingScale);
          }

          if (gridData) {
            setData(gridData);
            // Initialize row states if not already initialized
            setRowStates((prev) => {
              const updated = { ...prev };
              for (const r of gridData.rows) {
                if (!updated[r.studentId]) {
                  updated[r.studentId] = {
                    marksObtainedStr:
                      r.marksObtained !== null && r.marksObtained !== undefined ? String(r.marksObtained) : '',
                    remarks: r.remarks || '',
                    isAbsent: r.isAbsent || false,
                    isOverMax: false,
                  };
                }
              }
              return updated;
            });
          }
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Failed to load marks grid data:', err);
          setGlobalError('Failed to load exam marks grid.');
          setLoading(false);
        }
      }
    }

    // Deferred execution to satisfy React 19 set-state-in-effect rules
    Promise.resolve().then(() => {
      if (!ignore) {
        load();
      }
    });

    return () => {
      ignore = true;
    };
  }, [examId, initialData, schoolId]);

  // Filtered rows
  const visibleRows: StudentMarksEntryRow[] = useMemo(() => {
    if (!data) return [];
    if (!searchQuery.trim()) return data.rows;
    const q = searchQuery.toLowerCase().trim();
    return data.rows.filter(
      (r) =>
        r.studentName.toLowerCase().includes(q) ||
        r.rollNumber.toLowerCase().includes(q) ||
        r.admissionNumber.toLowerCase().includes(q)
    );
  }, [data, searchQuery]);

  // Aggregate statistics computed in real-time
  const stats = useMemo(() => {
    if (!data) {
      return {
        total: 0,
        entered: 0,
        absent: 0,
        averagePct: 0,
        highest: 0,
        lowest: 0,
        passingPct: 0,
        gradeCounts: {} as Record<string, number>,
      };
    }

    const total = data.rows.length;
    let entered = 0;
    let absent = 0;
    let sumMarks = 0;
    let highest = 0;
    let lowest = data.maxMarks;
    let passingCount = 0;
    const gradeCounts: Record<string, number> = {};

    for (const r of data.rows) {
      const st = rowStates[r.studentId];
      if (!st) continue;

      if (st.isAbsent) {
        absent++;
        continue;
      }

      if (st.marksObtainedStr.trim() !== '' && !st.isOverMax) {
        const val = parseFloat(st.marksObtainedStr);
        if (!isNaN(val)) {
          entered++;
          sumMarks += val;
          if (val > highest) highest = val;
          if (val < lowest) lowest = val;

          const gr = calculateGrade(val, data.maxMarks, gradingScale);
          gradeCounts[gr.grade] = (gradeCounts[gr.grade] || 0) + 1;
          if (gr.isPassing) passingCount++;
        }
      }
    }

    const averagePct = entered > 0 && data.maxMarks > 0
      ? Math.round(((sumMarks / (entered * data.maxMarks)) * 100) * 10) / 10
      : 0;
    const passingPct = entered > 0 ? Math.round((passingCount / entered) * 100) : 0;

    return {
      total,
      entered,
      absent,
      averagePct,
      highest: entered > 0 ? highest : 0,
      lowest: entered > 0 ? lowest : 0,
      passingPct,
      gradeCounts,
    };
  }, [data, rowStates, gradingScale]);

  // Direct single mark change handler with INLINE REJECTION OF OVER-MAX
  const handleMarkChange = useCallback(
    (studentId: ID, rawVal: string) => {
      if (!data) return;

      const maxMarks = data.maxMarks;
      let isOverMax = false;
      let errorMessage: string | undefined = undefined;

      // Inline validation
      if (rawVal.trim() !== '') {
        const num = parseFloat(rawVal);
        if (isNaN(num)) {
          isOverMax = true;
          errorMessage = 'Invalid number';
        } else if (num > maxMarks) {
          isOverMax = true;
          errorMessage = `Exceeds max (${maxMarks})`;
        } else if (num < 0) {
          isOverMax = true;
          errorMessage = 'Cannot be negative';
        }
      }

      setRowStates((prev) => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          marksObtainedStr: rawVal,
          isAbsent: false,
          isOverMax,
          errorMessage,
        },
      }));

      setHasUnsavedChanges(true);
      if (isOverMax) {
        setAutosaveStatus('error');
      } else {
        setAutosaveStatus('unsaved');
      }
    },
    [data]
  );

  // Toggle absent state
  const handleToggleAbsent = useCallback((studentId: ID) => {
    setRowStates((prev) => {
      const curr = prev[studentId] || { marksObtainedStr: '', remarks: '', isAbsent: false, isOverMax: false };
      const nextAbsent = !curr.isAbsent;
      return {
        ...prev,
        [studentId]: {
          ...curr,
          isAbsent: nextAbsent,
          marksObtainedStr: nextAbsent ? '' : curr.marksObtainedStr,
          remarks: nextAbsent ? 'Absent' : '',
          isOverMax: false,
          errorMessage: undefined,
        },
      };
    });
    setHasUnsavedChanges(true);
    setAutosaveStatus('unsaved');
  }, []);

  // Update remarks
  const handleRemarksChange = useCallback((studentId: ID, remarks: string) => {
    setRowStates((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        remarks,
      },
    }));
    setHasUnsavedChanges(true);
    setAutosaveStatus('unsaved');
  }, []);

  // Save changes implementation
  const performSave = useCallback(
    async (markAsEntered = false) => {
      if (!data) return;

      // Check if any row has over-max marks
      const hasAnyOverMax = Object.values(rowStates).some((r) => r.isOverMax);
      if (hasAnyOverMax) {
        setAutosaveStatus('error');
        showToast({
          type: 'error',
          title: 'Cannot save draft',
          message: 'One or more marks exceed maximum marks. Please correct inline errors.',
        });
        return;
      }

      try {
        setAutosaveStatus('saving');
        const entries: MarksEntryItem[] = data.rows.map((r) => {
          const st = rowStates[r.studentId];
          const hasVal = st && st.marksObtainedStr.trim() !== '' && !st.isOverMax;
          const marksObtained = hasVal ? parseFloat(st.marksObtainedStr) : null;
          return {
            studentId: r.studentId,
            marksObtained: st?.isAbsent ? null : marksObtained,
            remarks: st?.isAbsent ? 'Absent' : st?.remarks || undefined,
          };
        });

        const scope: Scope = { schoolId };
        const result = await saveExamMarksEntry(scope, examId, entries, markAsEntered);

        if (result.errors.length > 0) {
          setAutosaveStatus('error');
          showToast({
            type: 'error',
            title: 'Inline validation error',
            message: result.errors[0].error,
          });
          return;
        }

        setAutosaveStatus('saved');
        setHasUnsavedChanges(false);
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastSavedAt(timeStr);

        if (markAsEntered) {
          setData((prev) => (prev ? { ...prev, exam: { ...prev.exam, status: 'marks_entered' } } : null));
          showToast({
            type: 'success',
            title: 'Marks Entered',
            message: 'All marks have been successfully verified and saved.',
          });
        }

        onSaved?.();
      } catch (err) {
        console.error('Failed to autosave exam marks:', err);
        setAutosaveStatus('error');
      }
    },
    [data, rowStates, schoolId, examId, showToast, onSaved]
  );

  // Debounced Autosave (triggers 800ms after last typing activity)
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    // If there's an over-max error, do not autosave until resolved
    const hasAnyOverMax = Object.values(rowStates).some((r) => r.isOverMax);
    if (hasAnyOverMax) {
      return;
    }

    const timer = setTimeout(() => {
      performSave(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [hasUnsavedChanges, rowStates, performSave]);

  // Keyboard navigation handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, currentIndex: number, studentId: ID) => {
      const maxIndex = visibleRows.length - 1;

      // Enter key OR ArrowDown: move to next student and select all text
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = Math.min(currentIndex + 1, maxIndex);
        setFocusedIndex(nextIndex);
        const targetInput = inputRefs.current[nextIndex];
        if (targetInput) {
          targetInput.focus();
          targetInput.select();
        }
        return;
      }

      // ArrowUp: move to previous student and select all text
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = Math.max(currentIndex - 1, 0);
        setFocusedIndex(prevIndex);
        const targetInput = inputRefs.current[prevIndex];
        if (targetInput) {
          targetInput.focus();
          targetInput.select();
        }
        return;
      }

      // Shortcut 'a' or 'A': toggle Absent when input is empty, and advance to next student
      if (
        (e.key === 'a' || e.key === 'A') &&
        (e.currentTarget.value === '' || e.currentTarget.value === 'a' || e.currentTarget.value === 'A')
      ) {
        e.preventDefault();
        handleToggleAbsent(studentId);
        const nextIndex = Math.min(currentIndex + 1, maxIndex);
        setFocusedIndex(nextIndex);
        const targetInput = inputRefs.current[nextIndex];
        if (targetInput) {
          targetInput.focus();
          targetInput.select();
        }
        return;
      }

      // Ctrl+S / Cmd+S: manual save
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        performSave(false);
      }
    },
    [visibleRows.length, handleToggleAbsent, performSave]
  );

  // Demo tool: Fill sample marks
  const handleFillSampleMarks = useCallback(() => {
    if (!data) return;
    const max = data.maxMarks;
    setRowStates((prev) => {
      const updated = { ...prev };
      data.rows.forEach((r, idx) => {
        // Generate a distribution between 55% and 95%
        const score = Math.round(max * (0.55 + ((idx * 7) % 40) / 100));
        updated[r.studentId] = {
          marksObtainedStr: String(score),
          remarks: score >= max * 0.8 ? 'Well done' : 'Needs practice',
          isAbsent: false,
          isOverMax: false,
          errorMessage: undefined,
        };
      });
      return updated;
    });
    setHasUnsavedChanges(true);
    setAutosaveStatus('unsaved');
    showToast({
      type: 'info',
      title: 'Sample marks populated',
      message: `Generated sample scores for ${data.rows.length} students.`,
    });
  }, [data, showToast]);

  // Mark all unentered as absent
  const handleMarkRemainingAbsent = useCallback(() => {
    if (!data) return;
    let count = 0;
    setRowStates((prev) => {
      const updated = { ...prev };
      data.rows.forEach((r) => {
        const curr = updated[r.studentId];
        if (!curr || (!curr.marksObtainedStr && !curr.isAbsent)) {
          updated[r.studentId] = {
            marksObtainedStr: '',
            remarks: 'Absent',
            isAbsent: true,
            isOverMax: false,
            errorMessage: undefined,
          };
          count++;
        }
      });
      return updated;
    });
    if (count > 0) {
      setHasUnsavedChanges(true);
      setAutosaveStatus('unsaved');
      showToast({
        type: 'info',
        title: 'Marked absent',
        message: `${count} unentered student(s) marked absent.`,
      });
    }
  }, [data, showToast]);

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 bg-neutral-200 rounded w-1/3" />
        <div className="h-24 bg-neutral-100 rounded-xl" />
        <div className="h-96 bg-neutral-100 rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200">
          <h2 className="font-bold text-lg">Exam Not Found</h2>
          <p className="text-sm mt-1">{globalError || 'The requested exam schedule does not exist or has been removed.'}</p>
        </div>
        <Link href="/admin/exams" className="inline-block text-sm font-medium text-purple-700 hover:underline">
          ← Back to Exams Schedule
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-neutral-200">
        <div className="flex items-center gap-2 text-sm text-neutral-600">
          <Link href="/admin/exams" className="hover:text-neutral-900 transition-colors">
            Exams
          </Link>
          <span className="text-neutral-400">/</span>
          <span className="font-semibold text-neutral-900">{data.exam.name}</span>
          <span className="text-neutral-400">/</span>
          <span className="text-neutral-500">Marks Entry</span>
        </div>

        {/* Autosave State Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {autosaveStatus === 'saving' && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                Autosaving draft...
              </span>
            )}
            {autosaveStatus === 'saved' && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Draft saved {lastSavedAt ? `at ${lastSavedAt}` : ''}
              </span>
            )}
            {autosaveStatus === 'unsaved' && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-800 bg-amber-100/70 border border-amber-300 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                Unsaved changes
              </span>
            )}
            {autosaveStatus === 'error' && (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                Over-max mark rejected inline
              </span>
            )}
          </div>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => performSave(false)}
            disabled={autosaveStatus === 'saving'}
            title="Save draft (Ctrl+S)"
          >
            Save Draft
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={() => performSave(true)}
            disabled={autosaveStatus === 'saving' || Object.values(rowStates).some((r) => r.isOverMax)}
          >
            Finalize Marks
          </Button>
        </div>
      </div>

      {/* Header Banner with Exam Details */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs flex flex-wrap items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
              {data.exam.name}
            </h1>
            <StatusBadge status={data.exam.status} size="sm" />
          </div>
          <p className="text-sm text-neutral-600 flex flex-wrap items-center gap-2">
            <span className="font-semibold text-neutral-800">{data.classInfo.grade} - {data.classInfo.section}</span>
            <span>•</span>
            <span className="font-semibold text-neutral-800">{data.subject.name}</span>
            <span>•</span>
            <span>Term: <strong className="text-neutral-700">{data.exam.term}</strong></span>
            <span>•</span>
            <span>Date: <strong className="text-neutral-700">{data.exam.date}</strong></span>
          </p>
        </div>

        {/* Maximum Marks Badge */}
        <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 text-center">
          <span className="block text-xs font-bold uppercase tracking-wider text-purple-700">
            Maximum Marks
          </span>
          <span className="text-2xl font-mono font-bold text-purple-900">
            {data.maxMarks}
          </span>
        </div>
      </div>

      {/* Real-time Metrics & Grade Distribution Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white border border-neutral-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-xs text-neutral-500 font-medium block">Total Roster</span>
          <span className="text-xl font-bold text-neutral-900 font-mono mt-0.5 block">
            {stats.total}
          </span>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-xs text-neutral-500 font-medium block">Marks Entered</span>
          <span className="text-xl font-bold text-emerald-700 font-mono mt-0.5 block">
            {stats.entered} <span className="text-xs font-normal text-neutral-400">/ {stats.total}</span>
          </span>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-xs text-neutral-500 font-medium block">Absent</span>
          <span className="text-xl font-bold text-amber-700 font-mono mt-0.5 block">
            {stats.absent}
          </span>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-xs text-neutral-500 font-medium block">Class Average</span>
          <span className="text-xl font-bold text-neutral-900 font-mono mt-0.5 block">
            {stats.averagePct}%
          </span>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-xs text-neutral-500 font-medium block">Highest Score</span>
          <span className="text-xl font-bold text-indigo-700 font-mono mt-0.5 block">
            {stats.highest} <span className="text-xs font-normal text-neutral-400">/ {data.maxMarks}</span>
          </span>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-3.5 shadow-xs">
          <span className="text-xs text-neutral-500 font-medium block">Passing Rate</span>
          <span className="text-xl font-bold text-teal-700 font-mono mt-0.5 block">
            {stats.passingPct}%
          </span>
        </div>
      </div>

      {/* Grade Distribution Pills */}
      {Object.keys(stats.gradeCounts).length > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-xs">
          <span className="font-semibold text-neutral-700 mr-2">Grade Breakdown:</span>
          {Object.entries(stats.gradeCounts).map(([grade, count]) => (
            <span
              key={grade}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-neutral-200 rounded-md font-mono font-medium text-neutral-800 shadow-2xs"
            >
              <strong className="text-purple-700">{grade}</strong>: {count}
            </span>
          ))}
        </div>
      )}

      {/* Keyboard Shortcuts & Operational Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-neutral-50 border border-neutral-200 p-3 rounded-xl text-xs">
        <div className="flex flex-wrap items-center gap-3 text-neutral-600">
          <span className="font-semibold text-neutral-900">⌨️ Keyboard Navigation:</span>
          <span><kbd className="px-1.5 py-0.5 bg-white border border-neutral-300 rounded text-neutral-800 font-mono font-bold">Enter</kbd> or <kbd className="px-1.5 py-0.5 bg-white border border-neutral-300 rounded text-neutral-800 font-mono font-bold">↓</kbd> Next student</span>
          <span><kbd className="px-1.5 py-0.5 bg-white border border-neutral-300 rounded text-neutral-800 font-mono font-bold">↑</kbd> Previous student</span>
          <span><kbd className="px-1.5 py-0.5 bg-white border border-neutral-300 rounded text-neutral-800 font-mono font-bold">A</kbd> Mark Absent</span>
          <span><kbd className="px-1.5 py-0.5 bg-white border border-neutral-300 rounded text-neutral-800 font-mono font-bold">Ctrl+S</kbd> Save draft</span>
        </div>

        {/* Fast Action Aids */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleMarkRemainingAbsent}
            className="px-2.5 py-1 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 hover:bg-neutral-100 rounded-md transition-colors"
          >
            Mark Unentered as Absent
          </button>
          <button
            type="button"
            onClick={handleFillSampleMarks}
            className="px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 hover:bg-purple-100 rounded-md transition-colors"
          >
            ✨ Fill Demo Scores
          </button>
        </div>
      </div>

      {/* Search Filter Bar */}
      <div className="w-full sm:w-72">
        <Input
          label="Search Roster"
          placeholder="Search student or roll number..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Marks Entry Grid Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-neutral-50/80 border-b border-neutral-200 text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4 w-24">Roll No</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4 w-32">Admission No</th>
                <th className="py-3 px-4 w-44 text-center">
                  Marks Obtained <span className="text-neutral-400 font-normal">/ {data.maxMarks}</span>
                </th>
                <th className="py-3 px-4 w-24 text-center">Percentage</th>
                <th className="py-3 px-4 w-20 text-center">Grade</th>
                <th className="py-3 px-4">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-neutral-500">
                    No students match the current search filter.
                  </td>
                </tr>
              ) : (
                visibleRows.map((row, index) => {
                  const state = rowStates[row.studentId] || {
                    marksObtainedStr: '',
                    remarks: '',
                    isAbsent: false,
                    isOverMax: false,
                  };

                  const numVal = parseFloat(state.marksObtainedStr);
                  const hasValidMark = !state.isAbsent && !isNaN(numVal) && !state.isOverMax;
                  const pct = hasValidMark && data.maxMarks > 0 ? ((numVal / data.maxMarks) * 100).toFixed(1) : null;
                  const gradeObj = hasValidMark ? calculateGrade(numVal, data.maxMarks, gradingScale) : null;

                  return (
                    <tr
                      key={row.studentId}
                      className={`hover:bg-neutral-50/60 transition-colors ${
                        focusedIndex === index ? 'bg-purple-50/30' : ''
                      } ${state.isOverMax ? 'bg-red-50/40' : ''}`}
                    >
                      {/* Row Index */}
                      <td className="py-2.5 px-4 text-center text-xs font-mono text-neutral-400">
                        {index + 1}
                      </td>

                      {/* Roll Number */}
                      <td className="py-2.5 px-4 font-mono font-semibold text-neutral-900">
                        {row.rollNumber || '—'}
                      </td>

                      {/* Student Name */}
                      <td className="py-2.5 px-4 font-medium text-neutral-900">
                        <div className="flex items-center gap-2">
                          <span>{row.studentName}</span>
                          {state.isAbsent && (
                            <span className="text-2xs uppercase font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                              Absent
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Admission Number */}
                      <td className="py-2.5 px-4 text-xs font-mono text-neutral-500">
                        {row.admissionNumber || '—'}
                      </td>

                      {/* Keyboard-driven Marks Input Cell with Inline Over-Max Rejection */}
                      <td className="py-2 px-4 text-center">
                        <div className="relative inline-block w-full max-w-[140px]">
                          <input
                            ref={(el) => {
                              inputRefs.current[index] = el;
                            }}
                            type="text"
                            inputMode="decimal"
                            value={state.isAbsent ? 'ABSENT' : state.marksObtainedStr}
                            onChange={(e) => handleMarkChange(row.studentId, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, index, row.studentId)}
                            onFocus={() => setFocusedIndex(index)}
                            disabled={state.isAbsent}
                            aria-label={`Marks for ${row.studentName}`}
                            aria-invalid={state.isOverMax}
                            placeholder="—"
                            className={`w-full h-9 text-center font-mono font-bold text-sm rounded-lg transition-all ${
                              state.isOverMax
                                ? 'border-2 border-red-500 bg-red-50 text-red-700 focus:outline-hidden focus:ring-2 focus:ring-red-400'
                                : state.isAbsent
                                ? 'bg-neutral-100 border border-neutral-300 text-neutral-500 cursor-not-allowed font-sans text-xs'
                                : hasValidMark
                                ? 'bg-white border border-neutral-300 text-neutral-900 focus:border-purple-600 focus:ring-2 focus:ring-purple-200'
                                : 'bg-white border border-neutral-300 text-neutral-400 focus:border-purple-600 focus:ring-2 focus:ring-purple-200'
                            }`}
                          />

                          {/* INLINE REJECTION ERROR ALERT BADGE */}
                          {state.isOverMax && (
                            <div
                              role="alert"
                              className="absolute top-10 left-1/2 -translate-x-1/2 z-20 whitespace-nowrap bg-red-600 text-white text-2xs font-bold py-0.5 px-2 rounded shadow-md pointer-events-none animate-bounce"
                            >
                              ⚠️ {state.errorMessage || `Max is ${data.maxMarks}`}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Real-time Calculated Percentage */}
                      <td className="py-2.5 px-4 text-center font-mono text-xs font-semibold text-neutral-700">
                        {state.isAbsent ? '—' : pct !== null ? `${pct}%` : '—'}
                      </td>

                      {/* Real-time Dynamic Grade Badge */}
                      <td className="py-2.5 px-4 text-center">
                        {state.isAbsent ? (
                          <span className="text-xs text-neutral-400 font-mono">—</span>
                        ) : gradeObj ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-xs ${
                              gradeObj.isPassing
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                          >
                            {gradeObj.grade}
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-400 font-mono">—</span>
                        )}
                      </td>

                      {/* Remarks & Absent Quick Toggle */}
                      <td className="py-2 px-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Optional remark..."
                            value={state.remarks}
                            onChange={(e) => handleRemarksChange(row.studentId, e.target.value)}
                            disabled={state.isAbsent}
                            className="w-full h-8 px-2.5 text-xs rounded-md border border-neutral-200 bg-white text-neutral-800 placeholder:text-neutral-400 focus:outline-hidden focus:border-purple-500 focus:ring-1 focus:ring-purple-200"
                          />
                          <button
                            type="button"
                            onClick={() => handleToggleAbsent(row.studentId)}
                            className={`shrink-0 px-2 py-1 text-2xs font-semibold rounded border transition-colors ${
                              state.isAbsent
                                ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                                : 'bg-neutral-100 text-neutral-600 border-neutral-200 hover:bg-neutral-200'
                            }`}
                            title={state.isAbsent ? 'Clear absent' : 'Mark as absent'}
                          >
                            {state.isAbsent ? 'Unmark Absent' : 'Absent'}
                          </button>
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
    </div>
  );
}
