'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
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
  getAttendanceByClassAndDate,
  saveAttendance,
} from '@/lib/repositories/attendance';
import { listClasses, getClass } from '@/lib/repositories/classes';
import { getCampus } from '@/lib/repositories/campuses';
import { listStudents } from '@/lib/repositories/students';
import { listUsers } from '@/lib/repositories/users';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/ui/Toast';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { AttendanceGrid } from './AttendanceGrid';
import { NavIcon } from '@/components/shell/NavIcon';

export interface QRScannerMockProps {
  initialClassId?: ID;
  initialDate?: ISODate;
  onFallbackToManual?: () => void;
}

export interface ScannedStudentEvent {
  student: Student;
  user: User;
  scannedAt: string; // ISO or formatted time
  timestamp: number;
  status: AttendanceStatus;
}

interface EnrichedStudentItem {
  student: Student;
  user: User;
}

export function QRScannerMock({
  initialClassId,
  initialDate = '2026-09-08',
  onFallbackToManual,
}: QRScannerMockProps) {
  const { session } = useSession();
  const { showToast } = useToast();
  const schoolId = session?.schoolId ?? 'sch_main';

  // View Mode: 'scanner' or 'manual' (seamless fallback without page reload)
  const [viewMode, setViewMode] = useState<'scanner' | 'manual'>('scanner');
  const [activeTab, setActiveTab] = useState<'scanned' | 'pending' | 'rfid'>('scanned');

  // Selection states
  const [classList, setClassList] = useState<Class[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<ID>(initialClassId || '');
  const [selectedDate, setSelectedDate] = useState<ISODate>(initialDate);

  // Class & Student data
  const [classInfo, setClassInfo] = useState<Class | null>(null);
  const [campus, setCampus] = useState<Campus | null>(null);
  const [students, setStudents] = useState<EnrichedStudentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Scanned status tracking
  const [scannedEvents, setScannedEvents] = useState<ScannedStudentEvent[]>([]);
  const [statusMap, setStatusMap] = useState<Map<ID, AttendanceStatus>>(new Map());
  const [lastScanned, setLastScanned] = useState<ScannedStudentEvent | null>(null);

  // Scanner controls
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [manualInput, setManualInput] = useState<string>('');
  const [selectedStudentToScan, setSelectedStudentToScan] = useState<string>('');
  const audioContextRef = useRef<AudioContext | null>(null);

  // Play pleasant short beep
  const playScanBeep = useCallback(() => {
    if (!soundEnabled) return;
    try {
      if (!audioContextRef.current && typeof window !== 'undefined') {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          audioContextRef.current = new AudioCtx();
        }
      }
      if (audioContextRef.current) {
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }
        const ctx = audioContextRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08); // E6 chime
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      }
    } catch {
      // AudioContext unavailable or blocked in mock/headless
    }
  }, [soundEnabled]);

  // Load available classes for current scope
  useEffect(() => {
    let isMounted = true;
    async function loadScopeClasses() {
      try {
        const scope: Scope = {
          schoolId,
          campusId: session?.campusId,
        };
        const classes = await listClasses(scope);
        if (isMounted) {
          setClassList(classes);
          if (!selectedClassId && classes.length > 0) {
            setSelectedClassId(classes[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load classes:', err);
      }
    }
    loadScopeClasses();
    return () => {
      isMounted = false;
    };
  }, [schoolId, session?.campusId, selectedClassId]);

  // Load roster and attendance data for selected class
  const loadClassData = useCallback(async () => {
    if (!selectedClassId) return;
    setIsLoading(true);
    try {
      const cls = await getClass(selectedClassId);
      setClassInfo(cls);
      if (cls?.campusId) {
        const cmp = await getCampus(cls.campusId);
        setCampus(cmp);
      }

      // Load enrolled students
      const allStudents = await listStudents({ schoolId, campusId: cls?.campusId });
      const classStudents = allStudents.filter((s) => s.classId === selectedClassId && s.status === 'active');
      const allUsers = await listUsers({ schoolId });
      const userMap = new Map<ID, User>(allUsers.map((u) => [u.id, u]));

      const enriched: EnrichedStudentItem[] = classStudents
        .map((s) => ({
          student: s,
          user: userMap.get(s.userId)!,
        }))
        .filter((item) => Boolean(item.user))
        .sort((a, b) => (a.student.rollNumber || '').localeCompare(b.student.rollNumber || ''));

      setStudents(enriched);

      // Load existing attendance register for this date
      const scope: Scope = { schoolId, campusId: cls?.campusId };
      const record = await getAttendanceByClassAndDate(scope, selectedClassId, selectedDate);

      const nextStatusMap = new Map<ID, AttendanceStatus>();
      const existingScanned: ScannedStudentEvent[] = [];

      if (record) {
        for (const sId of record.present || []) {
          nextStatusMap.set(sId, 'present');
          const found = enriched.find((e) => e.student.id === sId);
          if (found) {
            existingScanned.push({
              student: found.student,
              user: found.user,
              scannedAt: record.markedAt ? new Date(record.markedAt).toLocaleTimeString() : '08:00 AM',
              timestamp: Date.now() - existingScanned.length * 1000,
              status: 'present',
            });
          }
        }
        for (const sId of record.late || []) {
          nextStatusMap.set(sId, 'late');
          const found = enriched.find((e) => e.student.id === sId);
          if (found) {
            existingScanned.push({
              student: found.student,
              user: found.user,
              scannedAt: record.markedAt ? new Date(record.markedAt).toLocaleTimeString() : '08:35 AM',
              timestamp: Date.now() - existingScanned.length * 1000,
              status: 'late',
            });
          }
        }
        for (const sId of record.absent || []) {
          nextStatusMap.set(sId, 'absent');
        }
        for (const sId of record.leave || []) {
          nextStatusMap.set(sId, 'leave');
        }
      } else {
        // If not marked yet, students default to absent until scanned
        for (const s of enriched) {
          nextStatusMap.set(s.student.id, 'absent');
        }
      }

      setStatusMap(nextStatusMap);
      setScannedEvents(existingScanned);
    } catch (err) {
      console.error('Failed to load class attendance data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedClassId, selectedDate, schoolId]);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) {
        loadClassData();
      }
    });
    return () => {
      ignore = true;
    };
  }, [loadClassData]);

  // Derived sets: scanned IDs and pending unscanned students
  const scannedStudentIds = useMemo(() => {
    return new Set(scannedEvents.map((e) => e.student.id));
  }, [scannedEvents]);

  const pendingStudents = useMemo(() => {
    return students.filter((s) => !scannedStudentIds.has(s.student.id));
  }, [students, scannedStudentIds]);

  // Scan execution logic
  const handlePerformScan = useCallback(
    (studentItem: EnrichedStudentItem, scanTypeLabel: string = 'Scan') => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // Determine status: if after 08:30 AM on today, mark late; else present
      const isLate = now.getHours() > 8 || (now.getHours() === 8 && now.getMinutes() >= 30);
      const assignedStatus: AttendanceStatus = isLate ? 'late' : 'present';

      const scanEvent: ScannedStudentEvent = {
        student: studentItem.student,
        user: studentItem.user,
        scannedAt: timeStr,
        timestamp: Date.now(),
        status: assignedStatus,
      };

      // Play audio chime
      playScanBeep();

      // Update states
      setLastScanned(scanEvent);
      setScannedEvents((prev) => [scanEvent, ...prev.filter((e) => e.student.id !== studentItem.student.id)]);
      setStatusMap((prev) => {
        const copy = new Map(prev);
        copy.set(studentItem.student.id, assignedStatus);
        return copy;
      });

      showToast({
        type: 'success',
        title: `✓ ${studentItem.user.name} Scanned`,
        message: `${scanTypeLabel}: Marked as ${assignedStatus.toUpperCase()} at ${timeStr}.`,
      });
    },
    [playScanBeep, showToast]
  );

  // 1. Simulate Scan: Next Unscanned Student
  const handleSimulateScanNext = useCallback(() => {
    if (pendingStudents.length === 0) {
      showToast({
        type: 'info',
        title: 'All Students Scanned',
        message: 'Every student in this class has already been scanned in.',
      });
      return;
    }
    const nextStudent = pendingStudents[0];
    handlePerformScan(nextStudent, 'Simulated Scan');
  }, [pendingStudents, handlePerformScan, showToast]);

  // 2. Simulate Scan: Random Unscanned Student
  const handleSimulateScanRandom = useCallback(() => {
    if (pendingStudents.length === 0) {
      showToast({
        type: 'info',
        title: 'All Students Scanned',
        message: 'Every student in this class has already been scanned in.',
      });
      return;
    }
    const randomIndex = Math.floor(Math.random() * pendingStudents.length);
    const targetStudent = pendingStudents[randomIndex];
    handlePerformScan(targetStudent, 'Random Scan');
  }, [pendingStudents, handlePerformScan, showToast]);

  // 3. Manual Input Scan (Admission Number / Roll Number / Name)
  const handleManualInputScan = useCallback(() => {
    const q = manualInput.trim().toLowerCase();
    if (!q) return;

    const matched = students.find(
      (item) =>
        item.student.admissionNumber.toLowerCase() === q ||
        item.student.rollNumber.toLowerCase() === q ||
        item.student.id.toLowerCase() === q ||
        item.user.name.toLowerCase().includes(q)
    );

    if (!matched) {
      showToast({
        type: 'error',
        title: 'Student Not Found',
        message: `No student in this class matching "${manualInput}".`,
      });
      return;
    }

    handlePerformScan(matched, 'Barcode Gun Input');
    setManualInput('');
  }, [manualInput, students, handlePerformScan, showToast]);

  // 4. Undo Scan
  const handleUndoScan = useCallback(
    (studentId: ID) => {
      setScannedEvents((prev) => prev.filter((e) => e.student.id !== studentId));
      setStatusMap((prev) => {
        const copy = new Map(prev);
        copy.set(studentId, 'absent');
        return copy;
      });
      if (lastScanned?.student.id === studentId) {
        setLastScanned(null);
      }
      showToast({
        type: 'info',
        title: 'Scan Undone',
        message: 'Student scan reversed; marked as absent.',
      });
    },
    [lastScanned, showToast]
  );

  // 5. Commit & Save Attendance to Repository
  const handleSaveAttendance = async () => {
    if (!classInfo) return;
    setIsSaving(true);
    try {
      const present: ID[] = [];
      const absent: ID[] = [];
      const late: ID[] = [];
      const leave: ID[] = [];

      for (const s of students) {
        const st = statusMap.get(s.student.id) || 'absent';
        if (st === 'present') present.push(s.student.id);
        else if (st === 'late') late.push(s.student.id);
        else if (st === 'leave') leave.push(s.student.id);
        else absent.push(s.student.id);
      }

      const scope: Scope = { schoolId, campusId: classInfo.campusId };
      await saveAttendance(
        scope,
        {
          campusId: classInfo.campusId,
          classId: classInfo.id,
          academicYearId: classInfo.academicYearId || 'ay_2026',
          date: selectedDate,
          present,
          absent,
          late,
          leave,
          markedBy: session?.userId || 'usr_teacher_zahra',
        }
      );

      showToast({
        type: 'success',
        title: 'Attendance Saved',
        message: `Register recorded for ${classInfo.grade}-${classInfo.section} (${scannedEvents.length} scanned).`,
      });
    } catch (err) {
      console.error('Failed to save attendance:', err);
      showToast({
        type: 'error',
        title: 'Save Failed',
        message: 'Could not record attendance register.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Switch to manual grid without reload
  const handleSwitchToManual = () => {
    if (onFallbackToManual) {
      onFallbackToManual();
    } else {
      setViewMode('manual');
    }
  };

  // If in Manual Grid fallback mode, render AttendanceGrid seamlessly without reload
  if (viewMode === 'manual' && selectedClassId) {
    return (
      <div className="flex flex-col gap-4">
        {/* Banner to switch back to QR Scanner without reload */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-purple-50 border border-purple-200 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-600 text-white font-bold text-sm">
              <NavIcon name="camera" className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-purple-950">Manual Attendance Grid Mode</h3>
              <p className="text-xs text-purple-700">
                You switched from QR scanner. All scanned students remain marked in the grid.
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setViewMode('scanner')}
            className="flex items-center gap-1.5"
          >
            ← Return to QR Scanner
          </Button>
        </div>

        {/* Seamless inline AttendanceGrid component */}
        <AttendanceGrid classId={selectedClassId} initialDate={selectedDate} />
      </div>
    );
  }

  const scannedCount = scannedEvents.length;
  const totalCount = students.length;
  const scanPercentage = totalCount > 0 ? Math.round((scannedCount / totalCount) * 100) : 0;

  return (
    <div className="flex flex-col gap-6 max-w-7xl w-full">
      {/* 1. Header & Context Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-5 rounded-2xl bg-white border border-neutral-200 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-black text-neutral-900 tracking-tight">
              Smart QR Attendance Scanner
            </h1>
            <span className="rounded-full bg-purple-100 text-purple-800 text-xs font-black px-2.5 py-0.5 border border-purple-200">
              Mock Camera Scanner
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Simulate real-time student badge check-in with live camera viewfinder, instant audio chime, and automatic attendance register recording.
          </p>
        </div>

        {/* Class Selector, Date Picker, and Mode Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Class Select */}
          <div className="flex items-center gap-2">
            <label htmlFor="class-selector" className="text-xs font-bold text-neutral-600">
              Class:
            </label>
            <select
              id="class-selector"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 shadow-xs focus:border-purple-500 focus:outline-hidden"
            >
              {classList.map((c) => (
                <option key={c.id} value={c.id}>
                  Grade {c.grade}-{c.section}
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div className="flex items-center gap-2">
            <label htmlFor="scan-date" className="text-xs font-bold text-neutral-600">
              Date:
            </label>
            <input
              id="scan-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value as ISODate)}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-800 shadow-xs focus:border-purple-500 focus:outline-hidden"
            />
          </div>

          {/* Seamless Fallback to Manual Button (No Reload) */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleSwitchToManual}
            className="flex items-center gap-1.5"
            title="Switch to manual attendance grid without reloading the page"
            leftIcon={<NavIcon name="clipboard" className="w-3.5 h-3.5" />}
          >
            Manual Grid View
          </Button>
        </div>
      </div>

      {/* 2. Top Metric KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Total Enrolled"
          value={isLoading ? '...' : totalCount}
          subtitle={classInfo ? `Grade ${classInfo.grade}-${classInfo.section} · ${campus?.name ?? 'Main'}` : 'Roster size'}
        />
        <StatCard
          label="Scanned In"
          value={isLoading ? '...' : scannedCount}
          subtitle="Checked in today"
        />
        <StatCard
          label="Pending Scan"
          value={isLoading ? '...' : pendingStudents.length}
          subtitle="Awaiting badge scan"
        />
        <StatCard
          label="Presence Rate"
          value={isLoading ? '...' : `${scanPercentage}%`}
          subtitle="Of roster checked in"
        />
      </div>

      {/* 3. Main Scanner Interface (2 Columns: Viewfinder & Scanned List) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Viewfinder & Simulation Controls (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Viewfinder Frame Container */}
          <div className="relative aspect-4/3 w-full rounded-2xl bg-neutral-950 border-4 border-neutral-800 shadow-xl overflow-hidden flex flex-col justify-between p-4 sm:p-6 text-white">
            {/* Viewfinder Top Bar: Camera Specs & Chime Toggle */}
            <div className="flex items-center justify-between z-10">
              <div className="flex items-center gap-2 bg-neutral-900/80 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-neutral-700/60 text-xs">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 motion-safe:animate-ping" />
                <span className="font-mono text-emerald-400 font-bold uppercase tracking-wider text-[11px]">
                  SCANNER ACTIVE (1080P HD)
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSoundEnabled((v) => !v)}
                className="flex items-center gap-1.5 bg-neutral-900/80 backdrop-blur-xs hover:bg-neutral-800 px-3 py-1.5 rounded-lg border border-neutral-700/60 text-xs font-semibold transition-colors"
                title="Toggle scan audio chime"
              >
                <span className="inline-flex items-center gap-1.5">
                  <NavIcon name="bell" className={`w-3.5 h-3.5 ${soundEnabled ? '' : 'opacity-40'}`} />
                  {soundEnabled ? 'Chime On' : 'Chime Off'}
                </span>
              </button>
            </div>

            {/* Viewfinder Laser Sweep Line */}
            <div
              className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] pointer-events-none opacity-80"
              style={{
                top: '50%',
                animation: 'scanSweep 3s ease-in-out infinite alternate',
              }}
            />

            {/* Viewfinder Corner Targeting Brackets */}
            <div className="absolute inset-10 sm:inset-14 border-2 border-emerald-500/20 rounded-2xl pointer-events-none">
              {/* Top-Left Corner */}
              <div className="absolute -top-1 -left-1 h-8 w-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
              {/* Top-Right Corner */}
              <div className="absolute -top-1 -right-1 h-8 w-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
              {/* Bottom-Left Corner */}
              <div className="absolute -bottom-1 -left-1 h-8 w-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
              {/* Bottom-Right Corner */}
              <div className="absolute -bottom-1 -right-1 h-8 w-8 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

              {/* Center Targeting Reticle */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center pointer-events-none">
                <div className="h-12 w-12 rounded-full border border-emerald-400/40 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                </div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400/70 mt-2">
                  Align Student QR Badge
                </span>
              </div>
            </div>

            {/* Animated Last Scanned Popup Overlay inside Viewfinder */}
            {lastScanned && (
              <div className="absolute inset-x-4 bottom-4 sm:inset-x-8 sm:bottom-6 z-20 bg-neutral-900/95 backdrop-blur-md border border-emerald-500/60 rounded-xl p-3.5 shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-3">
                  <Avatar name={lastScanned.user.name} size="md" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white leading-none">
                        {lastScanned.user.name}
                      </span>
                      <span className="rounded bg-emerald-950 text-emerald-300 border border-emerald-700/50 text-[10px] font-bold px-1.5 py-0.5">
                        {lastScanned.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-500 mt-1 font-mono">
                      Roll #{lastScanned.student.rollNumber} · {lastScanned.student.admissionNumber} · {lastScanned.scannedAt}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setLastScanned(null)}
                  className="text-neutral-500 hover:text-white p-1 rounded transition-colors text-sm"
                  aria-label="Dismiss scan card"
                >
                  <NavIcon name="x" className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Viewfinder Bottom Status */}
            <div className="flex items-center justify-between text-[11px] text-neutral-500 font-mono z-10">
              <span>FOV: 84° WIDE</span>
              <span>ISO: AUTO (400)</span>
              <span>LATENCY: 12ms</span>
            </div>
          </div>

          {/* 4. Simulation Action Toolbar */}
          <div className="p-5 rounded-2xl bg-white border border-neutral-200 shadow-xs flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Hardware Simulator Controls
              </span>
              <span className="text-xs text-neutral-500">
                {pendingStudents.length} unscanned remaining
              </span>
            </div>

            {/* Primary Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="primary"
                size="lg"
                onClick={handleSimulateScanNext}
                disabled={pendingStudents.length === 0}
                className="w-full flex items-center justify-center gap-2 py-3 font-bold"
              >
                <NavIcon name="activity" className="w-4 h-4" /> Simulate Scan (Next Student)
              </Button>

              <Button
                variant="secondary"
                size="lg"
                onClick={handleSimulateScanRandom}
                disabled={pendingStudents.length === 0}
                className="w-full flex items-center justify-center gap-2 py-3 font-semibold"
              >
                <NavIcon name="shuffle" className="w-4 h-4" /> Random Scan
              </Button>
            </div>

            {/* Targeted Student Selector */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-neutral-100">
              <div className="flex-1">
                <select
                  value={selectedStudentToScan}
                  onChange={(e) => setSelectedStudentToScan(e.target.value)}
                  className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-800 focus:border-purple-500 focus:outline-hidden"
                >
                  <option value="">-- Choose specific student to scan --</option>
                  {pendingStudents.map((s) => (
                    <option key={s.student.id} value={s.student.id}>
                      Roll #{s.student.rollNumber} - {s.user.name} ({s.student.admissionNumber})
                    </option>
                  ))}
                </select>
              </div>
              <Button
                variant="secondary"
                size="sm"
                disabled={!selectedStudentToScan}
                onClick={() => {
                  const target = students.find((s) => s.student.id === selectedStudentToScan);
                  if (target) {
                    handlePerformScan(target, 'Targeted Scan');
                    setSelectedStudentToScan('');
                  }
                }}
              >
                Scan Chosen
              </Button>
            </div>

            {/* Barcode Scanner Gun Text Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleManualInputScan();
              }}
              className="flex items-center gap-2 pt-2 border-t border-neutral-100"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Scan with handheld barcode gun or enter Admission #..."
                  className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-xs font-mono text-neutral-800 placeholder-neutral-400 focus:border-purple-500 focus:outline-hidden"
                />
              </div>
              <Button variant="secondary" size="sm" type="submit" disabled={!manualInput.trim()}>
                Scan Input
              </Button>
            </form>
          </div>
        </div>

        {/* Right Column: Scanned List, Pending Roster, and RFID Concept (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Tab Navigation Pill Bar */}
          <div className="flex items-center p-1 rounded-xl bg-neutral-100 border border-neutral-200">
            <button
              type="button"
              onClick={() => setActiveTab('scanned')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'scanned'
                  ? 'bg-white text-purple-900 shadow-xs border border-purple-200'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Scanned ({scannedCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'pending'
                  ? 'bg-white text-purple-900 shadow-xs border border-purple-200'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Pending ({pendingStudents.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('rfid')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'rfid'
                  ? 'bg-white text-indigo-900 shadow-xs border border-indigo-200'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <span className="inline-flex items-center gap-1">RFID Concept <NavIcon name="tag" className="w-3.5 h-3.5" /></span>
            </button>
          </div>

          {/* TAB 1: Chronological Scanned Students List */}
          {activeTab === 'scanned' && (
            <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-xs flex flex-col min-h-[460px]">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <span className="text-xs font-bold text-neutral-800">
                  Running Log (Newest First)
                </span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  {scannedCount} Marked Present/Late
                </span>
              </div>

              {scannedEvents.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-neutral-500">
                  <NavIcon name="camera" className="w-8 h-8 mb-2 text-neutral-400" />
                  <p className="text-sm font-semibold text-neutral-700">No students scanned yet</p>
                  <p className="text-xs text-neutral-500 mt-1 max-w-xs">
                    Click &ldquo;Simulate Scan&rdquo; or use the barcode field to record student entry.
                  </p>
                </div>
              ) : (
                <div className="flex-1 divide-y divide-neutral-100 overflow-y-auto max-h-[420px] pr-1 mt-1">
                  {scannedEvents.map((evt) => (
                    <div
                      key={`${evt.student.id}-${evt.timestamp}`}
                      className="py-2.5 flex items-center justify-between gap-3 hover:bg-neutral-50 rounded-lg px-2 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={evt.user.name} size="sm" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-neutral-900">
                              {evt.user.name}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                                evt.status === 'present'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {evt.status === 'present' ? '✓ Present' : '⏱ Late'}
                            </span>
                          </div>
                          <div className="text-[10px] text-neutral-500 font-mono">
                            Roll #{evt.student.rollNumber} · {evt.student.admissionNumber} ·{' '}
                            <span className="text-neutral-600 font-semibold">{evt.scannedAt}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleUndoScan(evt.student.id)}
                        className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-1 rounded transition-colors"
                        title="Undo this scan"
                      >
                        Undo
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Pending Unscanned Students */}
          {activeTab === 'pending' && (
            <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-xs flex flex-col min-h-[460px]">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <span className="text-xs font-bold text-neutral-800">
                  Unscanned Roster ({pendingStudents.length})
                </span>
                <span className="text-[11px] text-neutral-500">
                  Click student to check in
                </span>
              </div>

              {pendingStudents.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-neutral-500">
                  <NavIcon name="check-circle" className="w-8 h-8 mb-2 text-emerald-500" />
                  <p className="text-sm font-semibold text-emerald-700">100% Attendance Complete</p>
                  <p className="text-xs text-neutral-500 mt-1">
                    All students in this class have scanned their badges.
                  </p>
                </div>
              ) : (
                <div className="flex-1 divide-y divide-neutral-100 overflow-y-auto max-h-[420px] pr-1 mt-1">
                  {pendingStudents.map((item) => (
                    <div
                      key={item.student.id}
                      className="py-2.5 flex items-center justify-between gap-3 hover:bg-neutral-50 rounded-lg px-2 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={item.user.name} size="sm" />
                        <div>
                          <div className="text-xs font-bold text-neutral-900">
                            {item.user.name}
                          </div>
                          <div className="text-[10px] text-neutral-500 font-mono">
                            Roll #{item.student.rollNumber} · {item.student.admissionNumber}
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handlePerformScan(item, 'Manual Check-in')}
                        className="text-xs"
                      >
                        Scan Now
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RFID Concept Screen (Differentiation Screen 4) */}
          {activeTab === 'rfid' && (
            <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-200 shadow-xs flex flex-col gap-4">
              {/* Prominent Concept Disclaimer */}
              <div className="flex items-center gap-2.5 p-3 bg-amber-100 border border-amber-300 rounded-xl text-amber-950">
                <NavIcon name="alert-triangle" className="w-5 h-5 shrink-0" />
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-900">
                    CONCEPT ONLY — Hardware Integration Not Implemented
                  </h4>
                  <p className="text-[11px] text-amber-800 leading-snug">
                    This screen previews future physical UHF RFID walk-through gate integration. Not yet deployed to hardware.
                  </p>
                </div>
              </div>

              {/* Hardware Overview Cards */}
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-white border border-indigo-100 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 font-bold text-neutral-900">
                      <NavIcon name="tag" className="w-3.5 h-3.5" /> UHF RFID Gate Reader (865–868 MHz)
                    </span>
                    <span className="rounded bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5">
                      Spec Ready
                    </span>
                  </div>
                  <p className="text-neutral-600 mt-1 leading-relaxed text-[11px]">
                    Multi-lane overhead gantry antennas read student ID cards within a 3.5m radius as students walk into the campus gates, without requiring active contact or phone scans.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-indigo-100 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 font-bold text-neutral-900">
                      <NavIcon name="activity" className="w-3.5 h-3.5" /> WhatsApp Arrival Webhook Dispatch
                    </span>
                    <span className="rounded bg-purple-100 text-purple-800 text-[10px] font-black px-2 py-0.5">
                      Automated
                    </span>
                  </div>
                  <p className="text-neutral-600 mt-1 leading-relaxed text-[11px]">
                    When a badge tap is recorded at the main gate, the system instantly logs arrival and triggers an automated WhatsApp message to parents: <em>&ldquo;Your child Ahmed Khan has arrived safely at school at 07:55 AM.&rdquo;</em>
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-indigo-100 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 font-bold text-neutral-900">
                      <NavIcon name="battery" className="w-3.5 h-3.5" /> Offline Buffer & 4-Hour Battery UPS
                    </span>
                    <span className="rounded bg-neutral-100 text-neutral-700 text-[10px] font-black px-2 py-0.5">
                      Fail-safe
                    </span>
                  </div>
                  <p className="text-neutral-600 mt-1 leading-relaxed text-[11px]">
                    Equipped with local SQLite buffer storage in turnstile controllers; events sync back to the cloud automatically upon internet restoration.
                  </p>
                </div>
              </div>

              {/* Mock Turnstile Event Stream */}
              <div className="p-3 rounded-xl bg-neutral-900 text-neutral-500 font-mono text-[11px] space-y-1.5">
                <div className="text-emerald-400 font-bold border-b border-neutral-800 pb-1 flex justify-between">
                  <span>MOCK TURNSTILE EVENT STREAM</span>
                  <span className="motion-safe:animate-pulse text-emerald-400">LIVE</span>
                </div>
                <div className="text-neutral-500">
                  [07:54:12] GATE_01: Card #98231 scanned -&gt; Stu: Ayesha Khan
                </div>
                <div className="text-neutral-500">
                  [07:55:04] GATE_01: Card #98232 scanned -&gt; Stu: Ahmed Khan
                </div>
                <div className="text-emerald-300">
                  [07:55:05] WA_DISPATCH: Alert sent to Tariq Khan (+923001234567)
                </div>
              </div>
            </div>
          )}

          {/* Sticky Commit Save Bar */}
          <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-xs flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-neutral-900 block">
                Save Scanned Register
              </span>
              <span className="text-[11px] text-neutral-500">
                {scannedCount} present, {pendingStudents.length} absent
              </span>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={handleSaveAttendance}
              disabled={isSaving || students.length === 0}
              className="px-5 font-bold"
              rightIcon={isSaving ? undefined : <NavIcon name="check-circle" className="w-4 h-4" />}
            >
              {isSaving ? 'Saving...' : 'Commit Register'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
