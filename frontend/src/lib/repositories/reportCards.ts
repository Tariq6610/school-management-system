import {
  AcademicYear,
  BrandingSettings,
  Campus,
  Class,
  ExamResult,
  ID,
  School,
  Scope,
  Student,
  StudentAttendanceStats,
  Subject,
  User,
} from '@/types';
import { getSchool } from './schools';
import { getCampus } from './campuses';
import { getClass } from './classes';
import { getStudent, listStudents } from './students';
import { listExams } from './exams';
import { listExamResultsByExamId } from './examResults';
import { listSubjects } from './subjects';
import { getUser } from './users';
import { getTeacher } from './teachers';
import { getCurrentAcademicYear } from './academicYears';
import { getSettings } from './settings';
import { calculateGrade } from '@/lib/utils/grading';
import { calculateStudentAttendanceStats } from './attendance';

export interface ReportCardSubjectRow {
  subjectId: ID;
  subjectName: string;
  subjectCode: string;
  examId: ID;
  maxMarks: number;
  marksObtained: number | null;
  percentage: number | null;
  grade: string;
  isAbsent: boolean;
  remarks: string;
}

export interface StudentReportCardData {
  student: Student;
  user: User;
  classObj: Class;
  campus: Campus;
  school: School;
  branding: BrandingSettings;
  term: string;
  academicYear?: AcademicYear | null;
  classTeacherName?: string;
  principalName?: string;
  subjects: ReportCardSubjectRow[];
  totalMaxMarks: number;
  totalMarksObtained: number;
  overallPercentage: number;
  overallGrade: string;
  attendance: StudentAttendanceStats;
  classTeacherRemarks: string;
  issueDate: string;
}

export interface ClassReportCardsPayload {
  classObj: Class;
  campus: Campus;
  school: School;
  branding: BrandingSettings;
  term: string;
  availableTerms: string[];
  reportCards: StudentReportCardData[];
}

/**
 * Generates academic qualitative remark based on student percentage and attendance.
 */
export function generateDefaultAcademicRemarks(percentage: number, attendancePercentage: number): string {
  if (percentage >= 90) {
    return 'Exceptional academic excellence and exemplary diligence. Demonstrates profound critical thinking and leadership.';
  } else if (percentage >= 80) {
    return 'Very good academic progress. Actively participates in classroom discussions and exhibits commendable discipline.';
  } else if (percentage >= 70) {
    return 'Satisfactory academic performance. Has solid potential; consistent revision in core subjects will elevate grades further.';
  } else if (percentage >= 60) {
    return 'Demonstrates fair effort, but requires structured reinforcement and focused preparation in weaker subject areas.';
  } else {
    const attNotice = attendancePercentage < 75 ? ' Low attendance has impacted comprehension.' : '';
    return `Needs immediate academic guidance and regular supervised study.${attNotice} A parent-teacher meeting is recommended.`;
  }
}

/**
 * Aggregates all data required to generate branded, printable report cards for an entire class cohort.
 */
