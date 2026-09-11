'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Campus, User, ID, Scope } from '@/types';
import { listCampuses, createCampus, updateCampus, deleteCampus } from '@/lib/repositories/campuses';
import { listStudents } from '@/lib/repositories/students';
import { listClasses } from '@/lib/repositories/classes';
import { listUsers } from '@/lib/repositories/users';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Drawer } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { Table, TableColumn } from '@/components/ui/Table';

export interface CampusWithStats extends Campus {
  principal?: User | null;
  studentCount: number;
  classCount: number;
}

interface RefusalInfo {
  campusName: string;
  studentCount: number;
}

interface CampusManagerProps {
  portalScope?: 'admin' | 'super-admin';
}

export function CampusManager({ portalScope = 'admin' }: CampusManagerProps) {
  const { session } = useSession();
  const { showToast } = useToast();

  const schoolId = session?.schoolId ?? 'sch_main';

  const [campuses, setCampuses] = useState<CampusWithStats[]>([]);
  const [principals, setPrincipals] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Drawer state (Add / Edit)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingCampus, setEditingCampus] = useState<CampusWithStats | null>(null);
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPrincipalId, setFormPrincipalId] = useState('');
  const [formIsPrimary, setFormIsPrimary] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Deletion state
  const [campusToDelete, setCampusToDelete] = useState<CampusWithStats | null>(null);
  const [refusalInfo, setRefusalInfo] = useState<RefusalInfo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load campuses and aggregate stats
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const scope: Scope = { schoolId };

      const [rawCampuses, allPrincipals] = await Promise.all([
        listCampuses(scope),
        listUsers(scope, { role: 'principal' }),
      ]);

      const principalsMap = new Map<ID, User>();
      allPrincipals.forEach((p) => principalsMap.set(p.id, p));
      setPrincipals(allPrincipals);

      // Aggregate student and class counts per campus
      const enriched: CampusWithStats[] = await Promise.all(
        rawCampuses.map(async (campus) => {
          const campusScope: Scope = { schoolId, campusId: campus.id };
          const [students, classes] = await Promise.all([
            listStudents(campusScope),
            listClasses(campusScope),
          ]);

          return {
            ...campus,
            principal: campus.principalId ? principalsMap.get(campus.principalId) ?? null : null,
            studentCount: students.length,
            classCount: classes.length,
          };
        })
      );

      setCampuses(enriched);
    } catch (err) {
      console.error('Failed to load campuses:', err);
      showToast({
        type: 'error',
        title: 'Error loading campuses',
        message: 'Could not fetch campus records from local storage.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [schoolId, showToast]);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) {
        loadData();
      }
    });
    return () => {
      ignore = true;
    };
  }, [loadData]);

  // Filtered campuses
  const filteredCampuses = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return campuses;
    return campuses.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q) ||
        (c.principal?.name && c.principal.name.toLowerCase().includes(q))
    );
  }, [campuses, searchQuery]);

  // Overall metrics
  const totalStudents = useMemo(
    () => campuses.reduce((sum, c) => sum + c.studentCount, 0),
    [campuses]
  );
  const totalClasses = useMemo(
    () => campuses.reduce((sum, c) => sum + c.classCount, 0),
    [campuses]
  );
  const campusesWithPrincipal = useMemo(
    () => campuses.filter((c) => Boolean(c.principalId)).length,
    [campuses]
  );

  // Drawer Open Handlers
  const handleOpenAdd = () => {
    setEditingCampus(null);
    setFormName('');
    setFormAddress('');
    setFormPrincipalId('');
    setFormIsPrimary(campuses.length === 0);
    setFormError(null);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (campus: CampusWithStats) => {
    setEditingCampus(campus);
    setFormName(campus.name);
    setFormAddress(campus.address);
    setFormPrincipalId(campus.principalId ?? '');
    setFormIsPrimary(campus.isPrimary);
    setFormError(null);
    setIsDrawerOpen(true);
  };

  // Form Submit Handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const name = formName.trim();
    const address = formAddress.trim();

    if (!name) {
      setFormError('Campus name is required.');
      return;
    }
    if (!address) {
      setFormError('Campus address is required.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingCampus) {
        await updateCampus(editingCampus.id, {
          name,
          address,
          principalId: formPrincipalId ? formPrincipalId : undefined,
          isPrimary: formIsPrimary,
        });

        // If marked primary, unmark any other primary campus in same school
        if (formIsPrimary && !editingCampus.isPrimary) {
          for (const c of campuses) {
            if (c.id !== editingCampus.id && c.isPrimary) {
              await updateCampus(c.id, { isPrimary: false });
            }
          }
        }

        showToast({
          type: 'success',
          title: 'Campus updated',
          message: `Successfully updated ${name}.`,
        });
      } else {
        const created = await createCampus({
          schoolId,
          name,
          address,
          principalId: formPrincipalId ? formPrincipalId : undefined,
          isPrimary: formIsPrimary,
        });

        if (formIsPrimary) {
          for (const c of campuses) {
            if (c.isPrimary) {
              await updateCampus(c.id, { isPrimary: false });
            }
          }
        }

        showToast({
          type: 'success',
          title: 'Campus created',
          message: `Successfully added ${created.name}.`,
        });
      }

      setIsDrawerOpen(false);
      await loadData();
    } catch (err) {
      console.error('Failed to save campus:', err);
      setFormError('An unexpected error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  // Deletion Request Handler (Enforces Acceptance Criteria)
  const handleDeleteClick = (campus: CampusWithStats) => {
    // Acceptance criterion: Delete refused when students exist, with a count
    if (campus.studentCount > 0) {
      setRefusalInfo({
        campusName: campus.name,
        studentCount: campus.studentCount,
      });
      return;
    }

    // Zero students: allow confirmation dialog
    setCampusToDelete(campus);
  };

  const handleConfirmDelete = async () => {
    if (!campusToDelete) return;
    setIsDeleting(true);
    try {
      await deleteCampus(campusToDelete.id);
      showToast({
        type: 'success',
        title: 'Campus deleted',
        message: `Successfully removed ${campusToDelete.name}.`,
      });
      setCampusToDelete(null);
      await loadData();
    } catch (err) {
      console.error('Failed to delete campus:', err);
      showToast({
        type: 'error',
        title: 'Delete failed',
        message: 'Could not delete the campus record.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: TableColumn<CampusWithStats>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Campus Name',
        accessor: (campus: CampusWithStats) => (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-ink-900">{campus.name}</span>
            {campus.isPrimary && (
              <StatusBadge status="published" label="Primary Branch" size="sm" />
            )}
          </div>
        ),
      },
      {
        key: 'address',
        header: 'Address',
        accessor: (campus: CampusWithStats) => (
          <span className="text-ink-600 text-xs truncate max-w-xs block">
            {campus.address}
          </span>
        ),
      },
      {
        key: 'principal',
        header: 'Assigned Principal',
        accessor: (campus: CampusWithStats) =>
          campus.principal ? (
            <div className="flex items-center gap-2">
              <Avatar name={campus.principal.name} size="sm" />
              <div className="min-w-0">
                <div className="text-xs font-medium text-ink-900 truncate">
                  {campus.principal.name}
                </div>
                <div className="text-[11px] text-ink-500 truncate">
                  {campus.principal.email}
                </div>
              </div>
            </div>
          ) : (
            <span className="inline-flex items-center text-[11px] font-medium text-ink-400 bg-ink-50 px-2 py-0.5 rounded">
              Unassigned
            </span>
          ),
      },
      {
        key: 'studentCount',
        header: 'Students',
        align: 'right',
        isNumeric: true,
        accessor: (campus: CampusWithStats) => (
          <span className="font-tabular font-medium text-ink-900">
            {campus.studentCount}
          </span>
        ),
      },
      {
        key: 'classCount',
        header: 'Classes',
        align: 'right',
        isNumeric: true,
        accessor: (campus: CampusWithStats) => (
          <span className="font-tabular text-ink-600">
            {campus.classCount}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        align: 'right',
        accessor: (campus: CampusWithStats) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenEdit(campus)}
            >
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-absent hover:bg-absent/10"
              onClick={() => handleDeleteClick(campus)}
              aria-label={`Delete campus ${campus.name}`}
            >
              Delete
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-page-title font-semibold text-ink-900 tracking-tight">
            {portalScope === 'super-admin' ? 'Network Campuses' : 'Campus Management'}
          </h1>
          <p className="text-secondary-meta text-ink-600 mt-0.5">
            Configure branches, assign principals, and review institutional campus capacity.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={handleOpenAdd}
            leftIcon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            Add Campus
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Campuses"
          value={campuses.length}
          subtitle={`${campusesWithPrincipal} with principal`}
        />
        <StatCard
          label="Enrolled Students"
          value={totalStudents.toLocaleString()}
          subtitle="Across all campuses"
        />
        <StatCard
          label="Active Classes"
          value={totalClasses}
          subtitle="Configured grade sections"
        />
        <StatCard
          label="Principals Appointed"
          value={`${campusesWithPrincipal} / ${campuses.length}`}
          subtitle={campusesWithPrincipal === campuses.length ? 'Fully staffed' : 'Action needed'}
        />
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-surface p-3 rounded-card border border-rule">
        <div className="w-full sm:w-80">
          <Input
            label="Search Campuses"
            placeholder="Search campuses, address, principal..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            prefixIcon={
              <svg className="w-4 h-4 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
          />
        </div>
        <div className="text-caption text-ink-500 font-tabular self-end sm:self-center">
          Showing {filteredCampuses.length} of {campuses.length} campuses
        </div>
      </div>

      {/* Campuses Table */}
      <Table<CampusWithStats>
        columns={columns}
        data={filteredCampuses}
        isLoading={isLoading}
        emptyState={{
          title: searchQuery ? 'No matching campuses' : 'No campuses configured',
          description: searchQuery
            ? `No campuses found matching "${searchQuery}". Try a different keyword.`
            : 'Campuses represent physical school branches. Add your first campus to begin.',
          action: {
            label: searchQuery ? 'Clear Search' : 'Add Campus',
            onClick: searchQuery ? () => setSearchQuery('') : handleOpenAdd,
          },
        }}
      />

      {/* Add / Edit Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={editingCampus ? `Edit Campus: ${editingCampus.name}` : 'Add New Campus'}
        description="Specify campus identity, physical address, and appointed academic leadership."
        width="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setIsDrawerOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleSave}
              isLoading={isSaving}
            >
              {editingCampus ? 'Save Changes' : 'Create Campus'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div
              role="alert"
              className="p-3 text-xs bg-absent/10 border border-absent/30 rounded-card text-absent flex items-center gap-2"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{formError}</span>
            </div>
          )}

          <Input
            label="Campus Name"
            placeholder="e.g. North Campus"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Physical Address"
            placeholder="e.g. Block 4, Clifton, Karachi"
            value={formAddress}
            onChange={(e) => setFormAddress(e.target.value)}
            required
          />

          <Select
            label="Appointed Campus Principal"
            value={formPrincipalId}
            onChange={(e) => setFormPrincipalId(e.target.value)}
            options={[
              { value: '', label: '— No Principal Assigned (Unassigned) —' },
              ...principals.map((p) => ({
                value: p.id,
                label: `${p.name} (${p.email})`,
              })),
            ]}
            hint="Picks from verified users with the Principal role at this school."
          />

          <div className="pt-2">
            <label className="flex items-start gap-3 p-3 rounded-card border border-rule hover:bg-surface-subtle cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={formIsPrimary}
                onChange={(e) => setFormIsPrimary(e.target.checked)}
                className="mt-0.5 rounded border-ink-300 text-primary focus:ring-primary h-4 w-4"
              />
              <div className="text-xs">
                <span className="font-semibold text-ink-900 block">Primary Institutional Campus</span>
                <span className="text-ink-600 leading-normal">
                  Mark this campus as the head office or main campus of the school network.
                </span>
              </div>
            </label>
          </div>
        </form>
      </Drawer>

      {/* Acceptance Criteria Refusal Modal: Delete refused when students exist, with a count */}
      <Modal
        isOpen={Boolean(refusalInfo)}
        onClose={() => setRefusalInfo(null)}
        title="Deletion Blocked"
        size="md"
        footer={
          <div className="flex justify-end">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setRefusalInfo(null)}
            >
              Understood
            </Button>
          </div>
        }
      >
        {refusalInfo && (
          <div className="space-y-4">
            <div
              role="alert"
              className="p-3.5 rounded-card bg-absent/10 border border-absent/20 flex items-start gap-3"
            >
              <div className="p-1 rounded-full bg-absent/20 text-absent shrink-0 mt-0.5">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="space-y-1 text-xs">
                <h2 className="font-bold text-absent text-sm">
                  Cannot Delete Campus with Enrolled Students
                </h2>
                <p className="text-ink-700 leading-relaxed">
                  Campus <strong className="text-ink-900">{refusalInfo.campusName}</strong> currently has{' '}
                  <strong className="text-ink-900 font-semibold font-tabular">
                    {refusalInfo.studentCount} student{refusalInfo.studentCount === 1 ? '' : 's'}
                  </strong>{' '}
                  enrolled.
                </p>
              </div>
            </div>

            <p className="text-xs text-ink-600 leading-relaxed">
              Institutional safety rules strictly prohibit deleting any campus that holds active student records.
              To delete this campus, you must first reassign, transfer, or graduate all{' '}
              <strong className="font-tabular text-ink-800">{refusalInfo.studentCount}</strong> students through the Student Directory.
            </p>
          </div>
        )}
      </Modal>

      {/* Confirmation Dialog for empty campuses */}
      <ConfirmDialog
        isOpen={Boolean(campusToDelete)}
        onClose={() => setCampusToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Empty Campus?"
        recordName={campusToDelete ? campusToDelete.name : 'Campus'}
        actionType="delete"
        confirmLabel="Yes, Delete Campus"
        isLoading={isDeleting}
        message="This campus has 0 enrolled students. Are you sure you want to delete this campus record? This action cannot be undone."
      />
    </div>
  );
}
