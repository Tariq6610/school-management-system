'use client';

import React, { useState, useEffect } from 'react';
import { Subject, EnrichedTimetableSlot, DayOfWeek } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { NavIcon } from '@/components/shell/NavIcon';
import {
  detectTimetableClashes,
  ClashCheckResult,
} from '@/lib/repositories/timetableSlots';

export interface TeacherOption {
  id: string;
  name: string;
  employeeNumber?: string;
  department?: string;
}

export interface SlotPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayName: string;
  periodName: string;
  periodTime: string;
  classNameLabel: string;
  subjects: Subject[];
  teachers: TeacherOption[];
  currentSlot?: EnrichedTimetableSlot | null;
  defaultRoom?: string;
  schoolId?: string;
  campusId?: string;
  classId?: string;
  dayOfWeek?: DayOfWeek;
  period?: number;
  onSave: (payload: { subjectId: string; teacherId: string; room?: string }) => Promise<void>;
  onDelete?: () => Promise<void>;
}

interface SlotPickerFormProps {
  onClose: () => void;
  dayName: string;
  periodName: string;
  periodTime: string;
  classNameLabel: string;
  subjects: Subject[];
  teachers: TeacherOption[];
  currentSlot?: EnrichedTimetableSlot | null;
  defaultRoom?: string;
  schoolId?: string;
  campusId?: string;
  classId?: string;
  dayOfWeek?: DayOfWeek;
  period?: number;
  onSave: (payload: { subjectId: string; teacherId: string; room?: string }) => Promise<void>;
  onDelete?: () => Promise<void>;
}