export async function getClassReportCards(
  scope: Scope,
  classId: ID,
  requestedTerm?: string
): Promise<ClassReportCardsPayload> {
  // 1. Fetch Class
  const classObj = await getClass(classId);
  if (!classObj) {
    throw new Error(`Class with ID "${classId}" was not found.`);
  }

  // 2. Fetch Campus & School
  const [campus, school, settings, academicYear] = await Promise.all([
    getCampus(classObj.campusId),
    getSchool(scope.schoolId),
    getSettings(scope),
    getCurrentAcademicYear(scope),
  ]);

  const effectiveCampus: Campus = campus ?? {
    id: classObj.campusId,
    schoolId: scope.schoolId,
    name: 'Main Campus',
    address: 'Campus Address',
    isPrimary: true,
  };

  const effectiveSchool: School = school ?? {
    id: scope.schoolId,
    name: settings.branding.schoolName || 'Beaconhouse Model School',
    address: 'Main Administrative Campus, School Road',
    timezone: 'Asia/Karachi',
    status: 'active',
  };

  const branding: BrandingSettings = {
    schoolName: settings.branding.schoolName || effectiveSchool.name,
    primaryColor: settings.branding.primaryColor || '#4B2FA8',
    accentColor: settings.branding.accentColor || '#1D5F96',
    logoUrl: settings.branding.logoUrl || effectiveSchool.logoUrl,
  };

  // 3. Class Teacher & Principal Names
  let classTeacherName = 'Class Teacher';
  if (classObj.classTeacherId) {
    const teacher = await getTeacher(classObj.classTeacherId);
    if (teacher) {
      const teacherUser = await getUser(teacher.userId);
      if (teacherUser) {
        classTeacherName = teacherUser.name;
      }
    }
  }

  let principalName = 'Head of School';
  if (effectiveCampus.principalId) {
    const principal = await getTeacher(effectiveCampus.principalId);
    if (principal) {
      const principalUser = await getUser(principal.userId);
      if (principalUser) {
        principalName = principalUser.name;
      }
    }
  }

  // 4. Fetch Active Students in this Class
  const rawStudents = await listStudents(scope, { classId, activeOnly: true });
  // Enrich students with User accounts for names and sort alphabetically
  const enrichedStudentsWithUsers = await Promise.all(
    rawStudents.map(async (st) => {
      const u = await getUser(st.userId);
      return {
        student: st,
        user: u ?? {
          id: st.userId,
          schoolId: scope.schoolId,
          name: `Student (${st.admissionNumber})`,
          email: '',
          role: 'student' as const,
          status: 'active' as const,
        },
      };
    })
  );

  enrichedStudentsWithUsers.sort((a, b) => a.user.name.localeCompare(b.user.name));

  // 5. Fetch Exams for this Class
  const classExams = await listExams(scope, { classId });
  const allTerms = Array.from(new Set(classExams.map((e) => e.term).filter(Boolean)));
  const availableTerms = allTerms.length > 0 ? allTerms : ['Term 1'];

  // Select target term
  const activeTerm =
    requestedTerm && availableTerms.includes(requestedTerm)
      ? requestedTerm
      : availableTerms[0] ?? 'Term 1';

  // Exams for the active term
  const termExams = classExams.filter((e) => e.term === activeTerm);

  // Fetch all subjects to enrich exam subject names/codes
  const allSubjects = await listSubjects(scope);
  const subjectsMap = new Map<string, Subject>();
  allSubjects.forEach((s) => subjectsMap.set(s.id, s));

  // 6. Fetch Results for all term exams
  const examIds = termExams.map((e) => e.id);
  const examResultsMap = new Map<string, ExamResult[]>(); // examId -> ExamResult[]

  await Promise.all(
    examIds.map(async (eId) => {
      const results = await listExamResultsByExamId(eId);
      examResultsMap.set(eId, results);
    })
  );

  const todayIso = new Date().toISOString().split('T')[0];

  // 7. Assemble Report Card per Student
  const reportCards: StudentReportCardData[] = await Promise.all(
    enrichedStudentsWithUsers.map(async ({ student, user }) => {
      // Attendance stats
      const attendance = await calculateStudentAttendanceStats(scope, student.id);

      // Subject rows
      let totalMaxMarks = 0;
      let totalMarksObtained = 0;

      const subjectRows: ReportCardSubjectRow[] = termExams.map((exam) => {
        const sub = subjectsMap.get(exam.subjectId);
        const subjectName = sub?.name ?? 'Subject';
        const subjectCode = sub?.code ?? 'SUB';

        const resultsForExam = examResultsMap.get(exam.id) ?? [];
        const studentResult = resultsForExam.find((r) => r.studentId === student.id);

        const marksObtained = studentResult?.marksObtained ?? null;
        const isAbsent =
          studentResult?.remarks?.toLowerCase().includes('absent') ||
          studentResult?.grade === 'ABS' ||
          (studentResult && studentResult.marksObtained === null);

        totalMaxMarks += exam.maxMarks;
        if (marksObtained !== null) {
          totalMarksObtained += marksObtained;
        }

        const percentage =
          marksObtained !== null && exam.maxMarks > 0
            ? Math.round((marksObtained / exam.maxMarks) * 1000) / 10
            : null;

        let grade = '-';
        if (isAbsent && marksObtained === null) {
          grade = 'ABS';
        } else if (percentage !== null) {
          grade = studentResult?.grade || calculateGrade(percentage, 100, settings.gradingScale).grade;
        }

        const remarks =
          studentResult?.remarks ||
          (isAbsent
            ? 'Absent from examination'
            : percentage !== null && percentage >= 50
            ? 'Satisfactory'
            : 'Needs Improvement');

        return {
          subjectId: exam.subjectId,
          subjectName,
          subjectCode,
          examId: exam.id,
          maxMarks: exam.maxMarks,
          marksObtained,
          percentage,
          grade,
          isAbsent: Boolean(isAbsent),
          remarks,
        };
      });

      const overallPercentage =
        totalMaxMarks > 0
          ? Math.round((totalMarksObtained / totalMaxMarks) * 1000) / 10
          : 0;

      const overallGrade =
        subjectRows.length > 0 && totalMaxMarks > 0
          ? calculateGrade(overallPercentage, 100, settings.gradingScale).grade
          : 'N/A';

      const classTeacherRemarks = generateDefaultAcademicRemarks(
        overallPercentage,
        attendance.percentage
      );

      return {
        student,
        user,
        classObj,
        campus: effectiveCampus,
        school: effectiveSchool,
        branding,
        term: activeTerm,
        academicYear,
        classTeacherName,
        principalName,
        subjects: subjectRows,
        totalMaxMarks,
        totalMarksObtained,
        overallPercentage,
        overallGrade,
        attendance,
        classTeacherRemarks,
        issueDate: todayIso,
      };
    })
  );

  return {
    classObj,
    campus: effectiveCampus,
    school: effectiveSchool,
    branding,
    term: activeTerm,
    availableTerms,
    reportCards,
  };
}

/**
 * Retrieves single student report card data for preview and individual printing.
 */
export async function getStudentReportCard(
  scope: Scope,
  studentId: ID,
  requestedTerm?: string
): Promise<StudentReportCardData | null> {
  const student = await getStudent(studentId);
  if (!student) return null;

  const classData = await getClassReportCards(scope, student.classId, requestedTerm);
  return classData.reportCards.find((rc) => rc.student.id === studentId) ?? null;
}
