'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Scope, Settings } from '@/types';
import { getSettings, updateSettings } from '@/lib/repositories/settings';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave';

export interface AttendanceSettingsEditorProps {
  initialSettings?: Settings;
}

export function AttendanceSettingsEditor({ initialSettings }: AttendanceSettingsEditorProps = {}) {
  const { session } = useSession();
  const { showToast } = useToast();
  const schoolId = session?.schoolId ?? 'sch_main';

  const [loading, setLoading] = useState(!initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [cutoffTime, setCutoffTime] = useState(initialSettings?.attendanceCutoffTime ?? '08:30');
  const [editWindow, setEditWindow] = useState((initialSettings?.attendanceEditWindowHours ?? 48).toString());
  const [statuses, setStatuses] = useState<AttendanceStatus[]>(initialSettings?.attendanceStatuses || ['present', 'absent', 'late', 'leave']);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const scope: Scope = { schoolId };
        const settings = await getSettings(scope);
        if (!ignore) {
          setCutoffTime(settings.attendanceCutoffTime ?? '08:30');
          setEditWindow((settings.attendanceEditWindowHours ?? 48).toString());
          setStatuses(settings.attendanceStatuses || ['present', 'absent', 'late', 'leave']);
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Failed to load attendance settings:', err);
          setLoading(false);
        }
      }
    }
    load();
    return () => { ignore = true; };
  }, [schoolId]);

  const handleToggleStatus = useCallback((status: AttendanceStatus) => {
    if (status === 'present' || status === 'absent') return; // Required
    setStatuses(prev => {
      const active = prev.includes(status);
      if (active) return prev.filter(s => s !== status);
      return [...prev, status];
    });
    setHasUnsavedChanges(true);
  }, []);

  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);
      const scope: Scope = { schoolId };
      const patch = {
        attendanceCutoffTime: cutoffTime,
        attendanceEditWindowHours: parseInt(editWindow, 10) || 48,
        attendanceStatuses: statuses,
      };
      await updateSettings(patch, scope);
      setHasUnsavedChanges(false);
      showToast({
        type: 'success',
        title: 'Settings updated',
        message: 'Attendance policies saved successfully.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update settings';
      showToast({ type: 'error', title: 'Save failed', message: msg });
    } finally {
      setIsSaving(false);
    }
  }, [schoolId, cutoffTime, editWindow, statuses, showToast]);

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
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 tracking-tight">Attendance Operations</h2>
          <p className="text-sm text-neutral-600">Configure daily roll-call policies, cutoffs, and edit window allowances.</p>
        </div>
        <div className="flex items-center gap-3">
          {hasUnsavedChanges && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Unsaved changes
            </span>
          )}
          <Button size="sm" variant="primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-xs space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Daily Cutoff Time"
            type="time"
            value={cutoffTime}
            onChange={(e) => {
              setCutoffTime(e.target.value);
              setHasUnsavedChanges(true);
            }}
            hint="Time by which morning attendance must be submitted"
            required
          />
          <Input
            label="Edit Window (Hours)"
            type="number"
            min={0}
            max={720}
            value={editWindow}
            onChange={(e) => {
              setEditWindow(e.target.value);
              setHasUnsavedChanges(true);
            }}
            hint="How long teachers can edit attendance after submission"
            required
          />
        </div>

        <div className="pt-4 border-t border-neutral-100">
          <h3 className="text-sm font-bold text-neutral-900 mb-3">Allowed Attendance Statuses</h3>
          <div className="space-y-3">
            {[
              { id: 'present', label: 'Present', required: true, desc: 'Student is present.' },
              { id: 'absent', label: 'Absent', required: true, desc: 'Student is absent.' },
              { id: 'late', label: 'Late', required: false, desc: 'Student arrived after cutoff.' },
              { id: 'leave', label: 'Leave', required: false, desc: 'Student is on approved leave.' },
            ].map(status => {
              const isChecked = statuses.includes(status.id as AttendanceStatus) || status.required;
              return (
                <label key={status.id} className={`flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${isChecked ? 'border-purple-600 bg-purple-50/30' : 'border-neutral-200 bg-neutral-50 hover:bg-neutral-100'}`}>
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 text-purple-600 focus:ring-purple-600 border-neutral-300 rounded"
                    checked={isChecked}
                    disabled={status.required}
                    onChange={() => handleToggleStatus(status.id as AttendanceStatus)}
                  />
                  <div>
                    <div className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                      {status.label}
                      {status.required && <span className="text-[10px] uppercase tracking-wider text-neutral-500 bg-neutral-200 px-1.5 py-0.5 rounded">Required</span>}
                    </div>
                    <div className="text-xs text-neutral-500">{status.desc}</div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
