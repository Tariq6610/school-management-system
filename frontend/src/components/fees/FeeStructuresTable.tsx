'use client';

import React from 'react';
import { Campus, Class, FeeStructure, ID } from '@/types';
import { formatCurrency } from '@/lib/utils/currency';
import { Button } from '@/components/ui/Button';

export interface FeeStructuresTableProps {
  structures: FeeStructure[];
  campuses: Campus[];
  classes: Class[];
  onEdit: (structure: FeeStructure) => void;
  onDelete: (structure: FeeStructure) => void;
  isLoading?: boolean;
}

export function FeeStructuresTable({
  structures,
  campuses,
  classes,
  onEdit,
  onDelete,
  isLoading = false,
}: FeeStructuresTableProps) {
  const campusMap = React.useMemo(() => {
    return new Map<ID, string>(campuses.map((c) => [c.id, c.name]));
  }, [campuses]);

  const classMap = React.useMemo(() => {
    return new Map<ID, string>(classes.map((c) => [c.id, `Grade ${c.grade}-${c.section}`]));
  }, [classes]);

  if (isLoading) {
    return (
      <div className="py-16 text-center text-neutral-400">
        <p className="text-sm font-medium">Loading fee structures...</p>
      </div>
    );
  }

  if (structures.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center shadow-xs">
        <span className="text-3xl">💰</span>
        <h3 className="mt-2 text-base font-bold text-neutral-900">No Fee Structures Found</h3>
        <p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto">
          No fee structures match the selected filters. Create a new fee structure to define tuition, transport, or admission rates.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50/75 text-[11px] font-bold text-neutral-600 uppercase tracking-wider">
              <th className="py-3.5 px-4">Fee Structure</th>
              <th className="py-3.5 px-4">Frequency</th>
              <th className="py-3.5 px-4">Campus Scope</th>
              <th className="py-3.5 px-4 text-right">Standard Rate</th>
              <th className="py-3.5 px-4">Applies To Classes</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {structures.map((fs) => {
              const campusName = fs.campusId ? campusMap.get(fs.campusId) : null;
              const appliedClassNames = fs.appliesToClassIds
                .map((cId) => classMap.get(cId))
                .filter(Boolean) as string[];

              const visibleClasses = appliedClassNames.slice(0, 3);
              const remainingCount = appliedClassNames.length - visibleClasses.length;

              return (
                <tr key={fs.id} className="hover:bg-neutral-50/70 transition-colors">
                  {/* Name and ID */}
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-neutral-900 text-sm">{fs.name}</div>
                    <div className="font-mono text-[10px] text-neutral-400 mt-0.5">
                      ID: {fs.id}
                    </div>
                  </td>

                  {/* Frequency Badge */}
                  <td className="py-3.5 px-4">
                    {fs.frequency === 'monthly' && (
                      <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-purple-700 border border-purple-200">
                        Monthly
                      </span>
                    )}
                    {fs.frequency === 'term' && (
                      <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200">
                        Per Term (4 mo)
                      </span>
                    )}
                    {fs.frequency === 'annual' && (
                      <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200">
                        Annual / One-time
                      </span>
                    )}
                  </td>

                  {/* Campus Scope Tag */}
                  <td className="py-3.5 px-4">
                    {campusName ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800 border border-sky-200">
                        🏫 {campusName}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 border border-emerald-200">
                        🌐 School-Wide
                      </span>
                    )}
                  </td>

                  {/* Amount with Tabular Numerals */}
                  <td className="py-3.5 px-4 text-right">
                    <span className="font-bold text-neutral-900 font-mono text-sm">
                      {formatCurrency(fs.amount)}
                    </span>
                    <span className="text-[10px] text-neutral-400 block font-sans">
                      per student / cycle
                    </span>
                  </td>

                  {/* Applied Classes */}
                  <td className="py-3.5 px-4 max-w-xs">
                    {appliedClassNames.length === 0 ? (
                      <span className="text-neutral-400 italic text-[11px]">None assigned</span>
                    ) : (
                      <div className="flex flex-wrap items-center gap-1">
                        {visibleClasses.map((cName, idx) => (
                          <span
                            key={idx}
                            className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-700 border border-neutral-200"
                          >
                            {cName.replace('Grade ', '')}
                          </span>
                        ))}
                        {remainingCount > 0 && (
                          <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-[10px] font-bold text-neutral-600">
                            +{remainingCount} more
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onEdit(fs)}
                        className="text-xs px-2.5 py-1"
                      >
                        Edit
                      </Button>
                      <button
                        type="button"
                        onClick={() => onDelete(fs)}
                        className="rounded-lg p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title={`Delete ${fs.name}`}
                        aria-label={`Delete ${fs.name}`}
                      >
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
