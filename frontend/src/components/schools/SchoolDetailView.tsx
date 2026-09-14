'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { School } from '@/types';
import { getSchool, updateSchool } from '@/lib/repositories/schools';
import { getNetworkOverviewStats, NetworkOverviewStats } from '@/lib/repositories/networkDashboard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StatCard } from '@/components/ui/StatCard';
import { ErrorState } from '@/components/ui/ErrorState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { formatPKR } from '@/lib/utils';
import { CampusManager } from '@/components/campuses/CampusManager';
import { NavIcon } from '@/components/shell/NavIcon';

export interface SchoolDetailViewProps {
  schoolId: string;
}

export function SchoolDetailView({ schoolId }: SchoolDetailViewProps) {
  const { showToast } = useToast();
  const [school, setSchool] = useState<School | null>(null);
  const [stats, setStats] = useState<NetworkOverviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Edit drawer state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formTimezone, setFormTimezone] = useState('');
  const [formStatus, setFormStatus] = useState<School['status']>('active');
  const [formError, setFormError] = useState<string | null>(null);

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

  const openEdit = () => {
    if (!school) return;
    setFormName(school.name);
    setFormAddress(school.address);
    setFormTimezone(school.timezone);
    setFormStatus(school.status);
    setFormError(null);
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!school) return;
    if (!formName.trim()) {
      setFormError('School name is required.');
      return;
    }
    if (!formAddress.trim()) {
      setFormError('Address is required.');
      return;
    }
    if (!formTimezone.trim()) {
      setFormError('Timezone is required.');
      return;
    }

    setIsSaving(true);
    setFormError(null);
    try {
      const updated = await updateSchool(school.id, {
        name: formName.trim(),
        address: formAddress.trim(),
        timezone: formTimezone.trim(),
        status: formStatus,
      });
      setSchool(updated);
      setIsEditOpen(false);
      showToast({ type: 'success', title: 'School updated', message: `${updated.name}'s details have been saved.` });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update school details.';
      setFormError(message);
      showToast({ type: 'error', title: 'Could not save changes', message });
    } finally {
      setIsSaving(false);
    }
  };

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
        <Button
          variant="secondary"
          size="sm"
          onClick={openEdit}
          leftIcon={<NavIcon name="settings" className="w-3.5 h-3.5" />}
        >
          Edit School Details
        </Button>
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

      {/* Edit School Details Drawer */}
      <Drawer
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit School Details"
        description={school.name}
        footer={
          <>
            <Button variant="secondary" size="md" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" isLoading={isSaving} onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && (
            <div
              role="alert"
              className="p-3 rounded-control bg-absent-bg text-absent border border-absent/25 text-sm"
            >
              {formError}
            </div>
          )}

          <Input
            label="School Name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            required
          />

          <Input
            label="Address"
            value={formAddress}
            onChange={(e) => setFormAddress(e.target.value)}
            required
          />

          <Input
            label="Timezone"
            value={formTimezone}
            onChange={(e) => setFormTimezone(e.target.value)}
            hint="e.g. Asia/Karachi"
            required
          />

          <Select
            label="Status"
            value={formStatus}
            onChange={(e) => setFormStatus(e.target.value as School['status'])}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        </div>
      </Drawer>
    </div>
  );
}
