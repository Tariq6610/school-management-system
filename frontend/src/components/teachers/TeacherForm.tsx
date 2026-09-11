'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Campus, ID, Scope } from '@/types';
import { createTeacher, listTeachers } from '@/lib/repositories/teachers';
import { createUser, listUsers } from '@/lib/repositories/users';
import { listCampuses } from '@/lib/repositories/campuses';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';

export interface TeacherFormProps {
  initialCampuses?: Campus[];
}

export function TeacherForm({ initialCampuses }: TeacherFormProps) {
  const router = useRouter();
  const { session } = useSession();
  const { showToast } = useToast();
  const schoolId = session?.schoolId ?? 'sch_main';

  const [campuses, setCampuses] = useState<Campus[]>(initialCampuses ?? []);
  const [isLoading, setIsLoading] = useState(!initialCampuses);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [campusId, setCampusId] = useState<ID>(initialCampuses?.[0]?.id ?? 'cmp_main');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [department, setDepartment] = useState('Mathematics');
  const [joinedAt, setJoinedAt] = useState(new Date().toISOString().split('T')[0]);

  // Validation Errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const scope: Scope = { schoolId };
      const [cList, existingTeachers] = await Promise.all([
        listCampuses(scope),
        listTeachers(scope),
      ]);

      setCampuses(cList);
      if (cList.length > 0 && !campusId) {
        setCampusId(cList[0].id);
      }

      // Auto-generate employee number
      const nextNum = existingTeachers.length + 1;
      setEmployeeNumber(`EMP-2026-${String(nextNum).padStart(3, '0')}`);
    } catch (err) {
      console.error('Failed to load campuses for teacher form:', err);
    } finally {
      setIsLoading(false);
    }
  }, [schoolId, campusId]);

  useEffect(() => {
    let ignore = false;
    if (!initialCampuses) {
      Promise.resolve().then(() => {
        if (!ignore) {
          loadData();
        }
      });
    }
    return () => {
      ignore = true;
    };
  }, [loadData, initialCampuses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) newErrors.name = 'Faculty member name is required.';
    if (!email.trim()) newErrors.email = 'Faculty official email is required.';
    if (!employeeNumber.trim()) newErrors.employeeNumber = 'Employee ID is required.';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      showToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Please complete all required fields.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setErrors({});

      // Check duplicate employee number
      const allTeachers = await listTeachers({ schoolId });
      const dupTeacher = allTeachers.find(
        (t) => t.employeeNumber.trim().toLowerCase() === employeeNumber.trim().toLowerCase()
      );

      if (dupTeacher) {
        const users = await listUsers({ schoolId }, { role: 'teacher' });
        const existingUser = users.find((u) => u.id === dupTeacher.userId);
        const dupMsg = `Employee ID "${employeeNumber}" is already assigned to ${
          existingUser ? existingUser.name : 'another faculty member'
        }. Duplicate IDs are not allowed.`;
        setErrors({ employeeNumber: dupMsg });
        showToast({
          type: 'error',
          title: 'Duplicate Employee ID',
          message: dupMsg,
        });
        setIsSubmitting(false);
        return;
      }

      // 1. Create User
      const user = await createUser({
        schoolId,
        campusId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: 'teacher',
        phone: phone.trim() || undefined,
        status: 'active',
      });

      // 2. Create Teacher
      const teacher = await createTeacher({
        schoolId,
        campusId,
        userId: user.id,
        employeeNumber: employeeNumber.trim().toUpperCase(),
        department,
        subjectIds: [],
        joinedAt,
      });

      showToast({
        type: 'success',
        title: 'Faculty Enrolled',
        message: `Faculty record for ${name} (${teacher.employeeNumber}) created successfully.`,
      });

      router.push(`/admin/teachers/${teacher.id}`);
    } catch (err) {
      console.error('Failed to create teacher:', err);
      showToast({
        type: 'error',
        title: 'Enrollment Error',
        message: 'Could not create faculty profile. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <div className="h-64 bg-surface rounded-card border border-rule motion-safe:animate-pulse p-6">
          <div className="h-8 bg-ink-100 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-ink-50 rounded w-1/2"></div>
            <div className="h-4 bg-ink-50 rounded w-1/4"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link
          href="/admin/teachers"
          className="text-xs text-brand-700 hover:underline flex items-center gap-1 font-medium mb-1"
        >
          ← Return to Faculty Directory
        </Link>
        <h1 className="text-page-title font-semibold text-ink-900">Add New Faculty Member</h1>
        <p className="text-secondary-meta text-ink-500">
          Enroll a teacher into the institutional faculty registry.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-surface rounded-card border border-rule p-6 space-y-6"
      >
        <div className="border-b border-rule pb-3">
          <h2 className="text-section-title font-semibold text-ink-900">Identity & Placement</h2>
          <p className="text-secondary-meta text-ink-500">
            Personal identity and assigned institutional department.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Input
              label="Full Name *"
              placeholder="e.g. Prof. Sana Tariq"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              required
            />
          </div>

          <Input
            label="Email Address *"
            type="email"
            placeholder="sana.tariq@abcschool.pk"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            required
          />

          <Input
            label="Phone Number"
            placeholder="+92 300 1234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />

          <Select
            label="Campus *"
            value={campusId}
            onChange={(e) => setCampusId(e.target.value)}
            options={campuses.map((c) => ({ value: c.id, label: c.name }))}
          />

          <Select
            label="Department *"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            options={[
              { value: 'Mathematics', label: 'Mathematics' },
              { value: 'Sciences', label: 'Sciences' },
              { value: 'Languages', label: 'Languages' },
              { value: 'Social Studies', label: 'Social Studies' },
              { value: 'Computer Science', label: 'Computer Science' },
              { value: 'Arts & Physical Education', label: 'Arts & Physical Education' },
            ]}
          />

          <Input
            label="Employee ID *"
            placeholder="EMP-2026-001"
            value={employeeNumber}
            onChange={(e) => setEmployeeNumber(e.target.value)}
            error={errors.employeeNumber}
            required
          />

          <DatePicker
            label="Date of Joining"
            value={joinedAt}
            onChange={(e) => setJoinedAt(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-rule">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push('/admin/teachers')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Create Faculty Record
          </Button>
        </div>
      </form>
    </div>
  );
}
