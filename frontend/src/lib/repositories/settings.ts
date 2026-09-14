import { getItem, setItem, STORAGE_KEYS } from '@/lib/storage';
import { GradeScaleItem, PeriodDefinition, Scope, Settings } from '@/types';
import { validateGradingScale } from '@/lib/utils/grading';

export const DEFAULT_PERIODS: PeriodDefinition[] = [
  { period: 1, name: 'Period 1', startTime: '08:00', endTime: '08:45', isBreak: false },
  { period: 2, name: 'Period 2', startTime: '08:45', endTime: '09:30', isBreak: false },
  { period: 3, name: 'Period 3', startTime: '09:45', endTime: '10:30', isBreak: false },
  { period: 4, name: 'Period 4', startTime: '10:30', endTime: '11:15', isBreak: false },
  { period: 5, name: 'Period 5', startTime: '11:30', endTime: '12:15', isBreak: false },
  { period: 6, name: 'Period 6', startTime: '12:15', endTime: '13:00', isBreak: false },
];

const DEFAULT_SETTINGS: Settings = {
  id: 'set_default',
  schoolId: 'sch_default',
  gradingScale: [
    { grade: 'A+', minPercentage: 90, maxPercentage: 100, gpa: 4.0, description: 'Outstanding' },
    { grade: 'A', minPercentage: 80, maxPercentage: 89.9, gpa: 3.7, description: 'Excellent' },
    { grade: 'B', minPercentage: 70, maxPercentage: 79.9, gpa: 3.0, description: 'Good' },
    { grade: 'C', minPercentage: 60, maxPercentage: 69.9, gpa: 2.0, description: 'Satisfactory' },
    { grade: 'D', minPercentage: 50, maxPercentage: 59.9, gpa: 1.0, description: 'Pass' },
    { grade: 'F', minPercentage: 0, maxPercentage: 49.9, gpa: 0.0, description: 'Fail' },
  ],
  attendanceStatuses: ['present', 'absent', 'late', 'leave'],
  attendanceCutoffTime: '08:30', // Default 8:30 AM morning cutoff per FEATURE_SPECIFICATIONS.md §8
  attendanceEditWindowHours: 48, // 2 days default per FEATURE_SPECIFICATIONS.md §8
  branding: {
    schoolName: 'ABC School Network',
    primaryColor: '#f97316',
    accentColor: '#1D5F96',
    backgroundColor: '#f1f5f9',
    cardBackground: '#ffffff',
    fontFamily: 'inter',
    borderRadius: 'md',
    templateId: 'sunset',
    designMode: 'unified',
  },
  currency: 'PKR',
  periods: DEFAULT_PERIODS,
};

export async function getSettings(scope?: Scope): Promise<Settings> {
  const current = getItem<Settings>(STORAGE_KEYS.SETTINGS);
  if (current) {
    let modified = false;
    if (current.attendanceEditWindowHours === undefined) {
      current.attendanceEditWindowHours = DEFAULT_SETTINGS.attendanceEditWindowHours ?? 48;
      modified = true;
    }
    if (!current.attendanceCutoffTime) {
      current.attendanceCutoffTime = DEFAULT_SETTINGS.attendanceCutoffTime ?? '08:30';
      modified = true;
    }
    if (!current.periods || current.periods.length === 0) {
      current.periods = DEFAULT_PERIODS;
      modified = true;
    }
    if (current.branding && !current.branding.backgroundColor) {
      current.branding = {
        ...current.branding,
        backgroundColor: current.branding.backgroundColor ?? DEFAULT_SETTINGS.branding.backgroundColor,
        cardBackground: current.branding.cardBackground ?? DEFAULT_SETTINGS.branding.cardBackground,
        fontFamily: current.branding.fontFamily ?? DEFAULT_SETTINGS.branding.fontFamily,
        borderRadius: current.branding.borderRadius ?? DEFAULT_SETTINGS.branding.borderRadius,
        designMode: current.branding.designMode ?? DEFAULT_SETTINGS.branding.designMode,
      };
      modified = true;
    }
    if (modified) {
      setItem(STORAGE_KEYS.SETTINGS, current);
    }
    return current;
  }
  const fallback = {
    ...DEFAULT_SETTINGS,
    schoolId: scope?.schoolId || DEFAULT_SETTINGS.schoolId,
  };
  setItem(STORAGE_KEYS.SETTINGS, fallback);
  return fallback;
}

