'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { useSession } from '@/components/providers/SessionProvider';
import { getChildrenForParent, getStudent, ParentChildInfo } from '@/lib/repositories';
import { Student } from '@/types';
import { AnnouncementFeedView } from '@/components/communication';

function ParentAnnouncementsContent() {
  const { session, activeChildId } = useSession();
  const schoolId = session?.schoolId || 'sch_main';

  const [activeChildStudent, setActiveChildStudent] = useState<Student | null>(null);
  const [children, setChildren] = useState<ParentChildInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadChildContext() {
      setLoading(true);
      try {
        if (session?.userId && session.role === 'parent') {
          const linked = await getChildrenForParent(session.userId);
          if (isMounted) {
            setChildren(linked);
          }
          const targetId = activeChildId || linked[0]?.student.id;
          if (targetId) {
            const stu = await getStudent(targetId);
            if (isMounted) {
              setActiveChildStudent(stu);
            }
          }
        } else if (activeChildId) {
          const stu = await getStudent(activeChildId);
          if (isMounted) {
            setActiveChildStudent(stu);
          }
        }
      } catch (err) {
        console.error('[ParentAnnouncementsPage] Error loading child context:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadChildContext();
    return () => {
      isMounted = false;
    };
  }, [session?.userId, session?.role, activeChildId]);

  const studentContext = activeChildStudent
    ? {
        campusId: activeChildStudent.campusId,
        classId: activeChildStudent.classId,
      }
    : undefined;

  const currentChildName =
    children.find((c) => c.student.id === activeChildStudent?.id)?.user.name ||
    'Your Child';

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Child Context Banner if multiple children */}
      {activeChildStudent && (
        <div className="p-3.5 bg-white rounded-2xl border border-neutral-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-neutral-500">Showing announcements for:</span>
            <span className="font-bold text-neutral-900">{currentChildName}</span>
            <span className="text-neutral-500 font-medium">
              (Roll: {activeChildStudent.rollNumber || 'N/A'})
            </span>
          </div>

          <span className="text-[11px] text-neutral-500">
            Use child switcher in header to change child
          </span>
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-xs text-neutral-500 bg-white rounded-2xl border border-neutral-200">
          <div className="inline-block w-5 h-5 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin mb-2" />
          <p>Loading notices for {currentChildName}...</p>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-2xs">
          <AnnouncementFeedView
            key={`feed-${schoolId}-${activeChildStudent?.campusId ?? 'all'}-${activeChildStudent?.classId ?? 'all'}`}
            schoolId={schoolId}
            studentContext={studentContext}
            title="School &amp; Class Circulars"
            subtitle={`Official updates and notices applicable to ${currentChildName}'s campus and class.`}
          />
        </div>
      )}
    </div>
  );
}

export default function ParentAnnouncementsPage() {
  return (
    <RouteGuard allowedRoles={['parent', 'school_admin', 'super_admin']}>
      <AppShell pageTitle="Announcements">
        <Suspense fallback={<div className="p-8 text-neutral-500">Loading notices...</div>}>
          <ParentAnnouncementsContent />
        </Suspense>
      </AppShell>
    </RouteGuard>
  );
}
