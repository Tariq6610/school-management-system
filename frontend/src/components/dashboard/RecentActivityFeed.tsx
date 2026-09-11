'use client';

import React, { useState } from 'react';
import { ActivityCategory, NetworkActivityItem } from '@/lib/repositories/networkDashboard';

export interface RecentActivityFeedProps {
  activities: NetworkActivityItem[];
}

function formatRelativeTime(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

interface CategoryMeta {
  icon: string;
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

const CATEGORY_METAS: Record<ActivityCategory, CategoryMeta> = {
  admission: {
    icon: '🎓',
    label: 'Admission',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-700',
    borderClass: 'border-emerald-200/80',
  },
  fee_payment: {
    icon: '💳',
    label: 'Fee Payment',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-200/80',
  },
  attendance: {
    icon: '📅',
    label: 'Attendance',
    bgClass: 'bg-sky-50',
    textClass: 'text-sky-700',
    borderClass: 'border-sky-200/80',
  },
  exam: {
    icon: '🏆',
    label: 'Results',
    bgClass: 'bg-indigo-50',
    textClass: 'text-indigo-700',
    borderClass: 'border-indigo-200/80',
  },
  announcement: {
    icon: '📢',
    label: 'Notice',
    bgClass: 'bg-purple-50',
    textClass: 'text-purple-700',
    borderClass: 'border-purple-200/80',
  },
  whatsapp: {
    icon: '💬',
    label: 'WhatsApp',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-800',
    borderClass: 'border-emerald-200/80',
  },
};

export function RecentActivityFeed({ activities }: RecentActivityFeedProps) {
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory | 'all'>('all');

  const filteredActivities = activities.filter((act) => {
    if (selectedCategory === 'all') return true;
    return act.category === selectedCategory;
  });

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-2xs overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-50/50">
        <div>
          <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
            <span>⚡</span> Network Recent Activity
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Real-time feed of admissions, fee collection, attendance submissions, and dispatches.
          </p>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
              selectedCategory === 'all'
                ? 'bg-neutral-900 text-white shadow-2xs'
                : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            All ({activities.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('admission')}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
              selectedCategory === 'admission'
                ? 'bg-emerald-700 text-white shadow-2xs'
                : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            Admissions
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('fee_payment')}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
              selectedCategory === 'fee_payment'
                ? 'bg-amber-700 text-white shadow-2xs'
                : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            Fees
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('attendance')}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
              selectedCategory === 'attendance'
                ? 'bg-sky-700 text-white shadow-2xs'
                : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            Attendance
          </button>
          <button
            type="button"
            onClick={() => setSelectedCategory('announcement')}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition-colors ${
              selectedCategory === 'announcement'
                ? 'bg-purple-700 text-white shadow-2xs'
                : 'bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            Notices
          </button>
        </div>
      </div>

      {/* Activities List */}
      {filteredActivities.length === 0 ? (
        <div className="p-8 text-center text-neutral-500 text-xs">
          No activity records found for this filter.
        </div>
      ) : (
        <div className="divide-y divide-neutral-100 max-h-[500px] overflow-y-auto">
          {filteredActivities.map((act) => {
            const meta = CATEGORY_METAS[act.category] || CATEGORY_METAS.admission;

            return (
              <div
                key={act.id}
                className="p-3.5 hover:bg-neutral-50/60 transition-colors flex items-start gap-3"
              >
                {/* Icon Badge */}
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${meta.bgClass} ${meta.textClass} ${meta.borderClass} text-sm shadow-2xs`}
                >
                  {meta.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-bold text-neutral-900 truncate">
                      {act.title}
                    </h4>
                    <span className="text-[10px] text-neutral-500 font-mono whitespace-nowrap shrink-0">
                      {formatRelativeTime(act.timestamp)}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed">
                    {act.description}
                  </p>

                  <div className="flex items-center gap-2 mt-1.5">
                    {act.campusName && (
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-neutral-100 text-neutral-700">
                        📍 {act.campusName}
                      </span>
                    )}
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${meta.bgClass} ${meta.textClass}`}
                    >
                      {act.badgeText || meta.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
