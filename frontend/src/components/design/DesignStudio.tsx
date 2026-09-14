'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Campus, CampusTheme, DesignMode, DesignTokens } from '@/types';
import { getSettings, updateSettings } from '@/lib/repositories/settings';
import { listCampuses } from '@/lib/repositories/campuses';
import { clearCampusTheme, getCampusTheme, setCampusTheme } from '@/lib/repositories/campusThemes';
import {
  BORDER_RADIUS_OPTIONS,
  BORDER_RADIUS_PX,
  DEFAULT_THEME_TOKENS,
  FONT_FAMILY_OPTIONS,
  THEME_PRESETS,
} from '@/lib/theme/presets';
import { isValidHexColor } from '@/lib/utils/color';
import { useSession } from '@/components/providers/SessionProvider';
import { useBranding } from '@/components/providers/BrandingProvider';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';

const SCHOOL_DEFAULT_TAB = '__school_default__';

function tokensEqual(a: DesignTokens, b: DesignTokens): boolean {
  return (
    a.primaryColor === b.primaryColor &&
    a.accentColor === b.accentColor &&
    a.backgroundColor === b.backgroundColor &&
    a.cardBackground === b.cardBackground &&
    a.fontFamily === b.fontFamily &&
    a.borderRadius === b.borderRadius
  );
}

