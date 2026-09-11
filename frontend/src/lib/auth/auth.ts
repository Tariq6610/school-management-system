import { Role, Session, ID } from '@/types';
import { getUserByEmail } from '@/lib/repositories/users';
import { getParentByUserId } from '@/lib/repositories/parents';
import { getStudentParentsByParentId } from '@/lib/repositories/studentParents';
import { getSession, setSession, clearSession } from '@/lib/repositories/session';

export interface DemoAccount {
  email: string;
  name: string;
  role: Role;
  roleLabel: string;
  description: string;
  campusLabel?: string;
}

/**
 * Six institutional demo accounts specified in FEATURE_SPECIFICATIONS.md §1.
 */
export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: 'superadmin@abcschool.pk',
    name: 'Khurram Shahzad',
    role: 'super_admin',
    roleLabel: 'Super Admin',
    description: 'Multi-campus network oversight & revenue',
  },
  {
    email: 'admin@abcschool.pk',
    name: 'Zia-ur-Rehman',
    role: 'school_admin',
    roleLabel: 'School Admin',
    description: 'Central operations, admissions & fee structures',
    campusLabel: 'Main Campus',
  },
  {
    email: 'principal.main@abcschool.pk',
    name: 'Dr. Asad Qureshi',
    role: 'principal',
    roleLabel: 'Campus Principal',
    description: 'Main Campus academic results & faculty supervision',
    campusLabel: 'Main Campus',
  },
  {
    email: 'teacher.sana@abcschool.pk',
    name: 'Sana Malik',
    role: 'teacher',
    roleLabel: 'Teacher',
    description: 'Grade 8-A Mathematics, daily attendance & LMS',
    campusLabel: 'Main Campus',
  },
  {
    email: 'parent.khan@abcschool.pk',
    name: 'Tariq Khan',
    role: 'parent',
    roleLabel: 'Parent',
    description: 'Father of Ahmed (8-A) & Ayesha (6-A)',
  },
  {
    email: 'student.ahmed@abcschool.pk',
    name: 'Ahmed Khan',
    role: 'student',
    roleLabel: 'Student',
    description: 'Grade 8-A, roll no 01, lessons & assignments',
    campusLabel: 'Main Campus',
  },
];

/**
 * Map institutional role to its home dashboard route per ROUTE_STRUCTURE.md.
 */
export function getRoleDashboardRoute(role: Role): string {
  switch (role) {
    case 'super_admin':
      return '/super-admin/dashboard';
    case 'school_admin':
      return '/admin/dashboard';
    case 'principal':
      return '/principal/dashboard';
    case 'teacher':
      return '/teacher/dashboard';
    case 'parent':
      return '/parent/dashboard';
    case 'student':
      return '/student/dashboard';
    default:
      return '/login';
  }
}

export interface SignInResult {
  success: boolean;
  session?: Session;
  redirectTo?: string;
  error?: string;
}

/**
 * Perform institutional sign-in.
 * In this Phase 0 offline prototype, any non-empty password is accepted
 * per FEATURE_SPECIFICATIONS.md §1 ("passwords are not checked").
 */
export async function signIn(email: string, password?: string): Promise<SignInResult> {
  const cleanEmail = email.trim().toLowerCase();

  if (!cleanEmail) {
    return { success: false, error: 'Please enter your institutional email address.' };
  }

  // Password field is required and masked even in prototype
  if (!password || password.trim().length === 0) {
    return { success: false, error: 'Password is required.' };
  }

  const user = await getUserByEmail(cleanEmail);

  if (!user) {
    return {
      success: false,
      error: 'No account found matching this email address. Please select a demo account below.',
    };
  }

  if (user.status !== 'active') {
    return {
      success: false,
      error: 'This account is currently inactive. Please contact the school administrator.',
    };
  }

  let activeChildId: ID | undefined = undefined;

  // If user is a parent, look up their enrolled children to populate activeChildId
  if (user.role === 'parent') {
    const parentRecord = await getParentByUserId(user.id);
    if (parentRecord) {
      const links = await getStudentParentsByParentId(parentRecord.id);
      if (links.length > 0) {
        // Default to first enrolled child
        activeChildId = links[0].studentId;
      }
    }
  }

  const session: Session = {
    userId: user.id,
    role: user.role,
    schoolId: user.schoolId,
    campusId: user.campusId ?? 'cmp_main',
    currentAcademicYearId: 'ay_2026_2027',
    activeChildId,
  };

  await setSession(session);

  return {
    success: true,
    session,
    redirectTo: getRoleDashboardRoute(user.role),
  };
}

/**
 * Sign out and clear active session.
 */
export async function signOut(): Promise<void> {
  await clearSession();
}

/**
 * Get active session from local storage.
 */
export async function getCurrentSession(): Promise<Session | null> {
  return getSession();
}
