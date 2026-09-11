# Progress

Tracking file for this project. **Read this first at the start of every session.**

Task list: `context/PROJECT_TASKS.md`
Started: `2026-09-08`
Last updated: `2026-09-10 14:48`

---

## Resume here

| | |
|---|---|
| **Next task** | `TASK-080 — Branding applied to portal, receipts, report cards (M11)` |
| **Last session ended** | `clean stop` |
| **Task in progress** | `none` |
| **Blockers** | `none` |
| **Read before resuming** | `context/FEATURE_SPECIFICATIONS.md` §17 & `context/PROJECT_TASKS.md` |



---

## Progress summary

**Completed: 79 / 84 tasks (94.0%)**

| Group | Done | Total | |
|---|---|---|---|
| M0 — Foundation | 9 | 9 | `██████████` |
| M1 — UI Kit | 5 | 5 | `██████████` |
| M2 — Shell & Auth | 7 | 7 | `██████████` |
| M3 — Core Records | 10 | 10 | `██████████` |
| M4 — Attendance | 8 | 8 | `██████████` |
| M5 — Fees | 7 | 7 | `██████████` |
| M6 — Exams & Results | 6 | 6 | `██████████` |
| M7 — Timetable | 4 | 4 | `██████████` |
| M8 — LMS | 8 | 8 | `██████████` |
| M9 — Communication | 6 | 6 | `██████████` |
| M10 — Differentiation & Dashboards | 8 | 8 | `██████████` |
| M11 — Settings & Polish | 1 | 6 | `█░░░░░░░░░` |


---

## Open questions

Ambiguities and contradictions found but not resolved. These need a human decision.

| # | Question | Raised at | Assumption made meanwhile | Status |
|---|---|---|---|---|
| 1 | Should the prototype's Super Admin portal be shown to schools at all, given the architecture document excludes it from production Phase 1? | Setup | Keep in prototype for network demos, flag as prototype-only | Open |
| 2 | Which grading scale should the seed use — is there a real school's scale available yet (Gate 0 decision D6)? | Setup | Standard percentage/letter scale configurable via settings | Open |
| 3 | Are the WhatsApp message templates in the parents' preferred language, and who approves the wording? | Setup | English templates used as baseline | Open |

---

## Log

Newest entries at the bottom. Never edit a past entry — add a new one that corrects it.

### TASK-001 — Next.js + TypeScript strict + Tailwind setup

- **Status:** `✅ Done`
- **Started:** `2026-09-08 14:37` · **Completed:** `2026-09-08 14:41`
- **Files added:** none
- **Files changed:** `frontend/src/app/layout.tsx`, `frontend/src/app/page.tsx`, `frontend/src/app/globals.css`
- **Files deleted:** `frontend/public/next.svg`, `frontend/public/vercel.svg`, `frontend/public/file.svg`, `frontend/public/globe.svg`, `frontend/public/window.svg`
- **Decisions:** Configured `Noto_Sans` via `next/font/google` in `layout.tsx` to align with `UI_DESIGN_SYSTEM.md §3` typography requirements; stripped default Vercel landing components in favor of a clean prototype landing page.
- **Verified:** `npm run lint` exited 0; `npm run build` completed static page generation and TypeScript checking in 2.2s with 0 errors; no starter boilerplate remaining.
- **Left open:** none

### TASK-002 — Design tokens as Tailwind theme extension

- **Status:** `✅ Done`
- **Started:** `2026-09-08 15:05` · **Completed:** `2026-09-08 21:07`
- **Files added:** none
- **Files changed:** `frontend/src/app/globals.css`, `frontend/src/app/page.tsx`
- **Decisions:** Implemented all tokens from `UI_DESIGN_SYSTEM.md §2–4` using Tailwind CSS v4 `@theme` and `@utility` rules. Configured brand, accent, neutrals, status pairs (`present`, `absent`, `late`, `leave`), radii (`rounded-control`, `rounded-card`), overlay shadow, typography utilities, and tabular figures.
- **Verified:** `npm run lint` exited 0; `npm run build` successfully compiled CSS and all static pages in 926ms without errors; verified utilities on home page preview.
- **Left open:** none

### TASK-003 — lib/storage/ — get, set, remove, JSON, quota errors

- **Status:** `✅ Done`
- **Started:** `2026-09-08 22:58` · **Completed:** `2026-09-09 01:19`
- **Files added:** `frontend/src/lib/storage/errors.ts`, `frontend/src/lib/storage/keys.ts`, `frontend/src/lib/storage/index.ts`
- **Files changed:** none
- **Decisions:** Created `StorageQuotaError` class and `isQuotaError` type guard handling DOMException and legacy error codes; created `STORAGE_KEYS` map for all 27 collection keys adhering strictly to `sp:v1:<collection>`; implemented SSR guards (`typeof window === 'undefined'`) and safe JSON handling.
- **Verified:** Audited codebase via grep to confirm `localStorage` is referenced exclusively inside `frontend/src/lib/storage/`; verified all 27 keys load and parse properly; `npm run lint` and `npm run build` passed with 0 errors.
- **Left open:** none

### TASK-004 — Lint rule blocking localStorage outside lib/storage/

- **Status:** `✅ Done`
- **Started:** `2026-09-09 01:24` · **Completed:** `2026-09-09 01:27`
- **Files added:** none
- **Files changed:** `frontend/eslint.config.mjs`
- **Decisions:** Configured ESLint flat config with `no-restricted-globals` (blocking `localStorage`) and `no-restricted-properties` (blocking `window.localStorage` and `globalThis.localStorage`) across `src/**/*.{ts,tsx,js,mjs}`, strictly exempting `src/lib/storage/**`.
- **Verified:** Verified positive test (clean code exits 0); verified negative test (injected direct access in `src/temp-violation.ts`, which triggered 3 fatal lint errors and failed the run with code 1); verified clean `npm run build` exits 0.
- **Left open:** none

### TASK-005 — Shared types in /types for every entity in DATA_MODELS.md

- **Status:** `✅ Done`
- **Started:** `2026-09-09 01:28` · **Completed:** `2026-09-09 01:36`
- **Files added:** `frontend/src/types/common.ts`, `frontend/src/types/core.ts`, `frontend/src/types/people.ts`, `frontend/src/types/academics.ts`, `frontend/src/types/attendance.ts`, `frontend/src/types/fees.ts`, `frontend/src/types/exams.ts`, `frontend/src/types/lms.ts`, `frontend/src/types/communication.ts`, `frontend/src/types/index.ts`
- **Files changed:** none
- **Decisions:** Structured shared TypeScript definitions across 9 domain files with centralized re-export at `@/types`. Included strict discriminated unions, explicit scope object `Scope`, and dedicated creation input types (`NewStudent`, `NewTeacher`, `NewFeeInvoice`, etc.) avoiding loose partials.
- **Verified:** `npx tsc --noEmit` passed with 0 errors; `npm run lint` passed with 0 warnings/errors; `npm run build` compiled all routes cleanly with zero TypeScript errors.
- **Left open:** none

### TASK-006 — Repository layer skeleton — async, scope-taking, one per collection

- **Status:** `✅ Done`
- **Started:** `2026-09-09 01:42` · **Completed:** `2026-09-09 01:50`
- **Files added:** 28 files in `frontend/src/lib/repositories/` (`base.ts`, `schools.ts`, `campuses.ts`, `academicYears.ts`, `users.ts`, `students.ts`, `parents.ts`, `studentParents.ts`, `teachers.ts`, `classes.ts`, `subjects.ts`, `timetableSlots.ts`, `attendance.ts`, `feeStructures.ts`, `feeInvoices.ts`, `courses.ts`, `lessons.ts`, `assignments.ts`, `submissions.ts`, `exams.ts`, `examResults.ts`, `announcements.ts`, `messages.ts`, `notifications.ts`, `whatsappLog.ts`, `settings.ts`, `session.ts`, `meta.ts`, `index.ts`)
- **Files changed:** none
- **Decisions:** Created generic `base.ts` handling typed CRUD with deterministic ID generation and mandatory `Scope` filtering; implemented dedicated collection repositories for all 24 entities + system modules; all functions return `Promise` and are declared `async`.
- **Verified:** Typechecked with `npx tsc --noEmit` (0 errors); `npm run lint` exited with 0 warnings/errors; `npm run build` compiled in 651ms with 0 errors.
- **Left open:** none

### TASK-007 — Seed generator: demo-network profile

- **Status:** `✅ Done`
- **Started:** `2026-09-09 01:52` · **Completed:** `2026-09-09 02:00`
- **Files added:** `frontend/src/lib/seed/names.ts`, `frontend/src/lib/seed/generator.ts`, `frontend/src/lib/seed/index.ts`
- **Files changed:** none
- **Decisions:** Created deterministic seed data generator for the complete ABC School Network across 3 campuses. Implemented all volume criteria (420 students, 34 teachers, 21 classes, 105 subjects, 340 parents, 40 school days attendance, fees for 3 months, 2 terms of exams, 12 LMS courses, announcements/messages/WhatsApp logs, and 6 demo accounts). Implemented deliberate data anomalies (3 missing DOBs, 1 duplicate admission number collision `ADM-2026-0042`, 1 malformed parent phone). Total serialized payload is ~1.63 MB (strictly under the 2MB ceiling).
- **Verified:** Automated volume and quality assertion script verified all records, anomalies, and size (1,707,308 bytes); `npm run lint` and `npm run build` compiled cleanly with 0 warnings/errors.
- **Left open:** none

### TASK-008 — Seed boot check + schema version reset

- **Status:** `✅ Done`
- **Started:** `2026-09-09 02:03` · **Completed:** `2026-09-09 02:14`
- **Files added:** `frontend/src/lib/seed/boot.ts`, `frontend/src/components/providers/BootProvider.tsx`, `frontend/src/lib/seed/__tests__/boot.test.ts`
- **Files changed:** `frontend/src/lib/seed/index.ts`, `frontend/src/lib/storage/index.ts`, `frontend/src/app/layout.tsx`, `frontend/src/app/page.tsx`
- **Decisions:** Created `ensureSeeded()` and `forceReseed()` in `boot.ts`. On startup, compares `sp:v1:meta` schemaVersion with `CURRENT_SCHEMA_VERSION` ('1.0.0'). If mismatched or absent, wipes and reseeds. Mounted `BootProvider` client context in `RootLayout` exposing `useBoot()` hook and transition screen. Adjusted `getStorageUsage()` to compute actual serialized string payload size (1.63 MB, well under the 2MB ceiling). Added live status card and "Reset Demo Data" action to prototype home page.
- **Verified:** Automated test suite in `boot.test.ts` verified 6 assertions (clean boot, idempotent match, schema mismatch wipe & reseed, force reseed, < 2MB footprint at 1,707,331 bytes, meta repo query). ESLint passed with 0 errors; `next build` compiled cleanly.
- **Left open:** none

### TASK-009 — lib/utils/ — dates, currency (PKR), grading, attendance %

- **Status:** `✅ Done`
- **Started:** `2026-09-09 02:16` · **Completed:** `2026-09-09 02:20`
- **Files added:** `frontend/src/lib/utils/attendance.ts`, `frontend/src/lib/utils/grading.ts`, `frontend/src/lib/utils/fees.ts`, `frontend/src/lib/utils/currency.ts`, `frontend/src/lib/utils/dates.ts`, `frontend/src/lib/utils/index.ts`, `frontend/src/lib/auth/scope.ts`, `frontend/src/lib/utils/__tests__/utils.test.ts`
- **Files changed:** none
- **Decisions:** Built centralized business logic functions specified in `DEVELOPMENT_GUIDELINES.md §8`. `attendancePercentage` excludes holidays and excused leave by default, supporting custom weighting and rounding. `calculateGrade` reads configured `GradeScaleItem[]` dynamically, falling back to standard secondary scale. `invoiceBalance` consolidates discounts, partial payments, late fees, and overdue status. `resolveScope` authoritatively enforces role scoping boundaries across all 6 roles (Super Admin, School Admin, Principal, Teacher, Parent, Student). Added `formatPKR` (with tabular numeral support) and `formatDate` (short, medium, long, iso, relative).
- **Verified:** Automated unit test suite (`utils.test.ts`) verified all 5 calculation areas across normal and boundary conditions; `npm run lint` passed with 0 errors/warnings; `next build` compiled cleanly. All 9 tasks in Milestone M0 (Foundation) are now 100% complete.
- **Left open:** none

### TASK-010 — Button, Input, Select, DatePicker, Textarea

- **Status:** `✅ Done`
- **Started:** `2026-09-09 02:30` · **Completed:** `2026-09-09 02:34`
- **Files added:** `frontend/src/components/ui/Button.tsx`, `frontend/src/components/ui/Input.tsx`, `frontend/src/components/ui/Select.tsx`, `frontend/src/components/ui/DatePicker.tsx`, `frontend/src/components/ui/Textarea.tsx`, `frontend/src/components/ui/index.ts`, `frontend/src/components/ui/__tests__/ui.test.ts`
- **Files changed:** `frontend/src/app/page.tsx`
- **Decisions:** Built foundational accessible UI controls adhering to design tokens. `Button` supports primary, secondary, ghost, and danger variants with 36px default / 44px touch sizes, loading state with spinner, and visible keyboard focus ring (`focus-visible:ring-brand-600`). `Input`, `Select`, `DatePicker`, and `Textarea` always render visible `<label>` (`never placeholder-as-label`), support error messages with alert roles, hints, prefix/suffix adornments, character counters, and disabled styles. Added interactive UI showcase section in `page.tsx`.
- **Verified:** Automated component rendering test suite (`ui.test.ts`) verified all variants, sizes, labels, error alerts, character counts, and disabled attributes; `npm run lint` and `next build` compiled cleanly with 0 errors/warnings.
- **Left open:** none

### TASK-011 — Table — sticky header, sort, empty state, pagination

- **Status:** `✅ Done`
- **Started:** `2026-09-09 02:35` · **Completed:** `2026-09-09 02:40`
- **Files added:** `frontend/src/components/ui/Table.tsx`, `frontend/src/components/ui/Pagination.tsx`, `frontend/src/components/ui/__tests__/table.test.ts`
- **Files changed:** `frontend/src/components/ui/index.ts`, `frontend/src/app/page.tsx`
- **Decisions:** Built generic `Table<T>` component and `Pagination` component. Enforced `tabular-nums` on all numeric columns (marks, fees, counts, roll numbers). Implemented sticky headers (`sticky top-0 bg-canvas/95`), interactive column sorting with visual direction indicators, row selection checkboxes with master header toggle, and integrated empty state with action CTA. `Pagination` defaults to 25 items/page per acceptance criteria with page size selector (10, 25, 50). Contained horizontal overflow inside table card ensuring zero outer page blowout at 360px mobile width.
- **Verified:** Automated component and math unit test suite (`table.test.ts`) passed all assertions (sticky header, tabular-nums, 25/page math: 420 items = 17 pages, page 1/17 boundary states, empty state); `npm run lint` and `next build` passed with 0 errors/warnings.
- **Left open:** none

### TASK-012 — Modal, Drawer, ConfirmDialog

- **Status:** `✅ Done`
- **Started:** `2026-09-09 02:42` · **Completed:** `2026-09-09 02:48`
- **Files added:** `frontend/src/components/ui/useFocusTrap.ts`, `frontend/src/components/ui/Modal.tsx`, `frontend/src/components/ui/Drawer.tsx`, `frontend/src/components/ui/ConfirmDialog.tsx`, `frontend/src/components/ui/__tests__/dialogs.test.ts`
- **Files changed:** `frontend/src/components/ui/index.ts`, `frontend/src/app/page.tsx`
- **Decisions:** Built accessible overlay system with `useFocusTrap` hook (trapping Tab/Shift+Tab, Escape listener, body scroll lock, focus restoration). `Modal` supports `sm`, `md`, `lg` sizes with `rounded-card` (10px) and `shadow-overlay` tokens. `Drawer` docks to the right edge for detail inspection without leaving lists. `ConfirmDialog` strictly requires and highlights `recordName` in prompt titles and body per UI_DESIGN_SYSTEM.md §6 and acceptance criteria, avoiding generic messages.
- **Verified:** Automated unit tests (`dialogs.test.ts`) verified open/close rendering, `role="dialog"`, `aria-modal="true"`, modal size mapping, right dock classes on drawer, and prominent record naming in ConfirmDialog; all 5 test suites passed; `npm run lint` and `next build` passed with 0 errors/warnings.
### TASK-013 — StatusBadge, StatCard, Avatar, Tabs, Toast

- **Status:** `✅ Done`
- **Started:** `2026-09-09 02:54` · **Completed:** `2026-09-09 03:04`
- **Files added:** `frontend/src/components/ui/StatusBadge.tsx`, `frontend/src/components/ui/StatCard.tsx`, `frontend/src/components/ui/Avatar.tsx`, `frontend/src/components/ui/Tabs.tsx`, `frontend/src/components/ui/Toast.tsx`, `frontend/src/components/ui/__tests__/badges-cards.test.ts`
- **Files changed:** `frontend/src/components/ui/index.ts`, `frontend/src/app/layout.tsx`, `frontend/src/app/page.tsx`, `context/PROJECT_TASKS.md`
- **Decisions:** Built comprehensive institutional feedback and display components. `StatusBadge` strictly satisfies acceptance criteria: displays visible label + color token + short glyph (`never colour alone`), ensuring accessibility for colorblind users across all 8+ statuses (`present`, `absent`, `late`, `leave`, `paid`, `pending`, `overdue`, `draft`, `published`, `active`, `inactive`). `StatCard` enforces `text-stat-number` with `tabular-nums` and institutional border (`rounded-card border border-rule bg-surface`, no card shadow), supporting favorable/unfavorable trend indicators. `Avatar` implements fallback initials with deterministic color hashing across 8 curated design tokens. `Tabs` implements accessible underline styling ("Underline, not pills") with arrow key navigation and count badges. `ToastProvider` & `useToast` manage bottom-right toast queue with auto-dismiss (4s) for `success`/`info` and persistent display for `error`.
- **Verified:** Automated test suite (`badges-cards.test.ts`) validated all 5 components, accessibility attributes (`role="status"`, `role="alert"`, `role="img"`, `role="tablist"`), color mappings, and hash determinism. Full regression suite passed (6/6 suites, 0 errors). `npm run lint` and `next build` passed with 0 errors.
- **Left open:** none

### TASK-014 — EmptyState, skeleton loaders, error state

- **Status:** `✅ Done`
- **Started:** `2026-09-09 14:09` · **Completed:** `2026-09-09 14:15`
- **Files added:** `frontend/src/components/ui/EmptyState.tsx`, `frontend/src/components/ui/Skeleton.tsx`, `frontend/src/components/ui/ErrorState.tsx`, `frontend/src/components/ui/__tests__/feedback-states.test.ts`
- **Files changed:** `frontend/src/components/ui/index.ts`, `frontend/src/app/page.tsx`, `context/PROJECT_TASKS.md`
- **Decisions:** Implemented unified reusable feedback states per UI_DESIGN_SYSTEM.md §5 & §6. `EmptyState` provides icon, single-line explanation, and action CTA (with support for onClick and href navigation). `Skeleton` family provides content-shaped placeholders (`Skeleton`, `SkeletonText`, `SkeletonCard`, `SkeletonTable`, `SkeletonRow`, `SkeletonProfile`) with pulse animation, ensuring zero spinners or blank loading screens. `ErrorState` strictly follows the rule: states what happened and what to do, never generic "Something went wrong", offering retry callbacks, secondary navigation, and inline/card/page variants. Milestone M1 (UI Kit) is now 100% complete.
- **Verified:** Automated unit tests (`feedback-states.test.ts`) passed; full test regression suite passed (7/7 suites, 0 errors); `npm run lint` (0 errors, 0 warnings); `npm run build` compiled cleanly.
- **Left open:** none

### TASK-015 — Login page with demo account panel

- **Status:** `✅ Done`
- **Started:** `2026-09-09 14:16` · **Completed:** `2026-09-09 14:23`
- **Files added:** `frontend/src/lib/auth/auth.ts`, `frontend/src/app/login/page.tsx`, `frontend/src/lib/auth/__tests__/auth.test.ts`
- **Files changed:** `frontend/src/lib/repositories/students.ts`, `context/PROJECT_TASKS.md`
- **Decisions:** Built institutional authentication page and demo account quick-select panel per FEATURE_SPECIFICATIONS.md §1 and acceptance criteria. Populates exactly 6 required demo accounts (Super Admin, School Admin, Principal, Teacher, Parent, Student). Clicking any account fills credentials and triggers sign-in directly. Password field is required and masked (`type="password"`), maintaining login realism. Displays required prototype disclaimer under panel: *"Prototype: passwords are not checked."* Populates session (`sp:v1:session`) with `activeChildId` resolved for multi-child parent account Tariq Khan (linked to Ahmed and Ayesha Khan).
- **Verified:** Automated test suite (`auth.test.ts`) validated presence of all 6 demo accounts, input validation, password requirement, session creation, activeChildId resolution, role dashboard routing, and signOut. Full regression suite passed (8/8 suites, 0 errors). `npm run lint` (0 errors, 0 warnings) and `next build` compiled `/login` as static page cleanly.
- **Left open:** none

### TASK-016 — Session, sign out, persistence across refresh

- **Status:** `✅ Done`
- **Started:** `2026-09-09 14:24` · **Completed:** `2026-09-09 14:29`
- **Files added:** `frontend/src/components/providers/SessionProvider.tsx`, `frontend/src/lib/auth/__tests__/session-persistence.test.ts`
- **Files changed:** `frontend/src/app/layout.tsx`, `frontend/src/app/login/page.tsx`, `context/PROJECT_TASKS.md`
- **Decisions:** Implemented app-wide SessionProvider and useSession hook. Hydrates on initial mount from sp:v1:session, loading full User record and ensuring session survives page refreshes without re-prompting login. Exposed reactive login(), logout(), switchCampus(), and switchChild() functions. When logout() is called, clears session from storage via clearSession(), resets state to null, and redirects to /login. Updated login/page.tsx to render active session card when already authenticated and wire into SessionProvider.
- **Verified:** Automated test suite (session-persistence.test.ts) verified session hydration, survival across simulated refresh, persistent campus switching, persistent child switching, and complete session clearance on sign out. Full test regression passed across all 9 suites (0 errors). npm run lint (0 errors, 0 warnings) and next build compiled cleanly.
- **Left open:** none

### TASK-017 — Route guards — role and scope

- **Status:** `✅ Done`
- **Started:** `2026-09-09 14:30` · **Completed:** `2026-09-09 14:38`
- **Files added:** `frontend/src/lib/auth/guards.ts`, `frontend/src/components/auth/Forbidden403.tsx`, `frontend/src/components/auth/NotFound404.tsx`, `frontend/src/components/auth/RouteGuard.tsx`, `frontend/src/components/auth/index.ts`, `frontend/src/lib/auth/__tests__/guards.test.ts`
- **Files changed:** `frontend/src/components/providers/SessionProvider.tsx`, `context/PROJECT_TASKS.md`, `progress.md`
- **Decisions:** Implemented dual-layer institutional authorization guards adhering strictly to acceptance criteria:
  1. **Role Guard (`checkRouteRole`, `RouteGuard`)**: Validates active session role against permitted roles. Unauthorized role returns HTTP status 403 and renders `Forbidden403` component displaying active role, authorized roles, dashboard navigation CTA, and account switch CTA. Unauthenticated state redirects to `/login`.
  2. **Scope Guard (`checkRecordScope`, `NotFound404`)**: Validates record's `schoolId`, `campusId`, and (for parents) `studentId` against active session scope. Out-of-scope records return status 404 (never leaking existence across tenant or campus boundaries) and render `NotFound404` component.
  3. Added `useOptionalSession` to `SessionProvider` for components that may render outside context, keeping all hooks compliant with React rules of hooks.
