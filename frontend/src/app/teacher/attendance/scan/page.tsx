'use client';

import React, { use } from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { QRScannerMock } from '@/components/attendance/QRScannerMock';
import { ISODate } from '@/types';

interface PageProps {
  searchParams: Promise<{ classId?: string; date?: string }>;
}

export default function TeacherQRScannerPage({ searchParams }: PageProps) {
  const resolvedSearchParams = use(searchParams);

  return (
    <RouteGuard allowedRoles={['teacher', 'school_admin', 'super_admin', 'principal']}>
      <AppShell pageTitle="QR Attendance Scanner">
        <QRScannerMock
          initialClassId={resolvedSearchParams.classId}
          initialDate={resolvedSearchParams.date as ISODate | undefined}
        />
      </AppShell>
    </RouteGuard>
  );
}
