'use client';

import React, { use } from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { AttendanceGrid } from '@/components/attendance/AttendanceGrid';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TeacherClassAttendancePage({ params }: PageProps) {
  const resolvedParams = use(params);

  return (
    <RouteGuard allowedRoles={['teacher', 'school_admin', 'super_admin', 'principal']}>
      <AppShell pageTitle="Mark Attendance">
        <AttendanceGrid classId={resolvedParams.id} />
      </AppShell>
    </RouteGuard>
  );
}
