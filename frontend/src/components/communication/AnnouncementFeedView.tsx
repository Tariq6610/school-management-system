'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AudienceType, EnrichedAnnouncement, Scope } from '@/types';
import { getAudienceAnnouncements } from '@/lib/repositories/announcements';
import { AnnouncementDetailModal } from './AnnouncementDetailModal';

export interface AnnouncementFeedViewProps {
  schoolId: string;
  studentContext?: {
    campusId?: string;
    classId?: string;
  };
  title?: string;
  subtitle?: string;
  limit?: number;
  compact?: boolean;
}

function formatDate(isoString?: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function AnnouncementFeedView({
  schoolId,
  studentContext,
  title = 'Announcements & Circulars',
  subtitle = 'Official notices, circulars, and updates from school leadership and teachers.',
  limit,
  compact = false,
}: AnnouncementFeedViewProps) {
  const [announcements, setAnnouncements] = useState<EnrichedAnnouncement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeAudienceFilter, setActiveAudienceFilter] = useState<'all' | AudienceType>('all');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<EnrichedAnnouncement | null>(null);

  const scope: Scope = useMemo(() => ({ schoolId }), [schoolId]);

  const campusId = studentContext?.campusId;
  const classId = studentContext?.classId;
  const resolvedContext = useMemo(
    () => (campusId || classId ? { campusId, classId } : undefined),
    [campusId, classId]
  );

  const loadFeed = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getAudienceAnnouncements(scope, resolvedContext);
      setAnnouncements(data);
    } catch (err) {
      console.error('[AnnouncementFeedView] Failed to load announcements feed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [scope, resolvedContext]);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) {
        loadFeed();
      }
    });
    return () => {
      ignore = true;
    };
  }, [loadFeed]);

  const filteredAnnouncements = useMemo(() => {
    let list = announcements;
    if (activeAudienceFilter !== 'all') {
      list = list.filter((a) => a.audience === activeAudienceFilter);
    }
    if (limit && limit > 0) {
      list = list.slice(0, limit);
    }
    return list;
  }, [announcements, activeAudienceFilter, limit]);

  const handleViewIncremented = (id: string) => {
    setAnnouncements((prev) =>
      prev.map((a) => (a.id === id ? { ...a, viewCount: (a.viewCount || 0) + 1 } : a))
    );
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      {!compact && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-neutral-200">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-neutral-900">{title}</h2>
            <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>
          </div>

          {/* Audience Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
            {(['all', 'school', 'campus', 'class'] as const).map((aud) => (
              <button
                key={aud}
                type="button"
                onClick={() => setActiveAudienceFilter(aud)}
                className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap capitalize ${
                  activeAudienceFilter === aud
                    ? 'bg-neutral-900 text-white shadow-2xs'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70'
                }`}
              >
                {aud === 'all' ? 'All Notices' : aud.charAt(0).toUpperCase() + aud.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Feed List */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-neutral-500 bg-white rounded-2xl border border-neutral-200">
          <div className="inline-block w-5 h-5 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin mb-2" />
          <p>Loading notices...</p>
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <div className="py-10 text-center text-xs text-neutral-500 bg-neutral-50 rounded-2xl border border-neutral-200/80 p-6 space-y-1.5">
          <div className="w-10 h-10 rounded-full bg-neutral-200/60 flex items-center justify-center mx-auto text-neutral-400 mb-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </div>
          <h4 className="font-bold text-neutral-800 text-xs">No active announcements</h4>
          <p className="text-neutral-500 max-w-sm mx-auto">
            There are currently no announcements matching this filter for your school, campus, or class.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAnnouncements.map((item) => (
            <div
              key={item.id}
              className={`p-4 bg-white rounded-2xl border border-neutral-200/80 shadow-2xs hover:border-neutral-300 transition-all ${
                compact ? 'space-y-2' : 'space-y-2.5'
              }`}
            >
              {/* Header: Badges and Date */}
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {item.audience === 'school' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                      School-Wide
                    </span>
                  )}
                  {item.audience === 'campus' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      Campus: {item.campusName || 'Campus'}
                    </span>
                  )}
                  {item.audience === 'class' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                      Class: {item.className || 'Class'}
                    </span>
                  )}

                  {/* Aggregate View Count Badge */}
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-600 border border-neutral-200 inline-flex items-center gap-1">
                    <svg className="w-2.5 h-2.5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    <span>{item.viewCount || 0} views</span>
                  </span>
                </div>

                <span className="text-[11px] text-neutral-400 font-medium shrink-0">
                  {formatDate(item.publishAt)}
                </span>
              </div>

              {/* Title and Excerpt */}
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-neutral-900 line-clamp-1">
                  {item.title}
                </h3>
                <p className="text-xs text-neutral-600 line-clamp-2 mt-1 leading-relaxed">
                  {item.body}
                </p>
              </div>

              {/* Action */}
              <div className="pt-1 flex items-center justify-between text-xs">
                <span className="text-[11px] text-neutral-400">
                  From: <span className="text-neutral-600 font-medium">{item.authorName}</span>
                </span>

                <button
                  type="button"
                  onClick={() => setSelectedAnnouncement(item)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Read Notice</span>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <AnnouncementDetailModal
        isOpen={selectedAnnouncement !== null}
        onClose={() => setSelectedAnnouncement(null)}
        announcement={selectedAnnouncement}
        onViewIncremented={handleViewIncremented}
      />
    </div>
  );
}
