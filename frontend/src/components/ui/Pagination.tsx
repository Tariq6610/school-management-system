'use client';

import React from 'react';

export interface PaginationProps {
  page: number;
  pageSize?: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;
  className?: string;
}

export function Pagination({
  page,
  pageSize = 25, // 25/page default per PROJECT_TASKS.md §TASK-011
  totalItems,
  onPageChange,
  pageSizeOptions = [10, 25, 50, 100],
  onPageSizeChange,
  className = '',
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers with ellipsis
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | 'ellipsis')[] = [1];

    if (currentPage > 3) {
      pages.push('ellipsis');
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push('ellipsis');
    }

    pages.push(totalPages);
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div
      className={`
        flex flex-col sm:flex-row items-center justify-between gap-3 py-3 px-4
        border-t border-rule bg-surface text-secondary-meta text-ink-600
        ${className}
      `}
      aria-label="Table pagination"
    >
      {/* Range summary with tabular numerals */}
      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
        <span className="tabular-nums font-normal text-ink-600">
          Showing <strong className="font-semibold text-ink-900">{startItem}</strong>–
          <strong className="font-semibold text-ink-900">{endItem}</strong> of{' '}
          <strong className="font-semibold text-ink-900">{totalItems}</strong>
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 text-xs text-ink-500">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Rows per page"
              className="rounded-control border border-rule bg-canvas px-2 py-1 text-xs text-ink-900 focus:outline-none focus:ring-1 focus:ring-brand-600 cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Navigation Controls */}
      <nav className="flex items-center gap-1" aria-label="Pagination Navigation">
        {/* Previous button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Go to previous page"
          className="
            inline-flex items-center justify-center h-8 px-2.5 rounded-control
            border border-rule bg-surface text-ink-900 text-xs font-medium
            hover:bg-canvas active:bg-rule/40 disabled:opacity-40 disabled:pointer-events-none
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600
            transition-colors cursor-pointer
          "
        >
          ‹ Prev
        </button>

        {/* Desktop Page Numbers */}
        <div className="hidden sm:flex items-center gap-1">
          {pages.map((p, idx) => {
            if (p === 'ellipsis') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 py-1 text-ink-400 select-none"
                  aria-hidden="true"
                >
                  …
                </span>
              );
            }

            const isCurrent = p === currentPage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                aria-label={`Page ${p}`}
                aria-current={isCurrent ? 'page' : undefined}
                className={`
                  inline-flex items-center justify-center min-w-[32px] h-8 px-2 rounded-control
                  text-xs font-medium tabular-nums transition-colors cursor-pointer
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600
                  ${
                    isCurrent
                      ? 'bg-brand-700 text-surface font-semibold shadow-xs'
                      : 'border border-transparent text-ink-900 hover:bg-canvas active:bg-rule/40'
                  }
                `}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Mobile current indicator (e.g. at 360px) */}
        <span className="sm:hidden px-2 text-xs font-medium tabular-nums text-ink-900">
          Page {currentPage} of {totalPages}
        </span>

        {/* Next button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Go to next page"
          className="
            inline-flex items-center justify-center h-8 px-2.5 rounded-control
            border border-rule bg-surface text-ink-900 text-xs font-medium
            hover:bg-canvas active:bg-rule/40 disabled:opacity-40 disabled:pointer-events-none
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600
            transition-colors cursor-pointer
          "
        >
          Next ›
        </button>
      </nav>
    </div>
  );
}
