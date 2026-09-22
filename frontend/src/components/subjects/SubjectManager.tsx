'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Campus, Class, Scope, Subject, Teacher, User } from '@/types';
import { listSubjects, assignSubjectTeacher, deleteSubject } from '@/lib/repositories/subjects';
import { listClasses } from '@/lib/repositories/classes';
import { listCampuses } from '@/lib/repositories/campuses';
import { listTeachers } from '@/lib/repositories/teachers';
import { listUsers } from '@/lib/repositories/users';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { StatCard } from '@/components/ui/StatCard';
import { Table, TableColumn } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export interface EnrichedSubjectRow extends Subject {
  className: string;
  campusName: string;
  campusId: string;
  teacherName: string;
}

export interface SubjectManagerProps {
  initialSubjects?: Subject[];
  initialClasses?: Class[];
  initialCampuses?: Campus[];
  initialTeachers?: Teacher[];
  initialUsers?: User[];
}

export function SubjectManager({
  initialSubjects,
  initialClasses,
  initialCampuses,
  initialTeachers,
  initialUsers,
}: SubjectManagerProps) {
  const { session } = useSession();
  const { showToast } = useToast();
  const schoolId = session?.schoolId ?? 'sch_main';

  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects ?? []);
  const [classes, setClasses] = useState<Class[]>(initialClasses ?? []);
  const [campuses, setCampuses] = useState<Campus[]>(initialCampuses ?? []);
  const [teachers, setTeachers] = useState<Teacher[]>(initialTeachers ?? []);
  const [users, setUsers] = useState<User[]>(initialUsers ?? []);
  const [isLoading, setIsLoading] = useState(!initialSubjects);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampus, setSelectedCampus] = useState('all');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedTeacher, setSelectedTeacher] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Reassign Modal
  const [reassignSubject, setReassignSubject] = useState<Subject | null>(null);
  const [newTeacherId, setNewTeacherId] = useState('');
  const [isReassigning, setIsReassigning] = useState(false);

  // Delete Dialog
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const scope: Scope = { schoolId };
      const [sList, clsList, campList, tList, uList] = await Promise.all([
        listSubjects(scope),
        listClasses(scope),
        listCampuses(scope),
        listTeachers(scope),
        listUsers(scope, { role: 'teacher' }),
      ]);

      setSubjects(sList);
      setClasses(clsList);
      setCampuses(campList);
      setTeachers(tList);
      setUsers(uList);
    } catch (err) {
      console.error('Failed to load subjects directory:', err);
      showToast({
        type: 'error',
        title: 'Error loading subjects',
        message: 'Could not fetch academic subjects.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [schoolId, showToast]);

  useEffect(() => {
    let ignore = false;
    if (!initialSubjects) {
      Promise.resolve().then(() => {
        if (!ignore) {
          loadData();
        }
      });
    }
    return () => {
      ignore = true;
    };
  }, [initialSubjects, loadData]);

  // Lookup maps
  const campusMap = useMemo(() => {
    const map = new Map<string, string>();
    campuses.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [campuses]);

  const classMap = useMemo(() => {
    const map = new Map<string, Class>();
    classes.forEach((c) => map.set(c.id, c));
    return map;
  }, [classes]);

  const teacherNameMap = useMemo(() => {
    const userMap = new Map<string, string>();
    users.forEach((u) => userMap.set(u.id, u.name));

    const tMap = new Map<string, string>();
    teachers.forEach((t) => {
      const name = userMap.get(t.userId) ?? t.employeeNumber;
      tMap.set(t.id, name);
    });
    return tMap;
  }, [teachers, users]);

  // Enriched rows
  const enrichedRows: EnrichedSubjectRow[] = useMemo(() => {
    return subjects.map((s) => {
      const cls = classMap.get(s.classId);
      const campusId = cls ? cls.campusId : '';
      const campusName = campusMap.get(campusId) ?? 'Unknown Campus';
      const className = cls ? `${cls.grade} - Section ${cls.section}` : 'Unassigned Class';
      const teacherName = s.teacherId ? teacherNameMap.get(s.teacherId) ?? 'Unassigned' : 'Unassigned';

      return {
        ...s,
        className,
        campusName,
        campusId,
        teacherName,
      };
    });
  }, [subjects, classMap, campusMap, teacherNameMap]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return enrichedRows.filter((r) => {
      if (selectedCampus !== 'all' && r.campusId !== selectedCampus) return false;
      if (selectedClass !== 'all' && r.classId !== selectedClass) return false;
      if (selectedTeacher !== 'all') {
        if (selectedTeacher === 'unassigned' && r.teacherId) return false;
        if (selectedTeacher !== 'unassigned' && r.teacherId !== selectedTeacher) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = r.name.toLowerCase().includes(q);
        const matchCode = r.code.toLowerCase().includes(q);
        const matchClass = r.className.toLowerCase().includes(q);
        const matchTeacher = r.teacherName.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchClass && !matchTeacher) return false;
      }
      return true;
    });
  }, [enrichedRows, selectedCampus, selectedClass, selectedTeacher, searchQuery]);

  // Pagination
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  // Stats
  const distinctClassesWithSubjects = useMemo(() => {
    const set = new Set<string>();
    subjects.forEach((s) => set.add(s.classId));
    return set.size;
  }, [subjects]);

  const assignedCount = useMemo(() => {
    return subjects.filter((s) => Boolean(s.teacherId)).length;
  }, [subjects]);

  // Handle Reassign
  const handleOpenReassign = (subject: Subject) => {
    setReassignSubject(subject);
    setNewTeacherId(subject.teacherId ?? '');
  };

  const handleSaveReassign = async () => {
    if (!reassignSubject) return;
    try {
      setIsReassigning(true);
      const updated = await assignSubjectTeacher(
        reassignSubject.id,
        newTeacherId || null
      );

      setSubjects((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      showToast({
        type: 'success',
        title: 'Teacher Assigned',
        message: `Updated instructor for ${updated.name}.`,
      });
      setReassignSubject(null);
    } catch (err) {
      console.error('Failed to assign subject teacher:', err);
      showToast({
        type: 'error',
        title: 'Assignment Failed',
        message: 'Could not reassign teacher.',
      });
    } finally {
      setIsReassigning(false);
    }
  };

  // Handle Delete
  const handleConfirmDelete = async () => {
    if (!subjectToDelete) return;
    try {
      setIsDeleting(true);
      await deleteSubject(subjectToDelete.id);
      setSubjects((prev) => prev.filter((s) => s.id !== subjectToDelete.id));
      showToast({
        type: 'success',
        title: 'Subject Removed',
        message: `${subjectToDelete.name} has been removed.`,
      });
    } catch (err) {
      console.error('Failed to delete subject:', err);
      showToast({
        type: 'error',
        title: 'Delete Failed',
        message: 'Could not remove subject record.',
      });
    } finally {
      setIsDeleting(false);
      setSubjectToDelete(null);
    }
  };

  // Available teachers for the subject being reassigned
  const reassignAvailableTeachers = useMemo(() => {
    if (!reassignSubject) return teachers;
    const cls = classMap.get(reassignSubject.classId);
    if (!cls) return teachers;
    return teachers.filter((t) => t.campusId === cls.campusId);
  }, [reassignSubject, classMap, teachers]);

  // Table Columns
  const columns: TableColumn<EnrichedSubjectRow>[] = [
    {
      key: 'code',
      header: 'Code',
      accessor: (r) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 border border-neutral-200">
          {r.code}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Subject Name',
      accessor: (r) => <span className="font-medium text-neutral-900">{r.name}</span>,
    },
    {
      key: 'class',
      header: 'Class Cohort',
      accessor: (r) => (
        <Link
          href={`/admin/classes/${r.classId}`}
          className="text-brand-navy hover:text-brand-navy-light font-medium text-sm transition-colors"
        >
          {r.className}
        </Link>
      ),
    },
    {
      key: 'campus',
      header: 'Campus',
      accessor: (r) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800 border border-neutral-200">
          {r.campusName}
        </span>
      ),
    },
    {
      key: 'teacher',
      header: 'Assigned Teacher',
      accessor: (r) => (
        <div>
          {r.teacherId ? (
            <span className="text-sm font-medium text-neutral-900">{r.teacherName}</span>
          ) : (
            <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Unassigned
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      accessor: (r) => (
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => handleOpenReassign(r)}>
            Assign
          </Button>
          <Button size="sm" variant="danger" onClick={() => setSubjectToDelete(r)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Curriculum Subjects</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Institutional overview of all academic course offerings, syllabus codes, and faculty assignments.
          </p>
        </div>
        <Link href="/admin/classes">
          <Button variant="secondary">
            Manage by Class Roster
          </Button>
        </Link>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Subjects"
          value={subjects.length}
          subtitle="Active course sections"
        />
        <StatCard
          label="Classes Covered"
          value={`${distinctClassesWithSubjects} / ${classes.length}`}
          subtitle="Classes with active curriculum"
        />
        <StatCard
          label="Faculty Assigned"
          value={`${assignedCount} / ${subjects.length}`}
          subtitle={`${Math.round((assignedCount / (subjects.length || 1)) * 100)}% coverage`}
        />
        <StatCard
          label="Campuses"
          value={campuses.length}
          subtitle="Branch offerings"
        />
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            label="Search Subjects"
            placeholder="Search by name, code, teacher..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
          <Select
            label="Filter by Campus"
            value={selectedCampus}
            onChange={(e) => {
              setSelectedCampus(e.target.value);
              setCurrentPage(1);
            }}
            options={[
              { value: 'all', label: 'All Campuses' },
              ...campuses.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          <Select
            label="Filter by Class"
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value);
              setCurrentPage(1);
            }}
            options={[
              { value: 'all', label: 'All Classes' },
              ...classes.map((cls) => ({
                value: cls.id,
                label: `${cls.grade} - Section ${cls.section} (${campusMap.get(cls.campusId) ?? ''})`,
              })),
            ]}
          />
          <Select
            label="Filter by Teacher"
            value={selectedTeacher}
            onChange={(e) => {
              setSelectedTeacher(e.target.value);
              setCurrentPage(1);
            }}
            options={[
              { value: 'all', label: 'All Teachers' },
              { value: 'unassigned', label: 'Unassigned Only' },
              ...teachers.map((t) => ({
                value: t.id,
                label: `${teacherNameMap.get(t.id) ?? t.employeeNumber} (${t.department})`,
              })),
            ]}
          />
        </div>
      </div>

      {/* Subjects Table */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
        <Table<EnrichedSubjectRow>
          columns={columns}
          data={paginatedRows}
          keyExtractor={(r) => r.id}
          isLoading={isLoading}
          emptyState={{
            title: 'No subjects found',
            description: 'No academic subjects match your active search and filter criteria.',
          }}
        />

        {/* Pagination */}
        {filteredRows.length > pageSize && (
          <div className="p-4 border-t border-neutral-200">
            <Pagination
              page={currentPage}
              totalItems={filteredRows.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Reassign Teacher Modal */}
      <Modal
        isOpen={Boolean(reassignSubject)}
        onClose={() => setReassignSubject(null)}
        title="Assign Subject Teacher"
        description={reassignSubject ? `Select instructor for ${reassignSubject.name} (${reassignSubject.code}).` : ''}
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setReassignSubject(null)} disabled={isReassigning}>
              Cancel
            </Button>
            <Button onClick={handleSaveReassign} isLoading={isReassigning}>
              Save Assignment
            </Button>
          </div>
        }
      >
        <div className="py-2 space-y-4">
          <Select
            label="Subject Teacher"
            value={newTeacherId}
            onChange={(e) => setNewTeacherId(e.target.value)}
            options={[
              { value: '', label: 'None (Leave Unassigned)' },
              ...reassignAvailableTeachers.map((t) => ({
                value: t.id,
                label: `${teacherNameMap.get(t.id) ?? t.employeeNumber} (${t.department})`,
              })),
            ]}
          />
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(subjectToDelete)}
        onClose={() => setSubjectToDelete(null)}
        onConfirm={handleConfirmDelete}
        recordName={subjectToDelete ? `${subjectToDelete.name} (${subjectToDelete.code})` : 'Subject'}
        actionType="delete"
        title={subjectToDelete ? `Delete ${subjectToDelete.name}?` : 'Delete Subject?'}
        message="This will remove the subject from the class curriculum and unlink assigned teachers. This action cannot be undone."
        confirmLabel="Delete Subject"
        isLoading={isDeleting}
      />
    </div>
  );
}
