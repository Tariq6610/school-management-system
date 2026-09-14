'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { School } from '@/types';
import { getSchool } from '@/lib/repositories/schools';
import { getNetworkOverviewStats, NetworkOverviewStats } from '@/lib/repositories/networkDashboard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StatCard } from '@/components/ui/StatCard';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { formatPKR } from '@/lib/utils';
import { CampusManager } from '@/components/campuses/CampusManager';

export interface SchoolDetailViewProps {
  schoolId: string;
}

export function SchoolDetailView({ schoolId }: SchoolDetailViewProps) {
  const [school, setSchool] = useState<School | null>(null);
  const [stats, setStats] = useState<NetworkOverviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    setNotFound(false);
    try {
      const [schoolRecord, overviewStats] = await Promise.all([
        getSchool(schoolId),
        getNetworkOverviewStats({ schoolId }),
      ]);
      if (!schoolRecord) {
        setNotFound(true);
        return;
      }
      setSchool(schoolRecord);
      setStats(overviewStats);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load school details.');
    } finally {
      setIsLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) load();
    });
    return () => {
      ignore = true;
    };
  }, [load]);

  if (loadError) {
    return (
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <ErrorState title="School Could Not Be Loaded" message={loadError} onRetry={load} />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <ErrorState
          title="School Not Found"
          message={`No school exists with id "${schoolId}". It may have been removed.`}
        />
      </div>
    );
  }

  if (isLoading || !school || !stats) {
    return (
      <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-3">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <Link href="/super-admin/schools" className="text-secondary-meta text-ink-500 hover:text-brand-700">
          ← Back to Schools
        </Link>
      </div>

      <div className="rounded-card bg-surface border border-rule p-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-page-title text-ink-900">{school.name}</h1>
            <StatusBadge status={school.status === 'active' ? 'active' : 'inactive'} />
          </div>
          <p className="text-secondary-meta text-ink-600 mt-1">{school.address}</p>
          <p className="text-secondary-meta text-ink-400 mt-0.5">Timezone: {school.timezone}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Campuses" value={String(stats.campusesCount)} />
        <StatCard label="Students" value={String(stats.studentsCount)} />
        <StatCard label="Teachers" value={String(stats.teachersCount)} />
        <StatCard
          label="Fee Collected"
          value={formatPKR(stats.feeCollectionTotal, { compact: true })}
          subtitle={`${stats.overallCollectionRate}% of billed`}
        />
      </div>

      <div>
        <CampusManager portalScope="super-admin" />
      </div>
    </div>
  );
}
