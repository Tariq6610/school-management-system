'use client';

import React, { useState } from 'react';
import { AddInvoiceConcessionInput, ConcessionDiscountType, ConcessionType, FeeInvoice } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils/currency';
import { applyInvoiceConcession } from '@/lib/repositories/feeInvoices';

export interface ApplyConcessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: FeeInvoice;
  onConcessionApplied: (updatedInvoice: FeeInvoice) => void;
}

const CONCESSION_PRESETS: Record<
  ConcessionType,
  { defaultName: string; discountType: ConcessionDiscountType; defaultValue: number }
> = {
  sibling: {
    defaultName: 'Sibling Concession (15%)',
    discountType: 'percentage',
    defaultValue: 15,
  },
  scholarship: {
    defaultName: 'Merit Scholarship (25%)',
    discountType: 'percentage',
    defaultValue: 25,
  },
  staff_child: {
    defaultName: 'Staff Child Concession (50%)',
    discountType: 'percentage',
    defaultValue: 50,
  },
  special: {
    defaultName: 'Need-based Financial Aid',
    discountType: 'fixed',
    defaultValue: 5000,
  },
  other: {
    defaultName: 'Special Concession',
    discountType: 'fixed',
    defaultValue: 2000,
  },
};

export function ApplyConcessionModal({
  isOpen,
  onClose,
  invoice,
  onConcessionApplied,
}: ApplyConcessionModalProps) {
  const { showToast } = useToast();

  const [concessionType, setConcessionType] = useState<ConcessionType>('scholarship');
  const [discountType, setDiscountType] = useState<ConcessionDiscountType>('percentage');
  const [discountValue, setDiscountValue] = useState<string>('25');
  const [customName, setCustomName] = useState<string>('Merit Scholarship (25%)');
  const [reason, setReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleTypeChange = (type: ConcessionType) => {
    setConcessionType(type);
    const preset = CONCESSION_PRESETS[type];
    setDiscountType(preset.discountType);
    setDiscountValue(String(preset.defaultValue));
    setCustomName(preset.defaultName);
  };

  const handlePresetSelect = (pct: number) => {
    setDiscountType('percentage');
    setDiscountValue(String(pct));
    if (concessionType === 'scholarship') {
      setCustomName(`Merit Scholarship (${pct}%)`);
    } else if (concessionType === 'sibling') {
      setCustomName(`Sibling Concession (${pct}%)`);
    } else if (concessionType === 'staff_child') {
      setCustomName(`Staff Child Concession (${pct}%)`);
    }
  };

  // Calculations
  const numValue = parseFloat(discountValue) || 0;
  const currentGross = invoice.totalAmount;
  const currentDiscounts = invoice.discountAmount;
  const currentRemainingGross = Math.max(0, currentGross - currentDiscounts);

  let newDeduction = 0;
  if (discountType === 'percentage') {
    newDeduction = Math.round((currentGross * Math.min(100, numValue)) / 100);
  } else {
    newDeduction = Math.min(currentRemainingGross, numValue);
  }

  const projectedTotalDiscounts = currentDiscounts + newDeduction;
  const projectedNetDue = Math.max(0, currentGross - projectedTotalDiscounts);
  const projectedBalance = Math.max(0, projectedNetDue - invoice.paidAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (numValue <= 0) {
      setErrorMsg('Discount value must be greater than zero');
      return;
    }

    if (discountType === 'percentage' && numValue > 100) {
      setErrorMsg('Percentage concession cannot exceed 100%');
      return;
    }

    if (newDeduction <= 0) {
      setErrorMsg('Deduction amount must be greater than zero');
      return;
    }

    try {
      setIsSubmitting(true);
      const input: AddInvoiceConcessionInput = {
        type: concessionType,
        name: customName.trim() || `${concessionType} concession`,
        discountType,
        discountValue: numValue,
        reason: reason.trim() || undefined,
      };

      const updated = await applyInvoiceConcession(invoice.id, input);
      showToast({
        type: 'success',
        title: 'Concession Applied',
        message: `${input.name} (-${formatCurrency(newDeduction)}) added as explicit line item`,
      });
      onConcessionApplied(updated);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to apply concession';
      setErrorMsg(msg);
      showToast({
        type: 'error',
        title: 'Application Error',
        message: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Apply Discount or Concession"
      description={`Add an explicit line item concession to invoice ${invoice.invoiceNumber}. Discounts are never silent.`}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="p-3 text-sm text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300 rounded-md border border-rose-200 dark:border-rose-900/50">
            {errorMsg}
          </div>
        )}

        {/* Concession Type */}
        <div>
          <Select
            label="Concession Category"
            value={concessionType}
            onChange={(e) => handleTypeChange(e.target.value as ConcessionType)}
            options={[
              { value: 'scholarship', label: 'Scholarship (Academic / Merit / Need)' },
              { value: 'sibling', label: 'Sibling Concession' },
              { value: 'staff_child', label: 'Staff Child Concession' },
              { value: 'special', label: 'Special Financial Relief' },
              { value: 'other', label: 'Custom Concession' },
            ]}
          />
        </div>

        {/* Quick percentage shortcuts */}
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
            Quick Percentage Presets
          </label>
          <div className="flex flex-wrap gap-2">
            {[10, 15, 20, 25, 50, 100].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => handlePresetSelect(pct)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors border ${
                  discountType === 'percentage' && numValue === pct
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                }`}
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        {/* Calculation Mode & Value */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Select
              label="Deduction Type"
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as ConcessionDiscountType)}
              options={[
                { value: 'percentage', label: 'Percentage (%)' },
                { value: 'fixed', label: 'Fixed Amount (PKR)' },
              ]}
            />
          </div>
          <div>
            <Input
              label={`Value ${discountType === 'percentage' ? '(%)' : '(PKR)'}`}
              type="number"
              min="1"
              max={discountType === 'percentage' ? '100' : currentRemainingGross}
              step="any"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Item Label / Name */}
        <div>
          <Input
            label="Line Item Descriptor (Visible on Invoice & Receipt)"
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="e.g. Merit Scholarship (25%)"
            required
          />
        </div>

        {/* Reason / Reference */}
        <div>
          <Input
            label="Approval Reference / Reason (Optional)"
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Approved by Principal; Ref #SCH-2026-04"
          />
        </div>

        {/* Live Calculation Summary Banner */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2 text-sm">
          <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
            <span>Gross Tuition:</span>
            <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {formatCurrency(currentGross)}
            </span>
          </div>
          {currentDiscounts > 0 && (
            <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
              <span>Existing Concessions:</span>
              <span className="font-semibold tabular-nums">-{formatCurrency(currentDiscounts)}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-emerald-700 dark:text-emerald-300 font-medium pt-1 border-t border-slate-200 dark:border-slate-700">
            <span>New Concession Item:</span>
            <span className="font-bold tabular-nums">-{formatCurrency(newDeduction)}</span>
          </div>
          <div className="flex justify-between items-center text-slate-900 dark:text-slate-100 font-bold pt-1 border-t border-slate-200 dark:border-slate-700">
            <span>Revised Net Due:</span>
            <span className="tabular-nums">{formatCurrency(projectedNetDue)}</span>
          </div>
          <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
            <span>Revised Remaining Balance:</span>
            <span className="font-semibold tabular-nums text-amber-600 dark:text-amber-400">
              {formatCurrency(projectedBalance)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting || newDeduction <= 0}>
            {isSubmitting ? 'Applying Concession...' : 'Apply Concession Line Item'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
