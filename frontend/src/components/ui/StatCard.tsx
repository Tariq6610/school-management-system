import React from 'react';

export interface StatTrend {
  direction: 'up' | 'down' | 'neutral';
  value: string;
  label?: string;
  /**
   * If true (default), an 'up' direction is treated as positive/good (green)
   * and 'down' is treated as negative/concerning (red).
   * For metrics like unpaid fees or absences where increase is bad, set to false.
   */
  positiveIsGood?: boolean;
}

export interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: StatTrend;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * Institutional StatCard component.
 * Displays key metrics with tabular numerals and optional trend indicators.
 * Reference: UI_DESIGN_SYSTEM.md §3 & §5
 */
export function StatCard({
  label,
  value,
  subtitle,
  trend,
  icon,
  className = '',
}: StatCardProps) {
  const getTrendStyle = (t: StatTrend) => {
    const isGood = t.positiveIsGood !== false;
    if (t.direction === 'neutral') {
      return {
        color: 'text-ink-600 bg-canvas border-rule',
        glyph: '→',
        ariaText: 'unchanged',
      };
    }
    const isPositiveOutcome = (t.direction === 'up' && isGood) || (t.direction === 'down' && !isGood);
    if (isPositiveOutcome) {
      return {
        color: 'text-present bg-present-bg border-present/20',
        glyph: t.direction === 'up' ? '↑' : '↓',
        ariaText: `${t.direction} (favorable)`,
      };
    }
    return {
      color: 'text-absent bg-absent-bg border-absent/20',
      glyph: t.direction === 'up' ? '↑' : '↓',
      ariaText: `${t.direction} (unfavorable)`,
    };
  };

  const trendStyle = trend ? getTrendStyle(trend) : null;

  return (
    <div
      className={`rounded-card bg-surface border border-rule p-4 flex flex-col justify-between transition-colors ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-secondary-meta font-medium text-ink-600 truncate">
          {label}
        </span>
        {icon && <div className="text-ink-400 shrink-0">{icon}</div>}
      </div>

      <div className="mt-2 flex items-baseline gap-2 flex-wrap">
        <span className="text-stat-number font-semibold tabular-nums text-ink-900">
          {value}
        </span>

        {trend && trendStyle && (
          <span
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-control text-xs font-medium border ${trendStyle.color}`}
            title={trend.label ? `${trend.value} ${trend.label}` : trend.value}
            aria-label={`Trend: ${trend.value} ${trendStyle.ariaText}`}
          >
            <span aria-hidden="true" className="font-bold">
              {trendStyle.glyph}
            </span>
            <span className="tabular-nums">{trend.value}</span>
          </span>
        )}
      </div>

      {(subtitle || (trend && trend.label)) && (
        <div className="mt-1.5 text-secondary-meta text-ink-500 truncate">
          {subtitle ?? (trend?.label ? `${trend.label}` : null)}
        </div>
      )}
    </div>
  );
}
