'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { HealthRecord, PickupPerson, Student, User, Class } from '@/types';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { PickupPersonList } from './PickupPersonList';

export interface ParentChildProfileViewProps {
  student: Student;
  user?: User;
  classInfo?: Class | null;
  onAddPickupPerson: (person: Omit<PickupPerson, 'addedBy' | 'addedAt'>) => Promise<void>;
  onRemovePickupPerson: (phoneOrName: string) => Promise<void>;
  onUpdateHealth?: (patch: Partial<HealthRecord>) => Promise<void>;
  isReadOnly?: boolean;
}

export function ParentChildProfileView({
  student,
  user,
  classInfo,
  onAddPickupPerson,
  onRemovePickupPerson,
  onUpdateHealth,
  isReadOnly = false,
}: ParentChildProfileViewProps) {
  const [isEditHealthOpen, setIsEditHealthOpen] = useState(false);
  const [allergiesInput, setAllergiesInput] = useState((student.health?.allergies ?? []).join(', '));
  const [conditionsInput, setConditionsInput] = useState((student.health?.conditions ?? []).join(', '));
  const [medicationsInput, setMedicationsInput] = useState((student.health?.medications ?? []).join(', '));
  const [bloodGroupInput, setBloodGroupInput] = useState(student.health?.bloodGroup ?? '');
  const [doctorNameInput, setDoctorNameInput] = useState(student.health?.doctorName ?? '');
  const [doctorPhoneInput, setDoctorPhoneInput] = useState(student.health?.doctorPhone ?? '');
  const [isSavingHealth, setIsSavingHealth] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);

  const allergies = student.health?.allergies ?? [];
  const conditions = student.health?.conditions ?? [];
  const medications = student.health?.medications ?? [];
  const emergencyContacts = student.health?.emergencyContacts ?? [];
  const pickupPersons = student.health?.authorisedPickup ?? [];

  const handleSaveHealth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdateHealth) return;
    try {
      setIsSavingHealth(true);
      setHealthError(null);
      await onUpdateHealth({
        allergies: allergiesInput.split(',').map((s) => s.trim()).filter(Boolean),
        conditions: conditionsInput.split(',').map((s) => s.trim()).filter(Boolean),
        medications: medicationsInput.split(',').map((s) => s.trim()).filter(Boolean),
        bloodGroup: bloodGroupInput.trim() || undefined,
        doctorName: doctorNameInput.trim() || undefined,
        doctorPhone: doctorPhoneInput.trim() || undefined,
      });
      setIsEditHealthOpen(false);
    } catch (err: unknown) {
      setHealthError(err instanceof Error ? err.message : 'Failed to update health records.');
    } finally {
      setIsSavingHealth(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href="/parent"
          className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-brand-navy transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Parent Dashboard
        </Link>
      </div>

      {/* Child Header Card */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Avatar
            name={user?.name ?? student.admissionNumber}
            src={user?.avatarUrl}
            size="lg"
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-neutral-900">{user?.name ?? student.admissionNumber}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-navy/10 text-brand-navy">
                {classInfo ? `${classInfo.grade} - ${classInfo.section}` : 'Class Roster'}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-4 text-xs text-neutral-500 font-mono flex-wrap">
              <span>Adm No: <strong className="text-neutral-800">{student.admissionNumber}</strong></span>
              <span>Roll No: <strong className="text-neutral-800">{student.rollNumber}</strong></span>
              {student.health?.bloodGroup && (
                <span>Blood Group: <strong className="text-rose-600 font-bold">{student.health.bloodGroup}</strong></span>
              )}
            </div>
          </div>
        </div>

        {onUpdateHealth && !isReadOnly && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setAllergiesInput((student.health?.allergies ?? []).join(', '));
              setConditionsInput((student.health?.conditions ?? []).join(', '));
              setMedicationsInput((student.health?.medications ?? []).join(', '));
              setBloodGroupInput(student.health?.bloodGroup ?? '');
              setDoctorNameInput(student.health?.doctorName ?? '');
              setDoctorPhoneInput(student.health?.doctorPhone ?? '');
              setIsEditHealthOpen(true);
            }}
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Update Medical Profile
          </Button>
        )}
      </div>

      {/* Critical Allergy Alert Banner */}
      {allergies.length > 0 ? (
        <div
          data-testid="parent-allergy-alert"
          className="rounded-xl bg-rose-50 border-2 border-rose-300 p-4 sm:p-5 flex items-start gap-4 shadow-xs"
        >
          <div className="p-2 rounded-xl bg-rose-100 text-rose-600 shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-rose-900">Active Allergy Precautions on File</h2>
            <p className="text-xs text-rose-700 mt-0.5">
              These registered allergies appear as high-priority medical warnings on teacher class rosters and cafeteria meal sheets.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {allergies.map((allergy, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white text-rose-800 font-semibold text-xs border border-rose-300 shadow-2xs"
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  {allergy}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3">
          <div className="p-1 rounded-full bg-emerald-100 text-emerald-600 shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <div className="text-xs font-semibold text-emerald-900">No Known Medical Allergies Reported</div>
            <div className="text-2xs text-emerald-700">If your child develops any allergies or dietary restrictions, please notify the school nurse or update their profile immediately.</div>
          </div>
        </div>
      )}

      {/* Health, Conditions, & Emergency Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Medical Conditions & Medications */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-brand-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Conditions & Medications
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-neutral-500 block">Chronic Conditions:</span>
                {conditions.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {conditions.map((c, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-800 font-medium">
                        {c}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-neutral-400 italic">None recorded</span>
                )}
              </div>

              <div>
                <span className="text-neutral-500 block">Regular Medications:</span>
                {medications.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {medications.map((m, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium border border-blue-100">
                        {m}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-neutral-400 italic">None recorded</span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-neutral-100 text-xs text-neutral-600">
            <span className="font-semibold text-neutral-800">Primary Physician: </span>
            {student.health?.doctorName ? (
              <span>
                {student.health.doctorName}
                {student.health?.doctorPhone ? ` (${student.health.doctorPhone})` : ''}
              </span>
            ) : (
              <span className="text-neutral-400 italic">No doctor recorded</span>
            )}
          </div>
        </div>

        {/* Emergency Contacts */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5 shadow-xs">
          <h3 className="text-sm font-semibold text-neutral-900 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-brand-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            Emergency Contacts
          </h3>

          {emergencyContacts.length === 0 ? (
            <p className="text-xs text-neutral-400 italic">No emergency contacts recorded.</p>
          ) : (
            <div className="space-y-2.5">
              {emergencyContacts.map((contact, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-50 text-xs">
                  <div>
                    <div className="font-medium text-neutral-900 flex items-center gap-1.5">
                      <span>{contact.name}</span>
                      <span className="text-2xs text-neutral-500 font-normal">({contact.relationship})</span>
                    </div>
                    <a href={`tel:${contact.phone}`} className="text-neutral-600 hover:text-brand-navy font-mono text-2xs">
                      {contact.phone}
                    </a>
                  </div>
                  <span className="px-2 py-0.5 rounded text-2xs font-semibold bg-neutral-200 text-neutral-700">
                    Priority {contact.priority}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Authorized Pickup Person Section */}
      <PickupPersonList
        pickupPersons={pickupPersons}
        onAddPickupPerson={onAddPickupPerson}
        onRemovePickupPerson={onRemovePickupPerson}
        isReadOnly={isReadOnly}
      />

      {/* Update Health Records Modal */}
      {onUpdateHealth && (
        <Modal
          isOpen={isEditHealthOpen}
          onClose={() => setIsEditHealthOpen(false)}
          title="Update Medical Profile"
        >
          <form onSubmit={handleSaveHealth} className="space-y-4">
            {healthError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {healthError}
              </div>
            )}

            <div>
              <Input
                label="Known Allergies (Comma separated)"
                hint="These are visible to teachers on class attendance rosters."
                value={allergiesInput}
                onChange={(e) => setAllergiesInput(e.target.value)}
                placeholder="e.g. Peanuts, Penicillin, Bee stings"
              />
            </div>

            <div>
              <Input
                label="Medical Conditions (Comma separated)"
                value={conditionsInput}
                onChange={(e) => setConditionsInput(e.target.value)}
                placeholder="e.g. Asthma, Type 1 Diabetes"
              />
            </div>

            <div>
              <Input
                label="Routine Medications (Comma separated)"
                value={medicationsInput}
                onChange={(e) => setMedicationsInput(e.target.value)}
                placeholder="e.g. Albuterol inhaler, Insulin"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input
                  label="Blood Group"
                  value={bloodGroupInput}
                  onChange={(e) => setBloodGroupInput(e.target.value)}
                  placeholder="e.g. O+, A-, B+"
                />
              </div>
              <div>
                <Input
                  label="Doctor Phone"
                  value={doctorPhoneInput}
                  onChange={(e) => setDoctorPhoneInput(e.target.value)}
                  placeholder="e.g. +1 555-0188"
                />
              </div>
            </div>

            <div>
              <Input
                label="Doctor / Clinic Name"
                value={doctorNameInput}
                onChange={(e) => setDoctorNameInput(e.target.value)}
                placeholder="e.g. Dr. Jane Smith (Metro Pediatric Clinic)"
              />
            </div>

            <div className="pt-3 border-t border-neutral-200 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsEditHealthOpen(false)}
                disabled={isSavingHealth}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSavingHealth}
              >
                {isSavingHealth ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
