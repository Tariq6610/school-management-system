/**
 * Pakistani Rupee (PKR) currency formatting utilities.
 * Reference: DEVELOPMENT_GUIDELINES.md §8 & UI_DESIGN_SYSTEM.md §3
 */

export interface FormatPKROptions {
  /**
   * Currency prefix (defaults to 'PKR'). Can also be 'Rs.' or empty string.
   */
  prefix?: string;
  /**
   * Number of decimal places (defaults to 0 for whole rupees).
   */
  decimals?: number;
  /**
   * Compact format for large summaries (e.g. 1.2M, 450K).
   */
  compact?: boolean;
}

/**
 * Format a number into standard Pakistani Rupee representation.
 * Always renders with comma separators. Pair with font-tabular-nums in UI components.
 *
 * Examples:
 *   formatPKR(12500) -> "PKR 12,500"
 *   formatPKR(12500, { prefix: "Rs." }) -> "Rs. 12,500"
 *   formatPKR(12500, { prefix: "" }) -> "12,500"
 *   formatPKR(1500000, { compact: true }) -> "PKR 1.5M"
 */
export function formatPKR(
  amount: number,
  options: FormatPKROptions = {}
): string {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return 'PKR 0';
  }

  const { prefix = 'PKR', decimals = 0, compact = false } = options;
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  let formattedNumber = '';

  if (compact) {
    if (absAmount >= 1_000_000) {
      formattedNumber = `${(absAmount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    } else if (absAmount >= 1_000) {
      formattedNumber = `${(absAmount / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    } else {
      formattedNumber = absAmount.toString();
    }
  } else {
    formattedNumber = absAmount.toLocaleString('en-PK', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }

  const symbolPart = prefix ? `${prefix} ` : '';
  return isNegative ? `-${symbolPart}${formattedNumber}` : `${symbolPart}${formattedNumber}`;
}

export const formatCurrency = formatPKR;

