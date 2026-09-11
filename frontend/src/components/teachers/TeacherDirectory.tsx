'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Campus, Class, ID, Scope, Subject, Teacher, User } from '@/types';
import { listTeachers } from '@/lib/repositories/teachers';
import { listUsers } from '@/lib/repositories/users';
import { listCampuses } from '@/lib/repositories/campuses';
import { listSubjects } from '@/lib/repositories/subjects';
import { listClasses } from '@/lib/repositories/classes';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Avatar } from '@/components/ui/Avatar';
import { Table, TableColumn } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';

export interface EnrichedTeacher extends Teacher {
  user?: User;
  campusName: string;
  assignedSubjects: Subject[];
  assignedClasses: { classInfo: Class; isClassTeacher: boolean }[];
}

export interface TeacherDirectoryProps {
  initialTeachers?: Teacher[];
  initialUsers?: User[];
  initialCampuses?: Campus[];
  initialSubjects?: Subject[];
  initialClasses?: Class[];
}

export function TeacherDirectory({
  initialTeachers,
  initialUsers,
  initialCampuses,
  initialSubjects,
  initialClasses,
}: TeacherDirectoryProps) {
  const router = useRouter();
  const { session } = useSession();
  const { showToast } = useToast();
  const schoolId = session?.schoolId ?? 'sch_main';

  // Loaded raw state
  const [teachers, setTeachers] = useState<Teacher[]>(initialTeachers ?? []);
  const [users, setUsers] = useState<User[]>(initialUsers ?? []);
  const [campuses, setCampuses] = useState<Campus[]>(initialCampuses ?? []);
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects ?? []);
  const [classes, setClasses] = useState<Class[]>(initialClasses ?? []);
  const [isLoading, setIsLoading] = useState(!initialTeachers);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCampus, setSelectedCampus] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const scope: Scope = { schoolId };
      const [tList, uList, cList, sList, clsList] = await Promise.all([
        listTeachers(scope),
        listUsers(scope, { role: 'teacher' }),
        listCampuses(scope),
        listSubjects(scope),
        listClasses(scope),
      ]);

      setTeachers(tList);
      setUsers(uList);
      setCampuses(cList);
      setSubjects(sList);
      setClasses(clsList);
    } catch (err) {
      console.error('Failed to load teachers directory:', err);
      showToast({
        type: 'error',
        title: 'Error loading faculty',
        message: 'Could not fetch faculty records.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [schoolId, showToast]);

  useEffect(() => {
    let ignore = false;
    if (!initialTeachers) {
      Promise.resolve().then(() => {
        if (!ignore) {
          loadData();
        }
      });
    }
    return () => {
      ignore = true;
    };
  }, [loadData, initialTeachers]);

  // Enrich teachers with user names, assigned subjects, and assigned classes
  const enrichedTeachers: EnrichedTeacher[] = useMemo(() => {
    const userMap = new Map<ID, User>();
    users.forEach((u) => userMap.set(u.id, u));

    const campusMap = new Map<ID, string>();
    campuses.forEach((c) => campusMap.set(c.id, c.name));

    return teachers.map((teacher) => {
      const u = userMap.get(teacher.userId);
      const teacherSubjects = subjects.filter((s) => s.teacherId === teacher.id);
      const teacherClassIds = new Set<ID>(teacherSubjects.map((s) => s.classId));

      const assignedClasses: { classInfo: Class; isClassTeacher: boolean }[] = [];
      for (const cls of classes) {
        const isClassTeacher = cls.classTeacherId === teacher.id;
        const isSubjectTeacher = teacherClassIds.has(cls.id);
        if (isClassTeacher || isSubjectTeacher) {
          assignedClasses.push({ classInfo: cls, isClassTeacher });
        }
      }

      return {
        ...teacher,
        user: u,
        campusName: campusMap.get(teacher.campusId) ?? 'Campus',
        assignedSubjects: teacherSubjects,
        assignedClasses,
      };
    });
  }, [teachers, users, campuses, subjects, classes]);

  // Filtered teachers
  const filteredTeachers = useMemo(() => {
    return enrichedTeachers.filter((t) => {
      // Campus filter
      if (selectedCampus !== 'all' && t.campusId !== selectedCampus) return false;

      // Department filter
      if (selectedDepartment !== 'all' && t.department !== selectedDepartment) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = t.user?.name.toLowerCase().includes(q) ?? false;
        const empMatch = t.employeeNumber.toLowerCase().includes(q);
        const emailMatch = t.user?.email.toLowerCase().includes(q) ?? false;
        const subjectMatch = t.assignedSubjects.some((s) => s.name.toLowerCase().includes(q));
        if (!nameMatch && !empMatch && !emailMatch && !subjectMatch) return false;
      }

      return true;
    });
  }, [enrichedTeachers, selectedCampus, selectedDepartment, searchQuery]);

  // Pagination
  const paginatedTeachers = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTeachers.slice(start, start + pageSize);
  }, [filteredTeachers, currentPage, pageSize]);

  // Unique departments for filter dropdown
  const departments = useMemo(() => {
    const set = new Set<string>();
    teachers.forEach((t) => {
      if (t.department) set.add(t.department);
    });
    return Array.from(set).sort();
  }, [teachers]);

  // Table Columns
  const columns: TableColumn<EnrichedTeacher>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Faculty Member',
        accessor: (t) => (
          <div
            className="flex items-center gap-3 cursor-pointer hover:opacity-80"
            onClick={() => router.push(`/admin/teachers/${t.id}`)}
          >
            <Avatar name={t.user?.name ?? 'Teacher'} size="sm" />
            <div>
              <div className="font-semibold text-ink-900 text-sm">{t.user?.name ?? 'Teacher'}</div>
              <div className="text-[11px] text-ink-500">{t.user?.email ?? 'faculty@school.pk'}</div>
            </div>
          </div>
        ),
      },
      {
        key: 'employeeNumber',
        header: 'Employee ID',
        accessor: (t) => (
          <span className="font-mono text-xs font-semibold text-ink-800">
            {t.employeeNumber}
          </span>
        ),
      },
      {
        key: 'campus',
        header: 'Campus',
        accessor: (t) => <span className="text-xs text-ink-700">{t.campusName}</span>,
      },
      {
        key: 'department',
        header: 'Department',
        accessor: (t) => (
          <span className="text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-800 border border-brand-200 font-medium">
            {t.department}
          </span>
        ),
      },
      {
        key: 'assignedSubjects',
        header: 'Assigned Subjects',
        accessor: (t) => (
          <div className="flex flex-wrap gap-1 max-w-xs">
            {t.assignedSubjects.length > 0 ? (
              t.assignedSubjects.map((s) => (
                <span
                  key={s.id}
                  className="text-[11px] px-1.5 py-0.5 rounded bg-surface-subtle border border-rule text-ink-800 font-medium"
                  title={`${s.name} (${s.code})`}
                >
                  {s.code}
                </span>
              ))
            ) : (
              <span className="text-xs text-ink-400 italic">None assigned</span>
            )}
          </div>
        ),
      },
      {
        key: 'assignedClasses',
        header: 'Assigned Classes',
        accessor: (t) => (
          <div className="flex flex-wrap gap-1 max-w-xs">
            {t.assignedClasses.length > 0 ? (
              t.assignedClasses.map((ac) => (
                <span
                  key={ac.classInfo.id}
                  className={`text-[11px] px-1.5 py-0.5 rounded border font-medium ${
                    ac.isClassTeacher
                      ? 'bg-brand-50 text-brand-800 border-brand-200 font-bold'
                      : 'bg-surface-subtle text-ink-800 border-rule'
                  }`}
                  title={ac.isClassTeacher ? 'Class / Homeroom Teacher' : 'Subject Teacher'}
                >
                  {ac.classInfo.grade}-{ac.classInfo.section}
                  {ac.isClassTeacher && ' ★'}
                </span>
              ))
            ) : (
              <span className="text-xs text-ink-400 italic">None assigned</span>
            )}
          </div>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        accessor: (t) => (
          <Link
            href={`/admin/teachers/${t.id}`}
            className="text-xs font-semibold text-brand-700 hover:underline inline-flex items-center gap-1"
          >
            Profile →
          </Link>
        ),
      },
    ],
    [router]
  );

  return (
    <div className="space-y-6">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-page-title font-semibold text-ink-900">Faculty & Staff Directory</h1>
          <p className="text-secondary-meta text-ink-500">
            {filteredTeachers.length} faculty member{filteredTeachers.length === 1 ? '' : 's'}{' '}
            registered across departments.
          </p>
        </div>

        <Link href="/admin/teachers/new">
          <Button variant="primary">
            + Add New Faculty
          </Button>
        </Link>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-surface rounded-card border border-rule p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <Input
            label="Search Faculty"
            placeholder="Search by name, employee ID, or subject..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />

          <Select
            label="Campus Filter"
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
            label="Department Filter"
            value={selectedDepartment}
            onChange={(e) => {
              setSelectedDepartment(e.target.value);
              setCurrentPage(1);
            }}
            options={[
              { value: 'all', label: 'All Departments' },
              ...departments.map((d) => ({ value: d, label: d })),
            ]}
          />
        </div>
      </div>

      {/* Faculty Table */}
      <div className="bg-surface rounded-card border border-rule overflow-hidden">
        <Table<EnrichedTeacher>
          columns={columns}
          data={paginatedTeachers}
          isLoading={isLoading}
          emptyState={{
            title: 'No faculty members found',
            description: 'No teacher records match the selected search or department filters.',
          }}
        />

        {filteredTeachers.length > pageSize && (
          <div className="p-4 border-t border-rule flex justify-center">
            <Pagination
              page={currentPage}
              pageSize={pageSize}
              totalItems={filteredTeachers.length}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
