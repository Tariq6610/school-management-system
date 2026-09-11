'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { Settings } from '@/types';
import { getSettings } from '@/lib/repositories/settings';
import { useSession } from '@/components/providers/SessionProvider';
import { formatPKR, FormatPKROptions } from '@/lib/utils/currency';

export interface BrandingContextValue {
  schoolName: string;
  currency: string;
  primaryColor: string;
  accentColor: string;
  formatCurrency: (amount: number, options?: Omit<FormatPKROptions, 'prefix'>) => string;
}

const defaultContext: BrandingContextValue = {
  schoolName: 'ABC School Network',
  currency: 'PKR',
  primaryColor: '#4B2FA8',
  accentColor: '#1D5F96',
  formatCurrency: (amount: number, options?: Omit<FormatPKROptions, 'prefix'>) => formatPKR(amount, options),
};

const BrandingContext = createContext<BrandingContextValue>(defaultContext);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useSession();
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    let active = true;

    async function loadBranding() {
      // If no session yet (e.g. login page), try to load main school settings by default
      const schoolId = session?.schoolId || 'sch_main';
      try {
        const loadedSettings = await getSettings({ schoolId });
        if (active) {
          setSettings(loadedSettings);
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
  }, [session?.schoolId, isLoading]);

  const schoolName = settings?.branding?.schoolName || defaultContext.schoolName;
  const primaryColor = settings?.branding?.primaryColor || defaultContext.primaryColor;
  const accentColor = settings?.branding?.accentColor || defaultContext.accentColor;
  const currency = settings?.currency || defaultContext.currency;

  const value = useMemo<BrandingContextValue>(() => ({
    schoolName,
    currency,
    primaryColor,
    accentColor,
    formatCurrency: (amount: number, options?: Omit<FormatPKROptions, 'prefix'>) => {
      return formatPKR(amount, { ...options, prefix: currency });
    },
  }), [schoolName, currency, primaryColor, accentColor]);

  // Dynamically inject CSS variables at the root level if colors are customized
  return (
    <BrandingContext.Provider value={value}>
      <style dangerouslySetInnerHTML={{
        __html: `
          :root {
            --color-brand-700: ${primaryColor};
            --color-accent-700: ${accentColor};
          }
        `
      }} />
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding(): BrandingContextValue {
  return useContext(BrandingContext);
}
