'use client';

import React from 'react';
import { Button } from './Button';

export interface TableColumn<T> {
  key: string;
  header: string;
  accessor?: (item: T, index: number) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string;
  isNumeric?: boolean; // Enforces tabular-nums per UI_DESIGN_SYSTEM.md §3
  hideOnMobile?: boolean;
}

export interface TableEmptyState {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface TableProps<T extends { id: string | number }> {
  columns: TableColumn<T>[];
  data: T[];
  keyExtractor?: (item: T) => string | number;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc' | null;
  onSort?: (columnKey: string) => void;
  selectable?: boolean;
  selectedIds?: (string | number)[];
  onSelectRow?: (id: string | number) => void;
  onSelectAll?: () => void;
  stickyHeader?: boolean;
  density?: 'default' | 'compact';
  onRowClick?: (item: T) => void;
  emptyState?: TableEmptyState;
  isLoading?: boolean;
  className?: string;
  caption?: string;
}

export function Table<T extends { id: string | number }>({
  columns,
  data,
  keyExtractor = (item) => item.id,
  sortKey,
  sortDirection,
  onSort,
  selectable = false,
  selectedIds = [],
  onSelectRow,
  onSelectAll,
  stickyHeader = true,
  density = 'default',
  onRowClick,
  emptyState,
  isLoading = false,
  className = '',
  caption,
}: TableProps<T>) {
  const allSelected = data.length > 0 && selectedIds.length === data.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < data.length;

  const rowPadding = density === 'compact' ? 'py-1.5 px-3' : 'py-2.5 px-3.5';

  return (
    <div
      className={`
        w-full overflow-hidden rounded-card border border-rule bg-surface shadow-xs
        ${className}
      `}
    >
      {/* Scroll container: allows isolated horizontal scroll on small devices (e.g. 360px) without page-level blowout */}
      <div className="relative w-full overflow-x-auto">
        <table className="w-full border-collapse text-left text-table-cell text-ink-900">
          {caption && <caption className="sr-only">{caption}</caption>}

          {/* Sticky Header per UI_DESIGN_SYSTEM.md §5 & §6 */}
          <thead
            className={`
              border-b border-rule text-secondary-meta font-semibold text-ink-600 bg-canvas
              ${stickyHeader ? 'sticky top-0 z-10 shadow-xs' : ''}
            `}
          >
            <tr>
              {selectable && (
                <th
                  scope="col"
                  className="w-10 px-3 py-2.5 text-center select-none"
                >
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={onSelectAll ?? (() => {})}
                    aria-label="Select all rows"
                    className="rounded-control h-4 w-4 border-rule text-brand-700 focus:ring-brand-600 cursor-pointer"
                  />
                </th>
              )}

              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                const alignClass =
                  col.align === 'right'
                    ? 'text-right'
                    : col.align === 'center'
                    ? 'text-center'
                    : 'text-left';

                return (
                  <th
                    key={col.key}
                    scope="col"
                    style={{ width: col.width }}
                    aria-sort={
                      isSorted
                        ? sortDirection === 'asc'
                          ? 'ascending'
                          : sortDirection === 'desc'
                          ? 'descending'
                          : 'none'
                        : undefined
                    }
                    className={`
                      ${rowPadding} ${alignClass} select-none
                      ${col.hideOnMobile ? 'hidden sm:table-cell' : ''}
                      ${col.sortable ? 'cursor-pointer hover:bg-rule/40 transition-colors' : ''}
                    `}
                    onClick={() => col.sortable && onSort?.(col.key)}
                  >
                    <div
                      className={`inline-flex items-center gap-1.5 ${
                        col.align === 'right' ? 'flex-row-reverse' : ''
                      }`}
                    >
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span className="text-xs text-ink-400" aria-hidden="true">
                          {isSorted ? (
                            sortDirection === 'asc' ? (
                              '▲'
                            ) : sortDirection === 'desc' ? (
                              '▼'
                            ) : (
                              '↕'
                            )
                          ) : (
                            <span className="opacity-40">↕</span>
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-rule/70 bg-surface">
            {isLoading ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="py-12 text-center text-secondary-meta text-ink-500"
                >
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-700 border-t-transparent" />
                    <span>Loading records...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="py-12 px-6 text-center"
                >
                  <div className="flex flex-col items-center justify-center space-y-3 max-w-sm mx-auto">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700">
                      <svg
                        className="h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.75}
                        stroke="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                        />
                      </svg>
                    </div>

                    <div>
                      <p className="text-body-custom font-semibold text-ink-900">
                        {emptyState?.title ?? 'No records found'}
                      </p>
                      {emptyState?.description && (
                        <p className="text-secondary-meta text-ink-600 mt-0.5">
                          {emptyState.description}
                        </p>
                      )}
                    </div>

                    {emptyState?.action && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={emptyState.action.onClick}
                      >
                        {emptyState.action.label}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item, rowIdx) => {
                const id = keyExtractor(item);
                const isSelected = selectedIds.includes(id);

                return (
                  <tr
                    key={String(id)}
                    onClick={() => onRowClick?.(item)}
                    className={`
                      transition-colors
                      ${
                        isSelected
                          ? 'bg-brand-100/50'
                          : 'hover:bg-brand-100/20'
                      }
                      ${onRowClick ? 'cursor-pointer' : ''}
                    `}
                  >
                    {selectable && (
                      <td
                        className="w-10 px-3 py-2 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onSelectRow?.(id)}
                          aria-label={`Select row ${rowIdx + 1}`}
                          className="rounded-control h-4 w-4 border-rule text-brand-700 focus:ring-brand-600 cursor-pointer"
                        />
                      </td>
                    )}

                    {columns.map((col) => {
                      const alignClass =
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left';

                      // Numeric columns automatically receive tabular-nums per UI_DESIGN_SYSTEM.md §3
                      const numericClass = col.isNumeric ? 'tabular-nums font-normal' : '';

                      return (
                        <td
                          key={col.key}
                          className={`
                            ${rowPadding} ${alignClass} ${numericClass}
                            ${col.hideOnMobile ? 'hidden sm:table-cell' : ''}
                          `}
                        >
                          {col.accessor
                            ? col.accessor(item, rowIdx)
                            : (item as Record<string, unknown>)[col.key] !== undefined
                            ? String((item as Record<string, unknown>)[col.key])
                            : '—'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
