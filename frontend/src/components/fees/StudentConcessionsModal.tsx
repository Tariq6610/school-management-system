'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Student,
  StudentConcession,
  NewStudentConcession,
  ConcessionType,
  ConcessionDiscountType,
  Scope,
} from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils/currency';
import {
  listStudentConcessions,
  createStudentConcession,
  deleteStudentConcession,
  hasEnrolledSiblings,
} from '@/lib/repositories/studentConcessions';

export interface StudentConcessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  studentName?: string;
  scope: Scope;
  onConcessionsChanged?: () => void;
}

export function StudentConcessionsModal({
  isOpen,
  onClose,
  student,
  studentName = 'Student',
  scope,
  onConcessionsChanged,
}: StudentConcessionsModalProps) {
  const { showToast } = useToast();

  const [concessions, setConcessions] = useState<StudentConcession[]>([]);
  const [hasSiblings, setHasSiblings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  // New Concession Form State
  const [concessionType, setConcessionType] = useState<ConcessionType>('scholarship');
  const [discountType, setDiscountType] = useState<ConcessionDiscountType>('percentage');
  const [discountValue, setDiscountValue] = useState<string>('25');
  const [concessionName, setConcessionName] = useState<string>('Merit Scholarship (25%)');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [list, siblingsFound] = await Promise.all([
        listStudentConcessions(scope, { studentId: student.id }),
        hasEnrolledSiblings(scope.schoolId, student.id),
      ]);
      setConcessions(list);
      setHasSiblings(siblingsFound);
    } catch (err: unknown) {
      console.error('Error loading student concessions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [scope, student.id]);

  useEffect(() => {
    let ignore = false;
    if (isOpen) {
      Promise.resolve().then(() => {
        if (!ignore) {
          loadData();
        }
      });
    }
    return () => {
      ignore = true;
    };
  }, [isOpen, loadData]);

  const handleTypeChange = (type: ConcessionType) => {
    setConcessionType(type);
    if (type === 'sibling') {
      setDiscountType('percentage');
      setDiscountValue('15');
      setConcessionName('Sibling Concession (15%)');
    } else if (type === 'scholarship') {
      setDiscountType('percentage');
      setDiscountValue('25');
      setConcessionName('Merit Scholarship (25%)');
    } else if (type === 'staff_child') {
      setDiscountType('percentage');
      setDiscountValue('50');
      setConcessionName('Staff Child Concession (50%)');
    } else if (type === 'special') {
      setDiscountType('fixed');
      setDiscountValue('5000');
      setConcessionName('Need-based Financial Aid');
    } else {
      setDiscountType('fixed');
      setDiscountValue('2000');
      setConcessionName('Special Concession');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(discountValue) || 0;
    if (val <= 0) {
      showToast({ type: 'error', title: 'Validation Error', message: 'Value must be greater than zero' });
      return;
    }
    if (discountType === 'percentage' && val > 100) {
      showToast({ type: 'error', title: 'Validation Error', message: 'Percentage cannot exceed 100%' });
      return;
    }

    try {
      setIsSubmitting(true);
      const newRecord: NewStudentConcession = {
        schoolId: scope.schoolId,
        studentId: student.id,
        type: concessionType,
        name: concessionName.trim() || `${concessionType} concession`,
        discountType,
        discountValue: val,
        reason: reason.trim() || undefined,
        startDate: new Date().toISOString().split('T')[0],
        isActive: true,
      };

      await createStudentConcession(newRecord);
      showToast({
        type: 'success',
        title: 'Concession Added',
        message: `${newRecord.name} profile successfully created for ${studentName}`,
      });
      setIsAdding(false);
      await loadData();
      onConcessionsChanged?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create concession';
      showToast({ type: 'error', title: 'Error', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (concessionId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove "${name}"?`)) return;
    try {
      await deleteStudentConcession(concessionId);
      showToast({ type: 'info', title: 'Concession Removed', message: `${name} has been removed` });
      await loadData();
      onConcessionsChanged?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete concession';
      showToast({ type: 'error', title: 'Error', message: msg });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Student Concessions & Scholarships"
      description={`Manage recurring fee concession profiles for ${studentName} (${student.admissionNumber}).`}
      size="lg"
    >
      <div className="space-y-5">
        {/* Sibling detection alert banner */}
        {hasSiblings && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 rounded-lg flex items-center justify-between text-sm text-blue-800 dark:text-blue-200">
            <div>
              <span className="font-semibold">Sibling Relationship Detected:</span> This student has enrolled
              siblings sharing guardian records. Institutional 15% sibling concession applies automatically to tuition.
            </div>
            <StatusBadge status="paid" label="Sibling Link Active" />
          </div>
        )}

        {/* Existing Concessions List */}
        <div>
          <div className="flex justify-between items-center mb-2.5">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Assigned Concession Profiles ({concessions.length})
            </h4>
            {!isAdding && (
              <Button variant="secondary" size="sm" onClick={() => setIsAdding(true)}>
                + Assign New Concession
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-sm text-slate-500">Loading concession profiles...</div>
          ) : concessions.length === 0 ? (
            <div className="p-6 text-center rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
              No specific scholarship or concession assigned.
              {hasSiblings && ' (Automatic sibling discount will still apply on billing generation).'}
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              {concessions.map((cnc) => (
                <div key={cnc.id} className="p-3.5 flex items-center justify-between bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                        {cnc.name}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        {cnc.discountType === 'percentage' ? `${cnc.discountValue}% Off` : `-${formatCurrency(cnc.discountValue)}`}
                      </span>
                      {cnc.isActive ? (
                        <StatusBadge status="paid" label="Active" />
                      ) : (
                        <StatusBadge status="overdue" label="Inactive" />
                      )}
                    </div>
                    {cnc.reason && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Ref / Reason: {cnc.reason}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    onClick={() => handleDelete(cnc.id, cnc.name)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Concession Form */}
        {isAdding && (
          <form onSubmit={handleCreate} className="p-4 bg-slate-50 dark:bg-slate-800/70 rounded-lg border border-slate-200 dark:border-slate-700 space-y-3.5">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Assign New Concession Profile
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Select
                  label="Concession Type"
                  value={concessionType}
                  onChange={(e) => handleTypeChange(e.target.value as ConcessionType)}
                  options={[
                    { value: 'scholarship', label: 'Scholarship (Merit / Academic)' },
                    { value: 'sibling', label: 'Sibling Concession' },
                    { value: 'staff_child', label: 'Staff Child Concession' },
                    { value: 'special', label: 'Special Financial Aid' },
                    { value: 'other', label: 'Other Concession' },
                  ]}
                />
              </div>

              <div>
                <Select
                  label="Deduction Format"
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as ConcessionDiscountType)}
                  options={[
                    { value: 'percentage', label: 'Percentage (%)' },
                    { value: 'fixed', label: 'Fixed Amount (PKR)' },
                  ]}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input
                  label={`Discount Value ${discountType === 'percentage' ? '(%)' : '(PKR)'}`}
                  type="number"
                  min="1"
                  max={discountType === 'percentage' ? '100' : '50000'}
                  step="any"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  required
                />
              </div>

              <div>
                <Input
                  label="Profile Name / Line Item Label"
                  type="text"
                  value={concessionName}
                  onChange={(e) => setConcessionName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Input
                label="Approval Notes / Reason"
                type="text"
                placeholder="e.g. Merit award approved by Board of Governors"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsAdding(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Profile'}
              </Button>
            </div>
          </form>
        )}

        {/* Modal Close CTA */}
        <div className="flex justify-end pt-3 border-t border-slate-200 dark:border-slate-700">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
