'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Campus, Class, ID, Scope, Subject, Teacher, User } from '@/types';
import { bulkAssignTeacher, getTeacher } from '@/lib/repositories/teachers';
import { getUser } from '@/lib/repositories/users';
import { getCampus } from '@/lib/repositories/campuses';
import { listClasses } from '@/lib/repositories/classes';
import { listSubjects } from '@/lib/repositories/subjects';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { NavIcon } from '@/components/shell/NavIcon';

export interface TeacherAssignmentMatrixProps {
  teacherId: string;
  initialTeacher?: Teacher | null;
  initialUser?: User | null;
  initialCampus?: Campus | null;
  initialClasses?: Class[];
  initialSubjects?: Subject[];
}

export function TeacherAssignmentMatrix({
  teacherId,
  initialTeacher,
  initialUser,
  initialCampus,
  initialClasses,
  initialSubjects,
}: TeacherAssignmentMatrixProps) {
  const router = useRouter();
  const { session } = useSession();
  const { showToast } = useToast();
  const schoolId = session?.schoolId ?? 'sch_main';

  // Loaded raw data
  const [teacher, setTeacher] = useState<Teacher | null>(initialTeacher ?? null);
  const [user, setUser] = useState<User | null>(initialUser ?? null);
  const [campus, setCampus] = useState<Campus | null>(initialCampus ?? null);
  const [classes, setClasses] = useState<Class[]>(initialClasses ?? []);
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects ?? []);
  const [isLoading, setIsLoading] = useState(!initialTeacher);
  const [isSaving, setIsSaving] = useState(false);

  // Selected State
  // Set of subject IDs assigned to this teacher
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<ID>>(() => {
    if (initialTeacher?.subjectIds) {
      return new Set(initialTeacher.subjectIds);
    }
    return new Set();
  });

  // Set of class IDs where this teacher is homeroom class teacher
  const [selectedHomeroomClassIds, setSelectedHomeroomClassIds] = useState<Set<ID>>(() => {
    if (initialClasses && initialTeacher) {
      const set = new Set<ID>();
      initialClasses.forEach((cls) => {
        if (cls.classTeacherId === initialTeacher.id) {
          set.add(cls.id);
        }
      });
      return set;
    }
    return new Set();
  });

  // Filter by grade
  const [gradeFilter, setGradeFilter] = useState<string>('all');

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const t = await getTeacher(teacherId);
      if (!t) {
        showToast({
          type: 'error',
          title: 'Teacher not found',
          message: 'Could not find teacher record.',
        });
        setIsLoading(false);
        return;
      }

      const scope: Scope = { schoolId, campusId: t.campusId };
      const [u, c, rawClasses, rawSubjects] = await Promise.all([
        getUser(t.userId),
        getCampus(t.campusId),
        listClasses(scope),
        listSubjects(scope),
      ]);

      setTeacher(t);
      setUser(u);
      setCampus(c);
      setClasses(rawClasses);
      setSubjects(rawSubjects);

      // Initialize selected subjects from teacher.subjectIds or subjects where teacherId matches
      const subSet = new Set<ID>(t.subjectIds);
      rawSubjects.forEach((s) => {
        if (s.teacherId === t.id) subSet.add(s.id);
      });
      setSelectedSubjectIds(subSet);

      // Initialize homeroom class teacher selections
      const hrSet = new Set<ID>();
      rawClasses.forEach((cls) => {
        if (cls.classTeacherId === t.id) hrSet.add(cls.id);
      });
      setSelectedHomeroomClassIds(hrSet);
    } catch (err) {
      console.error('Failed to load assignment data:', err);
      showToast({
        type: 'error',
        title: 'Error loading data',
        message: 'Could not fetch classes and subjects.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [teacherId, schoolId, showToast]);

  useEffect(() => {
    let ignore = false;
    if (!initialTeacher) {
      Promise.resolve().then(() => {
        if (!ignore) {
          loadData();
        }
      });
    }
    return () => {
      ignore = true;
    };
  }, [loadData, initialTeacher]);

  // Distinct grades for filter
  const grades = useMemo(() => {
    const set = new Set<string>();
    classes.forEach((c) => set.add(c.grade));
    return Array.from(set).sort();
  }, [classes]);

  // Filtered classes
  const filteredClasses = useMemo(() => {
    if (gradeFilter === 'all') return classes;
    return classes.filter((c) => c.grade === gradeFilter);
  }, [classes, gradeFilter]);

  // Group subjects by classId
  const subjectsByClass = useMemo(() => {
    const map = new Map<ID, Subject[]>();
    subjects.forEach((s) => {
      const list = map.get(s.classId) ?? [];
      list.push(s);
      map.set(s.classId, list);
    });
    return map;
  }, [subjects]);

  // Toggle single subject
  const toggleSubject = (subjectId: ID) => {
    setSelectedSubjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(subjectId)) {
        next.delete(subjectId);
      } else {
        next.add(subjectId);
      }
      return next;
    });
  };

  // Toggle single homeroom class teacher
  const toggleHomeroom = (classId: ID) => {
    setSelectedHomeroomClassIds((prev) => {
      const next = new Set(prev);
      if (next.has(classId)) {
        next.delete(classId);
      } else {
        next.add(classId);
      }
      return next;
    });
  };

  // Bulk Actions
  // 1. Select all subjects matching department name
  const selectAllDepartmentSubjects = () => {
    if (!teacher?.department) return;
    const dept = teacher.department.toLowerCase();
    const next = new Set(selectedSubjectIds);

    subjects.forEach((s) => {
      const name = s.name.toLowerCase();
      if (
        (dept.includes('math') && name.includes('math')) ||
        (dept.includes('science') && (name.includes('science') || name.includes('sci'))) ||
        (dept.includes('language') && (name.includes('english') || name.includes('urdu'))) ||
        (dept.includes('social') && (name.includes('pakistan') || name.includes('social') || name.includes('history'))) ||
        (dept.includes('computer') && name.includes('computer'))
      ) {
        next.add(s.id);
      }
    });

    setSelectedSubjectIds(next);
    showToast({
      type: 'info',
      title: 'Bulk Selection Applied',
      message: `Selected matching subjects for ${teacher.department}.`,
    });
  };

  // 2. Select all subjects for a specific class
  const selectAllInClass = (classId: ID) => {
    const classSubs = subjectsByClass.get(classId) ?? [];
    setSelectedSubjectIds((prev) => {
      const next = new Set(prev);
      classSubs.forEach((s) => next.add(s.id));
      return next;
    });
  };

  // 3. Deselect all subjects for a specific class
  const deselectAllInClass = (classId: ID) => {
    const classSubs = subjectsByClass.get(classId) ?? [];
    setSelectedSubjectIds((prev) => {
      const next = new Set(prev);
      classSubs.forEach((s) => next.delete(s.id));
      return next;
    });
  };

  // 4. Select all in current grade filter
  const selectAllInCurrentGrade = () => {
    const targetClasses = filteredClasses;
    const targetClassIds = new Set(targetClasses.map((c) => c.id));
    setSelectedSubjectIds((prev) => {
      const next = new Set(prev);
      subjects.forEach((s) => {
        if (targetClassIds.has(s.classId)) {
          next.add(s.id);
        }
      });
      return next;
    });
  };

  // 5. Clear all subject selections
  const clearAllSubjects = () => {
    setSelectedSubjectIds(new Set());
    setSelectedHomeroomClassIds(new Set());
    showToast({
      type: 'info',
      title: 'Cleared',
      message: 'All assignments deselected.',
    });
  };

  // Count distinct classes touched by selected subjects
  const distinctClassesWithSubjects = useMemo(() => {
    const classIdSet = new Set<ID>();
    subjects.forEach((s) => {
      if (selectedSubjectIds.has(s.id)) {
        classIdSet.add(s.classId);
      }
    });
    return classIdSet.size;
  }, [subjects, selectedSubjectIds]);

  // Save Bulk Changes
  const handleSave = async () => {
    try {
      setIsSaving(true);
      const scope: Scope = { schoolId, campusId: teacher?.campusId };

      await bulkAssignTeacher(
        {
          teacherId,
          subjectIds: Array.from(selectedSubjectIds),
          homeroomClassIds: Array.from(selectedHomeroomClassIds),
        },
        scope
      );

      showToast({
        type: 'success',
        title: 'Assignments Saved',
        message: `Assigned ${selectedSubjectIds.size} subject(s) across ${distinctClassesWithSubjects} class(es).`,
      });

      router.push(`/admin/teachers/${teacherId}`);
    } catch (err) {
      console.error('Failed to save bulk assignments:', err);
      showToast({
        type: 'error',
        title: 'Save Failed',
        message: 'Could not update assignments. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto py-8 space-y-6">
        <div className="h-40 bg-surface rounded-card border border-rule motion-safe:animate-pulse p-6">
          <div className="h-6 bg-ink-100 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-ink-50 rounded w-1/2"></div>
            <div className="h-4 bg-ink-50 rounded w-1/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      {/* Return link */}
      <div>
        <Link
          href={`/admin/teachers/${teacherId}`}
          className="text-xs text-brand-700 hover:underline flex items-center gap-1 font-medium"
        >
          ← Return to Faculty Profile
        </Link>
      </div>

      {/* Header Profile Bar */}
      <div className="bg-surface rounded-card border border-rule p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <Avatar name={user?.name ?? 'Teacher'} size="lg" />
            <div className="space-y-1">
              <h1 className="text-page-title font-bold text-ink-900">
                Manage Teaching Assignments: {user?.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-xs text-ink-600">
                <span className="font-mono font-semibold bg-surface-subtle px-2 py-0.5 rounded border border-rule">
                  {teacher?.employeeNumber}
                </span>
                <span>·</span>
                <span className="font-medium text-brand-800">{teacher?.department}</span>
                <span>·</span>
                <span>{campus?.name ?? 'Campus'}</span>
              </div>
              <p className="text-secondary-meta text-ink-500 pt-1">
                Configure assigned curriculum subjects and homeroom class teacher roles on a single
                screen.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* BULK SELECTION ACCELERATOR TOOLSTRIP */}
      <div className="bg-surface rounded-card border border-rule p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-ink-700 mr-1">Bulk Tools:</span>
            {teacher?.department && (
              <Button
                variant="secondary"
                size="sm"
                onClick={selectAllDepartmentSubjects}
                title={`Select all subjects related to ${teacher.department}`}
                leftIcon={<NavIcon name="check-circle" className="w-3.5 h-3.5" />}
              >
                Select All {teacher.department}
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={selectAllInCurrentGrade}
              title="Select all subjects for classes currently displayed"
            >
              Select All in View
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={clearAllSubjects}
              title="Deselect all subjects and homeroom roles"
            >
              Clear All
            </Button>
          </div>

          {/* Grade filter pills */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-xs text-ink-500 mr-1">Grade:</span>
            <button
              onClick={() => setGradeFilter('all')}
              className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                gradeFilter === 'all'
                  ? 'bg-ink-900 text-white border-ink-900 font-semibold'
                  : 'bg-surface text-ink-700 border-rule hover:bg-surface-subtle'
              }`}
            >
              All ({classes.length})
            </button>
            {grades.map((grade) => (
              <button
                key={grade}
                onClick={() => setGradeFilter(grade)}
                className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                  gradeFilter === grade
                    ? 'bg-ink-900 text-white border-ink-900 font-semibold'
                    : 'bg-surface text-ink-700 border-rule hover:bg-surface-subtle'
                }`}
              >
                {grade}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CLASS & SUBJECT MATRIX (ONE SCREEN BULK SELECTION) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredClasses.map((cls) => {
          const classSubjects = subjectsByClass.get(cls.id) ?? [];
          const isHomeroom = selectedHomeroomClassIds.has(cls.id);
          const selectedInClassCount = classSubjects.filter((s) =>
            selectedSubjectIds.has(s.id)
          ).length;

          return (
            <div
              key={cls.id}
              className={`bg-surface rounded-card border transition-all ${
                selectedInClassCount > 0 || isHomeroom
                  ? 'border-brand-300 ring-1 ring-brand-100 shadow-xs'
                  : 'border-rule'
              }`}
            >
              {/* Card Header */}
              <div className="p-4 border-b border-rule flex items-start justify-between bg-surface-subtle/50">
                <div>
                  <h3 className="font-bold text-ink-900 text-base">
                    {cls.grade} - Section {cls.section}
                  </h3>
                  <p className="text-[11px] text-ink-500">{cls.room ?? 'Main Campus'}</p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => selectAllInClass(cls.id)}
                    className="text-[11px] text-brand-700 hover:underline font-semibold px-1"
                  >
                    Select All
                  </button>
                  <span className="text-ink-300 text-xs">|</span>
                  <button
                    type="button"
                    onClick={() => deselectAllInClass(cls.id)}
                    className="text-[11px] text-ink-500 hover:underline px-1"
                  >
                    None
                  </button>
                </div>
              </div>

              {/* Homeroom Assignment Toggle */}
              <div className="p-4 border-b border-rule bg-white">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-ink-900 select-none">
                  <input
                    type="checkbox"
                    checked={isHomeroom}
                    onChange={() => toggleHomeroom(cls.id)}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-rule"
                  />
                  <span className="inline-flex items-center gap-1">
                    Nominate as Homeroom Class Teacher (<NavIcon name="award" className="w-3.5 h-3.5" />)
                  </span>
                </label>
                <p className="text-[11px] text-ink-500 ml-6 mt-0.5">
                  Responsible for morning roll call and primary pastoral communication.
                </p>
              </div>

              {/* Subjects Checklist */}
              <div className="p-4 space-y-2.5 bg-white">
                <div className="text-[11px] font-bold tracking-wider text-ink-500 uppercase">
                  Class Subjects ({selectedInClassCount}/{classSubjects.length} Selected)
                </div>

                <div className="space-y-2">
                  {classSubjects.map((s) => {
                    const isSelected = selectedSubjectIds.has(s.id);
                    const isAssignedToOther =
                      s.teacherId && s.teacherId !== teacher?.id && !isSelected;

                    return (
                      <label
                        key={s.id}
                        className={`flex items-center justify-between p-2 rounded border transition-colors cursor-pointer text-xs ${
                          isSelected
                            ? 'bg-brand-50/50 border-brand-200 text-brand-950 font-medium'
                            : 'bg-surface hover:bg-surface-subtle border-rule text-ink-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSubject(s.id)}
                            className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500 border-rule"
                          />
                          <span>{s.name}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white border border-rule text-ink-600 font-semibold">
                            {s.code}
                          </span>
                          {isAssignedToOther && (
                            <span className="text-[10px] text-amber-700 bg-amber-50 px-1 rounded border border-amber-200">
                              Assigned
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* STICKY BOTTOM ACTION BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-rule py-3 px-6 shadow-card z-30 flex items-center justify-between">
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-ink-900">
              {selectedSubjectIds.size} subject{selectedSubjectIds.size === 1 ? '' : 's'} selected
            </span>
            <span className="text-ink-400">across</span>
            <span className="font-semibold text-ink-900">
              {distinctClassesWithSubjects} class{distinctClassesWithSubjects === 1 ? '' : 'es'}
            </span>
            {selectedHomeroomClassIds.size > 0 && (
              <>
                <span className="text-ink-400">·</span>
                <span className="text-brand-800 font-bold inline-flex items-center gap-1">
                  <NavIcon name="award" className="w-3.5 h-3.5" /> {selectedHomeroomClassIds.size} Homeroom
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push(`/admin/teachers/${teacherId}`)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} isLoading={isSaving}>
              Save All Assignments
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
