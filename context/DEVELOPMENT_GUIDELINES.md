# Development Guidelines

## 1. Folder structure

```
/app
  /(auth)/login
  /(super-admin)/super-admin/...
  /(admin)/admin/...
  /(principal)/principal/...
  /(teacher)/teacher/...
  /(parent)/parent/...
  /(student)/student/...
  /demo/whatsapp
  layout.tsx
/components
  /ui                 Button, Input, Table, Modal, StatusBadge, ...
  /layout             Sidebar, TopBar, CampusSwitcher, PageHeader
  /students           StudentTable, StudentForm, StudentProfile
  /attendance         AttendanceGrid, AttendanceSummary
  /fees               InvoiceTable, PaymentForm, Receipt
  ...
/lib
  /repositories       ← the ONLY place localStorage is touched
  /storage            low-level get/set/remove, JSON handling, quota errors
  /seed               seed data generators and the reset routine
  /auth               session, role switching, route guards
  /utils              dates, currency, grading, formatting
/types                shared TypeScript interfaces
```

## 2. The data access rule

**This is the most important rule in the project.**

```ts
// ✅ correct — component calls a repository
const students = await listStudents({ schoolId, campusId, classId });

// ❌ wrong — component reaches into storage
const students = JSON.parse(localStorage.getItem('sp:v1:students') ?? '[]');
```

Three requirements:

1. `localStorage` is referenced **only** inside `lib/storage/`. `lib/repositories/` uses `lib/storage/`. Everything else uses repositories.
2. **Every repository function is `async` and returns a Promise**, even though the implementation is synchronous. Components must already handle loading states and awaited data.
3. **Every query takes an explicit scope object** — `{ schoolId, campusId?, classId? }` — even though the prototype has one school. Never rely on ambient or global scope.

**Why this matters more than it looks.** In Phase 1 these repositories are reimplemented as `fetch` calls to the NestJS API. If the three rules above were followed, that is a change to one folder and no screens. If they were not, every component that touched storage is now synchronous code holding data it must instead await, and the "prototype we can build on" becomes a rewrite. This single decision is the difference between the prototype being an asset and being a sunk cost.

Enforce it with a lint rule: `no-restricted-globals` on `localStorage` outside `lib/storage/`.

## 3. TypeScript

- `strict: true`. No `any`, no non-null assertions to silence the compiler.
- Types live in `/types` and are shared. Do not redefine `Student` in three files.
- Discriminated unions for status fields, not loose strings.
- Repository inputs get their own types: `NewStudent`, not `Partial<Student>`.

## 4. React and Next.js

- Server components by default; `'use client'` only where interaction requires it. Note that anything reading `localStorage` is necessarily a client component — keep that boundary as low in the tree as possible.
- No `useEffect` for data fetching where a server component or a route loader would do.
- Component files under ~200 lines. If it grows past that, it is doing two jobs.
- Props are explicit. No prop-spreading into DOM elements.
- Keys are stable IDs, never array indexes.

## 5. Naming

| Thing | Convention | Example |
|---|---|---|
| Component file | PascalCase | `StudentTable.tsx` |
| Utility file | camelCase | `formatCurrency.ts` |
| Repository | plural camelCase | `students.ts` |
| Type | PascalCase | `AttendanceDay` |
| Boolean | `is` / `has` / `can` | `isPublished` |
| Handler | `handle` + event | `handleSaveAttendance` |
| Route folder | kebab-case | `/admin/fee-structures` |

## 6. Things not to do

- **Do not add a state management library.** React state plus repositories is sufficient here.
- **Do not build abstractions ahead of need.** Two similar forms are not a pattern; three might be.
- **Do not put business rules in components.** Grading scales, fee calculations and attendance percentages live in `lib/utils/` and are unit-testable.
- **Do not hardcode dates.** Use a single `today()` helper so demos can be pinned to a fixed date.
- **Do not swallow errors.** Storage quota failures in particular must surface — see §7.
- **Do not use `window` without guarding for SSR.**

## 7. Storage error handling

`localStorage` throws `QuotaExceededError` when full, and it will happen during a demo if the seed grows. Handle it explicitly:

```ts
try {
  await saveAttendance(day);
} catch (e) {
  if (isQuotaError(e)) {
    // Tell the user plainly and offer the fix.
    toast.error('Storage is full. Reset the demo data from Settings to continue.');
  } else { throw e; }
}
```

Every write path needs this. A silent failure during a demo — where the teacher taps Save and nothing happens — is far worse than an honest error message.

## 8. Business logic that must be centralised and tested

These four calculations appear on multiple screens and must have exactly one implementation each:

| Function | Location | Why it matters |
|---|---|---|
| `attendancePercentage()` | `lib/utils/attendance.ts` | Must exclude holidays; appears on 5 screens |
| `calculateGrade()` | `lib/utils/grading.ts` | Reads the configured scale, never hardcoded |
| `invoiceBalance()` | `lib/utils/fees.ts` | Discounts + partial payments + late fees together |
| `resolveScope()` | `lib/auth/scope.ts` | Which records this role may see |

Write plain unit tests for these four even though the prototype has no test framework requirement. They are where wrong answers are most expensive and least visible.

## 9. Definition of done for a task

- [ ] Acceptance criteria in PROJECT_TASKS.md are met
- [ ] No `localStorage` access outside `lib/storage/`
- [ ] Repository functions async, scope passed explicitly
- [ ] Loading, empty and error states implemented
- [ ] Works at 360px width
- [ ] Keyboard operable, visible focus
- [ ] Matches UI_DESIGN_SYSTEM.md tokens exactly
- [ ] Relevant TESTING_CHECKLIST.md section passes
- [ ] CHANGELOG.md updated
