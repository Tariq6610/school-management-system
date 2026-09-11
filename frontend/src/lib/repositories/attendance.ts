import { getItem, setItem, STORAGE_KEYS } from '@/lib/storage';
import {
  AttendanceDay,
  AttendanceFilter,
  AttendanceStatus,
  AttendanceSummary,
  ClassAttendanceMatrixCell,
  ClassAttendanceMatrixRow,
  ClassAttendanceReport,
  ClassAttendanceStatus,
  ClassStudentAttendanceRow,
  DateRangeAttendanceDayRow,
  DateRangeAttendanceReport,
  ID,
  ISODate,
  Role,
  SaveAttendanceInput,
  Scope,
  StudentAttendanceRecord,
  StudentAttendanceReport,
  StudentAttendanceStats,
  StudentMonthAttendance,
  User,
} from '@/types';
import {
  deleteCollectionItem,
  getCollectionItem,
  listCollection,
} from './base';
import { getCampus, listCampuses } from './campuses';
import { getClass, listClasses } from './classes';
import { getStudent, listActiveStudents } from './students';
import { listTeachers } from './teachers';
import { getUser, listUsers } from './users';
import { attendancePercentage, getMonthName, getWeekdayName } from '@/lib/utils';

/**
 * Lists attendance day documents matching scope and optional filters.
 * Note: Each document represents an entire class cohort on a given date (DATA_MODELS.md §4).
 */
export async function listAttendanceDays(
  scope: Scope,
  filter?: AttendanceFilter
): Promise<AttendanceDay[]> {
  return listCollection<AttendanceDay>(STORAGE_KEYS.ATTENDANCE, scope, (day) => {
    if (filter?.date && day.date !== filter.date) return false;
    if (filter?.startDate && day.date < filter.startDate) return false;
    if (filter?.endDate && day.date > filter.endDate) return false;
    if (filter?.classId && day.classId !== filter.classId) return false;
    if (filter?.campusId && day.campusId !== filter.campusId) return false;
    if (filter?.academicYearId && day.academicYearId !== filter.academicYearId) return false;
    return true;
  });
}

/**
 * Retrieves the AttendanceDay document for a specific class on a calendar date.
 */
export async function getAttendanceByClassAndDate(
  scope: Scope,
  classId: ID,
  date: ISODate
): Promise<AttendanceDay | null> {
  const days = await listCollection<AttendanceDay>(
    STORAGE_KEYS.ATTENDANCE,
    scope,
    (day) => day.classId === classId && day.date === date
  );
  return days[0] ?? null;
}

/**
 * Retrieves an attendance document by its unique document ID (e.g. att_cls_8a_2026-09-08).
 */
export async function getAttendanceRecord(id: ID): Promise<AttendanceDay | null> {
  return getCollectionItem<AttendanceDay>(STORAGE_KEYS.ATTENDANCE, id);
}

/**
 * Saves or updates a per-class-per-day attendance document.
 * Acceptance criteria:
 * - Matches DATA_MODELS.md §4 with canonical ID format: att_${classId}_${date}
 * - Stored strictly per class per day (no per-student rows)
 * - Tracks markedAt/markedBy on creation and editedAt/editedBy on revisions
 */
