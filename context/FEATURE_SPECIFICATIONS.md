# Feature Specifications

Behaviour of each module. Where this document and any other disagree about *behaviour*, this document wins. Where it disagrees about *field names*, DATA_MODELS.md wins.

---

## 1. Authentication

**Login page.** Email, password, sign-in button. Below the form, a "Demo accounts" panel listing one account per role; clicking one fills the form and signs in.

| Account | Role |
|---|---|
| `superadmin@abcschool.pk` | Super Admin |
| `admin@abcschool.pk` | School Admin |
| `principal.main@abcschool.pk` | Campus Principal |
| `teacher.sana@abcschool.pk` | Teacher |
| `parent.khan@abcschool.pk` | Parent (two children) |
| `student.ahmed@abcschool.pk` | Student |

Any password is accepted — but the field is still required and still masked, because the demo should look like a login, not a role picker. A note under the panel reads: "Prototype: passwords are not checked."

On success, write `sp:v1:session` and redirect to the role's dashboard. Session survives refresh. Sign out clears it.

**The parent demo account must have two children.** Single-child parent accounts hide the child-switcher, which is one of the things a school will want to see.

---

## 2. Super Admin

**Dashboard.** Five stats: schools, campuses, students, teachers, fee collection this month. Below, a campus comparison table and a recent-activity list.

**Campus comparison (differentiation screen 1).** One row per campus with: students, attendance rate this month, fee collection rate, teacher count, average exam result. Sortable by any column. A bar chart comparing attendance across campuses. Clicking a campus drills into its detail.

This screen exists to show a multi-campus school what the network view looks like. Keep it to what can honestly be computed from seeded data — do not invent metrics.

---

## 3. Campus Management

List of campuses with name, address, principal, student count, class count. Add and edit via a drawer. Assigning a principal picks from users with the principal role at that school.

Deleting a campus that has students is refused, with a message naming how many students would be affected.

---

## 4. Student Management

**List.** Columns: photo, name, admission number, campus, class, attendance %, fee status, status badge. Search by name or admission number, debounced. Filters: campus, class, status. Page size 25.

**Admission form.** Sections, in this order:
1. Personal — name, DOB, gender, blood group, photo
2. Academic — campus, class, section, roll number, admission date; admission number auto-generated and editable
3. Address and contact
4. Parent or guardian — search existing, or create new inline; set relationship and primary flag
5. **Health and safety** — allergies, conditions, medications, doctor; **at least one emergency contact is required**; authorised pickup persons
6. Documents — filename capture only

Validation: name, DOB, campus, class and one emergency contact are required. Duplicate admission numbers are blocked with a message naming the existing student.

**Profile.** Header with photo, name, class, campus, status. Tabs: Overview, Attendance, Fees, Results, Health, Documents.

The **Health tab** shows allergies and conditions prominently at the top — this is a safety screen, not a records screen. Authorised pickup persons are listed with photo and relationship, and every change records who made it and when.

---

## 5. Teacher Management

List with name, employee number, campus, department, subjects, classes. Profile shows assignments, timetable, and attendance summary. Assigning subjects and classes happens in one screen with bulk selection.

---

## 6. Classes, Sections & Subjects

Classes are `grade` + `section` scoped to a campus and academic year, so "Grade 8-A" can exist at Main Campus and Girls Campus simultaneously without collision.

Class detail shows the roster, assigned subjects with their teachers, the class teacher, and the room. Subjects can be added in bulk from a template list.

---

## 7. Timetable

Grid of days × periods for a class. Selecting a cell opens subject and teacher pickers.

**Clash detection is live, not on save.** If the selected teacher already has that period at any campus, the cell shows a warning naming the conflicting class before the user commits. The same applies to rooms.

Views: by class, by teacher, by room. Each is printable.

---

## 8. Attendance

**Teacher flow.** Dashboard lists today's classes with a "Mark attendance" action, and shows which are already marked. The marking screen behaves exactly as specified in UI_DESIGN_SYSTEM.md §7.

On save: write the `AttendanceDay` document, generate parent notifications for absent students, append entries to the WhatsApp mock log, and show a toast naming how many were marked absent.

Editing a previously marked day is allowed within a configurable window (default 2 days) and records the editor and timestamp, shown at the top of the screen.

**Admin view.** Grid of classes × dates showing marked/unmarked and the absent count. Unmarked classes after a configurable time are highlighted — this is the screen that tells an administrator which teacher has not marked their register.

**Parent view.** Monthly calendar, colour-and-label coded, with a summary: present, absent, late, leave, and percentage.

**Percentage rule.** Excludes holidays and non-instructional days. One implementation, in `lib/utils/attendance.ts`.

**QR scanning (differentiation screen 4).** A mock scanner screen: a viewfinder frame, a manual "simulate scan" control that picks a student, and a running list of scanned students. Falls back to the manual grid without a reload. RFID is shown as a concept screen only, clearly labelled as not implemented.

---

## 9. Fee Management

**Structures.** Name, amount, frequency, which classes it applies to, optional campus scope. Example seeded set: Tuition, Transport, Examination, Admission.

**Invoice generation.** Select month and scope, preview how many invoices will be created and the total value, then confirm. **Re-running for the same period must not create duplicates** — it updates or skips, and says which.

**Payment recording.** Amount, method, reference, date. Partial payments allowed; balance recalculates; status moves pending → partial → paid. Receipt gets a sequential number, and reprinting does not issue a new one.

