/**
 * Attendance calculation utilities.
 * Reference: DEVELOPMENT_GUIDELINES.md §8 & DATA_MODELS.md §4
 */

import { AttendanceStatus, AttendanceSummary } from '@/types';

export interface AttendanceCounts {
  present: number;
  absent: number;
  late: number;
  leave: number;
  holidays?: number;
}

export interface AttendancePercentageOptions {
  /**
   * Whether to exclude excused/medical leave from the denominator.
   * Defaults to true (excused leave does not penalize student).
   */
  excludeLeave?: boolean;
  /**
   * Credit given to late attendance towards presence (0.0 to 1.0).
   * Defaults to 1.0 (counted as present).
   */
  lateWeight?: number;
  /**
   * Number of decimal places to round result. Defaults to 1.
   */
  precision?: number;
}

/**
 * Calculate attendance percentage from counts or status list.
 * Must exclude holidays and properly handle leaves.
 * Appears across 5 screens (Dashboard, Student Profile, Class Attendance, Report Cards, Analytics).
 */
export function attendancePercentage(
  input: AttendanceStatus[] | AttendanceCounts,
  options: AttendancePercentageOptions = {}
): number {
  const { excludeLeave = true, lateWeight = 1.0, precision = 1 } = options;

  let present = 0;
  let absent = 0;
  let late = 0;
  let leave = 0;

  if (Array.isArray(input)) {
    for (const status of input) {
      if (status === 'present') present++;
      else if (status === 'absent') absent++;
      else if (status === 'late') late++;
      else if (status === 'leave') leave++;
    }
  } else {
    present = Math.max(0, input.present || 0);
    absent = Math.max(0, input.absent || 0);
    late = Math.max(0, input.late || 0);
    leave = Math.max(0, input.leave || 0);
  }

  // Denominator: evaluated school days
  const totalDays = present + absent + late + (excludeLeave ? 0 : leave);

  if (totalDays === 0) {
    return 0;
  }

  const effectivePresent = present + late * lateWeight;
  const rawPercentage = (effectivePresent / totalDays) * 100;

  const clamped = Math.min(100, Math.max(0, rawPercentage));
  const factor = Math.pow(10, precision);
  return Math.round(clamped * factor) / factor;
}

/**
 * Construct an AttendanceSummary object with computed percentage.
 */
export function calculateAttendanceSummary(
  counts: AttendanceCounts,
  options?: AttendancePercentageOptions
): AttendanceSummary {
  const present = Math.max(0, counts.present || 0);
  const absent = Math.max(0, counts.absent || 0);
  const late = Math.max(0, counts.late || 0);
  const leave = Math.max(0, counts.leave || 0);
  const totalStudents = present + absent + late + leave;

  return {
    totalStudents,
    presentCount: present,
    absentCount: absent,
    lateCount: late,
    leaveCount: leave,
    percentage: attendancePercentage(counts, options),
  };
}