export async function updateSettings(
  patch: Partial<Settings>,
  scope?: Scope
): Promise<Settings> {
  const current = await getSettings(scope);
  const updated: Settings = {
    ...current,
    ...patch,
    id: current.id,
    schoolId: scope?.schoolId || current.schoolId,
  };
  setItem(STORAGE_KEYS.SETTINGS, updated);
  return updated;
}

/**
 * Updates the school's grading scale in settings after validation.
 */
export async function updateGradingScale(
  scope: Scope,
  scale: GradeScaleItem[]
): Promise<Settings> {
  const validation = validateGradingScale(scale);
  if (!validation.isValid) {
    throw new Error(`Invalid grading scale: ${validation.errors.join('; ')}`);
  }

  // Sort descending by minPercentage for deterministic evaluation
  const sorted = [...scale].sort((a, b) => b.minPercentage - a.minPercentage);
  return updateSettings({ gradingScale: sorted }, scope);
}

/**
 * Resets the school's grading scale to the default 6-tier percentage scale.
 */
export async function resetGradingScale(scope?: Scope): Promise<Settings> {
  return updateSettings({ gradingScale: DEFAULT_SETTINGS.gradingScale }, scope);
}

/**
 * Parses a HH:MM 24-hour time string into total minutes from midnight.
 */
export function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/**
 * Validates a period configuration list for chronological ordering, non-inverted times,
 * unique period numbers, and non-overlapping periods.
 */