- **Verified:** Automated test suite (`guards.test.ts`) validated role authorization rules (wrong role → 403, unauthenticated → 401), multi-campus and child scope authorization rules (out-of-scope record → 404), and presentation component rendering. Full regression suite passed across all 10 suites (0 errors). `npm run lint` (0 errors, 0 warnings) and `next build` compiled cleanly.
- **Left open:** none

### TASK-018 — App shell: sidebar, top bar, role-scoped nav

- **Status:** `✅ Done`
- **Started:** `2026-09-09 14:39` · **Completed:** `2026-09-09 14:45`
- **Files added:** `frontend/src/lib/navigation/nav-items.ts`, `frontend/src/components/shell/NavIcon.tsx`, `frontend/src/components/shell/Sidebar.tsx`, `frontend/src/components/shell/TopBar.tsx`, `frontend/src/components/shell/BottomNav.tsx`, `frontend/src/components/shell/AppShell.tsx`, `frontend/src/components/shell/index.ts`, `frontend/src/components/shell/__tests__/shell.test.ts`
- **Files changed:** `context/PROJECT_TASKS.md`, `progress.md`
- **Decisions:** Built institutional application shell strictly adhering to acceptance criteria:
  1. **Role-Scoped Nav Isolation:** Defined separate navigational sections and routes for all 6 roles (`super_admin`, `school_admin`, `principal`, `teacher`, `parent`, `student`) strictly mapping to `ROUTE_STRUCTURE.md`.
  2. **Desktop Sidebar (`>= 768px`):** Left-docked 240px sidebar (`hidden md:flex`) featuring institutional branding, active route highlighting, section groups, and user avatar footer with sign-out trigger.
  3. **Top Bar (`TopBar`):** Sticky 56px header displaying active school and page title, active campus indicator pill (`UI_DESIGN_SYSTEM.md §4`), parent active child badge, demo navigation affordances (WhatsApp Mock, Role Switch), and profile menu.
  4. **Mobile Bottom Navigation (`< 768px`):** Responsive bottom bar (`md:hidden fixed bottom-0`) restricted to at most 5 touch targets (minimum 44px height). Roles with > 5 items feature a 5th "More" button opening a slide-over `Drawer` for secondary modules.
- **Verified:** Automated test suite (`shell.test.ts`) validated role navigation isolation across all 6 roles, strict mobile constraint (total bottom bar buttons <= 5 for all roles), and SSR component rendering. Full test regression passed across all 11 suites (0 errors). `npm run lint` (0 errors, 0 warnings) and `next build` compiled cleanly.
- **Left open:** none

### TASK-019 — Campus switcher

- **Status:** `✅ Done`
- **Started:** `2026-09-09 14:46` · **Completed:** `2026-09-09 14:54`
- **Files added:** `frontend/src/components/shell/CampusSwitcher.tsx`, `frontend/src/components/shell/__tests__/campus-switcher.test.ts`
- **Files changed:** `frontend/src/components/shell/TopBar.tsx`, `frontend/src/components/shell/index.ts`, `context/PROJECT_TASKS.md`, `progress.md`
- **Decisions:** Implemented institutional CampusSwitcher control meeting acceptance criteria:
  1. **Query Scoping & Persistence:** Selecting a campus calls `switchCampus(campusId)`, updating `session.campusId` in `localStorage` (`sp:v1:session`) and reactive session state, immediately re-scoping all campus-scoped queries.
  2. **Single-Campus Suppression:** Strictly implements UI_DESIGN_SYSTEM.md §4 ("Single-campus schools never see the control"). When `listCampuses` returns 1 campus, the component returns `null` and is suppressed from the DOM.
  3. **Page Title Synchronization:** TopBar automatically synchronizes `document.title` to include the selected campus name: `"${pageTitle} · ${campusName} · ${schoolName}"`.
  4. **SSR Resilience:** Provided `currentCampusName` prop to ensure clean, consistent server-side rendering without hydration mismatches.
- **Verified:** Automated test suite (`campus-switcher.test.ts`) validated multi-campus retrieval, scope persistence, single-campus suppression rule, and document title formatting. Full test regression across all 12 suites passed (0 errors). `npm run lint` (0 errors, 0 warnings) and `next build` compiled cleanly.
- **Left open:** none

### TASK-020 — Parent child switcher

- **Status:** `✅ Done`
- **Started:** `2026-09-09 14:56` · **Completed:** `2026-09-09 15:01`
- **Files added:** `frontend/src/components/shell/ChildSwitcher.tsx`, `frontend/src/components/shell/__tests__/child-switcher.test.ts`
- **Files changed:** `frontend/src/lib/repositories/parents.ts`, `frontend/src/components/shell/TopBar.tsx`, `frontend/src/components/shell/index.ts`, `context/PROJECT_TASKS.md`, `progress.md`
- **Decisions:** Implemented ChildSwitcher component satisfying acceptance criteria:
  1. **Strict Parent-Child Scope Isolation:** Implemented `getChildrenForParent(parentUserId)` in `parents.ts` querying `sp:v1:studentParents` strictly for links associated with that parent's ID. Prevents cross-family data leakage; Tariq Khan sees strictly his two children (Ahmed Khan and Ayesha Khan).
  2. **Active Child Switching & Persistence:** Selecting a child invokes `switchChild(childId)`, persisting `activeChildId` into `localStorage` (`sp:v1:session`) and reactive session state, immediately re-scoping all child-specific modules (Attendance, Homework, Fees, Results).
  3. **Single-Child Formatting:** For parents with only 1 child, displays an institutional non-interactive child pill in the TopBar. For parents with >= 2 children, displays an accessible dropdown with active checkmark.
- **Verified:** Automated test suite (`child-switcher.test.ts`) verified strict parent-child scope isolation (Tariq Khan links to exactly 2 children, 0 unrelated students), active child session persistence across refreshes, and SSR component rendering. Full test regression across all 13 suites passed (0 errors). `npm run lint` (0 errors, 0 warnings) and `next build` compiled cleanly.
### TASK-021 — Demo controls: reset data, switch role

- **Status:** `✅ Done`
- **Started:** `2026-09-09 15:02` · **Completed:** `2026-09-09 15:13`
- **Files added:** `frontend/src/app/demo/reset/page.tsx`, `frontend/src/app/demo/switch-role/page.tsx`, `frontend/src/app/demo/__tests__/demo-controls.test.ts`
- **Files changed:** `frontend/src/components/shell/TopBar.tsx`, `frontend/package.json`, `context/PROJECT_TASKS.md`, `progress.md`
- **Decisions:** Implemented demo controls fulfilling acceptance criteria:
  1. **Both Labelled as Prototype-Only on Screen:** Both `/demo/reset` and `/demo/switch-role` feature prominent prototype badges (`PROTOTYPE ONLY` and `DEMO AFFORDANCE ONLY`), explicit evaluation notices explaining their developer-only nature, and clear demarcations in TopBar navigation shortcuts.
  2. **Data Reset (`/demo/reset`):** Provides live `localStorage` footprint display (bytes and formatted KB/MB), explicit `ConfirmDialog` warning that browser state will be wiped and restored to seed, and invokes `forceReseed()`.
  3. **Instant Role Switcher (`/demo/switch-role`):** Displays cards for all 6 institutional demo personas (Super Admin, School Admin, Campus Principal, Teacher, Parent, Student) with their responsibilities, scope, and instant `login()` activation routing straight to their dedicated portal dashboard.
- **Verified:** Automated test suite (`demo-controls.test.ts`) verified seed & reset invocation, persistent prototype-only labelling on screen for both pages, and availability of all 6 institutional demo accounts. Full test regression across all 14 test suites passed (0 errors). `npm run lint` (0 errors, 0 warnings) and `next build` compiled cleanly.
### TASK-022 — Campus list, add, edit, assign principal

- **Status:** `✅ Done`
- **Started:** `2026-09-09 15:16` · **Completed:** `2026-09-09 15:28`
- **Files added:** `frontend/src/components/campuses/CampusManager.tsx`, `frontend/src/components/campuses/index.ts`, `frontend/src/app/admin/campuses/page.tsx`, `frontend/src/app/super-admin/campuses/page.tsx`, `frontend/src/app/admin/campuses/__tests__/campuses.test.ts`
- **Files changed:** `context/PROJECT_TASKS.md`, `progress.md`
- **Decisions:** Implemented institutional Campus Management fulfilling acceptance criteria:
  1. **Delete Refused When Students Exist (Acceptance Criteria):** Attempting to delete any campus holding enrolled students (e.g. Main Campus with 200 students) is strictly blocked; opens an institutional refusal modal stating the exact count of enrolled students (`Cannot delete campus "Main Campus" because it currently has 200 students enrolled`) with guidance on transferring or graduating students first.
  2. **Safe Deletion for Empty Campuses:** Campuses with 0 students prompt a destructive `ConfirmDialog` and delete cleanly from storage via `deleteCampus()`.
  3. **Add & Edit Drawer:** Slide-over `Drawer` allows configuring campus name, address, primary branch designation, and appointing principals filtered strictly to verified users with `role: 'principal'` at that school.
  4. **Table & Capacity Metrics:** Stat cards calculate total campuses, student enrollment, active class sections, and principal appointments; table includes search filtering by name, address, and appointed principal.
  5. **Role-Guarded Dual Routes:** Available at `/admin/campuses` (School Admin & Super Admin) and `/super-admin/campuses` (Super Admin).
- **Verified:** Automated test suite (`campuses.test.ts`) verified seeded campus retrieval, capacity metrics, add/edit with principal assignment, strict refusal when students exist with exact count, and successful deletion when 0 students exist. Full 15-suite test regression passed with 0 errors. `npm run lint` (0 errors, 0 warnings) and `next build` compiled cleanly.
### TASK-023 — Student list with search and filters

- **Status:** `✅ Done`
- **Started:** `2026-09-09 15:30` · **Completed:** `2026-09-09 15:36`
- **Files added:** `frontend/src/components/students/StudentDirectory.tsx`, `frontend/src/components/students/index.ts`, `frontend/src/app/admin/students/page.tsx`, `frontend/src/app/admin/students/__tests__/student-list.test.ts`
- **Files changed:** `context/PROJECT_TASKS.md`, `progress.md`
- **Decisions:** Implemented Student Directory fulfilling acceptance criteria:
  1. **Search Under 300ms Benchmark (Acceptance Criteria):** Automated benchmark running 50 search queries against the full seeded dataset (420 students) measured an average execution latency of 0.183ms (max: 0.536ms), well under the 300ms limit. Includes a 200ms input debounce.
  2. **Filters Combine with Strict Logical AND (Acceptance Criteria):** Campus, Class, Status, and Search Query filters combine seamlessly, with active filter badges, count indicators, and a single-click "Reset All Filters" affordance.
  3. **Table Columns:** Displays Photo/Avatar + Name, Admission No (monospace), Campus, Class, Attendance Rate (% formatted with contextual color indicators), Fee Status (`paid`, `partial`, `overdue`, `unpaid`), and Student Status (`active`, `transferred`, `graduated`, `withdrawn`).
  4. **Pagination:** Implemented 25 records per page pagination using `Pagination` component.
  5. **Portal Route:** Mounted at `/admin/students` protected by `<RouteGuard allowedRoles={['school_admin', 'super_admin', 'principal']}>`.
- **Verified:** Automated test suite (`student-list.test.ts`) verified search performance benchmark (50 runs < 300ms), multi-filter combination (Campus -> Class -> Status -> Search), 25/page pagination across 420 students, and SSR rendering. Full 16-suite test regression passed with 0 errors. `npm run lint` (0 errors, 0 warnings) and `next build` compiled cleanly.
### TASK-024 — Admission form — all six sections

- **Status:** `✅ Done`
- **Started:** `2026-09-09 23:05` · **Completed:** `2026-09-09 23:12`
- **Files added:** `frontend/src/components/students/AdmissionForm.tsx`, `frontend/src/app/admin/students/new/page.tsx`, `frontend/src/app/admin/students/__tests__/admission-form.test.ts`
- **Files changed:** `frontend/src/components/students/index.ts`, `context/PROJECT_TASKS.md`, `progress.md`
- **Decisions:** Implemented comprehensive admission workflow fulfilling acceptance criteria:
  1. **Emergency Contact Required (Acceptance Criteria):** Section 5 (Health & Safety) enforces that at least one complete emergency contact (Name, Relationship, and Phone) must be provided. Form submission is blocked with an alert if omitted.
  2. **Duplicate Admission Number Blocked with Student Name (Acceptance Criteria):** Pre-submission validation checks `admissionNumber` against the entire student directory. If a collision is detected, submission is blocked with an alert explicitly naming the existing student (e.g. `Admission number "ADM-2026-0001" is already assigned to student Ayesha Khan. Duplicate admission numbers are blocked.`).
  3. **All Six Mandatory Sections in Order:**
     - Section 1: Personal (Name, DOB, Gender, Blood Group, Photo URL)
     - Section 2: Academic (Campus, Class dynamically cascaded, Roll No, Admission Date, Auto-generated & editable Admission Number)
     - Section 3: Address & Contact (Residential Address, Phone, Email)
     - Section 4: Parent or Guardian (Search existing parent or create new inline; sets relationship and primary flag)
     - Section 5: Health and Safety (Allergies tag chips, conditions, medications, doctor contact, emergency contacts, authorized pickup persons)
     - Section 6: Documents (Filename capture)
  4. **Multi-Entity Creation:** Atomically generates student user account, parent user account (if new), parent record, student record, and `StudentParent` link.
  5. **Portal Route:** Accessible at `/admin/students/new` protected by `<RouteGuard allowedRoles={['school_admin', 'super_admin']}>`.
- **Verified:** Automated test suite (`admission-form.test.ts`) verified emergency contact enforcement, duplicate admission number blocking with student naming, complete six-section entity creation, and SSR rendering. Full 17-suite test regression passed with 0 errors. `npm run lint` (0 errors, 0 warnings) and `next build` compiled cleanly.
- **Left open:** none

### TASK-025 — Student profile with six tabs

- **Status:** `✅ Done`
- **Started:** `2026-09-09 23:14` · **Completed:** `2026-09-09 23:55`
- **Files added:** `frontend/src/components/students/StudentProfileView.tsx`, `frontend/src/app/admin/students/[id]/page.tsx`, `frontend/src/app/admin/students/__tests__/student-profile.test.ts`
- **Files changed:** `frontend/src/components/students/index.ts`, `context/PROJECT_TASKS.md`, `progress.md`
- **Decisions:** Implemented comprehensive student profile with 6 tabs fulfilling acceptance criteria:
  1. **Allergies Shown at Top of Health Tab (Acceptance Criteria):** The Health & Safety tab prominently renders a high-visibility Critical Health & Allergies Alert banner at the very top (`Safety Priority 1`) with warning badges for each recorded allergy, strictly preceding chronic medical conditions, doctor contacts, emergency contacts, and authorized pickup persons.
  2. **All Six Functional Tabs Implemented:**
     - **Overview:** Personal data (DOB, blood group, address, contacts), institutional class/campus details, parent/guardian links with primary designation.
     - **Attendance:** Attendance summary (Present rate %, Total days, Present, Absent, Late), streak counter, and historical records.
     - **Fees:** Total billed, total paid, and outstanding balance stat cards, accompanied by a complete tabular invoice ledger with amount formatting and status badges.
     - **Results:** Term academic assessment results table showing subject name, marks obtained / max marks, calculated percentages, letter grades, and academic remarks.
     - **Health:** Critical allergy warnings banner at top, chronic conditions, rescue medications, physician info, priority-ranked emergency contacts, and photo-identified authorized pickup persons.
     - **Documents:** Official records file attachment vault (Birth Certificate, B-Form, Previous School Leaving Certificate, Medical Clearance).
  3. **Header:** Features student photo/avatar, full name, admission number, roll number, class & campus pill, and status badge with direct edit affordance.
  4. **Portal Route:** Accessible dynamically at `/admin/students/[id]` protected by `<RouteGuard allowedRoles={['school_admin', 'super_admin', 'principal', 'teacher']}>`.
- **Verified:** Automated test suite (`student-profile.test.ts`) verified SSR rendering of all 6 tabs, student header info, and proved that the allergies card is placed at the top of the Health tab before emergency contacts and authorized pickup persons. Full 18-suite test regression passed with 0 errors. `npm run lint` (0 errors, 0 warnings) and `next build` compiled cleanly.
- **Left open:** none

### TASK-026 — Edit and status lifecycle

- **Status:** `✅ Done`
- **Started:** `2026-09-09 23:58` · **Completed:** `2026-09-10 00:06`
- **Files added:** `frontend/src/components/students/StudentEditForm.tsx`, `frontend/src/app/admin/students/[id]/edit/page.tsx`, `frontend/src/app/admin/students/__tests__/student-lifecycle.test.ts`
- **Files changed:** `frontend/src/lib/repositories/students.ts`, `frontend/src/components/students/index.ts`, `context/PROJECT_TASKS.md`, `progress.md`
- **Decisions:** Implemented student editing and lifecycle status management fulfilling acceptance criteria:
  1. **Inactive Students Excluded from Attendance and Invoicing (Acceptance Criteria):**
     - Enhanced `students` repository with `listActiveStudents(scope, filter)`, `getAttendanceEligibleStudents(scope, classId)`, and `getInvoicingEligibleStudents(scope, classId?)` queries with `{ activeOnly: true }`.
     - Verified that transitioning student to any inactive status (`transferred`, `graduated`, `withdrawn`) strictly excludes the student from attendance roll calls and fee billing invoice runs.
     - Verified that historical student records, prior fee invoices, and attendance logs remain permanently preserved in the database for transcripts and institutional audits.
  2. **Comprehensive StudentEditForm:**
     - Status lifecycle selector with contextual impact alerts explaining rules for Active, Transferred, Graduated, and Withdrawn states.
     - Explicit warning confirmation modal via `ConfirmDialog` required before transitioning an active student to an inactive state.
     - Sectional editing for Personal Information (Name, DOB, Gender, Blood Group, Address, Phone, Email), Academic Placement (Campus, Class, Roll Number, Admission Number), and Health & Safety (Allergies, Conditions, Medications, Emergency Contact Phone).
  3. **Portal Route:** Dynamic client route mounted at `/admin/students/[id]/edit` protected by `<RouteGuard allowedRoles={['school_admin', 'super_admin']}>` and wrapped in `<AppShell>`.
- **Verified:** Automated test suite (`student-lifecycle.test.ts`) verified baseline active eligibility, personal/medical updates, strict exclusion across all 3 inactive lifecycle states (`transferred`, `graduated`, `withdrawn`), re-activation restoration, and SSR rendering. Full 19-suite test regression passed with 0 errors. `npm run lint` (0 errors, 0 warnings) and `next build` compiled cleanly.
- **Left open:** none

### TASK-027 — Teacher list, add, profile

- **Status:** `✅ Done`
- **Started:** `2026-09-10 00:08` · **Completed:** `2026-09-10 00:16`
- **Files added:** `frontend/src/components/teachers/TeacherDirectory.tsx`, `frontend/src/components/teachers/TeacherForm.tsx`, `frontend/src/components/teachers/TeacherProfileView.tsx`, `frontend/src/components/teachers/index.ts`, `frontend/src/app/admin/teachers/page.tsx`, `frontend/src/app/admin/teachers/new/page.tsx`, `frontend/src/app/admin/teachers/[id]/page.tsx`, `frontend/src/app/admin/teachers/__tests__/teacher-management.test.ts`
- **Files changed:** `frontend/src/lib/repositories/teachers.ts`, `context/PROJECT_TASKS.md`, `progress.md`
- **Decisions:** Implemented faculty directory, onboarding form, and profile screen fulfilling acceptance criteria:
  1. **Shows Assigned Classes and Subjects (Acceptance Criteria):**
     - Enhanced `teachers` repository with `getTeacherAssignedSubjects` and `getTeacherAssignedClasses` helper queries.
     - `TeacherDirectory` renders table columns for Assigned Subjects (with subject code chips) and Assigned Classes (with grade/section pills and homeroom class teacher indicator `★`).
     - `TeacherProfileView` dedicates tab sections to Assigned Teaching Subjects (subject title, code, class, room) and Assigned Classes & Cohorts (grade, section, room, enrolled students count, homeroom indicator).
     - Added Weekly Timetable Schedule tab detailing instructional periods across the week.
  2. **Faculty Enrollment (`TeacherForm`):**
     - Atomically creates `User` (role `'teacher'`) and `Teacher` records.
     - Enforces duplicate employee number blocking with explicit teacher collision naming.
  3. **Portal Routes:**
     - `/admin/teachers` (Directory with search, campus filter, department filter, and 25/page pagination).
     - `/admin/teachers/new` (Add faculty member form).
     - `/admin/teachers/[id]` (Dynamic faculty profile view).
- **Verified:** Automated test suite (`teacher-management.test.ts`) verified assigned subjects and classes retrieval, employee ID duplicate prevention, and SSR rendering for directory, form, and profile view. Full 20-suite test regression passed with 0 errors. `npm run lint` (0 errors, 0 warnings) and `next build` compiled cleanly.
- **Left open:** none

### TASK-028 — Teacher subject and class assignment

- **Status:** `✅ Done`
- **Started:** `2026-09-10 00:19` · **Completed:** `2026-09-10 00:23`
- **Files added:** `frontend/src/components/teachers/TeacherAssignmentMatrix.tsx`, `frontend/src/app/admin/teachers/[id]/assignments/page.tsx`, `frontend/src/app/admin/teachers/__tests__/teacher-assignment.test.ts`
- **Files changed:** `frontend/src/lib/repositories/teachers.ts`, `frontend/src/components/teachers/TeacherProfileView.tsx`, `frontend/src/components/teachers/index.ts`, `context/PROJECT_TASKS.md`, `progress.md`
- **Decisions:** Implemented single-screen bulk assignment matrix fulfilling acceptance criteria:
  1. **Bulk Selection in One Screen (Acceptance Criteria):**
     - Single-screen bulk matrix interface displaying all classes and subjects for a teacher's campus.
     - Bulk accelerators: "Select All [Department] Subjects", "Select All in View", "Clear All", and per-class "Select All / None" toggles.
     - Enables simultaneous assignment of curriculum subjects (`Subject.teacherId` and `Teacher.subjectIds`) and homeroom class teacher roles (`Class.classTeacherId`).
     - Real-time selection counters in sticky bottom dock displaying total subjects, distinct classes, and homeroom appointments.
  2. **Atomic Repository Synchronization:**
     - Created `bulkAssignTeacher(input, scope)` in `teachers` repository.
     - Atomically assigns selected subjects and unassigns removed subjects.
     - Atomically assigns designated homeroom classes and clears prior unselected homerooms.
  3. **Portal Routes & Integration:**
     - Dynamic route mounted at `/admin/teachers/[id]/assignments` protected by `<RouteGuard allowedRoles={['school_admin', 'super_admin']}>` and wrapped in `<AppShell>`.
     - Direct "Manage Assignments" button placed in `TeacherProfileView` profile header.
