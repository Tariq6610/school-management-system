# Project Tasks

The agent works from this file, top to bottom, one task at a time.

**Status values:** `Pending` · `In Progress` · `Done` · `Blocked`
**Priority:** `P0` cannot demo without it · `P1` demo is weak without it · `P2` nice to have

Do not start a task whose dependencies are not `Done`.

---

## M0 — Foundation

| ID | Task | Pri | Deps | Status | Acceptance |
|---|---|---|---|---|---|
| TASK-001 | Next.js + TypeScript strict + Tailwind setup | P0 | — | Done | Builds clean; strict mode on; no starter boilerplate left |
| TASK-002 | Design tokens as Tailwind theme extension | P0 | 001 | Done | Every token in UI_DESIGN_SYSTEM.md §2–4 available as a utility class |
| TASK-003 | `lib/storage/` — get, set, remove, JSON, quota errors | P0 | 001 | Done | Only file in the repo referencing `localStorage`; quota error is typed |
| TASK-004 | Lint rule blocking `localStorage` outside `lib/storage/` | P0 | 003 | Done | Violation fails the build |
| TASK-005 | Shared types in `/types` for every entity in DATA_MODELS.md | P0 | 001 | Done | Compiles; no duplicated definitions |
| TASK-006 | Repository layer skeleton — async, scope-taking, one per collection | P0 | 003,005 | Done | All functions async and take an explicit scope object |
| TASK-007 | Seed generator: `demo-network` profile | P0 | 006 | Done | Matches DATA_MODELS.md §6 volumes and quality rules, including the deliberate bad data |
| TASK-008 | Seed boot check + schema version reset | P0 | 007 | Done | Version mismatch wipes and reseeds; total seed under 2MB |
| TASK-009 | `lib/utils/` — dates, currency (PKR), grading, attendance % | P0 | 005 | Done | Four functions from DEVELOPMENT_GUIDELINES.md §8 exist with unit tests |

## M1 — UI Kit

| ID | Task | Pri | Deps | Status | Acceptance |
|---|---|---|---|---|---|
| TASK-010 | Button, Input, Select, DatePicker, Textarea | P0 | 002 | Done | All variants; keyboard focus visible; disabled states |
| TASK-011 | Table — sticky header, sort, empty state, pagination | P0 | 002 | Done | Tabular numerals; 25/page; works at 360px |
| TASK-012 | Modal, Drawer, ConfirmDialog | P0 | 002 | Done | Focus trapped; Escape closes; confirm names the record |
| TASK-013 | StatusBadge, StatCard, Avatar, Tabs, Toast | P0 | 002 | Done | Status badges show label + colour, never colour alone |
| TASK-014 | EmptyState, skeleton loaders, error state | P0 | 002 | Done | One reusable set used everywhere |

## M2 — Shell & Auth

| ID | Task | Pri | Deps | Status | Acceptance |
|---|---|---|---|---|---|
| TASK-015 | Login page with demo account panel | P0 | 010 | Done | Six accounts per FEATURE_SPECIFICATIONS.md §1; prototype note visible |
| TASK-016 | Session, sign out, persistence across refresh | P0 | 015 | Done | Refresh keeps the session; sign out clears it |
| TASK-017 | Route guards — role and scope | P0 | 016 | Done | Wrong role → 403; out-of-scope record → 404 |
| TASK-018 | App shell: sidebar, top bar, role-scoped nav | P0 | 013 | Done | Nav differs per role; collapses to bottom bar under 768px |
| TASK-019 | Campus switcher | P0 | 018 | Done | Selected campus shown in top bar and page title; scopes all queries |
| TASK-020 | Parent child switcher | P0 | 018 | Done | Lists only that parent's children |
| TASK-021 | Demo controls: reset data, switch role | P1 | 008 | Done | Both labelled as prototype-only on screen |

## M3 — Core Records

