'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Campus, Class, Exam, ID, NewExam, Subject } from '@/types';
import { createExamSchedule, updateExam } from '@/lib/repositories/exams';
import { listCampuses } from '@/lib/repositories/campuses';
import { listClasses } from '@/lib/repositories/classes';
import { listSubjects } from '@/lib/repositories/subjects';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';

export interface ExamFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  examToEdit?: Exam | null;
  onSaved: (exam: Exam) => void;
  initialCampusId?: ID;
  initialCampuses?: Campus[];
  initialClasses?: Class[];
  initialSubjects?: Subject[];
}

const DEFAULT_TERMS = [
  { value: 'Term 1', label: 'Term 1 (First Term)' },
  { value: 'Midterm', label: 'Midterm Examination' },
  { value: 'Term 2', label: 'Term 2 (Second Term)' },
  { value: 'Final Term', label: 'Final Term Examination' },
  { value: 'Monthly Test', label: 'Monthly Assessment' },
];

export function ExamFormModal({
  isOpen,
  onClose,
  examToEdit,
  onSaved,
  initialCampusId,
  initialCampuses,
  initialClasses,
  initialSubjects,
}: ExamFormModalProps) {
  const { session } = useSession();
  const { showToast } = useToast();
  const schoolId = session?.schoolId ?? 'sch_main';

  // Master options
  const [campuses, setCampuses] = useState<Campus[]>(initialCampuses || []);
  const [classes, setClasses] = useState<Class[]>(initialClasses || []);
  const [allSubjects, setAllSubjects] = useState<Subject[]>(initialSubjects || []);
  const [loadingMetadata, setLoadingMetadata] = useState<boolean>(
    !initialClasses && !initialSubjects
  );

  // Form states
  const [name, setName] = useState<string>(examToEdit?.name || '');
  const [term, setTerm] = useState<string>(examToEdit?.term || 'Midterm');
  const [campusId, setCampusId] = useState<string>(
    examToEdit?.campusId || initialCampusId || session?.campusId || ''
  );
  const [classId, setClassId] = useState<string>(examToEdit?.classId || '');
  const [subjectId, setSubjectId] = useState<string>(examToEdit?.subjectId || '');
  const [date, setDate] = useState<string>(
    examToEdit?.date || new Date().toISOString().split('T')[0]
  );
  const [maxMarks, setMaxMarks] = useState<string>(
    examToEdit ? String(examToEdit.maxMarks) : '100'
  );

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load campuses, classes, subjects
  useEffect(() => {
    let ignore = false;
    async function loadMeta() {
      if (!isOpen) return;
      setLoadingMetadata(true);
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

          // Set default campus if not set
          if (!campusId && campList.length > 0) {
            setCampusId(campList[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load exam modal metadata:', err);
      } finally {
        if (!ignore) setLoadingMetadata(false);
      }
    }

    loadMeta();
    return () => {
      ignore = true;
    };
  }, [isOpen, schoolId, campusId]);

  // Sync state when examToEdit changes
  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (ignore) return;
      if (examToEdit) {
        setName(examToEdit.name);
        setTerm(examToEdit.term);
        setCampusId(examToEdit.campusId);
        setClassId(examToEdit.classId);
        setSubjectId(examToEdit.subjectId);
        setDate(examToEdit.date);
        setMaxMarks(String(examToEdit.maxMarks));
      } else {
        setName('');
        setTerm('Midterm');
        setClassId('');
        setSubjectId('');
        setDate(new Date().toISOString().split('T')[0]);
        setMaxMarks('100');
      }
      setErrorMsg(null);
    });

    return () => {
      ignore = true;
    };
  }, [examToEdit, isOpen]);

  // Filter classes by campus
  const filteredClasses = useMemo(() => {
    if (!campusId) return classes;
    return classes.filter((c) => c.campusId === campusId);
  }, [classes, campusId]);

  // Filter subjects by selected class (Acceptance Criteria: Per class and subject)
  const filteredSubjects = useMemo(() => {
    if (!classId) return [];
    return allSubjects.filter((s) => s.classId === classId);
  }, [allSubjects, classId]);

  // When class changes, clear subject if not valid for new class
  const handleClassChange = (newClassId: string) => {
    setClassId(newClassId);
    const validSubjects = allSubjects.filter((s) => s.classId === newClassId);
    if (!validSubjects.some((s) => s.id === subjectId)) {
      setSubjectId(validSubjects[0]?.id || '');
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const parsedMarks = parseFloat(maxMarks);
    if (isNaN(parsedMarks) || parsedMarks <= 0) {
      setErrorMsg('Maximum marks must be greater than zero.');
      return;
    }
    if (!name.trim()) {
      setErrorMsg('Please enter an exam title.');
      return;
    }
    if (!classId) {
      setErrorMsg('Please select a target class.');
      return;
    }
    if (!subjectId) {
      setErrorMsg('Please select an exam subject.');
      return;
    }
    if (!date) {
      setErrorMsg('Please specify the exam date.');
      return;
    }

    setSubmitting(true);
    try {
      if (examToEdit) {
        const updated = await updateExam(examToEdit.id, {
          name: name.trim(),
          term: term.trim(),
          campusId: campusId || examToEdit.campusId,
          classId,
          subjectId,
          date,
          maxMarks: parsedMarks,
        });

        showToast({
          type: 'success',
          title: 'Exam updated',
          message: `Schedule for "${name}" updated successfully.`,
        });

        onSaved(updated);
      } else {
        const payload: NewExam = {
          schoolId,
          campusId: campusId || campuses[0]?.id || 'camp_main',
          academicYearId: 'ay_2026_2027',
          name: name.trim(),
          term: term.trim(),
          classId,
          subjectId,
          date,
          maxMarks: parsedMarks,
          status: 'draft',
        };

        const created = await createExamSchedule(payload);

        showToast({
          type: 'success',
          title: 'Exam scheduled',
          message: `Exam "${name}" scheduled successfully for ${date}.`,
        });

        onSaved(created);
      }
      onClose();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save exam schedule.');
    } finally {
      setSubmitting(false);
    }
  };

  const campusOptions = [
    ...campuses.map((c) => ({ value: c.id, label: c.name })),
  ];

  const classOptions = [
    { value: '', label: 'Select Target Class...' },
    ...filteredClasses.map((c) => ({
      value: c.id,
      label: `${c.grade}-${c.section}`,
    })),
  ];

  const subjectOptions = [
    { value: '', label: filteredSubjects.length ? 'Select Subject...' : 'No subjects configured for class' },
    ...filteredSubjects.map((s) => ({
      value: s.id,
      label: `${s.name} (${s.code})`,
    })),
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="exam-modal-title"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-neutral-200 overflow-hidden my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 bg-neutral-50/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700 font-bold text-lg">
              📝
            </div>
            <div>
              <h2 id="exam-modal-title" className="text-lg font-bold text-neutral-900">
                {examToEdit ? 'Edit Exam Schedule' : 'Schedule New Exam'}
              </h2>
              <p className="text-xs text-neutral-500">
                Configure exam title, term, class, subject, date, and maximum marks
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 font-medium">
              {errorMsg}
            </div>
          )}

          {loadingMetadata ? (
            <div className="py-8 text-center text-xs text-neutral-500">
              Loading class and subject configurations...
            </div>
          ) : (
            <>
              {/* Exam Name */}
              <Input
                label="Exam Name"
                placeholder="e.g. Midterm Examination 2026, First Quiz"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              {/* Term & Campus in Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  label="Academic Term"
                  options={DEFAULT_TERMS}
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  required
                />
                <Select
                  label="Campus"
                  options={campusOptions}
                  value={campusId}
                  onChange={(e) => setCampusId(e.target.value)}
                  required
                />
              </div>

              {/* Class & Subject (Acceptance Criteria: Per class and subject) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  label="Class"
                  options={classOptions}
                  value={classId}
                  onChange={(e) => handleClassChange(e.target.value)}
                  required
                />
                <Select
                  label="Subject"
                  options={subjectOptions}
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  disabled={!classId || filteredSubjects.length === 0}
                  required
                />
              </div>

              {/* Date & Maximum Marks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DatePicker
                  label="Exam Date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
                <Input
                  label="Maximum Marks"
                  type="number"
                  min="1"
                  max="1000"
                  step="1"
                  placeholder="100"
                  value={maxMarks}
                  onChange={(e) => setMaxMarks(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={submitting || loadingMetadata}
            >
              {submitting ? 'Saving Schedule...' : examToEdit ? 'Save Changes' : 'Create Exam Schedule'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