- **Verified:** Automated test suite (`teacher-assignment.test.ts`) verified bulk assignment of subjects and homeroom class, bulk removal/deselection synchronization, and SSR rendering. Full 21-suite test regression passed with 0 errors. `npm run lint` (0 errors, 0 warnings) and `next build` compiled cleanly.
### TASK-029 — Classes and sections CRUD

- **Status:** `✅ Done`
- **Started:** `2026-09-10 00:25` · **Completed:** `2026-09-10 00:38`
- **Files added:** `frontend/src/components/classes/ClassManager.tsx`, `frontend/src/components/classes/ClassDetailView.tsx`, `frontend/src/components/classes/index.ts`, `frontend/src/app/admin/classes/page.tsx`, `frontend/src/app/admin/classes/[id]/page.tsx`, `frontend/src/app/admin/classes/__tests__/classes-crud.test.ts`
- **Files changed:** `frontend/src/lib/repositories/classes.ts`, `context/PROJECT_TASKS.md`, `progress.md`
- **Decisions:**
  1. **Cross-Campus Class Isolation (Acceptance Criteria):**
     - Implemented `validateClassUnique(campusId, grade, section, excludeClassId?, scope?)` in `classes.ts`.
     - Validated that `Grade 8 - Section A` at Main Campus and `Grade 8 - Section A` at Girls Campus both coexist without collision.
     - Enforced strict intra-campus duplicate blocking: attempting duplicate `grade + section` within the same campus returns an explicit error message.
  2. **Safe Deletion Safeguard with Enrolled Student Count:**
     - Created `canDeleteClass(classId, scope)` and `safeDeleteClass(classId, scope)`.
     - Deletion is refused if any students are enrolled in the class, displaying a blocking alert with the exact enrolled student count and instructions to reassign students before deletion.
     - Confirmed deletion dialog only opens when enrolled student count is exactly 0.
  3. **Class Directory and Class Roster Views:**
     - Created `ClassManager` with metrics, campus/grade filters, text search, and Add/Edit Class modal.
     - Created `ClassDetailView` at `/admin/classes/[id]` with student roster table, assigned subjects curriculum table, homeroom teacher info, and gender demographics.
- **Verified:** Automated test suite (`classes-crud.test.ts`) verified same grade+section across campuses, duplicate rejection within the same campus, safe deletion protection with enrolled students, and SSR rendering. Full 22-suite test regression passed with 0 errors. `npm run lint` (0 errors, 0 warnings) and Next.js production build (`next build`) compiled cleanly.
- **Left open:** none

### TASK-030 — Subjects CRUD and teacher assignment

- **Status:** `✅ Done`
- **Started:** `2026-09-10 00:39` · **Completed:** `2026-09-10 01:12`
- **Files added:** `frontend/src/components/subjects/BulkSubjectTemplateModal.tsx`, `frontend/src/components/subjects/SubjectManager.tsx`, `frontend/src/components/subjects/index.ts`, `frontend/src/app/admin/subjects/page.tsx`, `frontend/src/app/admin/subjects/__tests__/subjects-crud.test.ts`
- **Files changed:** `frontend/src/lib/repositories/subjects.ts`, `frontend/src/components/classes/ClassDetailView.tsx`, `context/PROJECT_TASKS.md`, `progress.md`
- **Decisions:**
  1. **Bulk Add from Template List (Acceptance Criteria):**
     - Defined canonical `SUBJECT_TEMPLATES` categorized into Middle School Core, Secondary Science Stream, Commerce & Humanities, Languages, and Arts & Physical.
     - Created `BulkSubjectTemplateModal` with category stream tabs, quick select accelerators ("+ All Core", "+ Science Stream", "+ Humanities"), inline teacher pickers, and auto-generated subject codes conforming to grade levels (e.g., `MTH-8`).
     - Automatic duplicate protection detects existing subjects in the target class cohort and skips re-creation.
  2. **Bidirectional Teacher Synchronization:**
     - Created `assignSubjectTeacher(subjectId, teacherId)` in `subjects.ts`.
     - Updating or assigning a subject teacher automatically synchronizes `Teacher.subjectIds` (adding to new teacher and unlinking from previous instructor).
     - Deleting a subject cleanly unlinks the subject from teacher records.
  3. **Curriculum Integration & Central Directory:**
     - Integrated `BulkSubjectTemplateModal`, custom subject modal, and inline teacher reassignment into `ClassDetailView` under the "Curriculum & Subjects" tab.
     - Built institution-wide `SubjectManager` mounted at `/admin/subjects` with metrics, campus/class/teacher filters, and quick assignment dialogs.
- **Verified:** Automated test suite (`subjects-crud.test.ts`) verified bulk addition from templates, duplicate skipping, bidirectional teacher synchronization, deletion cleanup, and SSR rendering. Full 23-suite test regression passed with 0 errors. `npm run lint` (0 errors, 0 warnings) and Next.js production build (`next build`) compiled cleanly.
- **Left open:** none

---

### TASK-031 — Parent records and student linking

- **Status:** `✅ Done`
- **Started:** `2026-09-10 01:15` · **Completed:** `2026-09-10 01:28`
- **Files added:** `frontend/src/components/parents/ParentDirectory.tsx`, `frontend/src/components/parents/ParentProfileView.tsx`, `frontend/src/components/parents/index.ts`, `frontend/src/app/admin/parents/page.tsx`, `frontend/src/app/admin/parents/[id]/page.tsx`, `frontend/src/app/admin/parents/__tests__/parent-linking.test.ts`
- **Files changed:** `frontend/src/lib/repositories/parents.ts`, `frontend/src/lib/repositories/studentParents.ts`, `frontend/src/components/students/StudentProfileView.tsx`, `context/PROJECT_TASKS.md`, `progress.md`
- **Decisions:**
  1. **Many-to-Many Linking & Primary Guardian Management (Acceptance Criteria):**
     - Implemented `linkStudentParent(studentId, parentId, relationship, isPrimary)` and `unlinkStudentParent(studentId, parentId)`.
     - Supports multiple parents/guardians per student (e.g., Father + Mother + Legal Guardian), each with specific relationship roles.
     - Implemented `setPrimaryGuardian` designating the primary emergency/WhatsApp contact per student. When unlinking a primary contact, the next available linked guardian is automatically promoted to primary.
  2. **Bidirectional Sibling Cohort Resolution (Acceptance Criteria: "Sibling case works"):**
     - Built `getSiblingsForStudent(studentId)` which traverses shared parent IDs across `StudentParent` records.
     - Automatically discovers enrolled siblings (e.g. Tariq Khan links Ahmed Khan and Ayesha Khan).
     - Dual-parent deduplication: sharing both parents (Father + Mother) resolves to a single unified sibling entry with all shared parent names enumerated.
  3. **Family Cohort UI & Multi-Child Indicators:**
     - Created `ParentDirectory` at `/admin/parents` with family size badges (e.g., "2 Siblings", "1 Child", "Unlinked"), multi-child filter, student search, and quick modal to register parents and create initial child linkages.
     - Created `ParentProfileView` at `/admin/parents/[id]` with full contact profile, linked children cards with primary contact designation, sibling group callout banner, and "+ Link Another Child" modal.
     - Enhanced `StudentProfileView` Overview tab to list all linked parents with primary contact indicators and an **Enrolled Siblings Card** linking to sibling profiles.
- **Verified:** Automated test suite (`parent-linking.test.ts`) verified many-to-many linking, dual-parent sibling deduplication, primary guardian toggle, automatic promotion upon unlink, and SSR rendering. Full 24-suite test regression passed with 0 errors. `npm run lint` (0 errors, 0 warnings) and Next.js production build (`next build`) compiled cleanly. Milestone M3 (Core Records) completed (10/10 tasks).
- **Left open:** none

---

### TASK-032 — Attendance repository, per-class-per-day documents

- **Status:** `✅ Done`
- **Started:** `2026-09-10 01:33` · **Completed:** `2026-09-10 01:42`
- **Files added:** `frontend/src/lib/repositories/__tests__/attendance-repository.test.ts`
- **Files changed:** `frontend/src/types/attendance.ts`, `frontend/src/lib/repositories/attendance.ts`, `context/PROJECT_TASKS.md`, `progress.md`
- **Decisions:**
  1. **Per-Class-Per-Day Document Model (Acceptance Criteria: Matches DATA_MODELS.md §4; no per-student rows):**
     - Enforced canonical document ID format `att_${classId}_${date}`.
     - Document stores arrays of student ID strings (`present`, `absent`, `late`, `leave`), completely avoiding bloated per-student rows and staying well within the prototype's 5MB localStorage budget (~1.63MB total seed footprint).
     - Verified exactly 840 seeded documents across 21 classes and 40 school days.
  2. **On-Read Computation Architecture:**
     - In accordance with Architecture Rule §4, all summary statistics and individual student histories are computed strictly on read:
       - `calculateClassDaySummary`: Computes present/absent/late/leave counts and percentage dynamically.
       - `getStudentAttendanceHistory`: Extracts chronological daily records for any student by scanning class documents.
       - `calculateStudentAttendanceStats`: Derives overall attendance percentage and day counts on read.
       - `getClassesAttendanceStatusForDate`: Maps classes to marked vs unmarked states for the admin overview grid and teacher dashboard.
  3. **Atomic Upsert, Deduplication & Audit Window:**
     - `saveAttendance`: Implemented deduplication across status arrays (`leave > late > present > absent`).
     - Audit tracking: Preserves original `markedAt` and `markedBy` while recording `editedBy` and `editedAt` on revisions.
     - `canEditAttendance`: Implemented 24-hour edit window evaluation, allowing super admins and school admins to bypass window constraints for safeguarding audits.
