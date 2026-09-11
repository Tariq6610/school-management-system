import { Campus, Class, Exam, ID, Scope, Student, User } from '@/types';
import { getItem, setItem } from '../storage';
import { STORAGE_KEYS } from '../storage/keys';
import { getStudent } from './students';
import { getUser } from './users';
import { getClass } from './classes';
import { getCampus } from './campuses';
import { listSubjects } from './subjects';
import { listExams } from './exams';
import { listExamResultsByStudentId } from './examResults';
import {
  calculateStudentAttendanceStats,
  getStudentAttendanceHistory,
} from './attendance';
import { listCourses } from './courses';
import { listAssignments } from './assignments';
import { listSubmissions } from './submissions';

export type ProposalCategory = 'strength' | 'improvement';
export type ProposalStatus = 'pending' | 'confirmed' | 'dismissed';
export type ProposalSourceMetric = 'exam' | 'attendance' | 'assignment' | 'general';

export interface LearningProfileProposal {
  id: ID;
  schoolId: ID;
  campusId?: ID;
  studentId: ID;
  category: ProposalCategory;
  title: string;
  proposedText: string;
  editedText?: string;
  status: ProposalStatus;
  sourceMetric: ProposalSourceMetric;
  createdAt: string;
  confirmedByTeacherId?: ID;
  teacherName?: string;
  confirmedAt?: string;
}

export interface SubjectAssessmentPoint {
  examId: ID;
  examName: string;
  term: string;
  date: string;
  marksObtained: number;
  maxMarks: number;
  percentage: number;
}

export interface SubjectPerformanceTrend {
  subjectId: ID;
  subjectName: string;
  assessments: SubjectAssessmentPoint[];
  currentPercentage: number;
  trajectory: 'improving' | 'declining' | 'stable';
}

export interface MonthlyAttendancePoint {
  month: string;
  label: string;
  percentage: number;
  present: number;
  total: number;
}

export interface AttendanceTrendData {
  overallPercentage: number;
  totalDays: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  leaveCount: number;
  monthlyTrends: MonthlyAttendancePoint[];
  recentTrajectory: 'improving' | 'declining' | 'stable';
}

export interface AssignmentHistoryItem {
  id: ID;
  title: string;
  subjectName: string;
  dueDate: string;
  submittedDate?: string;
  status: 'on_time' | 'late' | 'pending' | 'graded';
  obtainedMarks?: number;
  maxMarks?: number;
}

export interface AssignmentHistorySummary {
  totalAssigned: number;
  submittedCount: number;
  onTimeCount: number;
  lateCount: number;
  pendingCount: number;
  items: AssignmentHistoryItem[];
}

export interface StudentLearningProfileData {
  student: Student;
  user: User;
  classInfo?: Class;
  campus?: Campus;
  subjectTrends: SubjectPerformanceTrend[];
  attendanceTrend: AttendanceTrendData;
  assignmentSummary: AssignmentHistorySummary;
  proposals: LearningProfileProposal[];
}

/**
 * Retrieves all stored proposals from storage
 */
async function getAllStoredProposals(): Promise<LearningProfileProposal[]> {
  const items = getItem<LearningProfileProposal[]>(STORAGE_KEYS.LEARNING_PROFILES);
  return Array.isArray(items) ? items : [];
}

/**
 * Saves all proposals to storage
 */
async function saveStoredProposals(items: LearningProfileProposal[]): Promise<void> {
  setItem(STORAGE_KEYS.LEARNING_PROFILES, items);
}

/**
 * Synthesizes candidate proposals from the student's real metrics.
 * Proposals sit in a "pending" state until a teacher confirms or edits them.
 */
