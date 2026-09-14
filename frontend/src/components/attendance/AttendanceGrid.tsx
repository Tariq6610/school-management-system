'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  AttendanceDay,
  AttendanceStatus,
  Campus,
  Class,
  ID,
  ISODate,
  Scope,
  Student,
  User,
} from '@/types';
import {
  AttendanceEditWindowCheck,
  canEditAttendance,
  getAttendanceByClassAndDate,
  saveAttendance,
} from '@/lib/repositories/attendance';
import { getSettings } from '@/lib/repositories/settings';
import { getClass } from '@/lib/repositories/classes';
import { getCampus } from '@/lib/repositories/campuses';
import { listStudents } from '@/lib/repositories/students';
import { getUser, listUsers } from '@/lib/repositories/users';
import { getParentsForStudent } from '@/lib/repositories/studentParents';
import { createNotification } from '@/lib/repositories/notifications';
import { logWhatsAppMessage } from '@/lib/repositories/whatsappLog';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/ui/Toast';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { AttendanceStatusControl } from './AttendanceStatusControl';
import { AttendanceSummaryBar } from './AttendanceSummaryBar';
import { AttendanceSaveBar } from './AttendanceSaveBar';
import { AttendanceAuditBanner } from './AttendanceAuditBanner';
import { NavIcon } from '@/components/shell/NavIcon';
import { AttendanceAuditModal } from './AttendanceAuditModal';

export interface AttendanceGridProps {
  classId: ID;
  initialDate?: ISODate;
}

interface EnrichedStudentItem {
  student: Student;
  user: User;
}

