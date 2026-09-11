# Data Models

All persistence is `localStorage`, accessed **only** through `lib/repositories/`.

## 1. Key naming

```
sp:v1:<collection>
```

`sp` namespaces the app. `v1` allows the seed to detect and reset an outdated schema. Never write a key without both prefixes.

```
sp:v1:users            sp:v1:students          sp:v1:courses
sp:v1:schools          sp:v1:parents           sp:v1:lessons
sp:v1:campuses         sp:v1:studentParents    sp:v1:assignments
sp:v1:academicYears    sp:v1:teachers          sp:v1:submissions
sp:v1:settings         sp:v1:classes           sp:v1:exams
sp:v1:session          sp:v1:subjects          sp:v1:examResults
sp:v1:meta             sp:v1:timetableSlots    sp:v1:announcements
                       sp:v1:attendance        sp:v1:messages
                       sp:v1:feeStructures     sp:v1:notifications
                       sp:v1:feeInvoices       sp:v1:whatsappLog
```

`sp:v1:meta` holds `{ schemaVersion, seededAt, seedProfile }`. On boot, if `schemaVersion` does not match the app's expected version, wipe and reseed.

## 2. Field naming rule

**Use the same field names as the Project & Architecture Document §8.** `school_id` becomes `schoolId` in TypeScript, but the concept and the name must match, so Phase 1 inherits the model rather than translating it.

Every record carries `id`, `schoolId`, and — where the entity belongs to a campus — `campusId`. This mirrors Architecture Rule 1 and Rule 8. Carrying them in the prototype costs nothing and means the screens already pass the right scoping arguments when the real API arrives.

## 3. Core types

```ts
type ID = string;                      // "stu_00412"
type ISODate = string;                 // "2026-09-07"
type Role = 'super_admin' | 'school_admin' | 'principal'
          | 'teacher' | 'parent' | 'student';

interface School   { id: ID; name: string; address: string; timezone: string;
                     logoUrl?: string; status: 'active' | 'inactive'; }

interface Campus   { id: ID; schoolId: ID; name: string; address: string;
                     principalId?: ID; isPrimary: boolean; }

interface AcademicYear { id: ID; schoolId: ID; name: string;
                         startDate: ISODate; endDate: ISODate; isCurrent: boolean; }

interface User     { id: ID; schoolId: ID; campusId?: ID; name: string; email: string;
                     role: Role; phone?: string; avatarUrl?: string;
                     status: 'active' | 'inactive'; }

interface Student  { id: ID; schoolId: ID; campusId: ID; userId: ID; classId: ID;
                     academicYearId: ID; admissionNumber: string; rollNumber: string;
                     dob: ISODate; gender: 'male' | 'female';
                     address: string; admissionDate: ISODate;
                     status: 'active' | 'transferred' | 'graduated' | 'withdrawn';
                     health: HealthRecord; }

interface HealthRecord { allergies: string[]; conditions: string[];
                         medications: string[]; bloodGroup?: string;
                         doctorName?: string; doctorPhone?: string;
                         emergencyContacts: EmergencyContact[];
                         authorisedPickup: PickupPerson[]; }

interface EmergencyContact { name: string; relationship: string;
                             phone: string; priority: number; }

interface PickupPerson { name: string; relationship: string;
                         phone: string; photoUrl?: string;
                         addedBy: ID; addedAt: string; }

interface Parent   { id: ID; schoolId: ID; userId: ID; occupation?: string; }

interface StudentParent { id: ID; studentId: ID; parentId: ID;
                          relationship: 'father' | 'mother' | 'guardian';
                          isPrimary: boolean; }

interface Teacher  { id: ID; schoolId: ID; campusId: ID; userId: ID;
                     employeeNumber: string; department: string;
                     subjectIds: ID[]; joinedAt: ISODate; }

interface Class    { id: ID; schoolId: ID; campusId: ID; academicYearId: ID;
                     grade: string;          // "Grade 8"
                     section: string;        // "A"
                     classTeacherId?: ID; room?: string; capacity: number; }

interface Subject  { id: ID; schoolId: ID; classId: ID; name: string;
                     code: string; teacherId?: ID; }

interface TimetableSlot { id: ID; schoolId: ID; campusId: ID; classId: ID;
                          subjectId: ID; teacherId: ID; dayOfWeek: 1|2|3|4|5|6;
                          period: number; startTime: string; endTime: string;
                          room?: string; }
```

## 4. Attendance — stored per class per day

**Do not store one record per student per day.** See §6 for why. Store a single document per class per date:

```ts
interface AttendanceDay {
  id: ID;                              // "att_cls_8a_2026-09-07"
  schoolId: ID; campusId: ID; classId: ID;
  academicYearId: ID; date: ISODate;
  present: ID[];                       // studentIds
  absent: ID[];
  late: ID[];
  leave: ID[];
  markedBy: ID; markedAt: string;
  editedBy?: ID; editedAt?: string;
}
```

This is roughly 20× more compact than per-student rows, and it matches how the real API should batch a class submission anyway — so the screen code transfers directly to Phase 1.

Derived values — a student's monthly percentage, a class summary — are **computed on read**, never stored. Storing them creates two sources of truth in a prototype that has no way to reconcile them.

## 5. Remaining types

