# Product Requirements

## 1. Roles

Six roles. The hierarchy is about **scope of data**, not seniority.

| Role | Scope | Primary daily job |
|---|---|---|
| Super Admin | All schools, all campuses | Platform oversight; demo-only in Phase 0 |
| School Admin | One school, all its campuses | Students, staff, fees, reports |
| Campus Principal | One campus | Oversight, approvals, announcements |
| Teacher | Assigned classes and subjects | Attendance, homework, marks |
| Parent | Their own children | Check attendance, homework, fees, results |
| Student | Themselves | Courses, assignments, results |

> **Note on Super Admin.** The architecture document deliberately excludes a multi-school super-admin UI from the production Phase 1. It is included in the prototype because it demonstrates the multi-campus and network story to a prospective customer. **Its presence here is not a commitment to build it in Phase 1.** Flag this whenever the prototype is used for scoping.

## 2. Permission matrix

`F` = full · `R` = read only · `O` = own records only · `—` = no access

| Resource | Super Admin | School Admin | Principal | Teacher | Parent | Student |
|---|---|---|---|---|---|---|
| Schools | F | R | — | — | — | — |
| Campuses | F | F | R (own) | — | — | — |
| School settings | F | F | R | — | — | — |
| Students | R | F | R (campus) | R (own classes) | O (own children) | O |
| Parents | R | F | R (campus) | R (own classes) | O | — |
| Teachers | R | F | R (campus) | R | — | — |
| Classes & subjects | R | F | R (campus) | R (assigned) | — | — |
| Timetable | R | F | R (campus) | R (own) | R (child's) | R (own) |
| Attendance | R | F | R (campus) | F (own classes) | R (own children) | R (own) |
| Fees | R | F | R (campus) | — | R (own children) | — |
| Exams & marks | R | F | R (campus) | F (own subjects) | R (published only) | R (published only) |
| Report cards | R | F | R (campus) | R (own classes) | R (published only) | R (published only) |
| Courses & lessons | R | R | R (campus) | F (own) | R (enrolled) | R (enrolled) |
| Assignments | R | R | R (campus) | F (own) | R (own children) | F (own submissions) |
| Announcements | F | F | F (campus) | R | R | R |
| Messages | — | R (audit) | R (audit) | F (own) | F (own) | — |
| Health & pickup data | R | F | R (campus) | R (own classes) | O | — |

**Two rules the prototype must actually enforce in its UI, because they are the ones a school will test:**

1. A parent must never see another family's child. Not in a list, not in a search result, not in a URL that can be edited by hand.
2. A teacher must never see marks for a subject they do not teach.

Enforce both in the route guards and in the repository query layer, not only by hiding menu items.

## 3. Modules

| # | Module | Roles served |
|---|---|---|
| 1 | Authentication & role switching | All |
| 2 | Super admin: schools, campuses, network overview | Super Admin |
| 3 | Campus management | Super Admin, School Admin |
| 4 | Student management | School Admin, Principal |
| 5 | Teacher management | School Admin, Principal |
| 6 | Class, section & subject management | School Admin |
| 7 | Timetable | School Admin, Teacher |
| 8 | Attendance | Teacher, Admin, Principal, Parent |
| 9 | Fee management | School Admin, Parent |
| 10 | Examinations & results | School Admin, Teacher, Parent, Student |
| 11 | LMS: courses, lessons, content | Teacher, Student |
| 12 | Assignments | Teacher, Student, Parent |
| 13 | Announcements & messaging | All |
| 14 | Health, safety & authorised pickup | Admin, Teacher, Parent |
| 15 | Differentiation screens | Varies — see §5 |

## 4. Core workflows

These are the paths a demo will follow. They must work end to end with no dead ends.

**W1 — Morning attendance (Teacher).**
Log in → today's timetable → pick the first class → roster loads with everyone marked present → tap the two absent students → save → confirmation → parent's WhatsApp mock shows the alert.

**W2 — Admit a student (School Admin).**
Students → Add student → fill profile → assign campus and class → link a parent (existing or new) → add emergency contact and authorised pickup → save → student appears in the class roster.

**W3 — Fee cycle (School Admin).**
Fees → structures → generate invoices for the month → invoice list → record a payment against one student → receipt appears → defaulter list updates.

**W4 — Exam to report card (Teacher then Admin).**
Teacher: exam → marks entry grid → save. Admin: results → review → publish → report card preview → print. Parent sees the result only after publication.

**W5 — Parent's daily check (Parent).**
Log in → dashboard shows attendance, pending homework, fee status, next exam → open attendance → monthly view → open homework → see the assignment and its due date.

**W6 — Assignment loop (Teacher then Student).**
Teacher creates an assignment with a deadline → student sees it in "today's tasks" → submits → teacher reviews and grades with feedback → student sees the grade.

**W7 — Network overview (Super Admin).**
Log in → network dashboard → compare three campuses on students, attendance and fee collection → drill into one campus.

## 5. Differentiation screens

From the Differentiation & Value Features document. The PM Delivery Plan triages these for the production build; in the prototype they exist to **test the idea cheaply before committing engineering time.**

| # | Screen | Purpose in the prototype |
|---|---|---|
| 1 | Multi-campus comparison dashboard | Show the network story to a multi-campus school |
| 2 | Student learning profile | Test whether teachers accept the strength/improvement framing |
| 3 | Parent engagement view | **Build it as school-side outreach prompts, not a parent score** — see below |
| 4 | Smart attendance (QR + RFID concept) | Show the options; find out which the school actually wants |
| 5 | WhatsApp message mock | Validate message copy and triggers before buying the real channel |

> **Requirement for screen 3.** Do not build a parent-facing engagement score. The PM Delivery Plan §3.6 sets this out: engagement metrics correlate with literacy, working hours and phone access, so a score will systematically rate poorer families as worse parents, and schools will act on it. Build the view as a school-side prompt list — *"this family hasn't opened the last three homework notices"* — and never surface a rating to the parent. This costs nothing and keeps the entire operational benefit.

> **Requirement for screen 2.** Strength and improvement notes must be **teacher-validated**, not auto-published. The system proposes; a teacher confirms or edits before anything appears on a child's profile. Build the confirmation step into the prototype — it is exactly the kind of thing a school will have an opinion about, and finding out now is the point.
