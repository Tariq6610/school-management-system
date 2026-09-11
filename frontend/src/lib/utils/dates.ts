/**
 * Standardized date and time formatting utilities.
 * Reference: DEVELOPMENT_GUIDELINES.md §8 & UI_DESIGN_SYSTEM.md §3
 */

export type DateStyle = 'short' | 'medium' | 'long' | 'iso' | 'relative';

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const MONTH_NAMES_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function parseDate(input: string | Date): Date | null {
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }
  if (!input || typeof input !== 'string') {
    return null;
  }
  const parsed = new Date(input);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Format a date string or Date object according to design conventions.
 *
 * Examples:
 *   formatDate('2026-09-08', 'medium') -> "08 Sep 2026"
 *   formatDate('2026-09-08', 'short')  -> "08/09/2026"
 *   formatDate('2026-09-08', 'long')   -> "September 8, 2026"
 *   formatDate('2026-09-08', 'iso')    -> "2026-09-08"
 */
export function formatDate(
  date: string | Date | null | undefined,
  style: DateStyle = 'medium'
): string {
  if (!date) {
    return '—';
  }

  const d = parseDate(date);
  if (!d) {
    return typeof date === 'string' ? date : '—';
  }

  const day = d.getDate();
  const dayStr = String(day).padStart(2, '0');
  const monthIdx = d.getMonth();
  const monthNumStr = String(monthIdx + 1).padStart(2, '0');
  const year = d.getFullYear();

  switch (style) {
    case 'short':
      return `${dayStr}/${monthNumStr}/${year}`;
    case 'long':
      return `${MONTH_NAMES_LONG[monthIdx]} ${day}, ${year}`;
    case 'iso':
      return `${year}-${monthNumStr}-${dayStr}`;
    case 'relative': {
      const now = new Date();
      // Compare calendar days ignoring time
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Today';
      if (diffDays === -1) return 'Yesterday';
      if (diffDays === 1) return 'Tomorrow';
      if (diffDays > 1 && diffDays <= 30) return `In ${diffDays} days`;
      if (diffDays < -1 && diffDays >= -30) return `${Math.abs(diffDays)} days ago`;
      return `${dayStr} ${MONTH_NAMES_SHORT[monthIdx]} ${year}`;
    }
    case 'medium':
    default:
      return `${dayStr} ${MONTH_NAMES_SHORT[monthIdx]} ${year}`;
  }
}

/**
 * Return date formatted as ISO YYYY-MM-DD.
 */
export function toISODate(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Check if a date is strictly before the anchor date (defaults to today).
 */
export function isPastDate(date: string | Date, anchorDate?: string | Date): boolean {
  const d = parseDate(date);
  if (!d) return false;
  const anchor = anchorDate ? parseDate(anchorDate) : new Date();
  if (!anchor) return false;

  const targetDay = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const anchorDay = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate()).getTime();
  return targetDay < anchorDay;
}

/**
 * Format a time string or ISO date to 12-hour clock with AM/PM.
 * Example: '14:30' -> '02:30 PM'
 */
export function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  if (timeStr.includes(':')) {
    const parts = timeStr.split(':');
    const hours = parseInt(parts[0], 10);
    const mins = parts[1]?.slice(0, 2) || '00';
    if (isNaN(hours)) return timeStr;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 === 0 ? 12 : hours % 12;
    return `${String(h12).padStart(2, '0')}:${mins} ${ampm}`;
  }
  return timeStr;
}

/**
 * Format date and time, e.g. "08 Sep 2026, 02:30 PM"
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  const d = parseDate(date);
  if (!d) return typeof date === 'string' ? date : '—';
  const dateStr = formatDate(d, 'medium');
  const hours = d.getHours();
  const mins = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${dateStr}, ${String(h12).padStart(2, '0')}:${mins} ${ampm}`;
}

/**
 * Add or subtract days from an ISO date string (YYYY-MM-DD).
 */
export function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map((n) => parseInt(n, 10));
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/**
 * Get weekday name abbreviation ('Mon', 'Tue', etc.) from an ISO date string.
 */
export function getWeekdayName(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map((n) => parseInt(n, 10));
  const date = new Date(y, m - 1, d);
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return names[date.getDay()] ?? '—';
}

/**
 * Returns instructional days (Monday to Saturday) for the week containing anchorDate.
 */
export function getInstructionalWeekDays(anchorDateStr?: string): string[] {
  let anchor: Date;
  if (anchorDateStr) {
    const [y, m, d] = anchorDateStr.split('-').map((n) => parseInt(n, 10));
    anchor = new Date(y, m - 1, d);
  } else {
    anchor = new Date();
  }

  // Find Monday of this week
  const day = anchor.getDay(); // 0 is Sun, 1 is Mon, ..., 6 is Sat
  const diffToMonday = day === 0 ? -6 : 1 - day; // If Sunday, go back 6 days to previous Monday
  const monday = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + diffToMonday);

  const days: string[] = [];
  for (let i = 0; i < 6; i++) { // Monday to Saturday (6 days)
    const current = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    days.push(toISODate(current));
  }
  return days;
}

export interface CalendarDayCell {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isSunday: boolean;
  isToday: boolean;
}

/**
 * Returns month name string from 1-indexed month number (1..12).
 */
export function getMonthName(month: number): string {
  const names = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return names[month - 1] ?? '';
}

/**
 * Returns a complete monthly calendar grid (Monday through Sunday) with leading and trailing days.
 * @param year e.g. 2026
 * @param month 1-indexed month (1 = January, 12 = December)
 */
export function getMonthCalendarGrid(year: number, month: number): CalendarDayCell[] {
  const todayStr = toISODate(new Date());
  const firstOfMonth = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();

  // Day of week: 0 is Sun, 1 is Mon, ..., 6 is Sat.
  // We want Monday (1) as the first column.
  const startDay = firstOfMonth.getDay();
  const leadingDaysCount = startDay === 0 ? 6 : startDay - 1;

  const cells: CalendarDayCell[] = [];

  // 1. Leading days from previous month
  const prevMonthLastDate = new Date(year, month - 1, 0).getDate();
  for (let i = leadingDaysCount - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDate - i;
    const d = new Date(year, month - 2, dayNum);
    const dateStr = toISODate(d);
    cells.push({
      date: dateStr,
      dayNumber: dayNum,
      isCurrentMonth: false,
      isSunday: d.getDay() === 0,
      isToday: dateStr === todayStr,
    });
  }

  // 2. Days in current month
  for (let d = 1; d <= daysInMonth; d++) {
    const current = new Date(year, month - 1, d);
    const dateStr = toISODate(current);
    cells.push({
      date: dateStr,
      dayNumber: d,
      isCurrentMonth: true,
      isSunday: current.getDay() === 0,
      isToday: dateStr === todayStr,
    });
  }

  // 3. Trailing days from next month to complete the week rows
  const remaining = (7 - (cells.length % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    const current = new Date(year, month, d);
    const dateStr = toISODate(current);
    cells.push({
      date: dateStr,
      dayNumber: d,
      isCurrentMonth: false,
      isSunday: current.getDay() === 0,
      isToday: dateStr === todayStr,
    });
  }

  return cells;
}

