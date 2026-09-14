'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PeriodDefinition, Scope } from '@/types';
import {
  getPeriodConfiguration,
  updatePeriodConfiguration,
  resetPeriodConfiguration,
  validatePeriodConfiguration,
  getPresetPeriodConfigurations,
  parseTimeToMinutes,
} from '@/lib/repositories/settings';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { NavIcon } from '@/components/shell/NavIcon';

export interface PeriodConfigurationEditorProps {
  initialPeriods?: PeriodDefinition[];
  onSaved?: (periods: PeriodDefinition[]) => void;
}

export function PeriodConfigurationEditor({
  initialPeriods,
  onSaved,
}: PeriodConfigurationEditorProps) {
  const { session } = useSession();
  const { showToast } = useToast();
  const schoolId = session?.schoolId ?? 'sch_main';
  const campusId = session?.campusId;

  const [periods, setPeriods] = useState<PeriodDefinition[]>(initialPeriods || []);
  const [loading, setLoading] = useState<boolean>(!initialPeriods);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');

  const presets = useMemo(() => getPresetPeriodConfigurations(), []);

  // Load existing period settings
  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const scope: Scope = { schoolId, campusId };
        const data = await getPeriodConfiguration(scope);
        if (!ignore) {
          if (!initialPeriods) {
            setPeriods(data);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Failed to load period configuration:', err);
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
  }, [schoolId, campusId, initialPeriods]);

  // Real-time validation
  const validation = useMemo(() => {
    return validatePeriodConfiguration(periods);
  }, [periods]);

  // Calculated schedule analytics
  const scheduleSummary = useMemo(() => {
    if (periods.length === 0) {
      return { totalSlots: 0, instructionalSlots: 0, breakSlots: 0, instructionalMinutes: 0, totalSpan: '0h 0m' };
    }

    let instructionalMin = 0;
    let instructionalCount = 0;
    let breakCount = 0;

    let minStart = Infinity;
    let maxEnd = -Infinity;

    for (const p of periods) {
      const start = parseTimeToMinutes(p.startTime);
      const end = parseTimeToMinutes(p.endTime);

      if (start !== null && end !== null && end > start) {
        const duration = end - start;
        if (p.isBreak) {
          breakCount++;
        } else {
          instructionalCount++;
          instructionalMin += duration;
        }

        if (start < minStart) minStart = start;
        if (end > maxEnd) maxEnd = end;
      }
    }

    const totalMinutes = maxEnd > minStart ? maxEnd - minStart : 0;
    const spanHours = Math.floor(totalMinutes / 60);
    const spanMins = totalMinutes % 60;

    return {
      totalSlots: periods.length,
      instructionalSlots: instructionalCount,
      breakSlots: breakCount,
      instructionalMinutes: instructionalMin,
      totalSpan: `${spanHours}h ${spanMins}m`,
      dayStartTime: minStart < Infinity ? periods[0]?.startTime : '—',
      dayEndTime: maxEnd > -Infinity ? periods[periods.length - 1]?.endTime : '—',
    };
  }, [periods]);

  // Update a period property
  const handleUpdatePeriod = useCallback(
    (index: number, field: keyof PeriodDefinition, value: string | number | boolean | undefined) => {
      setPeriods((prev) => {
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

  // Add new period slot
  const handleAddPeriod = useCallback(() => {
    setPeriods((prev) => {
      const nextNum = prev.length > 0 ? Math.max(...prev.map((p) => p.period)) + 1 : 1;
      let nextStart = '08:00';
      let nextEnd = '08:45';

      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        const lastEndMin = parseTimeToMinutes(last.endTime);
        if (lastEndMin !== null) {
          const newStartMin = lastEndMin;
          const newEndMin = newStartMin + 45;
          const sh = String(Math.floor(newStartMin / 60) % 24).padStart(2, '0');
          const sm = String(newStartMin % 60).padStart(2, '0');
          const eh = String(Math.floor(newEndMin / 60) % 24).padStart(2, '0');
          const em = String(newEndMin % 60).padStart(2, '0');
          nextStart = `${sh}:${sm}`;
          nextEnd = `${eh}:${em}`;
        }
      }

      return [
        ...prev,
        {
          period: nextNum,
          name: `Period ${nextNum}`,
          startTime: nextStart,
          endTime: nextEnd,
          isBreak: false,
        },
      ];
    });
    setHasUnsavedChanges(true);
  }, []);

  // Delete period
  const handleDeletePeriod = useCallback((index: number) => {
    setPeriods((prev) => prev.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  }, []);

  // Reorder periods
  const handleMove = useCallback((index: number, direction: 'up' | 'down') => {
    setPeriods((prev) => {
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
    setHasUnsavedChanges(true);
  }, []);

  // Apply preset
  const handleApplyPreset = useCallback(
    (presetId: string) => {
      const selected = presets.find((p) => p.id === presetId);
      if (!selected) return;
      setPeriods(selected.periods);
      setSelectedPresetId(presetId);
      setHasUnsavedChanges(true);
      showToast({ type: 'info', title: `Applied preset: ${selected.name}` });
    },
    [presets, showToast]
  );

  // Reset to default
  const handleReset = useCallback(async () => {
    if (window.confirm('Reset period configuration to the default 6-period schedule?')) {
      try {
        setIsSaving(true);
        const scope: Scope = { schoolId, campusId };
        const updated = await resetPeriodConfiguration(scope);
        setPeriods(updated.periods || []);
        setHasUnsavedChanges(false);
        showToast({ type: 'success', title: 'Period configuration reset to default.' });
        onSaved?.(updated.periods || []);
      } catch (err) {
        showToast({
          type: 'error',
          title: 'Failed to reset periods',
          message: err instanceof Error ? err.message : undefined,
        });
      } finally {
        setIsSaving(false);
      }
    }
  }, [schoolId, campusId, showToast, onSaved]);

  // Save changes
  const handleSave = useCallback(async () => {
    if (!validation.isValid) {
      showToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fix schedule validation errors before saving.',
      });
      return;
    }

    try {
      setIsSaving(true);
      const scope: Scope = { schoolId, campusId };
      const updated = await updatePeriodConfiguration(scope, periods);
      setPeriods(updated.periods || periods);
      setHasUnsavedChanges(false);
      showToast({ type: 'success', title: 'Timetable periods updated successfully!' });
      onSaved?.(updated.periods || periods);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Failed to save period schedule',
        message: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setIsSaving(false);
    }
  }, [validation.isValid, schoolId, campusId, periods, showToast, onSaved]);


  if (loading) {
    return (
      <div className="bg-white border border-neutral-200 rounded-xl p-8 text-center text-neutral-500 motion-safe:animate-pulse">
        Loading period configurations...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-neutral-200 rounded-xl p-6 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
            Timetable Periods & Bell Schedule
          </h2>
          <p className="text-sm text-neutral-600 mt-1">
            Configure daily period time slots, recess/break intervals, and bell schedule for classes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 motion-safe:animate-pulse" />
              Unsaved changes
            </span>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleReset}
            disabled={isSaving}
          >
            Reset Defaults
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={!validation.isValid || isSaving || !hasUnsavedChanges}
          >
            {isSaving ? 'Saving...' : 'Save Periods'}
          </Button>
        </div>
      </div>

      {/* Analytics & Day Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Total Slots</p>
          <p className="text-2xl font-bold text-neutral-900 mt-1">{scheduleSummary.totalSlots}</p>
          <p className="text-xs text-neutral-500 mt-0.5">
            {scheduleSummary.instructionalSlots} instructional, {scheduleSummary.breakSlots} breaks
          </p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Instructional Time</p>
          <p className="text-2xl font-bold text-purple-700 mt-1">
            {Math.floor(scheduleSummary.instructionalMinutes / 60)}h {scheduleSummary.instructionalMinutes % 60}m
          </p>
          <p className="text-xs text-neutral-500 mt-0.5">{scheduleSummary.instructionalMinutes} active minutes</p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Daily Span</p>
          <p className="text-2xl font-bold text-neutral-900 mt-1">{scheduleSummary.totalSpan}</p>
          <p className="text-xs text-neutral-500 mt-0.5">
            {scheduleSummary.dayStartTime} to {scheduleSummary.dayEndTime}
          </p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Schedule Status</p>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                validation.isValid
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {validation.isValid ? 'Valid & Clash-Free' : `${validation.errors.length} Conflict(s)`}
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            {validation.isValid ? 'Ready for timetable builder' : 'Requires correction'}
          </p>
        </div>
      </div>

      {/* Preset Schedule Selector */}
      <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-neutral-700">Apply Standard Preset:</span>
          <select
            value={selectedPresetId}
            onChange={(e) => {
              if (e.target.value) handleApplyPreset(e.target.value);
            }}
            className="text-sm border border-neutral-300 rounded-lg px-3 py-1.5 bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">-- Select a predefined schedule --</option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <Button variant="secondary" size="sm" onClick={handleAddPeriod} leftIcon={<NavIcon name="plus" className="w-3.5 h-3.5" />}>
          Add New Slot
        </Button>
      </div>

      {/* Validation Alert */}
      {!validation.isValid && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-rose-900 space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-rose-800">
            <svg className="w-5 h-5 text-rose-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            Schedule Conflicts Found
          </div>
          <ul className="list-disc list-inside text-xs space-y-1 text-rose-700">
            {validation.errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Period Table */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-neutral-700">
            <thead className="bg-neutral-50 text-neutral-500 font-semibold border-b border-neutral-200 text-xs uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 w-16 text-center">Period #</th>
                <th className="py-3 px-4 min-w-[160px]">Slot Name / Label</th>
                <th className="py-3 px-4 w-32">Start Time</th>
                <th className="py-3 px-4 w-32">End Time</th>
                <th className="py-3 px-4 w-28">Duration</th>
                <th className="py-3 px-4 w-36">Slot Type</th>
                <th className="py-3 px-4 w-28 text-center">Order</th>
                <th className="py-3 px-4 w-20 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {periods.map((p, index) => {
                const startMin = parseTimeToMinutes(p.startTime);
                const endMin = parseTimeToMinutes(p.endTime);
                const durationMin =
                  startMin !== null && endMin !== null && endMin > startMin
                    ? endMin - startMin
                    : null;

                return (
                  <tr
                    key={index}
                    className={`hover:bg-neutral-50/80 transition-colors ${
                      p.isBreak ? 'bg-amber-50/40' : ''
                    }`}
                  >
                    {/* Period # */}
                    <td className="py-3 px-4 text-center">
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={p.period}
                        onChange={(e) =>
                          handleUpdatePeriod(index, 'period', parseInt(e.target.value, 10) || 1)
                        }
                        className="w-12 text-center text-sm font-semibold border border-neutral-300 rounded-md py-1 bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </td>

                    {/* Slot Name */}
                    <td className="py-3 px-4">
                      <input
                        type="text"
                        value={p.name}
                        onChange={(e) => handleUpdatePeriod(index, 'name', e.target.value)}
                        placeholder="e.g. Period 1, Morning Break"
                        className="w-full text-sm font-medium border border-neutral-300 rounded-md px-2.5 py-1.5 bg-white text-neutral-800 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </td>

                    {/* Start Time */}
                    <td className="py-3 px-4">
                      <input
                        type="time"
                        value={p.startTime}
                        onChange={(e) => handleUpdatePeriod(index, 'startTime', e.target.value)}
                        className="w-full text-sm border border-neutral-300 rounded-md px-2.5 py-1.5 bg-white text-neutral-800 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                      />
                    </td>

                    {/* End Time */}
                    <td className="py-3 px-4">
                      <input
                        type="time"
                        value={p.endTime}
                        onChange={(e) => handleUpdatePeriod(index, 'endTime', e.target.value)}
                        className="w-full text-sm border border-neutral-300 rounded-md px-2.5 py-1.5 bg-white text-neutral-800 focus:outline-none focus:ring-1 focus:ring-purple-500 font-mono"
                      />
                    </td>

                    {/* Duration */}
                    <td className="py-3 px-4">
                      {durationMin !== null ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-neutral-100 text-neutral-700">
                          {durationMin} mins
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-700">
                          Invalid
                        </span>
                      )}
                    </td>

                    {/* Slot Type Toggle */}
                    <td className="py-3 px-4">
                      <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={Boolean(p.isBreak)}
                          onChange={(e) =>
                            handleUpdatePeriod(index, 'isBreak', e.target.checked)
                          }
                          className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 border-neutral-300"
                        />
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            p.isBreak
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {p.isBreak ? 'Break / Recess' : 'Instructional'}
                        </span>
                      </label>
                    </td>

                    {/* Order Controls */}
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMove(index, 'up')}
                          disabled={index === 0}
                          title="Move up"
                          className="p-1 rounded text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(index, 'down')}
                          disabled={index === periods.length - 1}
                          title="Move down"
                          className="p-1 rounded text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          ▼
                        </button>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeletePeriod(index)}
                        disabled={periods.length <= 1}
                        title="Delete slot"
                        className="text-xs text-rose-600 hover:text-rose-800 font-medium disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {periods.length === 0 && (
          <div className="p-8 text-center text-neutral-500">
            No periods configured. Click &quot;Add New Slot&quot; or apply a preset above.
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between bg-white border border-neutral-200 rounded-xl p-4 shadow-xs">
        <div className="text-xs text-neutral-500">
          * Period times synchronize with class timetables and live teacher/room clash detectors.
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={!validation.isValid || isSaving || !hasUnsavedChanges}
          >
            {isSaving ? 'Saving Changes...' : 'Save Period Schedule'}
          </Button>
        </div>
      </div>
    </div>
  );
}