**Discounts and concessions.** Sibling discount, scholarship, staff child. Applied at invoice generation and visible as a line item, never as a silent adjustment to the total.

**Defaulters.** Filter by amount and days overdue. Bulk action: send reminder, which appends to the WhatsApp mock log.

**Parent view.** Current balance on the dashboard, invoice history, downloadable receipts, and a clear next due date.

---

## 10. Examinations & Results

**Exam creation.** Name, term, class, subject, date, maximum marks.

**Marks entry.** A grid of students × one exam. Keyboard-driven: type a mark, press Enter or Tab to move to the next student. Autosaves as draft. Marks above the maximum are rejected inline.

**Grade calculation.** Reads the grading scale from settings. Seed with a percentage scale (A+ ≥ 90, A ≥ 80, B ≥ 70, C ≥ 60, D ≥ 50, F < 50) and make it editable, because this is one of the things every school does differently.

**Publication.** Results are invisible to parents and students until an admin publishes them. Publishing is per exam and reversible.

**Report card.** One page per student: school and campus header with logo, student details, subject rows with marks and grades, total and percentage, attendance summary, class teacher remarks, signature lines. Batch print produces one PDF-like print view for a whole class via the browser print dialog.

> Report card layout is the single most format-sensitive artefact in this product. Build it to be easy to change, and put it in front of the school early — it is one of the main reasons the prototype exists.

---

## 11. LMS

**Course.** Title, description, subject, class, teacher, cover colour. Courses appear for enrolled students automatically via their class.

**Lessons.** Ordered within a course, drag to reorder. Content type video, PDF or notes. Video shows a player placeholder with a title and duration; PDF shows a document placeholder; notes render rich text. No real files are stored.

**Student learning dashboard.** "Today's tasks" grouped by subject: lessons to watch, assignments due, quizzes to take. Course cards show progress as a completed-lessons fraction.

**Progress.** Marking a lesson complete is an explicit student action. Course progress is completed lessons over total lessons, computed on read.

---

## 12. Assignments

**Teacher.** Create with title, instructions, deadline, maximum marks, optional lesson link. Submissions list shows submitted, late and missing counts. Grading screen: submission content, marks field, feedback field.

**Student.** Assignment list with due dates and status. Submission accepts text and a filename. After the deadline, submission is still possible but flagged late.

**Parent.** Read-only view of their child's assignments and grades.

---

## 13. Announcements & Messaging

**Announcements.** Composer with title, body, audience (school, campus or class), publish and expiry dates. Published announcements appear in parent and student feeds and append to the WhatsApp mock log.

View counts are **aggregate only**. Never show which individual parents have not read something — see PRODUCT_REQUIREMENTS.md §5.

**Messaging.** Threaded teacher ↔ parent conversations. Admin has a read-only audit view of all threads, and this must be visible in the UI, because a school will ask about safeguarding.

---

## 14. Student Learning Profile (differentiation screen 2)

Shown to teachers and, once validated, to parents.

Sections:
- Subject performance over time, as a small line chart per subject
- Attendance trend for the year
- Assignment submission history
- **Strengths and areas for improvement**

The strengths section works as follows: the system proposes candidate notes from the data ("Mathematics has improved from 70% to 85% over three assessments"). Each proposal sits in a **pending** state visible only to the teacher, with **Confirm**, **Edit** and **Dismiss** actions. Only confirmed notes appear on the parent-facing profile, and they show the teacher's name.

Do not build an auto-publish path. The confirmation step is the feature.

---

## 15. Parent Engagement (differentiation screen 3)

**Admin-facing only.** A prompt list, not a scoreboard:

> Khan family — has not opened the last 3 homework notices. Last app visit 12 days ago. **[Log a call]**

Sorted by how long since the family last engaged. Each row offers one action: log an outreach call with a note.

**Explicitly not built:** a parent-visible engagement score, a ranked list of parents, a percentage rating on a parent's profile, or any comparison between families. If a stakeholder asks for these, point them at PRODUCT_REQUIREMENTS.md §5 and the reasoning in the PM Delivery Plan §3.6.

---

## 16. WhatsApp Mock (differentiation screen 5)

A phone-shaped view showing a conversation thread as a parent would see it, populated from `sp:v1:whatsappLog`.

Message templates, with variables in braces:

| Trigger | Template |
|---|---|
| Absence | `Dear {parent}, {student} was marked absent today, {date}. — {campus}` |
| Fee reminder | `Dear {parent}, fee of Rs {amount} for {student} is due on {date}. — {campus}` |
| Homework | `New homework in {subject} for {student}, due {date}. — {campus}` |
| Announcement | `{title}\n\n{body}\n— {campus}` |
| Result published | `Results for {exam} are now available for {student}. — {campus}` |

A control panel beside the phone lists every message the system has generated, with trigger, recipient and time.

> The real value of this screen is the copy. These templates must eventually be approved by Meta before they can be sent, and rejected templates cost days. Reviewing the wording with the school now, on a mock, is free.

---

## 17. Settings

Categories matching the architecture document: General, Academic, Attendance, Fees, Notifications, Branding.

Everything a school might do differently is a setting, not a constant — grading scale, attendance statuses, attendance edit window, late fee percentage, academic year dates, receipt number format, school logo and colours.

Settings also holds the demo controls: **Reset demo data** and **Switch role**, both clearly labelled as prototype-only.
