'use client';

import React, { useState, useEffect, useId } from 'react';
import {
  Campus,
  Class,
  FeeFrequency,
  FeeStructure,
  ID,
  NewFeeStructure,
  Scope,
} from '@/types';
import { createFeeStructure, updateFeeStructure } from '@/lib/repositories/feeStructures';
import { listCampuses } from '@/lib/repositories/campuses';
import { listClasses } from '@/lib/repositories/classes';
import { formatCurrency } from '@/lib/utils/currency';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

export interface FeeStructureFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (saved: FeeStructure) => void;
  editingStructure?: FeeStructure | null;
  initialCampusId?: ID;
}

export function FeeStructureForm({
  isOpen,
  onClose,
  onSuccess,
  editingStructure,
  initialCampusId,
}: FeeStructureFormProps) {
  const { session } = useSession();
  const { showToast } = useToast();
  const schoolId = session?.schoolId ?? 'sch_main';

  // Form states initialized directly from props
  const [name, setName] = useState<string>(editingStructure?.name ?? '');
  const [amount, setAmount] = useState<string>(editingStructure ? String(editingStructure.amount) : '');
  const [frequency, setFrequency] = useState<FeeFrequency>(editingStructure?.frequency ?? 'monthly');
  const [campusId, setCampusId] = useState<string>(editingStructure?.campusId ?? initialCampusId ?? '');
  const [selectedClassIds, setSelectedClassIds] = useState<ID[]>(editingStructure?.appliesToClassIds ?? []);
  const academicYearId = editingStructure?.academicYearId ?? 'ay_2026';

  // Lookup data
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const generatedId = useId();

  // Load campuses and classes on mount/scope change
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const scope: Scope = { schoolId };
        const [allCampuses, allClasses] = await Promise.all([
          listCampuses(scope),
          listClasses(scope),
        ]);
        if (isMounted) {
          setCampuses(allCampuses);
          setClasses(allClasses);
        }
      } catch (err) {
        console.error('Failed to load campuses and classes for fee structure form:', err);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [schoolId]);

  // Available classes filtered by selected campus
  const filteredClasses = React.useMemo(() => {
    if (!campusId) return classes;
    return classes.filter((c) => c.campusId === campusId);
  }, [classes, campusId]);

  // Handle Select All / Clear All classes
  const handleSelectAllClasses = () => {
    const ids = filteredClasses.map((c) => c.id);
    setSelectedClassIds(ids);
    if (errors.classes) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy.classes;
        return copy;
      });
    }
  };

  const handleClearAllClasses = () => {
    setSelectedClassIds([]);
  };

  const handleToggleClass = (classId: ID) => {
    setSelectedClassIds((prev) => {
      const next = prev.includes(classId)
        ? prev.filter((id) => id !== classId)
        : [...prev, classId];
      if (next.length > 0 && errors.classes) {
        setErrors((errs) => {
          const copy = { ...errs };
          delete copy.classes;
          return copy;
        });
      }
      return next;
    });
  };

  // Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Fee structure name is required.';
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      newErrors.amount = 'Please enter a valid amount greater than 0.';
    }

    if (selectedClassIds.length === 0) {
      newErrors.classes = 'Please select at least one class for this fee structure.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingStructure) {
        const updated = await updateFeeStructure(editingStructure.id, {
          name: name.trim(),
          amount: parsedAmount,
          frequency,
          campusId: campusId || undefined,
          appliesToClassIds: selectedClassIds,
          academicYearId,
        });
        showToast({
          type: 'success',
          title: 'Fee Structure Updated',
          message: `Successfully updated ${updated.name}.`,
        });
        onSuccess(updated);
      } else {
        const input: NewFeeStructure = {
          schoolId,
          campusId: campusId || undefined,
          academicYearId,
          name: name.trim(),
          amount: parsedAmount,
          frequency,
          appliesToClassIds: selectedClassIds,
        };
        const created = await createFeeStructure(input);
        showToast({
          type: 'success',
          title: 'Fee Structure Created',
          message: `Created ${created.name} (${formatCurrency(created.amount)}).`,
        });
        onSuccess(created);
      }
      onClose();
    } catch (err) {
      console.error('Failed to save fee structure:', err);
      showToast({
        type: 'error',
        title: 'Save Failed',
        message: 'Could not save fee structure.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const parsedAmount = parseFloat(amount);
  const formattedPreview = !isNaN(parsedAmount) && parsedAmount > 0
    ? formatCurrency(parsedAmount)
    : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingStructure ? 'Edit Fee Structure' : 'Create Fee Structure'}
      description="Define tuition, admission, transport, or exam fee rates and assign them to classes."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            disabled={isSubmitting}
          >
            {editingStructure ? 'Save Changes' : 'Create Structure'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name and Amount Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Input
              label="Structure Name *"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) {
                  setErrors((prev) => {
                    const copy = { ...prev };
                    delete copy.name;
                    return copy;
                  });
                }
              }}
              placeholder="e.g. Senior Tuition Fee, Transport North"
              error={errors.name}
              required
            />
          </div>

          <div>
            <Input
              label="Amount (PKR) *"
              type="number"
              min="1"
              step="50"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (errors.amount) {
                  setErrors((prev) => {
                    const copy = { ...prev };
                    delete copy.amount;
                    return copy;
                  });
                }
              }}
              placeholder="e.g. 15000"
              error={errors.amount}
              hint={formattedPreview ? `Standard rate: ${formattedPreview}` : undefined}
              required
            />
          </div>
        </div>

        {/* Frequency and Campus Scope Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Select
              label="Billing Frequency *"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as FeeFrequency)}
              options={[
                { value: 'monthly', label: 'Monthly (12 billing cycles / yr)' },
                { value: 'term', label: 'Per Term (3 billing cycles / yr)' },
                { value: 'annual', label: 'Annual / One-Time (1 billing cycle / yr)' },
              ]}
            />
          </div>

          <div>
            <Select
              label="Campus Scope (Optional)"
              value={campusId}
              onChange={(e) => {
                const newCId = e.target.value;
                setCampusId(newCId);
                // Filter selected classes if they don't belong to the newly chosen campus
                if (newCId) {
                  setSelectedClassIds((prev) =>
                    prev.filter((cId) => {
                      const found = classes.find((c) => c.id === cId);
                      return found?.campusId === newCId;
                    })
                  );
                }
              }}
              options={[
                { value: '', label: '🌐 All Campuses (School-Wide Structure)' },
                ...campuses.map((cmp) => ({
                  value: cmp.id,
                  label: `🏫 ${cmp.name}`,
                })),
              ]}
              hint={campusId ? 'Applies only to students enrolled in this campus' : 'Applies to any matching class across the school network'}
            />
          </div>
        </div>

        {/* Class Multi-Select Checkboxes */}
        <div className="space-y-2 pt-1 border-t border-neutral-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <label
                id={`classes-label-${generatedId}`}
                className="text-xs font-bold text-neutral-800"
              >
                Applies to Classes *
              </label>
              <p className="text-[11px] text-neutral-500">
                Select which grade levels and sections are billed this fee ({selectedClassIds.length} of {filteredClasses.length} selected).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSelectAllClasses}
                className="text-xs font-semibold text-purple-700 hover:text-purple-900 transition-colors"
              >
                Select All
              </button>
              <span className="text-neutral-300">·</span>
              <button
                type="button"
                onClick={handleClearAllClasses}
                className="text-xs font-semibold text-neutral-500 hover:text-neutral-800 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {errors.classes && (
            <p className="text-xs font-medium text-rose-600">{errors.classes}</p>
          )}

          {/* Classes Checkbox Grid */}
          <div
            role="group"
            aria-labelledby={`classes-label-${generatedId}`}
            className="max-h-48 overflow-y-auto p-2.5 rounded-xl border border-neutral-200 bg-neutral-50/50 grid grid-cols-2 sm:grid-cols-3 gap-2"
          >
            {filteredClasses.length === 0 ? (
              <p className="col-span-full py-4 text-center text-xs text-neutral-400">
                No classes found for the selected campus.
              </p>
            ) : (
              filteredClasses.map((cls) => {
                const isChecked = selectedClassIds.includes(cls.id);
                return (
                  <label
                    key={cls.id}
                    className={`flex items-center gap-2.5 p-2 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-purple-50/70 border-purple-300 text-purple-950 shadow-2xs'
                        : 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleClass(cls.id)}
                      className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4"
                    />
                    <div className="truncate">
                      <span>Grade {cls.grade}-{cls.section}</span>
                      {!campusId && cls.campusId && (
                        <span className="block text-[10px] font-normal text-neutral-400 truncate">
                          {campuses.find((cmp) => cmp.id === cls.campusId)?.name ?? 'Main'}
                        </span>
                      )}
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>
      </form>
    </Modal>
  );
}