| ID | Task | Pri | Deps | Status | Acceptance |
|---|---|---|---|---|---|
| TASK-022 | Campus list, add, edit, assign principal | P0 | 019 | Done | Delete refused when students exist, with a count |
| TASK-023 | Student list with search and filters | P0 | 011 | Done | Search under 300ms at seed scale; filters combine |
| TASK-024 | Admission form — all six sections | P0 | 023 | Done | Emergency contact required; duplicate admission number blocked |
| TASK-025 | Student profile with six tabs | P0 | 024 | Done | Health tab shows allergies at the top |
| TASK-026 | Edit and status lifecycle | P1 | 025 | Done | Inactive students excluded from attendance and invoicing |
| TASK-027 | Teacher list, add, profile | P0 | 011 | Done | Shows assigned classes and subjects |
| TASK-028 | Teacher subject and class assignment | P0 | 027 | Done | Bulk selection in one screen |
| TASK-029 | Classes and sections CRUD | P0 | 022 | Done | Same grade+section allowed at different campuses |
| TASK-030 | Subjects CRUD and teacher assignment | P0 | 029 | Done | Bulk add from template list |
| TASK-031 | Parent records and student linking | P0 | 024 | Done | Many-to-many; sibling case works |

## M4 — Attendance (the critical path)

| ID | Task | Pri | Deps | Status | Acceptance |
|---|---|---|---|---|---|
| TASK-032 | Attendance repository, per-class-per-day documents | P0 | 006 | Done | Matches DATA_MODELS.md §4; no per-student rows |
| TASK-033 | **Teacher attendance marking screen** | P0 | 032 | Done | **40 students markable in under 60s**; all-present default; sticky save; keyboard shortcuts |
| TASK-034 | Save, edit window, audit trail | P0 | 033 | Done | Shows who marked and when; edit allowed within window |
| TASK-035 | Teacher dashboard — today's classes and marked state | P0 | 033 | Done | Clear which classes still need marking |
| TASK-036 | Admin attendance overview grid | P1 | 032 | Done | Unmarked classes highlighted |
| TASK-037 | Attendance reports and CSV export | P1 | 036 | Done | By class, by student, by range |
| TASK-038 | Parent monthly attendance calendar | P0 | 032 | Done | Colour + label; summary counts and percentage |
| TASK-039 | QR scan mock screen | P2 | 033 | Done | Simulated scan; falls back to manual without reload |

## M5 — Fees

| ID | Task | Pri | Deps | Status | Acceptance |
|---|---|---|---|---|---|
| TASK-040 | Fee structures CRUD | P0 | 029 | Done | Per class, optional campus scope |
| TASK-041 | Bulk invoice generation with preview | P0 | 040 | Done | Preview shows count and total; **re-run creates no duplicates** |
| TASK-042 | Payment recording, partial payments, balance | P0 | 041 | Done | Status transitions correct; balance always right |
| TASK-043 | Discounts, scholarships, sibling concession | P1 | 041 | Done | Visible as line items, never silent |
| TASK-044 | Receipt with sequential numbering | P0 | 042 | Done | Reprint does not issue a new number |
| TASK-045 | Student fee ledger and defaulter report | P1 | 042 | Done | Filter by amount and days overdue |
| TASK-046 | Parent fee view | P0 | 042 | Done | Balance on dashboard; receipts downloadable |

## M6 — Exams & Results

| ID | Task | Pri | Deps | Status | Acceptance |
|---|---|---|---|---|---|
| TASK-047 | Exam creation and schedule | P0 | 030 | Done | Per class and subject |
| TASK-048 | Marks entry grid, keyboard-driven, autosave | P0 | 047 | Done | Class of 40 entered in under 5 minutes; over-max rejected inline |
| TASK-049 | Grade calculation from configurable scale | P0 | 009 | Done | Scale editable in settings; no hardcoded thresholds |
| TASK-050 | Publish and unpublish results | P0 | 048 | Done | Invisible to parents until published |
| TASK-051 | **Report card generation and batch print** | P0 | 049 | Done | Branded; whole class prints as one document |
| TASK-052 | Parent and student results view | P0 | 050 | Done | Published only |

## M7 — Timetable

| ID | Task | Pri | Deps | Status | Acceptance |
|---|---|---|---|---|---|
| TASK-053 | Timetable slot model and period configuration | P1 | 030 | Done | Period times configurable |
| TASK-054 | Timetable builder grid | P1 | 053 | Done | Cell picker for subject and teacher |
| TASK-055 | Live clash detection — teacher, room, class | P1 | 054 | Done | Warns before commit, naming the conflict |
| TASK-056 | Timetable views by class, teacher, room | P1 | 054 | Done | All printable |