function SlotPickerForm({
  onClose,
  dayName,
  periodName,
  periodTime,
  classNameLabel,
  subjects,
  teachers,
  currentSlot,
  defaultRoom = '',
  schoolId,
  campusId,
  classId,
  dayOfWeek,
  period,
  onSave,
  onDelete,
}: SlotPickerFormProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(currentSlot?.subjectId || '');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(currentSlot?.teacherId || '');
  const [room, setRoom] = useState<string>(currentSlot?.room || defaultRoom || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [clashResult, setClashResult] = useState<ClashCheckResult | null>(null);
  const [isCheckingClashes, setIsCheckingClashes] = useState<boolean>(false);
  const [overrideConflict, setOverrideConflict] = useState<boolean>(false);

  // Live clash detection whenever teacher, room, or coordinates change
  useEffect(() => {
    let ignore = false;
    if (!schoolId || !classId || dayOfWeek === undefined || period === undefined) {
      return;
    }

    Promise.resolve().then(async () => {
      if (ignore) return;
      setIsCheckingClashes(true);
      try {
        const result = await detectTimetableClashes({
          schoolId,
          campusId,
          classId,
          dayOfWeek,
          period,
          teacherId: selectedTeacherId || undefined,
          room: room.trim() || undefined,
          excludeSlotId: currentSlot?.id,
        });
        if (!ignore) {
          setClashResult(result);
        }
      } catch (err) {
        console.error('Failed to run live clash detection:', err);
      } finally {
        if (!ignore) {
          setIsCheckingClashes(false);
        }
      }
    });

    return () => {
      ignore = true;
    };
  }, [schoolId, campusId, classId, dayOfWeek, period, selectedTeacherId, room, currentSlot?.id]);

  // When subject changes, automatically pre-select teacher if assigned to subject
  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setError(null);

    const subject = subjects.find((s) => s.id === subjectId);
    if (subject?.teacherId) {
      const matchedTeacher = teachers.find((t) => t.id === subject.teacherId);
      if (matchedTeacher) {
        setSelectedTeacherId(matchedTeacher.id);
      }
    }
  };

  const handleSave = async () => {
    if (!selectedSubjectId) {
      setError('Please select a subject for this slot.');
      return;
    }
    if (!selectedTeacherId) {
      setError('Please assign an instructor / teacher for this slot.');
      return;
    }

    if (clashResult?.hasClash && !overrideConflict) {
      setError(
        'A scheduling conflict was detected. Confirm and override conflict below to proceed, or select a different teacher/room.'
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        subjectId: selectedSubjectId,
        teacherId: selectedTeacherId,
        room: room.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save timetable slot');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    try {
      setIsDeleting(true);
      setError(null);
      await onDelete();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove timetable slot');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Context metadata badge bar */}
      <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-neutral-500 font-medium">Class: </span>
          <strong className="text-neutral-900">{classNameLabel}</strong>
        </div>
        <div>
          <span className="text-neutral-500 font-medium">Day: </span>
          <strong className="text-neutral-900">{dayName}</strong>
        </div>
        <div>
          <span className="text-neutral-500 font-medium">Period: </span>
          <span className="font-semibold text-purple-700">
            {periodName} ({periodTime})
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg p-3">
          {error}
        </div>
      )}

      {/* Subject Picker */}
      <div>
        <label
          htmlFor="slot-subject-select"
          className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5"
        >
          Subject <span className="text-rose-500">*</span>
        </label>
        <select
          id="slot-subject-select"
          value={selectedSubjectId}
          onChange={(e) => handleSubjectChange(e.target.value)}
          className="w-full text-sm border border-neutral-300 rounded-lg p-2.5 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">-- Choose Subject --</option>
          {subjects.map((sub) => (
            <option key={sub.id} value={sub.id}>
              {sub.name} ({sub.code})
            </option>
          ))}
        </select>
        {subjects.length === 0 && (
          <p className="text-xs text-amber-600 mt-1">
            No subjects registered for this class. Add subjects in Subjects Manager.
          </p>
        )}
      </div>

      {/* Teacher Picker */}
      <div>
        <label
          htmlFor="slot-teacher-select"
          className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5"
        >
          Assigned Teacher / Instructor <span className="text-rose-500">*</span>
        </label>
        <select
          id="slot-teacher-select"
          value={selectedTeacherId}
          onChange={(e) => setSelectedTeacherId(e.target.value)}
          className="w-full text-sm border border-neutral-300 rounded-lg p-2.5 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="">-- Select Teacher --</option>
          {teachers.map((tch) => (
            <option key={tch.id} value={tch.id}>
              {tch.name} {tch.department ? `(${tch.department})` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Room Input */}
      <div>
        <label
          htmlFor="slot-room-input"
          className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5"
        >
          Room / Location
        </label>
        <input
          id="slot-room-input"
          type="text"
          value={room}
          onChange={(e) => setRoom(e.target.value)}
          placeholder="e.g. Room 204, Science Lab 1"
          className="w-full text-sm border border-neutral-300 rounded-lg p-2.5 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        <p className="text-[11px] text-neutral-500 mt-1">
          Defaults to the class&apos;s assigned room if left unchanged.
        </p>
      </div>

      {/* Live Clash Warning Alert */}
      {isCheckingClashes ? (
        <div className="text-xs text-neutral-500 flex items-center gap-1.5 py-1">
          <span className="inline-block w-3 h-3 rounded-full border-2 border-neutral-400 border-t-transparent animate-spin" />
          <span>Checking schedule conflicts...</span>
        </div>
      ) : clashResult?.hasClash ? (
        <div
          data-testid="timetable-clash-warning"
          className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-amber-900 shadow-xs space-y-2.5"
        >
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-amber-600 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="font-bold text-xs uppercase tracking-wider text-amber-900">
              Schedule Clash Detected
            </span>
          </div>

          <div className="space-y-2 pl-7 text-xs">
            {clashResult.clashes.map((clash, idx) => (
              <div key={idx} className="bg-white/80 rounded-lg p-2 border border-amber-200/80">
                <span className="font-semibold text-amber-950 mb-0.5 inline-flex items-center gap-1.5">
                  <NavIcon name="alert-triangle" className="w-3.5 h-3.5 shrink-0" />
                  {clash.type === 'teacher' ? 'Teacher Double-Booking' : 'Room Double-Booking'}
                </span>
                <span className="text-amber-900 leading-relaxed block">
                  {clash.description}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-1 pl-7">
            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-amber-900">
              <input
                type="checkbox"
                id="override-clash-checkbox"
                data-testid="override-clash-checkbox"
                checked={overrideConflict}
                onChange={(e) => setOverrideConflict(e.target.checked)}
                className="rounded border-amber-400 text-amber-600 focus:ring-amber-500"
              />
              <span>I understand and want to override this conflict</span>
            </label>
          </div>
        </div>
      ) : null}

      {/* Modal Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-neutral-200 mt-6">
        <div>
          {currentSlot && onDelete && (
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting || isSubmitting}
            >
              {isDeleting ? 'Removing...' : 'Clear Slot'}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting || isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={isSubmitting || isDeleting}
          >
            {isSubmitting ? 'Saving...' : currentSlot ? 'Update Slot' : 'Assign Slot'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SlotPickerModal({
  isOpen,
  onClose,
  dayName,
  periodName,
  periodTime,
  classNameLabel,
  subjects,
  teachers,
  currentSlot,
  defaultRoom = '',
  schoolId,
  campusId,
  classId,
  dayOfWeek,
  period,
  onSave,
  onDelete,
}: SlotPickerModalProps) {
  if (!isOpen) return null;

  const formKey = currentSlot
    ? currentSlot.id
    : `${dayName}_${periodName}_${classNameLabel}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={currentSlot ? 'Edit Scheduled Slot' : 'Assign Timetable Slot'}
      size="md"
    >
      <SlotPickerForm
        key={formKey}
        onClose={onClose}
        dayName={dayName}
        periodName={periodName}
        periodTime={periodTime}
        classNameLabel={classNameLabel}
        subjects={subjects}
        teachers={teachers}
        currentSlot={currentSlot}
        defaultRoom={defaultRoom}
        schoolId={schoolId}
        campusId={campusId}
        classId={classId}
        dayOfWeek={dayOfWeek}
        period={period}
        onSave={onSave}
        onDelete={onDelete}
      />
    </Modal>
  );
}
