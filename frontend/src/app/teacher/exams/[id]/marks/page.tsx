'use client';

import React, { use } from 'react';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';
import { MarksEntryGrid } from '@/components/exams/MarksEntryGrid';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TeacherExamMarksPage({ params }: PageProps) {
  const resolvedParams = use(params);

  return (
    <RouteGuard allowedRoles={['teacher', 'school_admin', 'super_admin', 'principal']}>
      <AppShell pageTitle="Marks Entry">
        <MarksEntryGrid examId={resolvedParams.id} />
      </AppShell>
    </RouteGuard>
  );
}