export async function saveAttendance(
  scope: Scope,
  input: SaveAttendanceInput
): Promise<AttendanceDay> {
  const items = getItem<AttendanceDay[]>(STORAGE_KEYS.ATTENDANCE, []) ?? [];
  const targetId = input.id ?? `att_${input.classId}_${input.date}`;
  const existingIndex = items.findIndex(
    (i) => i.id === targetId || (i.classId === input.classId && i.date === input.date)
  );

  const now = new Date().toISOString();

  // Deduplicate student IDs across arrays (leave > late > present > absent)
  const leaveSet = new Set(input.leave ?? []);
  const lateSet = new Set((input.late ?? []).filter((id) => !leaveSet.has(id)));
  const presentSet = new Set(
    (input.present ?? []).filter((id) => !leaveSet.has(id) && !lateSet.has(id))
  );
  const absentSet = new Set(
    (input.absent ?? []).filter(
      (id) => !leaveSet.has(id) && !lateSet.has(id) && !presentSet.has(id)
    )
  );

  const present = Array.from(presentSet);
  const absent = Array.from(absentSet);
  const late = Array.from(lateSet);
  const leave = Array.from(leaveSet);

  if (existingIndex >= 0) {
    const existing = items[existingIndex];
    const updated: AttendanceDay = {
      ...existing,
      present,
      absent,
      late,
      leave,
      schoolId: scope.schoolId,
      campusId: scope.campusId ?? input.campusId ?? existing.campusId,
      classId: input.classId,
      academicYearId: input.academicYearId ?? existing.academicYearId,
      date: input.date,
      markedBy: existing.markedBy,
      markedAt: existing.markedAt,
      editedBy: input.editedBy ?? input.markedBy,
      editedAt: now,
    };
    items[existingIndex] = updated;
    setItem(STORAGE_KEYS.ATTENDANCE, items);
    return updated;
  } else {
    let resolvedCampusId = scope.campusId ?? input.campusId;
    if (!resolvedCampusId) {
      const cls = await getClass(input.classId);
      resolvedCampusId = cls?.campusId ?? 'cmp_main';
    }

    const created: AttendanceDay = {
      id: targetId,
      schoolId: scope.schoolId,
      campusId: resolvedCampusId,
      classId: input.classId,
      academicYearId: input.academicYearId ?? 'ay_2026',
      date: input.date,
      present,
      absent,
      late,
      leave,
      markedBy: input.markedBy,
      markedAt: input.markedAt ?? now,
      editedBy: input.editedBy,
      editedAt: input.editedAt,
    };
    items.push(created);
    setItem(STORAGE_KEYS.ATTENDANCE, items);
    return created;
  }
}

/**
 * Deletes an attendance document.
 */
export async function deleteAttendance(id: ID): Promise<void> {
  return deleteCollectionItem<AttendanceDay>(STORAGE_KEYS.ATTENDANCE, id);
}

/**
 * Computes a class daily attendance summary on read (never stored, DATA_MODELS.md §4).
 */
export function calculateClassDaySummary(attendanceDay: AttendanceDay): AttendanceSummary {
  const presentCount = attendanceDay.present.length;
  const absentCount = attendanceDay.absent.length;
  const lateCount = attendanceDay.late.length;
  const leaveCount = attendanceDay.leave.length;
  const totalStudents = presentCount + absentCount + lateCount + leaveCount;

  // Present and Late students count as attended in standard presence rate
  const percentage =
    totalStudents > 0
      ? Math.round(((presentCount + lateCount) / totalStudents) * 1000) / 10
      : 0;

  return {
    totalStudents,
    presentCount,
    absentCount,
    lateCount,
    leaveCount,
    percentage,
  };
}

/**
 * Returns chronological daily attendance records for a specific student, computed on read.
 */
