'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { School } from '@/types';
import { listSchools } from '@/lib/repositories/schools';
import { getNetworkOverviewStats } from '@/lib/repositories/networkDashboard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { formatPKR } from '@/lib/utils';

interface SchoolWithStats extends School {
  campusesCount: number;
  studentsCount: number;
  teachersCount: number;
  feeCollectionTotal: number;
}

export function SchoolsListView() {
  const [schools, setSchools] = useState<SchoolWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const baseSchools = await listSchools();
      const enriched = await Promise.all(
        baseSchools.map(async (school) => {
          const stats = await getNetworkOverviewStats({ schoolId: school.id });
          return {
            ...school,
            campusesCount: stats.campusesCount,
            studentsCount: stats.studentsCount,
            teachersCount: stats.teachersCount,
            feeCollectionTotal: stats.feeCollectionTotal,
          };
        })
      );
      setSchools(enriched);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load school network.');
    } finally {
      setIsLoading(false);
    }
  }, []);

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
      <div className="max-w-5xl mx-auto p-4 sm:p-6">
        <ErrorState title="Schools Could Not Be Loaded" message={loadError} onRetry={load} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-page-title text-ink-900">Schools</h1>
        <p className="text-secondary-meta text-ink-600 mt-1">
          All schools registered on the network. Select a school to view its campuses and details.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : schools.length === 0 ? (
        <EmptyState
          title="No schools registered yet"
          description="Once a school is onboarded to the network, it will appear here."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {schools.map((school) => (
            <Link
              key={school.id}
              href={`/super-admin/schools/${school.id}`}
              className="rounded-card bg-surface border border-rule p-5 space-y-4 hover:border-brand-600/50 hover:shadow-overlay transition-all group"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-section-heading text-ink-900 group-hover:text-brand-700 transition-colors">
                    {school.name}
                  </h2>
                  <p className="text-secondary-meta text-ink-500">{school.address}</p>
                </div>
                <StatusBadge status={school.status === 'active' ? 'active' : 'inactive'} />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-rule text-xs">
                <div className="p-2.5 rounded-control bg-canvas">
                  <span className="text-ink-500 block">Campuses</span>
                  <span className="text-lg font-bold text-ink-900 tabular-nums">{school.campusesCount}</span>
                </div>
                <div className="p-2.5 rounded-control bg-canvas">
                  <span className="text-ink-500 block">Students</span>
                  <span className="text-lg font-bold text-ink-900 tabular-nums">{school.studentsCount}</span>
                </div>
                <div className="p-2.5 rounded-control bg-canvas">
                  <span className="text-ink-500 block">Teachers</span>
                  <span className="text-lg font-bold text-ink-900 tabular-nums">{school.teachersCount}</span>
                </div>
                <div className="p-2.5 rounded-control bg-canvas">
                  <span className="text-ink-500 block">Fee Collected</span>
                  <span className="text-lg font-bold text-ink-900 tabular-nums">
                    {formatPKR(school.feeCollectionTotal)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
