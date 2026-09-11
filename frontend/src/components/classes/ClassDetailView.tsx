'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Campus, Class, ID, Scope, Student, Subject, Teacher, User } from '@/types';
import { getClass, updateClassWithValidation, canDeleteClass, safeDeleteClass } from '@/lib/repositories/classes';
import { listCampuses } from '@/lib/repositories/campuses';
import { listTeachers } from '@/lib/repositories/teachers';
import { listUsers } from '@/lib/repositories/users';
import { listStudents } from '@/lib/repositories/students';
import {
  listSubjects,
  createSubject,
  deleteSubject,
  assignSubjectTeacher,
} from '@/lib/repositories/subjects';
import { BulkSubjectTemplateModal } from '@/components/subjects/BulkSubjectTemplateModal';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { StatCard } from '@/components/ui/StatCard';
import { Table, TableColumn } from '@/components/ui/Table';
import { Tabs, TabItem } from '@/components/ui/Tabs';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export interface EnrichedStudentItem extends Student {
  user?: User;
  fullName: string;
}

export interface EnrichedSubjectItem extends Subject {
  teacherName: string;
}

export interface ClassDetailViewProps {
  classId: ID;
  initialClass?: Class;
  initialCampus?: Campus;
  initialTeacher?: Teacher;
  initialStudents?: Student[];
  initialSubjects?: Subject[];
  initialUsers?: User[];
}