export async function getStudentAttendanceHistory(
  scope: Scope,
  studentId: ID,
  startDate?: ISODate,
  endDate?: ISODate
): Promise<StudentAttendanceRecord[]> {
  const days = await listAttendanceDays(scope, { startDate, endDate });
  const records: StudentAttendanceRecord[] = [];

  for (const day of days) {
    let status: 'present' | 'absent' | 'late' | 'leave' | null = null;
    if (day.present.includes(studentId)) {
      status = 'present';
    } else if (day.absent.includes(studentId)) {
      status = 'absent';
    } else if (day.late.includes(studentId)) {
      status = 'late';
    } else if (day.leave.includes(studentId)) {
      status = 'leave';
    }

    if (status) {
      records.push({
        date: day.date,
        status,
        attendanceDayId: day.id,
        markedAt: day.markedAt,
        editedAt: day.editedAt,
      });
    }
  }

  // Sort chronologically by date
  return records.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Computes comprehensive attendance statistics for a single student on read.
 */
export async function calculateStudentAttendanceStats(
  scope: Scope,
  studentId: ID,
  startDate?: ISODate,
  endDate?: ISODate
): Promise<StudentAttendanceStats> {
  const history = await getStudentAttendanceHistory(scope, studentId, startDate, endDate);
  const totalDays = history.length;
  const presentCount = history.filter((h) => h.status === 'present').length;
  const absentCount = history.filter((h) => h.status === 'absent').length;
  const lateCount = history.filter((h) => h.status === 'late').length;
  const leaveCount = history.filter((h) => h.status === 'leave').length;

  const percentage =
    totalDays > 0
      ? Math.round(((presentCount + lateCount) / totalDays) * 1000) / 10
      : 0;

  return {
    studentId,
    totalDays,
    presentCount,
    absentCount,
    lateCount,
    leaveCount,
    percentage,
  };
}

/**
 * Computes whether attendance has been marked for each class on a given date.
 * Powers the administrative overview grid (TASK-036) and teacher dashboard (TASK-035).
 */
export async function getClassesAttendanceStatusForDate(
  scope: Scope,
  date: ISODate
): Promise<ClassAttendanceStatus[]> {
  const [classes, days] = await Promise.all([
    listClasses(scope),
    listAttendanceDays(scope, { date }),
  ]);

  const dayMap = new Map<ID, AttendanceDay>();
  days.forEach((d) => dayMap.set(d.classId, d));

  return classes.map((cls) => {
    const attendanceDay = dayMap.get(cls.id);
    const isMarked = Boolean(attendanceDay);
    const summary = attendanceDay ? calculateClassDaySummary(attendanceDay) : undefined;

    return {
      classId: cls.id,
      className: `${cls.grade}-${cls.section}`,
      campusId: cls.campusId,
      isMarked,
      attendanceDay,
      summary,
    };
  });
}

export interface AttendanceEditWindowCheck {
  canEdit: boolean;
  isAdminOverride: boolean;
  isExpired: boolean;
  windowHours: number;
  hoursRemaining: number;
  minutesRemaining: number;
  reason?: string;
}

/**
 * Evaluates whether an attendance record is within the permitted edit window (TASK-034).
 * School Admins and Super Admins can edit at any time (with admin override tracking when expired);
 * teachers can edit within windowHours (default 48h / 2 days per FEATURE_SPECIFICATIONS.md §8).
 */
export function canEditAttendance(
  attendanceDay: AttendanceDay,
  userRole: Role,
  windowHours = 48
): AttendanceEditWindowCheck {
  const markedTime = new Date(attendanceDay.markedAt).getTime();
  const now = Date.now();
  const elapsedMs = Math.max(0, now - markedTime);
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const windowMs = windowHours * 60 * 60 * 1000;
  const isExpired = elapsedHours > windowHours;
  const remainingMs = Math.max(0, windowMs - elapsedMs);
  const hoursRemaining = Math.floor(remainingMs / (1000 * 60 * 60));
  const minutesRemaining = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

  const isAdmin = userRole === 'super_admin' || userRole === 'school_admin';

  if (isAdmin) {
    return {
      canEdit: true,
      isAdminOverride: isExpired,
      isExpired,
      windowHours,
      hoursRemaining,
      minutesRemaining,
      reason: isExpired
        ? `Edit window expired (${Math.floor(elapsedHours)}h elapsed), but administrative override is active.`
        : undefined,
    };
  }

  if (!isExpired) {
    return {
      canEdit: true,
      isAdminOverride: false,
      isExpired: false,
      windowHours,
      hoursRemaining,
      minutesRemaining,
    };
  }

  return {
    canEdit: false,
    isAdminOverride: false,
    isExpired: true,
    windowHours,
    hoursRemaining: 0,
    minutesRemaining: 0,
    reason: `The ${windowHours}-hour edit window for this attendance register has expired. Please contact a school administrator to request an attendance modification.`,
  };
}

/**
 * Evaluates whether a class register on a given calendar date is past the morning cutoff time.
 * Acceptance criteria: Unmarked classes past cutoff are highlighted.
 * - Dates prior to today: always considered past cutoff if unmarked (true)
 * - Dates after today: future date, not yet past cutoff (false)
 * - Today: compares current time (or referenceNow) against cutoffTime (e.g. '08:30')
 */
export function isPastCutoff(
  date: ISODate,
  cutoffTime: string = '08:30',
  referenceNow: Date = new Date()
): boolean {
  const yyyy = referenceNow.getFullYear();
  const mm = String(referenceNow.getMonth() + 1).padStart(2, '0');
  const dd = String(referenceNow.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  if (date < todayStr) return true;
  if (date > todayStr) return false;

  const [cutoffHourStr = '8', cutoffMinStr = '30'] = cutoffTime.split(':');
  const cutoffHour = parseInt(cutoffHourStr, 10);
  const cutoffMin = parseInt(cutoffMinStr, 10);

  const currentHour = referenceNow.getHours();
  const currentMin = referenceNow.getMinutes();

  if (currentHour > cutoffHour) return true;
  if (currentHour === cutoffHour && currentMin >= cutoffMin) return true;
  return false;
}

/**
 * Retrieves the comprehensive classes × dates attendance matrix for administrative overview (TASK-036).
 * Returns rows with class, campus, assigned class teacher, student count, and status for each date.
 */
export async function getAttendanceMatrix(
  scope: Scope,
  dates: ISODate[],
  cutoffTime: string = '08:30',
  referenceNow: Date = new Date()
): Promise<ClassAttendanceMatrixRow[]> {
  if (dates.length === 0) return [];

  const sortedDates = [...dates].sort();
  const startDate = sortedDates[0];
  const endDate = sortedDates[sortedDates.length - 1];

  const [classes, campuses, teachers, users, students, allDays] = await Promise.all([
    listClasses(scope),
    listCampuses(scope),
    listTeachers(scope),
    listUsers(scope),
    listActiveStudents(scope),
    listAttendanceDays(scope, { startDate, endDate }),
  ]);

  const campusMap = new Map<ID, string>();
  campuses.forEach((c) => campusMap.set(c.id, c.name));

  const userMap = new Map<ID, User>();
  users.forEach((u) => userMap.set(u.id, u));

  const teacherMap = new Map<ID, { user?: User; employeeNumber: string }>();
  teachers.forEach((t) => {
    teacherMap.set(t.id, {
      user: userMap.get(t.userId),
      employeeNumber: t.employeeNumber,
    });
  });

  const studentsByClass = new Map<ID, number>();
  students.forEach((s) => {
    studentsByClass.set(s.classId, (studentsByClass.get(s.classId) ?? 0) + 1);
  });

  const dayLookup = new Map<string, AttendanceDay>();
  allDays.forEach((d) => {
    dayLookup.set(`${d.classId}_${d.date}`, d);
  });

  return classes.map((cls) => {
    const campusName = campusMap.get(cls.campusId) ?? 'Main Campus';
    const teacherInfo = cls.classTeacherId ? teacherMap.get(cls.classTeacherId) : undefined;
    const teacherName = teacherInfo?.user?.name;
    const teacherEmail = teacherInfo?.user?.email;
    const teacherEmployeeNumber = teacherInfo?.employeeNumber;
    const totalStudents = studentsByClass.get(cls.id) ?? 0;

    const cells: Record<ISODate, ClassAttendanceMatrixCell> = {};

    for (const date of dates) {
      const attendanceDay = dayLookup.get(`${cls.id}_${date}`);
      const isMarked = Boolean(attendanceDay);
      const pastCutoff = !isMarked && isPastCutoff(date, cutoffTime, referenceNow);
      const summary = attendanceDay ? calculateClassDaySummary(attendanceDay) : undefined;

      cells[date] = {
        date,
        isMarked,
        isPastCutoff: pastCutoff,
        attendanceDay,
        summary,
        absentCount: attendanceDay?.absent.length ?? 0,
        presentCount: attendanceDay?.present.length ?? 0,
        lateCount: attendanceDay?.late.length ?? 0,
        leaveCount: attendanceDay?.leave.length ?? 0,
      };
    }

    return {
      classInfo: cls,
      campusName,
      teacherName,
      teacherEmail,
      teacherEmployeeNumber,
      totalStudents,
      cells,
    };
  });
}

/**
 * Generates aggregated attendance report for an entire class cohort across a date range (TASK-037).
 * Acceptance Criteria: By class reporting.
 */
export async function getClassAttendanceReport(
  scope: Scope,
  classId: ID,
  startDate: ISODate,
  endDate: ISODate
): Promise<ClassAttendanceReport | null> {
  const [classInfo, students, users, days] = await Promise.all([
    getClass(classId),
    listActiveStudents(scope, { classId }),
    listUsers(scope),
    listAttendanceDays(scope, { classId, startDate, endDate }),
  ]);

  if (!classInfo) return null;

  const campus = await getCampus(classInfo.campusId);
  const resolvedCampusName = campus?.name ?? 'Main Campus';
  const userMap = new Map<ID, User>();
  users.forEach((u) => userMap.set(u.id, u));

  const sortedDays = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const totalInstructionalDays = sortedDays.length;

  let classTotalPresent = 0;
  let classTotalAbsent = 0;
  let classTotalLate = 0;
  let classTotalLeave = 0;

  const studentRows: ClassStudentAttendanceRow[] = students.map((stu) => {
    const user = userMap.get(stu.userId);
    const studentName = user?.name ?? `Student ${stu.admissionNumber}`;

    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let leaveCount = 0;

    for (const day of sortedDays) {
      if (day.present.includes(stu.id)) presentCount++;
      else if (day.absent.includes(stu.id)) absentCount++;
      else if (day.late.includes(stu.id)) lateCount++;
      else if (day.leave.includes(stu.id)) leaveCount++;
    }

    classTotalPresent += presentCount;
    classTotalAbsent += absentCount;
    classTotalLate += lateCount;
    classTotalLeave += leaveCount;

    const totalDays = presentCount + absentCount + lateCount + leaveCount;
    const percentage =
      totalDays > 0
        ? Math.round(((presentCount + lateCount) / totalDays) * 1000) / 10
        : 0;

    return {
      studentId: stu.id,
      studentName,
      admissionNumber: stu.admissionNumber,
      rollNumber: stu.rollNumber,
      presentCount,
      absentCount,
      lateCount,
      leaveCount,
      totalDays,
      percentage,
    };
  });

  studentRows.sort((a, b) => a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true }));

  const grandTotal = classTotalPresent + classTotalAbsent + classTotalLate + classTotalLeave;
  const averagePercentage =
    grandTotal > 0
      ? Math.round(((classTotalPresent + classTotalLate) / grandTotal) * 1000) / 10
      : 0;

  return {
    classInfo,
    campusName: resolvedCampusName,
    startDate,
    endDate,
    totalInstructionalDays,
    totalStudents: students.length,
    averagePercentage,
    totalPresent: classTotalPresent,
    totalAbsent: classTotalAbsent,
    totalLate: classTotalLate,
    totalLeave: classTotalLeave,
    students: studentRows,
  };
}

