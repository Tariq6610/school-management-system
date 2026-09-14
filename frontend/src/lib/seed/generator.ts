/**
 * Deterministic seed generator for the 'demo-network' profile.
 * Implements volumes, quality rules, and deliberate anomalies per DATA_MODELS.md §6.
 */

import type {
  AcademicYear,
  Announcement,
  Assignment,
  AttendanceDay,
  Campus,
  Class,
  Course,
  Exam,
  ExamResult,
  FeeInvoice,
  FeeStructure,
  LeaveRequest,
  Lesson,
  Message,
  Meta,
  Notification,
  Parent,
  School,
  Settings,
  Student,
  StudentParent,
  Subject,
  Submission,
  Teacher,
  TimetableSlot,
  User,
  WhatsAppLog,
} from '../../types';
import { ALLERGIES, CONDITIONS, FEMALE_FIRST_NAMES, LAST_NAMES, MALE_FIRST_NAMES, MEDICATIONS, STREETS } from './names';

export interface SeedData {
  school: School;
  campuses: Campus[];
  academicYear: AcademicYear;
  users: User[];
  teachers: Teacher[];
  classes: Class[];
  subjects: Subject[];
  timetableSlots: TimetableSlot[];
  students: Student[];
  parents: Parent[];
  studentParents: StudentParent[];
  attendance: AttendanceDay[];
  feeStructures: FeeStructure[];
  feeInvoices: FeeInvoice[];
  exams: Exam[];
  examResults: ExamResult[];
  courses: Course[];
  lessons: Lesson[];
  assignments: Assignment[];
  submissions: Submission[];
  announcements: Announcement[];
  leaveRequests: LeaveRequest[];
  messages: Message[];
  notifications: Notification[];
  whatsappLog: WhatsAppLog[];
  settings: Settings;
  meta: Meta;
}

