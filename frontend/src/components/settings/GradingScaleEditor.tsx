'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { GradeScaleItem, Scope } from '@/types';
import { getSettings, resetGradingScale, updateGradingScale } from '@/lib/repositories/settings';
import {
  calculateGrade,
  getPresetGradingScales,
  GradingPreset,
  validateGradingScale,
} from '@/lib/utils/grading';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { NavIcon } from '@/components/shell/NavIcon';

export interface GradingScaleEditorProps {
  initialScale?: GradeScaleItem[];
  onSaved?: (scale: GradeScaleItem[]) => void;
}

export function GradingScaleEditor({ initialScale, onSaved }: GradingScaleEditorProps) {
  const { session } = useSession();
  const { showToast } = useToast();
  const schoolId = session?.schoolId ?? 'sch_main';

  const [scale, setScale] = useState<GradeScaleItem[]>(initialScale || []);
  const [loading, setLoading] = useState<boolean>(!initialScale);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  // Interactive Test Sandbox State
  const [testScore, setTestScore] = useState<string>('82');
  const [testMaxScore, setTestMaxScore] = useState<string>('100');

  // Load existing settings
  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const scope: Scope = { schoolId };
        const settings = await getSettings(scope);
        if (!ignore) {
          if (!initialScale && settings.gradingScale) {
            setScale(settings.gradingScale);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Failed to load settings:', err);
          setLoading(false);
        }
      }
    }

    Promise.resolve().then(() => {
      if (!ignore) {
        load();
      }
    });

    return () => {
      ignore = true;
    };
  }, [schoolId, initialScale]);

  // Real-time validation
  const validation = useMemo(() => {
    return validateGradingScale(scale);
  }, [scale]);

  // Test sandbox real-time computation
  const testResult = useMemo(() => {
    const s = parseFloat(testScore);
    const m = parseFloat(testMaxScore);
    if (isNaN(s) || isNaN(m) || m <= 0) return null;
    return calculateGrade(s, m, scale);
  }, [testScore, testMaxScore, scale]);

  // Change individual tier property
  const handleUpdateTier = useCallback(
    (index: number, field: keyof GradeScaleItem, value: string | number | undefined) => {
      setScale((prev) => {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          [field]: value,
        };
        return updated;
      });
      setHasUnsavedChanges(true);
    },
    []
  );

  // Add tier
  const handleAddTier = useCallback(() => {
    setScale((prev) => {
      const lastMin = prev.length > 0 ? prev[prev.length - 1].minPercentage : 50;
      const newMin = Math.max(0, lastMin - 10);
      const newMax = Math.max(0, lastMin - 0.1);
      return [
        ...prev,
        {
          grade: 'New',
          minPercentage: newMin,
          maxPercentage: newMax,
          gpa: 1.0,
          description: 'Passing Tier',
        },
      ];
    });
    setHasUnsavedChanges(true);
  }, []);

  // Remove tier
  const handleRemoveTier = useCallback((index: number) => {
    setScale((prev) => prev.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  }, []);

  // Move tier up
  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    setScale((prev) => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
    setHasUnsavedChanges(true);
  }, []);

  // Move tier down
  const handleMoveDown = useCallback((index: number) => {
    setScale((prev) => {
      if (index >= prev.length - 1) return prev;
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
    setHasUnsavedChanges(true);
  }, []);

  // Apply preset template
  const handleApplyPreset = useCallback((preset: GradingPreset) => {
    setScale(preset.scale);
    setHasUnsavedChanges(true);
    showToast({
      type: 'info',
      title: 'Preset applied',
      message: `Loaded "${preset.name}". Click Save to persist changes.`,
    });
  }, [showToast]);

  // Save changes
  const handleSave = useCallback(async () => {
    if (!validation.isValid) {
      showToast({
        type: 'error',
        title: 'Validation Failed',
        message: validation.errors[0] || 'Please fix grading scale errors before saving.',
      });
      return;
    }

    try {
      setIsSaving(true);
      const scope: Scope = { schoolId };
      const updated = await updateGradingScale(scope, scale);
      setScale(updated.gradingScale);
      setHasUnsavedChanges(false);
      showToast({
        type: 'success',
        title: 'Grading scale updated',
        message: 'All grade thresholds and GPAs have been saved successfully.',
      });
      onSaved?.(updated.gradingScale);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update grading scale';
      showToast({
        type: 'error',
        title: 'Save failed',
        message: msg,
      });
    } finally {
      setIsSaving(false);
    }
  }, [validation, schoolId, scale, showToast, onSaved]);

  // Reset to default
  const handleReset = useCallback(async () => {
    try {
      setIsSaving(true);
      const scope: Scope = { schoolId };
      const updated = await resetGradingScale(scope);
      setScale(updated.gradingScale);
      setHasUnsavedChanges(false);
      showToast({
        type: 'info',
        title: 'Reset to default',
        message: 'Grading scale has been restored to default standard percentage tiers.',
      });
      onSaved?.(updated.gradingScale);
    } catch (err) {
      console.error('Failed to reset grading scale:', err);
      showToast({
        type: 'error',
        title: 'Reset failed',
        message: 'Unable to restore default grading scale.',
      });
    } finally {
      setIsSaving(false);
    }
  }, [schoolId, showToast, onSaved]);

  const presets = useMemo(() => getPresetGradingScales(), []);

  if (loading) {
    return (
      <div className="p-6 space-y-4 motion-safe:animate-pulse">
        <div className="h-6 bg-neutral-200 rounded w-1/4" />
        <div className="h-48 bg-neutral-100 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Header & Save Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
            Academic Grading Scale
          </h2>
          <p className="text-sm text-neutral-600">
            Define grade thresholds, GPA point allocations, and descriptions. Used across all exams, marks entry, and report cards.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Unsaved changes
            </span>
          )}

          <Button
            size="sm"
            variant="secondary"
            onClick={handleReset}
            disabled={isSaving}
          >
            Reset Default
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={handleSave}
            disabled={isSaving || !validation.isValid}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* Preset Scales Selection */}
      <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-600">
            Apply Quick Preset Template
          </span>
          <span className="text-xs text-neutral-500">
            Select a standardized template as a starting point
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleApplyPreset(p)}
              className="px-3 py-1.5 text-xs font-medium bg-white text-neutral-800 border border-neutral-300 rounded-lg hover:border-purple-300 hover:text-purple-700 hover:bg-purple-50/50 transition-colors shadow-2xs"
            >
              <strong>{p.name}</strong>
            </button>
          ))}
        </div>
      </div>

      {/* Validation Banner if Invalid */}
      {!validation.isValid && (
        <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-1 text-sm text-red-700">
          <div className="font-bold flex items-center gap-1.5">
            <NavIcon name="alert-triangle" className="w-4 h-4" />
            <span>Grading Scale Errors Detected:</span>
          </div>
          <ul className="list-disc list-inside text-xs space-y-0.5 ml-2">
            {validation.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tiers Configuration Table */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-neutral-50/80 border-b border-neutral-200 text-xs font-semibold text-neutral-600 uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4 w-28">Grade</th>
                <th className="py-3 px-4 w-32">Min %</th>
                <th className="py-3 px-4 w-32">Max %</th>
                <th className="py-3 px-4 w-28">GPA</th>
                <th className="py-3 px-4">Description / Descriptor</th>
                <th className="py-3 px-4 w-32 text-center">Reorder / Remove</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {scale.map((tier, idx) => (
                <tr key={idx} className="hover:bg-neutral-50/50 transition-colors">
                  {/* Order Number */}
                  <td className="py-2.5 px-4 text-center font-mono text-xs text-neutral-500">
                    {idx + 1}
                  </td>

                  {/* Grade Name */}
                  <td className="py-2 px-4">
                    <input
                      type="text"
                      value={tier.grade}
                      onChange={(e) => handleUpdateTier(idx, 'grade', e.target.value)}
                      placeholder="e.g. A+"
                      className="w-full h-8 px-2 text-center font-mono font-bold text-sm bg-neutral-50 border border-neutral-300 rounded-md focus:bg-white focus:border-purple-600 focus:outline-hidden"
                    />
                  </td>

                  {/* Min Percentage */}
                  <td className="py-2 px-4">
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={tier.minPercentage}
                        onChange={(e) =>
                          handleUpdateTier(idx, 'minPercentage', parseFloat(e.target.value) || 0)
                        }
                        className="w-full h-8 pr-6 pl-2 font-mono text-right text-xs bg-neutral-50 border border-neutral-300 rounded-md focus:bg-white focus:border-purple-600 focus:outline-hidden"
                      />
                      <span className="absolute right-2 top-2 text-xs text-neutral-500 pointer-events-none">
                        %
                      </span>
                    </div>
                  </td>

                  {/* Max Percentage */}
                  <td className="py-2 px-4">
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={tier.maxPercentage}
                        onChange={(e) =>
                          handleUpdateTier(idx, 'maxPercentage', parseFloat(e.target.value) || 0)
                        }
                        className="w-full h-8 pr-6 pl-2 font-mono text-right text-xs bg-neutral-50 border border-neutral-300 rounded-md focus:bg-white focus:border-purple-600 focus:outline-hidden"
                      />
                      <span className="absolute right-2 top-2 text-xs text-neutral-500 pointer-events-none">
                        %
                      </span>
                    </div>
                  </td>

                  {/* GPA */}
                  <td className="py-2 px-4">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={tier.gpa ?? ''}
                      onChange={(e) =>
                        handleUpdateTier(
                          idx,
                          'gpa',
                          e.target.value === '' ? undefined : parseFloat(e.target.value) || 0
                        )
                      }
                      placeholder="e.g. 4.0"
                      className="w-full h-8 px-2 font-mono text-right text-xs bg-neutral-50 border border-neutral-300 rounded-md focus:bg-white focus:border-purple-600 focus:outline-hidden"
                    />
                  </td>

                  {/* Description */}
                  <td className="py-2 px-4">
                    <input
                      type="text"
                      value={tier.description || ''}
                      onChange={(e) => handleUpdateTier(idx, 'description', e.target.value)}
                      placeholder="e.g. Outstanding"
                      className="w-full h-8 px-2.5 text-xs bg-neutral-50 border border-neutral-300 rounded-md focus:bg-white focus:border-purple-600 focus:outline-hidden"
                    />
                  </td>

                  {/* Actions */}
                  <td className="py-2 px-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveUp(idx)}
                        disabled={idx === 0}
                        className="p-1 text-neutral-500 hover:text-neutral-700 disabled:opacity-30 rounded"
                        title="Move Up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDown(idx)}
                        disabled={idx === scale.length - 1}
                        className="p-1 text-neutral-500 hover:text-neutral-700 disabled:opacity-30 rounded"
                        title="Move Down"
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveTier(idx)}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                        title="Delete Tier"
                      >
                        <NavIcon name="trash" className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Tier Action */}
        <div className="p-3 bg-neutral-50/50 border-t border-neutral-200">
          <Button size="sm" variant="secondary" onClick={handleAddTier} leftIcon={<NavIcon name="plus" className="w-3.5 h-3.5" />}>
            Add New Tier
          </Button>
        </div>
      </div>

      {/* Live Interactive Score Sandbox */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div>
            <h3 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
              <NavIcon name="activity" className="w-4 h-4" />
              <span>Interactive Scale Tester</span>
            </h3>
            <p className="text-xs text-neutral-500">
              Test any test score against the live configured scale above to instantly verify calculation results.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div className="w-32">
            <Input
              label="Obtained Score"
              type="number"
              min="0"
              value={testScore}
              onChange={(e) => setTestScore(e.target.value)}
            />
          </div>

          <div className="w-32">
            <Input
              label="Total Marks"
              type="number"
              min="1"
              value={testMaxScore}
              onChange={(e) => setTestMaxScore(e.target.value)}
            />
          </div>

          {/* Real-time Computed Outcome Badge */}
          {testResult && (
            <div className="flex items-center gap-4 p-3 bg-purple-50/70 border border-purple-200 rounded-xl text-sm">
              <div>
                <span className="text-2xs uppercase tracking-wider text-purple-600 font-bold block">
                  Percentage
                </span>
                <span className="font-mono font-bold text-purple-900 text-lg">
                  {testResult.percentage}%
                </span>
              </div>

              <div className="h-8 w-px bg-purple-200" />

              <div>
                <span className="text-2xs uppercase tracking-wider text-purple-600 font-bold block">
                  Grade
                </span>
                <span className="font-mono font-bold text-xl text-purple-800">
                  {testResult.grade}
                </span>
              </div>

              <div className="h-8 w-px bg-purple-200" />

              <div>
                <span className="text-2xs uppercase tracking-wider text-purple-600 font-bold block">
                  GPA
                </span>
                <span className="font-mono font-bold text-sm text-neutral-800">
                  {testResult.gpa ?? 'N/A'}
                </span>
              </div>

              <div className="h-8 w-px bg-purple-200" />

              <div>
                <span className="text-2xs uppercase tracking-wider text-purple-600 font-bold block">
                  Descriptor
                </span>
                <span className="text-xs font-medium text-neutral-700">
                  {testResult.description || '—'}
                </span>
              </div>

              <div className="h-8 w-px bg-purple-200" />

              <div>
                <span className="text-2xs uppercase tracking-wider text-purple-600 font-bold block">
                  Status
                </span>
                <span
                  className={`inline-block px-2 py-0.5 rounded text-2xs font-bold uppercase ${
                    testResult.isPassing
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {testResult.isPassing ? 'Passing' : 'Failing'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
