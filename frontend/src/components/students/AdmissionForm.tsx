'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Campus,
  Class,
  EmergencyContact,
  ID,
  PickupPerson,
  Scope,
} from '@/types';
import { listCampuses } from '@/lib/repositories/campuses';
import { listClasses } from '@/lib/repositories/classes';
import { listStudents, createStudent } from '@/lib/repositories/students';
import { listUsers, createUser } from '@/lib/repositories/users';
import { listParents, createParent } from '@/lib/repositories/parents';
import { createStudentParent } from '@/lib/repositories/studentParents';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';

interface EnrichedParentOption {
  parentId: ID;
  userId: ID;
  name: string;
  phone: string;
}

export function AdmissionForm() {
  const router = useRouter();
  const { session } = useSession();
  const { showToast } = useToast();
  const schoolId = session?.schoolId ?? 'sch_main';

  // Master data
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [existingParents, setExistingParents] = useState<EnrichedParentOption[]>([]);

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Section 1: Personal
  const [name, setName] = useState('');
  const [dob, setDob] = useState('2014-05-15');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [bloodGroup, setBloodGroup] = useState('B+');
  const [photoUrl, setPhotoUrl] = useState('');

  // Section 2: Academic
  const [campusId, setCampusId] = useState('');
  const [classId, setClassId] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [admissionDate, setAdmissionDate] = useState('2026-09-01');
  const [admissionNumber, setAdmissionNumber] = useState('');

  // Section 3: Address & Contact
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Section 4: Parent or Guardian
  const [parentMode, setParentMode] = useState<'new' | 'existing'>('new');
  const [selectedParentId, setSelectedParentId] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentOccupation, setParentOccupation] = useState('');
  const [relationship, setRelationship] = useState<'father' | 'mother' | 'guardian'>('father');
  const [isPrimaryParent, setIsPrimaryParent] = useState(true);

  // Section 5: Health & Safety
  const [allergyInput, setAllergyInput] = useState('');
  const [allergies, setAllergies] = useState<string[]>([]);
  const [conditions, setConditions] = useState('');
  const [medications, setMedications] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [doctorPhone, setDoctorPhone] = useState('');

  // Emergency Contacts (At least 1 required)
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([
    {
      name: '',
      relationship: 'Father',
      phone: '',
      priority: 1,
    },
  ]);

  // Authorised Pickup Persons
  const [pickupPersons, setPickupPersons] = useState<
    Omit<PickupPerson, 'addedBy' | 'addedAt'>[]
  >([]);
  const [pickupName, setPickupName] = useState('');
  const [pickupRelation, setPickupRelation] = useState('');
  const [pickupPhone, setPickupPhone] = useState('');

  // Section 6: Documents
  const [documentFiles, setDocumentFiles] = useState<string[]>([
    'B-Form / Birth Certificate',
    'Previous School Leaving Certificate',
  ]);
  const [newDocName, setNewDocName] = useState('');

  // Generate auto admission number
  const generateAdmissionNumber = useCallback(() => {
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `ADM-${year}-${rand}`;
  }, []);

  // Load master data
  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const scope: Scope = { schoolId };
        const [cList, clsList, pList, uList] = await Promise.all([
          listCampuses(scope),
          listClasses(scope),
          listParents(scope),
          listUsers(scope, { role: 'parent' }),
        ]);

        if (ignore) return;
        setCampuses(cList);
        setClasses(clsList);

        if (cList.length > 0 && !campusId) {
          setCampusId(cList[0].id);
        }

        // Map parents with names
        const uMap = new Map(uList.map((u) => [u.id, u]));
        const enrichedP: EnrichedParentOption[] = pList.map((p) => {
          const u = uMap.get(p.userId);
          return {
            parentId: p.id,
            userId: p.userId,
            name: u?.name ?? 'Parent',
            phone: u?.phone ?? '',
          };
        });
        setExistingParents(enrichedP);

        // Auto-generate initial admission number
        setAdmissionNumber(generateAdmissionNumber());
        setRollNumber(String(Math.floor(10 + Math.random() * 90)));
      } catch (err) {
        console.error('Failed to load admission form master data:', err);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [schoolId, generateAdmissionNumber, campusId]);

  // Filter classes by campus
  const availableClasses = useMemo(() => {
    if (!campusId) return classes;
    return classes.filter((c) => c.campusId === campusId);
  }, [classes, campusId]);

  // Set default class when campus changes (scheduled asynchronously to avoid cascading renders)
  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore && availableClasses.length > 0 && (!classId || !availableClasses.some((c) => c.id === classId))) {
        setClassId(availableClasses[0].id);
      }
    });
    return () => {
      ignore = true;
    };
  }, [availableClasses, classId]);

  // Pre-fill emergency contact when parent name/phone changes (convenience)
  const handleSyncEmergencyFromParent = () => {
    const contactName = parentMode === 'new' ? parentName : (existingParents.find((p) => p.parentId === selectedParentId)?.name ?? '');
    const contactPhone = parentMode === 'new' ? parentPhone : (existingParents.find((p) => p.parentId === selectedParentId)?.phone ?? '');

    if (contactName && contactPhone) {
      setEmergencyContacts((prev) => [
        {
          name: contactName,
          relationship: relationship.charAt(0).toUpperCase() + relationship.slice(1),
          phone: contactPhone,
          priority: 1,
        },
        ...prev.slice(1),
      ]);
    }
  };

  // Allergy tag additions
  const handleAddAllergy = () => {
    const val = allergyInput.trim();
    if (val && !allergies.includes(val)) {
      setAllergies([...allergies, val]);
      setAllergyInput('');
    }
  };

  const handleRemoveAllergy = (idx: number) => {
    setAllergies(allergies.filter((_, i) => i !== idx));
  };

  // Emergency contact handlers
  const handleAddEmergencyContact = () => {
    setEmergencyContacts([
      ...emergencyContacts,
      {
        name: '',
        relationship: 'Guardian',
        phone: '',
        priority: emergencyContacts.length + 1,
      },
    ]);
  };

  const handleUpdateEmergencyContact = (
    index: number,
    field: keyof EmergencyContact,
    val: string | number
  ) => {
    const updated = [...emergencyContacts];
    updated[index] = { ...updated[index], [field]: val };
    setEmergencyContacts(updated);
  };

  const handleRemoveEmergencyContact = (index: number) => {
    if (emergencyContacts.length <= 1) {
      showToast({
        type: 'error',
        title: 'Validation notice',
        message: 'At least one emergency contact is strictly required.',
      });
      return;
    }
    setEmergencyContacts(emergencyContacts.filter((_, i) => i !== index));
  };

  // Pickup persons handlers
  const handleAddPickupPerson = () => {
    if (!pickupName.trim() || !pickupPhone.trim()) {
      showToast({
        type: 'error',
        title: 'Incomplete pickup contact',
        message: 'Name and phone number are required for pickup persons.',
      });
      return;
    }
    setPickupPersons([
      ...pickupPersons,
      {
        name: pickupName.trim(),
        relationship: pickupRelation.trim() || 'Authorized Relative',
        phone: pickupPhone.trim(),
      },
    ]);
    setPickupName('');
    setPickupRelation('');
    setPickupPhone('');
  };

  const handleRemovePickupPerson = (index: number) => {
    setPickupPersons(pickupPersons.filter((_, i) => i !== index));
  };

  // Document file handler
  const handleAddDocument = () => {
    const val = newDocName.trim();
    if (val && !documentFiles.includes(val)) {
      setDocumentFiles([...documentFiles, val]);
      setNewDocName('');
    }
  };

  const handleRemoveDocument = (index: number) => {
    setDocumentFiles(documentFiles.filter((_, i) => i !== index));
  };

  // Form Submit & Validation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // 1. Basic validation: Name, DOB, Campus, Class
    if (!name.trim()) {
      setFormError('Student full name is required (Section 1: Personal).');
      return;
    }
    if (!dob) {
      setFormError('Date of birth is required (Section 1: Personal).');
      return;
    }
    if (!campusId) {
      setFormError('Campus placement is required (Section 2: Academic).');
      return;
    }
    if (!classId) {
      setFormError('Class and section assignment is required (Section 2: Academic).');
      return;
    }
    if (!admissionNumber.trim()) {
      setFormError('Admission number is required (Section 2: Academic).');
      return;
    }

    // 2. Acceptance Criteria 1: Emergency contact required
    const validEmergencyContacts = emergencyContacts.filter(
      (c) => c.name.trim() !== '' && c.phone.trim() !== ''
    );
    if (validEmergencyContacts.length === 0) {
      setFormError(
        'At least one complete emergency contact (Name and Phone) is strictly required (Section 5: Health & Safety).'
      );
      return;
    }

    // 3. Acceptance Criteria 2: Duplicate admission number blocked
    setIsSubmitting(true);
    try {
      const existingStudents = await listStudents({ schoolId });
      const duplicateStudent = existingStudents.find(
        (s) => s.admissionNumber.trim().toLowerCase() === admissionNumber.trim().toLowerCase()
      );

      if (duplicateStudent) {
        // Look up student name to name them in the error message
        const studentUsers = await listUsers({ schoolId }, { role: 'student' });
        const existingUser = studentUsers.find((u) => u.id === duplicateStudent.userId);
        const existingStudentName = existingUser ? existingUser.name : 'another student';

        setFormError(
          `Admission number "${admissionNumber.trim()}" is already assigned to student ${existingStudentName}. Duplicate admission numbers are blocked. Please specify a unique admission number.`
        );
        setIsSubmitting(false);
        return;
      }

      // 4. Create Student User Record
      const studentEmail = email.trim() || `student.${admissionNumber.toLowerCase().replace(/[^a-z0-9]/g, '')}@abcschool.pk`;
      const createdStudentUser = await createUser({
        schoolId,
        campusId,
        name: name.trim(),
        email: studentEmail,
        phone: phone.trim() || undefined,
        role: 'student',
        status: 'active',
        avatarUrl: photoUrl.trim() || undefined,
      });

      // 5. Handle Parent Record
      let parentRecordId = selectedParentId;
      if (parentMode === 'new') {
        const pEmail = parentEmail.trim() || `parent.${name.toLowerCase().split(' ')[0]}.${Date.now()}@abcschool.pk`;
        const createdParentUser = await createUser({
          schoolId,
          campusId,
          name: parentName.trim() || `Parent of ${name.trim()}`,
          email: pEmail,
          phone: parentPhone.trim() || phone.trim() || '0300-1234567',
          role: 'parent',
          status: 'active',
        });

        const createdParent = await createParent({
          schoolId,
          userId: createdParentUser.id,
          occupation: parentOccupation.trim() || undefined,
        });
        parentRecordId = createdParent.id;
      }

      // 6. Create Student Record
      const createdStudent = await createStudent({
        schoolId,
        campusId,
        userId: createdStudentUser.id,
        classId,
        academicYearId: session?.currentAcademicYearId ?? 'ay_2026_2027',
        admissionNumber: admissionNumber.trim(),
        rollNumber: rollNumber.trim() || '1',
        dob,
        gender,
        address: address.trim() || 'Karachi, Pakistan',
        admissionDate,
        status: 'active',
        health: {
          allergies,
          conditions: conditions.trim() ? [conditions.trim()] : [],
          medications: medications.trim() ? [medications.trim()] : [],
          bloodGroup,
          doctorName: doctorName.trim() || undefined,
          doctorPhone: doctorPhone.trim() || undefined,
          emergencyContacts: validEmergencyContacts,
          authorisedPickup: pickupPersons.map((p) => ({
            ...p,
            addedBy: session?.userId ?? 'usr_admin',
            addedAt: new Date().toISOString(),
          })),
        },
      });

      // 7. Link Student and Parent
      if (parentRecordId) {
        await createStudentParent({
          studentId: createdStudent.id,
          parentId: parentRecordId,
          relationship,
          isPrimary: isPrimaryParent,
        });
      }

      showToast({
        type: 'success',
        title: 'Student admitted successfully',
        message: `${name.trim()} has been enrolled as ${admissionNumber.trim()}.`,
      });

      router.push('/admin/students');
    } catch (err) {
      console.error('Admission submission error:', err);
      setFormError('An unexpected error occurred while saving the admission record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-rule pb-4">
        <div>
          <div className="flex items-center gap-2 text-caption text-ink-500 mb-1">
            <Link href="/admin/students" className="hover:text-brand-700">
              Student Directory
            </Link>
            <span>/</span>
            <span className="text-ink-900 font-medium">New Admission</span>
          </div>
          <h1 className="text-page-title font-semibold text-ink-900 tracking-tight">
            Student Admission Form
          </h1>
          <p className="text-secondary-meta text-ink-600">
            Complete the six standardized institutional sections to enroll a student.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/students">
            <Button variant="secondary" size="md" disabled={isSubmitting}>
              Cancel
            </Button>
          </Link>
          <Button
            variant="primary"
            size="md"
            onClick={handleSubmit}
            isLoading={isSubmitting}
          >
            Admit Student
          </Button>
        </div>
      </div>

      {/* Global Validation Alert */}
      {formError && (
        <div
          role="alert"
          className="p-4 rounded-card bg-absent/10 border border-absent/30 text-absent flex items-start gap-3"
        >
          <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs space-y-1">
            <h2 className="font-semibold text-sm">Admission Validation Error</h2>
            <p className="leading-relaxed">{formError}</p>
          </div>
        </div>
      )}

      {/* Six Sections Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SECTION 1: Personal */}
        <div className="p-6 rounded-card bg-surface border border-rule space-y-4 shadow-xs">
          <div className="border-b border-rule pb-2 flex items-center justify-between">
            <h2 className="text-section-title font-semibold text-ink-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 text-brand-800 text-xs font-bold">
                1
              </span>
              Personal Information
            </h2>
            <span className="text-[11px] text-ink-500">* Required fields</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Student Full Name *"
                placeholder="e.g. Fatima Tariq Khan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <Input
              label="Date of Birth *"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              required
            />

            <Select
              label="Gender *"
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
                { value: 'O+', label: 'O+' },
                { value: 'O-', label: 'O-' },
                { value: 'AB+', label: 'AB+' },
                { value: 'AB-', label: 'AB-' },
                { value: 'Unknown', label: 'Unknown' },
              ]}
            />

            <Input
              label="Photo URL (Optional)"
              placeholder="https://... or leave blank for initials"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
            />
          </div>
        </div>

        {/* SECTION 2: Academic */}
        <div className="p-6 rounded-card bg-surface border border-rule space-y-4 shadow-xs">
          <div className="border-b border-rule pb-2 flex items-center justify-between">
            <h2 className="text-section-title font-semibold text-ink-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 text-brand-800 text-xs font-bold">
                2
              </span>
              Academic Placement
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Campus Placement *"
              value={campusId}
              onChange={(e) => setCampusId(e.target.value)}
              options={campuses.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
            />

            <Select
              label="Class & Section *"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              options={availableClasses.map((c) => ({
                value: c.id,
                label: `${c.grade}-${c.section}`,
              }))}
            />

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-ink-700">
                  Admission Number *
                </span>
                <button
                  type="button"
                  onClick={() => setAdmissionNumber(generateAdmissionNumber())}
                  className="text-[11px] text-brand-700 hover:underline"
                >
                  Regenerate
                </button>
              </div>
              <Input
                label="Admission Number"
                value={admissionNumber}
                onChange={(e) => setAdmissionNumber(e.target.value)}
                placeholder="ADM-2026-XXXX"
                required
              />
            </div>

            <Input
              label="Assigned Roll Number *"
              placeholder="e.g. 14"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              required
            />

            <Input
              label="Admission Date *"
              type="date"
              value={admissionDate}
              onChange={(e) => setAdmissionDate(e.target.value)}
              required
            />
          </div>
        </div>

        {/* SECTION 3: Address and Contact */}
        <div className="p-6 rounded-card bg-surface border border-rule space-y-4 shadow-xs">
          <div className="border-b border-rule pb-2">
            <h2 className="text-section-title font-semibold text-ink-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 text-brand-800 text-xs font-bold">
                3
              </span>
              Address & Contact
            </h2>
          </div>

          <div className="space-y-4">
            <Textarea
              label="Residential Address"
              placeholder="Street address, apartment/house number, block, area..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Student / Family Phone"
                placeholder="e.g. 0300-1234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />

              <Input
                label="Student Email (Optional)"
                type="email"
                placeholder="e.g. student@abcschool.pk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: Parent or Guardian */}
        <div className="p-6 rounded-card bg-surface border border-rule space-y-4 shadow-xs">
          <div className="border-b border-rule pb-2 flex items-center justify-between">
            <h2 className="text-section-title font-semibold text-ink-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 text-brand-800 text-xs font-bold">
                4
              </span>
              Parent or Guardian
            </h2>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setParentMode('new')}
                className={`px-2.5 py-1 rounded-full font-medium transition-colors ${
                  parentMode === 'new'
                    ? 'bg-brand-700 text-white'
                    : 'bg-surface-subtle text-ink-700 hover:bg-ink-100'
                }`}
              >
                New Parent
              </button>
              <button
                type="button"
                onClick={() => setParentMode('existing')}
                className={`px-2.5 py-1 rounded-full font-medium transition-colors ${
                  parentMode === 'existing'
                    ? 'bg-brand-700 text-white'
                    : 'bg-surface-subtle text-ink-700 hover:bg-ink-100'
                }`}
              >
                Search Existing
              </button>
            </div>
          </div>

          {parentMode === 'existing' ? (
            <div className="space-y-3">
              <Select
                label="Select Registered Parent"
                value={selectedParentId}
                onChange={(e) => {
                  setSelectedParentId(e.target.value);
                  setTimeout(handleSyncEmergencyFromParent, 50);
                }}
                options={[
                  { value: '', label: '— Choose an existing parent —' },
                  ...existingParents.map((p) => ({
                    value: p.parentId,
                    label: `${p.name} (${p.phone})`,
                  })),
                ]}
              />
              <p className="text-[11px] text-ink-500">
                Associates this student with an existing parent account (supports multi-child families like Tariq Khan).
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Parent / Guardian Full Name"
                placeholder="e.g. Tariq Khan"
                value={parentName}
                onChange={(e) => {
                  setParentName(e.target.value);
                  setTimeout(handleSyncEmergencyFromParent, 50);
                }}
              />

              <Input
                label="Mobile Phone Number (WhatsApp)"
                placeholder="e.g. 0300-8254120"
                value={parentPhone}
                onChange={(e) => {
                  setParentPhone(e.target.value);
                  setTimeout(handleSyncEmergencyFromParent, 50);
                }}
              />

              <Input
                label="Email Address"
                placeholder="e.g. parent.khan@abcschool.pk"
                value={parentEmail}
                onChange={(e) => setParentEmail(e.target.value)}
              />

              <Input
                label="Occupation / Workplace"
                placeholder="e.g. Software Engineer"
                value={parentOccupation}
                onChange={(e) => setParentOccupation(e.target.value)}
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-rule">
            <Select
              label="Relationship to Student"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value as 'father' | 'mother' | 'guardian')}
              options={[
                { value: 'father', label: 'Father' },
                { value: 'mother', label: 'Mother' },
                { value: 'guardian', label: 'Guardian' },
              ]}
            />

            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-ink-800">
                <input
                  type="checkbox"
                  checked={isPrimaryParent}
                  onChange={(e) => setIsPrimaryParent(e.target.checked)}
                  className="rounded border-rule text-brand-700 focus:ring-brand-700 h-4 w-4"
                />
                Primary institutional contact for communications and fees
              </label>
            </div>
          </div>
        </div>

        {/* SECTION 5: Health and Safety (Acceptance Criteria: Emergency contact required) */}
        <div className="p-6 rounded-card bg-surface border border-rule space-y-6 shadow-xs">
          <div className="border-b border-rule pb-2 flex items-center justify-between">
            <h2 className="text-section-title font-semibold text-ink-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 text-brand-800 text-xs font-bold">
                5
              </span>
              Health and Safety
            </h2>
            <span className="text-xs font-semibold text-brand-700">
              Emergency contact strictly required
            </span>
          </div>

          {/* Allergies & Conditions */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-ink-700 block mb-1">
                Known Allergies (Food, Meds, Environmental)
              </label>
              <div className="flex gap-2">
                <Input
                  label="Add Allergy"
                  placeholder="e.g. Peanuts, Penicillin, Dust..."
                  value={allergyInput}
                  onChange={(e) => setAllergyInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddAllergy();
                    }
                  }}
                />
                <Button variant="secondary" size="md" onClick={handleAddAllergy}>
                  Add
                </Button>
              </div>
              {allergies.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {allergies.map((allergy, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 text-xs bg-absent/10 text-absent font-medium px-2 py-0.5 rounded-full border border-absent/25"
                    >
                      {allergy}
                      <button
                        type="button"
                        onClick={() => handleRemoveAllergy(idx)}
                        className="hover:text-absent/80 font-bold ml-0.5"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Chronic Medical Conditions"
                placeholder="e.g. Asthma, Diabetes, Epilepsy (or None)"
                value={conditions}
                onChange={(e) => setConditions(e.target.value)}
              />

              <Input
                label="Current Medications"
                placeholder="e.g. Inhaler on physical exertion"
                value={medications}
                onChange={(e) => setMedications(e.target.value)}
              />

              <Input
                label="Family Doctor / Clinic Name"
                placeholder="e.g. Dr. Salman Beg"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
              />

              <Input
                label="Doctor Emergency Phone"
                placeholder="e.g. 021-35890000"
                value={doctorPhone}
                onChange={(e) => setDoctorPhone(e.target.value)}
              />
            </div>
          </div>

          {/* Emergency Contacts Section (Required) */}
          <div className="pt-4 border-t border-rule space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-ink-900 flex items-center gap-1.5">
                  Emergency Contacts
                  <span className="text-xs text-absent font-bold">* At least 1 required</span>
                </h3>
                <p className="text-[11px] text-ink-500">
                  Authorised individuals contacted during medical or campus emergencies.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddEmergencyContact}
              >
                + Add Contact
              </Button>
            </div>

            <div className="space-y-3">
              {emergencyContacts.map((contact, index) => (
                <div
                  key={index}
                  className="p-3 bg-surface-subtle rounded-card border border-rule grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
                >
                  <Input
                    label={`Contact #${index + 1} Full Name *`}
                    placeholder="e.g. Tariq Khan"
                    value={contact.name}
                    onChange={(e) => handleUpdateEmergencyContact(index, 'name', e.target.value)}
                    required
                  />

                  <Input
                    label="Relationship *"
                    placeholder="e.g. Father, Uncle"
                    value={contact.relationship}
                    onChange={(e) =>
                      handleUpdateEmergencyContact(index, 'relationship', e.target.value)
                    }
                    required
                  />

                  <Input
                    label="Emergency Phone *"
                    placeholder="e.g. 0300-8254120"
                    value={contact.phone}
                    onChange={(e) => handleUpdateEmergencyContact(index, 'phone', e.target.value)}
                    required
                  />

                  <div className="flex items-center justify-between pb-1">
                    <span className="text-[11px] text-ink-500 font-mono">
                      Priority: {contact.priority}
                    </span>
                    {emergencyContacts.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-absent hover:bg-absent/10 h-8"
                        onClick={() => handleRemoveEmergencyContact(index)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Authorised Pickup Persons */}
          <div className="pt-4 border-t border-rule space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-ink-900">
                Authorised Pickup Persons
              </h3>
              <p className="text-[11px] text-ink-500">
                Persons authorized to collect student from school gate at dismissal.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
              <Input
                label="Pickup Full Name"
                placeholder="e.g. Muhammad Rafiq"
                value={pickupName}
                onChange={(e) => setPickupName(e.target.value)}
              />
              <Input
                label="Relationship"
                placeholder="e.g. Grandfather / Driver"
                value={pickupRelation}
                onChange={(e) => setPickupRelation(e.target.value)}
              />
              <Input
                label="Phone"
                placeholder="e.g. 0312-3456789"
                value={pickupPhone}
                onChange={(e) => setPickupPhone(e.target.value)}
              />
              <Button variant="secondary" size="md" onClick={handleAddPickupPerson}>
                Add Person
              </Button>
            </div>

            {pickupPersons.length > 0 && (
              <div className="space-y-1 mt-2">
                {pickupPersons.map((p, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs p-2 rounded bg-surface border border-rule"
                  >
                    <span>
                      <strong className="text-ink-900">{p.name}</strong> ({p.relationship}) —{' '}
                      <span className="font-mono text-ink-600">{p.phone}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemovePickupPerson(idx)}
                      className="text-absent hover:underline font-medium"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* SECTION 6: Documents (Filename capture only) */}
        <div className="p-6 rounded-card bg-surface border border-rule space-y-4 shadow-xs">
          <div className="border-b border-rule pb-2">
            <h2 className="text-section-title font-semibold text-ink-900 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 text-brand-800 text-xs font-bold">
                6
              </span>
              Documents (Filename Capture)
            </h2>
            <p className="text-[11px] text-ink-500 mt-0.5">
              Reference file names captured during document verification (per spec: filename capture only).
            </p>
          </div>

          <div className="flex gap-2">
            <Input
              label="Document Name"
              placeholder="e.g. Vaccination_Card.pdf"
              value={newDocName}
              onChange={(e) => setNewDocName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddDocument();
                }
              }}
            />
            <Button variant="secondary" size="md" onClick={handleAddDocument}>
              Add File
            </Button>
          </div>

          <div className="space-y-2 mt-2">
            {documentFiles.map((doc, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded bg-surface-subtle border border-rule text-xs"
              >
                <div className="flex items-center gap-2 text-ink-800">
                  <svg className="w-4 h-4 text-ink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="font-mono">{doc}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveDocument(idx)}
                  className="text-absent hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-between p-4 bg-surface rounded-card border border-rule shadow-xs">
          <Link href="/admin/students">
            <Button variant="secondary" size="md" disabled={isSubmitting}>
              Back to Directory
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="md"
              type="submit"
              isLoading={isSubmitting}
            >
              Complete Admission
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