export function generateSeedData(): SeedData {
  const schoolId = 'sch_main';
  const academicYearId = 'ay_2026_2027';

  // 1. School
  const school: School = {
    id: schoolId,
    name: 'ABC School Network',
    address: 'Sector F-8/3, Islamabad, Pakistan',
    timezone: 'Asia/Karachi',
    logoUrl: '/logo.svg',
    status: 'active',
  };

  // 2. Campuses (3 campuses: Main, Girls, North)
  const campuses: Campus[] = [
    {
      id: 'cmp_main',
      schoolId,
      name: 'Main Campus',
      address: 'Plot 12-B, Sector F-8/3, Islamabad',
      principalId: 'usr_principal_main',
      isPrimary: true,
    },
    {
      id: 'cmp_girls',
      schoolId,
      name: 'Girls Campus',
      address: 'Street 9, Sector G-10/2, Islamabad',
      principalId: 'usr_principal_girls',
      isPrimary: false,
    },
    {
      id: 'cmp_north',
      schoolId,
      name: 'North Campus',
      address: 'Main Murree Road, Rawalpindi',
      principalId: 'usr_principal_north',
      isPrimary: false,
    },
  ];

  // 3. Academic Year
  const academicYear: AcademicYear = {
    id: academicYearId,
    schoolId,
    name: 'Academic Year 2026–2027',
    startDate: '2026-08-15',
    endDate: '2027-06-15',
    isCurrent: true,
  };

  // 4. Base Users (starting with the 6 required demo accounts)
  const users: User[] = [
    {
      id: 'usr_superadmin',
      schoolId,
      name: 'Khurram Shahzad (Super Admin)',
      email: 'superadmin@abcschool.pk',
      role: 'super_admin',
      phone: '+923001234567',
      status: 'active',
    },
    {
      id: 'usr_admin',
      schoolId,
      campusId: 'cmp_main',
      name: 'Zia-ur-Rehman (Admin)',
      email: 'admin@abcschool.pk',
      role: 'school_admin',
      phone: '+923012345678',
      status: 'active',
    },
    {
      id: 'usr_principal_main',
      schoolId,
      campusId: 'cmp_main',
      name: 'Dr. Asad Qureshi (Principal)',
      email: 'principal.main@abcschool.pk',
      role: 'principal',
      phone: '+923023456789',
      status: 'active',
    },
    {
      id: 'usr_principal_girls',
      schoolId,
      campusId: 'cmp_girls',
      name: 'Mrs. Tahira Batool',
      email: 'principal.girls@abcschool.pk',
      role: 'principal',
      phone: '+923034567890',
      status: 'active',
    },
    {
      id: 'usr_principal_north',
      schoolId,
      campusId: 'cmp_north',
      name: 'Mr. Tariq Mehmood',
      email: 'principal.north@abcschool.pk',
      role: 'principal',
      phone: '+923045678901',
      status: 'active',
    },
    {
      id: 'usr_teacher_sana',
      schoolId,
      campusId: 'cmp_main',
      name: 'Sana Malik',
      email: 'teacher.sana@abcschool.pk',
      role: 'teacher',
      phone: '+923056789012',
      status: 'active',
    },
    {
      id: 'usr_parent_khan',
      schoolId,
      name: 'Tariq Khan',
      email: 'parent.khan@abcschool.pk',
      role: 'parent',
      phone: '+923067890123',
      status: 'active',
    },
    {
      id: 'usr_student_ahmed',
      schoolId,
      campusId: 'cmp_main',
      name: 'Ahmed Khan',
      email: 'student.ahmed@abcschool.pk',
      role: 'student',
      phone: '+923078901234',
      status: 'active',
    },
    {
      id: 'usr_student_ayesha',
      schoolId,
      campusId: 'cmp_main',
      name: 'Ayesha Khan',
      email: 'ayesha.khan@student.abcschool.pk',
      role: 'student',
      phone: '+923089012345',
      status: 'active',
    },
  ];

  // 5. Teachers (34 total across 3 campuses: 16 Main, 11 Girls, 7 North)
  const teachers: Teacher[] = [];
  const teacherCampusCounts = [
    { campusId: 'cmp_main', count: 16 },
    { campusId: 'cmp_girls', count: 11 },
    { campusId: 'cmp_north', count: 7 },
  ];

  let teacherGlobalIdx = 1;
  for (const tc of teacherCampusCounts) {
    for (let i = 0; i < tc.count; i++) {
      const isSana = tc.campusId === 'cmp_main' && i === 0;
      const tId = isSana ? 'tch_sana' : `tch_${teacherGlobalIdx}`;
      const uId = isSana ? 'usr_teacher_sana' : `usr_tch_${teacherGlobalIdx}`;

      if (!isSana) {
        const isFemale = tc.campusId === 'cmp_girls' || i % 2 === 1;
        const firstName = isFemale
          ? FEMALE_FIRST_NAMES[teacherGlobalIdx % FEMALE_FIRST_NAMES.length]
          : MALE_FIRST_NAMES[teacherGlobalIdx % MALE_FIRST_NAMES.length];
        const lastName = LAST_NAMES[teacherGlobalIdx % LAST_NAMES.length];
        const fullName = `${firstName} ${lastName}`;

        users.push({
          id: uId,
          schoolId,
          campusId: tc.campusId,
          name: fullName,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${teacherGlobalIdx}@abcschool.pk`,
          role: 'teacher',
          phone: `+923${String(100000000 + teacherGlobalIdx).substring(0, 9)}`,
          status: 'active',
        });
      }

      teachers.push({
        id: tId,
        schoolId,
        campusId: tc.campusId,
        userId: uId,
        employeeNumber: `EMP-${2020 + (teacherGlobalIdx % 5)}-${String(teacherGlobalIdx).padStart(3, '0')}`,
        department: ['Mathematics', 'Sciences', 'Languages', 'Social Studies'][teacherGlobalIdx % 4],
        subjectIds: [],
        joinedAt: '2023-08-15',
      });

      teacherGlobalIdx++;
    }
  }

  // 6. Classes (21 classes: 10 Main, 7 Girls, 4 North)
  const classes: Class[] = [];
  const classConfigs = [
    {
      campusId: 'cmp_main',
      sections: [
        { grade: 'Grade 6', section: 'A' }, { grade: 'Grade 6', section: 'B' },
        { grade: 'Grade 7', section: 'A' }, { grade: 'Grade 7', section: 'B' },
        { grade: 'Grade 8', section: 'A' }, { grade: 'Grade 8', section: 'B' },
        { grade: 'Grade 9', section: 'A' }, { grade: 'Grade 9', section: 'B' },
        { grade: 'Grade 10', section: 'A' }, { grade: 'Grade 10', section: 'B' },
      ],
    },
    {
      campusId: 'cmp_girls',
      sections: [
        { grade: 'Grade 6', section: 'A' },
        { grade: 'Grade 7', section: 'A' },
        { grade: 'Grade 8', section: 'A' },
        { grade: 'Grade 9', section: 'A' }, { grade: 'Grade 9', section: 'B' },
        { grade: 'Grade 10', section: 'A' }, { grade: 'Grade 10', section: 'B' },
      ],
    },
    {
      campusId: 'cmp_north',
      sections: [
        { grade: 'Grade 6', section: 'A' },
        { grade: 'Grade 7', section: 'A' },
        { grade: 'Grade 8', section: 'A' },
        { grade: 'Grade 9', section: 'A' },
      ],
    },
  ];

  let classIdx = 1;
  for (const cc of classConfigs) {
    for (const sec of cc.sections) {
      const clsId = `cls_${classIdx}`;
      const assignedTeacher = teachers.find((t) => t.campusId === cc.campusId);
      classes.push({
        id: clsId,
        schoolId,
        campusId: cc.campusId,
        academicYearId,
        grade: sec.grade,
        section: sec.section,
        classTeacherId: assignedTeacher ? assignedTeacher.id : undefined,
        room: `Room ${100 + classIdx}`,
        capacity: 30,
      });
      classIdx++;
    }
  }

  // 7. Subjects (105 subjects: 5 per class)
  const subjects: Subject[] = [];
  const subjectTemplates = [
    { name: 'English Literature & Grammar', code: 'ENG' },
    { name: 'Mathematics', code: 'MTH' },
    { name: 'General Science', code: 'SCI' },
    { name: 'Urdu', code: 'URD' },
    { name: 'Pakistan Studies & Islamiyat', code: 'PST' },
  ];

  let sbjIdx = 1;
  for (const cls of classes) {
    const campusTeachers = teachers.filter((t) => t.campusId === cls.campusId);
    for (let s = 0; s < subjectTemplates.length; s++) {
      const tmpl = subjectTemplates[s];
      const assignedTeacher = campusTeachers[s % campusTeachers.length];
      const sbjId = `sbj_${sbjIdx}`;
      subjects.push({
        id: sbjId,
        schoolId,
        classId: cls.id,
        name: tmpl.name,
        code: `${tmpl.code}-${cls.grade.replace('Grade ', '')}`,
        teacherId: assignedTeacher ? assignedTeacher.id : undefined,
      });
      if (assignedTeacher && !assignedTeacher.subjectIds.includes(sbjId)) {
        assignedTeacher.subjectIds.push(sbjId);
      }
      sbjIdx++;
    }
  }

  // 8. Timetable Slots (sample schedule for each class)
  const timetableSlots: TimetableSlot[] = [];
  let slotIdx = 1;
  const periods = [
    { period: 1, startTime: '08:00', endTime: '08:45' },
    { period: 2, startTime: '08:45', endTime: '09:30' },
    { period: 3, startTime: '09:45', endTime: '10:30' },
    { period: 4, startTime: '10:30', endTime: '11:15' },
    { period: 5, startTime: '11:30', endTime: '12:15' },
  ];

  for (const cls of classes) {
    const clsSubjects = subjects.filter((s) => s.classId === cls.id);
    for (let day = 1; day <= 5; day++) {
      for (let p = 0; p < periods.length; p++) {
        const sub = clsSubjects[p % clsSubjects.length];
        if (sub && sub.teacherId) {
          timetableSlots.push({
            id: `tts_${slotIdx++}`,
            schoolId,
            campusId: cls.campusId,
            classId: cls.id,
            subjectId: sub.id,
            teacherId: sub.teacherId,
            dayOfWeek: day as 1 | 2 | 3 | 4 | 5,
            period: periods[p].period,
            startTime: periods[p].startTime,
            endTime: periods[p].endTime,
            room: cls.room,
          });
        }
      }
    }
  }

  // 9. Students (420 total: Main 200, Girls 140, North 80)
  // 10. Parents (340 total)
  const students: Student[] = [];
  const parents: Parent[] = [];
  const studentParents: StudentParent[] = [];

  // Seed Tariq Khan as the first parent
  parents.push({
    id: 'prt_khan',
    schoolId,
    userId: 'usr_parent_khan',
    occupation: 'Chartered Accountant',
  });

  let studentGlobalIdx = 1;
  let parentGlobalIdx = 2; // Tariq Khan is 1

  for (const cls of classes) {
    const studentsInThisClass = 20; // 21 * 20 = 420 students exactly
    const isGirlsCampus = cls.campusId === 'cmp_girls';

    for (let s = 0; s < studentsInThisClass; s++) {
      const isAhmed = cls.campusId === 'cmp_main' && cls.grade === 'Grade 8' && cls.section === 'A' && s === 0;
      const isAyesha = cls.campusId === 'cmp_main' && cls.grade === 'Grade 6' && cls.section === 'A' && s === 0;

      const stuId = isAhmed ? 'stu_ahmed' : isAyesha ? 'stu_ayesha' : `stu_${studentGlobalIdx}`;
      const uId = isAhmed ? 'usr_student_ahmed' : isAyesha ? 'usr_student_ayesha' : `usr_stu_${studentGlobalIdx}`;

      const gender: 'male' | 'female' = isGirlsCampus ? 'female' : isAyesha ? 'female' : s % 2 === 0 ? 'male' : 'female';
      const firstName = isAhmed
        ? 'Ahmed'
        : isAyesha
        ? 'Ayesha'
        : gender === 'male'
        ? MALE_FIRST_NAMES[studentGlobalIdx % MALE_FIRST_NAMES.length]
        : FEMALE_FIRST_NAMES[studentGlobalIdx % FEMALE_FIRST_NAMES.length];

      const lastName = isAhmed || isAyesha ? 'Khan' : LAST_NAMES[studentGlobalIdx % LAST_NAMES.length];

      if (!isAhmed && !isAyesha) {
        users.push({
          id: uId,
          schoolId,
          campusId: cls.campusId,
          name: `${firstName} ${lastName}`,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${studentGlobalIdx}@student.abcschool.pk`,
          role: 'student',
          phone: `+923${String(200000000 + studentGlobalIdx).substring(0, 9)}`,
          status: 'active',
        });
      }

      // Quality Rule: Deliberate Bad Data #1
      // 3 students with no date of birth
      let dob = `201${4 - Math.floor((parseInt(cls.grade.replace('Grade ', '')) - 6) / 2)}-0${(s % 9) + 1}-15`;
      if (studentGlobalIdx === 15 || studentGlobalIdx === 78 || studentGlobalIdx === 203) {
        dob = ''; // Deliberately missing DOB
      }

      // Quality Rule: Deliberate Bad Data #2
      // 2 duplicate admission numbers
      let admissionNumber = `ADM-2026-${String(studentGlobalIdx).padStart(4, '0')}`;
      if (studentGlobalIdx === 43) {
        admissionNumber = 'ADM-2026-0042'; // duplicate of student 42!
      }

      const emergencyPhone = `+9230${(studentGlobalIdx % 9) + 1}7654321`;

      students.push({
        id: stuId,
        schoolId,
        campusId: cls.campusId,
        userId: uId,
        classId: cls.id,
        academicYearId,
        admissionNumber,
        rollNumber: String(s + 1).padStart(2, '0'),
        dob,
        gender,
        address: STREETS[studentGlobalIdx % STREETS.length],
        admissionDate: '2026-08-15',
        status: 'active',
        health: {
          allergies: studentGlobalIdx % 7 === 0 ? [ALLERGIES[studentGlobalIdx % ALLERGIES.length]] : [],
          conditions: studentGlobalIdx % 10 === 0 ? [CONDITIONS[studentGlobalIdx % CONDITIONS.length]] : [],
          medications: studentGlobalIdx % 10 === 0 ? [MEDICATIONS[studentGlobalIdx % MEDICATIONS.length]] : [],
          bloodGroup: ['A+', 'B+', 'O+', 'AB+'][studentGlobalIdx % 4],
          emergencyContacts: [
            {
              name: `${LAST_NAMES[(studentGlobalIdx + 2) % LAST_NAMES.length]} (Guardian)`,
              relationship: 'Father',
              phone: emergencyPhone,
              priority: 1,
            },
          ],
          authorisedPickup: [
            {
              name: `Driver / Family Member (${firstName})`,
              relationship: 'Authorized Driver',
              phone: emergencyPhone,
              addedBy: 'usr_admin',
              addedAt: '2026-08-16',
            },
          ],
        },
      });

      // Link parents
      if (isAhmed || isAyesha) {
        // Tariq Khan is parent to both
        studentParents.push({
          id: `sp_${isAhmed ? 'ahmed' : 'ayesha'}`,
          studentId: stuId,
          parentId: 'prt_khan',
          relationship: 'father',
          isPrimary: true,
        });
      } else {
        // Link to existing parent or create new parent up to 340 parents
        if (parentGlobalIdx <= 340) {
          const parentUserId = `usr_prt_${parentGlobalIdx}`;
          const parentFatherName = `${MALE_FIRST_NAMES[parentGlobalIdx % MALE_FIRST_NAMES.length]} ${lastName}`;
          
          // Quality Rule: Deliberate Bad Data #3
          // 1 parent phone number missing country code / malformed
          let parentPhone = `+923${String(300000000 + parentGlobalIdx).substring(0, 9)}`;
          if (parentGlobalIdx === 88) {
            parentPhone = '03005551234'; // Missing international country code prefix
          }

          users.push({
            id: parentUserId,
            schoolId,
            name: parentFatherName,
            email: `parent.${lastName.toLowerCase()}${parentGlobalIdx}@gmail.com`,
            role: 'parent',
            phone: parentPhone,
            status: 'active',
          });

          const pId = `prt_${parentGlobalIdx}`;
          parents.push({
            id: pId,
            schoolId,
            userId: parentUserId,
            occupation: ['Engineer', 'Doctor', 'Businessman', 'Civil Servant', 'Teacher', 'Lawyer'][parentGlobalIdx % 6],
          });

          studentParents.push({
            id: `sp_${studentGlobalIdx}`,
            studentId: stuId,
            parentId: pId,
            relationship: 'father',
            isPrimary: true,
          });

          parentGlobalIdx++;
        } else {
          // Sibling case: re-use an existing parent
          const sharedParentId = `prt_${(studentGlobalIdx % 330) + 1}`;
          studentParents.push({
            id: `sp_${studentGlobalIdx}`,
            studentId: stuId,
            parentId: sharedParentId,
            relationship: 'father',
            isPrimary: true,
          });
        }
      }

      studentGlobalIdx++;
    }
  }

  // 11. Attendance (Last 40 school days, per-class-per-day documents)
  // Pinned anchor date: 2026-09-08 (local demo date)
  const attendance: AttendanceDay[] = [];
  const schoolDates: string[] = [];
  const anchor = new Date(2026, 8, 8); // Sept 8, 2026 (Tuesday)

  const cursor = new Date(anchor);
  while (schoolDates.length < 40) {
    const dayOfWeek = cursor.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // weekday
      const yyyy = cursor.getFullYear();
      const mm = String(cursor.getMonth() + 1).padStart(2, '0');
      const dd = String(cursor.getDate()).padStart(2, '0');
      schoolDates.push(`${yyyy}-${mm}-${dd}`);
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  schoolDates.reverse(); // chronological order

  for (const cls of classes) {
    const classStudents = students.filter((s) => s.classId === cls.id);
    const assignedTeacher = teachers.find((t) => t.id === cls.classTeacherId) || teachers[0];

    for (let d = 0; d < schoolDates.length; d++) {
      const dateStr = schoolDates[d];
      const presentIds: string[] = [];
      const absentIds: string[] = [];
      const lateIds: string[] = [];
      const leaveIds: string[] = [];

      for (let sIdx = 0; sIdx < classStudents.length; sIdx++) {
        const student = classStudents[sIdx];

        // Downward trend special case: student #15 (Bilal)
        if (student.id === students[14]?.id) {
          if (d < 25) {
            // First 25 days: mostly present (95%)
            if (d % 10 === 0) {
              absentIds.push(student.id);
            } else {
              presentIds.push(student.id);
            }
          } else {
            // Last 15 days: drops significantly (downward trend!)
            if (d % 2 === 0) {
              absentIds.push(student.id);
            } else if (d % 3 === 0) {
              lateIds.push(student.id);
            } else {
              presentIds.push(student.id);
            }
          }
          continue;
        }

        // Standard distribution: ~88-96% present
        const hash = (sIdx * 37 + d * 19 + parseInt(cls.id.replace('cls_', '')) * 13) % 100;
        if (hash < 88) {
          presentIds.push(student.id);
        } else if (hash < 94) {
          absentIds.push(student.id);
        } else if (hash < 98) {
          lateIds.push(student.id);
        } else {
          leaveIds.push(student.id);
        }
      }

      attendance.push({
        id: `att_${cls.id}_${dateStr}`,
        schoolId,
        campusId: cls.campusId,
        classId: cls.id,
        academicYearId,
        date: dateStr,
        present: presentIds,
        absent: absentIds,
        late: lateIds,
        leave: leaveIds,
        markedBy: assignedTeacher.id,
        markedAt: `${dateStr}T08:15:00.000Z`,
      });
    }
  }

  // 12. Fee Structures (per class level)
  const feeStructures: FeeStructure[] = [
    {
      id: 'fst_middle',
      schoolId,
      academicYearId,
      name: 'Middle School Monthly Tuition (Grades 6–8)',
      amount: 18000,
      frequency: 'monthly',
      appliesToClassIds: classes
        .filter((c) => ['Grade 6', 'Grade 7', 'Grade 8'].includes(c.grade))
        .map((c) => c.id),
    },
    {
      id: 'fst_senior',
      schoolId,
      academicYearId,
      name: 'Senior School Monthly Tuition (Grades 9–10)',
      amount: 22000,
      frequency: 'monthly',
      appliesToClassIds: classes
        .filter((c) => ['Grade 9', 'Grade 10'].includes(c.grade))
        .map((c) => c.id),
    },
  ];

  // 13. Fee Invoices (current month: Sept 2026, plus July and August)
  const feeInvoices: FeeInvoice[] = [];
  const invoiceMonths = [
    { label: 'July 2026', due: '2026-07-10', isPast: true },
    { label: 'August 2026', due: '2026-08-10', isPast: true },
    { label: 'September 2026', due: '2026-09-10', isPast: false },
  ];

  let invIdx = 1;
  for (const student of students) {
    const isSenior = ['Grade 9', 'Grade 10'].some((g) =>
      classes.find((c) => c.id === student.classId)?.grade.includes(g)
    );
    const feeStructure = isSenior ? feeStructures[1] : feeStructures[0];
    const isAyeshaKhan = student.id === 'stu_ayesha';
    const discountAmount = isAyeshaKhan ? 3000 : 0; // Sibling discount

    for (const m of invoiceMonths) {
      const invId = `inv_${invIdx++}`;
      const totalAmount = feeStructure.amount;
      const netDue = totalAmount - discountAmount;

      // Realistic distribution: 70% paid, 20% pending, 10% overdue
      let status: 'paid' | 'pending' | 'overdue' | 'partial' = 'paid';
      const hash = (invIdx * 17) % 100;

      if (m.isPast) {
        if (hash < 85) {
          status = 'paid';
        } else if (hash < 95) {
          status = 'partial';
        } else {
          status = 'overdue';
        }
      } else {
        // Current month (September)
        if (hash < 50) {
          status = 'paid';
        } else if (hash < 80) {
          status = 'pending';
        } else if (hash < 92) {
          status = 'partial';
        } else {
          status = 'overdue';
        }
      }

      const paidAmount = status === 'paid' ? netDue : status === 'partial' ? Math.floor(netDue / 2) : 0;

      const payments = paidAmount > 0 ? [
        {
          id: `pay_${invId}`,
          amount: paidAmount,
          method: 'bank' as const,
          reference: `TRX-${invId}`,
          receivedBy: 'usr_admin',
          receivedAt: `${m.due}T10:00:00.000Z`,
          receiptNumber: `REC-2026-${String(invIdx).padStart(5, '0')}`,
        },
      ] : [];

      feeInvoices.push({
        id: invId,
        schoolId,
        campusId: student.campusId,
        studentId: student.id,
        feeStructureId: feeStructure.id,
        invoiceNumber: `INV-2026-${String(invIdx).padStart(5, '0')}`,
        lineItems: [
          { label: `Monthly Tuition (${m.label})`, amount: totalAmount },
          ...(discountAmount > 0 ? [{ label: 'Sibling Concession (15%)', amount: -discountAmount }] : []),
        ],
        totalAmount,
        discountAmount,
        paidAmount,
        dueDate: m.due,
        status,
        payments,
      });
    }
  }

  // 14. Exams & Exam Results (1 completed Midterm, 1 Draft Final)
  const exams: Exam[] = [];
  const examResults: ExamResult[] = [];

  // Create Midterms for classes
  let exmIdx = 1;
  let exrIdx = 1;

  for (const cls of classes) {
    const clsSubjects = subjects.filter((s) => s.classId === cls.id);
    const mathSub = clsSubjects.find((s) => s.name === 'Mathematics') || clsSubjects[0];

    const midtermExam: Exam = {
      id: `exm_${exmIdx++}`,
      schoolId,
      campusId: cls.campusId,
      academicYearId,
      name: 'Midterm Examination 2026',
      term: 'Term 1',
      classId: cls.id,
      subjectId: mathSub.id,
      date: '2026-08-28',
      maxMarks: 100,
      status: 'published',
    };
    exams.push(midtermExam);

    // Results for midterm
    const clsStudents = students.filter((s) => s.classId === cls.id);
    for (const st of clsStudents) {
      // Bell-curve distribution of marks
      const marks = 50 + ((parseInt(st.id.replace(/\D/g, '') || '1') * 7) % 48); // 50 to 98
      let grade = 'B';
      if (marks >= 90) grade = 'A+';
      else if (marks >= 80) grade = 'A';
      else if (marks >= 70) grade = 'B';
      else if (marks >= 60) grade = 'C';
      else if (marks >= 50) grade = 'D';
      else grade = 'F';

      examResults.push({
        id: `exr_${exrIdx++}`,
        examId: midtermExam.id,
        studentId: st.id,
        marksObtained: marks,
        grade,
        remarks: marks >= 80 ? 'Excellent analytical skills shown' : 'Steady progress, keep revising algebra',
      });
    }

    // Upcoming final exam (draft)
    exams.push({
      id: `exm_${exmIdx++}`,
      schoolId,
      campusId: cls.campusId,
      academicYearId,
      name: 'Annual Final Examination 2027',
      term: 'Term 2',
      classId: cls.id,
      subjectId: mathSub.id,
      date: '2027-04-10',
      maxMarks: 100,
      status: 'draft',
    });
  }

  // 15. LMS (12 courses with 4-8 lessons each, 30 assignments)
  const courses: Course[] = [];
  const lessons: Lesson[] = [];
  const assignments: Assignment[] = [];
  const submissions: Submission[] = [];

  const courseColors = ['#4B2FA8', '#1D5F96', '#17795E', '#9A6206', '#5B41C7', '#241C46'];

  let crsIdx = 1;
  let lsnIdx = 1;
  let asnIdx = 1;
  let subIdx = 1;

  for (let c = 0; c < 12; c++) {
    const cls = classes[c % classes.length];
    const sub = subjects.find((s) => s.classId === cls.id) || subjects[0];
    const teacher = teachers.find((t) => t.id === sub.teacherId) || teachers[0];

    const courseId = `crs_${crsIdx++}`;
    courses.push({
      id: courseId,
      schoolId,
      campusId: cls.campusId,
      subjectId: sub.id,
      classId: cls.id,
      teacherId: teacher.id,
      title: `${sub.name} — ${cls.grade} (${cls.section})`,
      description: `Complete syllabus curriculum, assignments, and study materials for ${sub.name}.`,
      coverColor: courseColors[c % courseColors.length],
    });

    // 5 lessons per course
    for (let l = 1; l <= 5; l++) {
      lessons.push({
        id: `lsn_${lsnIdx++}`,
        schoolId,
        courseId,
        title: `Chapter ${l}: Foundational Concepts & Applications`,
        orderIndex: l,
        contentType: l % 3 === 0 ? 'video' : l % 3 === 1 ? 'pdf' : 'notes',
        body: 'In this unit, students study the primary theoretical theorems and practice exercise problems.',
        contentUrl: l % 3 === 0 ? 'https://example.com/video.mp4' : l % 3 === 1 ? '/documents/syllabus.pdf' : undefined,
        durationMinutes: 45,
      });
    }

    // 2-3 assignments per course
    if (c < 10) {
      for (let a = 1; a <= 3; a++) {
        const asnId = `asn_${asnIdx++}`;
        assignments.push({
          id: asnId,
          schoolId,
          courseId,
          title: `Homework Assignment ${a}: Problem Set on Chapter ${a}`,
          instructions: 'Complete exercises 1 through 10 from the textbook. Upload your work as notes or scanned PDF.',
          deadline: `2026-09-${10 + a}T23:59:00.000Z`,
          maxMarks: 20,
        });

        // Submissions for Ahmed Khan & sample students
        submissions.push({
          id: `sub_${subIdx++}`,
          assignmentId: asnId,
          studentId: 'stu_ahmed',
          body: 'Here is my completed homework solution with full step-by-step working.',
          fileName: 'ahmed_khan_homework.pdf',
          submittedAt: '2026-09-07T14:30:00.000Z',
          marksObtained: a === 1 ? 19 : undefined,
          feedback: a === 1 ? 'Well organized and clearly presented.' : undefined,
          gradedBy: a === 1 ? teacher.id : undefined,
          gradedAt: a === 1 ? '2026-09-08T09:00:00.000Z' : undefined,
        });
      }
    }
  }

  // 16. Announcements
  const announcements: Announcement[] = [
    {
      id: 'anc_1',
      schoolId,
      title: 'Welcome Back to the 2026–2027 Academic Session',
      body: 'We are thrilled to welcome all new and returning students across our Main, Girls, and North campuses.',
      authorId: 'usr_admin',
      audience: 'school',
      publishAt: '2026-08-15T08:00:00.000Z',
      viewCount: 384,
    },
    {
      id: 'anc_2',
      schoolId,
      campusId: 'cmp_main',
      title: 'Annual Sports Day Trials — Main Campus',
      body: 'Trials for track, football, and badminton will commence next Monday from 3:00 PM onwards.',
      authorId: 'usr_principal_main',
      audience: 'campus',
      publishAt: '2026-09-01T08:00:00.000Z',
      viewCount: 172,
    },
    {
      id: 'anc_3',
      schoolId,
      classId: 'cls_5', // Grade 8-A Main
      title: 'Mathematics Notebook Inspection This Friday',
      body: 'Please ensure all exercise questions from Chapter 1 and 2 are fully solved and signed.',
      authorId: 'usr_teacher_sana',
      audience: 'class',
      publishAt: '2026-09-06T09:00:00.000Z',
      viewCount: 28,
    },
  ];

  // 16b. Staff Leave Requests (Main Campus, mixed statuses for principal review)
  const leaveRequests: LeaveRequest[] = [
    {
      id: 'lvr_1',
      schoolId,
      campusId: 'cmp_main',
      teacherId: 'tch_2',
      leaveType: 'sick',
      startDate: '2026-09-15',
      endDate: '2026-09-16',
      reason: 'Fever and flu symptoms, advised bed rest by physician.',
      status: 'pending',
      requestedAt: '2026-09-10T07:30:00.000Z',
    },
    {
      id: 'lvr_2',
      schoolId,
      campusId: 'cmp_main',
      teacherId: 'tch_3',
      leaveType: 'casual',
      startDate: '2026-09-20',
      endDate: '2026-09-20',
      reason: 'Attending a family wedding function.',
      status: 'pending',
      requestedAt: '2026-09-11T09:00:00.000Z',
    },
    {
      id: 'lvr_3',
      schoolId,
      campusId: 'cmp_main',
      teacherId: 'tch_sana',
      leaveType: 'annual',
      startDate: '2026-08-20',
      endDate: '2026-08-25',
      reason: 'Pre-planned annual leave, substitute arranged for classes.',
      status: 'approved',
      requestedAt: '2026-08-10T08:15:00.000Z',
      decidedBy: 'usr_principal_main',
      decidedAt: '2026-08-11T10:00:00.000Z',
      decisionNote: 'Approved. Substitute schedule confirmed with department head.',
    },
    {
      id: 'lvr_4',
      schoolId,
      campusId: 'cmp_main',
      teacherId: 'tch_4',
      leaveType: 'other',
      startDate: '2026-09-05',
      endDate: '2026-09-12',
      reason: 'Extended personal leave request during peak exam preparation week.',
      status: 'rejected',
      requestedAt: '2026-08-28T08:00:00.000Z',
      decidedBy: 'usr_principal_main',
      decidedAt: '2026-08-29T09:30:00.000Z',
      decisionNote: 'Cannot approve during exam prep week; please resubmit for a later date.',
    },
  ];

  // 17. Messages (Thread between Sana Malik and Tariq Khan)
  const messages: Message[] = [
    {
      id: 'msg_1',
      schoolId,
      threadId: 'th_sana_tariq',
      senderId: 'usr_teacher_sana',
      recipientId: 'usr_parent_khan',
      body: 'Dear Mr. Tariq Khan, Ahmed demonstrated great enthusiasm in modern geometry today. Keep encouraging his revision.',
      sentAt: '2026-09-06T11:20:00.000Z',
      readAt: '2026-09-06T12:05:00.000Z',
    },
    {
      id: 'msg_2',
      schoolId,
      threadId: 'th_sana_tariq',
      senderId: 'usr_parent_khan',
      recipientId: 'usr_teacher_sana',
      body: 'Thank you Ms. Sana. We have scheduled an hour each evening for mathematics practice.',
      sentAt: '2026-09-06T13:00:00.000Z',
      readAt: '2026-09-06T14:10:00.000Z',
    },
  ];

  // 18. Notifications
  const notifications: Notification[] = [
    {
      id: 'ntf_1',
      schoolId,
      recipientId: 'usr_parent_khan',
      type: 'attendance',
      title: 'Attendance Marked: Present',
      body: 'Ahmed Khan was marked present for Grade 8-A on Monday, Sep 7.',
      createdAt: '2026-09-07T08:20:00.000Z',
      readAt: '2026-09-07T08:35:00.000Z',
    },
    {
      id: 'ntf_2',
      schoolId,
      recipientId: 'usr_parent_khan',
      type: 'fee',
      title: 'Fee Invoice Generated: September 2026',
      body: 'Invoice INV-2026-00005 for Ahmed Khan is ready for review. Due date: 10 Sep 2026.',
      createdAt: '2026-09-01T08:00:00.000Z',
      readAt: '2026-09-02T10:00:00.000Z',
    },
    {
      id: 'ntf_3',
      schoolId,
      recipientId: 'usr_student_ahmed',
      type: 'homework',
      title: 'New Assignment Posted',
      body: 'Mathematics Homework 2 has been posted by Ms. Sana Malik.',
      createdAt: '2026-09-05T10:00:00.000Z',
      readAt: '2026-09-05T11:00:00.000Z',
    },
  ];

  // 19. WhatsApp Mock Log
  const whatsappLog: WhatsAppLog[] = [
    {
      id: 'wal_1',
      schoolId,
      recipientPhone: '+923067890123',
      recipientName: 'Tariq Khan',
      template: 'daily_attendance_alert',
      body: 'Dear Tariq Khan, Ahmed Khan has been marked Present today at ABC School Network (Main Campus).',
      trigger: 'Teacher Attendance Submission',
      sentAt: '2026-09-07T08:20:00.000Z',
      status: 'delivered',
    },
    {
      id: 'wal_2',
      schoolId,
      recipientPhone: '+923067890123',
      recipientName: 'Tariq Khan',
      template: 'fee_due_reminder',
      body: 'Reminder: Fee voucher of PKR 15,000 for Ahmed Khan is due on 10 Sep 2026. Please disregard if already paid.',
      trigger: 'Automated Billing Run',
      sentAt: '2026-09-05T09:00:00.000Z',
      status: 'read',
    },
  ];

  // 20. Settings & Meta
  const settings: Settings = {
    id: 'set_main',
    schoolId,
    gradingScale: [
      { grade: 'A+', minPercentage: 90, maxPercentage: 100, gpa: 4.0, description: 'Outstanding' },
      { grade: 'A', minPercentage: 80, maxPercentage: 89.9, gpa: 3.7, description: 'Excellent' },
      { grade: 'B', minPercentage: 70, maxPercentage: 79.9, gpa: 3.0, description: 'Good' },
      { grade: 'C', minPercentage: 60, maxPercentage: 69.9, gpa: 2.0, description: 'Satisfactory' },
      { grade: 'D', minPercentage: 50, maxPercentage: 59.9, gpa: 1.0, description: 'Pass' },
      { grade: 'F', minPercentage: 0, maxPercentage: 49.9, gpa: 0.0, description: 'Fail' },
    ],
    attendanceCutoffTime: '08:30',
    attendanceEditWindowHours: 48, // 2 days default per FEATURE_SPECIFICATIONS.md §8
    attendanceStatuses: ['present', 'absent', 'late', 'leave'],
    branding: {
      schoolName: 'ABC School Network',
      primaryColor: '#f97316',
      accentColor: '#1D5F96',
      backgroundColor: '#f1f5f9',
      cardBackground: '#ffffff',
      fontFamily: 'inter',
      borderRadius: 'md',
      templateId: 'sunset',
      designMode: 'unified',
      // No default logoUrl: the live UI shows a theme-colored initials mark
      // (see components/shell/Logo.tsx) until a real logo is uploaded.
    },
    currency: 'PKR',
  };

  const meta: Meta = {
    schemaVersion: '1.0.0',
    seededAt: new Date().toISOString(),
    seedProfile: 'demo-network',
  };

  return {
    school,
    campuses,
    academicYear,
    users,
    teachers,
    classes,
    subjects,
    timetableSlots,
    students,
    parents,
    studentParents,
    attendance,
    feeStructures,
    feeInvoices,
    exams,
    examResults,
    courses,
    lessons,
    assignments,
    submissions,
    announcements,
    leaveRequests,
    messages,
    notifications,
    whatsappLog,
    settings,
    meta,
  };
}
