import { Role } from '@/types';

export interface NavItem {
  id: string;
  label: string;
  href: string;
  iconName: string;
  isPrimaryMobile?: boolean;
  badge?: string | number;
}

export interface NavSection {
  sectionTitle?: string;
  items: NavItem[];
}

export const SUPER_ADMIN_NAV: NavSection[] = [
  {
    items: [
      { id: 'sa_dash', label: 'Overview', href: '/super-admin/dashboard', iconName: 'grid', isPrimaryMobile: true },
      { id: 'sa_schools', label: 'Schools', href: '/super-admin/schools', iconName: 'building', isPrimaryMobile: true },
      { id: 'sa_campuses', label: 'Campuses', href: '/super-admin/campuses', iconName: 'map-pin', isPrimaryMobile: true },
      { id: 'sa_compare', label: 'Campus Comparison', href: '/super-admin/campus-comparison', iconName: 'chart-bar', isPrimaryMobile: true },
    ],
  },
];

export const SCHOOL_ADMIN_NAV: NavSection[] = [
  {
    sectionTitle: 'Academic Core',
    items: [
      { id: 'adm_dash', label: 'Dashboard', href: '/admin/dashboard', iconName: 'grid', isPrimaryMobile: true },
      { id: 'adm_campuses', label: 'Campuses', href: '/admin/campuses', iconName: 'map-pin' },
      { id: 'adm_students', label: 'Students', href: '/admin/students', iconName: 'users', isPrimaryMobile: true },
      { id: 'adm_teachers', label: 'Teachers', href: '/admin/teachers', iconName: 'user-check' },
      { id: 'adm_classes', label: 'Classes & Sections', href: '/admin/classes', iconName: 'book-open' },
      { id: 'adm_subjects', label: 'Subjects', href: '/admin/subjects', iconName: 'file-text' },
      { id: 'adm_timetable', label: 'Timetable', href: '/admin/timetable', iconName: 'calendar' },
    ],
  },
  {
    sectionTitle: 'Operations',
    items: [
      { id: 'adm_attendance', label: 'Attendance', href: '/admin/attendance', iconName: 'clipboard-check', isPrimaryMobile: true },
      { id: 'adm_fees', label: 'Fee Management', href: '/admin/fees/invoices', iconName: 'credit-card', isPrimaryMobile: true },
      { id: 'adm_exams', label: 'Exams & Marks', href: '/admin/exams', iconName: 'award' },
      { id: 'adm_report_cards', label: 'Report Cards', href: '/admin/results/report-cards', iconName: 'file-text' },
      { id: 'adm_announcements', label: 'Announcements', href: '/admin/announcements', iconName: 'bell' },
      { id: 'adm_messages_audit', label: 'Message Audit', href: '/admin/messages', iconName: 'shield' },
      { id: 'adm_engagement', label: 'Parent Engagement', href: '/admin/engagement', iconName: 'heart-pulse' },
      { id: 'adm_reports', label: 'Reports Pack', href: '/admin/reports', iconName: 'file-bar-chart' },
      { id: 'adm_settings', label: 'Settings', href: '/admin/settings', iconName: 'settings' },
    ],
  },
];

export const PRINCIPAL_NAV: NavSection[] = [
  {
    sectionTitle: 'Campus Oversight',
    items: [
      { id: 'prn_dash', label: 'Dashboard', href: '/principal/dashboard', iconName: 'grid', isPrimaryMobile: true },
      { id: 'prn_teachers', label: 'Teachers', href: '/principal/teachers', iconName: 'user-check', isPrimaryMobile: true },
      { id: 'prn_students', label: 'Students', href: '/principal/students', iconName: 'users', isPrimaryMobile: true },
      { id: 'prn_attendance', label: 'Attendance', href: '/principal/attendance', iconName: 'clipboard-check', isPrimaryMobile: true },
      { id: 'prn_results', label: 'Campus Results', href: '/principal/results', iconName: 'award' },
      { id: 'prn_report_cards', label: 'Report Cards', href: '/admin/results/report-cards', iconName: 'file-text' },
      { id: 'prn_leave', label: 'Staff Leave', href: '/principal/leave-requests', iconName: 'clock' },
      { id: 'prn_announcements', label: 'Announcements', href: '/principal/announcements', iconName: 'bell' },
      { id: 'prn_messages_audit', label: 'Message Audit', href: '/principal/messages', iconName: 'shield' },
    ],
  },
];