export function AttendanceGrid({ classId, initialDate = '2026-09-08' }: AttendanceGridProps) {
  const { session } = useSession();
  const { showToast } = useToast();
  const schoolId = session?.schoolId ?? 'sch_main';

  // Data states
  const [classInfo, setClassInfo] = useState<Class | null>(null);
  const [campus, setCampus] = useState<Campus | null>(null);
  const [students, setStudents] = useState<EnrichedStudentItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<ISODate>(initialDate);
  const [attendanceRecord, setAttendanceRecord] = useState<AttendanceDay | null>(null);
  const [statusMap, setStatusMap] = useState<Map<ID, AttendanceStatus>>(new Map());
  const [markedByUser, setMarkedByUser] = useState<User | null>(null);
  const [editedByUser, setEditedByUser] = useState<User | null>(null);
  const [editWindowCheck, setEditWindowCheck] = useState<AttendanceEditWindowCheck | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isEditable, setIsEditable] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);

  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Load class, students, and attendance document
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const cls = await getClass(classId);
      if (!cls) {
        setIsLoading(false);
        return;
      }
      setClassInfo(cls);

      const scope: Scope = { schoolId, campusId: cls.campusId, classId: cls.id };
      const [c, rawStudents, rawUsers, existingAtt, settings] = await Promise.all([
        getCampus(cls.campusId),
        // Inactive students are strictly excluded from attendance per TASK-026
        listStudents(scope, { status: 'active' }),
        listUsers(scope, { role: 'student' }),
        getAttendanceByClassAndDate(scope, classId, selectedDate),
        getSettings({ schoolId }),
      ]);

      setCampus(c);

      const userMap = new Map<ID, User>();
      rawUsers.forEach((u) => userMap.set(u.id, u));

      // Build and sort student roster
      const roster: EnrichedStudentItem[] = [];
      for (const s of rawStudents) {
        const u = userMap.get(s.userId);
        if (u) {
          roster.push({ student: s, user: u });
        }
      }
      roster.sort((a, b) => {
        const rollA = parseInt(a.student.rollNumber || '0', 10);
        const rollB = parseInt(b.student.rollNumber || '0', 10);
        if (rollA && rollB) return rollA - rollB;
        return a.user.name.localeCompare(b.user.name);
      });
      setStudents(roster);

      // Initialize statusMap
      const nextMap = new Map<ID, AttendanceStatus>();
      if (existingAtt) {
        setAttendanceRecord(existingAtt);

        // Pre-populate saved statuses
        for (const item of roster) {
          const sId = item.student.id;
          if (existingAtt.absent.includes(sId)) {
            nextMap.set(sId, 'absent');
          } else if (existingAtt.late.includes(sId)) {
            nextMap.set(sId, 'late');
          } else if (existingAtt.leave.includes(sId)) {
            nextMap.set(sId, 'leave');
          } else {
            nextMap.set(sId, 'present');
          }
        }

        // Fetch audit users
        if (existingAtt.markedBy) {
          const mu = await getUser(existingAtt.markedBy);
          setMarkedByUser(mu);
        } else {
          setMarkedByUser(null);
        }
        if (existingAtt.editedBy) {
          const eu = await getUser(existingAtt.editedBy);
          setEditedByUser(eu);
        } else {
          setEditedByUser(null);
        }

        // Check edit window with configurable setting (default 48h / 2 days per FEATURE_SPECIFICATIONS.md §8)
        const windowHours = settings.attendanceEditWindowHours ?? 48;
        const editCheck = canEditAttendance(
          existingAtt,
          session?.role ?? 'teacher',
          windowHours
        );
        setEditWindowCheck(editCheck);
        setIsEditable(editCheck.canEdit);
      } else {
        // Unmarked day: All students default to PRESENT (Acceptance Criteria)
        setAttendanceRecord(null);
        setMarkedByUser(null);
        setEditedByUser(null);
        setEditWindowCheck(null);
        setIsEditable(true);

        for (const item of roster) {
          nextMap.set(item.student.id, 'present');
        }
      }

      setStatusMap(nextMap);
      setFocusedIndex(0);
    } catch (err) {
      console.error('Failed to load attendance:', err);
      showToast({
        type: 'error',
        title: 'Error loading attendance',
        message: 'Could not fetch class roster.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [classId, selectedDate, schoolId, session, showToast]);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) loadData();
    });
    return () => {
      ignore = true;
    };
  }, [loadData]);

  // Derived live count summaries
  const { presentCount, absentCount, lateCount, leaveCount, percentage } = useMemo(() => {
    let p = 0;
    let a = 0;
    let l = 0;
    let v = 0;

    for (const status of statusMap.values()) {
      if (status === 'present') p++;
      else if (status === 'absent') a++;
      else if (status === 'late') l++;
      else if (status === 'leave') v++;
    }

    const total = p + a + l + v;
    const pct = total > 0 ? Math.round(((p + l) / total) * 1000) / 10 : 0;

    return {
      presentCount: p,
      absentCount: a,
      lateCount: l,
      leaveCount: v,
      percentage: pct,
    };
  }, [statusMap]);

  // Status toggle handler
  const handleStatusChange = useCallback(
    (studentId: ID, newStatus: AttendanceStatus) => {
      if (!isEditable) return;
      setStatusMap((prev) => {
        const copy = new Map(prev);
        copy.set(studentId, newStatus);
        return copy;
      });
    },
    [isEditable]
  );

  // Mark all present accelerator
  const handleMarkAllPresent = useCallback(() => {
    if (!isEditable) return;
    setStatusMap((prev) => {
      const copy = new Map(prev);
      for (const s of students) {
        copy.set(s.student.id, 'present');
      }
      return copy;
    });
    showToast({
      type: 'info',
      title: 'All Present',
      message: 'All students have been marked present.',
    });
  }, [isEditable, students, showToast]);

  // Save Attendance Action
  const handleSaveAttendance = useCallback(async () => {
    if (!classInfo) return;

    if (!isEditable) {
      showToast({
        type: 'error',
        title: 'Register locked',
        message:
          editWindowCheck?.reason ||
          'The edit window for this attendance register has expired. Contact an administrator to make changes.',
      });
      return;
    }

    try {
      setIsSaving(true);
      const isUpdate = Boolean(attendanceRecord);

      const present: ID[] = [];
      const absent: ID[] = [];
      const late: ID[] = [];
      const leave: ID[] = [];

      for (const item of students) {
        const sId = item.student.id;
        const st = statusMap.get(sId) ?? 'present';
        if (st === 'present') present.push(sId);
        else if (st === 'absent') absent.push(sId);
        else if (st === 'late') late.push(sId);
        else if (st === 'leave') leave.push(sId);
      }

      const scope: Scope = {
        schoolId,
        campusId: classInfo.campusId,
        classId: classInfo.id,
      };

      const teacherUserId = session?.userId ?? classInfo.classTeacherId ?? 'usr_tariq';

      const saved = await saveAttendance(scope, {
        classId: classInfo.id,
        campusId: classInfo.campusId,
        academicYearId: classInfo.academicYearId || 'ay_2026',
        date: selectedDate,
        present,
        absent,
        late,
        leave,
        markedBy: attendanceRecord?.markedBy ?? teacherUserId,
        editedBy: attendanceRecord ? teacherUserId : undefined,
      });

      setAttendanceRecord(saved);

      // Trigger absent notifications and WhatsApp logs per FEATURE_SPECIFICATIONS.md §8
      const formattedDate = new Date(selectedDate).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      for (const absStudentId of absent) {
        const stItem = students.find((s) => s.student.id === absStudentId);
        if (!stItem) continue;

        const parents = await getParentsForStudent(absStudentId);
        for (const p of parents) {
          // In-app notification
          await createNotification({
            schoolId,
            recipientId: p.user.id,
            type: 'attendance',
            title: 'Student Absence Notice',
            body: `${stItem.user.name} was marked absent on ${formattedDate}.`,
          });

          // Mock WhatsApp Log entry
          await logWhatsAppMessage({
            schoolId,
            recipientPhone: p.user.phone || '+92 300 0000000',
            recipientName: p.user.name,
            template: 'daily_attendance_alert',
            body: `Dear Parent, ${stItem.user.name} was marked absent from ${classInfo.grade}-${classInfo.section} today (${formattedDate}). Please contact the school if this was in error.`,
            trigger: 'daily_attendance_marked',
            status: 'sent',
          });
        }
      }

      const absentMsg =
        absent.length === 0
          ? 'All students present.'
          : `${absent.length} student${absent.length === 1 ? '' : 's'} marked absent.`;

      showToast({
        type: 'success',
        title: isUpdate ? 'Attendance updated' : 'Attendance saved',
        message: `Register ${isUpdate ? 'updated' : 'saved'} for ${classInfo.grade}-${classInfo.section}. ${absentMsg}`,
      });

      // Reload audit state
      await loadData();
    } catch (err) {
      console.error('Failed to save attendance:', err);
      showToast({
        type: 'error',
        title: 'Save failed',
        message: 'Could not record attendance.',
      });
    } finally {
      setIsSaving(false);
    }
  }, [
    classInfo,
    isEditable,
    editWindowCheck,
    students,
    statusMap,
    schoolId,
    session,
    selectedDate,
    attendanceRecord,
    showToast,
    loadData,
  ]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing inside an input or select
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }

      // Save shortcut: Ctrl+S or Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveAttendance();
        return;
      }

      if (students.length === 0) return;

      const currentStudent = students[focusedIndex]?.student;

      // Navigate down: ArrowDown or J
      if (e.key === 'ArrowDown' || e.key === 'j') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = Math.min(prev + 1, students.length - 1);
          rowRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          return next;
        });
        return;
      }

      // Navigate up: ArrowUp or K
      if (e.key === 'ArrowUp' || e.key === 'k') {
        e.preventDefault();
        setFocusedIndex((prev) => {
          const next = Math.max(prev - 1, 0);
          rowRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          return next;
        });
        return;
      }

      // Status keys: P, A, L, V
      if (currentStudent && isEditable) {
        const key = e.key.toUpperCase();
        let newStatus: AttendanceStatus | null = null;
        if (key === 'P') newStatus = 'present';
        else if (key === 'A') newStatus = 'absent';
        else if (key === 'L') newStatus = 'late';
        else if (key === 'V') newStatus = 'leave';

        if (newStatus) {
          e.preventDefault();
          handleStatusChange(currentStudent.id, newStatus);
          // Auto-advance to next student for rapid marking!
          setFocusedIndex((prev) => {
            const next = Math.min(prev + 1, students.length - 1);
            rowRefs.current[next]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            return next;
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [students, focusedIndex, isEditable, handleStatusChange, handleSaveAttendance]);

  if (isLoading) {
    return (
      <div className="py-20 text-center text-ink-500">
        <p className="text-sm">Loading attendance register...</p>
      </div>
    );
  }

  if (!classInfo) {
    return (
      <div className="py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-ink-900">Class Not Found</h2>
        <p className="text-sm text-ink-500">The requested class roster could not be loaded.</p>
        <Link href="/admin/classes">
          <Button variant="secondary">Back to Classes</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Summary and Metric Bar */}
      <AttendanceSummaryBar
        classNameTitle={`Grade ${classInfo.grade}-${classInfo.section}`}
        campusName={campus?.name ?? 'Main Campus'}
        date={selectedDate}
        onDateChange={(d) => setSelectedDate(d)}
        presentCount={presentCount}
        absentCount={absentCount}
        lateCount={lateCount}
        leaveCount={leaveCount}
        totalStudents={students.length}
        percentage={percentage}
        markedByName={markedByUser?.name}
        markedAt={attendanceRecord?.markedAt}
        editedByName={editedByUser?.name}
        editedAt={attendanceRecord?.editedAt}
        canEdit={isEditable}
      />

      {/* Attendance Audit Banner (Marker, Editor, and Edit Window Status) */}
      <AttendanceAuditBanner
        attendanceRecord={attendanceRecord}
        markedByUser={markedByUser}
        editedByUser={editedByUser}
        editWindowCheck={editWindowCheck}
        onViewAuditHistory={() => setIsAuditModalOpen(true)}
      />

      {/* Keyboard Shortcuts & Scanner Switcher Helper Pill */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 px-3 py-2 rounded-lg bg-surface-alt border border-rule text-xs text-ink-600">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-ink-800">⌨️ Shortcuts:</span>
          <span className="hidden sm:inline">
            <kbd className="px-1.5 py-0.5 rounded bg-surface border border-rule font-mono text-[11px]">↑</kbd> /{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-surface border border-rule font-mono text-[11px]">↓</kbd> Navigate ·{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-surface border border-rule font-mono text-[11px]">P</kbd> Present ·{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-surface border border-rule font-mono text-[11px]">A</kbd> Absent ·{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-surface border border-rule font-mono text-[11px]">L</kbd> Late ·{' '}
            <kbd className="px-1.5 py-0.5 rounded bg-surface border border-rule font-mono text-[11px]">V</kbd> Leave
          </span>
          <span className="sm:hidden">P/A/L/V to mark</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/teacher/attendance/scan?classId=${classId}&date=${selectedDate}`}>
            <Button variant="secondary" size="sm" className="h-7 text-xs font-semibold" leftIcon={<NavIcon name="camera" className="w-3.5 h-3.5" />}>
              QR Scanner Mode
            </Button>
          </Link>
          <div className="text-[11px] text-ink-500 hidden md:inline">
            <kbd className="px-1.5 py-0.5 rounded bg-surface border border-rule font-mono">Ctrl+S</kbd> Save
          </div>
        </div>
      </div>

      {/* Student Roster Register */}
      <div className="bg-surface rounded-xl border border-rule shadow-xs overflow-hidden divide-y divide-rule">
        {students.length === 0 ? (
          <div className="py-16 text-center text-ink-500">
            <p className="font-semibold text-ink-700">No active students in this class</p>
            <p className="text-xs text-ink-400 mt-1">
              Enroll students or check the class status.
            </p>
          </div>
        ) : (
          students.map((item, index) => {
            const currentStatus = statusMap.get(item.student.id) ?? 'present';
            const isFocused = focusedIndex === index;

            return (
              <div
                key={item.student.id}
                ref={(el) => {
                  rowRefs.current[index] = el;
                }}
                onClick={() => setFocusedIndex(index)}
                className={`
                  p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors cursor-pointer
                  ${isFocused ? 'bg-brand-50/60 ring-1 ring-inset ring-brand-300' : 'hover:bg-surface-alt'}
                `}
              >
                {/* Left: Roll, Avatar, Name, Admission */}
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 text-center font-mono text-xs font-bold text-ink-500">
                    {item.student.rollNumber || index + 1}
                  </span>
                  <Avatar name={item.user.name} size="sm" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink-900 text-sm truncate">
                        {item.user.name}
                      </span>
                      {isFocused && (
                        <span className="hidden md:inline-block text-[10px] font-semibold bg-brand-100 text-brand-800 px-1.5 py-0.2 rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-ink-500 block">
                      Adm: #{item.student.admissionNumber}
                    </span>
                  </div>
                </div>

                {/* Right: 44px Segmented Status Control */}
                <div className="self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
                  <AttendanceStatusControl
                    value={currentStatus}
                    onChange={(st) => handleStatusChange(item.student.id, st)}
                    disabled={!isEditable}
                    studentId={item.student.id}
                    studentName={item.user.name}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sticky Save Bar */}
      <AttendanceSaveBar
        presentCount={presentCount}
        absentCount={absentCount}
        lateCount={lateCount}
        leaveCount={leaveCount}
        totalStudents={students.length}
        isSaving={isSaving}
        canEdit={isEditable}
        onSave={handleSaveAttendance}
        onMarkAllPresent={handleMarkAllPresent}
      />

      {/* Attendance Audit Modal */}
      <AttendanceAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        attendanceRecord={attendanceRecord}
        markedByUser={markedByUser}
        editedByUser={editedByUser}
        editWindowCheck={editWindowCheck}
        classNameString={`Grade ${classInfo.grade}-${classInfo.section}`}
        dateString={selectedDate}
      />
    </div>
  );
}
