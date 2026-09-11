# Changelog

Updated by the agent after every completed task.

## Format

```
## [Unreleased]

### TASK-XXX — Task title
Completed: YYYY-MM-DD
Files added:    path, path
Files changed:  path, path
Decisions:      any choice made where the spec was ambiguous
Incomplete:     anything not finished, and why
```

---

### TASK-001 — Next.js + TypeScript strict + Tailwind setup
Completed: 2026-09-08
Files added:    none
Files changed:  frontend/src/app/layout.tsx, frontend/src/app/page.tsx, frontend/src/app/globals.css
Files deleted:  frontend/public/next.svg, frontend/public/vercel.svg, frontend/public/file.svg, frontend/public/globe.svg, frontend/public/window.svg
Decisions:      Used Noto Sans via next/font/google per UI_DESIGN_SYSTEM.md §3; replaced starter landing page with minimal prototype landing.
Incomplete:     none

### TASK-002 — Design tokens as Tailwind theme extension
Completed: 2026-09-08
Files added:    none
Files changed:  frontend/src/app/globals.css, frontend/src/app/page.tsx
Decisions:      Implemented tokens in globals.css using Tailwind v4 @theme for colors, radii, overlay shadow, and custom typography utilities with tabular-nums support.
Incomplete:     none

### TASK-003 — lib/storage/ — get, set, remove, JSON, quota errors
Completed: 2026-09-09
Files added:    frontend/src/lib/storage/errors.ts, frontend/src/lib/storage/keys.ts, frontend/src/lib/storage/index.ts
Files changed:  none
Decisions:      Encapsulated all localStorage interactions inside lib/storage/; implemented typed StorageQuotaError and isQuotaError type guard; created canonical keys map matching DATA_MODELS.md §1.
Incomplete:     none

### TASK-004 — Lint rule blocking localStorage outside lib/storage/
Completed: 2026-09-09
Files added:    none
Files changed:  frontend/eslint.config.mjs
Decisions:      Added no-restricted-globals and no-restricted-properties rules in ESLint flat config to block localStorage, window.localStorage, and globalThis.localStorage outside src/lib/storage/.
Incomplete:     none

### TASK-005 — Shared types in /types for every entity in DATA_MODELS.md
Completed: 2026-09-09
Files added:    frontend/src/types/common.ts, frontend/src/types/core.ts, frontend/src/types/people.ts, frontend/src/types/academics.ts, frontend/src/types/attendance.ts, frontend/src/types/fees.ts, frontend/src/types/exams.ts, frontend/src/types/lms.ts, frontend/src/types/communication.ts, frontend/src/types/index.ts
Files changed:  none
Decisions:      Defined domain-grouped shared types, discriminated unions for statuses, explicit Scope interface, and dedicated New* creation inputs; barrel exported at @/types.
Incomplete:     none

