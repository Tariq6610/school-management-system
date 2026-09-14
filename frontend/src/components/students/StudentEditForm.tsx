'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Campus, Class, ID, Scope, Student, StudentStatus, User } from '@/types';
import { getStudent, updateStudent } from '@/lib/repositories/students';
import { getUser, updateUser } from '@/lib/repositories/users';
import { listCampuses } from '@/lib/repositories/campuses';
import { listClasses } from '@/lib/repositories/classes';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { DatePicker } from '@/components/ui/DatePicker';
import { Textarea } from '@/components/ui/Textarea';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { NavIcon } from '@/components/shell/NavIcon';

export interface StudentEditFormProps {
  studentId: string;
  initialStudent?: Student | null;
  initialUser?: User | null;
  initialCampuses?: Campus[];
  initialClasses?: Class[];
}

export function StudentEditForm({
  studentId,
  initialStudent,
  initialUser,
  initialCampuses,
  initialClasses,
}: StudentEditFormProps) {
  const router = useRouter();
  const { session } = useSession();
  const { showToast } = useToast();
  const schoolId = session?.schoolId ?? 'sch_main';

  // Loaded state
  const [student, setStudent] = useState<Student | null>(initialStudent ?? null);
  const [user, setUser] = useState<User | null>(initialUser ?? null);
  const [campuses, setCampuses] = useState<Campus[]>(initialCampuses ?? []);
  const [classes, setClasses] = useState<Class[]>(initialClasses ?? []);
  const [isLoading, setIsLoading] = useState(!initialStudent);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [name, setName] = useState(initialUser?.name ?? '');
  const [email, setEmail] = useState(initialUser?.email ?? '');
  const [phone, setPhone] = useState(initialUser?.phone ?? '');
  const [status, setStatus] = useState<StudentStatus>(initialStudent?.status ?? 'active');
  const [dob, setDob] = useState(initialStudent?.dob ?? '');
  const [gender, setGender] = useState<'male' | 'female'>(initialStudent?.gender ?? 'male');
  const [bloodGroup, setBloodGroup] = useState(initialStudent?.health?.bloodGroup ?? 'A+');
  const [address, setAddress] = useState(initialStudent?.address ?? '');
  const [campusId, setCampusId] = useState<ID>(initialStudent?.campusId ?? 'cmp_main');
  const [classId, setClassId] = useState<ID>(initialStudent?.classId ?? '');
  const [admissionNumber, setAdmissionNumber] = useState(initialStudent?.admissionNumber ?? '');
  const [rollNumber, setRollNumber] = useState(initialStudent?.rollNumber ?? '');
  const [allergiesText, setAllergiesText] = useState(
    initialStudent?.health?.allergies?.join(', ') ?? ''
  );
  const [conditionsText, setConditionsText] = useState(
    initialStudent?.health?.conditions?.join(', ') ?? ''
  );
  const [medicationsText, setMedicationsText] = useState(
    initialStudent?.health?.medications?.join(', ') ?? ''
  );
  const [emergencyPhone, setEmergencyPhone] = useState(
    initialStudent?.health?.emergencyContacts?.[0]?.phone ?? ''
  );

  // Status Change Confirmation Dialog
  const [showStatusConfirm, setShowStatusConfirm] = useState(false);

  // Load data if not preloaded
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const s = await getStudent(studentId);
      if (!s) {
        showToast({
          type: 'error',
          title: 'Student not found',
          message: 'Could not find the specified student record.',
        });
        setIsLoading(false);
        return;
      }

      const scope: Scope = { schoolId, campusId: s.campusId };
      const [u, campusList, classList] = await Promise.all([
        getUser(s.userId),
        listCampuses(scope),
        listClasses(scope),
      ]);

      setStudent(s);
      setUser(u);
      setCampuses(campusList);
      setClasses(classList);

      // Populate form
      setName(u?.name ?? '');
      setEmail(u?.email ?? '');
      setPhone(u?.phone ?? '');
      setStatus(s.status);
      setDob(s.dob);
      setGender(s.gender);
      setBloodGroup(s.health?.bloodGroup ?? 'A+');
      setAddress(s.address);
      setCampusId(s.campusId);
      setClassId(s.classId);
      setAdmissionNumber(s.admissionNumber);
      setRollNumber(s.rollNumber);
      setAllergiesText(s.health?.allergies?.join(', ') ?? '');
      setConditionsText(s.health?.conditions?.join(', ') ?? '');
      setMedicationsText(s.health?.medications?.join(', ') ?? '');
      setEmergencyPhone(s.health?.emergencyContacts?.[0]?.phone ?? '');
    } catch (err) {
      console.error('Failed to load student for editing:', err);
      showToast({
        type: 'error',
        title: 'Error loading student',
        message: 'Failed to retrieve profile data.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [studentId, schoolId, showToast]);

  useEffect(() => {
    let ignore = false;
    if (!initialStudent) {
      Promise.resolve().then(() => {
        if (!ignore) {
          loadData();
        }
      });
    }
    return () => {
      ignore = true;
    };
  }, [loadData, initialStudent]);

  // Classes filtered by selected campus
  const filteredClasses = classes.filter((c) => c.campusId === campusId);

  // Submission handler
  const handleSave = async () => {
    if (!name.trim()) {
      showToast({
        type: 'error',
        title: 'Missing name',
        message: 'Student full name cannot be blank.',
      });
      return;
    }

    // Check if status changed from active to inactive
    if (student?.status === 'active' && status !== 'active' && !showStatusConfirm) {
      setShowStatusConfirm(true);
      return;
    }

    try {
      setIsSubmitting(true);

      // Parse comma-separated health fields
      const allergies = allergiesText
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);
      const conditions = conditionsText
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
      const medications = medicationsText
        .split(',')
        .map((m) => m.trim())
        .filter(Boolean);

      // Update User account
      if (student?.userId) {
        await updateUser(student.userId, {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          status: status === 'active' ? 'active' : 'inactive',
        });
      }

      // Preserve existing emergency contacts while updating primary phone if provided
      const existingContacts = student?.health?.emergencyContacts ?? [];
      const updatedContacts = existingContacts.map((contact, idx) =>
        idx === 0 && emergencyPhone.trim() ? { ...contact, phone: emergencyPhone.trim() } : contact
      );

      // Update Student record
      await updateStudent(studentId, {
        campusId,
        classId,
        admissionNumber: admissionNumber.trim(),
        rollNumber: rollNumber.trim(),
        dob,
        gender,
        address: address.trim(),
        status,
        health: {
          ...student?.health,
          allergies,
          conditions,
          medications,
          bloodGroup,
          emergencyContacts: updatedContacts,
          authorisedPickup: student?.health?.authorisedPickup ?? [],
        },
      });

      showToast({
        type: 'success',
        title: 'Profile Updated',
        message: `Student ${name.trim()} successfully updated (Status: ${status}).`,
      });

      router.push(`/admin/students/${studentId}`);
    } catch (err) {
      console.error('Failed to update student profile:', err);
      showToast({
        type: 'error',
        title: 'Save Failed',
        message: 'Could not save student changes. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
      setShowStatusConfirm(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-8">
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
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header & Back Link */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/admin/students/${studentId}`}
              className="text-xs text-brand-700 hover:underline flex items-center gap-1 font-medium"
            >
              ← Return to Profile
            </Link>
          </div>
          <h1 className="text-page-title font-semibold text-ink-900">
            Edit Student Profile: {user?.name ?? 'Student'}
          </h1>
          <p className="text-secondary-meta text-ink-500">
            Admission No: <span className="font-mono">{student?.admissionNumber}</span> · Current
            Status: <span className="capitalize font-semibold">{student?.status}</span>
          </p>
        </div>

        <StatusBadge
          status={status === 'active' ? 'active' : 'inactive'}
          label={status.toUpperCase()}
          size="md"
        />
      </div>

      {/* STATUS LIFECYCLE MANAGEMENT SECTION */}
      <div className="bg-surface rounded-card border border-rule p-6 space-y-4">
        <div className="border-b border-rule pb-3">
          <h2 className="text-section-title font-semibold text-ink-900">
            Student Status Lifecycle
          </h2>
          <p className="text-secondary-meta text-ink-500">
            Controls active enrollment, attendance eligibility, and fee billing runs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          <Select
            label="Enrollment Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as StudentStatus)}
            options={[
              { value: 'active', label: 'Active (Regularly Enrolled)' },
              { value: 'transferred', label: 'Transferred (Left for another school)' },
              { value: 'graduated', label: 'Graduated (Completed program)' },
              { value: 'withdrawn', label: 'Withdrawn (Left institution)' },
            ]}
          />

          {/* Contextual lifecycle impact alert */}
          <div
            className={`p-4 rounded border text-xs leading-relaxed ${
              status === 'active'
                ? 'bg-present/10 border-present/30 text-present'
                : 'bg-absent/10 border-absent/30 text-absent'
            }`}
          >
            <div className="font-bold mb-1 flex items-center gap-1.5">
              {status === 'active' ? (
                <>
                  <NavIcon name="check-circle" className="w-4 h-4" /> Active Enrollment
                </>
              ) : (
                <>
                  <NavIcon name="alert-triangle" className="w-4 h-4" /> Inactive Lifecycle Status
                </>
              )}
            </div>
            {status === 'active' && (
              <p>
                Student is fully active. Included in daily attendance rosters, regular academic
                reporting, and monthly billing fee runs.
              </p>
            )}
            {status === 'transferred' && (
              <p>
                <strong>Acceptance Criteria Rule:</strong> Transferred students are strictly
                excluded from future daily attendance roll calls and bulk invoice generation. Past
                transcripts and fee invoices remain permanently archived.
              </p>
            )}
            {status === 'graduated' && (
              <p>
                <strong>Acceptance Criteria Rule:</strong> Graduated students are strictly excluded
                from ongoing attendance rosters and monthly fee runs. Graduation records and alumni
                data remain preserved.
              </p>
            )}
            {status === 'withdrawn' && (
              <p>
                <strong>Acceptance Criteria Rule:</strong> Withdrawn students are strictly excluded
                from attendance and billing runs. Historical payments and attendance records remain
                accessible for audits.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 1: PERSONAL DETAILS */}
      <div className="bg-surface rounded-card border border-rule p-6 space-y-4">
        <div className="border-b border-rule pb-3">
          <h2 className="text-section-title font-semibold text-ink-900">Personal Information</h2>
          <p className="text-secondary-meta text-ink-500">Student identity and direct contact.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Full Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Student legal name"
            required
          />
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="student@school.pk"
          />
          <Input
            label="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+92 300 1234567"
          />
          <DatePicker
            label="Date of Birth"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
          />
          <Select
            label="Gender"
            value={gender}
            onChange={(e) => setGender(e.target.value as 'male' | 'female')}
            options={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
            ]}
          />
          <Select
            label="Blood Group"
            value={bloodGroup}
            onChange={(e) => setBloodGroup(e.target.value)}
            options={[
              { value: 'A+', label: 'A+' },
              { value: 'A-', label: 'A-' },
              { value: 'B+', label: 'B+' },
              { value: 'B-', label: 'B-' },
              { value: 'AB+', label: 'AB+' },
              { value: 'AB-', label: 'AB-' },
              { value: 'O+', label: 'O+' },
              { value: 'O-', label: 'O-' },
            ]}
          />
          <div className="md:col-span-2">
            <Textarea
              label="Residential Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full home address"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* SECTION 2: ACADEMIC DETAILS */}
      <div className="bg-surface rounded-card border border-rule p-6 space-y-4">
        <div className="border-b border-rule pb-3">
          <h2 className="text-section-title font-semibold text-ink-900">Academic Placement</h2>
          <p className="text-secondary-meta text-ink-500">
            Campus assignment, enrolled class, and institutional identifiers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Campus"
            value={campusId}
            onChange={(e) => {
              setCampusId(e.target.value);
              const matchingClasses = classes.filter((c) => c.campusId === e.target.value);
              if (matchingClasses.length > 0) {
                setClassId(matchingClasses[0].id);
              }
            }}
            options={campuses.map((c) => ({ value: c.id, label: c.name }))}
          />
          <Select
            label="Class & Section"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            options={filteredClasses.map((c) => ({
              value: c.id,
              label: `${c.grade} - Section ${c.section}`,
            }))}
          />
          <Input
            label="Admission Number"
            value={admissionNumber}
            onChange={(e) => setAdmissionNumber(e.target.value)}
            placeholder="ADM-2026-XXXX"
          />
          <Input
            label="Roll Number"
            value={rollNumber}
            onChange={(e) => setRollNumber(e.target.value)}
            placeholder="01"
          />
        </div>
      </div>

      {/* SECTION 3: HEALTH & SAFETY */}
      <div className="bg-surface rounded-card border border-rule p-6 space-y-4">
        <div className="border-b border-rule pb-3">
          <h2 className="text-section-title font-semibold text-ink-900">Health & Safety Protocols</h2>
          <p className="text-secondary-meta text-ink-500">
            Emergency contact, medical conditions, and critical allergy warnings.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Emergency Contact Phone"
            value={emergencyPhone}
            onChange={(e) => setEmergencyPhone(e.target.value)}
            placeholder="+92 300 9876543"
          />
          <Input
            label="Allergies (comma-separated)"
            value={allergiesText}
            onChange={(e) => setAllergiesText(e.target.value)}
            placeholder="Peanuts, Penicillin, Dust"
          />
          <Input
            label="Chronic Conditions (comma-separated)"
            value={conditionsText}
            onChange={(e) => setConditionsText(e.target.value)}
            placeholder="Asthma, Diabetes"
          />
          <Input
            label="Medications (comma-separated)"
            value={medicationsText}
            onChange={(e) => setMedicationsText(e.target.value)}
            placeholder="Inhaler as needed"
          />
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-rule">
        <Button
          variant="secondary"
          onClick={() => router.push(`/admin/students/${studentId}`)}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave} isLoading={isSubmitting}>
          Save Profile Changes
        </Button>
      </div>

      {/* CONFIRM STATUS DECOMMISSIONING DIALOG */}
      <ConfirmDialog
        isOpen={showStatusConfirm}
        onClose={() => setShowStatusConfirm(false)}
        onConfirm={handleSave}
        recordName={user?.name ?? 'this student'}
        actionType="warning"
        title="Confirm Student Status Change"
        message={`You are setting ${
          user?.name ?? 'this student'
        }'s status to "${status.toUpperCase()}". Per institutional rules, this will strictly EXCLUDE them from daily attendance roll calls and automated monthly fee billing runs. Past records remain preserved. Proceed?`}
        confirmLabel={`Set to ${status.toUpperCase()}`}
      />
    </div>
  );
}