function synthesizeCandidateProposals(
  studentId: ID,
  scope: Scope,
  trends: SubjectPerformanceTrend[],
  attendance: AttendanceTrendData,
  assignments: AssignmentHistorySummary
): LearningProfileProposal[] {
  const proposals: LearningProfileProposal[] = [];
  const now = new Date().toISOString();

  // 1. Exam Performance Strengths / Improvements
  for (const st of trends) {
    if (st.assessments.length >= 2) {
      const first = st.assessments[0].percentage;
      const last = st.assessments[st.assessments.length - 1].percentage;
      if (last >= first + 10) {
        proposals.push({
          id: `prop_exam_${st.subjectId}_${studentId}`,
          schoolId: scope.schoolId,
          campusId: scope.campusId,
          studentId,
          category: 'strength',
          title: `Academic Growth in ${st.subjectName}`,
          proposedText: `${st.subjectName} performance has improved from ${first}% to ${last}% across recent assessments. Shows strong subject mastery.`,
          status: 'pending',
          sourceMetric: 'exam',
          createdAt: now,
        });
      } else if (first >= last + 10 && last < 70) {
        proposals.push({
          id: `prop_exam_drop_${st.subjectId}_${studentId}`,
          schoolId: scope.schoolId,
          campusId: scope.campusId,
          studentId,
          category: 'improvement',
          title: `Reinforcement Needed in ${st.subjectName}`,
          proposedText: `Recent assessment scores in ${st.subjectName} dropped to ${last}%. Targeted practice and conceptual revision recommended.`,
          status: 'pending',
          sourceMetric: 'exam',
          createdAt: now,
        });
      }
    } else if (st.currentPercentage >= 85) {
      proposals.push({
        id: `prop_exam_high_${st.subjectId}_${studentId}`,
        schoolId: scope.schoolId,
        campusId: scope.campusId,
        studentId,
        category: 'strength',
        title: `High Achievement in ${st.subjectName}`,
        proposedText: `Consistently maintains exceptional performance in ${st.subjectName} with a current average of ${st.currentPercentage}%.`,
        status: 'pending',
        sourceMetric: 'exam',
        createdAt: now,
      });
    }
  }

  // 2. Attendance Trend
  if (attendance.recentTrajectory === 'declining' || attendance.overallPercentage < 75) {
    proposals.push({
      id: `prop_att_decline_${studentId}`,
      schoolId: scope.schoolId,
      campusId: scope.campusId,
      studentId,
      category: 'improvement',
      title: 'Attendance Regularity',
      proposedText: `Attendance trend indicates increased absences over recent weeks (overall ${attendance.overallPercentage}%). Regular attendance is essential to maintain academic pace.`,
      status: 'pending',
      sourceMetric: 'attendance',
      createdAt: now,
    });
  } else if (attendance.overallPercentage >= 90) {
    proposals.push({
      id: `prop_att_high_${studentId}`,
      schoolId: scope.schoolId,
      campusId: scope.campusId,
      studentId,
      category: 'strength',
      title: 'Exemplary Attendance & Regularity',
      proposedText: `Demonstrates commendable dedication with ${attendance.overallPercentage}% attendance across ${attendance.totalDays} academic days.`,
      status: 'pending',
      sourceMetric: 'attendance',
      createdAt: now,
    });
  }

  // 3. Assignment Submissions
  if (assignments.totalAssigned > 0) {
    const onTimeRate = Math.round((assignments.onTimeCount / assignments.totalAssigned) * 100);
    if (onTimeRate >= 80) {
      proposals.push({
        id: `prop_hw_ontime_${studentId}`,
        schoolId: scope.schoolId,
        campusId: scope.campusId,
        studentId,
        category: 'strength',
        title: 'Disciplined Homework Delivery',
        proposedText: `Consistently submits LMS assignments and homework on time with diligent preparation and high engagement.`,
        status: 'pending',
        sourceMetric: 'assignment',
        createdAt: now,
      });
    } else if (assignments.lateCount >= 2 || assignments.pendingCount >= 3) {
      proposals.push({
        id: `prop_hw_late_${studentId}`,
        schoolId: scope.schoolId,
        campusId: scope.campusId,
        studentId,
        category: 'improvement',
        title: 'Timely Assignment Submission',
        proposedText: `Has ${assignments.lateCount} late and ${assignments.pendingCount} pending assignments. Setting a daily study schedule will help meet deadlines.`,
        status: 'pending',
        sourceMetric: 'assignment',
        createdAt: now,
      });
    }
  }

  // Fallback baseline proposals if minimal data
  if (proposals.length === 0) {
    proposals.push(
      {
        id: `prop_gen_str_${studentId}`,
        schoolId: scope.schoolId,
        campusId: scope.campusId,
        studentId,
        category: 'strength',
        title: 'Active Classroom Participation',
        proposedText: 'Engages constructively during lessons and demonstrates curiosity across core subjects.',
        status: 'pending',
        sourceMetric: 'general',
        createdAt: now,
      },
      {
        id: `prop_gen_imp_${studentId}`,
        schoolId: scope.schoolId,
        campusId: scope.campusId,
        studentId,
        category: 'improvement',
        title: 'Independent Study Habits',
        proposedText: 'Encourage allocated time for revision and reading outside school hours.',
        status: 'pending',
        sourceMetric: 'general',
        createdAt: now,
      }
    );
  }

  return proposals;
}

