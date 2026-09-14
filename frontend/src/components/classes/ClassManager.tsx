'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { AcademicYear, Campus, Class, NewClass, Scope, Student, Teacher, User } from '@/types';
import {
  listClasses,
  createClassWithValidation,
  updateClassWithValidation,
  canDeleteClass,
  safeDeleteClass,
} from '@/lib/repositories/classes';
import { listCampuses } from '@/lib/repositories/campuses';
import { listTeachers } from '@/lib/repositories/teachers';
import { listUsers } from '@/lib/repositories/users';
import { listStudents } from '@/lib/repositories/students';
import { listAcademicYears } from '@/lib/repositories/academicYears';
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
import { NavIcon } from '@/components/shell/NavIcon';

export interface EnrichedClass extends Class {
  campusName: string;
  teacherName: string;
  enrolledCount: number;
}

export interface ClassManagerProps {
  initialClasses?: Class[];
  initialCampuses?: Campus[];
  initialTeachers?: Teacher[];
  initialUsers?: User[];
  initialStudents?: Student[];
  initialAcademicYears?: AcademicYear[];
}

export function ClassManager({
  initialClasses,
  initialCampuses,
  initialTeachers,
  initialUsers,
  initialStudents,
  initialAcademicYears,
}: ClassManagerProps) {
  const { session } = useSession();
  const { showToast } = useToast();
  const schoolId = session?.schoolId ?? 'sch_main';

  // Core Data
  const [classes, setClasses] = useState<Class[]>(initialClasses ?? []);
  const [campuses, setCampuses] = useState<Campus[]>(initialCampuses ?? []);
  const [teachers, setTeachers] = useState<Teacher[]>(initialTeachers ?? []);
  const [users, setUsers] = useState<User[]>(initialUsers ?? []);
  const [students, setStudents] = useState<Student[]>(initialStudents ?? []);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>(initialAcademicYears ?? []);
  const [isLoading, setIsLoading] = useState(!initialClasses);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampus, setSelectedCampus] = useState<string>('all');
  const [selectedGrade, setSelectedGrade] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Add/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [formCampusId, setFormCampusId] = useState('');
  const [formAcademicYearId, setFormAcademicYearId] = useState('');
  const [formGrade, setFormGrade] = useState('');
  const [formSection, setFormSection] = useState('');
  const [formRoom, setFormRoom] = useState('');
  const [formCapacity, setFormCapacity] = useState('30');
  const [formClassTeacherId, setFormClassTeacherId] = useState('');

  // Safe Deletion Safeguards
  const [classToDelete, setClassToDelete] = useState<Class | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [blockedDeleteNotice, setBlockedDeleteNotice] = useState<{
    isOpen: boolean;
    className: string;
    studentCount: number;
    reason: string;
  }>({
    isOpen: false,
    className: '',
    studentCount: 0,
    reason: '',
  });

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const scope: Scope = { schoolId };
      const [clsList, campList, tList, uList, stList, ayList] = await Promise.all([
        listClasses(scope),
        listCampuses(scope),
        listTeachers(scope),
        listUsers(scope, { role: 'teacher' }),
        listStudents(scope),
        listAcademicYears(scope),
      ]);

      setClasses(clsList);
      setCampuses(campList);
      setTeachers(tList);
      setUsers(uList);
      setStudents(stList);
      setAcademicYears(ayList);
    } catch (err) {
      console.error('Failed to load classes data:', err);
      showToast({
        type: 'error',
        title: 'Failed to load records',
        message: 'Could not load classes and campuses.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [schoolId, showToast]);

  useEffect(() => {
    let ignore = false;
    if (!initialClasses) {
      Promise.resolve().then(() => {
        if (!ignore) {
          loadData();
        }
      });
    }
    return () => {
      ignore = true;
    };
  }, [initialClasses, loadData]);

  // Lookup maps
  const campusMap = useMemo(() => {
    const map = new Map<string, string>();
    campuses.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [campuses]);

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

  const studentCountMap = useMemo(() => {
    const map = new Map<string, number>();
    students.forEach((s) => {
      if (s.classId) {
        map.set(s.classId, (map.get(s.classId) ?? 0) + 1);
      }
    });
    return map;
  }, [students]);

  // Distinct Grades for filter
  const distinctGrades = useMemo(() => {
    const set = new Set<string>();
    classes.forEach((c) => set.add(c.grade));
    return Array.from(set).sort();
  }, [classes]);

  // Enriched classes
  const enrichedClasses: EnrichedClass[] = useMemo(() => {
    return classes.map((cls) => ({
      ...cls,
      campusName: campusMap.get(cls.campusId) ?? 'Unknown Campus',
      teacherName: cls.classTeacherId ? teacherNameMap.get(cls.classTeacherId) ?? 'Unassigned' : 'Unassigned',
      enrolledCount: studentCountMap.get(cls.id) ?? 0,
    }));
  }, [classes, campusMap, teacherNameMap, studentCountMap]);

  // Filtered classes
  const filteredClasses = useMemo(() => {
    return enrichedClasses.filter((c) => {
      if (selectedCampus !== 'all' && c.campusId !== selectedCampus) return false;
      if (selectedGrade !== 'all' && c.grade !== selectedGrade) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchGrade = c.grade.toLowerCase().includes(q);
        const matchSection = c.section.toLowerCase().includes(q);
        const matchCampus = c.campusName.toLowerCase().includes(q);
        const matchTeacher = c.teacherName.toLowerCase().includes(q);
        const matchRoom = c.room ? c.room.toLowerCase().includes(q) : false;
        const matchCombo = `${c.grade} ${c.section}`.toLowerCase().includes(q);
        if (!matchGrade && !matchSection && !matchCampus && !matchTeacher && !matchRoom && !matchCombo) {
          return false;
        }
      }
      return true;
    });
  }, [enrichedClasses, selectedCampus, selectedGrade, searchQuery]);

  // Pagination
  const paginatedClasses = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredClasses.slice(start, start + pageSize);
  }, [filteredClasses, currentPage, pageSize]);

  // Stats
  const totalCapacity = useMemo(() => {
    return classes.reduce((sum, c) => sum + (c.capacity || 0), 0);
  }, [classes]);

  const totalEnrolled = useMemo(() => {
    return students.filter((s) => s.classId).length;
  }, [students]);

  const assignedTeachersCount = useMemo(() => {
    return classes.filter((c) => Boolean(c.classTeacherId)).length;
  }, [classes]);

  // Open modal for Create
  const handleOpenCreateModal = () => {
    setEditingClass(null);
    setFormError(null);
    setFormCampusId(campuses[0]?.id ?? 'cmp_main');
    const currAy = academicYears.find((y) => y.isCurrent) ?? academicYears[0];
    setFormAcademicYearId(currAy?.id ?? 'ay_2026_2027');
    setFormGrade('');
    setFormSection('');
    setFormRoom('');
    setFormCapacity('30');
    setFormClassTeacherId('');
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (cls: Class) => {
    setEditingClass(cls);
    setFormError(null);
    setFormCampusId(cls.campusId);
    setFormAcademicYearId(cls.academicYearId);
    setFormGrade(cls.grade);
    setFormSection(cls.section);
    setFormRoom(cls.room ?? '');
    setFormCapacity(String(cls.capacity));
    setFormClassTeacherId(cls.classTeacherId ?? '');
    setIsModalOpen(true);
  };

  // Save Class (Create or Update)
  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formCampusId) {
      setFormError('Please select a campus.');
      return;
    }
    if (!formGrade.trim()) {
      setFormError('Please enter or select a grade (e.g., Grade 8).');
      return;
    }
    if (!formSection.trim()) {
      setFormError('Please enter a section (e.g., A).');
      return;
    }
    const cap = parseInt(formCapacity, 10);
    if (isNaN(cap) || cap <= 0) {
      setFormError('Class capacity must be a positive number.');
      return;
    }

    try {
      setIsSubmitting(true);
      const scope: Scope = { schoolId, campusId: formCampusId };

      if (editingClass) {
        // Update existing class
        const res = await updateClassWithValidation(
          editingClass.id,
          {
            campusId: formCampusId,
            academicYearId: formAcademicYearId,
            grade: formGrade.trim(),
            section: formSection.trim(),
            room: formRoom.trim() || undefined,
            capacity: cap,
            classTeacherId: formClassTeacherId || undefined,
          },
          scope
        );

        if (!res.success) {
          setFormError(res.error ?? 'Validation failed.');
          return;
        }

        setClasses((prev) => prev.map((c) => (c.id === editingClass.id ? res.class! : c)));
        showToast({
          type: 'success',
          title: 'Class Updated',
          message: `${res.class!.grade} - Section ${res.class!.section} has been updated successfully.`,
        });
      } else {
        // Create new class
        const newClassInput: NewClass = {
          schoolId,
          campusId: formCampusId,
          academicYearId: formAcademicYearId,
          grade: formGrade.trim(),
          section: formSection.trim(),
          room: formRoom.trim() || undefined,
          capacity: cap,
          classTeacherId: formClassTeacherId || undefined,
        };

        const res = await createClassWithValidation(newClassInput, scope);
        if (!res.success) {
          setFormError(res.error ?? 'Validation failed.');
          return;
        }

        setClasses((prev) => [...prev, res.class!]);
        showToast({
          type: 'success',
          title: 'Class Created',
          message: `${res.class!.grade} - Section ${res.class!.section} created successfully.`,
        });
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save class:', err);
      setFormError('An unexpected error occurred while saving the class.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Safe Deletion Verification
  const handleDeleteClick = async (cls: Class) => {
    try {
      const scope: Scope = { schoolId, campusId: cls.campusId };
      const check = await canDeleteClass(cls.id, scope);

      if (!check.canDelete) {
        setBlockedDeleteNotice({
          isOpen: true,
          className: `${cls.grade} - Section ${cls.section}`,
          studentCount: check.studentCount,
          reason: check.reason ?? 'Class has enrolled students.',
        });
        return;
      }

      // If safe to delete, open confirmation
      setClassToDelete(cls);
      setIsConfirmDeleteOpen(true);
    } catch (err) {
      console.error('Error checking class deletion:', err);
      showToast({
        type: 'error',
        title: 'Verification Failed',
        message: 'Could not verify student enrollment.',
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!classToDelete) return;
    try {
      setIsDeleting(true);
      const res = await safeDeleteClass(classToDelete.id, { schoolId });
      if (!res.success) {
        showToast({
          type: 'error',
          title: 'Cannot Delete Class',
          message: res.error ?? 'Deletion rejected.',
        });
        return;
      }

      setClasses((prev) => prev.filter((c) => c.id !== classToDelete.id));
      showToast({
        type: 'success',
        title: 'Class Deleted',
        message: `${classToDelete.grade} - Section ${classToDelete.section} has been deleted.`,
      });
    } catch (err) {
      console.error('Failed to delete class:', err);
      showToast({
        type: 'error',
        title: 'Delete Failed',
        message: 'An error occurred while deleting the class.',
      });
    } finally {
      setIsDeleting(false);
      setIsConfirmDeleteOpen(false);
      setClassToDelete(null);
    }
  };

  // Filter campus teachers for the modal
  const modalAvailableTeachers = useMemo(() => {
    if (!formCampusId) return teachers;
    return teachers.filter((t) => t.campusId === formCampusId);
  }, [teachers, formCampusId]);

  // Table Columns
  const columns: TableColumn<EnrichedClass>[] = [
    {
      key: 'grade_section',
      header: 'Class & Section',
      accessor: (cls) => (
        <div className="flex flex-col">
          <Link
            href={`/admin/classes/${cls.id}`}
            className="font-semibold text-brand-navy hover:text-brand-navy-light transition-colors"
          >
            {cls.grade} - Section {cls.section}
          </Link>
          <span className="text-xs text-neutral-500 font-mono">ID: {cls.id}</span>
        </div>
      ),
    },
    {
      key: 'campus',
      header: 'Campus',
      accessor: (cls) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800 border border-neutral-200">
          {cls.campusName}
        </span>
      ),
    },
    {
      key: 'homeroom_teacher',
      header: 'Homeroom Teacher',
      accessor: (cls) => (
        <div className="text-sm">
          {cls.classTeacherId ? (
            <span className="font-medium text-neutral-900">{cls.teacherName}</span>
          ) : (
            <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Unassigned
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'room',
      header: 'Room',
      accessor: (cls) => (
        <span className="text-sm text-neutral-600 font-mono">{cls.room || '—'}</span>
      ),
    },
    {
      key: 'enrollment',
      header: 'Enrollment / Capacity',
      accessor: (cls) => {
        const pct = Math.min(100, Math.round((cls.enrolledCount / (cls.capacity || 1)) * 100));
        const isFull = cls.enrolledCount >= cls.capacity;
        return (
          <div className="w-36">
            <div className="flex justify-between text-xs font-medium text-neutral-700 mb-1">
              <span className="tabular-nums font-semibold">{cls.enrolledCount} / {cls.capacity}</span>
              <span className={`text-[11px] ${isFull ? 'text-rose-600 font-bold' : 'text-neutral-500'}`}>
                {pct}%
              </span>
            </div>
            <div className="w-full bg-neutral-200 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  isFull
                    ? 'bg-rose-500'
                    : pct > 80
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      accessor: (cls) => (
        <div className="flex items-center justify-end gap-2">
          <Link href={`/admin/classes/${cls.id}`}>
            <Button size="sm" variant="ghost">
              Roster
            </Button>
          </Link>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleOpenEditModal(cls)}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => handleDeleteClick(cls)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Classes & Sections</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Manage grade sections, room allocations, homeroom teachers, and student rosters.
          </p>
        </div>
        <Button
          onClick={handleOpenCreateModal}
          className="shadow-sm"
          leftIcon={<NavIcon name="plus" className="w-4 h-4" />}
        >
          Add Class
        </Button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Classes"
          value={classes.length}
          subtitle="Across all campus branches"
        />
        <StatCard
          label="Enrolled Students"
          value={totalEnrolled}
          subtitle={`Max capacity: ${totalCapacity}`}
        />
        <StatCard
          label="Campuses Active"
          value={campuses.length}
          subtitle="Branch locations"
        />
        <StatCard
          label="Homeroom Assigned"
          value={`${assignedTeachersCount} / ${classes.length}`}
          subtitle={`${Math.round((assignedTeachersCount / (classes.length || 1)) * 100)}% coverage`}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Search Classes"
            placeholder="Search by grade, section, room, teacher..."
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
            label="Filter by Grade"
            value={selectedGrade}
            onChange={(e) => {
              setSelectedGrade(e.target.value);
              setCurrentPage(1);
            }}
            options={[
              { value: 'all', label: 'All Grades' },
              ...distinctGrades.map((g) => ({ value: g, label: g })),
            ]}
          />
        </div>
      </div>

      {/* Classes Table */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
        <Table<EnrichedClass>
          columns={columns}
          data={paginatedClasses}
          keyExtractor={(cls) => cls.id}
          isLoading={isLoading}
          emptyState={{
            title: 'No classes found',
            description: 'No academic classes match your search and filter criteria.',
            action: {
              label: 'Add Class',
              onClick: handleOpenCreateModal,
            },
          }}
        />

        {/* Pagination */}
        {filteredClasses.length > pageSize && (
          <div className="p-4 border-t border-neutral-200">
            <Pagination
              page={currentPage}
              totalItems={filteredClasses.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Add / Edit Class Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClass ? `Edit Class: ${editingClass.grade} - ${editingClass.section}` : 'Add New Class'}
        description="Configure academic grade, section, campus allocation, room, and homeroom teacher."
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveClass}
              isLoading={isSubmitting}
            >
              {editingClass ? 'Save Changes' : 'Create Class'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveClass} className="space-y-4 py-2">
          {formError && (
            <div className="p-3 text-sm rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2">
              <svg className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>{formError}</div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Campus Branch *"
              value={formCampusId}
              onChange={(e) => setFormCampusId(e.target.value)}
              options={campuses.map((c) => ({ value: c.id, label: c.name }))}
            />

            <Select
              label="Academic Year *"
              value={formAcademicYearId}
              onChange={(e) => setFormAcademicYearId(e.target.value)}
              options={academicYears.map((ay) => ({
                value: ay.id,
                label: `${ay.name}${ay.isCurrent ? ' (Current)' : ''}`,
              }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Grade / Level *"
              placeholder="e.g. Grade 8"
              value={formGrade}
              onChange={(e) => setFormGrade(e.target.value)}
              required
            />

            <Input
              label="Section *"
              placeholder="e.g. A"
              value={formSection}
              onChange={(e) => setFormSection(e.target.value)}
              required
            />
          </div>

          <div className="p-3 bg-neutral-50 rounded-lg text-xs text-neutral-600 border border-neutral-200">
            <span className="font-semibold text-neutral-800">Campus Isolation Note:</span> You can create the same Grade and Section across different campuses (e.g., Grade 8-A at Main Campus and Grade 8-A at Girls Campus). Duplicates within the same campus will be prevented.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Room / Lab"
              placeholder="e.g. Room 204"
              value={formRoom}
              onChange={(e) => setFormRoom(e.target.value)}
            />

            <Input
              label="Student Capacity *"
              type="number"
              min="1"
              max="150"
              placeholder="e.g. 30"
              value={formCapacity}
              onChange={(e) => setFormCapacity(e.target.value)}
              required
            />
          </div>

          <Select
            label="Homeroom Class Teacher"
            value={formClassTeacherId}
            onChange={(e) => setFormClassTeacherId(e.target.value)}
            options={[
              { value: '', label: 'None (Unassigned)' },
              ...modalAvailableTeachers.map((t) => ({
                value: t.id,
                label: `${teacherNameMap.get(t.id) ?? t.employeeNumber} (${t.department})`,
              })),
            ]}
          />
        </form>
      </Modal>

      {/* Blocked Deletion Notice Modal */}
      <Modal
        isOpen={blockedDeleteNotice.isOpen}
        onClose={() => setBlockedDeleteNotice((prev) => ({ ...prev, isOpen: false }))}
        title="Class Deletion Blocked"
        description="Cannot remove a class that currently has enrolled students."
        size="md"
        footer={
          <div className="flex justify-end w-full">
            <Button
              variant="secondary"
              onClick={() => setBlockedDeleteNotice((prev) => ({ ...prev, isOpen: false }))}
            >
              Understood
            </Button>
          </div>
        }
      >
        <div className="py-2 space-y-3">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-amber-900">
              <p className="font-semibold">{blockedDeleteNotice.className}</p>
              <p className="mt-1">{blockedDeleteNotice.reason}</p>
            </div>
          </div>
          <p className="text-xs text-neutral-500">
            To delete this class safely without data loss, reassign or transfer the {blockedDeleteNotice.studentCount} enrolled student(s) to another class or section first.
          </p>
        </div>
      </Modal>

      {/* Safe Deletion Confirm Dialog */}
      <ConfirmDialog
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        recordName={classToDelete ? `${classToDelete.grade} - Section ${classToDelete.section}` : 'Class'}
        actionType="delete"
        title={classToDelete ? `Delete ${classToDelete.grade} - Section ${classToDelete.section}?` : 'Delete Class?'}
        message="This will permanently remove this class from the system. This action cannot be undone."
        confirmLabel="Delete Class"
        isLoading={isDeleting}
      />
    </div>
  );
}
