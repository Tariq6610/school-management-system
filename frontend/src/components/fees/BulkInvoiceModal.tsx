'use client';

import React, { useState } from 'react';
import {
  BulkInvoiceParams,
  BulkInvoicePreview,
  Campus,
  Class,
  FeeStructure,
  ID,
} from '@/types';
import {
  generateBulkInvoices,
  previewBulkInvoiceGeneration,
} from '@/lib/repositories/feeInvoices';
import { formatCurrency } from '@/lib/utils/currency';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { NavIcon } from '@/components/shell/NavIcon';

export interface BulkInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (count: number, total: number) => void;
  campuses: Campus[];
  classes: Class[];
  feeStructures: FeeStructure[];
  initialCampusId?: ID;
}

export function BulkInvoiceModal({
  isOpen,
  onClose,
  onSuccess,
  campuses,
  classes,
  feeStructures,
  initialCampusId,
}: BulkInvoiceModalProps) {
  const { session } = useSession();
  const { showToast } = useToast();
  const schoolId = session?.schoolId ?? 'sch_main';

  // Step state: 1 = Configure, 2 = Preview
  const [step, setStep] = useState<1 | 2>(1);

  // Form states
  const now = new Date();
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const defaultYearMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const defaultDueDate = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-10`;

  const [billingMonth, setBillingMonth] = useState<string>(defaultYearMonth);
  const [dueDate, setDueDate] = useState<string>(defaultDueDate);
  const [selectedCampusId, setSelectedCampusId] = useState<string>(initialCampusId || '');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedStructureIds, setSelectedStructureIds] = useState<ID[]>(() =>
    feeStructures.map((s) => s.id)
  );

  // Preview data state
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [preview, setPreview] = useState<BulkInvoicePreview | null>(null);
  const [previewSearch, setPreviewSearch] = useState('');
  const [previewFilter, setPreviewFilter] = useState<'all' | 'new' | 'duplicate'>('all');

  // Generation state
  const [generating, setGenerating] = useState(false);

  // When billing month changes, update default due date to 10th of that month
  const handleBillingMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = e.target.value;
    setBillingMonth(newMonth);
    setDueDate(`${newMonth}-10`);
  };

  const handleToggleStructure = (id: ID) => {
    setSelectedStructureIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllStructures = () => {
    setSelectedStructureIds(feeStructures.map((s) => s.id));
  };

  const handleClearAllStructures = () => {
    setSelectedStructureIds([]);
  };

  // Run preview
  const handleRunPreview = async () => {
    if (!billingMonth || !dueDate) {
      showToast({
        type: 'error',
        title: 'Missing parameters',
        message: 'Please select both a billing month and due date',
      });
      return;
    }

    if (selectedStructureIds.length === 0) {
      showToast({
        type: 'error',
        title: 'No structures selected',
        message: 'Please select at least one fee structure to generate invoices for',
      });
      return;
    }

    setLoadingPreview(true);
    try {
      const params: BulkInvoiceParams = {
        billingMonth,
        dueDate,
        campusId: selectedCampusId || undefined,
        classId: selectedClassId || undefined,
        feeStructureIds: selectedStructureIds,
      };

      const result = await previewBulkInvoiceGeneration({ schoolId }, params);
      setPreview(result);
      setStep(2);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Preview error',
        message: err instanceof Error ? err.message : 'Failed to generate preview. Please try again.',
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  // Confirm generation
  const handleConfirmGenerate = async () => {
    if (!preview || preview.newInvoicesCount === 0) return;

    setGenerating(true);
    try {
      const params: BulkInvoiceParams = {
        billingMonth,
        dueDate,
        campusId: selectedCampusId || undefined,
        classId: selectedClassId || undefined,
        feeStructureIds: selectedStructureIds,
      };

      const result = await generateBulkInvoices({ schoolId }, params);
      showToast({
        type: 'success',
        title: 'Invoices generated',
        message: `Successfully generated ${result.createdCount} new invoices totaling ${formatCurrency(result.totalAmount)}!`,
      });
      onSuccess(result.createdCount, result.totalAmount);
      onClose();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Generation failed',
        message: err instanceof Error ? err.message : 'Error generating invoices. Please try again.',
      });
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  // Filter preview items
  const filteredPreviewItems = preview?.items.filter((item) => {
    if (previewFilter === 'new' && item.isDuplicate) return false;
    if (previewFilter === 'duplicate' && !item.isDuplicate) return false;
    if (previewSearch.trim()) {
      const q = previewSearch.toLowerCase();
      const matchName = item.studentName.toLowerCase().includes(q);
      const matchAdm = item.admissionNumber.toLowerCase().includes(q);
      const matchClass = item.className.toLowerCase().includes(q);
      const matchStructure = item.feeStructureName.toLowerCase().includes(q);
      return matchName || matchAdm || matchClass || matchStructure;
    }
    return true;
  }) ?? [];

  // Options for billing months (past 2 months, current, and next 3 months)
  const monthOptions: { value: string; label: string }[] = [];
  for (let i = -2; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    monthOptions.push({ value: val, label: i === 0 ? `${label} (Current Month)` : label });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="relative w-full max-w-4xl rounded-2xl bg-white shadow-2xl border border-neutral-200 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 bg-neutral-50/70">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700 font-bold text-lg">
              <NavIcon name="sparkles" className="w-5 h-5" />
            </div>
            <div>
              <h2 id="modal-title" className="text-lg font-bold text-neutral-900">
                Bulk Invoice Generation
              </h2>
              <p className="text-xs text-neutral-500">
                {step === 1
                  ? 'Step 1 of 2: Configure billing parameters and scope'
                  : `Step 2 of 2: Review preview and duplicate checks for ${preview?.billingMonthLabel}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
            aria-label="Close"
          >
            <NavIcon name="x" className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 max-h-[72vh] overflow-y-auto">
          {step === 1 ? (
            /* STEP 1: CONFIGURE */
            <div className="space-y-6">
              {/* Billing Period & Due Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-neutral-50 border border-neutral-200">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Target Billing Month <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={billingMonth}
                    onChange={handleBillingMonthChange}
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 focus:border-purple-500 focus:outline-hidden"
                  >
                    {monthOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-2xs text-neutral-500">
                    Invoices will be marked for this billing cycle.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Invoice Due Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 focus:border-purple-500 focus:outline-hidden"
                  />
                  <p className="mt-1 text-2xs text-neutral-500">
                    Standard due date for fee collection before becoming overdue.
                  </p>
                </div>
              </div>

              {/* Scope Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Campus Scope
                  </label>
                  <select
                    value={selectedCampusId}
                    onChange={(e) => setSelectedCampusId(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 focus:border-purple-500 focus:outline-hidden"
                  >
                    <option value="">All Campuses (School-wide)</option>
                    {campuses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-2xs text-neutral-500">
                    Optionally restrict invoice batch to students in one campus.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Class Scope
                  </label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800 focus:border-purple-500 focus:outline-hidden"
                  >
                    <option value="">All Classes</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.grade} — Section {cls.section}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-2xs text-neutral-500">
                    Optionally restrict invoice batch to students in a specific class.
                  </p>
                </div>
              </div>

              {/* Fee Structures Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                    Include Fee Structures ({selectedStructureIds.length}/{feeStructures.length} selected)
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllStructures}
                      className="text-xs font-semibold text-purple-700 hover:text-purple-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
                    >
                      Select All
                    </button>
                    <span className="text-neutral-500">|</span>
                    <button
                      type="button"
                      onClick={handleClearAllStructures}
                      className="text-xs font-semibold text-neutral-500 hover:text-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-xl border border-neutral-200 bg-neutral-50 max-h-48 overflow-y-auto">
                  {feeStructures.map((structure) => {
                    const isSelected = selectedStructureIds.includes(structure.id);
                    return (
                      <label
                        key={structure.id}
                        className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-purple-50/70 border-purple-300 shadow-2xs'
                            : 'bg-white border-neutral-200 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleStructure(structure.id)}
                          className="mt-0.5 rounded border-neutral-300 text-purple-600 focus:ring-purple-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-neutral-900 truncate">
                              {structure.name}
                            </span>
                            <span className="text-xs font-bold text-neutral-800 tabular-nums">
                              {formatCurrency(structure.amount)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-2xs text-neutral-500 capitalize">
                              {structure.frequency}
                            </span>
                            <span className="text-2xs text-neutral-500">•</span>
                            <span className="text-2xs text-purple-700">
                              {structure.appliesToClassIds.length} classes
                            </span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Idempotence guarantee notice */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 flex items-start gap-3">
                <span className="text-emerald-700"><NavIcon name="shield" className="w-5 h-5" /></span>
                <div className="text-xs text-emerald-900">
                  <span className="font-bold">Safe & Duplicate-Proof:</span> The generation preview
                  will automatically inspect existing invoices. If invoices for this month already
                  exist for any student, they are safely skipped and flagged in the preview with
                  zero duplicates created.
                </div>
              </div>
            </div>
          ) : (
            /* STEP 2: PREVIEW & CONFIRM */
            preview && (
              <div className="space-y-5">
                {/* StatCards Banner */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <StatCard
                    label="New Invoices to Create"
                    value={preview.newInvoicesCount}
                    subtitle={formatCurrency(preview.newInvoicesTotal)}
                    icon={<NavIcon name="sparkles" className="w-5 h-5" />}
                  />
                  <StatCard
                    label="Already Generated (Skip)"
                    value={preview.duplicateCount}
                    subtitle={formatCurrency(preview.duplicateTotal)}
                    icon={<NavIcon name="alert-triangle" className="w-5 h-5" />}
                  />
                  <StatCard
                    label="Eligible Students Evaluated"
                    value={preview.totalEligibleStudents}
                    subtitle={`Due: ${preview.dueDate}`}
                    icon={<NavIcon name="users" className="w-5 h-5" />}
                  />
                </div>

                {/* Status Notice */}
                {preview.newInvoicesCount === 0 ? (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex items-start gap-3 text-amber-900">
                    <NavIcon name="alert-triangle" className="w-5 h-5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider">
                        All Invoices Already Generated
                      </h4>
                      <p className="text-xs mt-0.5">
                        All {preview.duplicateCount} eligible fee records for{' '}
                        <strong>{preview.billingMonthLabel}</strong> have already been created in
                        storage. Re-running this batch creates <strong>0 duplicates</strong>.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-purple-200 bg-purple-50/70 p-4 flex items-start gap-3 text-purple-900">
                    <NavIcon name="lightbulb" className="w-5 h-5 shrink-0" />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider">
                        Ready to Generate {preview.newInvoicesCount} Invoices
                      </h4>
                      <p className="text-xs mt-0.5">
                        Total value to be billed:{' '}
                        <strong>{formatCurrency(preview.newInvoicesTotal)}</strong> for{' '}
                        <strong>{preview.billingMonthLabel}</strong>. Any previously generated
                        invoices ({preview.duplicateCount}) will be skipped to guarantee clean
                        records.
                      </p>
                    </div>
                  </div>
                )}

                {/* Preview Filter & Search Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={previewSearch}
                      onChange={(e) => setPreviewSearch(e.target.value)}
                      placeholder="Search preview by student, class, or structure..."
                      className="w-64 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs text-neutral-800 placeholder-neutral-400 focus:border-purple-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-neutral-600">Filter:</span>
                    <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setPreviewFilter('all')}
                        className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                          previewFilter === 'all'
                            ? 'bg-neutral-900 text-white'
                            : 'text-neutral-600 hover:text-neutral-900'
                        }`}
                      >
                        All ({preview.items.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewFilter('new')}
                        className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                          previewFilter === 'new'
                            ? 'bg-purple-700 text-white'
                            : 'text-neutral-600 hover:text-neutral-900'
                        }`}
                      >
                        New Only ({preview.newInvoicesCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewFilter('duplicate')}
                        className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                          previewFilter === 'duplicate'
                            ? 'bg-amber-600 text-white'
                            : 'text-neutral-600 hover:text-neutral-900'
                        }`}
                      >
                        Skipped ({preview.duplicateCount})
                      </button>
                    </div>
                  </div>
                </div>

                {/* Preview Items Table */}
                <div className="overflow-x-auto rounded-xl border border-neutral-200">
                  <table className="w-full text-left text-xs text-neutral-700">
                    <thead className="bg-neutral-100/90 text-neutral-800 font-semibold border-b border-neutral-200 uppercase tracking-wider text-2xs">
                      <tr>
                        <th className="px-3.5 py-2.5">Student</th>
                        <th className="px-3.5 py-2.5">Class & Campus</th>
                        <th className="px-3.5 py-2.5">Fee Structure</th>
                        <th className="px-3.5 py-2.5 text-right">Gross</th>
                        <th className="px-3.5 py-2.5 text-right">Discount</th>
                        <th className="px-3.5 py-2.5 text-right">Net Due</th>
                        <th className="px-3.5 py-2.5 text-center">Batch Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 bg-white">
                      {filteredPreviewItems.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-neutral-500">
                            No preview records match your search or filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredPreviewItems.slice(0, 100).map((item, idx) => (
                          <tr
                            key={`${item.studentId}-${item.feeStructureId}-${idx}`}
                            className={item.isDuplicate ? 'bg-neutral-50/60' : 'hover:bg-purple-50/30'}
                          >
                            <td className="px-3.5 py-2">
                              <div className="font-semibold text-neutral-900">
                                {item.studentName}
                              </div>
                              <div className="text-2xs text-neutral-500 font-mono">
                                {item.admissionNumber}
                              </div>
                            </td>
                            <td className="px-3.5 py-2">
                              <div className="text-neutral-800 font-medium">{item.className}</div>
                              <div className="text-2xs text-neutral-500">{item.campusName}</div>
                            </td>
                            <td className="px-3.5 py-2">
                              <span className="font-medium text-neutral-900">
                                {item.feeStructureName}
                              </span>
                            </td>
                            <td className="px-3.5 py-2 text-right tabular-nums text-neutral-600">
                              {formatCurrency(item.grossAmount)}
                            </td>
                            <td className="px-3.5 py-2 text-right tabular-nums">
                              {item.discountAmount > 0 ? (
                                <span className="font-semibold text-emerald-700">
                                  -{formatCurrency(item.discountAmount)}
                                </span>
                              ) : (
                                <span className="text-neutral-500">—</span>
                              )}
                            </td>
                            <td className="px-3.5 py-2 text-right tabular-nums font-bold text-neutral-900">
                              {formatCurrency(item.netAmount)}
                            </td>
                            <td className="px-3.5 py-2 text-center">
                              {item.isDuplicate ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-2xs font-semibold text-amber-800 border border-amber-200">
                                  <NavIcon name="alert-triangle" className="w-3.5 h-3.5" /> Exists (Skip)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-2xs font-semibold text-emerald-800 border border-emerald-200">
                                  <NavIcon name="sparkles" className="w-3.5 h-3.5" /> Ready to Create
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {filteredPreviewItems.length > 100 && (
                  <p className="text-2xs text-neutral-500 text-center">
                    Showing first 100 records of {filteredPreviewItems.length} matching preview items.
                  </p>
                )}
              </div>
            )
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-neutral-200 px-6 py-4 bg-neutral-50">
          {step === 1 ? (
            <>
              <Button variant="secondary" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleRunPreview}
                disabled={loadingPreview}
              >
                {loadingPreview ? 'Evaluating Records...' : 'Generate Preview →'}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setStep(1)}
                disabled={generating}
              >
                ← Back to Configuration
              </Button>
              <div className="flex items-center gap-3">
                <Button variant="secondary" size="sm" onClick={onClose} disabled={generating}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleConfirmGenerate}
                  disabled={!preview || preview.newInvoicesCount === 0 || generating}
                >
                  {generating
                    ? 'Creating Invoices...'
                    : `Confirm & Generate ${preview?.newInvoicesCount ?? 0} Invoices`}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
