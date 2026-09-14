'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { CampusTheme, DesignTokens, Settings } from '@/types';
import { getSettings } from '@/lib/repositories/settings';
import { getCampusTheme } from '@/lib/repositories/campusThemes';
import { useSession } from '@/components/providers/SessionProvider';
import { formatPKR, FormatPKROptions } from '@/lib/utils/currency';
import { darken, lighten } from '@/lib/utils/color';
import { BORDER_RADIUS_PX, DEFAULT_THEME_TOKENS } from '@/lib/theme/presets';

export interface BrandingContextValue extends DesignTokens {
  schoolName: string;
  logoUrl: string | null;
  currency: string;
  /** Whether the currently active theme is a per-campus override (vs the school default). */
  isCampusOverride: boolean;
  formatCurrency: (amount: number, options?: Omit<FormatPKROptions, 'prefix'>) => string;
  /** Call after a super admin saves design changes to re-fetch and re-apply immediately. */
  refreshBranding: () => void;
}

const defaultContext: BrandingContextValue = {
  schoolName: 'ABC School Network',
  logoUrl: null,
  currency: 'PKR',
  isCampusOverride: false,
  ...DEFAULT_THEME_TOKENS,
  formatCurrency: (amount: number, options?: Omit<FormatPKROptions, 'prefix'>) => formatPKR(amount, options),
  refreshBranding: () => {},
};

const BrandingContext = createContext<BrandingContextValue>(defaultContext);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { session, isLoading, activeCampusId } = useSession();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [campusTheme, setCampusTheme] = useState<CampusTheme | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshBranding = useCallback(() => setRefreshKey((k) => k + 1), []);

  const schoolId = session?.schoolId || 'sch_main';
  const effectiveCampusId = activeCampusId || session?.campusId || null;

  useEffect(() => {
    let active = true;

    async function loadBranding() {
      try {
        const loadedSettings = await getSettings({ schoolId });
        if (!active) return;
        setSettings(loadedSettings);

        if (loadedSettings.branding.designMode === 'per-campus' && effectiveCampusId) {
          const override = await getCampusTheme(effectiveCampusId);
          if (active) setCampusTheme(override);
        } else {
          setCampusTheme(null);
        }
      } catch (err) {
        console.warn('[BrandingProvider] Failed to load branding settings:', err);
      }
    }

    if (!isLoading) {
      loadBranding();
    }

    return () => {
      active = false;
    };
  }, [schoolId, effectiveCampusId, isLoading, refreshKey]);

  const schoolName = settings?.branding?.schoolName || defaultContext.schoolName;
  const logoUrl = settings?.branding?.logoUrl || null;
  const currency = settings?.currency || defaultContext.currency;

  // Effective tokens: campus override (if any) wins, else school branding, else platform default.
  const tokens: DesignTokens = useMemo(() => {
    if (campusTheme) {
      return {
        primaryColor: campusTheme.primaryColor,
        accentColor: campusTheme.accentColor,
        backgroundColor: campusTheme.backgroundColor,
        cardBackground: campusTheme.cardBackground,
        fontFamily: campusTheme.fontFamily,
        borderRadius: campusTheme.borderRadius,
        templateId: campusTheme.templateId,
      };
    }
    const b = settings?.branding;
    return {
      primaryColor: b?.primaryColor || DEFAULT_THEME_TOKENS.primaryColor,
      accentColor: b?.accentColor || DEFAULT_THEME_TOKENS.accentColor,
      backgroundColor: b?.backgroundColor || DEFAULT_THEME_TOKENS.backgroundColor,
      cardBackground: b?.cardBackground || DEFAULT_THEME_TOKENS.cardBackground,
      fontFamily: b?.fontFamily || DEFAULT_THEME_TOKENS.fontFamily,
      borderRadius: b?.borderRadius || DEFAULT_THEME_TOKENS.borderRadius,
      templateId: b?.templateId,
    };
  }, [campusTheme, settings]);

  const value = useMemo<BrandingContextValue>(() => ({
    schoolName,
    logoUrl,
    currency,
    isCampusOverride: !!campusTheme,
    ...tokens,
    formatCurrency: (amount: number, options?: Omit<FormatPKROptions, 'prefix'>) => {
      return formatPKR(amount, { ...options, prefix: currency });
    },
    refreshBranding,
  }), [schoolName, logoUrl, currency, campusTheme, tokens, refreshBranding]);

  // Apply the font family to <html data-font="..."> — same mechanism FontSwitcher uses,
  // but driven by the admin-configured theme rather than a per-viewer local preference.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-font', tokens.fontFamily);
  }, [tokens.fontFamily]);

  const radiusPx = BORDER_RADIUS_PX[tokens.borderRadius];

  // Dynamically inject CSS variables at the root level for the full design token set.
  return (
    <BrandingContext.Provider value={value}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          :root {
            --color-brand-700: ${tokens.primaryColor};
            --color-brand-600: ${darken(tokens.primaryColor, 0.12)};
            --color-brand-100: ${lighten(tokens.primaryColor, 0.88)};
            /* "primary-*" aliases brand-* for older components (Sidebar, BottomNav
               active states) that were built before the brand-* naming existed. */
            --color-primary-50: ${lighten(tokens.primaryColor, 0.94)};
            --color-primary-100: ${lighten(tokens.primaryColor, 0.88)};
            --color-primary-200: ${lighten(tokens.primaryColor, 0.76)};
            --color-primary-300: ${lighten(tokens.primaryColor, 0.6)};
            --color-primary-400: ${lighten(tokens.primaryColor, 0.4)};
            --color-primary-500: ${tokens.primaryColor};
            --color-primary-600: ${darken(tokens.primaryColor, 0.12)};
            --color-primary-700: ${tokens.primaryColor};
            --color-primary-800: ${darken(tokens.primaryColor, 0.24)};
            --color-primary-900: ${darken(tokens.primaryColor, 0.38)};
            --color-accent-700: ${tokens.accentColor};
            --color-accent-100: ${lighten(tokens.accentColor, 0.88)};
            --color-canvas: ${tokens.backgroundColor};
            --color-surface: ${tokens.cardBackground};
            --radius-control: ${radiusPx.control};
            --radius-card: ${radiusPx.card};
          }
        `,
        }}
      />
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding(): BrandingContextValue {
  return useContext(BrandingContext);
}
