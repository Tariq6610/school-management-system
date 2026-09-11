# Testing Checklist

Manual verification. Run the relevant section before marking a task done; run everything before a demo.

## Cross-cutting — every screen

- [ ] Loads without console errors
- [ ] Loading state appears before data
- [ ] Empty state is helpful and offers an action
- [ ] Error state explains what to do
- [ ] Usable at 360px with no horizontal scroll
- [ ] Every control reachable by keyboard, focus visible
- [ ] Status never communicated by colour alone
- [ ] Numbers in columns are tabular and aligned
- [ ] Refresh preserves state and session

## Authentication

- [ ] Each of the six demo accounts signs in
- [ ] Session survives a refresh
- [ ] Sign out clears the session and returns to login
- [ ] Wrong role for a route → 403 naming the correct role
- [ ] **A parent editing the URL to another family's child → 404, not the record**
- [ ] **A teacher opening marks for a subject they do not teach → refused**

## Campus scoping

- [ ] Campus switcher changes the data on every scoped screen
- [ ] Selected campus is visible in the top bar and page title
- [ ] Principal sees only their own campus
- [ ] Same grade and section can exist at two campuses without collision

## Students

- [ ] List loads at seed scale; search responds under 300ms
- [ ] Filters combine correctly
- [ ] Admission form: required fields enforced, including one emergency contact
- [ ] Duplicate admission number blocked, naming the existing student
- [ ] Profile tabs all populate
- [ ] Health tab shows allergies at the top
- [ ] Pickup person changes record who and when
- [ ] Inactive students excluded from attendance and invoicing, still readable
- [ ] **Seeded bad data (missing DOB, duplicate numbers) displays without crashing**

## Attendance

- [ ] Teacher dashboard shows today's classes and which are marked
- [ ] All students default to present
- [ ] One tap changes a status; running counts update live
- [ ] **40 students markable and saved in under 60 seconds**
- [ ] Save bar stays visible without scrolling
- [ ] Keyboard: arrows move, P/A/L/V set status
- [ ] Re-opening a marked day loads saved values and shows who marked it
- [ ] Editing within the window works; outside it is refused
- [ ] Absent students generate parent notifications and WhatsApp log entries
- [ ] Percentage excludes holidays
- [ ] Parent calendar matches what the teacher marked
- [ ] Admin overview highlights unmarked classes

## Fees

- [ ] Structures save and apply to the right classes
- [ ] Generation preview shows count and total
- [ ] **Re-running generation for the same month creates no duplicates**
- [ ] Partial payment updates balance and moves status to partial
- [ ] Full payment moves status to paid
- [ ] Sibling discount applies and appears as a line item
- [ ] Receipt number is sequential; reprint reuses it
- [ ] Ledger totals reconcile against the invoice list
- [ ] Defaulter filters work
- [ ] Parent sees the correct balance

## Exams and results

- [ ] Marks entry: Tab and Enter move between students
- [ ] Marks above maximum rejected inline
- [ ] Draft autosaves and survives navigation
- [ ] Grades match the configured scale
- [ ] **Changing the grading scale in Settings changes displayed grades**
- [ ] Unpublished results invisible to parent and student
- [ ] Publishing makes them visible; unpublishing hides them again
- [ ] Report card shows logo, marks, grades, total, attendance, remarks
- [ ] Batch print produces one document for a whole class

## Timetable

- [ ] Slots save and appear in class, teacher and room views
- [ ] Teacher double-booking warns before commit, naming the conflict
- [ ] Room double-booking warns
- [ ] Teacher app "today" matches the timetable

## LMS

- [ ] Course appears for enrolled students automatically
- [ ] Lessons reorder and persist
- [ ] All three content types render
- [ ] Completion updates course progress
- [ ] Assignment deadline enforced; late submissions flagged
- [ ] Grading saves marks and feedback; student sees both

## Communication

- [ ] Announcement reaches the targeted audience only
- [ ] View count is aggregate, with no per-parent list
- [ ] Message thread works both directions with read state
- [ ] Admin audit view shows all threads
- [ ] WhatsApp mock shows all five templates with variables filled

## Differentiation screens

- [ ] Campus comparison figures match the underlying data
- [ ] Learning profile proposals sit pending until confirmed
- [ ] **No auto-published strength or improvement note anywhere**
- [ ] Engagement list shows prompts and a "log a call" action
- [ ] **No parent-visible engagement score exists anywhere in the app**

## Storage

- [ ] Full seed stays under 2MB
- [ ] Quota exceeded shows an actionable message, never a silent failure
- [ ] Reset demo data restores a clean seed
- [ ] Schema version mismatch triggers a reseed

## Demo readiness

- [ ] All seven workflows in DEMO_SCENARIOS.md complete with no dead ends
- [ ] No placeholder text, no "Lorem ipsum", no `TODO` visible on screen
- [ ] Every name and number in seed data looks plausible
- [ ] The prototype banner is visible on every screen
