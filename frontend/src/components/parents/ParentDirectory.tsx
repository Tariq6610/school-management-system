'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { Campus, Class, ID, Scope, Student, User } from '@/types';
import {
  createParentWithUser,
  EnrichedParent,
  listEnrichedParents,
  safeDeleteParent,
} from '@/lib/repositories/parents';
import { listCampuses } from '@/lib/repositories/campuses';
import { listClasses } from '@/lib/repositories/classes';
import { listStudents } from '@/lib/repositories/students';
import { listUsers } from '@/lib/repositories/users';
import { linkStudentParent } from '@/lib/repositories/studentParents';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { StatCard } from '@/components/ui/StatCard';
import { Avatar } from '@/components/ui/Avatar';
import { Table, TableColumn } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { NavIcon } from '@/components/shell/NavIcon';

const PAGE_SIZE = 20;

export function ParentDirectory() {
  const { session } = useSession();
  const { showToast } = useToast();
  const schoolId = session?.schoolId ?? 'sch_main';

  // Data states
  const [parents, setParents] = useState<EnrichedParent[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [allStudents, setAllStudents] = useState<Array<{ student: Student; user: User; classStr: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [rawSearch, setRawSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCampus, setSelectedCampus] = useState<string>('all');
  const [selectedFamilyType, setSelectedFamilyType] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parentToDelete, setParentToDelete] = useState<EnrichedParent | null>(null);

  // Add Parent Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newOccupation, setNewOccupation] = useState('');
  const [newCampusId, setNewCampusId] = useState('');
  const [newStudentIdToLink, setNewStudentIdToLink] = useState('');
  const [newRelationship, setNewRelationship] = useState<'father' | 'mother' | 'guardian'>('father');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(rawSearch);
      setCurrentPage(1);
    }, 200);
    return () => clearTimeout(timer);
  }, [rawSearch]);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const scope: Scope = { schoolId };
      const [enriched, campusList, rawStudents, rawUsers, rawClasses] = await Promise.all([
        listEnrichedParents(scope),
        listCampuses(scope),
        listStudents(scope),
        listUsers(scope, { role: 'student' }),
        listClasses(scope),
      ]);

      setParents(enriched);
      setCampuses(campusList);

      const userMap = new Map<ID, User>();
      rawUsers.forEach((u) => userMap.set(u.id, u));

      const classMap = new Map<ID, Class>();
      rawClasses.forEach((c) => classMap.set(c.id, c));

      const mappedStudents: Array<{ student: Student; user: User; classStr: string }> = [];
      for (const s of rawStudents) {
        const u = userMap.get(s.userId);
        if (u) {
          const cls = s.classId ? classMap.get(s.classId) : undefined;
          const classStr = cls ? `${cls.grade}-${cls.section}` : 'Unassigned';
          mappedStudents.push({ student: s, user: u, classStr });
        }
      }
      setAllStudents(mappedStudents);
    } catch (err) {
      console.error('Failed to load parents:', err);
      showToast({
        type: 'error',
        title: 'Error loading parents',
        message: 'Could not fetch parent records.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [schoolId, showToast]);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) loadData();
    });
    return () => {
      ignore = true;
    };
  }, [loadData]);

  // Derived filtered parents
  const filteredParents = useMemo(() => {
    return parents.filter((p) => {
      // Campus filter
      if (selectedCampus !== 'all') {
        const matchesUser = p.user.campusId === selectedCampus;
        const matchesChild = p.children.some((c) => c.student.campusId === selectedCampus);
        if (!matchesUser && !matchesChild) return false;
      }

      // Family type filter
      if (selectedFamilyType === 'multi' && p.children.length < 2) return false;
      if (selectedFamilyType === 'single' && p.children.length !== 1) return false;
      if (selectedFamilyType === 'none' && p.children.length > 0) return false;

      // Search filter
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase().trim();
        const matchName = p.user.name.toLowerCase().includes(q);
        const matchEmail = p.user.email.toLowerCase().includes(q);
        const matchPhone = Boolean(p.user.phone?.includes(q));
        const matchOcc = Boolean(p.parent.occupation?.toLowerCase().includes(q));
        const matchChild = p.children.some((c) => c.user.name.toLowerCase().includes(q));
        if (!matchName && !matchEmail && !matchPhone && !matchOcc && !matchChild) return false;
      }

      return true;
    });
  }, [parents, selectedCampus, selectedFamilyType, debouncedSearch]);

  // Metrics
  const metrics = useMemo(() => {
    const total = parents.length;
    const multiChild = parents.filter((p) => p.children.length >= 2).length;
    const singleChild = parents.filter((p) => p.children.length === 1).length;
    const totalLinkedStudents = parents.reduce((sum, p) => sum + p.children.length, 0);

    return { total, multiChild, singleChild, totalLinkedStudents };
  }, [parents]);

  // Paginated list
  const totalPages = Math.max(1, Math.ceil(filteredParents.length / PAGE_SIZE));
  const paginatedParents = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredParents.slice(start, start + PAGE_SIZE);
  }, [filteredParents, currentPage]);

  // Handle Add Parent
  const handleAddParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      showToast({
        type: 'error',
        title: 'Validation error',
        message: 'Name and email are required.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const scope: Scope = {
        schoolId,
        campusId: newCampusId ? newCampusId : campuses[0]?.id,
      };

      const enriched = await createParentWithUser(
        {
          name: newName.trim(),
          email: newEmail.trim(),
          phone: newPhone.trim() || undefined,
          occupation: newOccupation.trim() || undefined,
          campusId: newCampusId ? newCampusId : undefined,
        },
        scope
      );

      // Optional initial student link
      if (newStudentIdToLink) {
        await linkStudentParent(
          newStudentIdToLink,
          enriched.parent.id,
          newRelationship,
          true
        );
      }

      showToast({
        type: 'success',
        title: 'Parent created',
        message: `${newName} has been added successfully.`,
      });

      setIsAddModalOpen(false);
      // Reset form
      setNewName('');
      setNewEmail('');
      setNewPhone('');
      setNewOccupation('');
      setNewCampusId('');
      setNewStudentIdToLink('');
      setNewRelationship('father');

      // Reload
      await loadData();
    } catch (err) {
      console.error('Failed to create parent:', err);
      showToast({
        type: 'error',
        title: 'Creation failed',
        message: 'Could not create parent record.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Delete Parent
  const handleDeleteParent = async () => {
    if (!parentToDelete) return;
    try {
      await safeDeleteParent(parentToDelete.parent.id);
      showToast({
        type: 'success',
        title: 'Parent deleted',
        message: `${parentToDelete.user.name}'s record has been removed.`,
      });
      setParentToDelete(null);
      await loadData();
    } catch (err) {
      console.error('Failed to delete parent:', err);
      showToast({
        type: 'error',
        title: 'Deletion failed',
        message: 'Could not delete parent record.',
      });
    }
  };

  // Columns definition
  const columns: TableColumn<EnrichedParent>[] = [
    {
      key: 'name',
      header: 'Parent / Guardian',
      accessor: (p: EnrichedParent) => (
        <div className="flex items-center gap-3">
          <Avatar name={p.user.name} size="sm" />
          <div className="min-w-0">
            <Link
              href={`/admin/parents/${p.parent.id}`}
              className="font-semibold text-ink-900 hover:text-brand-600 truncate block text-sm"
            >
              {p.user.name}
            </Link>
            <span className="text-xs text-ink-500 truncate block">{p.user.email}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Phone / WhatsApp',
      accessor: (p: EnrichedParent) => (
        <div className="text-xs">
          {p.user.phone ? (
            <span className="font-mono text-ink-800 font-medium">{p.user.phone}</span>
          ) : (
            <span className="text-ink-400 italic">No phone</span>
          )}
        </div>
      ),
    },
    {
      key: 'occupation',
      header: 'Occupation',
      accessor: (p: EnrichedParent) => (
        <span className="text-xs text-ink-700">{p.parent.occupation || '—'}</span>
      ),
    },
    {
      key: 'children',
      header: 'Linked Students (Family)',
      accessor: (p: EnrichedParent) => (
        <div className="space-y-1">
          {p.children.length === 0 ? (
            <span className="text-xs text-ink-400 italic">No linked children</span>
          ) : (
            <div className="flex flex-wrap gap-1.5 items-center">
              {p.children.map((c) => (
                <Link
                  key={c.student.id}
                  href={`/admin/students/${c.student.id}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-surface-alt hover:bg-brand-50 hover:text-brand-700 border border-rule transition-colors"
                  title={`View profile for ${c.user.name}`}
                >
                  <span className="text-ink-900 font-semibold">{c.user.name}</span>
                  {c.classInfo && (
                    <span className="text-[11px] text-ink-500">
                      ({c.classInfo.grade}-{c.classInfo.section})
                    </span>
                  )}
                  <span className="text-[10px] text-ink-400 capitalize">
                    · {c.relationship}
                  </span>
                  {c.isPrimary && (
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500" title="Primary Contact" />
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'siblingsBadge',
      header: 'Cohort',
      accessor: (p: EnrichedParent) => {
        if (p.children.length >= 2) {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {p.children.length} Siblings
            </span>
          );
        }
        if (p.children.length === 1) {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-neutral-100 text-ink-600 border border-neutral-200">
              1 Child
            </span>
          );
        }
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
            Unlinked
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      accessor: (p: EnrichedParent) => (
        <div className="flex items-center justify-end gap-2">
          <Link href={`/admin/parents/${p.parent.id}`}>
            <Button variant="ghost" size="sm">
              Manage
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            className="text-danger-600 hover:text-danger-700 hover:bg-danger-50"
            onClick={() => setParentToDelete(p)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Parent & Guardian Records</h1>
          <p className="text-sm text-ink-500 mt-1">
            Manage guardian contact profiles, many-to-many student linkages, and sibling cohorts.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsAddModalOpen(true)}
          leftIcon={<NavIcon name="plus" className="w-4 h-4" />}
        >
          Add Parent Record
        </Button>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Guardians"
          value={metrics.total.toString()}
          subtitle="Registered parents"
        />
        <StatCard
          label="Sibling Families"
          value={metrics.multiChild.toString()}
          subtitle="2+ children enrolled"
        />
        <StatCard
          label="Single Child"
          value={metrics.singleChild.toString()}
          subtitle="1 child enrolled"
        />
        <StatCard
          label="Linked Students"
          value={metrics.totalLinkedStudents.toString()}
          subtitle="Total parent-child bonds"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface p-4 rounded-xl border border-rule shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6">
            <Input
              label="Search Parents"
              placeholder="Search by parent name, phone, email, or child name..."
              value={rawSearch}
              onChange={(e) => setRawSearch(e.target.value)}
            />
          </div>
          <div className="sm:col-span-3">
            <Select
              label="Filter Campus"
              value={selectedCampus}
              onChange={(e) => {
                setSelectedCampus(e.target.value);
                setCurrentPage(1);
              }}
              options={[
                { value: 'all', label: 'All Campuses' },
                ...campuses.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>
          <div className="sm:col-span-3">
            <Select
              label="Family Type"
              value={selectedFamilyType}
              onChange={(e) => {
                setSelectedFamilyType(e.target.value);
                setCurrentPage(1);
              }}
              options={[
                { value: 'all', label: 'All Family Types' },
                { value: 'multi', label: 'Multi-Child (Siblings)' },
                { value: 'single', label: 'Single Child' },
                { value: 'none', label: 'No Children Linked' },
              ]}
            />
          </div>
        </div>

        {/* Results summary */}
        <div className="flex items-center justify-between text-xs text-ink-500 pt-1">
          <span>
            Showing {filteredParents.length} parent records
            {debouncedSearch && ` matching "${debouncedSearch}"`}
          </span>
          {(debouncedSearch || selectedCampus !== 'all' || selectedFamilyType !== 'all') && (
            <button
              onClick={() => {
                setRawSearch('');
                setSelectedCampus('all');
                setSelectedFamilyType('all');
                setCurrentPage(1);
              }}
              className="text-brand-600 hover:text-brand-700 font-medium"
            >
              Reset filters
            </button>
          )}
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-surface rounded-xl border border-rule shadow-xs overflow-hidden">
        <Table<EnrichedParent>
          columns={columns}
          data={paginatedParents}
          keyExtractor={(p) => p.id}
          isLoading={isLoading}
          emptyState={{
            title: 'No parent records found',
            description: 'Try adjusting your search criteria or add a new parent record.',
          }}
        />

        {/* Pagination */}
        {filteredParents.length > PAGE_SIZE && (
          <div className="p-4 border-t border-rule flex items-center justify-between">
            <span className="text-xs text-ink-500">
              Page {currentPage} of {totalPages}
            </span>
            <Pagination
              page={currentPage}
              totalItems={filteredParents.length}
              pageSize={PAGE_SIZE}
              onPageChange={(p) => setCurrentPage(p)}
            />
          </div>
        )}
      </div>

      {/* Add Parent Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => !isSubmitting && setIsAddModalOpen(false)}
        title="Register New Parent / Guardian"
      >
        <form onSubmit={handleAddParent} className="space-y-4">
          <Input
            label="Full Name *"
            placeholder="e.g. Tariq Khan"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Email Address *"
              type="email"
              placeholder="e.g. tariq@example.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
            />
            <Input
              label="Mobile / WhatsApp"
              placeholder="e.g. +92 300 1234567"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Occupation"
              placeholder="e.g. Civil Engineer"
              value={newOccupation}
              onChange={(e) => setNewOccupation(e.target.value)}
            />
            <Select
              label="Campus"
              value={newCampusId}
              onChange={(e) => setNewCampusId(e.target.value)}
              options={[
                { value: '', label: 'Select Primary Campus' },
                ...campuses.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>

          <div className="p-3 bg-surface-alt rounded-lg border border-rule space-y-3">
            <h4 className="text-xs font-bold text-ink-800 uppercase tracking-wider">
              Initial Student Link (Optional)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Select Enrolled Student"
                value={newStudentIdToLink}
                onChange={(e) => setNewStudentIdToLink(e.target.value)}
                options={[
                  { value: '', label: 'Link Later' },
                  ...allStudents.map((s) => ({
                    value: s.student.id,
                    label: `${s.user.name} (${s.classStr})`,
                  })),
                ]}
              />
              <Select
                label="Relationship"
                value={newRelationship}
                onChange={(e) =>
                  setNewRelationship(e.target.value as 'father' | 'mother' | 'guardian')
                }
                options={[
                  { value: 'father', label: 'Father' },
                  { value: 'mother', label: 'Mother' },
                  { value: 'guardian', label: 'Legal Guardian' },
                ]}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-rule">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Parent Record'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(parentToDelete)}
        recordName={parentToDelete ? `${parentToDelete.user.name}'s parent record` : 'Parent Record'}
        actionType="delete"
        title="Delete Parent Record"
        message={`Are you sure you want to delete ${parentToDelete?.user.name}? This will also remove their links to ${parentToDelete?.children.length ?? 0} student(s).`}
        confirmLabel="Delete Record"
        onConfirm={handleDeleteParent}
        onClose={() => setParentToDelete(null)}
      />
    </div>
  );
}