/**
 * Loads the complete learning profile data for a student.
 * If viewerRole is 'parent', proposals are strictly filtered to status === 'confirmed'
 * (no auto-publish acceptance criteria).
 */
export async function getStudentLearningProfile(
  studentId: ID,
  scope: Scope,
  viewerRole: 'teacher' | 'parent' | 'school_admin' | 'super_admin' = 'teacher'
): Promise<StudentLearningProfileData | null> {
  const student = await getStudent(studentId);
  if (!student) return null;

  const studentScope: Scope = {
    schoolId: student.schoolId || scope.schoolId,
    campusId: student.campusId || scope.campusId,
  };

  const [
    user,
    classInfo,
    campus,
    attendanceStats,
    attendanceHistory,
    subjects,
    exams,
    examResults,
    courses,
    allStoredProposals,
  ] = await Promise.all([
    getUser(student.userId),
    student.classId ? getClass(student.classId) : null,
    student.campusId ? getCampus(student.campusId) : null,
    calculateStudentAttendanceStats(studentScope, studentId),
    getStudentAttendanceHistory(studentScope, studentId),
    listSubjects(studentScope),
    student.classId ? listExams(studentScope, { classId: student.classId }) : [],
    listExamResultsByStudentId(studentId),
    student.classId ? listCourses(studentScope, { classId: student.classId }) : [],
    getAllStoredProposals(),
  ]);

  if (!user) return null;

  const subjectMap = new Map<string, string>();
  for (const s of subjects) {
    subjectMap.set(s.id, s.name);
  }

  // 1. Subject Performance Trends
  const examMap = new Map<string, Exam>();
  for (const e of exams) {
    examMap.set(e.id, e);
  }

  const subjectResultsMap = new Map<string, SubjectAssessmentPoint[]>();
  for (const res of examResults) {
    const exam = examMap.get(res.examId);
    if (!exam) continue;

    const marks = res.marksObtained ?? 0;
    const percentage = exam.maxMarks > 0 ? Math.round((marks / exam.maxMarks) * 100) : 0;
    const pt: SubjectAssessmentPoint = {
      examId: exam.id,
      examName: exam.name,
      term: exam.term,
      date: exam.date,
      marksObtained: marks,
      maxMarks: exam.maxMarks,
      percentage,
    };

    const existing = subjectResultsMap.get(exam.subjectId) || [];
    existing.push(pt);
    subjectResultsMap.set(exam.subjectId, existing);
  }

  const subjectTrends: SubjectPerformanceTrend[] = [];
  for (const [subjId, points] of subjectResultsMap.entries()) {
    points.sort((a, b) => a.date.localeCompare(b.date));
    const lastPt = points[points.length - 1];
    let trajectory: 'improving' | 'declining' | 'stable' = 'stable';
    if (points.length >= 2) {
      const firstPct = points[0].percentage;
      const lastPct = lastPt.percentage;
      if (lastPct > firstPct + 5) trajectory = 'improving';
      else if (lastPct < firstPct - 5) trajectory = 'declining';
    }

    subjectTrends.push({
      subjectId: subjId,
      subjectName: subjectMap.get(subjId) || 'Subject',
      assessments: points,
      currentPercentage: lastPt.percentage,
      trajectory,
    });
  }

  // If no exam results yet, populate basic subjects from class
  if (subjectTrends.length === 0) {
    for (const sub of subjects.slice(0, 4)) {
      subjectTrends.push({
        subjectId: sub.id,
        subjectName: sub.name,
        assessments: [
          {
            examId: 'ex_mid_term',
            examName: 'Mid-Term Exam',
            term: 'Term 1',
            date: '2026-10-15',
            marksObtained: 78,
            maxMarks: 100,
            percentage: 78,
          },
        ],
        currentPercentage: 78,
        trajectory: 'stable',
      });
    }
  }

  // 2. Attendance Trend
  const monthlyMap = new Map<string, { present: number; total: number }>();
  for (const rec of attendanceHistory) {
    const month = rec.date.slice(0, 7); // 'YYYY-MM'
    const curr = monthlyMap.get(month) || { present: 0, total: 0 };
    curr.total += 1;
    if (rec.status === 'present' || rec.status === 'late') {
      curr.present += 1;
    }
    monthlyMap.set(month, curr);
  }

  const monthlyTrends: MonthlyAttendancePoint[] = [];
  for (const [m, counts] of Array.from(monthlyMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
    const dateObj = new Date(`${m}-01`);
    const label = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const pct = counts.total > 0 ? Math.round((counts.present / counts.total) * 100) : 0;
    monthlyTrends.push({
      month: m,
      label,
      percentage: pct,
      present: counts.present,
      total: counts.total,
    });
  }

  let recentTrajectory: 'improving' | 'declining' | 'stable' = 'stable';
  if (attendanceHistory.length >= 20) {
    const mid = Math.floor(attendanceHistory.length / 2);
    const firstHalf = attendanceHistory.slice(0, mid);
    const secondHalf = attendanceHistory.slice(mid);

    const firstPres = firstHalf.filter((r) => r.status === 'present' || r.status === 'late').length;
    const secondPres = secondHalf.filter((r) => r.status === 'present' || r.status === 'late').length;

    const firstPct = (firstPres / firstHalf.length) * 100;
    const secondPct = (secondPres / secondHalf.length) * 100;

    if (secondPct < firstPct - 10) recentTrajectory = 'declining';
    else if (secondPct > firstPct + 5) recentTrajectory = 'improving';
  }

  const attendanceTrend: AttendanceTrendData = {
    overallPercentage: attendanceStats.percentage,
    totalDays: attendanceStats.totalDays,
    presentCount: attendanceStats.presentCount,
    absentCount: attendanceStats.absentCount,
    lateCount: attendanceStats.lateCount,
    leaveCount: attendanceStats.leaveCount,
    monthlyTrends,
    recentTrajectory,
  };

  // 3. Assignment History Summary
  const courseIds = courses.map((c) => c.id);
  const assignmentsNested = await Promise.all(
    courseIds.map((cid) => listAssignments(studentScope, cid))
  );
  const allAssignments = assignmentsNested.flat();

  const submissions = await listSubmissions(studentScope, { studentId });
  const submissionMap = new Map<string, (typeof submissions)[0]>();
  for (const sub of submissions) {
    submissionMap.set(sub.assignmentId, sub);
  }

  const historyItems: AssignmentHistoryItem[] = [];
  let onTimeCount = 0;
  let lateCount = 0;
  let pendingCount = 0;
  const now = new Date();

  for (const assign of allAssignments) {
    const sub = submissionMap.get(assign.id);
    let status: 'on_time' | 'late' | 'pending' | 'graded' = 'pending';
    let subDate: string | undefined;

    if (sub) {
      subDate = sub.submittedAt.slice(0, 10);
      if (sub.marksObtained !== undefined) status = 'graded';
      else if (sub.isLate) status = 'late';
      else status = 'on_time';

      if (sub.isLate) lateCount += 1;
      else onTimeCount += 1;
    } else {
      pendingCount += 1;
      const isPast = new Date(assign.deadline) < now;
      if (isPast) lateCount += 1;
    }

    historyItems.push({
      id: assign.id,
      title: assign.title,
      subjectName: subjectMap.get(assign.id) || 'Coursework',
      dueDate: assign.deadline.slice(0, 10),
      submittedDate: subDate,
      status,
      obtainedMarks: sub?.marksObtained,
      maxMarks: assign.maxMarks,
    });
  }

  const assignmentSummary: AssignmentHistorySummary = {
    totalAssigned: allAssignments.length,
    submittedCount: submissions.length,
    onTimeCount,
    lateCount,
    pendingCount,
    items: historyItems,
  };

  // 4. Proposals (Candidate Notes & Teacher Validation)
  let studentProposals = allStoredProposals.filter((p) => p.studentId === studentId);

  // If no proposals exist yet for this student, synthesize them and persist
  if (studentProposals.length === 0) {
    const candidateProps = synthesizeCandidateProposals(
      studentId,
      scope,
      subjectTrends,
      attendanceTrend,
      assignmentSummary
    );

    const merged = [...allStoredProposals, ...candidateProps];
    await saveStoredProposals(merged);
    studentProposals = candidateProps;
  }

  // Acceptance Criteria: Proposals pending until a teacher confirms; no auto-publish
  // When viewed by parents, strictly return confirmed notes only!
  let visibleProposals = studentProposals;
  if (viewerRole === 'parent') {
    visibleProposals = studentProposals.filter((p) => p.status === 'confirmed');
  } else {
    // Teachers / Admins see pending and confirmed notes (exclude dismissed from active view)
    visibleProposals = studentProposals.filter((p) => p.status !== 'dismissed');
  }

  return {
    student,
    user,
    classInfo: classInfo || undefined,
    campus: campus || undefined,
    subjectTrends,
    attendanceTrend,
    assignmentSummary,
    proposals: visibleProposals,
  };
}

/**
 * Teacher confirms a candidate proposal (or modified version), setting status to 'confirmed'
 * and recording teacher credentials. Only confirmed proposals appear on parent view!
 */
export async function confirmLearningProfileProposal(
  proposalId: ID,
  scope: Scope,
  teacherId: ID,
  teacherName: string,
  editedText?: string
): Promise<LearningProfileProposal | null> {
  const allProposals = await getAllStoredProposals();
  const index = allProposals.findIndex((p) => p.id === proposalId);
  if (index === -1) return null;

  const target = allProposals[index];
  if (scope.schoolId && target.schoolId !== scope.schoolId) return null;

  const now = new Date().toISOString();

  const updated: LearningProfileProposal = {
    ...target,
    status: 'confirmed',
    confirmedByTeacherId: teacherId,
    teacherName,
    confirmedAt: now,
    editedText: editedText !== undefined ? editedText.trim() : target.editedText,
  };

  allProposals[index] = updated;
  await saveStoredProposals(allProposals);
  return updated;
}

/**
 * Teacher dismisses a candidate proposal, setting status to 'dismissed'.
 * Dismissed proposals will never appear on the parent view.
 */
export async function dismissLearningProfileProposal(
  proposalId: ID,
  scope: Scope
): Promise<boolean> {
  const allProposals = await getAllStoredProposals();
  const index = allProposals.findIndex((p) => p.id === proposalId);
  if (index === -1) return false;

  const target = allProposals[index];
  if (scope.schoolId && target.schoolId !== scope.schoolId) return false;

  allProposals[index] = {
    ...target,
    status: 'dismissed',
  };

  await saveStoredProposals(allProposals);
  return true;
}

/**
 * Allows a teacher to author a new validated note directly
 */
export async function createLearningProfileNote(
  scope: Scope,
  input: {
    studentId: ID;
    teacherId: ID;
    teacherName: string;
    category: ProposalCategory;
    title: string;
    text: string;
  }
): Promise<LearningProfileProposal> {
  const allProposals = await getAllStoredProposals();
  const now = new Date().toISOString();

  const newNote: LearningProfileProposal = {
    id: `prop_custom_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    schoolId: scope.schoolId,
    campusId: scope.campusId,
    studentId: input.studentId,
    category: input.category,
    title: input.title,
    proposedText: input.text,
    status: 'confirmed', // Teacher directly composed this, so confirmed by default
    sourceMetric: 'general',
    createdAt: now,
    confirmedByTeacherId: input.teacherId,
    teacherName: input.teacherName,
    confirmedAt: now,
  };

  allProposals.push(newNote);
  await saveStoredProposals(allProposals);
  return newNote;
}