## M8 — LMS

| ID | Task | Pri | Deps | Status | Acceptance |
|---|---|---|---|---|---|
| TASK-057 | Course CRUD and enrolment via class | P1 | 030 | Done | Students see courses automatically |
| TASK-058 | Lesson CRUD, ordering, content types | P1 | 057 | Done | Drag to reorder; three content types |
| TASK-059 | Student course and lesson viewer | P1 | 058 | Done | Placeholders for video and PDF |
| TASK-060 | Lesson completion and course progress | P1 | 059 | Done | Computed on read, never stored |
| TASK-061 | Student dashboard — today's tasks | P1 | 060 | Done | Grouped by subject |
| TASK-062 | Assignment creation and deadline | P1 | 057 | Done | Optional lesson link |
| TASK-063 | Student submission, late flagging | P1 | 062 | Done | Text and filename; late clearly marked |
| TASK-064 | Teacher grading and feedback | P1 | 063 | Done | Marks and written feedback |

## M9 — Communication

| ID | Task | Pri | Deps | Status | Acceptance |
|---|---|---|---|---|---|
| TASK-065 | Announcement composer and audience targeting | P1 | 019 | Done | School, campus or class |
| TASK-066 | Parent and student announcement feed | P1 | 065 | Done | Aggregate view counts only |
| TASK-067 | Teacher–parent messaging threads | P1 | 020 | Done | Threaded, with read state |
| TASK-068 | Admin message audit view | P1 | 067 | Done | Visible in the UI, for safeguarding |
| TASK-069 | Notification centre | P2 | 065 | Done | Read/unread |
| TASK-070 | **WhatsApp mock inbox and message log** | P0 | 034 | Done | All five templates; populated by real triggers |

## M10 — Differentiation & Dashboards

| ID | Task | Pri | Deps | Status | Acceptance |
|---|---|---|---|---|---|
| TASK-071 | Super admin network dashboard | P1 | 019 | Done | Five stats plus recent activity |
| TASK-072 | Campus comparison screen | P1 | 071 | Done | Sortable; chart; drill-down; only honest metrics |
| TASK-073 | School admin dashboard | P0 | 036 | Done | Students, today's attendance, pending fees, upcoming exams |
| TASK-074 | Principal dashboard, campus-scoped | P1 | 073 | Done | Own campus only |
| TASK-075 | Parent dashboard | P0 | 038 | Done | Attendance, homework, fees, next exam per child |
| TASK-076 | **Student learning profile with teacher validation** | P1 | 052 | Done | Proposals pending until a teacher confirms; no auto-publish |
| TASK-077 | **Parent engagement outreach list** | P1 | 067 | Done | Prompt list with "log a call". **No parent-visible score** |
| TASK-078 | Health and pickup screens | P0 | 025 | Pending | Allergy alerts on the class roster |

## M11 — Settings & Polish

| ID | Task | Pri | Deps | Status | Acceptance |
|---|---|---|---|---|---|
| TASK-079 | Settings: general, academic, attendance, fees, branding | P0 | 018 | Pending | Grading scale and attendance statuses editable |
| TASK-080 | Branding applied to portal, receipts, report cards | P1 | 079 | Pending | Logo and colours flow through |
| TASK-081 | Full responsive pass at 360px | P0 | all | Pending | Every screen usable; no horizontal scroll |
| TASK-082 | Accessibility pass | P0 | all | Pending | Focus, labels, contrast, reduced motion |
| TASK-083 | Empty, loading and error states everywhere | P0 | 014 | Pending | No blank screens anywhere |
| TASK-084 | Demo rehearsal against DEMO_SCENARIOS.md | P0 | all | Pending | All seven workflows complete with no dead ends |

---

## Suggested build order

M0 → M1 → M2 → **M4 (attendance) → M3 (records)** → M5 → M6 → M10 partial → M7 → M8 → M9 → M11.

**Attendance is pulled forward deliberately.** It is the screen that decides whether a school adopts the system, and it is the one most likely to need several iterations after real teachers see it. Building it in week two rather than week eight leaves time to get it wrong twice. Seed data means it can be built before the full student management screens exist.