export const TEACHER_NAV: NavSection[] = [
  {
    sectionTitle: 'Instruction & Classroom',
    items: [
      { id: 'tch_dash', label: 'Dashboard', href: '/teacher/dashboard', iconName: 'grid', isPrimaryMobile: true },
      { id: 'tch_att', label: 'Mark Attendance', href: '/teacher/classes', iconName: 'clipboard-check', isPrimaryMobile: true },
      { id: 'tch_qr', label: 'QR Scan', href: '/teacher/attendance/scan', iconName: 'qr-code', isPrimaryMobile: true },
      { id: 'tch_hw', label: 'Homework', href: '/teacher/homework', iconName: 'file-text' },
      { id: 'tch_courses', label: 'LMS Courses', href: '/teacher/courses', iconName: 'book-open' },
      { id: 'tch_assignments', label: 'Assignments', href: '/teacher/assignments', iconName: 'folder' },
      { id: 'tch_messages', label: 'Messages', href: '/teacher/messages', iconName: 'mail', isPrimaryMobile: true },
    ],
  },
];

export const PARENT_NAV: NavSection[] = [
  {
    sectionTitle: 'Child Portal',
    items: [
      { id: 'prt_dash', label: 'Dashboard', href: '/parent/dashboard', iconName: 'grid', isPrimaryMobile: true },
      { id: 'prt_att', label: 'Attendance', href: '/parent/attendance', iconName: 'clipboard-check', isPrimaryMobile: true },
      { id: 'prt_hw', label: 'Homework', href: '/parent/homework', iconName: 'file-text', isPrimaryMobile: true },
      { id: 'prt_fees', label: 'Fees & Invoices', href: '/parent/fees', iconName: 'credit-card', isPrimaryMobile: true },
      { id: 'prt_results', label: 'Report Cards', href: '/parent/results', iconName: 'award' },
      { id: 'prt_messages', label: 'Teacher Chat', href: '/parent/messages', iconName: 'mail' },
      { id: 'prt_announcements', label: 'Announcements', href: '/parent/announcements', iconName: 'bell' },
    ],
  },
];

export const STUDENT_NAV: NavSection[] = [
  {
    sectionTitle: 'My Learning',
    items: [
      { id: 'stu_dash', label: 'Dashboard', href: '/student/dashboard', iconName: 'grid', isPrimaryMobile: true },
      { id: 'stu_courses', label: 'My Courses', href: '/student/courses', iconName: 'book-open', isPrimaryMobile: true },
      { id: 'stu_assignments', label: 'Assignments', href: '/student/assignments', iconName: 'folder', isPrimaryMobile: true },
      { id: 'stu_results', label: 'My Results', href: '/student/results', iconName: 'award', isPrimaryMobile: true },
    ],
  },
];

/**
 * Returns the navigation sections for a given user role.
 */
export function getRoleNavSections(role: Role): NavSection[] {
  switch (role) {
    case 'super_admin':
      return SUPER_ADMIN_NAV;
    case 'school_admin':
      return SCHOOL_ADMIN_NAV;
    case 'principal':
      return PRINCIPAL_NAV;
    case 'teacher':
      return TEACHER_NAV;
    case 'parent':
      return PARENT_NAV;
    case 'student':
      return STUDENT_NAV;
    default:
      return [];
  }
}

/**
 * Returns the mobile navigation items for a role.
 * Guaranteed: primary has at most 5 items (or 4 if 'more' items exist).
 * Acceptance criteria: Collapses to bottom bar under 768px with at most 5 items.
 */
export function getMobileNavItems(role: Role): {
  primary: NavItem[];
  more: NavItem[];
} {
  const sections = getRoleNavSections(role);
  const allItems = sections.flatMap((sec) => sec.items);

  const primaryCandidates = allItems.filter((item) => item.isPrimaryMobile);

  // If total items <= 5, all fit in the bottom bar
  if (allItems.length <= 5) {
    return {
      primary: allItems,
      more: [],
    };
  }

  // If more than 5 items, primary can have at most 4 items, and 5th slot is 'More'
  const primary = primaryCandidates.slice(0, 4);
  const primaryIds = new Set(primary.map((item) => item.id));
  const more = allItems.filter((item) => !primaryIds.has(item.id));

  return { primary, more };
}
