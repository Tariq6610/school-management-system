'use client';

import React, { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { useSession } from '@/components/providers/SessionProvider';
import {
  StudentLearningProfileData,
  getStudentLearningProfile,
} from '@/lib/repositories/learningProfiles';
import { LearningProfileView } from '@/components/teacher/LearningProfileView';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function StudentLearningProfilePage({ params }: PageProps) {
  const resolvedParams = use(params);
  const studentId = resolvedParams.id;
  const { session } = useSession();

  const [profileData, setProfileData] = useState<StudentLearningProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      if (!session) return;
      setLoading(true);
      try {
        const scope = {
          schoolId: session.schoolId,
          campusId: session.campusId,
        };
        const res = await getStudentLearningProfile(studentId, scope, 'teacher');
        if (!ignore) {
          setProfileData(res);
        }
      } catch (err) {
        console.error('Failed to load learning profile:', err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadProfile();
    return () => {
      ignore = true;
    };
  }, [studentId, session]);

  return (
    <RouteGuard allowedRoles={['teacher', 'school_admin', 'super_admin', 'principal']}>
      <AppShell pageTitle="Student Learning Profile">
        {loading ? (
          <div className="py-20 text-center text-neutral-500 bg-white rounded-2xl border border-neutral-200">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-purple-600 border-r-transparent mb-3" />
            <p className="text-sm font-medium">Loading student learning profile, metrics &amp; proposals...</p>
          </div>
        ) : !profileData ? (
          <div className="py-16 text-center text-neutral-500 bg-white rounded-2xl border border-neutral-200 p-6">
            <p className="text-base font-semibold text-neutral-800">Student record not found</p>
            <p className="text-xs text-neutral-500 mt-1 mb-4">
              Unable to locate student with ID: {studentId}
            </p>
            <Link
              href="/teacher/dashboard"
              className="text-xs font-bold text-purple-700 hover:underline"
            >
              ← Back to Teacher Dashboard
            </Link>
          </div>
        ) : (
          <LearningProfileView initialData={profileData} userRole="teacher" />
        )}
      </AppShell>
    </RouteGuard>
  );
}