export function validatePeriodConfiguration(periods: PeriodDefinition[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!Array.isArray(periods) || periods.length === 0) {
    return { isValid: false, errors: ['At least one period must be configured.'] };
  }

  const periodNums = new Set<number>();
  const parsedPeriods: { period: PeriodDefinition; startMin: number; endMin: number }[] = [];

  for (const p of periods) {
    if (!p.period || typeof p.period !== 'number' || p.period <= 0) {
      errors.push(`Invalid period number: ${p.period}. Period numbers must be positive integers.`);
    } else if (periodNums.has(p.period)) {
      errors.push(`Duplicate period number: ${p.period}. Each period number must be unique.`);
    } else {
      periodNums.add(p.period);
    }

    if (!p.name || !p.name.trim()) {
      errors.push(`Period ${p.period}: Period name cannot be empty.`);
    }

    const startMin = parseTimeToMinutes(p.startTime);
    const endMin = parseTimeToMinutes(p.endTime);

    if (startMin === null) {
      errors.push(`Period ${p.period}: Invalid start time "${p.startTime}". Use HH:MM format.`);
    }
    if (endMin === null) {
      errors.push(`Period ${p.period}: Invalid end time "${p.endTime}". Use HH:MM format.`);
    }

    if (startMin !== null && endMin !== null) {
      if (startMin >= endMin) {
        errors.push(
          `Period ${p.period} (${p.name || 'Unnamed'}): End time (${p.endTime}) must be after start time (${p.startTime}).`
        );
      } else {
        parsedPeriods.push({ period: p, startMin, endMin });
      }
    }
  }

  // Check for overlapping periods
  parsedPeriods.sort((a, b) => a.startMin - b.startMin);
  for (let i = 0; i < parsedPeriods.length - 1; i++) {
    const current = parsedPeriods[i];
    const next = parsedPeriods[i + 1];
    if (current.endMin > next.startMin) {
      errors.push(
        `Time conflict: "${current.period.name}" (${current.period.startTime} - ${current.period.endTime}) overlaps with "${next.period.name}" (${next.period.startTime} - ${next.period.endTime}).`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export interface PeriodPreset {
  id: string;
  name: string;
  description: string;
  periods: PeriodDefinition[];
}

/**
 * Returns pre-configured period schedules that schools can choose from.
 */
export function getPresetPeriodConfigurations(): PeriodPreset[] {
  return [
    {
      id: 'standard-6',
      name: 'Standard 6-Period (Morning Schedule)',
      description: '6 instructional periods (45 min each) with break intervals from 08:00 to 13:00.',
      periods: [
        { period: 1, name: 'Period 1', startTime: '08:00', endTime: '08:45', isBreak: false },
        { period: 2, name: 'Period 2', startTime: '08:45', endTime: '09:30', isBreak: false },
        { period: 3, name: 'Period 3', startTime: '09:45', endTime: '10:30', isBreak: false },
        { period: 4, name: 'Period 4', startTime: '10:30', endTime: '11:15', isBreak: false },
        { period: 5, name: 'Period 5', startTime: '11:30', endTime: '12:15', isBreak: false },
        { period: 6, name: 'Period 6', startTime: '12:15', endTime: '13:00', isBreak: false },
      ],
    },
    {
      id: 'standard-8-explicit',
      name: '8-Slot Schedule with Explicit Breaks',
      description: '6 instructional periods plus explicit morning break & lunch recess slots.',
      periods: [
        { period: 1, name: 'Period 1', startTime: '08:00', endTime: '08:45', isBreak: false },
        { period: 2, name: 'Period 2', startTime: '08:45', endTime: '09:30', isBreak: false },
        { period: 3, name: 'Morning Break', startTime: '09:30', endTime: '09:45', isBreak: true },
        { period: 4, name: 'Period 3', startTime: '09:45', endTime: '10:30', isBreak: false },
        { period: 5, name: 'Period 4', startTime: '10:30', endTime: '11:15', isBreak: false },
        { period: 6, name: 'Lunch Recess', startTime: '11:15', endTime: '11:45', isBreak: true },
        { period: 7, name: 'Period 5', startTime: '11:45', endTime: '12:30', isBreak: false },
        { period: 8, name: 'Period 6', startTime: '12:30', endTime: '13:15', isBreak: false },
      ],
    },
    {
      id: 'compact-5',
      name: 'Compact 5-Period Schedule',
      description: '5 instructional periods (45 min each) ending at 12:15 PM.',
      periods: [
        { period: 1, name: 'Period 1', startTime: '08:00', endTime: '08:45', isBreak: false },
        { period: 2, name: 'Period 2', startTime: '08:45', endTime: '09:30', isBreak: false },
        { period: 3, name: 'Period 3', startTime: '09:45', endTime: '10:30', isBreak: false },
        { period: 4, name: 'Period 4', startTime: '10:30', endTime: '11:15', isBreak: false },
        { period: 5, name: 'Period 5', startTime: '11:30', endTime: '12:15', isBreak: false },
      ],
    },
    {
      id: 'extended-7',
      name: 'Extended 7-Period Schedule',
      description: '7 instructional periods with 15-minute break and 30-minute lunch ending at 14:00.',
      periods: [
        { period: 1, name: 'Period 1', startTime: '08:00', endTime: '08:45', isBreak: false },
        { period: 2, name: 'Period 2', startTime: '08:45', endTime: '09:30', isBreak: false },
        { period: 3, name: 'Period 3', startTime: '09:45', endTime: '10:30', isBreak: false },
        { period: 4, name: 'Period 4', startTime: '10:30', endTime: '11:15', isBreak: false },
        { period: 5, name: 'Lunch', startTime: '11:15', endTime: '11:45', isBreak: true },
        { period: 6, name: 'Period 5', startTime: '11:45', endTime: '12:30', isBreak: false },
        { period: 7, name: 'Period 6', startTime: '12:30', endTime: '13:15', isBreak: false },
        { period: 8, name: 'Period 7', startTime: '13:15', endTime: '14:00', isBreak: false },
      ],
    },
  ];
}

/**
 * Gets the current school period configuration.
 */
export async function getPeriodConfiguration(scope?: Scope): Promise<PeriodDefinition[]> {
  const settings = await getSettings(scope);
  return settings.periods || DEFAULT_PERIODS;
}

/**
 * Updates the school period configuration with validation.
 */
export async function updatePeriodConfiguration(
  scope: Scope,
  periods: PeriodDefinition[]
): Promise<Settings> {
  const validation = validatePeriodConfiguration(periods);
  if (!validation.isValid) {
    throw new Error(`Invalid period configuration: ${validation.errors.join('; ')}`);
  }

  // Sort periods chronologically by start time
  const sorted = [...periods].sort((a, b) => {
    const minA = parseTimeToMinutes(a.startTime) ?? 0;
    const minB = parseTimeToMinutes(b.startTime) ?? 0;
    return minA - minB;
  });

  return updateSettings({ periods: sorted }, scope);
}

/**
 * Resets the school's period configuration to default 6 periods.
 */
export async function resetPeriodConfiguration(scope?: Scope): Promise<Settings> {
  return updateSettings({ periods: DEFAULT_PERIODS }, scope);
}