export function ClassDetailView({
  classId,
  initialClass,
  initialCampus,
  initialTeacher,
  initialStudents,
  initialSubjects,
  initialUsers,
}: ClassDetailViewProps) {
  const router = useRouter();
  const { session } = useSession();
  const { showToast } = useToast();
  const schoolId = session?.schoolId ?? 'sch_main';

  const [cls, setCls] = useState<Class | null>(initialClass ?? null);
  const [campus, setCampus] = useState<Campus | null>(initialCampus ?? null);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>(initialTeacher ? [initialTeacher] : []);
  const [users, setUsers] = useState<User[]>(initialUsers ?? []);
  const [students, setStudents] = useState<Student[]>(initialStudents ?? []);
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects ?? []);
  const [isLoading, setIsLoading] = useState(!initialClass);
  const [activeTab, setActiveTab] = useState('roster');

  // Edit Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formGrade, setFormGrade] = useState(cls?.grade ?? '');
  const [formSection, setFormSection] = useState(cls?.section ?? '');
  const [formRoom, setFormRoom] = useState(cls?.room ?? '');
  const [formCapacity, setFormCapacity] = useState(String(cls?.capacity ?? 30));
  const [formCampusId, setFormCampusId] = useState(cls?.campusId ?? '');
  const [formClassTeacherId, setFormClassTeacherId] = useState(cls?.classTeacherId ?? '');

  // Safe Deletion
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [blockedDeleteNotice, setBlockedDeleteNotice] = useState<{
    isOpen: boolean;
    studentCount: number;
    reason: string;
  }>({
    isOpen: false,
    studentCount: 0,
    reason: '',
  });

  // Subject Management
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isCustomSubjectModalOpen, setIsCustomSubjectModalOpen] = useState(false);
  const [customSubjectName, setCustomSubjectName] = useState('');
  const [customSubjectCode, setCustomSubjectCode] = useState('');
  const [customTeacherId, setCustomTeacherId] = useState('');
  const [isCustomSubmitting, setIsCustomSubmitting] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);

  // Subject Teacher Reassignment
  const [reassignSubject, setReassignSubject] = useState<Subject | null>(null);
  const [newSubjectTeacherId, setNewSubjectTeacherId] = useState('');
  const [isReassigningTeacher, setIsReassigningTeacher] = useState(false);

  // Subject Deletion
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
  const [isDeletingSubject, setIsDeletingSubject] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const scope: Scope = { schoolId };
      const currentCls = await getClass(classId);

      if (!currentCls) {
        showToast({
          type: 'error',
          title: 'Class Not Found',
          message: 'The requested class record does not exist.',
        });
        setIsLoading(false);
        return;
      }

      setCls(currentCls);
      setFormGrade(currentCls.grade);
      setFormSection(currentCls.section);
      setFormRoom(currentCls.room ?? '');
      setFormCapacity(String(currentCls.capacity));
      setFormCampusId(currentCls.campusId);
      setFormClassTeacherId(currentCls.classTeacherId ?? '');

      const [cList, tList, uList, stList, subList] = await Promise.all([
        listCampuses(scope),
        listTeachers(scope),
        listUsers(scope),
        listStudents(scope, { classId }),
        listSubjects(scope),
      ]);

      setCampuses(cList);
      setCampus(cList.find((c) => c.id === currentCls.campusId) ?? null);
      setTeachers(tList);
      setUsers(uList);
      setStudents(stList.filter((s) => s.classId === classId));
      setSubjects(subList.filter((s) => s.classId === classId));
    } catch (err) {
      console.error('Failed to load class detail:', err);
      showToast({
        type: 'error',
        title: 'Error Loading Class',
        message: 'Could not fetch class roster and details.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [classId, schoolId, showToast]);

  useEffect(() => {
    let ignore = false;
    if (!initialClass) {
      Promise.resolve().then(() => {
        if (!ignore) {
          loadData();
        }
      });
    }
    return () => {
      ignore = true;
    };
  }, [initialClass, loadData]);

  // Lookup Maps
  const userMap = useMemo(() => {
    const map = new Map<string, User>();
    users.forEach((u) => map.set(u.id, u));
    return map;
  }, [users]);

  const teacherNameMap = useMemo(() => {
    const map = new Map<string, string>();
    teachers.forEach((t) => {
      const u = userMap.get(t.userId);
      map.set(t.id, u ? u.name : t.employeeNumber);
    });
    return map;
  }, [teachers, userMap]);

  // Homeroom Teacher
  const homeroomTeacher = useMemo(() => {
    if (!cls?.classTeacherId) return null;
    const t = teachers.find((tch) => tch.id === cls.classTeacherId);
    if (!t) return null;
    const u = userMap.get(t.userId);
    return {
      teacher: t,
      user: u,
      fullName: u ? u.name : t.employeeNumber,
    };
  }, [cls, teachers, userMap]);

  // Enriched Students
  const enrichedStudents: EnrichedStudentItem[] = useMemo(() => {
    return students.map((st) => {
      const u = userMap.get(st.userId);
      return {
        ...st,
        user: u,
        fullName: u ? u.name : st.admissionNumber,
      };
    });
  }, [students, userMap]);

  // Students with registered allergies
  const studentsWithAllergies = useMemo(() => {
    return enrichedStudents.filter((s) => (s.health?.allergies ?? []).length > 0);
  }, [enrichedStudents]);

  // Enriched Subjects
  const enrichedSubjects: EnrichedSubjectItem[] = useMemo(() => {
    return subjects.map((sub) => ({
      ...sub,
      teacherName: sub.teacherId ? teacherNameMap.get(sub.teacherId) ?? 'Unassigned' : 'Unassigned',
    }));
  }, [subjects, teacherNameMap]);

  // Statistics
  const totalEnrolled = students.length;
  const capacity = cls?.capacity ?? 30;
  const enrollmentPct = Math.min(100, Math.round((totalEnrolled / (capacity || 1)) * 100));
  const maleCount = students.filter((s) => s.gender === 'male').length;
  const femaleCount = students.filter((s) => s.gender === 'female').length;

  // Edit Class Handler
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cls) return;
    setFormError(null);

    const cap = parseInt(formCapacity, 10);
    if (isNaN(cap) || cap <= 0) {
      setFormError('Capacity must be a positive number.');
      return;
    }

    try {
      setIsSubmitting(true);
      const scope: Scope = { schoolId, campusId: formCampusId };
      const res = await updateClassWithValidation(
        cls.id,
        {
          campusId: formCampusId,
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

      setCls(res.class!);
      setCampus(campuses.find((c) => c.id === formCampusId) ?? null);
      showToast({
        type: 'success',
        title: 'Class Updated',
        message: `${res.class!.grade} - Section ${res.class!.section} updated successfully.`,
      });
      setIsEditModalOpen(false);
    } catch (err) {
      console.error('Failed to update class:', err);
      setFormError('An error occurred while updating the class.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Safe Deletion Handlers
  const handleDeleteClick = async () => {
    if (!cls) return;
    try {
      const scope: Scope = { schoolId, campusId: cls.campusId };
      const check = await canDeleteClass(cls.id, scope);

      if (!check.canDelete) {
        setBlockedDeleteNotice({
          isOpen: true,
          studentCount: check.studentCount,
          reason: check.reason ?? 'Class currently has enrolled students.',
        });
        return;
      }

      setIsConfirmDeleteOpen(true);
    } catch (err) {
      console.error('Error verifying deletion:', err);
      showToast({
        type: 'error',
        title: 'Verification Failed',
        message: 'Could not verify student enrollment.',
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!cls) return;
    try {
      setIsDeleting(true);
      const res = await safeDeleteClass(cls.id, { schoolId });
      if (!res.success) {
        showToast({
          type: 'error',
          title: 'Cannot Delete Class',
          message: res.error ?? 'Deletion rejected.',
        });
        return;
      }

      showToast({
        type: 'success',
        title: 'Class Deleted',
        message: `${cls.grade} - Section ${cls.section} has been deleted.`,
      });
      router.push('/admin/classes');
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
    }
  };

  // Student Roster Columns
  const studentColumns: TableColumn<EnrichedStudentItem>[] = [
    {
      key: 'rollNumber',
      header: 'Roll No',
      accessor: (s) => <span className="font-mono text-sm font-semibold">{s.rollNumber}</span>,
      isNumeric: true,
    },
    {
      key: 'name',
      header: 'Student Name',
      accessor: (s) => (
        <div className="flex items-center gap-3">
          <Avatar
            name={s.fullName}
            src={s.user?.avatarUrl}
            size="sm"
          />
          <div>
            <Link
              href={`/admin/students/${s.id}`}
              className="font-medium text-brand-navy hover:text-brand-navy-light transition-colors"
            >
              {s.fullName}
            </Link>
            <div className="text-xs text-neutral-500 font-mono">Adm: {s.admissionNumber}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'gender',
      header: 'Gender',
      accessor: (s) => (
        <span className="capitalize text-sm text-neutral-700">
          {s.gender}
        </span>
      ),
    },
    {
      key: 'health',
      header: 'Health & Allergies',
      accessor: (s) => {
        const allergies = s.health?.allergies ?? [];
        if (allergies.length === 0) {
          return <span className="text-xs text-neutral-500">None reported</span>;
        }
        return (
          <div className="flex flex-wrap items-center gap-1.5" data-testid="allergy-alert">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200"
              title={`Allergies: ${allergies.join(', ')}`}
            >
              <svg className="w-3 h-3 text-rose-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{allergies.join(', ')}</span>
            </span>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      accessor: (s) => <StatusBadge status={s.status === 'active' ? 'active' : 'inactive'} />,
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      accessor: (s) => (
        <Link href={`/admin/students/${s.id}`}>
          <Button size="sm" variant="ghost">
            View Profile
          </Button>
        </Link>
      ),
    },
  ];

  // Campus faculty for subject assignments
  const campusTeachers = useMemo(() => {
    if (!cls?.campusId) return teachers;
    return teachers.filter((t) => t.campusId === cls.campusId);
  }, [cls, teachers]);

  const handleBulkSuccess = (newlyAdded: Subject[]) => {
    setSubjects((prev) => [...prev, ...newlyAdded]);
  };

  const handleCreateCustomSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cls) return;
    setCustomError(null);

    if (!customSubjectName.trim()) {
      setCustomError('Please enter a subject name.');
      return;
    }
    if (!customSubjectCode.trim()) {
      setCustomError('Please enter a subject code.');
      return;
    }

    try {
      setIsCustomSubmitting(true);
      const created = await createSubject({
        schoolId,
        classId: cls.id,
        name: customSubjectName.trim(),
        code: customSubjectCode.trim().toUpperCase(),
        teacherId: customTeacherId || undefined,
      });

      setSubjects((prev) => [...prev, created]);
      showToast({
        type: 'success',
        title: 'Subject Added',
        message: `${created.name} (${created.code}) has been added to the curriculum.`,
      });

      setIsCustomSubjectModalOpen(false);
      setCustomSubjectName('');
      setCustomSubjectCode('');
      setCustomTeacherId('');
    } catch (err) {
      console.error('Failed to create custom subject:', err);
      setCustomError('An error occurred while creating the subject.');
    } finally {
      setIsCustomSubmitting(false);
    }
  };

  const handleOpenReassignSubject = (sub: Subject) => {
    setReassignSubject(sub);
    setNewSubjectTeacherId(sub.teacherId ?? '');
  };

  const handleSaveReassignSubject = async () => {
    if (!reassignSubject) return;
    try {
      setIsReassigningTeacher(true);
      const updated = await assignSubjectTeacher(
        reassignSubject.id,
        newSubjectTeacherId || null
      );
      setSubjects((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      showToast({
        type: 'success',
        title: 'Teacher Assigned',
        message: `Updated teacher for ${updated.name}.`,
      });
      setReassignSubject(null);
    } catch (err) {
      console.error('Failed to assign subject teacher:', err);
      showToast({
        type: 'error',
        title: 'Assignment Failed',
        message: 'Could not update subject teacher.',
      });
    } finally {
      setIsReassigningTeacher(false);
    }
  };

  const handleConfirmDeleteSubject = async () => {
    if (!subjectToDelete) return;
    try {
      setIsDeletingSubject(true);
      await deleteSubject(subjectToDelete.id);
      setSubjects((prev) => prev.filter((s) => s.id !== subjectToDelete.id));
      showToast({
        type: 'success',
        title: 'Subject Removed',
        message: `${subjectToDelete.name} removed from curriculum.`,
      });
      setSubjectToDelete(null);
    } catch (err) {
      console.error('Failed to delete subject:', err);
      showToast({
        type: 'error',
        title: 'Delete Failed',
        message: 'Could not remove subject.',
      });
    } finally {
      setIsDeletingSubject(false);
    }
  };

  // Subject Columns
  const subjectColumns: TableColumn<EnrichedSubjectItem>[] = [
    {
      key: 'code',
      header: 'Code',
      accessor: (sub) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-neutral-100 rounded text-neutral-800 border border-neutral-200">
          {sub.code}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Subject Name',
      accessor: (sub) => <span className="font-medium text-neutral-900">{sub.name}</span>,
    },
    {
      key: 'teacher',
      header: 'Subject Teacher',
      accessor: (sub) => (
        <div>
          {sub.teacherId ? (
            <span className="text-sm font-medium text-neutral-900">{sub.teacherName}</span>
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
      accessor: (sub) => (
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" variant="secondary" onClick={() => handleOpenReassignSubject(sub)}>
            Assign
          </Button>
          <Button size="sm" variant="danger" onClick={() => setSubjectToDelete(sub)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const tabItems: TabItem[] = [
    {
      id: 'roster',
      label: 'Student Roster',
      count: students.length,
    },
    {
      id: 'curriculum',
      label: 'Curriculum & Subjects',
      count: subjects.length,
    },
  ];

  if (isLoading && !cls) {
    return (
      <div className="p-8 text-center text-neutral-500">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-brand-navy border-t-transparent mb-2" />
        <p>Loading class details...</p>
      </div>
    );
  }

  if (!cls) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center">
        <h2 className="text-lg font-bold text-neutral-900">Class Not Found</h2>
        <p className="text-sm text-neutral-500 mt-1 mb-4">
          The requested class does not exist or has been removed.
        </p>
        <Link href="/admin/classes">
          <Button variant="secondary">Back to Classes</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Navigation Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/admin/classes"
            className="inline-flex items-center text-xs font-medium text-neutral-500 hover:text-brand-navy mb-2"
          >
            <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Classes Directory
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
              {cls.grade} - Section {cls.section}
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-800 border border-neutral-200">
              {campus?.name ?? 'Main Campus'}
            </span>
            {cls.room && (
              <span className="text-xs text-neutral-600 bg-neutral-50 px-2.5 py-0.5 rounded border border-neutral-200 font-mono">
                {cls.room}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setIsEditModalOpen(true)}>
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Class
          </Button>
          <Button variant="danger" onClick={handleDeleteClick}>
            Delete Class
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Enrolled Roster"
          value={`${totalEnrolled} / ${capacity}`}
          subtitle={`${enrollmentPct}% capacity filled`}
        />
        <StatCard
          label="Homeroom Teacher"
          value={homeroomTeacher?.fullName ?? 'Unassigned'}
          subtitle={homeroomTeacher?.teacher.department ?? 'No department'}
        />
        <StatCard
          label="Student Demographics"
          value={`${maleCount} Boys / ${femaleCount} Girls`}
          subtitle="Gender breakdown"
        />
        <StatCard
          label="Subjects"
          value={subjects.length}
          subtitle="Assigned curriculum courses"
        />
      </div>

      {/* Underline Tabs */}
      <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
        <div className="px-6 pt-4 border-b border-neutral-200">
          <Tabs
            items={tabItems}
            activeId={activeTab}
            onChange={setActiveTab}
          />
        </div>

        {/* Tab Content: Roster */}
        {activeTab === 'roster' && (
          <div>
            {studentsWithAllergies.length > 0 && (
              <div
                data-testid="class-allergy-banner"
                className="m-4 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 shadow-xs"
              >
                <div className="p-1 rounded-full bg-rose-100 text-rose-600 shrink-0 mt-0.5">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-rose-900">
                    {`Class Health Alert: ${studentsWithAllergies.length} Student${studentsWithAllergies.length === 1 ? '' : 's'} with Registered Allergies`}
                  </div>
                  <p className="text-xs text-rose-700 mt-0.5">
                    Critical medical notice: Please review allergy precautions before cafeteria meals, laboratory sessions, or field activities.
                  </p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {studentsWithAllergies.map((s) => (
                      <span
                        key={s.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white text-rose-900 text-xs border border-rose-200 shadow-2xs font-medium"
                      >
                        <span className="font-semibold">{s.fullName}:</span>
                        <span className="text-rose-700 font-normal">{(s.health?.allergies ?? []).join(', ')}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <Table<EnrichedStudentItem>
              columns={studentColumns}
              data={enrichedStudents}
              keyExtractor={(s) => s.id}
              emptyState={{
                title: 'No students enrolled',
                description: 'This class section currently has no enrolled students.',
              }}
            />
          </div>
        )}

        {/* Tab Content: Curriculum */}
        {activeTab === 'curriculum' && (
          <div>
            <div className="p-4 bg-neutral-50/70 border-b border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">Curriculum Course Schedule</h3>
                <p className="text-xs text-neutral-500">
                  Academic subjects, course codes, and assigned instructional faculty for this class.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setIsCustomSubjectModalOpen(true)}
                >
                  Add Custom Subject
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsTemplateModalOpen(true)}
                >
                  <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add from Template
                </Button>
              </div>
            </div>

            <Table<EnrichedSubjectItem>
              columns={subjectColumns}
              data={enrichedSubjects}
              keyExtractor={(s) => s.id}
              emptyState={{
                title: 'No subjects assigned',
                description: 'No academic subjects are currently scheduled for this class.',
                action: {
                  label: 'Add from Template',
                  onClick: () => setIsTemplateModalOpen(true),
                },
              }}
            />
          </div>
        )}
      </div>

      {/* Edit Class Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit Class: ${cls.grade} - ${cls.section}`}
        description="Update class information, room allocation, and homeroom teacher."
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button
              variant="secondary"
              onClick={() => setIsEditModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} isLoading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Room / Lab"
              placeholder="e.g. Room 204"
              value={formRoom}
              onChange={(e) => setFormRoom(e.target.value)}
            />

            <Select
              label="Homeroom Class Teacher"
              value={formClassTeacherId}
              onChange={(e) => setFormClassTeacherId(e.target.value)}
              options={[
                { value: '', label: 'None (Unassigned)' },
                ...teachers
                  .filter((t) => !formCampusId || t.campusId === formCampusId)
                  .map((t) => ({
                    value: t.id,
                    label: `${teacherNameMap.get(t.id) ?? t.employeeNumber} (${t.department})`,
                  })),
              ]}
            />
          </div>
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
              <p className="font-semibold">{cls.grade} - Section {cls.section}</p>
              <p className="mt-1">{blockedDeleteNotice.reason}</p>
            </div>
          </div>
          <p className="text-xs text-neutral-500">
            To delete this class safely, reassign or transfer the {blockedDeleteNotice.studentCount} enrolled student(s) to another class or section first.
          </p>
        </div>
      </Modal>

      {/* Safe Deletion Confirm Dialog */}
      <ConfirmDialog
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        recordName={`${cls.grade} - Section ${cls.section}`}
        actionType="delete"
        title={`Delete ${cls.grade} - Section ${cls.section}?`}
        message="This will permanently delete this class from the school platform. This action cannot be undone."
        confirmLabel="Delete Class"
        isLoading={isDeleting}
      />

      {/* Bulk Subject Template Modal */}
      <BulkSubjectTemplateModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        classInfo={cls}
        campusTeachers={campusTeachers}
        teacherNames={teacherNameMap}
        existingSubjects={subjects}
        onSuccess={handleBulkSuccess}
      />

      {/* Custom Subject Modal */}
      <Modal
        isOpen={isCustomSubjectModalOpen}
        onClose={() => setIsCustomSubjectModalOpen(false)}
        title="Add Custom Subject"
        description={`Create a custom subject offering for ${cls.grade} - ${cls.section}.`}
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button
              variant="secondary"
              onClick={() => setIsCustomSubjectModalOpen(false)}
              disabled={isCustomSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateCustomSubject} isLoading={isCustomSubmitting}>
              Add Subject
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateCustomSubject} className="space-y-4 py-2">
          {customError && (
            <div className="p-3 text-sm rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
              {customError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Subject Name *"
              placeholder="e.g. Robotics & AI"
              value={customSubjectName}
              onChange={(e) => setCustomSubjectName(e.target.value)}
              required
            />
            <Input
              label="Course Code *"
              placeholder="e.g. ROB-8"
              value={customSubjectCode}
              onChange={(e) => setCustomSubjectCode(e.target.value)}
              required
            />
          </div>

          <Select
            label="Subject Teacher"
            value={customTeacherId}
            onChange={(e) => setCustomTeacherId(e.target.value)}
            options={[
              { value: '', label: 'None (Leave Unassigned)' },
              ...campusTeachers.map((t) => ({
                value: t.id,
                label: `${teacherNameMap.get(t.id) ?? t.employeeNumber} (${t.department})`,
              })),
            ]}
          />
        </form>
      </Modal>

      {/* Reassign Subject Teacher Modal */}
      <Modal
        isOpen={Boolean(reassignSubject)}
        onClose={() => setReassignSubject(null)}
        title="Assign Subject Teacher"
        description={reassignSubject ? `Select teacher for ${reassignSubject.name} (${reassignSubject.code}).` : ''}
        size="md"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button
              variant="secondary"
              onClick={() => setReassignSubject(null)}
              disabled={isReassigningTeacher}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveReassignSubject} isLoading={isReassigningTeacher}>
              Save Teacher
            </Button>
          </div>
        }
      >
        <div className="py-2 space-y-4">
          <Select
            label="Subject Teacher"
            value={newSubjectTeacherId}
            onChange={(e) => setNewSubjectTeacherId(e.target.value)}
            options={[
              { value: '', label: 'None (Unassigned)' },
              ...campusTeachers.map((t) => ({
                value: t.id,
                label: `${teacherNameMap.get(t.id) ?? t.employeeNumber} (${t.department})`,
              })),
            ]}
          />
        </div>
      </Modal>

      {/* Delete Subject Confirm Dialog */}
      <ConfirmDialog
        isOpen={Boolean(subjectToDelete)}
        onClose={() => setSubjectToDelete(null)}
        onConfirm={handleConfirmDeleteSubject}
        recordName={subjectToDelete ? `${subjectToDelete.name} (${subjectToDelete.code})` : 'Subject'}
        actionType="delete"
        title={subjectToDelete ? `Remove ${subjectToDelete.name}?` : 'Remove Subject?'}
        message="This will delete the subject from this class curriculum and unassign instructional faculty."
        confirmLabel="Remove Subject"
        isLoading={isDeletingSubject}
      />
    </div>
  );
}
