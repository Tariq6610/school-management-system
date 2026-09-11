'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Scope, Settings } from '@/types';
import { getSettings, updateSettings } from '@/lib/repositories/settings';
import { useSession } from '@/components/providers/SessionProvider';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export interface BrandingSettingsEditorProps {
  initialSettings?: Settings;
}

export function BrandingSettingsEditor({ initialSettings }: BrandingSettingsEditorProps = {}) {
  const { session } = useSession();
  const { showToast } = useToast();
  const schoolId = session?.schoolId ?? 'sch_main';

  const [loading, setLoading] = useState(!initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [schoolName, setSchoolName] = useState(initialSettings?.branding?.schoolName || 'ABC School Network');
  const [primaryColor, setPrimaryColor] = useState(initialSettings?.branding?.primaryColor || '#4B2FA8');
  const [accentColor, setAccentColor] = useState(initialSettings?.branding?.accentColor || '#1D5F96');
  const [currency, setCurrency] = useState(initialSettings?.currency || 'PKR');

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const scope: Scope = { schoolId };
        const settings = await getSettings(scope);
        if (!ignore) {
          setSchoolName(settings.branding.schoolName || 'ABC School Network');
          setPrimaryColor(settings.branding.primaryColor || '#4B2FA8');
          setAccentColor(settings.branding.accentColor || '#1D5F96');
          setCurrency(settings.currency || 'PKR');
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Failed to load branding settings:', err);
          setLoading(false);
        }
      }
    }
    load();
    return () => { ignore = true; };
  }, [schoolId]);

  const handleSave = useCallback(async () => {
    try {
      setIsSaving(true);
      const scope: Scope = { schoolId };
      const patch = {
        branding: {
          schoolName,
          primaryColor,
          accentColor,
        },
        currency,
      };
      await updateSettings(patch, scope);
      setHasUnsavedChanges(false);
      showToast({
        type: 'success',
        title: 'Settings updated',
        message: 'Institution branding and general settings saved successfully.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update settings';
      showToast({ type: 'error', title: 'Save failed', message: msg });
    } finally {
      setIsSaving(false);
    }
  }, [schoolId, schoolName, primaryColor, accentColor, currency, showToast]);

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
          <h2 className="text-lg font-bold text-neutral-900 tracking-tight">Institution Branding</h2>
          <p className="text-sm text-neutral-600">Configure global visual identity, name, and regional formats.</p>
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
          <div className="md:col-span-2">
            <Input
              label="Institution Name"
              type="text"
              value={schoolName}
              onChange={(e) => {
                setSchoolName(e.target.value);
                setHasUnsavedChanges(true);
              }}
              hint="The official name displayed across the portal and reports"
              required
            />
          </div>
          
          <Input
            label="Primary Theme Color"
            type="color"
            value={primaryColor}
            onChange={(e) => {
              setPrimaryColor(e.target.value);
              setHasUnsavedChanges(true);
            }}
            hint="Main brand color for sidebar and primary accents"
          />

          <Input
            label="Accent Color"
            type="color"
            value={accentColor}
            onChange={(e) => {
              setAccentColor(e.target.value);
              setHasUnsavedChanges(true);
            }}
            hint="Secondary color for interactive elements"
          />

          <Input
            label="Default Currency"
            type="text"
            value={currency}
            onChange={(e) => {
              setCurrency(e.target.value);
              setHasUnsavedChanges(true);
            }}
            hint="e.g. PKR, USD, GBP used for fee invoicing"
            required
          />
        </div>
      </div>
    </div>
  );
}
