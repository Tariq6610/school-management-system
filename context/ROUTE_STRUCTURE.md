# Route Structure

Every route is guarded. A guard checks **role** and **scope** — a parent hitting `/parent/attendance?studentId=other_child` must be refused, not merely unlinked.

## Public

| Route | Purpose |
|---|---|
| `/` | Redirects to `/login`, or to the role's dashboard if a session exists |
| `/login` | Email + password, plus demo account quick-select |

## Super Admin

| Route | Purpose |
|---|---|
| `/super-admin/dashboard` | Network overview: schools, campuses, students, teachers, revenue |
| `/super-admin/schools` | School list |
| `/super-admin/schools/[schoolId]` | School detail and campuses |
| `/super-admin/campuses` | All campuses across schools |
| `/super-admin/campus-comparison` | **Differentiation screen 1** — side-by-side campus performance |

## School Admin

| Route | Purpose |
|---|---|
| `/admin/dashboard` | Students, today's attendance, pending fees, upcoming exams |
| `/admin/campuses` | Campus list, add, edit, assign principal |
| `/admin/students` | Student list, search, filter by campus/class/status |
| `/admin/students/new` | Admission form |
| `/admin/students/[id]` | Profile — info, attendance, fees, results, health, documents |
| `/admin/students/[id]/edit` | Edit profile |
| `/admin/teachers` | Teacher list |
| `/admin/teachers/new` · `/admin/teachers/[id]` | Add, profile, assignments |
| `/admin/classes` | Classes and sections |
| `/admin/classes/[id]` | Class detail, roster, subjects |
| `/admin/subjects` | Subject list and teacher assignment |
| `/admin/timetable` | Timetable builder grid |
| `/admin/attendance` | Attendance overview by class and date |
| `/admin/attendance/reports` | Daily and monthly reports, export |
| `/admin/fees/structures` | Fee structures |
| `/admin/fees/invoices` | Invoice list, bulk generate |
| `/admin/fees/invoices/[id]` | Invoice detail, record payment, receipt |
| `/admin/fees/defaulters` | Overdue report |
| `/admin/exams` | Exam list, create |
| `/admin/exams/[id]` | Exam detail, marks review, publish |
| `/admin/results/report-cards` | Report card preview and batch print |
| `/admin/announcements` | Announcement list and composer |
| `/admin/engagement` | **Differentiation screen 3** — outreach prompts, no parent score |
| `/admin/reports` | Standard report pack |
| `/admin/settings` | School, academic, attendance, fees, branding settings |

## Principal

| Route | Purpose |
|---|---|
| `/principal/dashboard` | Own campus only |
| `/principal/teachers` · `/principal/students` | Read-only, campus-scoped |
| `/principal/attendance` | Campus attendance overview |
| `/principal/results` | Campus results |
| `/principal/leave-requests` | Approve or reject staff leave |
| `/principal/announcements` | Campus announcements |

## Teacher

| Route | Purpose |
|---|---|
| `/teacher/dashboard` | Today's timetable, classes to mark, pending grading |
| `/teacher/classes` | Assigned classes |
| `/teacher/classes/[id]/attendance` | **The attendance screen** |
| `/teacher/classes/[id]/students` | Roster, with health alerts |
| `/teacher/attendance/scan` | **Differentiation screen 4** — QR scan mock |
| `/teacher/homework` | Homework list and creation |
| `/teacher/courses` · `/teacher/courses/[id]` | LMS authoring |
| `/teacher/courses/[id]/lessons/[lessonId]` | Lesson editor |
| `/teacher/assignments` · `/teacher/assignments/[id]` | Submissions and grading |
| `/teacher/exams/[id]/marks` | Marks entry grid |
| `/teacher/students/[id]/profile` | **Differentiation screen 2** — learning profile with teacher validation |
| `/teacher/messages` | Parent conversations |

## Parent

| Route | Purpose |
|---|---|
| `/parent/dashboard` | Per child: attendance, homework, fees, next exam |
| `/parent/attendance` | Monthly calendar view |
| `/parent/homework` | Assignments and due dates |
| `/parent/fees` | Invoices, balance, receipts |
| `/parent/results` | Published results and report cards |
| `/parent/messages` | Teacher conversations |
| `/parent/announcements` | School and class announcements |
| `/parent/children/[id]` | Child profile including health and pickup persons |

All parent routes take the selected child from a **child switcher** in the top bar, which lists only that parent's own children.

## Student

| Route | Purpose |
|---|---|
| `/student/dashboard` | Today's tasks: lessons to watch, quizzes, assignments due |
| `/student/courses` · `/student/courses/[id]` | Enrolled courses |
| `/student/courses/[id]/lessons/[lessonId]` | Lesson player |
| `/student/assignments` · `/student/assignments/[id]` | View and submit |
| `/student/results` | Published results |

## Demo-only

| Route | Purpose |
|---|---|
| `/demo/whatsapp` | **Differentiation screen 5** — mock WhatsApp inbox showing sent messages |
| `/demo/reset` | Wipe and reseed. Reachable from Settings. |
| `/demo/switch-role` | Instant role switch without logging out. **Demo affordance only** — label it clearly as such on screen so nobody mistakes it for a feature. |

## Guard behaviour

| Condition | Result |
|---|---|
| No session | Redirect to `/login` |
| Wrong role for the route | 403 page explaining which role the page belongs to |
| Right role, out-of-scope record | 404, not 403 — do not confirm the record exists |
| Unknown route | 404 with a link back to the role's dashboard |