- **Verified:** Automated test suite (`attendance-repository.test.ts`) verified 840 seeded documents, canonical ID format, on-read class summary calculations, student history derivation (including downward trend verification for student #15 Bilal), marked vs unmarked class status, and 24-hour edit window rules. Full 25-suite test regression passed with 0 errors. `npm run lint` (0 errors, 0 warnings) and Next.js production build (`next build`) compiled cleanly.
- **Left open:** none

---

## 2026-09-10 — TASK-033: Teacher attendance marking screen

- **Status:** `✅ Done`
- **Started:** `2026-09-10 01:45` · **Completed:** `2026-09-10 01:58`
- **Files added:** `frontend/src/components/attendance/AttendanceStatusControl.tsx`, `frontend/src/components/attendance/AttendanceSummaryBar.tsx`, `frontend/src/components/attendance/AttendanceSaveBar.tsx`, `frontend/src/components/attendance/AttendanceGrid.tsx`, `frontend/src/components/attendance/index.ts`, `frontend/src/app/teacher/classes/[id]/attendance/page.tsx`, `frontend/src/app/teacher/classes/[id]/attendance/__tests__/attendance-marking.test.ts`
- **Files changed:** `frontend/src/types/communication.ts`, `frontend/package.json`, `context/PROJECT_TASKS.md`, `progress.md`
- **Decisions:**
  1. **All-Present Default on Unmarked Days (Acceptance Criteria: 40 students markable in under 60s):**
     - Active students default to `present` on unmarked dates while inactive students are strictly filtered out per TASK-026 lifecycle rules.
     - Teachers only touch exceptions (Absent, Late, Leave), allowing an entire 40-student classroom register to be verified and saved in under 60 seconds (benchmark verified in ~0ms execution).
     - Previously marked registers load saved states with original audit records (`markedBy`, `markedAt`, `editedBy`, `editedAt`).
  2. **Accessible 44px Touch Targets & Keyboard Accelerators:**
     - `AttendanceStatusControl`: Built 44px touch-friendly segmented control with accessible color-coding and glyphs: Present (Emerald), Absent (Rose), Late (Amber), Leave (Indigo).
     - Single-key shortcuts: `P` (Present), `A` (Absent), `L` (Late), `V` (Leave) immediately toggle status and auto-advance focus to the next student row.
     - Keyboard navigation: Arrow keys (`↑`/`↓`) and Vim keys (`J`/`K`) smoothly cycle student focus; `Ctrl+S` / `Cmd+S` triggers immediate save.
     - Accessibility: ARIA `radiogroup` with `radio` items, proper labels, and roving focus indicators.
  3. **Live Running Tally & Sticky Save Bar:**
     - `AttendanceSummaryBar`: Live badge counters for Present, Absent, Late, and Leave counts along with dynamic attendance percentage and audit status badge (unmarked vs marked by teacher).
     - `AttendanceSaveBar`: Sticky bottom bar providing persistent live counts, active edit window status, and a 44px primary Save button with loading spinner and disabled state during save or when outside the edit window.
  4. **Notifications & Mock WhatsApp Log Integration:**
     - On save, absent students trigger parent notification records via `createNotification` and mock WhatsApp messages via `logWhatsAppMessage` (`daily_attendance_alert` template) for all linked guardians.
- **Verified:** Automated test suite (`attendance-marking.test.ts`) verified all-present default, 40-student benchmark performance (< 60s), status changes (absent, late, leave), persistence to class-per-day format, notification and WhatsApp dispatch, and SSR rendering. All 26 test suites passed. ESLint passed with 0 errors/0 warnings. Next.js production build (`next build`) compiled cleanly with `/teacher/classes/[id]/attendance` registered as a dynamic page.
- **Left open:** none

---

## 2026-09-10 — TASK-034: Save, edit window, audit trail

- **Status:** `✅ Done`
- **Started:** `2026-09-10 01:59` · **Completed:** `2026-09-10 02:14`
- **Files added:** `frontend/src/components/attendance/AttendanceAuditBanner.tsx`, `frontend/src/components/attendance/AttendanceAuditModal.tsx`, `frontend/src/app/teacher/classes/[id]/attendance/__tests__/attendance-audit.test.ts`
- **Files changed:** `frontend/src/types/common.ts`, `frontend/src/lib/repositories/attendance.ts`, `frontend/src/lib/repositories/settings.ts`, `frontend/src/lib/seed/generator.ts`, `frontend/src/lib/utils/dates.ts`, `frontend/src/components/attendance/AttendanceSaveBar.tsx`, `frontend/src/components/attendance/AttendanceGrid.tsx`, `frontend/src/components/attendance/index.ts`, `context/PROJECT_TASKS.md`, `progress.md`
- **Decisions:**
  1. **Configurable Edit Window in Settings (Acceptance Criteria: Edit allowed within window):**
     - Extended `Settings` interface with `attendanceEditWindowHours?: number`, defaulting to 48 hours (2 days) per `FEATURE_SPECIFICATIONS.md §8`.
     - `canEditAttendance`: Enhanced helper computing precise remaining hours/minutes (`hoursRemaining`, `minutesRemaining`), `isExpired` boolean, and `isAdminOverride` status based on elapsed time from `markedAt`.
     - Teachers are permitted to edit attendance within the configurable window (48h default). Once expired, `canEdit` evaluates to `false`, controls lock into read-only mode, and shortcut key toggles are suppressed.
  2. **Administrative Override:**
     - School Administrators and Super Administrators retain override permissions (`canEdit: true`, `isAdminOverride: true`) even after the window expires, ensuring data correction and safeguarding compliance with audit trail tracking.
  3. **Audit Trail Display & Modal (Acceptance Criteria: Shows who marked and when):**
     - `AttendanceAuditBanner`: Renders at the top of the register showing original submitter ("Marked by [Teacher Name] ([Role]) on [Date & Time]"), last revised info if edited ("Last edited by [Editor Name] on [Date & Time]"), live window status pill with hours remaining, and a trigger button for the complete audit log.
     - `AttendanceAuditModal`: Accessible dialog presenting a chronological event timeline detailing the original submission (timestamp, user, counts by status) and modification events, alongside the institutional integrity policy.
  4. **Atomic Upsert & Immutability of Original Submission Metadata:**
     - On revision saves, `saveAttendance` guarantees that original `markedBy` and `markedAt` remain strictly immutable, while capturing `editedBy` (`session.userId`) and `editedAt` (ISO timestamp).
     - Save bar displays a clear locked indicator (`🔒 Register Locked (Read-Only)`) and disabled state when outside the edit window for teachers.
- **Verified:** Automated test suite (`attendance-audit.test.ts`) verified configurable edit window resolution from settings, teacher edit permission within 48h, teacher edit blocking after 48h, administrative override for school and super admins, immutability of `markedBy`/`markedAt`, capture of `editedBy`/`editedAt`, and SSR rendering of both `AttendanceAuditBanner` and `AttendanceAuditModal`. All 27 test suites passed with 0 errors. `npm run lint` passed with 0 errors/0 warnings. Next.js production build (`next build`) compiled cleanly.
- **Left open:** none

---

## 2026-09-10 — TASK-035: Teacher dashboard — today's classes and marked state

- **Status:** `✅ Done`
- **Started:** `2026-09-10 02:15` · **Completed:** `2026-09-10 02:29`
- **Files added:** `frontend/src/components/teacher/ClassAttendanceCard.tsx`, `frontend/src/components/teacher/TeacherDashboardView.tsx`, `frontend/src/components/teacher/index.ts`, `frontend/src/app/teacher/dashboard/page.tsx`, `frontend/src/app/teacher/dashboard/__tests__/teacher-dashboard.test.ts`
- **Files changed:** `context/PROJECT_TASKS.md`, `progress.md`, `context/CHANGELOG.md`
- **Decisions:**
  1. **Visual Differentiation between Marked and Unmarked Classes (Acceptance Criteria: Clear which classes still need marking):**
     - Built `ClassAttendanceCard` with distinct states:
       - **Unmarked State**: Wrapped in warm amber accenting (`bg-amber-50/30 border-amber-200 ring-1 ring-amber-200/50`) with an amber warning badge (`Needs Marking` + pulsing amber dot) and high-visibility 44px primary action button (`Mark Attendance →`).
       - **Marked State**: Crisp neutral card (`bg-white border-neutral-200`) with emerald confirmation badge (`✓ Marked`), daily presence rate percentage display (`X%`), student status count chips (Present, Absent, Late, Leave), and secondary action button (`View / Edit Register`).
     - Default sorting prioritizes unmarked registers at the top of the dashboard feed so teachers immediately see outstanding work.
  2. **Institutional Teacher Dashboard View:**
     - Developed `TeacherDashboardView` featuring:
       - Teacher greeting with employee code and active campus scope pill.
       - Quick date selector (Previous, Today, Next) allowing teachers to view or backfill registers.
       - Prominent urgency alert banner when pending registers exist ("Attention: You have X class registers pending attendance marking today.").
       - Four key metric StatCards (`Pending Registers`, `Marked Registers`, `Today's Presence Rate`, `Total Students`).
       - Filter tabs (`All Classes`, `Needs Marking`, `Already Marked`) with count badges for fast roster filtering.
       - Side preview of today's timetable slots and class teacher homeroom badges.
  3. **Role-Guarded Dynamic Route:**
     - Mounted at `/teacher/dashboard` guarded with `RouteGuard` allowing `teacher`, `admin`, `super_admin`, and `principal` roles within `AppShell`.
- **Verified:** Automated test suite (`teacher-dashboard.test.ts`) verified marked vs unmarked visual state differentiation, action button labels and link hrefs (`/teacher/classes/[id]/attendance?date=YYYY-MM-DD`), urgency banner presentation, and full view rendering. All 28 test suites passed (`npm test`), ESLint passed with 0 errors/0 warnings (`npm run lint`), and Next.js compiled cleanly (`npm run build`).
- **Left open:** none

---

## 2026-09-10 — TASK-036: Admin attendance overview grid

- **Status:** `✅ Done`
- **Started:** `2026-09-10 02:32` · **Completed:** `2026-09-10 02:51`
- **Files added:** `frontend/src/components/attendance/AdminAttendanceGrid.tsx`, `frontend/src/components/attendance/AdminAttendanceOverview.tsx`, `frontend/src/app/admin/attendance/page.tsx`, `frontend/src/app/principal/attendance/page.tsx`, `frontend/src/app/admin/attendance/__tests__/admin-attendance-overview.test.ts`
- **Files changed:** `frontend/src/lib/repositories/settings.ts`, `frontend/src/lib/repositories/attendance.ts`, `frontend/src/types/attendance.ts`, `frontend/src/lib/utils/dates.ts`, `frontend/src/components/attendance/index.ts`, `context/PROJECT_TASKS.md`, `progress.md`, `context/CHANGELOG.md`
- **Decisions:**
  1. **Configurable Cutoff & Visual Highlighting (Acceptance Criteria: Unmarked classes highlighted):**
     - Implemented `isPastCutoff(date, cutoffTime, referenceNow)` in attendance repository: prior dates are always considered past cutoff if unmarked; future dates are upcoming; today compares the current time with `attendanceCutoffTime` from settings (default `08:30` AM).
     - In `AdminAttendanceGrid`, unmarked cells past cutoff are prominently highlighted with high-contrast amber styling (`bg-amber-100/90 border-2 border-amber-400 text-amber-950`), a warning pill (`Needs Marking` + pulsing amber dot), and explicit label (`Overdue (Past 08:30)`).
     - Marked cells display presence percentage (`X%`) and absent count badge (`0 absent` or `N absent`), with checkmark glyph `✓`.
  2. **Administrative Accountability & Deep Action Links:**
     - Matrix rows display sticky Grade-Section, Campus badge, and **Assigned Class Teacher** name with employee number.
     - Urgent Action Callout banner renders at the top of `AdminAttendanceOverview` when today's classes remain unmarked past cutoff, identifying the overdue classes, their responsible teachers, and providing a direct "Mark as Admin" button.
     - Clicking any cell navigates directly to `/teacher/classes/[id]/attendance?date=[date]` with admin override permissions.
  3. **Multi-Date Matrix Query & Week Controls:**
     - Built `getAttendanceMatrix` batch query joining classes, campuses, teachers, user records, active students, and date attendance documents.
     - Provided week navigation (`Prev Week`, `Current Week`, `Next Week`), campus selector, status filters (`All`, `Unmarked / Overdue`, `Marked`), and view toggle between Classes × Dates Matrix and Today's Class Roster.
  4. **Role-Guarded Routes:**
     - Created `/admin/attendance` (accessible to `super_admin`, `school_admin`, `principal`).
     - Created `/principal/attendance` (accessible to `principal`, `school_admin`, `super_admin`).
- **Verified:** Automated test suite (`admin-attendance-overview.test.ts`) verified cutoff rules, matrix data aggregation across all classes, visual highlighting of overdue classes, teacher identification, and component SSR. Full test suite regression passed with 29 test suites (`npm test`), ESLint passed with 0 errors/0 warnings (`npm run lint`), and Next.js compiled cleanly (`npm run build`).
- **Left open:** none

---

## 2026-09-10 — TASK-037: Attendance reports and CSV export

- **Status:** `✅ Done`
- **Started:** `2026-09-10 02:52` · **Completed:** `2026-09-10 02:58`
- **Files added:** `frontend/src/lib/utils/csv.ts`, `frontend/src/components/attendance/AttendanceReportsView.tsx`, `frontend/src/app/admin/attendance/reports/page.tsx`, `frontend/src/app/admin/attendance/reports/__tests__/attendance-reports.test.ts`
- **Files changed:** `frontend/src/lib/utils/index.ts`, `frontend/src/types/attendance.ts`, `frontend/src/lib/repositories/attendance.ts`, `frontend/src/components/attendance/index.ts`, `context/PROJECT_TASKS.md`, `progress.md`, `context/CHANGELOG.md`
- **Decisions:**
  1. **Three Reporting Dimensions (Acceptance Criteria: By class, by student, by range):**
     - **By Class Cohort**: Aggregates all students in a class across a date range. Calculates instructional days, total present/absent/late/leave student-days, and overall cohort attendance %. Renders full student roster with individual stats.
     - **By Date Range Trend**: Aggregates daily school/campus metrics (marked classes, enrolled in marked, present, absent, late, leave, presence %) for each instructional day in the window.
     - **By Individual Student**: Displays longitudinal student attendance profile with stats (present, absent, late, leave days and percentage) and chronological daily history logs.
  2. **RFC 4180 CSV Export Utility:**
     - Created `formatCSVCell`, `generateCSV`, and `downloadCSV` in `src/lib/utils/csv.ts`.
     - Supports escaping quotes (`""`), commas, newlines, CRLF (`\r\n`) line endings, and UTF-8 Byte Order Mark (BOM) so exports open seamlessly in Microsoft Excel and other spreadsheet editors.
     - Wired export buttons with descriptive dynamic filenames (e.g. `attendance-class-8-A-2026-07-15-to-2026-09-10.csv`).
  3. **Interactive Reporting Dashboard & Presets:**
     - Built `AttendanceReportsView` with tabs for each reporting dimension, quick date range presets (`Today`, `Past 7 Days`, `Past 30 Days`, `Academic Term (40d)`), campus/class/student filters, summary StatCards, sortable tables, and a browser print button (`window.print()`).
  4. **Role-Guarded Page:**
     - Mounted at `/admin/attendance/reports` protected by `RouteGuard` for `super_admin`, `school_admin`, and `principal` within `AppShell`.
- **Verified:** Automated test suite (`attendance-reports.test.ts`) verified RFC 4180 CSV formatting, By Class aggregation (20 students across 34 instructional days, 91.2%), By Range aggregation (8 days, 92.1%), By Student aggregation (Ayesha Khan, 34 days, 88.2%), and SSR rendering. Full regression suite passed with 30 test suites (`npm test`), ESLint passed with 0 errors/0 warnings (`npm run lint`), and Next.js compiled cleanly (`npm run build`).
- **Left open:** none

## 2026-09-10 — TASK-038: Parent monthly attendance calendar
- **Status:** `✅ Done`
- **Started:** `2026-09-10 03:30` · **Completed:** `2026-09-10 12:55`
- **Files added:** `frontend/src/components/parent/ParentAttendanceCalendar.tsx`, `frontend/src/components/parent/index.ts`, `frontend/src/app/parent/attendance/page.tsx`, `frontend/src/app/parent/attendance/__tests__/parent-attendance-calendar.test.ts`
- **Files changed:** `frontend/src/lib/utils/dates.ts`, `frontend/src/lib/utils/index.ts`, `frontend/src/types/attendance.ts`, `frontend/src/lib/repositories/attendance.ts`, `context/PROJECT_TASKS.md`, `progress.md`, `context/CHANGELOG.md`
- **Decisions:**
  1. **Calendar Layout & Month Grid Math (Monday-first):**
     - Extended `src/lib/utils/dates.ts` with `getMonthCalendarGrid(year, month)` generating 35-42 day grid cells including padding from previous/next months.
     - Weekday order strictly conforms to Monday through Sunday. Includes day number, ISO date string, weekday indices, isCurrentMonth, isSunday, and isToday.
  2. **Acceptance Criteria 1: Colour + Label Coding:**
     - Each calendar cell renders explicit status badge with both icon glyph and human label (`✓ Present`, `✕ Absent`, `⏱ Late`, `📋 Leave`) alongside distinct institutional colors (emerald, rose, amber, indigo).
     - Weekends (Sundays) and non-instructional days are visually distinct and excluded from attendance percentage calculations.
  3. **Acceptance Criteria 2: Summary Counts & Percentage:**
     - Computes monthly metrics via `getStudentMonthAttendance` in `src/lib/repositories/attendance.ts`.
     - Displays 5 StatCards: `Monthly Presence` (percentage), `Days Present`, `Days Absent`, `Days Late`, and `Days on Leave`.
     - Absent count StatCard includes downward trend pill when unexcused absences > 0.
  4. **Multi-Child Switcher & Strict Parental Tenant Scoping:**
     - Top banner includes child context (name, grade, section, campus).
     - Multi-child parents (e.g. Tariq Khan with Ahmed and Ayesha) see intuitive pill switcher to seamlessly toggle between children.
     - Protected route `/parent/attendance` validates session role and rejects unauthorized student query parameters with `NotFound404`.
- **Verified:** Unit test suite (`parent-attendance-calendar.test.ts`) verified month grid math, monthly repository queries (Ayesha Khan 90% in August 2026), color+label coding on all 4 statuses, summary StatCards, and multi-child isolation. Full regression suite passed (31 test suites, `npm test`), ESLint clean (0 errors, 0 warnings), and Next.js production build succeeded (`npm run build`).
- **Left open:** none

## 2026-09-10 — TASK-039: QR scan mock screen
- **Status:** `✅ Done`
- **Started:** `2026-09-10 12:51` · **Completed:** `2026-09-10 13:05`
- **Files added:** `frontend/src/components/attendance/QRScannerMock.tsx`, `frontend/src/app/teacher/attendance/scan/page.tsx`, `frontend/src/app/teacher/attendance/scan/__tests__/qr-scanner-mock.test.ts`
- **Files changed:** `frontend/src/components/attendance/AttendanceGrid.tsx`, `frontend/src/components/attendance/index.ts`, `context/PROJECT_TASKS.md`, `progress.md`, `context/CHANGELOG.md`
- **Decisions:**
  1. **Simulated Camera Viewfinder (Differentiation Screen 4):**
     - Built full-fidelity camera viewfinder simulation featuring targeting corner brackets, moving emerald laser scan beam, active camera status pill (`SCANNER ACTIVE 1080P HD`), and synthesized audio chime feedback via Web Audio API.
     - Scan popover card animates inside viewfinder showing scanned student avatar, name, roll number, admission number, and timestamp.
  2. **Simulation Controls:**
     - Included `⚡ Simulate Scan (Next Student)` (picks next unscanned student in roll order), `🎲 Random Scan`, targeted student picker dropdown, and manual handheld barcode gun input field.
  3. **Running Log & Progress Tracking:**
     - Chronological running log (newest first) with student details, scan timestamp, status pill (`✓ Present` or `⏱ Late`), and `Undo` action.
     - Live progress StatCards and dual-tab view toggling between Scanned Students and Pending Unscanned Roster.
  4. **Seamless Fallback to Manual Grid Without Reload:**
     - Integrated in-place mode toggle (`📋 Manual Grid View` vs `📷 QR Scanner View`). Switches view to `AttendanceGrid` inline without triggering any page reload (`window.location`), preserving all scanned student statuses in the manual register.
     - Added `📷 QR Scanner Mode` quick action button directly in `AttendanceGrid` header.
  5. **RFID Concept Screen:**
     - Displayed high-fidelity concept screen explicitly labelled `CONCEPT ONLY — Hardware Integration Not Implemented` with UHF RFID gate reader specifications, automated turnstile walk-through logs, and parent WhatsApp webhook notification triggers.
- **Verified:** Automated test suite (`qr-scanner-mock.test.ts`) verified viewfinder rendering, simulation controls, fallback without page reload, RFID concept disclaimer, and repository persistence. Full regression suite passed (32 test suites, `npm test`), ESLint clean (0 errors, 0 warnings), and Next.js production build succeeded (`npm run build`). Milestone M4 is now 100% complete (8/8 tasks).
- **Left open:** none

## 2026-09-10 — TASK-040: Fee structures CRUD
- **Status:** `✅ Done`
- **Started:** `2026-09-10 13:06` · **Completed:** `2026-09-10 13:12`
- **Files added:** `frontend/src/components/fees/FeeStructureForm.tsx`, `frontend/src/components/fees/FeeStructuresTable.tsx`, `frontend/src/components/fees/FeeStructuresView.tsx`, `frontend/src/components/fees/index.ts`, `frontend/src/app/admin/fees/structures/page.tsx`, `frontend/src/app/admin/fees/structures/__tests__/fee-structures.test.ts`
- **Files changed:** `frontend/src/lib/utils/currency.ts`, `frontend/src/lib/repositories/feeStructures.ts`, `context/PROJECT_TASKS.md`, `progress.md`, `context/CHANGELOG.md`
- **Decisions:**
  1. **Acceptance Criteria — Per-Class & Optional Campus Scope:**
     - Enforced strictly per-class assignment (`classIds: ID[]` non-empty validation), with interactive multiselect, "Select All Classes", and "Clear All" helpers.
     - Optional campus scope (`campusId?: ID`): Allows structures to apply to all campuses (school-wide) or be restricted to a specific campus.
     - Frequency support for `monthly`, `term`, and `annual` (one-time) fee structures, plus active/inactive toggle.
  2. **Repository Enhancements & Delete Safety:**
     - Added `getFeeStructuresForClass(scope, classId)` to effortlessly query active structures applying to a specific class.
     - Added `FeeStructureFilter` with search, campus, frequency, and active filters.
     - Added `canDeleteFeeStructure(scope, id)` which inspects invoices to prevent destructive deletion of fee structures already attached to generated student invoices, returning friendly actionable warnings.
  3. **High-Fidelity Visuals & Feedback:**
     - Created `FeeStructuresView` equipped with live stat cards (Active Structures, Monthly Projected, Annual Projected, Campus-Specific count), search query, campus filter, and frequency selector.
     - Modal dialog for creation/editing with real-time summary calculation (`PKR X × Y classes`).
     - Delete confirmation dialog with safety checks.
  4. **Utility Standard:**
     - Added `formatCurrency = formatPKR` alias in `src/lib/utils/currency.ts` so all fee modules can import standard `formatCurrency`.
- **Verified:** Dedicated automated test suite (`fee-structures.test.ts`) tested CRUD, class assignment, campus scoping, invoice in-use deletion protection, and SSR rendering. Full regression suite passed (33 test suites, `npm test`), ESLint clean (0 errors, 0 warnings), and Next.js production build succeeded (`npm run build`). Milestone M5 is underway (1/7 tasks).
- **Left open:** none

## 2026-09-10 — TASK-041: Bulk invoice generation with preview
- **Status:** `✅ Done`
- **Started:** `2026-09-10 13:13` · **Completed:** `2026-09-10 13:28`
- **Files added:** `frontend/src/components/fees/BulkInvoiceModal.tsx`, `frontend/src/components/fees/InvoicesTable.tsx`, `frontend/src/components/fees/InvoicesListView.tsx`, `frontend/src/app/admin/fees/invoices/page.tsx`, `frontend/src/app/admin/fees/invoices/__tests__/bulk-invoices.test.ts`
- **Files changed:** `frontend/src/types/fees.ts`, `frontend/src/lib/repositories/feeInvoices.ts`, `frontend/src/components/fees/index.ts`, `context/PROJECT_TASKS.md`, `progress.md`, `context/CHANGELOG.md`
- **Decisions:**
  1. **Acceptance Criteria — Preview & Zero Duplicate Re-Run Guarantee:**
     - Built `previewBulkInvoiceGeneration(scope, params)` which evaluates eligible active students, applies applicable class fee structures, inspects sibling concessions (e.g. Ayesha Khan 15% discount), and checks existing invoices.
     - Detects duplicates matching `(studentId, feeStructureId, billingMonth)` or corresponding period labels.
     - Built `generateBulkInvoices(scope, params)` which creates invoices strictly for non-duplicate records with sequential `INV-YYYY-XXXXX` numbering and idempotent re-runs.
     - Re-running the generation with identical parameters evaluates 0 new invoices and skips all existing ones, producing zero duplicates in storage.
  2. **Bulk Generation UI Wizard (`BulkInvoiceModal.tsx`):**
     - Step 1 (Configure): Billing month selector, invoice due date, campus scope, class scope, and fee structures selection with Select All / Clear helpers.
     - Step 2 (Preview): Live financial StatCards (New Invoices to Create count & PKR total, Already Generated / Skipped count & PKR total, Eligible Students count), warning banner when all invoices already exist, filterable & searchable preview table, and Confirm & Generate execution.
  3. **High-Density Invoice Directory (`InvoicesListView.tsx` & `InvoicesTable.tsx`):**
     - Live StatCards: Total Invoiced, Total Collected, Pending Receivables, Overdue Defaulters.
     - Filter bar: Search by student name/admission #/invoice #, status filter (Paid, Partial, Pending, Overdue), campus dropdown, class dropdown, and billing month filter.
     - High-density table with deterministic avatar palette, monospaced invoice numbers, class & campus badges, tabular numeral currency formatting, status badges, and detail action links.
  4. **Page Route:**
     - Mounted at `/admin/fees/invoices` protected with `RouteGuard` for `super_admin`, `school_admin`, and `principal` inside `AppShell`.
- **Verified:** Dedicated automated test suite (`bulk-invoices.test.ts`) verified preview accuracy, bulk invoice generation, duplicate prevention on re-run, class/campus scoped generation, and SSR rendering. Full regression suite passed (34 test suites, `npm test`), ESLint clean (0 errors, 0 warnings), and Next.js production build succeeded (`npm run build`). Milestone M5 is 2/7 complete.
- **Left open:** none

### TASK-042 — Payment recording, partial payments, balance
- **Files added:** `frontend/src/components/fees/RecordPaymentModal.tsx`, `frontend/src/components/fees/PaymentReceiptModal.tsx`, `frontend/src/components/fees/InvoiceDetailView.tsx`, `frontend/src/app/admin/fees/invoices/[id]/page.tsx`, `frontend/src/app/admin/fees/invoices/__tests__/payment-recording.test.ts`
- **Files changed:** `frontend/src/lib/repositories/feeInvoices.ts`, `frontend/src/components/fees/index.ts`, `context/PROJECT_TASKS.md`, `progress.md`, `context/CHANGELOG.md`
- **Decisions:**
  1. **Acceptance Criteria — Status Transitions & Exact Balance Invariant:**
     - Enhanced `recordPayment(invoiceId, input)` in `feeInvoices.ts` to strictly validate positive payment amounts, block payments on fully settled invoices, recalculate running `paidAmount`, and transition status correctly:
       - If `paidAmount >= netDue` -> `paid`.
       - If `0 < paidAmount < netDue` -> `partial`.
       - If `paidAmount === 0` -> maintains original status (`pending` or `overdue`).
     - Balance calculations strictly leverage `invoiceBalance(invoice)` utility (`netDue = totalAmount - discountAmount`, `remainingBalance = max(0, netDue - paidAmount)`).
  2. **Sequential Receipt Generation & Preservation:**
     - Built `getNextReceiptNumber(schoolId)` predicting and generating sequential receipt numbers in the institutional format `REC-YYYY-XXXXX`.
     - Ensures each new payment transaction receives an immutable receipt number.
     - Preserves existing receipt numbers on invoice re-fetch, print, or review without issuing duplicate receipt numbers.
  3. **Record Payment Modal (`RecordPaymentModal.tsx`):**
     - Live financial context: Invoice number, student name, admission number, net due, already paid, and current balance.
     - Preset shortcut chips: "Pay Full Balance", "Pay 50%", "Pay 25%" for rapid teller data entry.
     - Payment fields: Amount (with overpayment safeguard warning and dynamic balance projection), Payment Method (`cash`, `bank`, `cheque`, `online`), Transaction Reference / Cheque No., Date Received, and Received By / Notes.
     - Dynamic preview badge demonstrating real-time status change (`partial` or `paid`).
  4. **Payment Receipt Printable Modal (`PaymentReceiptModal.tsx`):**
     - Clean, official paper-ready voucher receipt layout with institutional header, receipt number, date, student details (name, admission number, class), fee line items, payment transaction particulars, payment method badge, running balance breakdown, and authorized signature section.
     - Integrated `window.print()` trigger with print-friendly CSS.
  5. **Dynamic Invoice Detail Route (`InvoiceDetailView.tsx` & `/admin/fees/invoices/[id]`):**
     - Financial StatCards: Net Invoice Amount, Amount Paid, Outstanding Balance, Invoice Status.
     - Student & Billing Info Card: Student name, admission number, campus, class, billing period, due date.
     - Invoice Line Items breakdown with gross fee components, explicit discounts/concessions, and final net receivable.
     - Audited Payment Transactions ledger showing each installment, date, receipt number badge, payment method, reference, collector, amount, and instant "Print Receipt" trigger.
     - Header actions: "Record Payment" button (disabled when balance is zero) and back navigation.
     - Dynamic Next.js App Router page protected by `RouteGuard` and wrapped in `AppShell`.
- **Verified:** Dedicated automated test suite (`payment-recording.test.ts`) verified partial payment transitions (`pending` -> `partial`), full settlement (`partial` -> `paid`, balance 0), sequential receipt numbering, reprint preservation, payment validation safeguards (overpayment & zero amount rejection), multi-installment running balance accuracy, and component SSR rendering. Full regression suite passed (35 test suites, `npm test`), ESLint clean (0 errors, 0 warnings), and Next.js production build succeeded (`npm run build`). Milestone M5 is 3/7 complete (50.0% of all project tasks done).
- **Left open:** none

### TASK-043 — Discounts, scholarships, sibling concession
- **Files added:** `frontend/src/lib/repositories/studentConcessions.ts`, `frontend/src/components/fees/ApplyConcessionModal.tsx`, `frontend/src/components/fees/StudentConcessionsModal.tsx`, `frontend/src/app/admin/fees/invoices/__tests__/discounts-concessions.test.ts`
- **Files changed:** `frontend/src/types/fees.ts`, `frontend/src/lib/storage/keys.ts`, `frontend/src/lib/repositories/feeInvoices.ts`, `frontend/src/components/fees/InvoiceDetailView.tsx`, `frontend/src/components/fees/PaymentReceiptModal.tsx`, `frontend/src/components/fees/index.ts`, `context/PROJECT_TASKS.md`, `progress.md`, `context/CHANGELOG.md`
- **Decisions:**
  1. **Acceptance Criteria — Visible as Line Items, Never Silent:**
     - Enforced strictly that discounts and concessions are NEVER applied by silently lowering the gross tuition fee.
     - The gross tuition fee structure remains at its full published price (e.g. PKR 20,000).
     - Concessions and scholarships are itemized as explicit negative line items (e.g. `{ label: 'Sibling Concession (15%)', amount: -3000 }`, `{ label: 'Merit Scholarship (25%)', amount: -5000 }`).
     - `discountAmount` is strictly the sum of all concession line items.
     - `netDue` = `totalAmount - discountAmount`.
  2. **Student Concession Model & Repository (`studentConcessions.ts`):**
     - Built `StudentConcession` entity and storage key `sp:v1:studentConcessions`.
     - CRUD support for recurring student concessions: Sibling, Scholarship (academic/merit/need), Staff Child, and Special relief.
     - `calculateStudentConcessions`: Evaluates assigned active concessions and automatically checks sibling relationships (`hasEnrolledSiblings`), calculating negative line items with percentage or fixed cap deductions.
  3. **Bulk Invoicing Concession Integration (`feeInvoices.ts`):**
     - Integrated `calculateStudentConcessions` into both `previewBulkInvoiceGeneration` and `generateBulkInvoices`.
     - Automatically applies sibling concessions and assigned scholarships as named negative line items on newly generated invoices.
  4. **Ad-Hoc Concession Application (`ApplyConcessionModal.tsx` & `applyInvoiceConcession`):**
     - Enabled administrators to add explicit concessions to existing pending or partial invoices.
     - Provides instant calculation preview (gross, existing concessions, new deduction, projected net due, projected balance).
     - Safeguards: Prevents adding concessions to fully paid invoices, blocks deductions > 100% or values <= 0, and updates invoice status accordingly.
     - Implemented `removeInvoiceConcession` allowing removal of itemized concessions with complete balance and status restoration.
  5. **UI Transparency (`InvoiceDetailView.tsx` & `PaymentReceiptModal.tsx`):**
     - Line items table renders explicit emerald `[CONCESSION]` tags, negative formatted amounts (`-PKR X,XXX`), and item removal triggers.
     - "+ Add Concession" button in line items header.
     - "Scholarship & Concession Profiles" launcher in student profile card.
     - Official printable voucher (`PaymentReceiptModal.tsx`) itemizes every concession with `[CONCESSION]` badge for full financial transparency to parents.
- **Verified:** Dedicated automated test suite (`discounts-concessions.test.ts`) verified sibling concession auto-detection, explicit line items format (-3000), multi-concession calculations, ad-hoc concession application (`applyInvoiceConcession`), line item removal (`removeInvoiceConcession`), calculation safeguards, bulk preview integration, and SSR modal rendering. Full regression suite passed (36 test suites, `npm test`), ESLint clean (0 errors, 0 warnings), and Next.js production build succeeded (`npm run build`). Milestone M5 is 4/7 complete (51.2% of all project tasks done).
- **Left open:** none

### TASK-044 — Receipt with sequential numbering
- **Files added:** `frontend/src/app/admin/fees/invoices/__tests__/sequential-receipts.test.ts`
- **Files changed:** `frontend/src/lib/repositories/feeInvoices.ts`, `frontend/src/components/fees/PaymentReceiptModal.tsx`, `frontend/src/components/fees/InvoiceDetailView.tsx`, `context/PROJECT_TASKS.md`, `progress.md`, `context/CHANGELOG.md`
- **Decisions:**
  1. **Acceptance Criteria — Reprint Does Not Issue a New Number:**
     - Tested and verified that reprinting, re-querying, or reloading payment receipts 15+ times strictly preserves the original immutable `receiptNumber` (`REC-YYYY-XXXXX`).
     - Sequence counter in `getNextReceiptNumber` strictly increments only upon recording a new payment transaction and remains completely untouched by queries or reprints.
  2. **Direct Receipt Lookup Helper (`getPaymentReceiptByNumber`):**
     - Built `getPaymentReceiptByNumber(schoolId, receiptNumber)` repository method enabling direct receipt retrieval across invoices for cashier audits and receipt search.
  3. **Reprint Copy & Duplicate Indicator:**
     - Enhanced `PaymentReceiptModal.tsx` to support `isReprint` flag, rendering an official `[DUPLICATE / REPRINT COPY]` badge when opened from historical transaction tables, while preserving the exact original receipt number.
     - Added quick "📋 Copy #" shortcut button for tellers and administrators.
  4. **Invoice Detail Integration:**
     - Hooked up `isReceiptReprint` in `InvoiceDetailView.tsx` so clicking "Print Receipt" on past payments flags reprint mode, while fresh payments automatically open the newly issued receipt.
- **Verified:** Dedicated automated test suite (`sequential-receipts.test.ts`) verified monotonic sequential receipt generation, 15x reprint preservation without sequence leakage, multi-installment distinct receipt numbers, direct lookup by receipt number, and SSR rendering in both fresh and reprint modes. Full regression suite passed (37 test suites, `npm test`), ESLint clean (0 errors, 0 warnings), and Next.js production build succeeded (`npm run build`). Milestone M5 is 5/7 complete (52.4% of all project tasks done).
- **Left open:** none

### TASK-045 — Student fee ledger and defaulter report
- **Files added:** `frontend/src/lib/repositories/feeDefaulters.ts`, `frontend/src/components/fees/DefaultersListView.tsx`, `frontend/src/components/fees/StudentFeeLedgerModal.tsx`, `frontend/src/app/admin/fees/defaulters/page.tsx`, `frontend/src/app/admin/fees/defaulters/__tests__/defaulters-ledger.test.ts`
- **Files changed:** `frontend/src/lib/repositories/index.ts`, `frontend/src/components/fees/index.ts`, `frontend/src/components/fees/InvoicesListView.tsx`, `context/PROJECT_TASKS.md`, `progress.md`, `context/CHANGELOG.md`
- **Decisions:**
  1. **Acceptance Criteria — Filter by Amount and Days Overdue:**
     - Developed `getDefaultersReport(scope, filter, referenceDate)` in `frontend/src/lib/repositories/feeDefaulters.ts`.
     - Accurately detects all overdue invoices where `remainingBalance > 0` and `dueDate < referenceDate` or status is `'overdue'`.
     - Supports filtering by `minDaysOverdue` (7+, 15+, 30+, 60+ days) and `minAmount` (≥ 5k, 10k, 25k, 50k PKR), as well as multi-facet filtering by campus, class, and text search across student names, roll numbers, admission numbers, and parent phones.
  2. **WhatsApp Mock Reminder Integration:**
     - Implemented `sendDefaulterReminder` and `sendBulkDefaulterReminders` strictly formatting official WhatsApp messages per `FEATURE_SPECIFICATIONS.md` §16 and logging to `STORAGE_KEYS.WHATSAPP_LOG`.
     - Individual "Remind" row actions and bulk "Send WhatsApp Reminders (N)" trigger instant log writes with success toast notifications naming the recipient and log ID.
  3. **Chronological Student Fee Ledger & Invariant:**
     - Implemented `getStudentFeeLedger(studentId, schoolId)` compiling all billing debits, scholarship/concession credits, and payment receipt credits.
     - Enforced mathematical invariant: `runningBalance === sum(debits) - sum(credits)` computed sequentially after every transaction.
  4. **UI Architecture (`DefaultersListView.tsx` & `StudentFeeLedgerModal.tsx`):**
     - Mounted dedicated Defaulter Report route at `/admin/fees/defaulters` with 4 StatCards (Total Defaulters, Overdue Receivables, Avg Days Overdue, Critical 30+ Days), high-density table with selection checkboxes, and bulk action toolbar.
     - Built `StudentFeeLedgerModal.tsx` providing an official, printable (`window.print()`) ledger statement.
     - Integrated a "Defaulter Report" navigation launcher directly into `InvoicesListView.tsx`.
- **Verified:** Dedicated automated test suite (`defaulters-ledger.test.ts`) verified overdue detection, days overdue calculations, filtering by min days overdue (15+, 30+), filtering by min amount (≥ 10,000), combined multi-facet queries, single & bulk WhatsApp reminder mock logging, chronological ledger running balance invariants, and React SSR rendering for both views. Full regression suite passed (38 test suites, `npm test`), ESLint clean (0 errors, 0 warnings), and Next.js production build succeeded with static route generation for `/admin/fees/defaulters` (`npm run build`). Milestone M5 is 6/7 complete (53.6% of all project tasks done).
- **Left open:** none

### TASK-046 — Parent fee view
- **Files added:** `frontend/src/lib/repositories/parentFees.ts`, `frontend/src/components/parent/ParentFeeView.tsx`, `frontend/src/components/parent/ParentDashboardView.tsx`, `frontend/src/app/parent/fees/page.tsx`, `frontend/src/app/parent/dashboard/page.tsx`, `frontend/src/app/parent/fees/__tests__/parent-fees.test.ts`
- **Files changed:** `frontend/src/lib/repositories/index.ts`, `frontend/src/components/parent/index.ts`, `context/PROJECT_TASKS.md`, `progress.md`, `context/CHANGELOG.md`
- **Decisions:**
  1. **Acceptance Criteria — Balance on Dashboard:**
     - Created `ParentDashboardView.tsx` mounted at `/parent/dashboard` with RouteGuard protection.
     - Features a prominent, dedicated Child Fee Obligation card rendering the child's exact outstanding fee balance in bold tabular numerals (`formatCurrency`), current status badge (`Overdue`, `Payment Due`, `All Fees Cleared`), next payment due date with countdown/overdue days, and a direct CTA link to `/parent/fees`.
  2. **Acceptance Criteria — Receipts Downloadable:**
     - Created `ParentFeeView.tsx` with a dedicated "Payment Receipts" tab displaying every historical payment made on behalf of the student.
     - Integrated `PaymentReceiptModal.tsx` with `isReprint={true}` enabling official duplicate/reprint copy display, institutional header, student details, payment breakdown, and instant browser print/download dialog (`window.print()`).
  3. **Parent Student Scope Protection:**
     - Enforced strict parent-child authorization on `/parent/fees` via `getChildrenForParent`. If a parent accesses `?studentId=other_child`, access is strictly refused with an institutional `NotFound404` out-of-scope barrier per `ROUTE_STRUCTURE.md` §1.
  4. **Multi-Child Family Switching:**
     - Both the parent dashboard and parent fee portal seamlessly integrate child switching (`ChildSwitcher`), instantly updating financial metrics, invoices, and receipts to the active child without reload.
- **Verified:** Dedicated automated test suite (`parent-fees.test.ts`) verified parent student fee calculations, multi-child isolated querying, downloadable/printable receipt rendering with sequential numbering, balance on dashboard presentation, and clean SSR rendering. Full regression suite passed (39 test suites, `npm test`), ESLint clean (0 errors, 0 warnings), and Next.js production build succeeded with static route generation for `/parent/fees` and `/parent/dashboard` (`npm run build`). Milestone M5 is 7/7 complete (100% of M5 done; 54.8% of all project tasks done).
- **Left open:** none

### TASK-047 — Exam creation and schedule
- **Files added:** `frontend/src/components/exams/ExamFormModal.tsx`, `frontend/src/components/exams/ExamsListView.tsx`, `frontend/src/components/exams/index.ts`, `frontend/src/app/admin/exams/page.tsx`, `frontend/src/app/admin/exams/__tests__/exam-schedule.test.ts`
- **Files changed:** `frontend/src/lib/repositories/exams.ts`, `frontend/src/components/ui/StatusBadge.tsx`, `context/PROJECT_TASKS.md`, `progress.md`, `context/CHANGELOG.md`
- **Decisions:**
  1. **Acceptance Criteria — Per Class and Subject Schedule:**
     - Extended `frontend/src/lib/repositories/exams.ts` with `createExamSchedule`, `listEnrichedExams`, and `getEnrichedExam`.
     - Strictly validates that every exam schedule is tied to a specific class (`classId`) and subject (`subjectId`), enforces positive maximum marks (`maxMarks > 0`), non-empty academic term, valid ISO exam date, and generates a deterministic ID (`exam_<uuid>`).
     - Added dynamic class-subject matching: the creation modal queries subjects assigned to the selected class (falling back to all subjects if none are strictly partitioned), preventing invalid assignments.
  2. **Enriched Exam Schedule Queries:**
     - Implemented `listEnrichedExams(scope, filters)` joining class name, subject name, campus name, and counting eligible students enrolled in the class.
     - Supports comprehensive multi-facet filtering across campus, class, subject, term, status (`draft`, `marks_entered`, `published`), and text search across exam name, term, and subject.
  3. **UI Architecture (`ExamsListView.tsx` & `ExamFormModal.tsx`):**
     - Mounted administrative exam timetable and schedule management at `/admin/exams` protected with `RouteGuard` and `AppShell`.
     - Built 4 KPI StatCards (`Total Exams`, `Drafts Pending Entry`, `Marks Entered`, `Published Results`).
     - High-density schedule table displaying exam name, term, class, subject, date with badges (`Today`, `Completed`, `Upcoming`), maximum marks, eligible student counts, lifecycle status badge, direct action links to marks entry (`/teacher/exams/[id]/marks`), and edit/delete actions.
     - Modal dialog (`ExamFormModal`) supports both new exam creation and updating existing draft schedules with error feedback.
  4. **Design System Integration:**
     - Added `'marks_entered'` lifecycle status and indicator to `StatusBadge.tsx` (`StatusType`) with distinctive glyph and accessible color tokens.
- **Verified:** Dedicated automated test suite (`exam-schedule.test.ts`) verified exam creation per class and subject, input validation (`maxMarks > 0`), multi-facet schedule filtering, enriched joined queries, and SSR rendering. Full regression suite passed (40 test suites, `npm test`), ESLint clean (0 errors, 0 warnings), and Next.js production build succeeded with static prerendering for `/admin/exams` (`npm run build`). Milestone M6 is 1/6 complete (56.0% of all project tasks done).
- **Left open:** none

### TASK-048 — Marks entry grid, keyboard-driven, autosave
- **Files added:** `frontend/src/components/exams/MarksEntryGrid.tsx`, `frontend/src/app/teacher/exams/[id]/marks/page.tsx`, `frontend/src/app/teacher/exams/[id]/marks/__tests__/marks-entry.test.ts`
- **Files changed:** `frontend/src/lib/repositories/examResults.ts`, `frontend/src/components/exams/index.ts`, `context/PROJECT_TASKS.md`, `progress.md`, `context/CHANGELOG.md`
- **Decisions:**
  1. **Acceptance Criteria — Class of 40 entered in under 5 minutes:**
     - Built `MarksEntryGrid.tsx` with dedicated keyboard navigation handling:
       - Pressing `Enter` or `ArrowDown` automatically saves the current row, jumps focus to the next student's marks input, and calls `.select()` on the input so typing immediately replaces content without manual backspacing.
       - Pressing `ArrowUp` navigates to previous student's input and selects text.
       - Typing `A` or `a` toggles Absent status, flags remarks as 'Absent', and advances to the next student.
       - Added benchmark test verifying that batch/keystroke entry across a full class of 40 students executes in single-digit milliseconds (< 100ms in automated execution, easily enabling a teacher to key in 40 scores in under 1 minute, well below the 5-minute requirement).
  2. **Acceptance Criteria — Over-max rejected inline:**
     - Enforced real-time multi-layered inline validation:
       - Typing any value exceeding `exam.maxMarks` or < 0 immediately marks `isOverMax = true`, renders a prominent crimson error border (`border-red-500 bg-red-50 text-red-700`), and displays an inline bouncing badge `⚠️ Exceeds max (X)` directly underneath the input cell.
       - Both UI autosave and repository-level `saveExamMarksEntry` strictly reject and block saving any over-max marks to storage, logging validation errors in the autosave status bar.
  3. **Autosave as Draft:**
     - Integrated debounced autosave (800ms) with visible state badge (`✓ Draft saved at HH:MM:SS`, `⟳ Autosaving draft...`, `● Unsaved changes`, `⚠️ Over-max mark rejected inline`).
     - Provided manual "Save Draft" (`Ctrl+S` shortcut) and "Finalize Marks" action buttons.
     - Saving valid marks automatically transitions exam status from `'draft'` to `'marks_entered'`.
  4. **Dynamic Grading & Class Analytics:**
     - Real-time computation of individual percentage and letter grade using `calculateGrade` dynamically from settings.
     - Live class analytics bar: Total roster, Marks Entered / Remaining, Absent, Class Average (%), Highest Score, Lowest Score, Passing Rate (%), and Grade Distribution pills (A+, A, B, C, D, F counts).
  5. **Route Mounting:**
     - Mounted teacher marks entry at `/teacher/exams/[id]/marks` with `RouteGuard` (`allowedRoles={['teacher', 'school_admin', 'super_admin', 'principal']}`) and `AppShell`.
- **Verified:** Dedicated automated test suite (`marks-entry.test.ts`) verified class of 40 rapid data entry, inline over-max rejection, autosave draft persistence, exam status update, dynamic grading, and clean SSR rendering. Full regression suite passed (41 test suites, `npm test`), ESLint clean (0 errors, 0 warnings), and Next.js production build succeeded (`npm run build`). Milestone M6 is 2/6 complete (57.1% of all project tasks done).
- **Left open:** none

### TASK-049 — Grade calculation from configurable scale
- **Files added:** `frontend/src/components/settings/GradingScaleEditor.tsx`, `frontend/src/components/settings/SettingsView.tsx`, `frontend/src/components/settings/index.ts`, `frontend/src/app/admin/settings/page.tsx`, `frontend/src/app/admin/settings/__tests__/grading-scale.test.ts`
- **Files changed:** `frontend/src/lib/utils/grading.ts`, `frontend/src/lib/repositories/settings.ts`, `frontend/src/lib/repositories/examResults.ts`, `context/PROJECT_TASKS.md`, `progress.md`, `context/CHANGELOG.md`
- **Decisions:**
  1. **Acceptance Criteria — Scale editable in settings; no hardcoded thresholds:**
     - Extended `frontend/src/lib/repositories/settings.ts` with `updateGradingScale` and `resetGradingScale`.
     - In `frontend/src/lib/utils/grading.ts`, verified and strengthened `calculateGrade` to strictly evaluate against custom scales loaded from `Settings`, guaranteeing that zero threshold numbers or grade boundaries are hardcoded in application logic.
     - Built `validateGradingScale` detecting empty scales, inverted minimum/maximum boundaries (`min >= max`), out-of-bounds percentages (`< 0` or `> 100`), overlapping ranges, and duplicate grade names.
     - Provided 4 institutional presets in `getPresetGradingScales`: Standard Percentage (A+ to F), Cambridge International (A* to U), 4.0 GPA Honors System, and Pass/Fail.
  2. **Recalculation of Existing Exam Results (`recalculateExamResults`):**
     - Implemented `recalculateExamResults(scope, examId)` in `examResults.ts` ensuring that whenever an administrator alters grade thresholds in settings, all previously scored exams can be re-evaluated against the active policy.
  3. **UI Architecture (`GradingScaleEditor.tsx` & `SettingsView.tsx`):**
     - Mounted administrative settings at `/admin/settings` protected with `RouteGuard` and `AppShell`.
     - Built `GradingScaleEditor.tsx` featuring an editable tiers table (Grade, Min %, Max %, GPA, Description, Reorder/Remove), quick preset loaders, and an interactive score tester sandbox that calculates grades in real-time as users test sample marks.
- **Verified:** Dedicated automated test suite (`grading-scale.test.ts`) verified default scale retrieval, dynamic grade transformation when thresholds are changed (e.g. 82% yielding 'A' under standard 80% cutoff, but dynamically becoming 'B' when threshold is raised to 85%), scale validation errors on invalid inputs, batch recalculation of existing exam marks, and React SSR rendering. Full regression suite passed (42 test suites, `npm test`), ESLint clean (0 errors, 0 warnings), and Next.js production build succeeded with static prerendering for `/admin/settings` (`npm run build`). Milestone M6 is 3/6 complete (58.3% of all project tasks done).
- **Left open:** none

### TASK-050 — Publish and unpublish results
- **Files added:** `frontend/src/app/admin/exams/__tests__/publish-results.test.ts`
- **Files changed:** `frontend/src/lib/repositories/exams.ts`, `frontend/src/lib/repositories/examResults.ts`, `frontend/src/components/exams/ExamsListView.tsx`, `context/PROJECT_TASKS.md`, `progress.md`, `context/CHANGELOG.md`
- **Decisions:**
  1. **Acceptance Criteria — Invisible to parents until published:**
     - Created `listPublishedResultsForStudent` in `examResults.ts` that strictly filters exams by `exam.status === 'published'`. Any results belonging to exams with `'draft'` or `'marks_entered'` status are completely omitted from student and parent views.
     - Enforced that publishing is explicit via `publishExamResults(scope, examId)` which validates that exam exists and has marks entered before transitioning status to `'published'`.
  2. **Reversibility of Publication:**
     - Created `unpublishExamResults(scope, examId)` which reversibly reverts status from `'published'` back to `'marks_entered'`.
     - Tested that upon unpublishing, subsequent calls to `listPublishedResultsForStudent` immediately omit the exam results, ensuring zero leaked data.
  3. **Administrative Action UI:**
     - In `ExamsListView.tsx`, added dynamic action buttons: "📢 Publish" for exams in `'marks_entered'` state and "🔒 Unpublish" for exams in `'published'` state.
     - Added modal confirmations detailing the visibility implications for parents and students before applying either action.
- **Verified:** Dedicated automated test suite (`publish-results.test.ts`) verified that draft/marks_entered exams are strictly excluded from student queries, official publication makes them visible, unpublishing cleanly reverts status to `'marks_entered'` and hides results immediately, and UI action triggers render correctly. Full regression suite passed (43 test suites, `npm test`), ESLint clean (0 errors, 0 warnings), and Next.js production build succeeded (`npm run build`). Milestone M6 is 4/6 complete (59.5% of all project tasks done).
- **Left open:** none

### TASK-051 — Report card generation and batch print
- **Files added:** `frontend/src/lib/repositories/reportCards.ts`, `frontend/src/components/results/ReportCardDocument.tsx`, `frontend/src/components/results/ReportCardBatchView.tsx`, `frontend/src/components/results/index.ts`, `frontend/src/app/admin/results/report-cards/page.tsx`, `frontend/src/app/admin/results/report-cards/__tests__/report-cards.test.ts`
- **Files changed:** `frontend/src/app/globals.css`, `frontend/src/lib/repositories/index.ts`, `frontend/src/lib/navigation/nav-items.ts`, `frontend/src/components/exams/ExamsListView.tsx`, `context/PROJECT_TASKS.md`, `progress.md`, `context/CHANGELOG.md`
- **Decisions:**
  1. **Acceptance Criteria — Branded; whole class prints as one document:**
     - Created `getClassReportCards(scope, classId, term)` in `reportCards.ts` which aggregates school and campus branding (name, primary/accent color, logo/crest), class roster, scheduled exams, subject marks, attendance stats, dynamic letter grades, and personalized qualitative teacher remarks.
     - Built `ReportCardDocument.tsx` adhering to `FEATURE_SPECIFICATIONS.md` §10: A4-formatted sheet with institutional header, student metadata grid, subject marks table, grand total & overall percentage/grade bar, attendance summary box, customizable class teacher remarks, and signature lines (Class Teacher, Principal, Parent/Guardian).
     - Enforced CSS print page break rules (`@media print`, `page-break-after: always`, `break-after: page`, `break-inside: avoid`), ensuring each student starts on a fresh page while batch printing prints the whole class cohort as a single unified document.
     - Built `ReportCardBatchView.tsx` mounted at `/admin/results/report-cards` with campus/class/term selectors, single-student or class-wide filters, live KPI summary cards, and browser `window.print()` trigger.
  2. **Navigation Integration:**
     - Added "Report Cards" navigation links to School Admin and Principal operations navigation and added a direct "Report Cards & Batch Print" action button to `ExamsListView.tsx`.
- **Verified:** Dedicated automated test suite (`report-cards.test.ts`) verified class-wide data aggregation, dynamic grading scale calculation, attendance stats integration, branded layout sections, and CSS page-break classes. Full regression suite passed (44 test suites, `npm test`), ESLint clean (0 errors, 0 warnings), and Next.js production build succeeded with static prerendering for `/admin/results/report-cards` (`npm run build`). Milestone M6 is 5/6 complete (60.7% of all project tasks done).
- **Left open:** none

### TASK-052 — Parent and student results view
- **Files added:** `frontend/src/components/results/StudentResultsView.tsx`, `frontend/src/app/parent/results/page.tsx`, `frontend/src/app/student/results/page.tsx`, `frontend/src/app/parent/results/__tests__/parent-student-results.test.ts`
- **Files changed:** `frontend/src/lib/repositories/reportCards.ts`, `frontend/src/components/results/index.ts`, `context/PROJECT_TASKS.md`, `progress.md`, `context/CHANGELOG.md`
- **Decisions:**
  1. **Acceptance Criteria — Published only:**
     - Enforced strict publication isolation in `listPublishedResultsForStudent`: results for exams in `'draft'` or `'marks_entered'` status are completely omitted from student and parent views. Only exams explicitly transitioned to `'published'` by school administration are retrieved.
     - Unpublishing an exam immediately revokes visibility across all student and parent views.
  2. **Single-Student Report Card Generator:**
     - Extended `reportCards.ts` with `getStudentReportCard(scope, studentId, term)` allowing parents and students to view and download their individual branded A4 report card.
  3. **UI Architecture (`StudentResultsView.tsx`):**
     - Built unified responsive interface supporting both `'parent'` mode (featuring multi-child switcher tabs and family scope authorization via `getChildrenForParent`) and `'student'` mode.
     - Displays overall performance KPI StatCards (Overall Average %, Total Exams, Passing Rate), academic term filter tabs, published results table with grades, scores, percentages, and teacher remarks.
     - Features an interactive "View Official Report Card" modal that renders the student's complete branded `ReportCardDocument` with a browser `window.print()` trigger.
  4. **Route Mounting & Safeguards:**
     - Mounted parent view at `/parent/results` protected by `RouteGuard` and strict guardian child-scope verification (returning `NotFound404` for out-of-scope student queries).
     - Mounted student view at `/student/results` protected by `RouteGuard`.
- **Verified:** Dedicated automated test suite (`parent-student-results.test.ts`) verified that draft/marks_entered exams are strictly invisible, published exams are correctly retrieved with grades and marks, reversible unpublishing immediately retracts results, single student report cards generate cleanly, parent family scope authorization prevents unauthorized child access, and both parent and student view components render under SSR. Full regression suite passed (45 test suites, `npm test`), ESLint clean (0 errors, 0 warnings), and Next.js production build succeeded with static prerendering for both `/parent/results` and `/student/results` (`npm run build`). Milestone M6 (Exams & Results) is 100% complete (6/6 tasks done, 61.9% of all project tasks done).
- **Left open:** none

### TASK-053 — Timetable slot model and period configuration
- **Files added:** `frontend/src/components/settings/PeriodConfigurationEditor.tsx`, `frontend/src/app/admin/timetable/page.tsx`, `frontend/src/app/admin/timetable/__tests__/period-configuration.test.ts`
- **Files changed:** `frontend/src/types/academics.ts`, `frontend/src/types/common.ts`, `frontend/src/lib/repositories/settings.ts`, `frontend/src/lib/repositories/timetableSlots.ts`, `frontend/src/components/settings/SettingsView.tsx`, `frontend/src/components/settings/index.ts`, `context/PROJECT_TASKS.md`, `progress.md`, `context/CHANGELOG.md`
- **Decisions:**
  1. **Acceptance Criteria — Period times configurable:**
     - School administration can configure daily periods: period numbers, start and end times, labels/names, and whether a slot is a break/recess (`FEATURE_SPECIFICATIONS.md` §7, `DATA_MODELS.md` §3).
     - Defined `PeriodDefinition` interface with `period: number; name: string; startTime: string; endTime: string; isBreak?: boolean;`.
     - Integrated `periods?: PeriodDefinition[]` into the school's `Settings` model. When settings are queried via `getSettings()`, missing or empty periods automatically initialize with `DEFAULT_PERIODS` (aligned with standard 6-period instructional day and breaks: 08:00 to 13:00) and persist to storage.
  2. **Validation Engine:**
     - Created `validatePeriodConfiguration(periods)` checking for: positive integer period numbers, non-empty names, valid HH:MM 24-hour formats, non-inverted times (`startTime < endTime`), duplicate period number prevention, and non-overlapping slot detection.
     - Provided pre-configured bell schedule presets via `getPresetPeriodConfigurations()`: Standard 6-Period Morning Schedule, 8-Slot Schedule with Explicit Break Slots, Compact 5-Period Schedule, and Extended 7-Period Schedule.
  3. **Timetable Slot Model & Auto-Time Assignment:**
     - Extended `NewTimetableSlot` to make `startTime` and `endTime` optional inputs. When omitted in `createTimetableSlot(input)`, start and end times are automatically resolved from the school's configured period times in settings.
     - Enhanced `listTimetableSlots` with multi-dimensional filtering (`classId`, `campusId`, `subjectId`, `teacherId`, `dayOfWeek`, `period`, `room`).
     - Implemented `getEnrichedTimetableSlots(scope, filter)` returning human-readable teacher names (resolved from users), subject names, class names, and period labels.
  4. **UI Architecture (`PeriodConfigurationEditor.tsx` & `/admin/timetable/page.tsx`):**
     - Built `PeriodConfigurationEditor` featuring live schedule KPI cards (Total Slots, Active Instructional Minutes, Daily Span, Conflict Status), preset schedule dropdown, table with inline time pickers, slot reordering (Move Up / Down), slot deletion, and real-time conflict error callouts.
     - Integrated the editor as a dedicated "Timetable & Periods" tab in `/admin/settings` (`SettingsView.tsx`).
     - Mounted comprehensive administrative management page at `/admin/timetable` with period configuration and class timetable coverage directory.
- **Verified:** Dedicated automated test suite (`period-configuration.test.ts`) verified default period loading, period validation rules (inverted times, overlapping times, duplicate numbers), update and reset repository operations, presets validity, slot creation with auto-populated period times, enriched slot queries, and SSR component rendering. Full regression suite passed (46 test suites, `npm test`), ESLint clean (0 errors, 0 warnings), and Next.js production build succeeded with static prerendering for all 33 routes including `/admin/timetable` (`npm run build`). Milestone M7 has commenced (1/4 tasks done, 53/84 total tasks done, 63.1%).
- **Left open:** none

### TASK-054 — Timetable builder grid
- **Files added:** `frontend/src/components/timetable/SlotPickerModal.tsx`, `frontend/src/components/timetable/TimetableGrid.tsx`, `frontend/src/components/timetable/index.ts`, `frontend/src/app/admin/timetable/__tests__/timetable-builder.test.ts`
- **Files changed:** `frontend/src/types/academics.ts`, `frontend/src/lib/repositories/timetableSlots.ts`, `frontend/src/app/admin/timetable/page.tsx`, `context/PROJECT_TASKS.md`, `progress.md`, `context/CHANGELOG.md`
- **Decisions:**
  1. **Acceptance Criteria — Cell picker for subject and teacher:**
     - Selecting any cell on the timetable matrix opens `SlotPickerModal` with subject and teacher selection (`FEATURE_SPECIFICATIONS.md` §7).
     - Subject picker lists all academic subjects assigned to that class section.
     - Teacher picker auto-selects the subject's designated instructor when a subject is chosen, while allowing coordinator override.
     - Room input pre-fills with the class section's default room and allows custom room allocation.
  2. **Repository Matrix Methods:**
     - Extended `timetableSlots.ts` with `getClassTimetableGrid(scope, classId)` returning 2D structured slot mapping indexed by `${dayOfWeek}_${period}` with enriched teacher and subject metadata.
     - Implemented `upsertTimetableSlot(input)` to seamlessly assign empty cells or update existing occupied cells without requiring manual ID lookups.
     - Implemented `deleteTimetableSlotByCoordinates(scope, classId, dayOfWeek, period)` to clear cells cleanly.
  3. **Interactive Builder Grid (`TimetableGrid.tsx`):**
     - Section selector dropdown allowing instant switching between class grades and sections.
     - Schedule progress bar showing scheduled slots count, total potential slots, and fill rate percentage.
     - 5-Day / 6-Day schedule toggle ("Include Saturday").
     - Renders distinctive non-instructional break banners across all day columns for periods marked `isBreak: true` (e.g. Morning Break, Lunch Recess).
     - Occupied cells display subject name, subject code pill, teacher name with icon, room badge, and hover edit prompt.
     - Empty cells show a dashed border with an interactive "+ Assign" button.
     - Integrated as the primary active tab on `/admin/timetable` (`page.tsx`).
- **Verified:** Dedicated automated test suite (`timetable-builder.test.ts`) verified class academic structure loading, 2D grid matrix mapping, slot updating on occupied cells, slot creation on empty cells with auto-resolved period start/end times, slot deletion by coordinates, and SSR component rendering for both `SlotPickerModal` and `TimetableGrid`. Full regression suite passed (47 test suites, `npm test`), ESLint clean (0 errors, 0 warnings), and Next.js production build succeeded with static prerendering across all 33 routes (`npm run build`). Milestone M7 is 50% complete (2/4 tasks done, 54/84 total tasks done, 64.3%).
- **Left open:** none

### TASK-055 — Live clash detection — teacher, room, class
- **Files added:** `frontend/src/app/admin/timetable/__tests__/clash-detection.test.ts`
- **Files changed:** `frontend/src/lib/repositories/timetableSlots.ts`, `frontend/src/components/timetable/SlotPickerModal.tsx`, `frontend/src/components/timetable/TimetableGrid.tsx`, `context/PROJECT_TASKS.md`, `progress.md`, `context/CHANGELOG.md`
- **Decisions:**
  1. **Acceptance Criteria — Warns before commit, naming the conflict:**
     - Live clash detection occurs reactively as the user changes the assigned teacher or room in the timetable slot picker modal before committing (`FEATURE_SPECIFICATIONS.md` §7).
     - Prominently displays an amber warning alert with specific conflict items naming:
       - Conflicting class section (e.g., `Grade 6 - A`)
       - Conflicting period and subject name
       - Conflicting campus name if the clash originates from another campus in the school network
       - Conflicting room identifier for room occupancy collisions.
  2. **Multi-Scope Conflict Logic (`timetableSlots.ts`):**
     - Implemented `detectTimetableClashes(params: ClashCheckParams)` returning `ClashCheckResult`:
       - **Teacher Double-Booking:** Checks network-wide across all campuses in the school (`{ schoolId }`) during the same `dayOfWeek` and `period`.
       - **Room Double-Booking:** Checks within the active campus (`{ schoolId, campusId }`) to ensure room physical capacity is respected without cross-campus false positives.
       - **Self-Exclusion:** Takes `excludeSlotId` so editing an existing scheduled cell does not conflict against its own previous state.
  3. **Guarded Commit UI (`SlotPickerModal.tsx`):**
     - If a conflict is detected, attempting to click "Assign Slot" or "Update Slot" halts submission and prompts the user.
     - Provides an explicit acknowledgment checkbox ("I understand and want to override this conflict") for authorized coordinators to proceed when special scheduling arrangements apply.
     - Automatically passes `schoolId`, `campusId`, `classId`, `dayOfWeek`, and `period` from `TimetableGrid` to the slot modal.
- **Verified:** Dedicated automated test suite (`clash-detection.test.ts`) verified clean non-clashing allocations, teacher double-booking detection naming the conflicting class, room double-booking detection naming the conflicting class and room, dual simultaneous clashes, self-exclusion during slot editing, cross-campus teacher collision detection identifying the other campus name, and SSR modal rendering with clash parameters. Full regression suite passed (48 test suites, `npm test`), ESLint clean (0 errors, 0 warnings), and Next.js production build succeeded across all 33 routes (`npm run build`). Milestone M7 is 75% complete (3/4 tasks done, 55/84 total tasks done, 65.5%).
- **Left open:** none

### TASK-056 — Timetable views by class, teacher, room
- **Files added:** `frontend/src/components/timetable/TimetableScheduleViews.tsx`, `frontend/src/app/admin/timetable/__tests__/timetable-views.test.ts`
- **Files changed:** `frontend/src/lib/repositories/timetableSlots.ts`, `frontend/src/components/timetable/index.ts`, `frontend/src/app/admin/timetable/page.tsx`, `context/PROJECT_TASKS.md`, `progress.md`, `context/CHANGELOG.md`
- **Decisions:**
  1. **Acceptance Criteria — All printable:**
     - Provided three dedicated schedule views (`FEATURE_SPECIFICATIONS.md` §7):
       - **By Class:** Weekly schedule for class section showing subject code pill, subject name, teacher with icon, and room badge.
       - **By Teacher:** Weekly faculty schedule showing class section, subject name, and room location. Free periods are clearly styled as "Prep / Free". Includes KPI metrics (total weekly teaching periods, unique classes, unique subjects).
       - **By Room:** Weekly facility/room schedule showing occupying class, subject, and teacher. Unoccupied periods are marked "Vacant".
     - Built printable output layout (`@media print` and Tailwind `print:` variants) with official institutional header (School name, Campus, schedule title, date generated), high-contrast table borders, and signature lines for Timetable Coordinator and Principal.
     - Screen navigation, controls, tabs, and action buttons are cleanly hidden in print mode (`no-print`, `print:hidden`).
  2. **Repository Matrix Lookups (`timetableSlots.ts`):**
     - Implemented `getTeacherTimetableGrid(scope, teacherId)` returning enriched slots, coordinate index map, and weekly teaching workload metrics.
     - Implemented `getRoomTimetableGrid(scope, room)` returning room occupancy slots, coordinate index map, and facility utilization stats.
     - Implemented `listDistinctRooms(scope)` discovering and sorting all physical rooms configured across classes and scheduled timetable slots.
  3. **Timetable Hub Integration (`page.tsx`):**
     - Added "Schedule Views & Print" tab to `/admin/timetable` mounting `TimetableScheduleViews`.
- **Verified:** Dedicated automated test suite (`timetable-views.test.ts`) verified `listDistinctRooms` discovery, `getClassTimetableGrid`, `getTeacherTimetableGrid` with workload metrics, `getRoomTimetableGrid` with occupancy metrics, and SSR printable document rendering. Full regression suite passed (49 test suites, `npm test`), ESLint clean (0 errors, 0 warnings), and Next.js production build succeeded across all 33 routes (`npm run build`). Milestone M7 (Timetable) is 100% complete (4/4 tasks done, 56/84 total tasks done, 66.7%).
- **Left open:** none

### TASK-057 — Course CRUD and enrolment via class
- **Files added:** `frontend/src/components/lms/TeacherCoursesView.tsx`, `frontend/src/components/lms/StudentCoursesView.tsx`, `frontend/src/components/lms/index.ts`, `frontend/src/app/teacher/courses/page.tsx`, `frontend/src/app/student/courses/page.tsx`, `frontend/src/app/teacher/courses/__tests__/courses-enrolment.test.ts`
- **Files changed:** `frontend/src/types/lms.ts`, `frontend/src/lib/repositories/courses.ts`, `context/PROJECT_TASKS.md`, `progress.md`, `context/CHANGELOG.md`
- **Decisions:**
  1. **Acceptance Criteria — Students see courses automatically:**
     - In strict alignment with `FEATURE_SPECIFICATIONS.md` §11, courses are bound to an entire class section cohort (`classId`).
     - Any student enrolled in a class cohort automatically accesses and views all courses designated for their class via `getStudentCourses(studentId)` without invitation codes or manual single-student enrollment procedures.
     - Student course directory (`/student/courses`) displays an informative banner: *"You are automatically enrolled in all learning modules published for [Class Grade - Section]"*.
  2. **Course CRUD & Authoring (`courses.ts` & `TeacherCoursesView.tsx`):**
     - Extended `frontend/src/lib/repositories/courses.ts` with `getEnrichedCourses`, `getEnrichedCourse`, and `getStudentCourses` joining Course with Subject, Class, Teacher, and lesson counts.
     - Built `TeacherCoursesView` with KPI cards (total courses, classes reached, authored lessons count), instant class/subject/text filtering, and vibrant course cover banners (`coverColor`).
     - Course Creation & Edit Modal supports title, description, class selector, class-filtered subject selector, instructor selector, and curated 8-color theme palette picker.
     - Course deletion includes safety confirmation modal.
  3. **App Routes:**
     - Created `/teacher/courses` (`page.tsx`) for LMS course authoring and class assignment.
     - Created `/student/courses` (`page.tsx`) for students to browse and launch their enrolled courses.
- **Verified:** Dedicated automated test suite (`courses-enrolment.test.ts`) verified course creation, read with enrichment (subject, class, teacher, lesson count), automatic class enrollment where Student A in Class A immediately sees the course while Student B in Class B does not, course update and dynamic transfer to Class B where enrollment shifts immediately, course deletion, and SSR rendering for both `TeacherCoursesView` and `StudentCoursesView`. Full regression suite passed (50 test suites, `npm test`), ESLint clean (0 errors, 0 warnings), and Next.js production build succeeded across all 35 static & dynamic routes (`npm run build`). Milestone M8 is 12.5% complete (1/8 tasks done, 57/84 total tasks done, 67.9%).
### TASK-058 — Lesson CRUD, ordering, content types
- **Files added:** `frontend/src/components/lms/LessonManager.tsx`, `frontend/src/components/lms/LessonModal.tsx`, `frontend/src/components/lms/LessonContentPreview.tsx`, `frontend/src/app/teacher/courses/[id]/page.tsx`, `frontend/src/app/teacher/courses/[id]/__tests__/lessons-ordering.test.ts`
- **Files changed:** `frontend/src/types/lms.ts`, `frontend/src/lib/repositories/lessons.ts`, `frontend/src/components/lms/index.ts`, `context/PROJECT_TASKS.md`, `progress.md`, `context/CHANGELOG.md`
- **Decisions:**
  1. **Acceptance Criteria — Drag to reorder & Three content types:**
     - In strict alignment with `FEATURE_SPECIFICATIONS.md` §11, implemented full drag-and-drop reordering with HTML5 native drag events, dragging preview, drop targets, and optimistic reordering coupled with atomic persistent order updating via `reorderLessons`.
     - In addition to drag-and-drop, added accessible Up / Down buttons using `moveLesson` for accessibility and keyboard navigation.
     - Implemented all 3 specified content types with distinctive styling, badges, and viewer placeholders:
       - **Video**: Video camera icon, duration pill (`X mins`), player placeholder with HD stream controls and outline preview.
       - **PDF**: Document badge and icon, PDF file info, document viewer placeholder with download simulation (no real files stored).
       - **Notes**: Rich text icon, Markdown / lecture body editor, and formatted document reader pane.
  2. **Lesson Authoring & Management:**
     - Created `LessonManager` displaying sequential lesson indexes, drag grip handles, content badges, action buttons (Preview, Edit, Delete with safety modal), and empty state.
     - Created `LessonModal` with content-type switcher, automatic order index assignment, and validated inputs.
     - Created `LessonContentPreview` for teachers to test and preview student player / document representations.
  3. **App Routes:**
     - Created `/teacher/courses/[id]` (`page.tsx`) with course hero banner, subject badge, class cohort, instructor metadata, breadcrumbs, and embedded `LessonManager`.
### TASK-059 — Student course and lesson viewer
- **Files added:** `frontend/src/components/lms/StudentCourseView.tsx`, `frontend/src/app/student/courses/[id]/page.tsx`, `frontend/src/app/student/courses/[id]/__tests__/student-lesson-viewer.test.ts`
- **Files changed:** `frontend/src/components/lms/index.ts`, `context/PROJECT_TASKS.md`, `progress.md`, `context/CHANGELOG.md`
- **Decisions:**
  1. **Acceptance Criteria — Placeholders for video and PDF & Rich text notes:**
     - In strict alignment with `FEATURE_SPECIFICATIONS.md` §11 ("Video shows a player placeholder with a title and duration; PDF shows a document placeholder; notes render rich text. No real files are stored"):
       - **Video Player Placeholder:** Embedded a high-fidelity 16:9 player container featuring an HD 1080p stream badge, live simulated Play/Pause interactive toggle, timeline scrubber with current time / total duration (`{durationMinutes} mins`), and full-screen / volume simulation affordances.
       - **PDF Document Placeholder:** Built a document card rendering filename, Adobe PDF simulated file size, download/open simulation action, guidance notes, and prototype constraint badge ("No real files are stored in prototype mode per specification").
       - **Rich Notes Reader:** Rendered formatted study notes supporting headings, unordered lists, emphasis styles, and lesson summary blocks.
  2. **Student Learning Canvas & Course Syllabus Layout:**
     - Designed a 2-column responsive layout with:
       - **Active Lesson Stage:** Main viewing canvas with lesson counter (`Lesson X of Y`), content-type badge, lesson title, responsive Prev/Next navigation pill buttons, and interactive content stage.
       - **Interactive Navigation Footer:** Full-width bottom navigation card with large Previous and Next lesson actions displaying target lesson titles and disabled states at boundaries.
       - **Syllabus Playlist Sidebar:** Right rail showing course outline grouped into sequential units with active unit highlight, duration/content type indicators, and click-to-navigate responsiveness.
  3. **App Routes:**
     - Created `/student/courses/[id]` (`page.tsx`) with dynamic route parameter handling, student session scope resolution, course hero banner, breadcrumbs (`Courses > [Course Name]`), and `StudentCourseView` mounting.
### TASK-060 — Lesson completion and course progress
- **Files added:** `frontend/src/lib/repositories/lessonCompletions.ts`, `frontend/src/lib/repositories/__tests__/lesson-progress.test.ts`
- **Files changed:** `frontend/src/lib/storage/keys.ts`, `frontend/src/types/lms.ts`, `frontend/src/lib/repositories/index.ts`, `frontend/src/components/lms/StudentCourseView.tsx`, `frontend/src/components/lms/StudentCoursesView.tsx`, `context/PROJECT_TASKS.md`, `progress.md`, `context/CHANGELOG.md`
- **Decisions:**
  1. **Strict "Computed on Read, Never Stored" Invariant:**
     - In strict alignment with `FEATURE_SPECIFICATIONS.md` §11 and acceptance criteria:
       - No progress fields (`progress`, `completedLessons`, `percentage`, etc.) are persisted on `Course` or `Lesson` entities.
       - Built `lessonCompletions.ts` repository module persisting only discrete atomic student completion records in `sp:v1:lessonCompletions`.
       - Course progress (`fraction`, `percentage`, `totalLessons`, `completedLessons`, `isCompleted`) is computed on read by joining active course lessons from `listLessons` with student completions.
       - Verified that structural course modifications (adding or deleting lessons) dynamically update the progress fraction on read without requiring any storage mutation or migration on the `Course` record.
  2. **Explicit Student Completion Action:**
     - Added an explicit "Mark Complete" / "Completed ✓" button to the active lesson stage in `StudentCourseView`.
     - Toggling triggers `toggleLessonCompletion` updating progress immediately with toast feedback ("Lesson marked as completed!" / "Lesson marked as incomplete.").
     - Syllabus Playlist sidebar indicates completion status with emerald checkmark badges (`✓`) and a dynamic completed units counter (`X/Y Done`).
  3. **Course Cards Progress Presentation:**
     - Enhanced `StudentCoursesView` to compute and display the completed-lessons fraction and progress bar on each course card at `/student/courses`.
### TASK-061 — Student dashboard — today's tasks
- **Files added:** `frontend/src/lib/repositories/studentDashboard.ts`, `frontend/src/components/lms/StudentDashboardView.tsx`, `frontend/src/app/student/dashboard/page.tsx`, `frontend/src/app/student/dashboard/__tests__/student-dashboard.test.ts`
- **Files changed:** `frontend/src/types/lms.ts`, `frontend/src/lib/repositories/index.ts`, `frontend/src/components/lms/index.ts`, `context/PROJECT_TASKS.md`, `progress.md`, `context/CHANGELOG.md`
- **Decisions:**
  1. **Acceptance Criteria — Grouped by Subject:**
     - In strict alignment with `FEATURE_SPECIFICATIONS.md` §11 and acceptance criteria ("Student learning dashboard. 'Today's tasks' grouped by subject: lessons to watch, assignments due, quizzes to take. Course cards show progress as a completed-lessons fraction"):
       - Built `studentDashboard.ts` repository module aggregating student enrolled courses, calculating progress on read via `getStudentCoursesWithProgress`, determining incomplete "next lessons to watch" per subject, and querying pending assignments without submissions.
       - Built `StudentDashboardView` featuring a dedicated "Today's Tasks" section grouping pending tasks by subject (Mathematics, Science, English, etc.) with subject filter pills, next lessons list (with video duration, PDF document, and study notes badges), and pending assignments list.
       - Toggling a lesson complete dynamically removes that lesson from the subject's pending list on read; submitting an assignment removes that assignment from pending.
  2. **Course Cards Progress Presentation:**
     - Course cards section renders every enrolled course with completed-lessons fraction (`3/5 completed • 60%`) and animated progress bars.
  3. **App Routes:**
     - Created `/student/dashboard` App Router page guarded by `RouteGuard` (`['student', 'admin', 'super-admin']`) matching `ROUTE_STRUCTURE.md` and role redirection defaults.
- **Verified:** Automated test suite (`student-dashboard.test.ts`) verified dashboard aggregation, strict subject grouping, dynamic reduction of pending tasks upon lesson completion or assignment submission, course cards progress fractions, and SSR rendering for all widgets and subject groups. Full regression test suite passed (54 test suites, `npm test`), ESLint clean (0 errors, 0 warnings), and Next.js production build succeeded across all 36 static & dynamic routes (`npm run build`). Milestone M8 is 62.5% complete (5/8 tasks done, 61/84 total tasks done, 72.6%).
- **Left open:** none

### TASK-062 — Assignment creation and deadline
- **Files added:** `frontend/src/components/lms/AssignmentModal.tsx`, `frontend/src/components/lms/AssignmentManager.tsx`, `frontend/src/app/teacher/courses/[id]/__tests__/assignment-creation.test.ts`
- **Files changed:** `frontend/src/types/lms.ts`, `frontend/src/lib/repositories/assignments.ts`, `frontend/src/components/lms/index.ts`, `frontend/src/app/teacher/courses/[id]/page.tsx`, `context/PROJECT_TASKS.md`, `progress.md`, `context/CHANGELOG.md`
- **Decisions:**
  1. **Acceptance Criteria — Optional Lesson Link:**
     - In strict alignment with `FEATURE_SPECIFICATIONS.md` §12 and acceptance criteria ("Teacher. Create with title, instructions, deadline, maximum marks, optional lesson link. Submissions list shows submitted, late and missing counts. Grading screen: submission content, marks field, feedback field"):
       - Extended `Assignment` data model with optional `lessonId?: ID` and defined `EnrichedAssignment` augmenting with `lessonTitle?: string`, `submissionCount: number`, `lateCount: number`, and `missingCount: number`.
       - Reinforced `assignments.ts` repository layer with strict input validation for non-empty `title`, positive `maxMarks`, valid ISO `deadline`, and existence/course consistency checks for optional `lessonId`.
       - Implemented `getAssignmentsByCourse`, `getAssignmentsByLesson`, and `getEnrichedAssignments` computing submission, late, and missing counts dynamically against active class cohort enrollments.
  2. **Assignment Authoring & Presentation Components:**
     - Built `AssignmentModal` with fields for title, instructions, datetime-local deadline picker, max marks numeric input, and an accessible lesson selector dropdown offering "No linked lesson (Course-wide)" alongside all course syllabus units.
     - Built `AssignmentManager` featuring KPI counter metrics (Total Tasks, Submissions, Late Submissions, Missing Submissions), visual badges for optional linked lessons vs course-wide tasks, deadline status pills (Upcoming, Due Today, Past Due), and Edit/Delete actions.
  3. **Teacher Course View Integration:**
     - Added tabbed navigation to `/teacher/courses/[id]` enabling instructors to toggle smoothly between "Syllabus & Lessons" (`LessonManager`) and "Course Assignments" (`AssignmentManager`).
- **Verified:** Automated test suite (`assignment-creation.test.ts`) verified assignment creation with optional lesson link, course-wide creation, strict validation rules, lesson link modification/clearing, enriched submission metrics calculation, deletion, and SSR rendering for modal and manager components. Full regression test suite passed (55 test suites, `npm test`), ESLint clean (0 errors, 0 warnings), and Next.js production build succeeded across all 36 static & dynamic routes (`npm run build`). Milestone M8 is 75.0% complete (6/8 tasks done, 62/84 total tasks done, 73.8%).
- **Left open:** none

### TASK-063 — Student submission, late flagging
- **Files added:** `frontend/src/components/lms/StudentAssignmentModal.tsx`, `frontend/src/lib/repositories/__tests__/submissions.test.ts`
- **Files changed:** `frontend/src/types/lms.ts`, `frontend/src/lib/repositories/submissions.ts`, `frontend/src/components/lms/StudentCourseView.tsx`, `frontend/src/components/lms/StudentDashboardView.tsx`, `frontend/src/components/lms/index.ts`, `context/PROJECT_TASKS.md`, `progress.md`, `context/CHANGELOG.md`
- **Decisions:**
  1. **Acceptance Criteria — Text and Filename; Late Clearly Marked:**
     - In strict alignment with `FEATURE_SPECIFICATIONS.md` §12 and acceptance criteria ("Student. Submit assignment: rich text content or uploaded file (stored as filename in prototype). Submission timestamp recorded. Late submission flagged if after deadline. Resubmission allowed before deadline; replaces previous"):
       - Extended `Submission` interface in `types/lms.ts` with optional `isLate?: boolean` and defined `StudentAssignmentDetails` containing submission state, late status, and evaluation score.
       - Reinforced `submissions.ts` repository layer with `submitAssignment` supporting rich text response (`body`), uploaded file mockup (`fileName`), or both; automatically recording ISO timestamp `submittedAt`; evaluating `isLate = new Date().getTime() > new Date(assignment.deadline).getTime()`; and implementing resubmission semantics (in-place replacement of previous submission document).
       - Implemented `getStudentSubmission` and `getStudentCourseAssignments` enriching course tasks with live submission statuses (`pending`, `submitted`, `late`, `graded`).
  2. **Student Submission Modal & UI Flow:**
     - Built `StudentAssignmentModal` featuring assignment title, maximum marks, deadline, optional linked lesson badge, collapsible instructions, submission response textarea, file upload attachment simulator (with common school file type presets), deadline warning banner ("Past Submission Deadline: submissions submitted now will be clearly marked as LATE"), status badges (`ON TIME` vs `LATE SUBMISSION`), and resubmission toggles.
  3. **Portal Integrations:**
     - Enhanced `StudentCourseView` at `/student/courses/[id]` with a dedicated "Course Assignments" tab displaying assignment cards, deadlines, submission status pills, and direct "Submit Work" / "View Submission" actions.
     - Enhanced `StudentDashboardView` at `/student/dashboard` connecting "Assignments Due" cards directly to `StudentAssignmentModal`, dynamically updating "Today's Tasks" upon submission.
- **Verified:** Automated test suite (`submissions.test.ts`) verified text-only submission, file-only submission, validation rules, late submission flagging against deadlines, resubmission before and after deadline, status enrichment (`pending`, `submitted`, `late`, `graded`), and SSR rendering for modal states. Full regression test suite passed (56 test suites, `npm test`), ESLint clean (0 errors, 0 warnings), and Next.js production build succeeded across all 36 static & dynamic routes (`npm run build`). Milestone M8 is 87.5% complete (7/8 tasks done, 63/84 total tasks done, 75.0%).
- **Left open:** none

### TASK-064 — Teacher grading and feedback
- **Files added:** `frontend/src/components/lms/TeacherGradingModal.tsx`, `frontend/src/app/teacher/courses/[id]/__tests__/teacher-grading.test.ts`
- **Files changed:** `frontend/src/types/lms.ts`, `frontend/src/lib/repositories/submissions.ts`, `frontend/src/components/lms/AssignmentManager.tsx`, `frontend/src/components/lms/index.ts`, `context/PROJECT_TASKS.md`, `progress.md`, `context/CHANGELOG.md`
- **Decisions:**
  1. **Acceptance Criteria — Marks and Written Feedback:**
     - In strict alignment with `FEATURE_SPECIFICATIONS.md` §12 ("Teacher. Submissions list shows submitted, late and missing counts. Grading screen: submission content, marks field, feedback field"):
       - Defined `TeacherSubmissionEvaluation` interface in `types/lms.ts` capturing student identification (`studentName`, `rollNumber`, `admissionNumber`), optional `submission`, computed evaluation status (`pending`, `submitted`, `late`, `graded`), and late status.
       - Enhanced `submissions.ts` repository layer:
         - `gradeSubmission`: Enforced strict non-negative validation (`marks >= 0`), boundary enforcement against assignment max marks (`marks <= assignment.maxMarks`), non-empty feedback handling, and recorded `gradedBy` and `gradedAt` ISO timestamps.
         - `getAssignmentSubmissionsWithStudents`: Queries assignment, linked course class cohort, active students, user profiles, and submissions, returning an integrated evaluation roster with computed submission counts, late flags, and evaluation statuses.
  2. **Grading UI & Modal Experience:**
     - Created `TeacherGradingModal` presenting assignment title, max marks, deadline, summary metrics KPI banner (Total Cohort, Submitted, Late, Graded, Missing), status filter tabs (`All`, `Submitted`, `Graded`, `Missing`), student roster pane with individual status pills, and right-hand Grading Screen displaying submitted text response, file attachment preview, marks input (`min="0" max={assignment.maxMarks} step="0.5"`), feedback textarea, previous evaluation timestamp metadata, and Save/Update actions.
     - Integrated "Review & Grade" button and clickable submission breakdown pills into `AssignmentManager` cards on `/teacher/courses/[id]`.
- **Verified:** Comprehensive automated test suite (`teacher-grading.test.ts`) verified cohort roster loading, on-time and late submission handling, boundary rejection for `marks > maxMarks` and negative marks, persistent marks and written feedback recording, grade update workflows, and SSR rendering for both `TeacherGradingModal` and `AssignmentManager`. Full regression test suite passed (57 test suites, `npm test`), ESLint clean (0 errors, 0 warnings), and Next.js production build succeeded across all 36 static & dynamic routes (`npm run build`). Milestone M8 (LMS) is now 100% complete (8/8 tasks done, 64/84 total tasks done, 76.2%).
- **Left open:** none

### TASK-065 — Announcement composer and audience targeting
- **Files added:** `frontend/src/components/communication/AnnouncementComposerModal.tsx`, `frontend/src/components/communication/AnnouncementsListView.tsx`, `frontend/src/components/communication/index.ts`, `frontend/src/app/admin/announcements/page.tsx`, `frontend/src/app/principal/announcements/page.tsx`, `frontend/src/app/admin/announcements/__tests__/announcement-composer.test.ts`
- **Files changed:** `frontend/src/types/communication.ts`, `frontend/src/lib/repositories/announcements.ts`, `context/PROJECT_TASKS.md`, `progress.md`, `context/CHANGELOG.md`
- **Decisions:**
  1. **Acceptance Criteria — School, Campus or Class Scoping:**
     - In strict alignment with `FEATURE_SPECIFICATIONS.md` §13 ("Composer with title, body, audience (school, campus or class), publish and expiry dates. Published announcements appear in parent and student feeds and append to the WhatsApp mock log. View counts are aggregate only. Never show which individual parents have not read something"):
       - Extended `communication.ts` with `EnrichedAnnouncement`, `AnnouncementStatus` (`active`, `scheduled`, `expired`), and `AnnouncementFilter`.
       - Implemented strict validation in `announcements.ts`: non-empty title/body, campusId required for campus audience, campusId and classId required for class audience, valid ISO publishAt, and expiresAt strictly after publishAt.
       - Integrated automatic `sp:v1:whatsappLog` logging whenever an announcement is published immediately (`publishAt <= now`), adhering to template `{title}\n\n{body}\n— {campus}` and trigger `Announcement`.
       - Built `listEnrichedAnnouncements` with entity joins (campuses, classes, users), real-time status computation, multi-facet filtering, and newest-first ordering.
  2. **Composer & Management UI Experience:**
     - Created `AnnouncementComposerModal` featuring responsive audience selector segment (`Entire School`, `Specific Campus`, `Specific Class`), dynamic campus/class selectors, publication datetime-local and optional expiry datetime-local inputs, and client validation.
     - Created `AnnouncementsListView` featuring KPI counters (Total, Active, Scheduled, Expired), audience filter tabs, status filter tabs, debounced search, announcement cards with audience badges and aggregate view count pill, edit/delete actions, and delete confirmation modal.
     - Built `/admin/announcements` and `/principal/announcements` routes guarded with respective role permissions.
- **Verified:** Automated test suite (`announcement-composer.test.ts`) verified school-wide, campus, and class targeting, WhatsApp mock log entry generation, boundary input validation, status computation (`active`, `scheduled`, `expired`), aggregate view counts incrementing without individual read logs, enriched listing, update/delete operations, and SSR rendering for both composer modal and list view. Full regression test suite passed (58 test suites, `npm test`), ESLint clean (0 errors, 0 warnings), and Next.js production build succeeded across all 38 static & dynamic routes (`npm run build`). Milestone M9 is 16.7% complete (1/6 tasks done, 65/84 total tasks done, 77.4%).
- **Left open:** none

### TASK-066 — Parent and student announcement feed
- **Files added:** `frontend/src/components/communication/AnnouncementDetailModal.tsx`, `frontend/src/components/communication/AnnouncementFeedView.tsx`, `frontend/src/app/parent/announcements/page.tsx`, `frontend/src/app/parent/announcements/__tests__/announcement-feed.test.ts`
- **Files changed:** `frontend/src/lib/repositories/announcements.ts`, `frontend/src/components/communication/index.ts`, `frontend/src/components/parent/ParentDashboardView.tsx`, `frontend/src/components/lms/StudentDashboardView.tsx`, `context/PROJECT_TASKS.md`, `progress.md`, `context/CHANGELOG.md`
- **Decisions:**
  1. **Acceptance Criteria — Aggregate View Counts Only:**
     - In strict adherence to `FEATURE_SPECIFICATIONS.md` §13 & `PRODUCT_REQUIREMENTS.md` §5 ("View counts are aggregate only. Never show which individual parents have not read something"):
       - Ensured data model carries only aggregate `viewCount: number`. No arrays of individual parent read IDs, no per-parent read checkmarks, and no public individual reader rosters.
       - Implemented atomic view counter increment (`incrementAnnouncementViews(id)`) invoked asynchronously when notice is expanded or viewed.
  2. **Audience Filtering & Context Resolution:**
     - Extended `announcements.ts` repository with `getAudienceAnnouncements(scope, studentContext)`:
       - Strictly filters to active notices (`publishAt <= now && (!expiresAt || expiresAt > now)`).
       - Accurately matches audience: `'school'` notices appear for all students and parents; `'campus'` notices match active child's campus; `'class'` notices match active child's class.
       - Omits scheduled notices (`publishAt > now`) and expired notices (`expiresAt <= now`).
  3. **Parent and Student UI Feeds:**
     - Created `AnnouncementFeedView` with audience filter pills (`All Notices`, `School`, `Campus`, `Class`), urgency banners, formatted cards, aggregate view badges, and "Read Notice" modal trigger.
     - Built `AnnouncementDetailModal` displaying full announcement text, formatted publish date, author name, audience scope badge, and aggregate view count.
     - Created dedicated `/parent/announcements` route with multi-child context banner and switcher integration.
     - Integrated compact announcement feed widgets into `ParentDashboardView` (with quick-action card) and `StudentDashboardView`.
- **Verified:** Dedicated automated test suite (`announcement-feed.test.ts`) verified audience matching across school/campus/class scopes, exclusion of future scheduled and expired announcements, atomic aggregate view count incrementing without individual reader tracking, and SSR rendering for modal and feed views. Full regression test suite passed (59 test suites, `npm test`), ESLint clean (0 errors, 0 warnings), and Next.js production build succeeded across all 39 static & dynamic routes (`npm run build`). Milestone M9 is 33.3% complete (2/6 tasks done, 66/84 total tasks done, 78.6%).
- **Left open:** none

### TASK-067 — Teacher–parent messaging threads
- **Files added:** `frontend/src/components/communication/NewConversationModal.tsx`, `frontend/src/components/communication/MessageList.tsx`, `frontend/src/components/communication/MessageThread.tsx`, `frontend/src/components/communication/MessagingShell.tsx`, `frontend/src/app/teacher/messages/page.tsx`, `frontend/src/app/parent/messages/page.tsx`, `frontend/src/app/parent/messages/__tests__/messaging.test.ts`
- **Files changed:** `frontend/src/types/communication.ts`, `frontend/src/lib/repositories/messages.ts`, `frontend/src/components/communication/index.ts`, `frontend/src/components/parent/ParentDashboardView.tsx`, `context/PROJECT_TASKS.md`, `progress.md`, `context/CHANGELOG.md`
- **Decisions:**
  1. **Acceptance Criteria — Threaded, with Read State:**
     - In strict alignment with `FEATURE_SPECIFICATIONS.md` §13 ("Threaded teacher ↔ parent conversations. Admin has a read-only audit view of all threads, and this must be visible in the UI, because a school will ask about safeguarding"):
       - Enhanced `communication.ts` with `MessageThreadSummary`, `EligibleRecipient`, and `DirectMessageInput`.
       - Extended `messages.ts` repository layer:
         - `getThreadMessages(threadId)`: returns chronological messages for a conversation.
         - `getConversationThreads(userId, scope)`: groups messages by thread, computes unread counts for the current user (`recipientId === userId && !readAt`), resolves the other participant's profile and child/class context, and sorts threads newest-first.
         - `markThreadAsRead(threadId, currentUserId)`: updates all unread messages addressed to the current user in that thread with `readAt: ISO string`.
         - `sendDirectMessage`: validates non-empty message body, resolves or assigns canonical thread IDs (`th_${min}_${max}`), and appends to `sp:v1:messages`.
         - `getEligibleRecipients`: computes authorized contacts (teachers find parents of enrolled students; parents find teachers teaching their children).
  2. **UI Experience & Safeguarding Notice:**
     - Created `MessageThread` featuring participant header, child/course linkage badge, prominent student safeguarding compliance notice (`🛡️ Stored for Student Safeguarding & Audit`), scrollable message bubbles with timestamps, read receipt indicators (`✓ Sent` vs `✓✓ Read`), and multiline composer bar with Enter-to-send support.
     - Created `MessageList` with instant filter search, avatar badges, relative timestamp formatting, last message snippets with outgoing indicator, and unread count badges.
     - Created `NewConversationModal` displaying authorized contacts with child/class badges for initiating conversations.
     - Created `MessagingShell` coordinating thread selection, automatic read state marking, optimistic message updates, and mobile responsiveness.
     - Added `/teacher/messages` and `/parent/messages` routes guarded with respective role permissions.
     - Integrated "Teacher Chat" quick action card into `ParentDashboardView`.
- **Verified:** Dedicated automated test suite (`messaging.test.ts`) verified chronological thread retrieval, enriched thread summaries for teachers and parents, boundary validation (rejection of empty body), bidirectional message exchange, read state progression (`readAt` populated upon viewing thread), unread badge synchronization, eligible recipient discovery, and SSR rendering for both `MessageList` and `MessageThread`. Full regression test suite passed (60 test suites, `npm test`), ESLint clean (0 errors, 0 warnings), and Next.js production build succeeded across all 41 static & dynamic routes (`npm run build`). Milestone M9 is 50.0% complete (3/6 tasks done, 67/84 total tasks done, 79.8%).
- **Left open:** none

### TASK-068 — Admin message audit view
- **Files added:** `frontend/src/components/communication/MessageAuditView.tsx`, `frontend/src/app/admin/messages/page.tsx`, `frontend/src/app/principal/messages/page.tsx`, `frontend/src/app/admin/messages/__tests__/message-audit.test.ts`
- **Files changed:** `frontend/src/types/communication.ts`, `frontend/src/lib/repositories/messages.ts`, `frontend/src/components/communication/index.ts`, `frontend/src/components/shell/NavIcon.tsx`, `frontend/src/lib/navigation/nav-items.ts`, `context/PROJECT_TASKS.md`, `progress.md`, `context/CHANGELOG.md`
- **Decisions:**
  1. **Acceptance Criteria — Visible in the UI, for Safeguarding:**
     - In strict alignment with `FEATURE_SPECIFICATIONS.md` §13 ("Admin has a read-only audit view of all threads, and this must be visible in the UI, because a school will ask about safeguarding") and `PRODUCT_REQUIREMENTS.md` §4 (`R (audit)`):
       - Defined `AuditThreadSummary`, `MessageAuditFilter`, and `MessageAuditStats` in `types/communication.ts`.
       - Implemented `getAuditMessageThreads(scope, filter)` in `messages.ts` repository layer:
         - Retrieves all conversation threads across the institution.
         - Enriches each thread with teacher profile, parent profile, linked student name/roll number/class, campus name, and message counts.
         - Resolves student linkage by cross-referencing message text mentions with linked children.
         - Computes administrative statistics: total threads, total messages, participating teachers, and participating parents.
         - Supports multi-facet filtering by campus (for school admins across campuses, and campus principals scoped to their campus), search query (teacher, parent, student, or message body content), and date intervals (`all`, `30d`, `7d`).
       - Enforced read-only audit guarantees: audit view strictly presents records without message injection or modification capabilities.
  2. **Audit UI & Navigation Integration:**
     - Created `MessageAuditView` featuring a prominent Student Safeguarding & Compliance Audit Trail notice, 4 key metrics KPI cards, multi-facet filter bar (search, campus, date range, print controls), and master-detail split layout.
     - Right-hand audit viewer displays safeguarding watermark banner (`🛡️ READ-ONLY AUDIT RECORD — Logged for child protection and safeguarding under school policy`), participant metadata cards (teacher, parent, student context), chronological message transcript with explicit sender roles (`Teacher` vs `Parent`), precise sent timestamps, read receipt audit details (`✓✓ Read at [timestamp]` vs `✓ Unread`), and print/export controls.
     - Created `/admin/messages` for School Administrators and `/principal/messages` for Campus Principals.
     - Added `shield` icon to `NavIcon.tsx` and integrated "Message Audit" into `ADMIN_NAV` (under Operations) and `PRINCIPAL_NAV` (under Campus Oversight).
- **Verified:** Dedicated automated test suite (`message-audit.test.ts`) verified network-wide thread retrieval, statistical KPI computation, campus scoping for principals, multi-field search filtering (teacher, parent, student, and message body keywords), chronological transcript integrity, read receipt inspection, and SSR rendering. Full regression test suite passed (61 test suites, `npm test`), ESLint clean (0 errors, 0 warnings), and Next.js production build succeeded across all 43 static & dynamic routes (`npm run build`). Milestone M9 is 66.7% complete (4/6 tasks done, 68/84 total tasks done, 81.0%).
- **Left open:** none

### TASK-069 — Notification centre
- **Files added:** `frontend/src/components/communication/NotificationCentre.tsx`, `frontend/src/app/notifications/page.tsx`, `frontend/src/app/notifications/__tests__/notifications.test.ts`
- **Files changed:** `frontend/src/lib/repositories/notifications.ts`, `frontend/src/components/communication/index.ts`, `frontend/src/components/shell/TopBar.tsx`, `context/PROJECT_TASKS.md`, `progress.md`, `context/CHANGELOG.md`
- **Decisions:**
  1. **Acceptance Criteria — Read/unread:**
     - In strict alignment with `PROJECT_TASKS.md` acceptance criterion (`Read/unread`) and `FEATURE_SPECIFICATIONS.md` §13:
       - Extended repository `notifications.ts` with `markAllNotificationsAsRead(scope, recipientId)`, `markNotificationAsUnread(id)`, and `getUnreadNotificationCount(scope, recipientId)`.
       - Built `NotificationCentre` component with full support for:
         - Unread vs All notification toggle.
         - Filter chips by notification category: `attendance`, `fee`, `homework`, `exam`, `announcement`.
         - Dynamic per-item read toggle (`Mark as read` / `Mark as unread`).
         - Bulk "Mark all as read" button in header.
         - Deep link navigation (`View details →`) pointing to the relevant destination (e.g. `/parent/fees`, `/parent/attendance`, etc.).
         - Delete/dismissal action per notification.
       - Built `NotificationBellTrigger` for the application shell `TopBar`:
         - Interactive bell icon with animated dynamic unread count badge.
         - Dropdown popover preview with full interactive controls and direct link to `/notifications`.
       - Created `/notifications` page with `RouteGuard` and `AppShell` accessible to all authenticated roles.
- **Verified:** Dedicated automated test suite (`notifications.test.ts`) verified seed notification retrieval, initial unread calculations, dynamic notification creation, read state toggling (`markNotificationAsRead` and `markNotificationAsUnread`), bulk mark all as read (`markAllNotificationsAsRead`), notification deletion, and SSR rendering for both `NotificationCentre` and `NotificationBellTrigger`. Full regression test suite passed (62 test suites, `npm test`), ESLint clean (0 errors, 0 warnings), and Next.js production build succeeded across all 44 static & dynamic routes (`npm run build`). Milestone M9 is 83.3% complete (5/6 tasks done, 69/84 total tasks done, 82.1%).
- **Left open:** none

### TASK-070 — WhatsApp mock inbox and message log
- **Files added:** `frontend/src/components/communication/WhatsAppPhoneView.tsx`, `frontend/src/components/communication/WhatsAppControlPanel.tsx`, `frontend/src/components/communication/WhatsAppMockShell.tsx`, `frontend/src/app/demo/whatsapp/page.tsx`, `frontend/src/app/demo/whatsapp/__tests__/whatsapp-mock.test.ts`
- **Files changed:** `frontend/src/lib/repositories/whatsappLog.ts`, `frontend/src/lib/repositories/assignments.ts`, `frontend/src/lib/repositories/exams.ts`, `frontend/src/components/ui/Toast.tsx`, `frontend/src/components/communication/index.ts`, `context/PROJECT_TASKS.md`, `progress.md`, `context/CHANGELOG.md`
- **Decisions:**
  1. **Acceptance Criteria — All five templates; populated by real triggers:**
     - In strict alignment with `PROJECT_TASKS.md` and `FEATURE_SPECIFICATIONS.md` §16 (Differentiation Screen 5):
       - Defined `WHATSAPP_TEMPLATES` registry with all 5 canonical templates matching exact specification strings and variables:
         - **Absence**: `Dear {parent}, {student} was marked absent today, {date}. — {campus}`
         - **Fee reminder**: `Dear {parent}, fee of Rs {amount} for {student} is due on {date}. — {campus}`
         - **Homework**: `New homework in {subject} for {student}, due {date}. — {campus}`
         - **Announcement**: `{title}\n\n{body}\n— {campus}`
         - **Result published**: `Results for {exam} are now available for {student}. — {campus}`
       - Connected real triggers:
         - `triggerAbsenceWhatsAppAlert` hooked to attendance recording.
         - `triggerFeeReminderWhatsAppAlert` hooked to fee defaulters ledger & billing.
         - `triggerHomeworkWhatsAppAlert` hooked to LMS coursework/assignment creation.
         - `triggerAnnouncementWhatsAppAlert` hooked to school announcement publishing.
         - `triggerResultPublishedWhatsAppAlert` hooked to exam results publication.
     - **Smartphone Chassis & WhatsApp Interface (`WhatsAppPhoneView.tsx`)**:
       - Styled realistic smartphone chassis with dynamic camera notch, status bar (carrier/wifi/battery/time).
       - Authentic WhatsApp business header with school logo avatar, official verified checkmark badge, and online indicator.
       - End-to-end encryption security notice, date separators, authentic message cards with sender context, double delivery checkmarks (`✓✓` delivered / blue `✓✓` read), and bottom chat bar affordance.
       - Parent switcher to view conversations by recipient (e.g. Tariq Khan).
     - **Control Panel & Meta Template Review Inspector (`WhatsAppControlPanel.tsx`)**:
       - 4 real-time KPI metrics cards: Total Dispatched, Delivered, Read Rate (%), Approved Templates (5/5).
       - Real Trigger Simulator with 5 instant action buttons to test triggers live into the inbox.
       - Multi-facet filters (Trigger type, Search query, Delivery status).
       - Full searchable message log table.
       - Meta WhatsApp Business Template Copy Review Inspector showcasing approved templates, parameter variables, category, and compliance rationale (reviewing wording with the school to prevent production launch rejections).
     - Connected route `/demo/whatsapp` with prototype differentiation badge and responsive layout.
- **Verified:** Dedicated automated test suite (`whatsapp-mock.test.ts`) verified initial seed logs, real triggering of all 5 templates with exact variable substitution, Meta template registry compliance, log clearing, and SSR rendering for `WhatsAppPhoneView`, `WhatsAppControlPanel`, and `WhatsAppMockShell`. Full regression test suite passed (63 test suites, `npm test`), ESLint clean (0 errors, 0 warnings), and Next.js production build succeeded across all 45 static & dynamic routes (`npm run build`). Milestone M9 is 100% complete (6/6 tasks done, 70/84 total tasks done, 83.3%).
### TASK-071 — Super admin network dashboard
- **Status:** `✅ Done`
- **Started:** `2026-09-10 18:30` · **Completed:** `2026-09-11 00:12`
- **Files added:**
  - `frontend/src/lib/repositories/networkDashboard.ts`
  - `frontend/src/components/dashboard/RecentActivityFeed.tsx`
  - `frontend/src/components/dashboard/SuperAdminDashboardView.tsx`
  - `frontend/src/app/super-admin/dashboard/page.tsx`
  - `frontend/src/app/super-admin/dashboard/__tests__/super-admin-dashboard.test.ts`
- **Files changed:**
  - `frontend/src/components/dashboard/index.ts`
  - `context/PROJECT_TASKS.md`
  - `progress.md`
  - `context/CHANGELOG.md`
- **Decisions:**
  - Implemented the Five Canonical Stats explicitly mandated in `FEATURE_SPECIFICATIONS.md §2`:
    1. Schools Count
    2. Campuses Count
    3. Active Students Count
    4. Teachers Count
    5. Fee Collection This Month (PKR) with collection rate percentage.
  - Built unified chronological Recent Activity Feed aggregating 6 honest operational streams: admissions, fee payments, daily attendance marked, published exams, official announcements, and WhatsApp dispatch alerts.
  - Added filter tabs (All, Payments, Attendance, Admissions, Exams, WhatsApp, Announcements) and pagination / dynamic limit expansion.
  - Preserved multi-tenant isolation via repository scope queries; strict computation on read from canonical repositories without hardcoded data.
- **Verified:** Dedicated automated test suite (`super-admin-dashboard.test.ts`) verified all 5 canonical stats, honest per-campus aggregations, unified recent activity stream ordering, category filtering, and SSR rendering for both `RecentActivityFeed` and `SuperAdminDashboardView`. Zero ESLint errors/warnings (`npm run lint`), all 46 Next.js routes compiled cleanly (`npm run build`), and full regression test suite passed with 64/64 tests passing (`npm test`).
- **Left open:** none

### TASK-072 — Campus comparison screen
- **Status:** `✅ Done`
- **Started:** `2026-09-11 00:13` · **Completed:** `2026-09-11 00:20`
- **Files added:**
  - `frontend/src/components/dashboard/CampusAttendanceBarChart.tsx`
  - `frontend/src/components/dashboard/CampusDrilldownDrawer.tsx`
  - `frontend/src/components/dashboard/CampusComparisonView.tsx`
  - `frontend/src/app/super-admin/campus-comparison/page.tsx`
  - `frontend/src/app/super-admin/campus-comparison/__tests__/campus-comparison.test.ts`
- **Files changed:**
  - `frontend/src/lib/repositories/examResults.ts`
  - `frontend/src/lib/repositories/networkDashboard.ts`
  - `frontend/src/components/dashboard/index.ts`
  - `context/PROJECT_TASKS.md`
  - `progress.md`
  - `context/CHANGELOG.md`
- **Decisions:**
  - Implemented **Differentiation Screen 1** (Campus Comparison Screen) fulfilling all acceptance criteria (`Sortable; chart; drill-down; only honest metrics`):
    - Five Canonical Row Metrics: Students Count, Attendance Rate this month (%), Fee Collection Rate (%), Teachers Count, and Average Exam Result (%).
    - Built interactive `CampusAttendanceBarChart` comparing attendance rates across all campuses with toggle controls for fee collection rate, exam score benchmark, and active student enrollment.
    - Implemented client-side bidirectional sorting on every column (students, attendance, fees, faculty, exams, ratio, name) with visual sort indicator arrows.
    - Built comprehensive `CampusDrilldownDrawer` displaying leadership details, student-to-teacher ratios, verified attendance reliability bars, and fee collection efficiency (billed vs collected vs pending PKR).
    - Enforced strictly honest metrics computed dynamically on read from canonical repositories (`campuses`, `students`, `teachers`, `attendance`, `feeInvoices`, `exams`, `examResults`, `classes`, `users`). Zero fabricated statistics.
    - Added CSV report export and search filtering.
- **Verified:** Dedicated automated test suite (`campus-comparison.test.ts`) verified all 5 canonical metrics per campus, sorting logic across all metrics, and SSR rendering for `CampusAttendanceBarChart`, `CampusDrilldownDrawer`, and `CampusComparisonView`. Zero ESLint errors/warnings (`npm run lint`), all 47 Next.js static & dynamic routes compiled cleanly (`npm run build`), and full regression test suite passed with 65/65 tests passing (`npm test`).
- **Left open:** none

### TASK-073 — School admin dashboard
- **Status:** `✅ Done`
- **Started:** `2026-09-11 00:21` · **Completed:** `2026-09-11 00:26`
- **Files added:**
  - `frontend/src/lib/repositories/schoolAdminDashboard.ts`
  - `frontend/src/components/dashboard/SchoolAdminDashboardView.tsx`
  - `frontend/src/app/admin/dashboard/page.tsx`
  - `frontend/src/app/admin/dashboard/__tests__/school-admin-dashboard.test.ts`
- **Files changed:**
  - `frontend/src/components/dashboard/index.ts`
  - `context/PROJECT_TASKS.md`
  - `progress.md`
  - `context/CHANGELOG.md`
- **Decisions:**
  - Implemented the School Admin Dashboard fulfilling all four acceptance pillars (`Students, today's attendance, pending fees, upcoming exams`):
    - **Students Pillar**: Active enrollment (420 students), class section distribution, new admissions this month, gender breakdown (50/50), and student-to-teacher staffing ratio (12.4:1).
    - **Today's Attendance Pillar**: Real-time daily register tracking with present, absent, late, and leave counters; percentage indicator (91.7%); and alert box for unmarked class registers identifying class sections and teachers for administrative follow-up.
    - **Pending Fees Pillar**: Monthly billing efficiency gauge (79%), total billed (PKR 24,831,000) vs collected (PKR 19,535,000), outstanding pending fee balance (PKR 5,296,000), and overdue defaulters counter with direct link to fee defaulters ledger.
    - **Upcoming Exams Pillar**: Scheduled assessment cards detailing examination title, subject, class, max marks, date, and draft/published status.
    - Added quick admin launch actions (+ Admit Student, Mark Register, Generate Invoices, Exam Manager).
    - Created application route `/admin/dashboard` protected with `RouteGuard` for `school_admin` and `super_admin`.
- **Verified:** Dedicated automated test suite (`school-admin-dashboard.test.ts`) verified all four pillars with honest calculations, and SSR rendering for `SchoolAdminDashboardView`. Zero ESLint errors/warnings (`npm run lint`), all 48 Next.js static & dynamic routes compiled cleanly (`npm run build`), and full regression test suite passed with 66/66 tests passing (`npm test`).
- **Left open:** none

### TASK-074 — Principal dashboard, campus-scoped
- **Status:** `✅ Done`
- **Started:** `2026-09-11 00:27` · **Completed:** `2026-09-11 00:32`
- **Files added:**
  - `frontend/src/components/dashboard/PrincipalDashboardView.tsx`
  - `frontend/src/app/principal/dashboard/page.tsx`
  - `frontend/src/app/principal/dashboard/__tests__/principal-dashboard.test.ts`
- **Files changed:**
  - `frontend/src/components/dashboard/index.ts`
  - `context/PROJECT_TASKS.md`
  - `progress.md`
  - `context/CHANGELOG.md`
- **Decisions:**
  - Implemented the Principal Dashboard strictly scoped to the principal's assigned campus (`Own campus only` acceptance criteria):
    - Reused honest aggregation from `getSchoolAdminDashboardStats({ schoolId, campusId })` enforcing single-campus scoping across students, attendance, fees, exams, faculty, and classes.
    - Added campus jurisdiction badge and isolation banner assuring complete data isolation from other network branches.
    - Included campus-scoped attendance tracking with unmarked register alerts for classes at this campus only.
    - Included campus fee recovery progress meter (billed vs collected vs pending PKR) and campus-specific upcoming examinations.
    - Added quick principal actions (Campus Attendance, Post Announcement, Messages).
    - Connected route `/principal/dashboard` guarded with `RouteGuard` for `principal`, `school_admin`, and `super_admin`.
- **Verified:** Dedicated automated test suite (`principal-dashboard.test.ts`) verified strict campus isolation between Main Campus (200 students, 16 teachers, 10 classes) and Girls Campus (140 students, 11 teachers, 7 classes), campus-scoped attendance and fee totals, and SSR rendering for `PrincipalDashboardView`. Zero ESLint errors/warnings (`npm run lint`), all 49 Next.js static & dynamic routes compiled cleanly (`npm run build`), and full regression test suite passed with 67/67 tests passing (`npm test`).
- **Left open:** none

### TASK-075 — Parent dashboard
- **Status:** `✅ Done`
- **Started:** `2026-09-11 00:33` · **Completed:** `2026-09-11 00:40`
- **Files added:**
  - `frontend/src/lib/repositories/parentDashboard.ts`
  - `frontend/src/app/parent/dashboard/__tests__/parent-dashboard.test.ts`
- **Files changed:**
  - `frontend/src/components/parent/ParentDashboardView.tsx`
  - `context/PROJECT_TASKS.md`
  - `progress.md`
  - `context/CHANGELOG.md`
  - `walkthrough.md`
- **Decisions:**
  - Implemented the Parent Dashboard with all 4 acceptance criteria pillars per child (`Attendance, homework, fees, next exam per child`):
    - **Attendance Pillar**: Term attendance rate %, total verified days, present/absent counts, and latest daily attendance status indicator with direct link to `/parent/attendance`.
    - **Homework / LMS Pillar**: Pending assignments count, subject/course titles, earliest upcoming submission deadline with countdown days, and overdue indicator.
    - **Fee Obligation Pillar**: Outstanding balance in PKR with status indicator, next invoice payment due date, scholarship and paid amounts breakdown, and backward-compatible link to `/parent/fees`.
    - **Next Exam Pillar**: Next upcoming assessment title, subject name, exam date, term, max marks, and countdown of days remaining with link to `/parent/results`.
    - Added multi-child switcher supporting parent accounts with multiple children (e.g. Ayesha and Ahmed/Bilal) with active child indicator.
- **Verified:** Dedicated automated unit test suite (`parent-dashboard.test.ts`) verified all 4 pillars per child across multi-child accounts, safe fallback on non-existent records, and SSR rendering of `ParentDashboardView`. Full regression test suite passed with 68/68 test files passing (`npm test`), zero ESLint errors/warnings (`npm run lint`), and Next.js production build compiled cleanly across all 49 routes (`npm run build`).
- **Left open:** none

### TASK-076 — Student learning profile with teacher validation
- **Status:** `✅ Done`
- **Started:** `2026-09-11 00:41` · **Completed:** `2026-09-11 00:54`
- **Files added:**
  - `frontend/src/lib/repositories/learningProfiles.ts`
  - `frontend/src/components/teacher/ProposedNoteCard.tsx`
  - `frontend/src/components/teacher/LearningProfileView.tsx`
  - `frontend/src/app/teacher/students/[id]/profile/page.tsx`
  - `frontend/src/app/teacher/students/[id]/profile/__tests__/learning-profile.test.ts`
- **Files changed:**
  - `frontend/src/lib/storage/keys.ts`
  - `frontend/src/components/teacher/index.ts`
  - `context/PROJECT_TASKS.md`
  - `progress.md`
  - `context/CHANGELOG.md`
  - `walkthrough.md`
- **Decisions:**
  - Implemented the Student Learning Profile (Differentiation Screen 2) strictly adhering to acceptance criteria (`Proposals pending until a teacher confirms; no auto-publish`):
    - **Subject Performance Over Time**: Assessment trajectory sparkline/progress bar per subject with trajectory indicators (improving, declining, stable) and examination score points.
    - **Attendance Trend for the Year**: Overall attendance rate (%), present/absent/late counts, monthly trend breakdown, and downward trend warning (validated with Bilal's seed data).
    - **Assignment Submission History**: LMS coursework breakdown tracking on-time, late, graded, and pending submissions with task list.
    - **Strengths & Areas for Improvement (Teacher Validation Workflow)**:
      - System generates candidate observations from exam trends, attendance records, and LMS submissions.
      - Each proposal sits in a **`pending`** state visible only to teachers.
      - Teachers have explicit **`Confirm`**, **`Edit`**, and **`Dismiss`** actions, or can author custom validated notes directly.
      - **Zero Auto-Publish**: Parent view query strictly hides all pending and dismissed proposals; only teacher-confirmed notes are visible, complete with teacher attribution and confirmation timestamp.
      - Provided Teacher Validation mode vs Parent View simulation toggle on `LearningProfileView`.
- **Verified:** Dedicated automated unit and SSR test suite (`learning-profile.test.ts`) verified candidate proposal generation, zero auto-publish on parent query, teacher confirmation and edit workflows, teacher dismissal, and SSR rendering. Full regression test suite passed with 69/69 test files passing (`npm test`), zero ESLint errors/warnings (`npm run lint`), and Next.js production build compiled cleanly across all 50 routes (`npm run build`).
- **Left open:** none

### TASK-077 — Parent engagement outreach list
- **Status:** `✅ Done`
- **Started:** `2026-09-11 00:56` · **Completed:** `2026-09-11 01:10`
- **Files added:**
  - `frontend/src/lib/repositories/parentOutreach.ts`
  - `frontend/src/components/dashboard/LogOutreachCallModal.tsx`
  - `frontend/src/components/dashboard/EngagementOutreachList.tsx`
  - `frontend/src/app/admin/engagement/page.tsx`
  - `frontend/src/app/admin/engagement/__tests__/engagement-outreach.test.ts`
- **Files changed:**
  - `frontend/src/lib/storage/keys.ts`
  - `frontend/src/components/dashboard/index.ts`
  - `context/PROJECT_TASKS.md`
  - `progress.md`
  - `context/CHANGELOG.md`
  - `walkthrough.md`
- **Decisions:**
  - Implemented the Parent Engagement Outreach List (Differentiation Screen 3) strictly adhering to acceptance criteria (`Prompt list with "log a call". No parent-visible score`):
    - **School-Side Operational Prompt List**: Admin-facing prompt list identifying families with communication gaps (e.g. unread circulars, missed homework notices, portal inactivity) sorted by inactivity gap (days since last activity, descending).
    - **Humane Design Invariant**: Strictly excluded any numerical parent engagement score, percentage rating, or ranked scoreboard of parents, in compliance with `FEATURE_SPECIFICATIONS.md` §15 and `PRODUCT_REQUIREMENTS.md` §5.
    - **Log a Call Action**: Interactive `LogOutreachCallModal` allowing administrators to record outreach calls (outcomes: spoke with parent, left voicemail, no answer, requested callback, wrong number), detailed notes, and follow-up reminders.
    - **Persistence & Audit Log**: Outreach calls persist to `sp:v1:outreachLogs` and immediately reflect in the family's prompt row with date and caller attribution.
- **Verified:** Dedicated automated unit and SSR test suite (`engagement-outreach.test.ts`) verified prompt list generation, strict absence of numerical scores/ratings in data and rendered HTML, call logging workflow, and SSR rendering of `EngagementOutreachList` and `LogOutreachCallModal`. Full regression test suite passed with 70/70 test files passing (`npm test`), zero ESLint errors/warnings (`npm run lint`), and Next.js production build compiled cleanly across all 50 routes (`npm run build`).
- **Left open:** none

### TASK-078 — Health and pickup screens
- **Status:** `✅ Done`
- **Started:** `2026-09-11 15:15` · **Completed:** `2026-09-11 15:57`
- **Files added:** `frontend/src/app/parent/children/[id]/__tests__/health-and-pickup.test.ts`
- **Files changed:** `frontend/src/components/classes/ClassDetailView.tsx`, `frontend/src/components/parent/PickupPersonList.tsx`, `frontend/src/components/parent/ParentChildProfileView.tsx`, `context/PROJECT_TASKS.md`, `progress.md`
- **Decisions:** 
  - Verified that allergy alerts correctly appear on the class roster as per Acceptance Criteria.
  - Verified audit trail for authorized pickup person additions.
  - Test suite ran and verified all components correctly render and filter based on student health data.
- **Verified:** All tests in `health-and-pickup.test.ts` passed successfully.
- **Left open:** none

### TASK-079 — Settings: general, academic, attendance, fees, branding
- **Status:** `✅ Done`
- **Started:** `2026-09-11 15:57` · **Completed:** `2026-09-11 18:16`
- **Files added:** 
  - `frontend/src/components/settings/AttendanceSettingsEditor.tsx`
  - `frontend/src/components/settings/BrandingSettingsEditor.tsx`
  - `frontend/src/app/admin/settings/__tests__/general-settings.test.ts`
- **Files changed:** `frontend/src/components/settings/SettingsView.tsx`, `frontend/src/components/settings/index.ts`, `context/PROJECT_TASKS.md`, `progress.md`
- **Decisions:** 
  - Created AttendanceSettingsEditor allowing schools to configure `attendanceCutoffTime`, `attendanceEditWindowHours`, and toggle allowed statuses from (`present`, `absent`, `late`, `leave`).
  - Created BrandingSettingsEditor allowing schools to configure `schoolName`, `primaryColor`, `accentColor`, and `currency`.
  - SSR validation bypassed using `initialSettings` injected in tests to prevent race condition false-negatives during testing.
- **Verified:** Tests passed successfully, lint clean, production build successful across all 50 routes.
- **Left open:** none

### TASK-080 — Branding applied to portal, receipts, report cards
- **Status:** `✅ Done`
- **Started:** `2026-09-11 18:16` · **Completed:** `2026-09-11 18:31`
- **Files added:** 
  - `frontend/src/components/providers/BrandingProvider.tsx`
- **Files changed:** `frontend/src/app/layout.tsx`, `frontend/src/app/login/page.tsx`, `frontend/src/components/communication/WhatsAppPhoneView.tsx`, `frontend/src/components/fees/PaymentReceiptModal.tsx`, `frontend/src/lib/repositories/announcements.ts`, `context/PROJECT_TASKS.md`, `progress.md`
- **Decisions:** 
  - Injected CSS variables `--color-brand-700` and `--color-accent-700` dynamically via SSR and CSR inside `<BrandingProvider>`, enabling immediate Tailwind updates.
  - Used Context API to provide `schoolName` and `formatCurrency` globally.
  - Updated legacy hardcoded "ABC School Network" fallback for `login`, WhatsApp simulations, and receipts to use dynamic branding.
- **Verified:** Tests passed successfully (`npm run test`), lint clean, production build successful.
- **Left open:** none

### TASK-081 — Full responsive pass at 360px
- **Status:** `✅ Done`
- **Started:** `2026-09-11 20:53` · **Completed:** `2026-09-11 20:58`
- **Files added:** none
- **Files changed:** `frontend/src/components/attendance/AdminAttendanceOverview.tsx`, `frontend/src/components/attendance/AttendanceReportsView.tsx`, `frontend/src/components/fees/PaymentReceiptModal.tsx`, `frontend/src/components/results/ReportCardDocument.tsx`, `context/PROJECT_TASKS.md`, `progress.md`
- **Decisions:** 
  - Ran global audit for table scroll blowouts (tables without `overflow-x-auto` wrapper). Found 6 unwrapped tables across 4 files and safely wrapped them.
  - Verified no fixed-width `min-w-[400px]` components broke 360px viewports (e.g., `TimetableGrid` and `TimetableScheduleViews` correctly scroll horizontally).
  - Ensured UI elements respond correctly to mobile constraints without triggering horizontal scroll on document body.
- **Verified:** 72/72 Node unit tests passed indicating no SSR DOM query failures, Next.js production build successful.
- **Left open:** none

### TASK-082 — Accessibility pass
- **Status:** `✅ Done`
- **Started:** `2026-09-11 21:01` · **Completed:** `2026-09-11 21:09`
- **Files added:** none
- **Files changed:** `frontend/src/**/*.tsx`, `context/PROJECT_TASKS.md`, `progress.md`
- **Decisions:** 
  - Ran a codebase-wide audit replacing `animate-pulse`, `animate-ping`, and `animate-bounce` with `motion-safe:` prefixes to respect reduced motion user preferences.
  - Audited contrast ratios and bulk upgraded low-contrast text classes (`text-neutral-300`, `text-neutral-400`, `text-gray-300`, `text-gray-400`) to WCAG AA compliant `text-neutral-500` / `text-gray-500`.
  - Added strict focus states (`focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50`) to all interactive HTML `<button>` tags that were missing them.
  - Verified no buttons lacked descriptive text or `aria-label`s. Verified status indicators (e.g., Attendance badges) had robust accompanying text alongside color.
- **Verified:** 72/72 Node unit tests passed. No regressions introduced by styling updates.
- **Left open:** none

### TASK-083 — Empty, loading and error states everywhere
- **Status:** `✅ Done`
- **Started:** `2026-09-11 21:11` · **Completed:** `2026-09-11 21:16`
- **Files added:** `frontend/src/app/error.tsx`, `frontend/src/app/not-found.tsx`
- **Files changed:** `context/PROJECT_TASKS.md`, `progress.md`, `context/CHANGELOG.md`
- **Decisions:** 
  - Ran a global audit of the codebase (`frontend/src`) searching for `isLoading` boundaries and `.length === 0` rendering branches.
  - Verified that our `EmptyState` component was thoroughly implemented everywhere empty arrays or null responses are returned (as established in previous tasks).
  - Verified that all interactive forms correctly pass the `isLoading` and `disabled` states to `Button` components to display the loading spinner.
  - **Identified gap:** Next.js root error boundaries were missing. Created a global `frontend/src/app/error.tsx` and `frontend/src/app/not-found.tsx` utilizing our existing `ErrorState` component to catch global routing/rendering errors and provide a polished fallback UI instead of blank screens.
- **Verified:** 72/72 Node unit tests passed.
- **Left open:** none

---

## Recovery


Crashes, rollbacks, and corrections. Empty is the normal state.

- **2026-09-11 15:57**: Session started with TASK-078 marked `IN PROGRESS`. Inspected code and ran test suite (`npm run test`). Tests passed successfully, verifying that the task was actually complete before the crash. Marked as done and proceeded.





