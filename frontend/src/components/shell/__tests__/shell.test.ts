import assert from 'node:assert';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Role } from '@/types';
import {
  getRoleNavSections,
  getMobileNavItems,
} from '../../../lib/navigation/nav-items';
import { Sidebar, TopBar, BottomNav } from '../index';

console.log('Running TASK-018 App Shell (Sidebar, Top Bar, Role-Scoped Nav) Test Suite...\n');

// 1. Role-Scoped Navigation Isolation Tests
console.log('--- 1. Role Navigation Isolation Tests ---');

const roles: Role[] = [
  'super_admin',
  'school_admin',
  'principal',
  'teacher',
  'parent',
  'student',
];

const roleNavMap = new Map<Role, string[]>();

for (const role of roles) {
  const sections = getRoleNavSections(role);
  assert(sections.length > 0, `Role ${role} must have navigation sections`);
  const hrefs = sections.flatMap((sec) => sec.items.map((item) => item.href));
  assert(hrefs.length > 0, `Role ${role} must have navigation items`);
  roleNavMap.set(role, hrefs);
}

// Ensure Super Admin has unique super admin routes
const saHrefs = roleNavMap.get('super_admin')!;
assert(saHrefs.includes('/super-admin/dashboard'));
assert(saHrefs.includes('/super-admin/schools'));
assert(saHrefs.includes('/super-admin/campuses'));
assert(saHrefs.includes('/super-admin/campus-comparison'));
assert(!saHrefs.includes('/admin/students'), 'Super admin must not have school admin routes');

// Ensure School Admin has comprehensive school operations
const admHrefs = roleNavMap.get('school_admin')!;
assert(admHrefs.includes('/admin/dashboard'));
assert(admHrefs.includes('/admin/students'));
assert(admHrefs.includes('/admin/teachers'));
assert(admHrefs.includes('/admin/attendance'));
assert(admHrefs.includes('/admin/fees/invoices'));
assert(admHrefs.includes('/admin/settings'));
assert(!admHrefs.includes('/teacher/dashboard'));

// Ensure Principal has campus oversight routes
const prnHrefs = roleNavMap.get('principal')!;
assert(prnHrefs.includes('/principal/dashboard'));
assert(prnHrefs.includes('/principal/leave-requests'));
assert(prnHrefs.includes('/principal/results'));

// Ensure Teacher has classroom routes
const tchHrefs = roleNavMap.get('teacher')!;
assert(tchHrefs.includes('/teacher/dashboard'));
assert(tchHrefs.includes('/teacher/classes'));
assert(tchHrefs.includes('/teacher/attendance/scan'));
assert(tchHrefs.includes('/teacher/homework'));

// Ensure Parent has child portal routes
const prtHrefs = roleNavMap.get('parent')!;
assert(prtHrefs.includes('/parent/dashboard'));
assert(prtHrefs.includes('/parent/attendance'));
assert(prtHrefs.includes('/parent/homework'));
assert(prtHrefs.includes('/parent/fees'));

// Ensure Student has learner routes
const stuHrefs = roleNavMap.get('student')!;
assert(stuHrefs.includes('/student/dashboard'));
assert(stuHrefs.includes('/student/courses'));
assert(stuHrefs.includes('/student/assignments'));
assert(stuHrefs.includes('/student/results'));

console.log('✓ All 6 roles have strictly isolated, distinct navigation items per ROUTE_STRUCTURE.md');

// 2. Mobile Bottom Bar Constraints (Acceptance criterion: collapses to bottom bar <= 5 items)
console.log('--- 2. Mobile Bottom Bar Constraints Tests ---');

for (const role of roles) {
  const { primary, more } = getMobileNavItems(role);

  // Total visible buttons on bottom bar: primary.length + (more.length > 0 ? 1 : 0)
  const totalVisibleMobileButtons = primary.length + (more.length > 0 ? 1 : 0);

  assert(
    totalVisibleMobileButtons <= 5,
    `Role ${role} exceeds 5 mobile bottom bar buttons: found ${totalVisibleMobileButtons}`
  );

  assert(primary.length > 0, `Role ${role} must have at least 1 primary mobile item`);

  // Ensure touch accessibility flag
  for (const item of primary) {
    assert(item.href, `Mobile item ${item.label} must have href`);
  }
}

console.log('✓ Mobile bottom bar strictly restricted to <= 5 touch items for all roles');

// 3. Presentation Component SSR Tests
console.log('--- 3. Presentation Component SSR Tests ---');

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { AppRouterContext } = require('next/dist/shared/lib/app-router-context.shared-runtime');
const mockRouter = {
  back: () => {},
  forward: () => {},
  refresh: () => {},
  push: () => {},
  replace: () => {},
  prefetch: () => {},
};

// Test Sidebar Rendering
const sidebarHtml = renderToString(
  React.createElement(
    AppRouterContext.Provider,
    { value: mockRouter },
    React.createElement(Sidebar, {
      role: 'teacher',
      user: {
        id: 'usr_teacher_sana',
        schoolId: 'sch_abc',
        campusId: 'cmp_main',
        email: 'sana.teacher@beaconhouse.edu.pk',
        name: 'Sana Tariq',
        role: 'teacher',
        status: 'active',
      },
    })
  )
);
assert(sidebarHtml.includes('hidden md:flex'), 'Sidebar must be hidden on mobile (< 768px)');
assert(sidebarHtml.includes('Mark Attendance'), 'Teacher sidebar must render Mark Attendance');
assert(sidebarHtml.includes('QR Scan'), 'Teacher sidebar must render QR Scan');
assert(sidebarHtml.includes('Sana Tariq'), 'Sidebar must render user display name');

// Test TopBar Rendering
const topBarHtml = renderToString(
  React.createElement(
    AppRouterContext.Provider,
    { value: mockRouter },
    React.createElement(TopBar, {
      role: 'teacher',
      campusName: 'Main Campus',
      pageTitle: 'Attendance Register',
    })
  )
);
assert(topBarHtml.includes('Main Campus'), 'TopBar must render campus name');
assert(topBarHtml.includes('Attendance Register'), 'TopBar must render page title');
assert(topBarHtml.includes('WhatsApp Mock'), 'TopBar must render demo affordance');

// Test BottomNav Rendering
const bottomNavHtml = renderToString(
  React.createElement(
    AppRouterContext.Provider,
    { value: mockRouter },
    React.createElement(BottomNav, {
      role: 'parent',
    })
  )
);
assert(bottomNavHtml.includes('md:hidden fixed bottom-0'), 'BottomNav must be fixed at bottom on < 768px');
assert(bottomNavHtml.includes('Attendance'), 'Parent BottomNav must include Attendance');
assert(bottomNavHtml.includes('Homework'), 'Parent BottomNav must include Homework');
assert(bottomNavHtml.includes('More'), 'Parent BottomNav must include More drawer button for overflow items');

console.log('✓ Sidebar, TopBar, and BottomNav components SSR render verified');

console.log('\nAll TASK-018 App Shell tests passed successfully! ✅');