/**
 * Generates multi-day date range trend report aggregating all classes across the school or campus (TASK-037).
 * Acceptance Criteria: By range reporting.
 */
export async function getDateRangeAttendanceReport(
  scope: Scope,
  startDate: ISODate,
  endDate: ISODate
): Promise<DateRangeAttendanceReport> {
  const [classes, days] = await Promise.all([
    listClasses(scope),
    listAttendanceDays(scope, { startDate, endDate }),
  ]);

  const totalClasses = classes.length;

  const byDate = new Map<ISODate, AttendanceDay[]>();
  days.forEach((d) => {
    const list = byDate.get(d.date) ?? [];
    list.push(d);
    byDate.set(d.date, list);
  });

  const sortedDates = Array.from(byDate.keys()).sort();

  let grandPresent = 0;
  let grandAbsent = 0;
  let grandLate = 0;
  let grandLeave = 0;

  const dayRows: DateRangeAttendanceDayRow[] = sortedDates.map((date) => {
    const dayRecords = byDate.get(date) ?? [];
    const markedClasses = dayRecords.length;

    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let leaveCount = 0;

    dayRecords.forEach((d) => {
      presentCount += d.present.length;
      absentCount += d.absent.length;
      lateCount += d.late.length;
      leaveCount += d.leave.length;
    });

    grandPresent += presentCount;
    grandAbsent += absentCount;
    grandLate += lateCount;
    grandLeave += leaveCount;

    const totalStudents = presentCount + absentCount + lateCount + leaveCount;
    const percentage =
      totalStudents > 0
        ? Math.round(((presentCount + lateCount) / totalStudents) * 1000) / 10
        : 0;

    return {
      date,
      dayOfWeek: getWeekdayName(date),
      totalClasses,
      markedClasses,
      totalStudents,
      presentCount,
      absentCount,
      lateCount,
      leaveCount,
      percentage,
    };
  });

  const grandTotal = grandPresent + grandAbsent + grandLate + grandLeave;
  const averagePercentage =
    grandTotal > 0
      ? Math.round(((grandPresent + grandLate) / grandTotal) * 1000) / 10
      : 0;

  return {
    startDate,
    endDate,
    totalInstructionalDays: dayRows.length,
    averagePercentage,
    totalPresent: grandPresent,
    totalAbsent: grandAbsent,
    totalLate: grandLate,
    totalLeave: grandLeave,
    days: dayRows,
  };
}

