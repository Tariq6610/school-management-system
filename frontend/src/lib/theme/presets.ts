/**
 * Design system: curated theme presets and the border-radius scale.
 * Super admin picks a preset as a starting point, then can fine-tune every
 * token individually — school-wide, or per campus (DesignMode).
 */

import { BorderRadiusScale, DesignTokens, FontFamily } from '@/types';

export interface ThemePreset extends DesignTokens {
  id: string;
  name: string;
  description: string;
}

export const DEFAULT_THEME_TOKENS: DesignTokens = {
  primaryColor: '#f97316',
  accentColor: '#1D5F96',
  backgroundColor: '#f1f5f9',
  cardBackground: '#ffffff',
  fontFamily: 'inter',
  borderRadius: 'md',
  templateId: 'sunset',
};

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'sunset',
    name: 'Sunset',
    description: 'Warm orange accent on a cool slate background — the platform default.',
    primaryColor: '#f97316',
    accentColor: '#1D5F96',
    backgroundColor: '#f1f5f9',
    cardBackground: '#ffffff',
    fontFamily: 'inter',
    borderRadius: 'md',
    templateId: 'sunset',
  },
  {
    id: 'classic-purple',
    name: 'Classic Purple',
    description: 'The original institutional purple-and-navy palette.',
    primaryColor: '#4B2FA8',
    accentColor: '#1D5F96',
    backgroundColor: '#F6F6F9',
    cardBackground: '#ffffff',
    fontFamily: 'noto',
    borderRadius: 'md',
    templateId: 'classic-purple',
  },
  {
    id: 'ocean-blue',
    name: 'Ocean Blue',
    description: 'Crisp sky blue with soft, rounder corners.',
    primaryColor: '#0EA5E9',
    accentColor: '#0369A1',
    backgroundColor: '#F0F9FF',
    cardBackground: '#ffffff',
    fontFamily: 'inter',
    borderRadius: 'lg',
    templateId: 'ocean-blue',
  },
  {
    id: 'forest-green',
    name: 'Forest Green',
    description: 'Grounded green accent, tighter corners for a formal feel.',
    primaryColor: '#16A34A',
    accentColor: '#065F46',
    backgroundColor: '#F0FDF4',
    cardBackground: '#ffffff',
    fontFamily: 'noto',
    borderRadius: 'sm',
    templateId: 'forest-green',
  },
  {
    id: 'crimson-rose',
    name: 'Crimson Rose',
    description: 'Bold rose accent with a serif touch and fully rounded controls.',
    primaryColor: '#E11D48',
    accentColor: '#9D174D',
    backgroundColor: '#FFF1F2',
    cardBackground: '#ffffff',
    fontFamily: 'fraunces',
    borderRadius: 'full',
    templateId: 'crimson-rose',
  },
];

export const FONT_FAMILY_OPTIONS: { value: FontFamily; label: string }[] = [
  { value: 'noto', label: 'Noto Sans' },
  { value: 'inter', label: 'Inter' },
  { value: 'fraunces', label: 'Fraunces (serif)' },
  { value: 'jetbrains', label: 'JetBrains Mono' },
];

export const BORDER_RADIUS_OPTIONS: { value: BorderRadiusScale; label: string }[] = [
  { value: 'none', label: 'None (square)' },
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium (default)' },
  { value: 'lg', label: 'Large' },
  { value: 'full', label: 'Extra Round' },
];

/** Maps the border-radius scale to actual --radius-control / --radius-card pixel values. */
export const BORDER_RADIUS_PX: Record<BorderRadiusScale, { control: string; card: string }> = {
  none: { control: '2px', card: '4px' },
  sm: { control: '4px', card: '6px' },
  md: { control: '6px', card: '10px' },
  lg: { control: '10px', card: '16px' },
  full: { control: '14px', card: '22px' },
};

export function findPresetById(templateId?: string): ThemePreset | undefined {
  return THEME_PRESETS.find((p) => p.id === templateId);
}