### TASK-006 — Repository layer skeleton — async, scope-taking, one per collection
Completed: 2026-09-09
Files added:    frontend/src/lib/repositories/* (28 files: base.ts, schools, campuses, academicYears, users, students, parents, studentParents, teachers, classes, subjects, timetableSlots, attendance, feeStructures, feeInvoices, courses, lessons, assignments, submissions, exams, examResults, announcements, messages, notifications, whatsappLog, settings, session, meta, index.ts)
Files changed:  none
Decisions:      Built base.ts providing generic typed async CRUD and ID generation; all repository modules expose strictly async Promise-returning functions taking explicit Scope objects.
Incomplete:     none

### TASK-007 — Seed generator: demo-network profile
Completed: 2026-09-09
Files added:    frontend/src/lib/seed/names.ts, frontend/src/lib/seed/generator.ts, frontend/src/lib/seed/index.ts
Files changed:  none
Decisions:      Built deterministic generator adhering to DATA_MODELS.md §6 volumes and quality criteria (1 school, 3 campuses, 420 students, 34 teachers, 21 classes, 105 subjects, 340 parents, 40 days attendance, 6 demo accounts, 3 intentional anomalies). Total serialized payload is ~1.63 MB (< 2MB).
Incomplete:     none

### TASK-008 — Seed boot check + schema version reset
Completed: 2026-09-09
Files added:    frontend/src/lib/seed/boot.ts, frontend/src/components/providers/BootProvider.tsx, frontend/src/lib/seed/__tests__/boot.test.ts
Files changed:  frontend/src/lib/seed/index.ts, frontend/src/lib/storage/index.ts, frontend/src/app/layout.tsx, frontend/src/app/page.tsx
Decisions:      Implemented ensureSeeded and forceReseed in boot.ts. Mounted BootProvider in RootLayout to guarantee data presence on initial boot. Verified schema version mismatch wipe/reseed logic, < 2MB footprint (1.63 MB), and live demo reset button on prototype home page.
Incomplete:     none

### TASK-009 — lib/utils/ — dates, currency (PKR), grading, attendance %
Completed: 2026-09-09
Files added:    frontend/src/lib/utils/attendance.ts, frontend/src/lib/utils/grading.ts, frontend/src/lib/utils/fees.ts, frontend/src/lib/utils/currency.ts, frontend/src/lib/utils/dates.ts, frontend/src/lib/utils/index.ts, frontend/src/lib/auth/scope.ts, frontend/src/lib/utils/__tests__/utils.test.ts
Files changed:  none
Decisions:      Implemented the four required business logic modules from DEVELOPMENT_GUIDELINES.md §8 (attendancePercentage, calculateGrade with dynamic scale, invoiceBalance, and resolveScope). Added formatPKR and formatDate. Created comprehensive unit test suite covering all calculations and role scoping rules. All 9 tasks in Milestone M0 are now completed.
Incomplete:     none

### TASK-010 — Button, Input, Select, DatePicker, Textarea
Completed: 2026-09-09
Files added:    frontend/src/components/ui/Button.tsx, frontend/src/components/ui/Input.tsx, frontend/src/components/ui/Select.tsx, frontend/src/components/ui/DatePicker.tsx, frontend/src/components/ui/Textarea.tsx, frontend/src/components/ui/index.ts, frontend/src/components/ui/__tests__/ui.test.ts
Files changed:  frontend/src/app/page.tsx
Decisions:      Created reusable, accessible form controls adhering to UI_DESIGN_SYSTEM.md §5 tokens (rounded-control 6px, visible keyboard focus rings, 36px default height / 44px touch size). Guaranteed visible labels for all inputs and selects (never placeholder-as-label). Implemented loading spinner, error states with alert roles, and character counters.
Incomplete:     none

### TASK-011 — Table — sticky header, sort, empty state, pagination
Completed: 2026-09-09
Files added:    frontend/src/components/ui/Table.tsx, frontend/src/components/ui/Pagination.tsx, frontend/src/components/ui/__tests__/table.test.ts
Files changed:  frontend/src/components/ui/index.ts, frontend/src/app/page.tsx
Decisions:      Implemented generic Table<T> with sticky header, sortable columns, tabular numerals on numeric data, row selection checkboxes, and integrated empty state. Built Pagination component defaulting to 25 items/page with range indicator and responsive compact view at 360px.
Incomplete:     none

### TASK-012 — Modal, Drawer, ConfirmDialog
Completed: 2026-09-09
Files added:    frontend/src/components/ui/useFocusTrap.ts, frontend/src/components/ui/Modal.tsx, frontend/src/components/ui/Drawer.tsx, frontend/src/components/ui/ConfirmDialog.tsx, frontend/src/components/ui/__tests__/dialogs.test.ts
Files changed:  frontend/src/components/ui/index.ts, frontend/src/app/page.tsx
Decisions:      Built accessible overlays adhering to tokens (rounded-card 10px, shadow-overlay). Created useFocusTrap for Tab/Shift+Tab trapping, Escape key listener, and body scroll lock. Drawer opens from the right for detail views without leaving the list. ConfirmDialog strictly enforces naming the record being affected (e.g. "Ahmed Khan's student record") per UI_DESIGN_SYSTEM.md §6 and acceptance criteria.
Incomplete:     none

### TASK-013 — StatusBadge, StatCard, Avatar, Tabs, Toast
Completed: 2026-09-09
Files added:    frontend/src/components/ui/StatusBadge.tsx, frontend/src/components/ui/StatCard.tsx, frontend/src/components/ui/Avatar.tsx, frontend/src/components/ui/Tabs.tsx, frontend/src/components/ui/Toast.tsx, frontend/src/components/ui/__tests__/badges-cards.test.ts
Files changed:  frontend/src/components/ui/index.ts, frontend/src/app/layout.tsx, frontend/src/app/page.tsx, context/PROJECT_TASKS.md
Decisions:      StatusBadge displays both visible text label and color plus glyph (never color alone) adhering to acceptance criteria across all 8+ statuses. StatCard enforces text-stat-number with tabular-nums and border-rule card styling without shadow. Avatar extracts initials with deterministic color hashing across 8 token pairs. Tabs enforces underline styling ("Underline, not pills") with keyboard arrow navigation and count pills. ToastProvider and useToast manage bottom-right toast queue with auto-dismiss on success/info (4s) and persistent error alerts.
Incomplete:     none

### TASK-014 — EmptyState, skeleton loaders, error state
Completed: 2026-09-09
Files added:    frontend/src/components/ui/EmptyState.tsx, frontend/src/components/ui/Skeleton.tsx, frontend/src/components/ui/ErrorState.tsx, frontend/src/components/ui/__tests__/feedback-states.test.ts
Files changed:  frontend/src/components/ui/index.ts, frontend/src/app/page.tsx, context/PROJECT_TASKS.md
Decisions:      Built standardized feedback states used across all views per UI_DESIGN_SYSTEM.md §5 & §6. EmptyState renders icon, single-line explanation, and primary/secondary action buttons (supporting both onClick and href). Skeleton provides content-shaped placeholders (SkeletonText, SkeletonCard, SkeletonTable, SkeletonRow, SkeletonProfile) with pulse animation, eliminating blank screens or generic spinners. ErrorState strictly adheres to the rule: states what happened and what to do (never generic "Something went wrong"), with retry callbacks, optional technical details, and inline/card/page variants. Completes Milestone M1 (UI Kit) at 100%.
Incomplete:     none

### TASK-015 — Login page with demo account panel
Completed: 2026-09-09
Files added:    frontend/src/lib/auth/auth.ts, frontend/src/app/login/page.tsx, frontend/src/lib/auth/__tests__/auth.test.ts
Files changed:  frontend/src/lib/repositories/students.ts, context/PROJECT_TASKS.md
Decisions:      Created institutional login page (/login) and DEMO_ACCOUNTS configuration featuring all 6 required accounts per FEATURE_SPECIFICATIONS.md §1 (Super Admin, School Admin, Campus Principal, Teacher, Parent, Student). Clicking any account fills credentials and triggers immediate sign in. Password field is strictly required and masked to preserve enterprise aesthetic. Displays required disclaimer: "Prototype: passwords are not checked." Sign in creates session (sp:v1:session), automatically resolving activeChildId for multi-child parent Tariq Khan, and redirects to the role's dashboard.
Incomplete:     none

### TASK-016 — Session, sign out, persistence across refresh
Completed: 2026-09-09
Files added:    frontend/src/components/providers/SessionProvider.tsx, frontend/src/lib/auth/__tests__/session-persistence.test.ts
Files changed:  frontend/src/app/layout.tsx, frontend/src/app/login/page.tsx, context/PROJECT_TASKS.md
Decisions:      Built application-wide SessionProvider and useSession hook. Hydrates session on mount from sp:v1:session, maintaining persistent authenticated state across browser refreshes without losing user scope. Provides reactive switchCampus() and switchChild() operations updating local storage and context state. Implemented logout() which removes sp:v1:session from storage, resets state to null, displays toast notification, and redirects to /login. Integrated with login page to display active session details when authenticated.
Incomplete:     none

### TASK-017 — Route guards — role and scope
Completed: 2026-09-09
Files added:    frontend/src/lib/auth/guards.ts, frontend/src/components/auth/Forbidden403.tsx, frontend/src/components/auth/NotFound404.tsx, frontend/src/components/auth/RouteGuard.tsx, frontend/src/components/auth/index.ts, frontend/src/lib/auth/__tests__/guards.test.ts
Files changed:  frontend/src/components/providers/SessionProvider.tsx, context/PROJECT_TASKS.md, progress.md
Decisions:      Implemented route guards and access controllers satisfying acceptance criteria: wrong role strictly maps to HTTP 403 status and displays institutional Forbidden403 screen (with role details, dashboard return button, and account switcher); out-of-scope records (different school, different campus, or unassociated parent child) strictly map to 404 status and display NotFound404 screen (preventing information disclosure across tenant boundaries). Provided useOptionalSession hook to support standalone component rendering while strictly obeying React rules-of-hooks.
Incomplete:     none

### TASK-018 — App shell: sidebar, top bar, role-scoped nav
Completed: 2026-09-09
Files added:    frontend/src/lib/navigation/nav-items.ts, frontend/src/components/shell/NavIcon.tsx, frontend/src/components/shell/Sidebar.tsx, frontend/src/components/shell/TopBar.tsx, frontend/src/components/shell/BottomNav.tsx, frontend/src/components/shell/AppShell.tsx, frontend/src/components/shell/index.ts, frontend/src/components/shell/__tests__/shell.test.ts
Files changed:  context/PROJECT_TASKS.md, progress.md
Decisions:      Built institutional application shell meeting acceptance criteria: navigation differs strictly per user role across all 6 roles (Super Admin, School Admin, Principal, Teacher, Parent, Student) mapped directly to ROUTE_STRUCTURE.md. On viewports below 768px, desktop 240px sidebar collapses to fixed bottom navigation with touch targets >= 44px, strictly restricted to <= 5 buttons (using a 5th "More" slide-over Drawer for roles with secondary modules). Integrated TopBar featuring always-visible active campus pill (UI_DESIGN_SYSTEM.md §4), active child badge for parents, demo affordances (WhatsApp Mock, Role Switch), and profile menu.
Incomplete:     none

### TASK-019 — Campus switcher
Completed: 2026-09-09
Files added:    frontend/src/components/shell/CampusSwitcher.tsx, frontend/src/components/shell/__tests__/campus-switcher.test.ts
Files changed:  frontend/src/components/shell/TopBar.tsx, frontend/src/components/shell/index.ts, context/PROJECT_TASKS.md, progress.md
Decisions:      Implemented institutional CampusSwitcher control meeting acceptance criteria: selecting an active campus calls switchCampus(campusId), updating sp:v1:session and re-scoping queries. TopBar dynamically synchronizes browser document.title to reflect the active campus ("${pageTitle} · ${campusName} · ${schoolName}"). Enforced single-campus suppression rule (UI_DESIGN_SYSTEM.md §4), suppressing the switcher when a school has <= 1 campus. Provided currentCampusName prop for clean initial SSR rendering.
Incomplete:     none

### TASK-020 — Parent child switcher
Completed: 2026-09-09
Files added:    frontend/src/components/shell/ChildSwitcher.tsx, frontend/src/components/shell/__tests__/child-switcher.test.ts
Files changed:  frontend/src/lib/repositories/parents.ts, frontend/src/components/shell/TopBar.tsx, frontend/src/components/shell/index.ts, context/PROJECT_TASKS.md, progress.md
Decisions:      Implemented ChildSwitcher component meeting acceptance criteria: querying children via getChildrenForParent(parentUserId) returns strictly the children linked to the currently logged-in parent via sp:v1:studentParents, preventing information disclosure of other students. Multi-child parents select from a TopBar dropdown with active checkmark; single-child parents see a non-interactive child indicator pill. Selecting a child calls switchChild(childId), updating activeChildId in sp:v1:session and reactive state to re-scope parent views.
### TASK-021 — Demo controls: reset data, switch role
Completed: 2026-09-09
Files added:    frontend/src/app/demo/reset/page.tsx, frontend/src/app/demo/switch-role/page.tsx, frontend/src/app/demo/__tests__/demo-controls.test.ts
Files changed:  frontend/src/components/shell/TopBar.tsx, frontend/package.json, context/PROJECT_TASKS.md, progress.md
### TASK-022 — Campus list, add, edit, assign principal
Completed: 2026-09-09
Files added:    frontend/src/components/campuses/CampusManager.tsx, frontend/src/components/campuses/index.ts, frontend/src/app/admin/campuses/page.tsx, frontend/src/app/super-admin/campuses/page.tsx, frontend/src/app/admin/campuses/__tests__/campuses.test.ts
Files changed:  context/PROJECT_TASKS.md, progress.md
### TASK-023 — Student list with search and filters
Completed: 2026-09-09
Files added:    frontend/src/components/students/StudentDirectory.tsx, frontend/src/components/students/index.ts, frontend/src/app/admin/students/page.tsx, frontend/src/app/admin/students/__tests__/student-list.test.ts
Files changed:  context/PROJECT_TASKS.md, progress.md
### TASK-024 — Admission form — all six sections
Completed: 2026-09-09
Files added:    frontend/src/components/students/AdmissionForm.tsx, frontend/src/app/admin/students/new/page.tsx, frontend/src/app/admin/students/__tests__/admission-form.test.ts
Files changed:  frontend/src/components/students/index.ts, context/PROJECT_TASKS.md, progress.md
Decisions:      Implemented comprehensive admission form fulfilling acceptance criteria: Section 5 (Health and Safety) strictly requires at least one complete emergency contact (Name, Relationship, Phone), blocking submission if omitted. Pre-submission duplicate check queries existing admission numbers across the school; if matched, blocks submission and explicitly names the existing student assigned that number. Provides all six ordered sections: 1. Personal (name, DOB, gender, blood group, photo), 2. Academic (campus, class, roll number, admission date, auto-generated admission number), 3. Address and contact, 4. Parent or guardian (search existing or create inline, primary contact toggle), 5. Health and safety (allergies, medical conditions, medications, doctor, emergency contacts, authorized pickup persons), 6. Documents (filename capture). Atomically creates Student, User, Parent, and StudentParent records. Placed at /admin/students/new protected by RouteGuard and AppShell.
Incomplete:     none

### TASK-025 — Student profile with six tabs
Completed: 2026-09-09
Files added:    frontend/src/components/students/StudentProfileView.tsx, frontend/src/app/admin/students/[id]/page.tsx, frontend/src/app/admin/students/__tests__/student-profile.test.ts
Files changed:  frontend/src/components/students/index.ts, context/PROJECT_TASKS.md, progress.md
Decisions:      Implemented student profile screen fulfilling acceptance criteria: Health tab shows a prominent Critical Health & Allergies Alert banner at the very top (Safety Priority 1) before chronic medical conditions, medications, doctor contacts, emergency contacts, or pickup persons. Implemented all six tabs: 1. Overview (personal info, class & campus pill, parent relationships with primary flag), 2. Attendance (summary stats, streak badge, and historical logs), 3. Fees (summary stat cards for billed/paid/balance and full fee invoices table), 4. Results (term academic assessment results with calculated letter grades and percentage), 5. Health (allergies at top, medical conditions, rescue medications, family doctor, emergency contacts, authorized pickup persons), 6. Documents (document vault list). Mounted dynamically at /admin/students/[id] with RouteGuard and AppShell.
Incomplete:     none

### TASK-026 — Edit and status lifecycle
Completed: 2026-09-10
Files added:    frontend/src/components/students/StudentEditForm.tsx, frontend/src/app/admin/students/[id]/edit/page.tsx, frontend/src/app/admin/students/__tests__/student-lifecycle.test.ts
Files changed:  frontend/src/lib/repositories/students.ts, frontend/src/components/students/index.ts, context/PROJECT_TASKS.md, progress.md
Decisions:      Implemented student editing and status lifecycle management fulfilling acceptance criteria: Enhanced repository with active-only queries (listActiveStudents, getAttendanceEligibleStudents, getInvoicingEligibleStudents) that strictly exclude any inactive student (transferred, graduated, withdrawn) while preserving past historical records for transcripts and audit logs. Created StudentEditForm with lifecycle impact alerts and a warning ConfirmDialog required before inactivating an active student. Created dynamic route /admin/students/[id]/edit protected by RouteGuard and AppShell.
Incomplete:     none

### TASK-027 — Teacher list, add, profile
Completed: 2026-09-10
Files added:    frontend/src/components/teachers/TeacherDirectory.tsx, frontend/src/components/teachers/TeacherForm.tsx, frontend/src/components/teachers/TeacherProfileView.tsx, frontend/src/components/teachers/index.ts, frontend/src/app/admin/teachers/page.tsx, frontend/src/app/admin/teachers/new/page.tsx, frontend/src/app/admin/teachers/[id]/page.tsx, frontend/src/app/admin/teachers/__tests__/teacher-management.test.ts
Files changed:  frontend/src/lib/repositories/teachers.ts, context/PROJECT_TASKS.md, progress.md
Decisions:      Implemented faculty directory, enrollment form, and teacher profile fulfilling acceptance criteria: Enhanced teachers repository with getTeacherAssignedSubjects and getTeacherAssignedClasses helper queries. TeacherDirectory lists all faculty with assigned subjects and classes columns, search, campus, and department filters. TeacherProfileView shows detailed assigned subjects, class cohorts (with homeroom class teacher indication), and weekly timetable periods. TeacherForm enrolls new teachers while blocking duplicate employee numbers.
Incomplete:     none

### TASK-028 — Teacher subject and class assignment
Completed: 2026-09-10
Files added:    frontend/src/components/teachers/TeacherAssignmentMatrix.tsx, frontend/src/app/admin/teachers/[id]/assignments/page.tsx, frontend/src/app/admin/teachers/__tests__/teacher-assignment.test.ts
Files changed:  frontend/src/lib/repositories/teachers.ts, frontend/src/components/teachers/TeacherProfileView.tsx, frontend/src/components/teachers/index.ts, context/PROJECT_TASKS.md, progress.md
Decisions:      Implemented single-screen bulk assignment workflow fulfilling acceptance criteria: Created bulkAssignTeacher repository method to atomically synchronize Subject.teacherId, Class.classTeacherId, and Teacher.subjectIds. Built TeacherAssignmentMatrix with bulk accelerators (Select All Department Subjects, Select All in View, Clear All, and class Select All/None toggles) and homeroom class teacher toggles across all campus classes on one screen. Created dynamic route /admin/teachers/[id]/assignments linked directly from TeacherProfileView header.
Incomplete:     none

### TASK-029 — Classes and sections CRUD
Completed: 2026-09-10
Files added:    frontend/src/components/classes/ClassManager.tsx, frontend/src/components/classes/ClassDetailView.tsx, frontend/src/components/classes/index.ts, frontend/src/app/admin/classes/page.tsx, frontend/src/app/admin/classes/[id]/page.tsx, frontend/src/app/admin/classes/__tests__/classes-crud.test.ts
Files changed:  frontend/src/lib/repositories/classes.ts, context/PROJECT_TASKS.md, progress.md
Decisions:      Implemented classes and sections management fulfilling acceptance criteria: Enhanced classes repository with validateClassUnique(campusId, grade, section, excludeClassId?, scope?) ensuring identical grade+section is permitted across different campuses while preventing intra-campus collisions. Built canDeleteClass and safeDeleteClass safeguards that block deletion if enrolled students exist, returning the student count and instructions to reassign students. Created ClassManager directory with campus/grade filters, search, metrics, and Add/Edit Class modal. Created ClassDetailView at /admin/classes/[id] featuring student roster table, assigned curriculum subjects table, and homeroom teacher assignment.
Incomplete:     none

### TASK-030 — Subjects CRUD and teacher assignment
Completed: 2026-09-10
Files added:    frontend/src/components/subjects/BulkSubjectTemplateModal.tsx, frontend/src/components/subjects/SubjectManager.tsx, frontend/src/components/subjects/index.ts, frontend/src/app/admin/subjects/page.tsx, frontend/src/app/admin/subjects/__tests__/subjects-crud.test.ts
Files changed:  frontend/src/lib/repositories/subjects.ts, frontend/src/components/classes/ClassDetailView.tsx, context/PROJECT_TASKS.md, progress.md
Decisions:      Implemented curriculum subject management and bulk addition fulfilling acceptance criteria: Defined canonical SUBJECT_TEMPLATES dictionary categorized by stream (Core, Science, Humanities/Commerce, Languages, Arts & Physical) with dynamic grade-based subject code generation. Built BulkSubjectTemplateModal supporting stream accelerators, inline teacher assignments, and duplicate template skipping. Implemented bidirectional synchronization in assignSubjectTeacher(subjectId, teacherId) and deleteSubject(id) updating Teacher.subjectIds automatically. Integrated template and custom subject workflows directly into ClassDetailView curriculum tab and built central SubjectManager mounted at /admin/subjects.
Incomplete:     none

### TASK-031 — Parent records and student linking
Completed: 2026-09-10
Files added:    frontend/src/components/parents/ParentDirectory.tsx, frontend/src/components/parents/ParentProfileView.tsx, frontend/src/components/parents/index.ts, frontend/src/app/admin/parents/page.tsx, frontend/src/app/admin/parents/[id]/page.tsx, frontend/src/app/admin/parents/__tests__/parent-linking.test.ts
Files changed:  frontend/src/lib/repositories/parents.ts, frontend/src/lib/repositories/studentParents.ts, frontend/src/components/students/StudentProfileView.tsx, context/PROJECT_TASKS.md, progress.md
Decisions:      Implemented parent record management, many-to-many student linkages, and sibling cohort resolution: Built linkStudentParent and unlinkStudentParent supporting multiple guardians per student (Father, Mother, Legal Guardian) and multiple students per parent. Implemented setPrimaryGuardian with automatic primary contact promotion upon unlinking. Created bidirectional sibling discovery in getSiblingsForStudent(studentId) with dual-parent deduplication. Developed ParentDirectory at /admin/parents with sibling cohort badges, multi-child filters, and parent registration modal. Developed ParentProfileView at /admin/parents/[id] with child linking modal, sibling banners, and contact management. Enhanced StudentProfileView with multiple linked parents and Enrolled Siblings card. Concluded Milestone M3 (Core Records: 10/10 tasks complete).
Incomplete:     none

### TASK-032 — Attendance repository, per-class-per-day documents
Completed: 2026-09-10
Files added:    frontend/src/lib/repositories/__tests__/attendance-repository.test.ts
Files changed:  frontend/src/types/attendance.ts, frontend/src/lib/repositories/attendance.ts, context/PROJECT_TASKS.md, progress.md
Decisions:      Implemented per-class-per-day attendance repository meeting DATA_MODELS.md §4: Used canonical ID format att_${classId}_${date}, storing student ID arrays for present, absent, late, and leave (strictly avoiding individual student row bloat and fitting seed data under 1.63MB). Implemented full on-read derived calculations without persisting duplicate state: calculateClassDaySummary, getStudentAttendanceHistory, calculateStudentAttendanceStats, and getClassesAttendanceStatusForDate. Added atomic saveAttendance with deduplication (leave > late > present > absent) and revision audit fields (markedBy, markedAt, editedBy, editedAt). Implemented 24-hour edit window check with admin override in canEditAttendance.
Incomplete:     none

### TASK-033 — Teacher attendance marking screen
Completed: 2026-09-10
Files added:    frontend/src/components/attendance/AttendanceStatusControl.tsx, frontend/src/components/attendance/AttendanceSummaryBar.tsx, frontend/src/components/attendance/AttendanceSaveBar.tsx, frontend/src/components/attendance/AttendanceGrid.tsx, frontend/src/components/attendance/index.ts, frontend/src/app/teacher/classes/[id]/attendance/page.tsx, frontend/src/app/teacher/classes/[id]/attendance/__tests__/attendance-marking.test.ts
Files changed:  frontend/src/types/communication.ts, frontend/package.json, context/PROJECT_TASKS.md, progress.md
Decisions:      Implemented teacher attendance marking screen meeting acceptance criteria (40 students markable in under 60s): Active students default to present on unmarked days with inactive students excluded; teachers only toggle exceptions. Built accessible 44px segmented control with color-coded badges and glyphs (Present: Emerald, Absent: Rose, Late: Amber, Leave: Indigo). Added keyboard accelerators (P, A, L, V keys toggle and auto-advance row; Up/Down and J/K arrows navigate focus; Ctrl+S saves). Added live running tally bar with presence percentage and sticky save bar with loading state and disabled state outside 24h edit window. Dispatched parent notifications and mock WhatsApp logs for absent students upon saving.
Incomplete:     none

### TASK-034 — Save, edit window, audit trail
Completed: 2026-09-10
Files added:    frontend/src/components/attendance/AttendanceAuditBanner.tsx, frontend/src/components/attendance/AttendanceAuditModal.tsx, frontend/src/app/teacher/classes/[id]/attendance/__tests__/attendance-audit.test.ts
Files changed:  frontend/src/types/common.ts, frontend/src/lib/repositories/attendance.ts, frontend/src/lib/repositories/settings.ts, frontend/src/lib/seed/generator.ts, frontend/src/lib/utils/dates.ts, frontend/src/components/attendance/AttendanceSaveBar.tsx, frontend/src/components/attendance/AttendanceGrid.tsx, frontend/src/components/attendance/index.ts, context/PROJECT_TASKS.md, progress.md
Decisions:      Implemented attendance edit window and audit trail meeting acceptance criteria (shows who marked and when; edit allowed within window): Added attendanceEditWindowHours to Settings (default 48h / 2 days per FEATURE_SPECIFICATIONS.md §8). Enhanced canEditAttendance computing remaining hours/minutes, expiration flag, and administrative override status. For teachers, registers are editable within the window and lock into read-only mode with disabled controls and suppressed shortcut keys once expired. School Admins and Super Admins retain override permissions to make corrections to expired records. Created AttendanceAuditBanner displaying marker details, last editor details, and live countdown timer. Created accessible AttendanceAuditModal rendering full submission and modification timeline alongside institutional integrity policy. Guaranteed that saveAttendance preserves original markedBy and markedAt while capturing editedBy and editedAt.
### TASK-035 — Teacher dashboard — today's classes and marked state
Completed: 2026-09-10
Files added:    frontend/src/components/teacher/ClassAttendanceCard.tsx, frontend/src/components/teacher/TeacherDashboardView.tsx, frontend/src/components/teacher/index.ts, frontend/src/app/teacher/dashboard/page.tsx, frontend/src/app/teacher/dashboard/__tests__/teacher-dashboard.test.ts
Files changed:  context/PROJECT_TASKS.md, progress.md
Decisions:      Implemented teacher dashboard meeting acceptance criteria (clear which classes still need marking): Built ClassAttendanceCard with high-contrast amber warning badge and pulsing indicator ('Needs Marking') with high-visibility 44px primary action button ('Mark Attendance →') for unmarked classes; marked classes display emerald badge ('✓ Marked'), daily presence rate percentage, and status count chips (Present, Absent, Late, Leave) with secondary action button ('View / Edit Register'). Developed TeacherDashboardView with quick date navigation picker, urgent attention alert callout when unmarked classes exist, four KPI StatCards (Pending Registers, Marked Registers, Today's Presence %, Total Students), interactive filter tabs ('All Classes', 'Needs Marking', 'Already Marked'), and sort order placing unmarked classes first. Mounted at /teacher/dashboard protected with RouteGuard and AppShell.
### TASK-036 — Admin attendance overview grid
Completed: 2026-09-10
Files added:    frontend/src/components/attendance/AdminAttendanceGrid.tsx, frontend/src/components/attendance/AdminAttendanceOverview.tsx, frontend/src/app/admin/attendance/page.tsx, frontend/src/app/principal/attendance/page.tsx, frontend/src/app/admin/attendance/__tests__/admin-attendance-overview.test.ts
Files changed:  frontend/src/lib/repositories/settings.ts, frontend/src/lib/repositories/attendance.ts, frontend/src/types/attendance.ts, frontend/src/lib/utils/dates.ts, frontend/src/components/attendance/index.ts, context/PROJECT_TASKS.md, progress.md
Decisions:      Implemented admin attendance overview grid fulfilling acceptance criteria (unmarked classes highlighted): Added isPastCutoff evaluating calendar dates and comparing today's time with configurable cutoff time (attendanceCutoffTime: '08:30' from settings). Added getAttendanceMatrix aggregating classes x dates with assigned class teacher names, student enrollment, and per-date attendance status. Built AdminAttendanceGrid with high-contrast amber warning badges ('Needs Marking', 'Overdue Past 08:30') for unmarked classes past cutoff, alongside neutral/emerald badges with presence percentages and absent counts for marked registers. Built AdminAttendanceOverview control center with urgent attention alert callout listing overdue classes and responsible teachers, 4 StatCards, week switcher (Prev Week, Current Week, Next Week), campus filter, search box, and Grid/Roster view toggle. Mounted at /admin/attendance and /principal/attendance protected with RouteGuard and AppShell.
### TASK-037 — Attendance reports and CSV export
Completed: 2026-09-10
Files added:    frontend/src/lib/utils/csv.ts, frontend/src/components/attendance/AttendanceReportsView.tsx, frontend/src/app/admin/attendance/reports/page.tsx, frontend/src/app/admin/attendance/reports/__tests__/attendance-reports.test.ts
Files changed:  frontend/src/lib/utils/index.ts, frontend/src/types/attendance.ts, frontend/src/lib/repositories/attendance.ts, frontend/src/components/attendance/index.ts, context/PROJECT_TASKS.md, progress.md
Decisions:      Implemented attendance reporting and CSV export fulfilling acceptance criteria (by class, by student, by range): Created RFC 4180 compliant CSV utility (formatCSVCell, generateCSV, downloadCSV with UTF-8 BOM support). Built getClassAttendanceReport aggregating class roster with student-level present, absent, late, leave counts and attendance percentages across date ranges. Built getDateRangeAttendanceReport aggregating daily school/campus metrics (classes marked, total presence %, total absences) for each instructional day. Built getStudentAttendanceReport providing longitudinal student profiles with daily history logs. Built AttendanceReportsView with three dedicated tabs ('By Class Cohort', 'By Date Range Trend', 'By Individual Student'), quick date range presets (Today, Past 7 Days, Past 30 Days, Academic Term), summary StatCards, sortable data tables, and one-click RFC 4180 CSV export and browser print buttons. Mounted at /admin/attendance/reports protected by RouteGuard and AppShell.
Incomplete:     none

### TASK-038 — Parent monthly attendance calendar
Completed: 2026-09-10
Files added:    frontend/src/components/parent/ParentAttendanceCalendar.tsx, frontend/src/components/parent/index.ts, frontend/src/app/parent/attendance/page.tsx, frontend/src/app/parent/attendance/__tests__/parent-attendance-calendar.test.ts
Files changed:  frontend/src/lib/utils/dates.ts, frontend/src/lib/utils/index.ts, frontend/src/types/attendance.ts, frontend/src/lib/repositories/attendance.ts, context/PROJECT_TASKS.md, progress.md, context/CHANGELOG.md
Decisions:      Implemented parent monthly attendance calendar fulfilling acceptance criteria (Colour + label; summary counts and percentage): Created getMonthCalendarGrid in src/lib/utils/dates.ts generating a 35-42 cell calendar month grid with Monday-first convention. Created getStudentMonthAttendance in attendance repository calculating monthly stats (percentage, present, absent, late, leave counts) and mapping day-by-day records. Built ParentAttendanceCalendar component featuring: 1) Child context banner with multi-child switcher pills for parents with multiple enrolled children; 2) Month navigation header (Prev/Next month buttons, Current month preset, and dynamic month/year heading); 3) 5 StatCards displaying Monthly Presence percentage, Days Present, Days Absent (with warning trend if > 0), Days Late, and Days on Leave; 4) Legend bar explaining all 4 color + label combinations; 5) 7-column calendar grid where each cell explicitly displays day number, status color, glyph, and label badge ('✓ Present', '✕ Absent', '⏱ Late', '📋 Leave'), and handles Sundays/non-instructional days; 6) Selected day detail popover card. Mounted at /parent/attendance protected with RouteGuard, with automatic child resolution and NotFound404 guard against out-of-scope student queries.
Incomplete:     none

### TASK-039 — QR scan mock screen
Completed: 2026-09-10
Files added:    frontend/src/components/attendance/QRScannerMock.tsx, frontend/src/app/teacher/attendance/scan/page.tsx, frontend/src/app/teacher/attendance/scan/__tests__/qr-scanner-mock.test.ts
Files changed:  frontend/src/components/attendance/AttendanceGrid.tsx, frontend/src/components/attendance/index.ts, context/PROJECT_TASKS.md, progress.md, context/CHANGELOG.md
Decisions:      Implemented QR scan mock screen fulfilling acceptance criteria (Simulated scan; falls back to manual without reload): Built interactive camera viewfinder frame with dark chassis, animated emerald laser sweep line, corner targeting brackets, centering reticle, live camera status badge ('SCANNER ACTIVE 1080P HD'), and synthesized audio chime feedback via Web Audio API. Built simulation controls including 'Simulate Scan (Next Student)', 'Random Scan', targeted student dropdown selector, and manual barcode/badge gun text input. Implemented running log of scanned students in reverse chronological order with timestamp, avatar, student details, status badges ('✓ Present' or '⏱ Late'), and undo scan capability. Implemented seamless fallback to manual grid without reload via in-place mode switcher and quick button in AttendanceGrid header, preserving scanned statuses in the manual register. Built RFID concept screen explicitly labelled 'CONCEPT ONLY — Hardware Integration Not Implemented' showcasing UHF RFID gate reader specs, simulated turnstile event stream, and parent WhatsApp arrival webhook alert triggers. Milestone M4 (Attendance) is now 100% complete (8/8 tasks).
Incomplete:     none

### TASK-040 — Fee structures CRUD
Completed: 2026-09-10
Files added:    frontend/src/components/fees/FeeStructureForm.tsx, frontend/src/components/fees/FeeStructuresTable.tsx, frontend/src/components/fees/FeeStructuresView.tsx, frontend/src/components/fees/index.ts, frontend/src/app/admin/fees/structures/page.tsx, frontend/src/app/admin/fees/structures/__tests__/fee-structures.test.ts
Files changed:  frontend/src/lib/utils/currency.ts, frontend/src/lib/repositories/feeStructures.ts, context/PROJECT_TASKS.md, progress.md, context/CHANGELOG.md
Decisions:      Implemented Fee structures CRUD fulfilling acceptance criteria (Per class, optional campus scope): Enforced strictly per-class assignment (non-empty class selection validation) with full multi-class toggle, select all, and clear helpers. Enforced optional campus scope allowing structures to be designated school-wide (All Campuses) or targeted to a specific campus. Added support for monthly, term, and annual fee frequencies. Enhanced repository with getFeeStructuresForClass, FeeStructureFilter, and canDeleteFeeStructure to prevent deletion when structures are in active use on student invoices. Built high-fidelity administrative view with live financial projection StatCards, search and multi-facet filtering, create/edit modal dialog, and destructive delete confirmation dialog. Added formatCurrency alias to currency utils.
Incomplete:     none

### TASK-041 — Bulk invoice generation with preview
Completed: 2026-09-10
Files added:    frontend/src/components/fees/BulkInvoiceModal.tsx, frontend/src/components/fees/InvoicesTable.tsx, frontend/src/components/fees/InvoicesListView.tsx, frontend/src/app/admin/fees/invoices/page.tsx, frontend/src/app/admin/fees/invoices/__tests__/bulk-invoices.test.ts
Files changed:  frontend/src/types/fees.ts, frontend/src/lib/repositories/feeInvoices.ts, frontend/src/components/fees/index.ts, context/PROJECT_TASKS.md, progress.md, context/CHANGELOG.md
Decisions:      Implemented bulk invoice generation fulfilling acceptance criteria (Preview shows count and total; re-run creates no duplicates): Added billingMonth property to FeeInvoice and implemented previewBulkInvoiceGeneration which evaluates eligible active students, applies applicable class fee structures, inspects sibling concessions (e.g. Ayesha Khan 15% discount), and checks existing invoices to flag duplicates. Implemented generateBulkInvoices creating invoices only for non-duplicate records with sequential INV-YYYY-XXXXX numbers. Idempotent re-runs evaluate 0 new invoices and skip existing batches, creating zero duplicates. Built BulkInvoiceModal with 2-step wizard (Configure and Preview with financial StatCards and itemized preview table) and InvoicesListView with StatCards, filters, pagination, and high-density InvoicesTable. Mounted at /admin/fees/invoices with RouteGuard and AppShell.
Incomplete:     none

### TASK-042 — Payment recording, partial payments, balance
Completed: 2026-09-10
Files added:    frontend/src/components/fees/RecordPaymentModal.tsx, frontend/src/components/fees/PaymentReceiptModal.tsx, frontend/src/components/fees/InvoiceDetailView.tsx, frontend/src/app/admin/fees/invoices/[id]/page.tsx, frontend/src/app/admin/fees/invoices/__tests__/payment-recording.test.ts
Files changed:  frontend/src/lib/repositories/feeInvoices.ts, frontend/src/components/fees/index.ts, context/PROJECT_TASKS.md, progress.md, context/CHANGELOG.md
Decisions:      Implemented payment recording fulfilling acceptance criteria (Status transitions correct; balance always right): Enhanced recordPayment repository function to calculate running balance, validate positive payment amounts, block overpayment or payment on fully paid invoices, and manage status transitions (pending/overdue -> partial -> paid). Added sequential receipt generator getNextReceiptNumber issuing immutable REC-YYYY-XXXXX receipt identifiers that remain constant when reprinted or reloaded. Built RecordPaymentModal with live balance previews, quick preset percentage buttons, and method selection (cash, bank, cheque, online). Built PaymentReceiptModal with printable official voucher layout, line item breakdown, and window.print() trigger. Built InvoiceDetailView and dynamic route /admin/fees/invoices/[id] with financial StatCards, student card, line items, and transaction history table with receipt printing triggers.
Incomplete:     none

### TASK-043 — Discounts, scholarships, sibling concession
Completed: 2026-09-10
Files added:    frontend/src/lib/repositories/studentConcessions.ts, frontend/src/components/fees/ApplyConcessionModal.tsx, frontend/src/components/fees/StudentConcessionsModal.tsx, frontend/src/app/admin/fees/invoices/__tests__/discounts-concessions.test.ts
Files changed:  frontend/src/types/fees.ts, frontend/src/lib/storage/keys.ts, frontend/src/lib/repositories/feeInvoices.ts, frontend/src/components/fees/InvoiceDetailView.tsx, frontend/src/components/fees/PaymentReceiptModal.tsx, frontend/src/components/fees/index.ts, context/PROJECT_TASKS.md, progress.md, context/CHANGELOG.md
Decisions:      Implemented discounts, scholarships, and sibling concessions fulfilling acceptance criteria (Visible as line items, never silent): Enforced rule that discounts never silently reduce gross tuition. Gross tuition structure amount is preserved in totalAmount, while concessions are itemized as explicit negative line items (e.g. Sibling Concession 15%, Merit Scholarship 25%, Staff Child Concession 50%). Built StudentConcession model and repository supporting recurring student concession assignments and automatic sibling detection (hasEnrolledSiblings). Integrated calculateStudentConcessions into bulk invoice generation. Implemented applyInvoiceConcession and removeInvoiceConcession for dynamic ad-hoc concession adjustments on invoices with instant balance recalculation. Built ApplyConcessionModal with live financial deduction previews, StudentConcessionsModal for profile management, and updated InvoiceDetailView and PaymentReceiptModal with explicit [CONCESSION] badges.
Incomplete:     none

### TASK-044 — Receipt with sequential numbering
Completed: 2026-09-10
Files added:    frontend/src/app/admin/fees/invoices/__tests__/sequential-receipts.test.ts
Files changed:  frontend/src/lib/repositories/feeInvoices.ts, frontend/src/components/fees/PaymentReceiptModal.tsx, frontend/src/components/fees/InvoiceDetailView.tsx, context/PROJECT_TASKS.md, progress.md, context/CHANGELOG.md
Decisions:      Implemented sequential receipt numbering and reprint preservation fulfilling acceptance criteria (Reprint does not issue a new number): Verified that multiple queries, invoice reloads, and print dialog invocations strictly preserve the original receipt number without issuing a new one or advancing the sequence counter. Added getPaymentReceiptByNumber enabling direct receipt lookup by identifier across all invoices for cashiering audits. Enhanced PaymentReceiptModal with isReprint support displaying an official [DUPLICATE] copy badge and copy-to-clipboard button.
Incomplete:     none

### TASK-045 — Student fee ledger and defaulter report
Completed: 2026-09-10
Files added:    frontend/src/lib/repositories/feeDefaulters.ts, frontend/src/components/fees/DefaultersListView.tsx, frontend/src/components/fees/StudentFeeLedgerModal.tsx, frontend/src/app/admin/fees/defaulters/page.tsx, frontend/src/app/admin/fees/defaulters/__tests__/defaulters-ledger.test.ts
Files changed:  frontend/src/lib/repositories/index.ts, frontend/src/components/fees/index.ts, frontend/src/components/fees/InvoicesListView.tsx, context/PROJECT_TASKS.md, progress.md, context/CHANGELOG.md
Decisions:      Implemented student fee ledger and defaulter report fulfilling acceptance criteria (Filter by amount and days overdue): Built getDefaultersReport in feeDefaulters.ts detecting all past-due balances with configurable thresholds for days overdue (7+, 15+, 30+, 60+) and minimum balance (>= 5k, 10k, 25k, 50k PKR), as well as campus, class, and text search filters. Built sendDefaulterReminder and sendBulkDefaulterReminders adhering to FEATURE_SPECIFICATIONS.md §16 WhatsApp templates and writing directly to STORAGE_KEYS.WHATSAPP_LOG. Implemented getStudentFeeLedger compiling all billing debits, scholarship/concession credits, and payments with cumulative running balance invariant. Mounted dedicated Defaulter Report page at /admin/fees/defaulters with StatCards, multi-select checkboxes, and StudentFeeLedgerModal with official print dialog support.
Incomplete:     none

### TASK-046 — Parent fee view
Completed: 2026-09-10
Files added:    frontend/src/lib/repositories/parentFees.ts, frontend/src/components/parent/ParentFeeView.tsx, frontend/src/components/parent/ParentDashboardView.tsx, frontend/src/app/parent/fees/page.tsx, frontend/src/app/parent/dashboard/page.tsx, frontend/src/app/parent/fees/__tests__/parent-fees.test.ts
Files changed:  frontend/src/lib/repositories/index.ts, frontend/src/components/parent/index.ts, context/PROJECT_TASKS.md, progress.md, context/CHANGELOG.md
Decisions:      Implemented parent fee portal and dashboard financial presentation fulfilling acceptance criteria (Balance on dashboard; receipts downloadable): Built getParentStudentFeeOverview in parentFees.ts calculating current balance, billing totals, relief deductions, next payment due date, and flattened payment receipts. Created ParentDashboardView mounted at /parent/dashboard presenting the child fee balance prominently in tabular numerals with next due date and link to fee details. Created ParentFeeView mounted at /parent/fees with multi-child selector, hero balance card, invoice history table, and downloadable payment receipts via PaymentReceiptModal with official reprint copy indicator and print support. Enforced strict parent-child authorization with NotFound404 barrier on out-of-scope requests.
Incomplete:     none

### TASK-047 — Exam creation and schedule
Completed: 2026-09-10
Files added:    frontend/src/components/exams/ExamFormModal.tsx, frontend/src/components/exams/ExamsListView.tsx, frontend/src/components/exams/index.ts, frontend/src/app/admin/exams/page.tsx, frontend/src/app/admin/exams/__tests__/exam-schedule.test.ts
Files changed:  frontend/src/lib/repositories/exams.ts, frontend/src/components/ui/StatusBadge.tsx, context/PROJECT_TASKS.md, progress.md, context/CHANGELOG.md
Decisions:      Implemented exam creation and schedule management fulfilling acceptance criteria (Per class and subject): Extended frontend/src/lib/repositories/exams.ts with createExamSchedule, listEnrichedExams, and getEnrichedExam. Strictly validates exam creation per class and subject with maxMarks > 0, non-empty term, and valid date. Designed ExamFormModal with dynamic subject filtering by selected class. Built administrative timetable at /admin/exams with 4 StatCards, multi-facet filtering (campus, class, subject, term, status), high-density exam schedule table with student enrollment counts and status badges, direct links to teacher marks entry (/teacher/exams/[id]/marks), and edit/delete actions. Added marks_entered lifecycle status to StatusBadge component.
Incomplete:     none

### TASK-048 — Marks entry grid, keyboard-driven, autosave
Completed: 2026-09-10
Files added:    frontend/src/components/exams/MarksEntryGrid.tsx, frontend/src/app/teacher/exams/[id]/marks/page.tsx, frontend/src/app/teacher/exams/[id]/marks/__tests__/marks-entry.test.ts
Files changed:  frontend/src/lib/repositories/examResults.ts, frontend/src/components/exams/index.ts, context/PROJECT_TASKS.md, progress.md, context/CHANGELOG.md
Decisions:      Implemented teacher and admin marks entry grid fulfilling acceptance criteria (Class of 40 entered in under 5 minutes; over-max rejected inline): Built getExamMarksGridData and saveExamMarksEntry in examResults.ts. Created MarksEntryGrid.tsx with keyboard navigation (Enter and ArrowDown advance to next student and call .select() for rapid numeric entry, ArrowUp moves up, Tab/Shift+Tab navigate fields, 'A' shortcut marks absent). Implemented real-time inline rejection of over-max values (> maxMarks or < 0) with red cell borders, alert pills, and exclusion from autosaved draft writes. Integrated debounced draft autosave (800ms) with visual status pill, manual Save Draft and Finalize actions, and live class statistics with dynamic grading scale calculation. Mounted route at /teacher/exams/[id]/marks protected by RouteGuard and AppShell.
Incomplete:     none

### TASK-049 — Grade calculation from configurable scale
Completed: 2026-09-10
Files added:    frontend/src/components/settings/GradingScaleEditor.tsx, frontend/src/components/settings/SettingsView.tsx, frontend/src/components/settings/index.ts, frontend/src/app/admin/settings/page.tsx, frontend/src/app/admin/settings/__tests__/grading-scale.test.ts
Files changed:  frontend/src/lib/utils/grading.ts, frontend/src/lib/repositories/settings.ts, frontend/src/lib/repositories/examResults.ts, context/PROJECT_TASKS.md, progress.md, context/CHANGELOG.md
Decisions:      Implemented grade calculation from configurable scale fulfilling acceptance criteria (Scale editable in settings; no hardcoded thresholds): Extended settings.ts with updateGradingScale and resetGradingScale. Strengthened calculateGrade in grading.ts to evaluate strictly against custom scales loaded from Settings with zero hardcoded thresholds. Built validateGradingScale detecting empty scales, inverted boundaries, overlaps, and duplicate grade labels. Added getPresetGradingScales with 4 standardized institutional templates. Implemented recalculateExamResults in examResults.ts to re-evaluate existing exams when grade policies change. Built GradingScaleEditor.tsx with interactive tier configuration table, presets bar, and real-time score test sandbox. Mounted route at /admin/settings protected by RouteGuard and AppShell.
Incomplete:     none

### TASK-050 — Publish and unpublish results
Completed: 2026-09-10
Files added:    frontend/src/app/admin/exams/__tests__/publish-results.test.ts
Files changed:  frontend/src/lib/repositories/exams.ts, frontend/src/lib/repositories/examResults.ts, frontend/src/components/exams/ExamsListView.tsx, context/PROJECT_TASKS.md, progress.md, context/CHANGELOG.md
### TASK-051 — Report card generation and batch print
Completed: 2026-09-10
Files added:    frontend/src/lib/repositories/reportCards.ts, frontend/src/components/results/ReportCardDocument.tsx, frontend/src/components/results/ReportCardBatchView.tsx, frontend/src/components/results/index.ts, frontend/src/app/admin/results/report-cards/page.tsx, frontend/src/app/admin/results/report-cards/__tests__/report-cards.test.ts
Files changed:  frontend/src/app/globals.css, frontend/src/lib/repositories/index.ts, frontend/src/lib/navigation/nav-items.ts, frontend/src/components/exams/ExamsListView.tsx, context/PROJECT_TASKS.md, progress.md, context/CHANGELOG.md
### TASK-052 — Parent and student results view
Completed: 2026-09-10
Files added:    frontend/src/components/results/StudentResultsView.tsx, frontend/src/app/parent/results/page.tsx, frontend/src/app/student/results/page.tsx, frontend/src/app/parent/results/__tests__/parent-student-results.test.ts
Files changed:  frontend/src/lib/repositories/reportCards.ts, frontend/src/components/results/index.ts, context/PROJECT_TASKS.md, progress.md, context/CHANGELOG.md
Decisions:      Implemented parent and student results portal views fulfilling acceptance criteria (Published only): Extended reportCards.ts with getStudentReportCard(scope, studentId, term) for single-student report card retrieval. Created unified StudentResultsView.tsx supporting 'parent' mode (with multi-child switcher and active child resolution) and 'student' mode. Enforces strict publication isolation via listPublishedResultsForStudent: unpublished/draft/marks_entered exams are strictly invisible. Renders performance overview StatCards, published marks table with grades and feedback remarks, and 'View Official Report Card' modal previewing the branded ReportCardDocument with browser print trigger. Created routes at /parent/results and /student/results with RouteGuard, AppShell, and family scope authorization. Concluded Milestone M6 (Exams & Results: 6/6 tasks complete).
Incomplete:     none

### TASK-053 — Timetable slot model and period configuration
Completed: 2026-09-10
Files added:    frontend/src/components/settings/PeriodConfigurationEditor.tsx, frontend/src/app/admin/timetable/page.tsx, frontend/src/app/admin/timetable/__tests__/period-configuration.test.ts
Files changed:  frontend/src/types/academics.ts, frontend/src/types/common.ts, frontend/src/lib/repositories/settings.ts, frontend/src/lib/repositories/timetableSlots.ts, frontend/src/components/settings/SettingsView.tsx, frontend/src/components/settings/index.ts, context/PROJECT_TASKS.md, progress.md, context/CHANGELOG.md
Decisions:      Implemented period definition model and configurable daily bell schedules fulfilling acceptance criteria (Period times configurable): Added PeriodDefinition interface (period, name, startTime, endTime, isBreak) and integrated periods array into Settings schema, automatically initializing with DEFAULT_PERIODS (6-period morning schedule with break gaps from 08:00 to 13:00) when missing. Built comprehensive validation engine (validatePeriodConfiguration) ensuring positive period numbers, non-empty names, valid HH:MM formats, non-inverted times, duplicate period number prevention, and non-overlapping slot detection. Added schedule presets (Standard 6-Period, 8-Slot with Break Slots, Compact 5-Period, Extended 7-Period) via getPresetPeriodConfigurations. Made startTime and endTime optional on NewTimetableSlot, auto-resolving them from configured period times in createTimetableSlot. Implemented getEnrichedTimetableSlots with human-readable teacher names, subject names, class names, and period labels. Created responsive PeriodConfigurationEditor component with schedule KPIs, preset selector, period table, inline time pickers, reorder controls, and live validation error callouts. Embedded editor into SettingsView ("Timetable & Periods" tab) and created /admin/timetable page with coverage overview.
Incomplete:     none

### TASK-054 — Timetable builder grid
Completed: 2026-09-10
Files added:    frontend/src/components/timetable/SlotPickerModal.tsx, frontend/src/components/timetable/TimetableGrid.tsx, frontend/src/components/timetable/index.ts, frontend/src/app/admin/timetable/__tests__/timetable-builder.test.ts
Files changed:  frontend/src/types/academics.ts, frontend/src/lib/repositories/timetableSlots.ts, frontend/src/app/admin/timetable/page.tsx, context/PROJECT_TASKS.md, progress.md, context/CHANGELOG.md
Decisions:      Implemented interactive weekly Timetable Builder Grid fulfilling acceptance criteria (Cell picker for subject and teacher): Created SlotPickerModal supporting subject selection from class curriculum, automatic instructor pre-selection based on subject defaults, instructor override, and room specification. Extended timetableSlots repository with getClassTimetableGrid(scope, classId) returning 2D matrix mapping, upsertTimetableSlot(input) for slot assignment/updates, and deleteTimetableSlotByCoordinates. Built responsive TimetableGrid component featuring section switcher, scheduled fill rate indicator, 5-day / 6-day (Saturday) toggle, distinctive non-instructional break rows (isBreak: true), cell click handlers, and empty cell (+ Assign) buttons. Integrated builder grid as primary view at /admin/timetable.
Incomplete:     none

### TASK-055 — Live clash detection — teacher, room, class
Completed: 2026-09-10
Files added:    frontend/src/app/admin/timetable/__tests__/clash-detection.test.ts
Files changed:  frontend/src/lib/repositories/timetableSlots.ts, frontend/src/components/timetable/SlotPickerModal.tsx, frontend/src/components/timetable/TimetableGrid.tsx, context/PROJECT_TASKS.md, progress.md, context/CHANGELOG.md
Decisions:      Implemented live reactive clash detection for timetable allocations fulfilling acceptance criteria (Warns before commit, naming the conflict): Added detectTimetableClashes in timetableSlots.ts returning structured ClashCheckResult with typed TimetableClash objects. Enforces network-wide teacher double-booking checks across all campuses ({ schoolId }) and room collisions within the local campus ({ schoolId, campusId }) for the selected dayOfWeek and period. Evaluates excludeSlotId to avoid false self-conflicts during slot editing. Updated SlotPickerModal with live async conflict detection on teacher/room changes, rendering an amber conflict alert banner detailing conflicting class section, period, subject, room, and other campus name when applicable before the user commits. Added conflict guard requiring confirmation checkbox to override when saving. Extended TimetableGrid to provide slot coordinates and scope to the modal.
Incomplete:     none

### TASK-056 — Timetable views by class, teacher, room
Completed: 2026-09-10
Files added:    frontend/src/components/timetable/TimetableScheduleViews.tsx, frontend/src/app/admin/timetable/__tests__/timetable-views.test.ts
Files changed:  frontend/src/lib/repositories/timetableSlots.ts, frontend/src/components/timetable/index.ts, frontend/src/app/admin/timetable/page.tsx, context/PROJECT_TASKS.md, progress.md, context/CHANGELOG.md
Decisions:      Implemented comprehensive weekly timetable views and print output fulfilling acceptance criteria (All printable): Added getTeacherTimetableGrid, getRoomTimetableGrid, and listDistinctRooms in timetableSlots.ts returning 2D slot matrices, coordinate maps, and workload/utilization analytics. Created TimetableScheduleViews component offering instantaneous switching between By Class (grade, section, subject, code pill, teacher, room), By Teacher (class, subject, room, prep period badges, workload metrics), and By Room (class, subject, teacher, vacant markers, room utilization). Added printable output styles (@media print and Tailwind print: variants) featuring official institutional headers (school name, campus name, academic year, schedule title, date generated), high-contrast borders, signature verification lines, and screen-only element masking. Integrated into /admin/timetable via dedicated "Schedule Views & Print" tab.
### TASK-057 — Course CRUD and enrolment via class
Completed: 2026-09-10
Files added:    frontend/src/components/lms/TeacherCoursesView.tsx, frontend/src/components/lms/StudentCoursesView.tsx, frontend/src/components/lms/index.ts, frontend/src/app/teacher/courses/page.tsx, frontend/src/app/student/courses/page.tsx, frontend/src/app/teacher/courses/__tests__/courses-enrolment.test.ts
Files changed:  frontend/src/types/lms.ts, frontend/src/lib/repositories/courses.ts, context/PROJECT_TASKS.md, progress.md, context/CHANGELOG.md
### TASK-058 — Lesson CRUD, ordering, content types
Completed: 2026-09-10
Files added:    frontend/src/components/lms/LessonManager.tsx, frontend/src/components/lms/LessonModal.tsx, frontend/src/components/lms/LessonContentPreview.tsx, frontend/src/app/teacher/courses/[id]/page.tsx, frontend/src/app/teacher/courses/[id]/__tests__/lessons-ordering.test.ts
Files changed:  frontend/src/types/lms.ts, frontend/src/lib/repositories/lessons.ts, frontend/src/components/lms/index.ts, context/PROJECT_TASKS.md, progress.md, context/CHANGELOG.md
Decisions:      Implemented complete Lesson authoring, ordering, and three content types fulfilling acceptance criteria (Drag to reorder; three content types): Enhanced lessons.ts repository with input validation, automatic sequential orderIndex determination, atomic reorderLessons, and accessible moveLesson helper for up/down navigation. Built LessonManager component providing HTML5 native drag-and-drop reordering with visual drag grip handles, dragging states, drop targets, and accessible Up/Down buttons. Built LessonModal supporting Video (duration in mins, stream link placeholder), PDF (document link placeholder), and Notes (rich text/Markdown lecture notes body). Built LessonContentPreview displaying high-fidelity player placeholder with stream timeline for video, document viewer with simulated download for PDF, and styled lecture reader for notes. Created /teacher/courses/[id] App Router page.
### TASK-059 — Student course and lesson viewer
Completed: 2026-09-10
Files added:    frontend/src/components/lms/StudentCourseView.tsx, frontend/src/app/student/courses/[id]/page.tsx, frontend/src/app/student/courses/[id]/__tests__/student-lesson-viewer.test.ts
Files changed:  frontend/src/components/lms/index.ts, context/PROJECT_TASKS.md, progress.md, context/CHANGELOG.md
Decisions:      Implemented student course and lesson viewer fulfilling acceptance criteria (Placeholders for video and PDF): Built StudentCourseView component with 2-column responsive layout featuring an interactive lesson viewing stage and syllabus playlist sidebar. Embedded a high-fidelity 16:9 video player placeholder with HD 1080p stream badge, live Play/Pause toggle, duration indicator ({durationMinutes} mins), and timeline scrubber. Built a PDF document placeholder with file metadata, simulated download/open trigger, guidance notes, and prototype constraint disclaimer ("No real files are stored in prototype mode per specification"). Built a formatted rich text notes reader. Implemented Next / Previous navigation buttons with disabled boundary logic and interactive target lesson previews. Created /student/courses/[id] student App Router page with course hero banner, breadcrumbs, and role-scoped session handling.
### TASK-060 — Lesson completion and course progress
Completed: 2026-09-10
Files added:    frontend/src/lib/repositories/lessonCompletions.ts, frontend/src/lib/repositories/__tests__/lesson-progress.test.ts
Files changed:  frontend/src/lib/storage/keys.ts, frontend/src/types/lms.ts, frontend/src/lib/repositories/index.ts, frontend/src/components/lms/StudentCourseView.tsx, frontend/src/components/lms/StudentCoursesView.tsx, context/PROJECT_TASKS.md, progress.md, context/CHANGELOG.md
Decisions:      Implemented lesson completion tracking and dynamic course progress calculation fulfilling acceptance criteria (Computed on read, never stored): Preserved strict invariant that Course and Lesson entities never persist completion counters or percentages in storage. Added LESSON_COMPLETIONS key in STORAGE_KEYS and built lessonCompletions.ts repository persisting atomic student completion events. Implemented getCourseProgress computing progress (fraction, percentage, totalLessons, completedLessons, isCompleted) on read by joining active course lessons with student completions. Built markLessonComplete, unmarkLessonComplete, and toggleLessonCompletion explicit student actions. Integrated progress indicator and Mark Complete toggle button into StudentCourseView, displaying completion checkmarks in the course syllabus playlist. Enhanced StudentCoursesView with batch progress calculation (getStudentCoursesWithProgress) and visual progress bars on course cards.
### TASK-061 — Student dashboard — today's tasks
Completed: 2026-09-10
Files added:    frontend/src/lib/repositories/studentDashboard.ts, frontend/src/components/lms/StudentDashboardView.tsx, frontend/src/app/student/dashboard/page.tsx, frontend/src/app/student/dashboard/__tests__/student-dashboard.test.ts
Files changed:  frontend/src/types/lms.ts, frontend/src/lib/repositories/index.ts, frontend/src/components/lms/index.ts, context/PROJECT_TASKS.md, progress.md, context/CHANGELOG.md
Decisions:      Implemented student learning dashboard with tasks grouped by subject fulfilling acceptance criteria (Grouped by subject): Built studentDashboard.ts repository aggregating enrolled courses with computed-on-read progress, determining next incomplete lessons to watch, and querying pending assignments without submissions. Built StudentDashboardView component featuring hero welcome banner, KPI metrics (tasks to complete, active courses, overall progress percentage), dedicated "Today's Tasks" section grouping pending tasks by subject with subject filter pills and direct links to lessons and assignments, and course cards overview rendering completed-lessons fractions. Created /student/dashboard App Router page guarded by RouteGuard matching ROUTE_STRUCTURE.md.
Incomplete:     none

### TASK-062 — Assignment creation and deadline
Completed: 2026-09-10
Files added:    frontend/src/components/lms/AssignmentModal.tsx, frontend/src/components/lms/AssignmentManager.tsx, frontend/src/app/teacher/courses/[id]/__tests__/assignment-creation.test.ts
Files changed:  frontend/src/types/lms.ts, frontend/src/lib/repositories/assignments.ts, frontend/src/components/lms/index.ts, frontend/src/app/teacher/courses/[id]/page.tsx, context/PROJECT_TASKS.md, progress.md, context/CHANGELOG.md
Decisions:      Implemented teacher assignment authoring with optional lesson link fulfilling acceptance criteria (Optional lesson link): Extended Assignment entity with optional lessonId and defined EnrichedAssignment with lessonTitle, submissionCount, lateCount, and missingCount. Enhanced assignments repository with strict validation for title, maxMarks, and valid ISO deadline datetime. Implemented optional lesson validation ensuring linked lessons belong to the assignment's course. Implemented getAssignmentsByCourse, getAssignmentsByLesson, and getEnrichedAssignments calculating submission counts and late/missing statuses dynamically against class student cohorts. Built AssignmentModal component supporting creation and editing with datetime-local picker, max marks input, and an accessible lesson selector offering "No linked lesson (Course-wide)" alongside syllabus units. Built AssignmentManager with KPI summary counters, deadline status badges (Upcoming, Due Today, Past Due), and Edit/Delete controls. Added tabbed navigation to /teacher/courses/[id] switching between "Syllabus & Lessons" and "Course Assignments".
Incomplete:     none

### TASK-063 — Student submission, late flagging
Completed: 2026-09-10
Files added:    frontend/src/components/lms/StudentAssignmentModal.tsx, frontend/src/lib/repositories/__tests__/submissions.test.ts
Files changed:  frontend/src/types/lms.ts, frontend/src/lib/repositories/submissions.ts, frontend/src/components/lms/StudentCourseView.tsx, frontend/src/components/lms/StudentDashboardView.tsx, frontend/src/components/lms/index.ts, context/PROJECT_TASKS.md, progress.md, context/CHANGELOG.md
Decisions:      Implemented student assignment submissions and late flagging fulfilling acceptance criteria (Text and filename; late clearly marked): Extended Submission entity with optional isLate and defined StudentAssignmentDetails interface. Implemented submitAssignment repository helper supporting text body, attached file name, or both; automatic timestamping; late evaluation against assignment deadline (isLate: true); and in-place resubmission replacing previous submissions. Built StudentAssignmentModal with submission forms, file attachment mock presets, deadline warnings, on-time and late badges, and previous answer display. Integrated submission capabilities into StudentCourseView under a Course Assignments tab and into StudentDashboardView for direct submission from Today's Tasks.
Incomplete:     none

### TASK-064 — Teacher grading and feedback
Completed: 2026-09-10
Files added:    frontend/src/components/lms/TeacherGradingModal.tsx, frontend/src/app/teacher/courses/[id]/__tests__/teacher-grading.test.ts
Files changed:  frontend/src/types/lms.ts, frontend/src/lib/repositories/submissions.ts, frontend/src/components/lms/AssignmentManager.tsx, frontend/src/components/lms/index.ts, context/PROJECT_TASKS.md, progress.md, context/CHANGELOG.md
Decisions:      Implemented teacher grading and feedback fulfilling acceptance criteria (Marks and written feedback): Defined TeacherSubmissionEvaluation type for student cohort evaluation status. Enhanced gradeSubmission in submissions repository with boundary enforcement against assignment maxMarks, non-negative validation, and timestamp recording. Implemented getAssignmentSubmissionsWithStudents to return the full class cohort with submitted text/file details, late flags, and grading statuses. Built TeacherGradingModal with KPI counters (Cohort, Submitted, Late, Graded, Missing), status filter tabs, student roster navigation, submitted content preview (text and files), numeric marks input, and feedback textarea. Integrated Review & Grade actions into AssignmentManager on teacher course view.
Incomplete:     none

### TASK-065 — Announcement composer and audience targeting
Completed: 2026-09-10
Files added:    frontend/src/components/communication/AnnouncementComposerModal.tsx, frontend/src/components/communication/AnnouncementsListView.tsx, frontend/src/components/communication/index.ts, frontend/src/app/admin/announcements/page.tsx, frontend/src/app/principal/announcements/page.tsx, frontend/src/app/admin/announcements/__tests__/announcement-composer.test.ts
Files changed:  frontend/src/types/communication.ts, frontend/src/lib/repositories/announcements.ts, context/PROJECT_TASKS.md, progress.md, context/CHANGELOG.md
Decisions:      Implemented announcement composer and audience targeting fulfilling acceptance criteria (School, campus or class): Extended communication types with EnrichedAnnouncement, AnnouncementStatus, and AnnouncementFilter. Enhanced announcements repository with strict validation for required titles/bodies, mandatory campusId for campus audience, mandatory campusId and classId for class audience, and valid date intervals (expiresAt > publishAt). Configured automatic WhatsApp mock log appending for published announcements with the template '{title}\n\n{body}\n— {campus}'. Built AnnouncementComposerModal with audience selector, dynamic scoping pickers, and datetime inputs. Built AnnouncementsListView with search, audience/status filters, aggregate view counts pill, and management actions. Added /admin/announcements and /principal/announcements routes.
Incomplete:     none

### TASK-066 — Parent and student announcement feed
Completed: 2026-09-10
Files added:    frontend/src/components/communication/AnnouncementDetailModal.tsx, frontend/src/components/communication/AnnouncementFeedView.tsx, frontend/src/app/parent/announcements/page.tsx, frontend/src/app/parent/announcements/__tests__/announcement-feed.test.ts
Files changed:  frontend/src/lib/repositories/announcements.ts, frontend/src/components/communication/index.ts, frontend/src/components/parent/ParentDashboardView.tsx, frontend/src/components/lms/StudentDashboardView.tsx, context/PROJECT_TASKS.md, progress.md, context/CHANGELOG.md
Decisions:      Implemented parent and student announcement feed fulfilling acceptance criteria (Aggregate view counts only): Enforced invariant that Announcement entity contains only an aggregate viewCount counter, never individual parent read records or unread checklists. Implemented getAudienceAnnouncements in the repository layer to filter active notices (publishAt <= now && expiresAt > now) and accurately scope by school, active child's campus, and active child's class. Built AnnouncementDetailModal displaying notice details, scope badge, and aggregate view count while triggering atomic view counter increments. Built AnnouncementFeedView with audience category filters and full notice modals. Created /parent/announcements route with multi-child switcher banner and integrated announcement feed widgets into ParentDashboardView and StudentDashboardView.
Incomplete:     none

### TASK-067 — Teacher–parent messaging threads
Completed: 2026-09-10
Files added:    frontend/src/components/communication/NewConversationModal.tsx, frontend/src/components/communication/MessageList.tsx, frontend/src/components/communication/MessageThread.tsx, frontend/src/components/communication/MessagingShell.tsx, frontend/src/app/teacher/messages/page.tsx, frontend/src/app/parent/messages/page.tsx, frontend/src/app/parent/messages/__tests__/messaging.test.ts
Files changed:  frontend/src/types/communication.ts, frontend/src/lib/repositories/messages.ts, frontend/src/components/communication/index.ts, frontend/src/components/parent/ParentDashboardView.tsx, context/PROJECT_TASKS.md, progress.md, context/CHANGELOG.md
Decisions:      Implemented teacher-parent messaging threads fulfilling acceptance criteria (Threaded, with read state): Extended communication types with MessageThreadSummary, EligibleRecipient, and DirectMessageInput. Implemented getThreadMessages, getConversationThreads (with computed unread counter and student/class context resolution), markThreadAsRead, sendDirectMessage (with validation and canonical thread IDs), and getEligibleRecipients (for role-based parent/teacher contact discovery) in messages repository. Built MessageThread featuring participant profile, student context, student safeguarding audit compliance notice (per FEATURE_SPECIFICATIONS.md §13), message bubbles with timestamps, read receipt indicators (Sent vs Read), and message composer. Built MessageList with search filtering, last message snippets, and unread badges. Built NewConversationModal for contact selection. Built MessagingShell coordinating thread state and read state updates. Added /teacher/messages and /parent/messages routes and integrated Teacher Chat into ParentDashboardView.
Incomplete:     none

### TASK-068 — Admin message audit view
Completed: 2026-09-10
Files added:    frontend/src/components/communication/MessageAuditView.tsx, frontend/src/app/admin/messages/page.tsx, frontend/src/app/principal/messages/page.tsx, frontend/src/app/admin/messages/__tests__/message-audit.test.ts
Files changed:  frontend/src/types/communication.ts, frontend/src/lib/repositories/messages.ts, frontend/src/components/communication/index.ts, frontend/src/components/shell/NavIcon.tsx, frontend/src/lib/navigation/nav-items.ts, context/PROJECT_TASKS.md, progress.md, context/CHANGELOG.md
Decisions:      Implemented admin message audit view fulfilling acceptance criteria (Visible in the UI, for safeguarding): Defined AuditThreadSummary, MessageAuditFilter, and MessageAuditStats in communication types. Enhanced messages repository with getAuditMessageThreads, aggregating threads across participants, resolving student context and campus names, computing safeguarding statistics (total threads, total messages, participating teachers, participating parents), and applying multi-facet search/campus/date filters. Built MessageAuditView component featuring a prominent safeguarding compliance banner, 4 KPI counters, filter controls, master-detail layout, participant metadata card, message audit log with sender tags, sent and read timestamps, and print/export controls. Added /admin/messages and /principal/messages routes with role guards and integrated Message Audit navigation items into ADMIN_NAV and PRINCIPAL_NAV.
Incomplete:     none

### TASK-069 — Notification centre
Completed: 2026-09-10
Files added:    frontend/src/components/communication/NotificationCentre.tsx, frontend/src/app/notifications/page.tsx, frontend/src/app/notifications/__tests__/notifications.test.ts
Files changed:  frontend/src/lib/repositories/notifications.ts, frontend/src/components/communication/index.ts, frontend/src/components/shell/TopBar.tsx, context/PROJECT_TASKS.md, progress.md, context/CHANGELOG.md
Decisions:      Implemented comprehensive Notification Centre fulfilling acceptance criteria (Read/unread): Added markAllNotificationsAsRead, markNotificationAsUnread, and getUnreadNotificationCount to the repository layer. Built full NotificationCentre component supporting read/unread toggling, category filtering (attendance, fee, homework, exam, announcement), individual mark as read/unread actions, delete/dismissal, and deep link navigation. Implemented NotificationBellTrigger in the TopBar featuring dynamic animated unread badge and dropdown popover preview. Created /notifications page guarded across all authenticated user roles.
Incomplete:     none

### TASK-070 — WhatsApp mock inbox and message log
Completed: 2026-09-10
Files added:    frontend/src/components/communication/WhatsAppPhoneView.tsx, frontend/src/components/communication/WhatsAppControlPanel.tsx, frontend/src/components/communication/WhatsAppMockShell.tsx, frontend/src/app/demo/whatsapp/page.tsx, frontend/src/app/demo/whatsapp/__tests__/whatsapp-mock.test.ts
Files changed:  frontend/src/lib/repositories/whatsappLog.ts, frontend/src/lib/repositories/assignments.ts, frontend/src/lib/repositories/exams.ts, frontend/src/components/ui/Toast.tsx, frontend/src/components/communication/index.ts, context/PROJECT_TASKS.md, progress.md, context/CHANGELOG.md
Decisions:      Implemented WhatsApp mock inbox and message log fulfilling acceptance criteria (All five templates; populated by real triggers): Created WHATSAPP_TEMPLATES registry specifying all 5 canonical templates matching exact specification strings and variables (Absence, Fee reminder, Homework, Announcement, Result published). Wired real triggers to attendance marking, fee defaulters reminders, assignment creation, announcement publication, and exam results publication. Built ultra-realistic WhatsAppPhoneView with smartphone chassis, dynamic island, status bar, authentic WhatsApp business branding, end-to-end encryption notice, conversation bubbles with read receipts, and parent view switcher. Built WhatsAppControlPanel with 4 KPI summary cards, interactive live trigger simulator for all 5 templates, multi-facet filter controls, and Meta WhatsApp Business compliance copy review inspector. Created /demo/whatsapp route and verified zero regressions across entire test suite. Milestone M9 is 100% complete.
### TASK-071 — Super admin network dashboard
Completed: 2026-09-11
Files added:    frontend/src/lib/repositories/networkDashboard.ts, frontend/src/components/dashboard/RecentActivityFeed.tsx, frontend/src/components/dashboard/SuperAdminDashboardView.tsx, frontend/src/app/super-admin/dashboard/page.tsx, frontend/src/app/super-admin/dashboard/__tests__/super-admin-dashboard.test.ts
Files changed:  frontend/src/components/dashboard/index.ts, context/PROJECT_TASKS.md, progress.md, context/CHANGELOG.md
Decisions:      Implemented the Super Admin Network Dashboard fulfilling acceptance criteria (Five stats plus recent activity): Computed 5 canonical stats (Schools, Campuses, Active Students, Teachers, Fee Collection This Month in PKR) on read with strictly zero fabrication. Built unified chronological Recent Activity Feed combining student admissions, fee voucher payments, daily attendance marked, exam results released, official announcements, and WhatsApp dispatches with category filters and pagination. Built interactive campus comparison mini-breakdown cards with progress bars and drill-down links to `/super-admin/campuses`. Added `/super-admin/dashboard` route with role/scope validation.
### TASK-072 — Campus comparison screen
Completed: 2026-09-11
Files added:    frontend/src/components/dashboard/CampusAttendanceBarChart.tsx, frontend/src/components/dashboard/CampusDrilldownDrawer.tsx, frontend/src/components/dashboard/CampusComparisonView.tsx, frontend/src/app/super-admin/campus-comparison/page.tsx, frontend/src/app/super-admin/campus-comparison/__tests__/campus-comparison.test.ts
Files changed:  frontend/src/lib/repositories/examResults.ts, frontend/src/lib/repositories/networkDashboard.ts, frontend/src/components/dashboard/index.ts, context/PROJECT_TASKS.md, progress.md, context/CHANGELOG.md
Decisions:      Implemented Differentiation Screen 1 (Campus Comparison Screen) fulfilling acceptance criteria (Sortable; chart; drill-down; only honest metrics): Computed Five Canonical Row Metrics (Students, Attendance Rate this month %, Fee Collection Rate %, Teachers, Average Exam Result %) strictly on read from canonical repositories. Built interactive CampusAttendanceBarChart with metric switcher tabs (Attendance, Fees, Exams, Enrollment) and target benchmark lines. Built sortable table with bidirectional column toggles (asc/desc) and indicators. Built CampusDrilldownDrawer with leadership cards, attendance reliability meters, fee efficiency breakdowns, and quick action links. Added CSV report export and search filtering at /super-admin/campus-comparison.
### TASK-073 — School admin dashboard
Completed: 2026-09-11
Files added:    frontend/src/lib/repositories/schoolAdminDashboard.ts, frontend/src/components/dashboard/SchoolAdminDashboardView.tsx, frontend/src/app/admin/dashboard/page.tsx, frontend/src/app/admin/dashboard/__tests__/school-admin-dashboard.test.ts
Files changed:  frontend/src/components/dashboard/index.ts, context/PROJECT_TASKS.md, progress.md, context/CHANGELOG.md
Decisions:      Implemented the School Admin Dashboard fulfilling acceptance criteria (Students, today's attendance, pending fees, upcoming exams): Computed 4 core pillars on read: 1. Active students enrollment (420), staffing ratio (12.4:1), gender breakdown (50/50), new admissions; 2. Daily attendance summary (91.7%) with unmarked registers warning identifying teacher and class names; 3. Fee collection efficiency (79%), total billed (PKR 24.8M), collected (PKR 19.5M), outstanding pending fees (PKR 5.3M), and overdue defaulters count; 4. Scheduled upcoming exams with dates, subjects, classes, and draft/published status. Added quick admin launch actions (+ Admit Student, Mark Register, Generate Invoices, Exam Manager). Created protected route /admin/dashboard.
### TASK-074 — Principal dashboard, campus-scoped
Completed: 2026-09-11
Files added:    frontend/src/components/dashboard/PrincipalDashboardView.tsx, frontend/src/app/principal/dashboard/page.tsx, frontend/src/app/principal/dashboard/__tests__/principal-dashboard.test.ts
Files changed:  frontend/src/components/dashboard/index.ts, context/PROJECT_TASKS.md, progress.md, context/CHANGELOG.md
Decisions:      Implemented Principal Dashboard strictly scoped to own campus fulfilling acceptance criteria (Own campus only): Used explicit campusId scoping via getSchoolAdminDashboardStats({ schoolId, campusId }) to guarantee complete isolation of student rosters, attendance days, fee invoices, examinations, and teachers. Displayed campus jurisdiction banner, unmarked class registers alert for this campus, campus fee recovery progress, and upcoming campus examinations. Added quick actions for campus principals (Attendance, Announcements, Messages) and created route /principal/dashboard.
Incomplete:     none

### TASK-075 — Parent dashboard
Completed: 2026-09-11
Files added:    frontend/src/lib/repositories/parentDashboard.ts, frontend/src/app/parent/dashboard/__tests__/parent-dashboard.test.ts
Files changed:  frontend/src/components/parent/ParentDashboardView.tsx, context/PROJECT_TASKS.md, progress.md, context/CHANGELOG.md
Decisions:      Implemented Parent Dashboard fulfilling all 4 acceptance criteria pillars per child (Attendance, homework, fees, next exam per child):
                1. Attendance: Term attendance rate %, verified days, present/absent counts, and latest daily status badge linking to /parent/attendance.
                2. Homework: Total pending assignments count, coursework titles, submission deadlines with days-remaining countdown and overdue warning.
                3. Fees: Prominent current balance in PKR with payment status, earliest unpaid invoice due date, total billed/scholarship/paid breakdown, and link to /parent/fees.
                4. Next Exam: Upcoming assessment title, subject name, exam date, term, max marks, and days-remaining countdown with link to /parent/results.
                5. Multi-Child Support: Family child switcher with active child indicator for parents with multiple enrolled students (e.g. Ayesha and Ahmed/Bilal).
Incomplete:     none

### TASK-076 — Student learning profile with teacher validation
Completed: 2026-09-11
Files added:    frontend/src/lib/repositories/learningProfiles.ts, frontend/src/components/teacher/ProposedNoteCard.tsx, frontend/src/components/teacher/LearningProfileView.tsx, frontend/src/app/teacher/students/[id]/profile/page.tsx, frontend/src/app/teacher/students/[id]/profile/__tests__/learning-profile.test.ts
Files changed:  frontend/src/lib/storage/keys.ts, frontend/src/components/teacher/index.ts, context/PROJECT_TASKS.md, progress.md, context/CHANGELOG.md
Decisions:      Implemented Student Learning Profile (Differentiation Screen 2) strictly adhering to acceptance criteria (Proposals pending until a teacher confirms; no auto-publish):
                1. Four Core Sections: Subject performance over time (sparkline progress trajectory per subject), Attendance trend for the year (monthly presence breakdown with downward trend warning), Assignment submission history (on-time, late, graded, and pending coursework tasks), and Strengths & Areas for Improvement.
                2. Teacher Validation Workflow: System synthesizes candidate notes from student metrics into a pending state. Teachers can Confirm (with attribution), Edit before confirming, or Dismiss candidate notes. Direct note authoring is also supported.
                3. Zero Auto-Publish: Queries from parent accounts strictly filter out pending and dismissed proposals; only teacher-confirmed notes are visible, complete with teacher attribution and confirmation date.
                4. View Mode Switcher: Teacher Validation mode vs Parent View simulation toggle provided on LearningProfileView.
### TASK-077 — Parent engagement outreach list
Completed: 2026-09-11
Files added:    frontend/src/lib/repositories/parentOutreach.ts, frontend/src/components/dashboard/LogOutreachCallModal.tsx, frontend/src/components/dashboard/EngagementOutreachList.tsx, frontend/src/app/admin/engagement/page.tsx, frontend/src/app/admin/engagement/__tests__/engagement-outreach.test.ts
Files changed:  frontend/src/lib/storage/keys.ts, frontend/src/components/dashboard/index.ts, context/PROJECT_TASKS.md, progress.md, context/CHANGELOG.md
Decisions:      Implemented Parent Engagement Outreach List (Differentiation Screen 3) strictly adhering to acceptance criteria (Prompt list with "log a call". No parent-visible score):
                1. School-Side Operational Prompt List: Admin-facing prompt list identifying families with communication gaps (e.g. unread notices, missed homework notifications, portal inactivity) sorted by inactivity gap (days since last activity, descending).
                2. Humane Design Invariant: Strictly excluded any numerical parent engagement score, percentage rating, or ranked scoreboard of parents, in compliance with FEATURE_SPECIFICATIONS.md §15 and PRODUCT_REQUIREMENTS.md §5.
                3. Log a Call Action: Interactive LogOutreachCallModal allowing administrators to record outreach calls (outcomes: spoke with parent, left voicemail, no answer, requested callback, wrong number), detailed notes, and follow-up reminders.
                4. Persistence & Audit Log: Outreach calls persist to sp:v1:outreachLogs and immediately reflect in the family's prompt row with date and caller attribution.
Incomplete:     none

### TASK-080 — Branding applied to portal, receipts, report cards
Completed: 2026-09-11
Files added:    frontend/src/components/providers/BrandingProvider.tsx
Files changed:  frontend/src/app/layout.tsx, frontend/src/app/login/page.tsx, frontend/src/components/communication/WhatsAppPhoneView.tsx, frontend/src/components/fees/PaymentReceiptModal.tsx, frontend/src/lib/repositories/announcements.ts
Decisions:      Injected CSS variables `--color-brand-700` and `--color-accent-700` dynamically via SSR and CSR inside `<BrandingProvider>`, enabling immediate Tailwind updates. Used Context API to provide `schoolName` and `formatCurrency` globally. Updated legacy hardcoded "ABC School Network" fallback for `login`, WhatsApp simulations, and receipts to use dynamic branding. Tests successfully passed.
Incomplete:     none

---

## Open questions

Things the agent found ambiguous or contradictory and did not resolve on its own. The PM answers these; the agent does not guess.

| # | Question | Raised at | Status |
|---|---|---|---|
| 1 | Should the prototype's Super Admin portal be shown to schools at all, given the architecture document excludes it from production Phase 1? | Setup | Open |
| 2 | Which grading scale should the seed use — is there a real school's scale available yet (Gate 0 decision D6)? | Setup | Open |
| 3 | Are the WhatsApp message templates in the parents' preferred language, and who approves the wording? | Setup | Open |

---

## Feedback from demos

Recorded after each session with a school. See DEMO_SCENARIOS.md.

| Date | School | Role observed | Observation | Action |
|---|---|---|---|---|
| | | | | |