export function DesignStudio() {
  const { session } = useSession();
  const { refreshBranding } = useBranding();
  const schoolId = session?.schoolId ?? 'sch_main';

  const [schoolBranding, setSchoolBranding] = useState<DesignTokens | null>(null);
  const [designMode, setDesignMode] = useState<DesignMode>('unified');
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [campusThemes, setCampusThemes] = useState<Record<string, CampusTheme | null>>({});
  const [activeTab, setActiveTab] = useState<string>(SCHOOL_DEFAULT_TAB);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [settings, campusList] = await Promise.all([
        getSettings({ schoolId }),
        listCampuses({ schoolId }),
      ]);
      const b = settings.branding;
      setSchoolBranding({
        primaryColor: b.primaryColor,
        accentColor: b.accentColor,
        backgroundColor: b.backgroundColor || DEFAULT_THEME_TOKENS.backgroundColor,
        cardBackground: b.cardBackground || DEFAULT_THEME_TOKENS.cardBackground,
        fontFamily: b.fontFamily || DEFAULT_THEME_TOKENS.fontFamily,
        borderRadius: b.borderRadius || DEFAULT_THEME_TOKENS.borderRadius,
        templateId: b.templateId,
      });
      setDesignMode(b.designMode || 'unified');
      setCampuses(campusList);

      const themeEntries = await Promise.all(
        campusList.map(async (c) => [c.id, await getCampusTheme(c.id)] as const)
      );
      setCampusThemes(Object.fromEntries(themeEntries));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load design settings.');
    } finally {
      setIsLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) load();
    });
    return () => {
      ignore = true;
    };
  }, [load]);

  const handleModeChange = async (mode: DesignMode) => {
    setDesignMode(mode);
    try {
      const settings = await getSettings({ schoolId });
      await updateSettings({ branding: { ...settings.branding, designMode: mode } }, { schoolId });
      refreshBranding();
    } catch {
      // Non-fatal — local UI state already reflects intent; will reconcile on next load.
    }
  };

  const handleSaveSchoolDefault = async (tokens: DesignTokens) => {
    const settings = await getSettings({ schoolId });
    await updateSettings({ branding: { ...settings.branding, ...tokens } }, { schoolId });
    setSchoolBranding(tokens);
    refreshBranding();
  };

  const handleSaveCampus = async (campusId: string, tokens: DesignTokens) => {
    const saved = await setCampusTheme({ schoolId, campusId, ...tokens });
    setCampusThemes((prev) => ({ ...prev, [campusId]: saved }));
    refreshBranding();
  };

  const handleResetCampus = async (campusId: string) => {
    await clearCampusTheme(campusId);
    setCampusThemes((prev) => ({ ...prev, [campusId]: null }));
    refreshBranding();
  };

  if (loadError) {
    return <ErrorState title="Design Studio Could Not Be Loaded" message={loadError} onRetry={load} />;
  }

  if (isLoading || !schoolBranding) {
    return (
      <div className="space-y-3">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  const activeCampus = campuses.find((c) => c.id === activeTab);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-page-title text-ink-900">Design Studio</h1>
        <p className="text-secondary-meta text-ink-600 mt-1">
          Customize colors, fonts, and corner rounding for the whole network — or give each campus its own look.
        </p>
      </div>

      {/* Design mode toggle */}
      <div className="rounded-card bg-surface border border-rule p-4 sm:p-5 space-y-3">
        <h2 className="text-card-title text-ink-900">Design Scope</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleModeChange('unified')}
            className={`text-left p-3.5 rounded-card border-2 transition-colors cursor-pointer ${
              designMode === 'unified' ? 'border-brand-700 bg-brand-100/40' : 'border-rule hover:border-brand-600/40'
            }`}
          >
            <p className="font-semibold text-ink-900 text-sm">Same design for all campuses</p>
            <p className="text-secondary-meta text-ink-600 mt-1">
              One theme applies network-wide. Simplest to maintain.
            </p>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('per-campus')}
            className={`text-left p-3.5 rounded-card border-2 transition-colors cursor-pointer ${
              designMode === 'per-campus' ? 'border-brand-700 bg-brand-100/40' : 'border-rule hover:border-brand-600/40'
            }`}
          >
            <p className="font-semibold text-ink-900 text-sm">Custom design per campus</p>
            <p className="text-secondary-meta text-ink-600 mt-1">
              Each campus can have its own colors and typography. Campuses without a custom design use the school default.
            </p>
          </button>
        </div>
      </div>

      {designMode === 'unified' ? (
        <ThemeEditorPanel
          key="school-default-unified"
          title="Network Theme"
          subtitle="Applies to every campus and every role across the school."
          initialTokens={schoolBranding}
          onSave={handleSaveSchoolDefault}
        />
      ) : (
        <div className="space-y-4">
          {/* Campus tabs */}
          <div className="flex items-center gap-1 border-b border-rule overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab(SCHOOL_DEFAULT_TAB)}
              className={`px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                activeTab === SCHOOL_DEFAULT_TAB
                  ? 'border-brand-700 text-brand-700'
                  : 'border-transparent text-ink-500 hover:text-ink-900'
              }`}
            >
              School Default
            </button>
            {campuses.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveTab(c.id)}
                className={`px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                  activeTab === c.id
                    ? 'border-brand-700 text-brand-700'
                    : 'border-transparent text-ink-500 hover:text-ink-900'
                }`}
              >
                {c.name}
                {campusThemes[c.id] && (
                  <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-brand-600 align-middle" aria-label="Custom design" />
                )}
              </button>
            ))}
          </div>

          {activeTab === SCHOOL_DEFAULT_TAB ? (
            <ThemeEditorPanel
              key="school-default-percampus"
              title="School Default"
              subtitle="The fallback theme used by any campus that doesn't have its own custom design."
              initialTokens={schoolBranding}
              onSave={handleSaveSchoolDefault}
            />
          ) : activeCampus ? (
            <ThemeEditorPanel
              key={`${activeCampus.id}-${campusThemes[activeCampus.id] ? 'override' : 'default'}`}
              title={`${activeCampus.name} Theme`}
              subtitle={
                campusThemes[activeCampus.id]
                  ? 'This campus has its own custom design.'
                  : 'Currently inheriting the school default. Save changes below to give this campus its own design.'
              }
              initialTokens={campusThemes[activeCampus.id] ?? schoolBranding}
              onSave={(tokens) => handleSaveCampus(activeCampus.id, tokens)}
              onResetToDefault={
                campusThemes[activeCampus.id] ? () => handleResetCampus(activeCampus.id) : undefined
              }
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

interface ThemeEditorPanelProps {
  title: string;
  subtitle: string;
  initialTokens: DesignTokens;
  onSave: (tokens: DesignTokens) => Promise<void>;
  onResetToDefault?: () => Promise<void>;
}

function ThemeEditorPanel({ title, subtitle, initialTokens, onSave, onResetToDefault }: ThemeEditorPanelProps) {
  const { showToast } = useToast();
  // Note: the parent gives each ThemeEditorPanel instance a stable `key` per
  // target (school default vs. a specific campus), so switching targets
  // remounts this component with a fresh `initialTokens` — no effect needed
  // to resync local state on prop change.
  const [tokens, setTokens] = useState<DesignTokens>(initialTokens);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const isDirty = useMemo(() => !tokensEqual(tokens, initialTokens), [tokens, initialTokens]);
  const colorsValid =
    isValidHexColor(tokens.primaryColor) &&
    isValidHexColor(tokens.accentColor) &&
    isValidHexColor(tokens.backgroundColor) &&
    isValidHexColor(tokens.cardBackground);

  const applyPreset = (presetId: string) => {
    const preset = THEME_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setTokens({
      primaryColor: preset.primaryColor,
      accentColor: preset.accentColor,
      backgroundColor: preset.backgroundColor,
      cardBackground: preset.cardBackground,
      fontFamily: preset.fontFamily,
      borderRadius: preset.borderRadius,
      templateId: preset.id,
    });
  };

  const updateField = <K extends keyof DesignTokens>(key: K, value: DesignTokens[K]) => {
    setTokens((prev) => ({ ...prev, [key]: value, templateId: undefined }));
  };

  const handleSave = async () => {
    if (!colorsValid) {
      showToast({ type: 'error', title: 'Invalid color', message: 'Colors must be valid hex values, e.g. #f97316.' });
      return;
    }
    setIsSaving(true);
    try {
      await onSave(tokens);
      showToast({ type: 'success', title: 'Design saved', message: `${title} has been updated.` });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Could not save design',
        message: err instanceof Error ? err.message : 'An unexpected error occurred.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!onResetToDefault) return;
    setIsResetting(true);
    try {
      await onResetToDefault();
      showToast({ type: 'info', title: 'Reset to school default', message: `${title} now follows the network theme.` });
    } finally {
      setIsResetting(false);
    }
  };

  const radiusPx = BORDER_RADIUS_PX[tokens.borderRadius];

  return (
    <div className="rounded-card bg-surface border border-rule p-4 sm:p-5 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-card-title text-ink-900">{title}</h2>
          <p className="text-secondary-meta text-ink-600 mt-0.5">{subtitle}</p>
        </div>
        {onResetToDefault && (
          <Button variant="ghost" size="sm" isLoading={isResetting} onClick={handleReset}>
            Use school default
          </Button>
        )}
      </div>

      {/* Preset gallery */}
      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">Templates</span>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {THEME_PRESETS.map((preset) => {
            const isActive = tokens.templateId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                title={preset.description}
                className={`text-left p-2.5 rounded-card border-2 transition-colors cursor-pointer ${
                  isActive ? 'border-brand-700' : 'border-rule hover:border-brand-600/40'
                }`}
              >
                <div className="flex gap-1 mb-1.5">
                  <span className="w-4 h-4 rounded-full border border-black/10" style={{ background: preset.primaryColor }} />
                  <span className="w-4 h-4 rounded-full border border-black/10" style={{ background: preset.accentColor }} />
                  <span className="w-4 h-4 rounded-full border border-black/10" style={{ background: preset.backgroundColor }} />
                </div>
                <p className="text-xs font-semibold text-ink-900 truncate">{preset.name}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6">
        {/* Custom controls */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ColorField
              label="Primary Accent Color"
              value={tokens.primaryColor}
              onChange={(v) => updateField('primaryColor', v)}
            />
            <ColorField
              label="Secondary Accent Color"
              value={tokens.accentColor}
              onChange={(v) => updateField('accentColor', v)}
            />
            <ColorField
              label="Background Color"
              value={tokens.backgroundColor}
              onChange={(v) => updateField('backgroundColor', v)}
            />
            <ColorField
              label="Card Background"
              value={tokens.cardBackground}
              onChange={(v) => updateField('cardBackground', v)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Font Family Style"
              value={tokens.fontFamily}
              onChange={(e) => updateField('fontFamily', e.target.value as DesignTokens['fontFamily'])}
              options={FONT_FAMILY_OPTIONS.map((f) => ({ value: f.value, label: f.label }))}
            />
            <Select
              label="Border Corner Radius"
              value={tokens.borderRadius}
              onChange={(e) => updateField('borderRadius', e.target.value as DesignTokens['borderRadius'])}
              options={BORDER_RADIUS_OPTIONS.map((r) => ({ value: r.value, label: r.label }))}
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button variant="primary" size="md" isLoading={isSaving} disabled={!isDirty} onClick={handleSave}>
              Save Changes
            </Button>
            {isDirty && (
              <Button variant="ghost" size="md" onClick={() => setTokens(initialTokens)}>
                Discard
              </Button>
            )}
          </div>
        </div>

        {/* Live preview */}
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">Preview</span>
          <div
            className="p-4 border border-rule"
            style={{ background: tokens.backgroundColor, borderRadius: radiusPx.card }}
          >
            <div
              className="p-4 space-y-3"
              style={{ background: tokens.cardBackground, borderRadius: radiusPx.card, boxShadow: '0 4px 16px rgba(26,27,35,0.10)' }}
            >
              <p className="font-semibold" style={{ color: '#1A1B23' }}>
                Sample Card
              </p>
              <p className="text-xs" style={{ color: '#565A68' }}>
                This is how cards and text will look with these settings.
              </p>
              <button
                type="button"
                tabIndex={-1}
                className="px-3 py-1.5 text-xs font-medium text-white"
                style={{ background: tokens.primaryColor, borderRadius: radiusPx.control }}
              >
                Primary Button
              </button>
              <span
                className="inline-block ml-2 px-2 py-1 text-xs font-medium"
                style={{ background: tokens.accentColor, color: '#fff', borderRadius: radiusPx.control }}
              >
                Accent Tag
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorField({ label, value, onChange }: ColorFieldProps) {
  const valid = isValidHexColor(value);
  return (
    <div className="space-y-1.5">
      <label className="block text-secondary-meta font-medium text-ink-900">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={valid ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-9 h-9 shrink-0 rounded-control border border-rule cursor-pointer bg-transparent p-0.5"
          aria-label={`${label} swatch`}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label={`${label} hex value`}
          className={`h-9 flex-1 min-w-0 rounded-control border px-3 text-body-custom bg-surface text-ink-900 focus:outline-none focus:ring-2 ${
            valid
              ? 'border-rule hover:border-ink-400 focus:border-brand-600 focus:ring-brand-600/20'
              : 'border-absent focus:border-absent focus:ring-absent/30'
          }`}
        />
      </div>
      {!valid && <p className="text-secondary-meta text-absent font-medium">Enter a valid hex color, e.g. #f97316</p>}
    </div>
  );
}