/**
 * Generates an individualized longitudinal attendance profile for a specific student (TASK-037).
 * Acceptance Criteria: By student reporting.
 */
export async function getStudentAttendanceReport(
  scope: Scope,
  studentId: ID,
  startDate?: ISODate,
  endDate?: ISODate
): Promise<StudentAttendanceReport | null> {
  const [student, stats, history] = await Promise.all([
    getStudent(studentId),
    calculateStudentAttendanceStats(scope, studentId, startDate, endDate),
    getStudentAttendanceHistory(scope, studentId, startDate, endDate),
  ]);

  if (!student) return null;

  const [user, classInfo, campus] = await Promise.all([
    getUser(student.userId),
    getClass(student.classId),
    getCampus(student.campusId),
  ]);

  return {
    student,
    userName: user?.name ?? `Student ${student.admissionNumber}`,
    className: classInfo ? `Grade ${classInfo.grade}-${classInfo.section}` : 'Class',
    campusName: campus?.name ?? 'Main Campus',
    startDate,
    endDate,
    stats,
    history,
  };
}

/**
 * Retrieves monthly attendance calendar records and summary for a single student (TASK-038).
 * Acceptance Criteria: Colour + label; summary counts and percentage.
 */
export async function getStudentMonthAttendance(
  scope: Scope,
  studentId: ID,
  year: number,
  month: number
): Promise<StudentMonthAttendance | null> {
  const mm = String(month).padStart(2, '0');
  const daysInMonth = new Date(year, month, 0).getDate();
  const startDate = `${year}-${mm}-01`;
  const endDate = `${year}-${mm}-${String(daysInMonth).padStart(2, '0')}`;

  const [student, history] = await Promise.all([
    getStudent(studentId),
    getStudentAttendanceHistory(scope, studentId, startDate, endDate),
  ]);

  if (!student) return null;

  const [user, classInfo, campus] = await Promise.all([
    getUser(student.userId),
    getClass(student.classId),
    getCampus(student.campusId),
  ]);

  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;
  let leaveCount = 0;

  const recordsByDate: Record<ISODate, AttendanceStatus> = {};

  history.forEach((h) => {
    recordsByDate[h.date] = h.status;
    if (h.status === 'present') presentCount++;
    else if (h.status === 'absent') absentCount++;
    else if (h.status === 'late') lateCount++;
    else if (h.status === 'leave') leaveCount++;
  });

  const percentage = attendancePercentage({
    present: presentCount,
    absent: absentCount,
    late: lateCount,
    leave: leaveCount,
  });

  return {
    student,
    userName: user?.name ?? `Student ${student.admissionNumber}`,
    className: classInfo ? `Grade ${classInfo.grade}-${classInfo.section}` : 'Class',
    campusName: campus?.name ?? 'Main Campus',
    year,
    month,
    monthName: getMonthName(month),
    summary: {
      presentCount,
      absentCount,
      lateCount,
      leaveCount,
      totalInstructionalDays: history.length,
      percentage,
    },
    recordsByDate,
  };
}



