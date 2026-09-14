'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Campus,
  Class,
  FeeStructure,
  ID,
  Scope,
} from '@/types';
import {
  canDeleteFeeStructure,
  deleteFeeStructure,
  listFeeStructures,
} from '@/lib/repositories/feeStructures';
import { listCampuses } from '@/lib/repositories/campuses';
import { listClasses } from '@/lib/repositories/classes';
import { formatCurrency } from '@/lib/utils/currency';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/ui/Toast';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { FeeStructureForm } from './FeeStructureForm';
import { FeeStructuresTable } from './FeeStructuresTable';
import { NavIcon } from '@/components/shell/NavIcon';

export interface FeeStructuresViewProps {
  initialCampusId?: ID;
  initialStructures?: FeeStructure[];
  initialCampuses?: Campus[];
  initialClasses?: Class[];
}

export function FeeStructuresView({
  initialCampusId,
  initialStructures,
  initialCampuses,
  initialClasses,
}: FeeStructuresViewProps) {
  const { session } = useSession();
  const { showToast } = useToast();
  const schoolId = session?.schoolId ?? 'sch_main';

  // Data states
  const [structures, setStructures] = useState<FeeStructure[]>(initialStructures || []);
  const [campuses, setCampuses] = useState<Campus[]>(initialCampuses || []);
  const [classes, setClasses] = useState<Class[]>(initialClasses || []);
  const [isLoading, setIsLoading] = useState<boolean>(!initialStructures);

  // Filter states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCampusFilter, setSelectedCampusFilter] = useState<string>(
    initialCampusId || session?.campusId || ''
  );
  const [selectedFrequencyFilter, setSelectedFrequencyFilter] = useState<string>('');

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(null);

  // Delete dialog states
  const [structureToDelete, setStructureToDelete] = useState<FeeStructure | null>(null);
  const [deleteWarning, setDeleteWarning] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Load all lookups and structures
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const scope: Scope = { schoolId };
      const [allStructures, allCampuses, allClasses] = await Promise.all([
        listFeeStructures(scope),
        listCampuses(scope),
        listClasses(scope),
      ]);
      setStructures(allStructures);
      setCampuses(allCampuses);
      setClasses(allClasses);
    } catch (err) {
      console.error('Failed to load fee structures view data:', err);
      showToast({
        type: 'error',
        title: 'Error loading fee structures',
        message: 'Could not retrieve data from repository.',
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

  // Filter structures in memory for instant feedback
  const filteredStructures = useMemo(() => {
    return structures.filter((fs) => {
      // Campus filter: matches if structure is school-wide (no campusId) or matches selected campus
      if (selectedCampusFilter) {
        if (fs.campusId && fs.campusId !== selectedCampusFilter) {
          return false;
        }
      }

      // Frequency filter
      if (selectedFrequencyFilter && fs.frequency !== selectedFrequencyFilter) {
        return false;
      }

      // Search query (name or ID)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = fs.name.toLowerCase().includes(q);
        const matchId = fs.id.toLowerCase().includes(q);
        if (!matchName && !matchId) return false;
      }

      return true;
    });
  }, [structures, selectedCampusFilter, selectedFrequencyFilter, searchQuery]);

  // Summary Metrics calculations
  const { totalStructures, uniqueClassesCovered, avgMonthlyAmount, totalAnnualizedAmount } =
    useMemo(() => {
      const total = structures.length;
      const classIdSet = new Set<ID>();
      let monthlySum = 0;
      let monthlyCount = 0;
      let annualizedSum = 0;

      for (const fs of structures) {
        for (const cId of fs.appliesToClassIds) {
          classIdSet.add(cId);
        }

        if (fs.frequency === 'monthly') {
          monthlySum += fs.amount;
          monthlyCount++;
          annualizedSum += fs.amount * 12;
        } else if (fs.frequency === 'term') {
          annualizedSum += fs.amount * 3;
        } else if (fs.frequency === 'annual') {
          annualizedSum += fs.amount;
        }
      }

      const avgMonthly = monthlyCount > 0 ? Math.round(monthlySum / monthlyCount) : 0;

      return {
        totalStructures: total,
        uniqueClassesCovered: classIdSet.size,
        avgMonthlyAmount: avgMonthly,
        totalAnnualizedAmount: annualizedSum,
      };
    }, [structures]);

  // Handlers
  const handleOpenCreate = () => {
    setEditingStructure(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (structure: FeeStructure) => {
    setEditingStructure(structure);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    loadData();
  };

  const handlePromptDelete = async (structure: FeeStructure) => {
    setStructureToDelete(structure);
    const check = await canDeleteFeeStructure(structure.id);
    if (!check.canDelete) {
      setDeleteWarning(check.reason || 'Existing invoices reference this fee structure.');
    } else {
      setDeleteWarning(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!structureToDelete) return;
    setIsDeleting(true);
    try {
      await deleteFeeStructure(structureToDelete.id);
      showToast({
        type: 'success',
        title: 'Fee Structure Deleted',
        message: `Permanently removed ${structureToDelete.name}.`,
      });
      setStructureToDelete(null);
      setDeleteWarning(null);
      loadData();
    } catch (err) {
      console.error('Failed to delete fee structure:', err);
      showToast({
        type: 'error',
        title: 'Deletion Failed',
        message: 'Could not delete fee structure.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-white border border-neutral-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-black text-neutral-900 tracking-tight">
              Fee Structures
            </h1>
            <span className="rounded-full bg-purple-100 text-purple-800 text-xs font-black px-2.5 py-0.5 border border-purple-200">
              M5 Fees
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Configure tuition, transport, examination, and admission billing rates per class and campus.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={handleOpenCreate}
          className="font-bold self-start sm:self-auto"
          leftIcon={<NavIcon name="plus" className="w-4 h-4" />}
        >
          Create Fee Structure
        </Button>
      </div>

      {/* 2. Top Summary KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Total Structures"
          value={isLoading ? '...' : totalStructures}
          subtitle="Configured billing rates"
        />
        <StatCard
          label="Classes Covered"
          value={isLoading ? '...' : `${uniqueClassesCovered} / ${classes.length}`}
          subtitle="Classes with active fees"
        />
        <StatCard
          label="Avg Monthly Fee"
          value={isLoading ? '...' : formatCurrency(avgMonthlyAmount)}
          subtitle="Across monthly plans"
        />
        <StatCard
          label="Annual Billing Baseline"
          value={isLoading ? '...' : formatCurrency(totalAnnualizedAmount)}
          subtitle="Combined structure rates"
        />
      </div>

      {/* 3. Filter Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-neutral-200 bg-neutral-50/80 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
          {/* Search Box */}
          <div className="w-full sm:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search fee structures by name..."
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-800 placeholder-neutral-400 focus:border-purple-500 focus:outline-hidden shadow-2xs"
            />
          </div>

          {/* Campus Filter */}
          <div className="w-full sm:w-48">
            <select
              value={selectedCampusFilter}
              onChange={(e) => setSelectedCampusFilter(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-800 focus:border-purple-500 focus:outline-hidden shadow-2xs"
            >
              <option value="">All Campuses</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Frequency Filter */}
          <div className="w-full sm:w-44">
            <select
              value={selectedFrequencyFilter}
              onChange={(e) => setSelectedFrequencyFilter(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-800 focus:border-purple-500 focus:outline-hidden shadow-2xs"
            >
              <option value="">All Frequencies</option>
              <option value="monthly">Monthly</option>
              <option value="term">Per Term</option>
              <option value="annual">Annual / One-time</option>
            </select>
          </div>
        </div>

        {(searchQuery || selectedCampusFilter || selectedFrequencyFilter) && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCampusFilter('');
              setSelectedFrequencyFilter('');
            }}
            className="text-xs font-semibold text-purple-700 hover:text-purple-900 self-start sm:self-auto"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* 4. Table Roster */}
      <FeeStructuresTable
        structures={filteredStructures}
        campuses={campuses}
        classes={classes}
        onEdit={handleOpenEdit}
        onDelete={handlePromptDelete}
        isLoading={isLoading}
      />

      {/* 5. Create / Edit Form Modal */}
      {isFormOpen && (
        <FeeStructureForm
          key={editingStructure ? `edit-${editingStructure.id}` : 'new-form'}
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSuccess={handleFormSuccess}
          editingStructure={editingStructure}
          initialCampusId={selectedCampusFilter || undefined}
        />
      )}

      {/* 6. Delete Confirmation Dialog */}
      {structureToDelete && (
        <ConfirmDialog
          isOpen={Boolean(structureToDelete)}
          onClose={() => {
            setStructureToDelete(null);
            setDeleteWarning(null);
          }}
          onConfirm={handleConfirmDelete}
          recordName={structureToDelete.name}
          actionType="delete"
          title={`Delete ${structureToDelete.name}?`}
          message={
            deleteWarning
              ? `${deleteWarning} Are you sure you want to proceed? This will permanently delete the structure.`
              : `Are you sure you want to delete ${structureToDelete.name} (${formatCurrency(structureToDelete.amount)})? This action cannot be undone.`
          }
          confirmLabel={isDeleting ? 'Deleting...' : 'Delete Fee Structure'}
          isLoading={isDeleting}
        />
      )}
    </div>
  );
}