```ts
interface FeeStructure { id: ID; schoolId: ID; campusId?: ID; academicYearId: ID;
                         name: string; amount: number;
                         frequency: 'monthly' | 'term' | 'annual';
                         appliesToClassIds: ID[]; }

interface FeeInvoice  { id: ID; schoolId: ID; campusId: ID; studentId: ID;
                        feeStructureId: ID; invoiceNumber: string;
                        lineItems: { label: string; amount: number }[];
                        totalAmount: number; discountAmount: number;
                        paidAmount: number; dueDate: ISODate;
                        status: 'pending' | 'partial' | 'paid' | 'overdue';
                        payments: Payment[]; }

interface Payment     { id: ID; amount: number; method: 'cash' | 'cheque' | 'bank';
                        reference?: string; receivedBy: ID; receivedAt: string;
                        receiptNumber: string; }

interface Exam        { id: ID; schoolId: ID; campusId: ID; academicYearId: ID;
                        name: string; term: string; classId: ID; subjectId: ID;
                        date: ISODate; maxMarks: number;
                        status: 'draft' | 'marks_entered' | 'published'; }

interface ExamResult  { id: ID; examId: ID; studentId: ID;
                        marksObtained: number | null; grade?: string;
                        remarks?: string; }

interface Course      { id: ID; schoolId: ID; campusId: ID; subjectId: ID;
                        classId: ID; teacherId: ID; title: string;
                        description: string; coverColor: string; }

interface Lesson      { id: ID; schoolId: ID; courseId: ID; title: string;
                        orderIndex: number;
                        contentType: 'video' | 'pdf' | 'notes';
                        contentUrl?: string; body?: string;
                        durationMinutes?: number; }

interface Assignment  { id: ID; schoolId: ID; courseId: ID; lessonId?: ID;
                        title: string; instructions: string;
                        deadline: string; maxMarks: number; }

interface Submission  { id: ID; assignmentId: ID; studentId: ID;
                        body?: string; fileName?: string;
                        submittedAt: string;
                        marksObtained?: number; feedback?: string;
                        gradedBy?: ID; gradedAt?: string; }

interface Announcement { id: ID; schoolId: ID; campusId?: ID; classId?: ID;
                         title: string; body: string; authorId: ID;
                         audience: 'school' | 'campus' | 'class';
                         publishAt: string; expiresAt?: string; viewCount: number; }

interface Message      { id: ID; schoolId: ID; threadId: ID;
                         senderId: ID; recipientId: ID; body: string; sentAt: string;
                         readAt?: string; }

interface Notification { id: ID; schoolId: ID; recipientId: ID;
                         type: 'attendance' | 'fee' | 'homework' | 'exam' | 'announcement';
                         title: string; body: string; createdAt: string; readAt?: string; }

interface WhatsAppLog  { id: ID; schoolId: ID; recipientPhone: string;
                         recipientName: string; template: string; body: string;
                         trigger: string; sentAt: string;
                         status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed'; }
```

`WhatsAppLog` is a **mock**. Nothing is sent. It exists so the demo can show a realistic message list and so the message copy can be reviewed by the school — which is genuinely useful, because that copy has to be approved by Meta later.

## 6. Seed data and the storage ceiling

`localStorage` allows roughly **5MB per origin**. This is the prototype's hardest constraint and it must be designed for, not discovered.

**Seed profile: `demo-network`**

| Entity | Volume | Notes |
|---|---|---|
| Schools | 1 | "ABC School Network" |
| Campuses | 3 | Main, Girls, North |
| Students | 420 | Main 200, Girls 140, North 80 |
| Parents | 340 | Some with siblings, deliberately |
| Teachers | 34 | Across three campuses |
| Classes | 21 | Grades 6–10, sections A/B |
| Subjects | 105 | 5 per class |
| Attendance | **Last 40 school days only** | Per-class-per-day documents |
| Fee invoices | Current month + 2 previous | Mixed paid, partial, overdue |
| Exams | One completed term, one in progress | |
| Courses | 12 | With 4–8 lessons each |
| Assignments | 30 | Mixed submitted, graded, pending |

**Why 420 students and not 1,200.** The differentiation document shows 1,200 students at Main Campus. At full per-student attendance rows that alone exceeds the storage ceiling. Per-class-per-day documents plus a 40-day window keeps the whole seed near 1.5MB, which leaves headroom for a demo session's own writes. If a demo needs to *show* 1,200, display the number from a campus statistic field rather than seeding 1,200 records.

**Seed data quality rules — these matter more than volume:**

- Real Pakistani names, correctly spelled, with a realistic mix.
- **Deliberately imperfect data**: 3 students with no date of birth, 2 duplicate admission numbers, 1 parent phone number missing a country code. The prototype should surface these, because discovering how the UI handles bad data is part of the point, and the pilot school's real data will be far worse.
- Attendance between 72% and 99%, not all 95%. Include one student on a visible downward trend for the learning-profile screen.
- Fees: about 70% paid, 20% pending, 10% overdue. Include one family with two children and a sibling discount.
- Marks that produce a believable distribution, not everyone at 85%.

## 7. Repository interface

Every collection gets a repository in `lib/repositories/`. All functions are `async`.

```ts
// lib/repositories/students.ts
export async function listStudents(
  scope: { schoolId: ID; campusId?: ID; classId?: ID },
  filter?: { search?: string; status?: Student['status'] }
): Promise<Student[]>;

export async function getStudent(id: ID): Promise<Student | null>;
export async function createStudent(input: NewStudent): Promise<Student>;
export async function updateStudent(id: ID, patch: Partial<Student>): Promise<Student>;
export async function deleteStudent(id: ID): Promise<void>;
```

The `scope` argument is mandatory and is never optional, even though the prototype has one school. This is Architecture Rule 3 applied to the prototype: when the real API arrives, the call sites already pass what it needs.
