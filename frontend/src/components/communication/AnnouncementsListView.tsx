'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Announcement,
  AnnouncementFilter,
  AnnouncementStatus,
  AudienceType,
  Campus,
  Class,
  EnrichedAnnouncement,
  Scope,
} from '@/types';
import {
  listEnrichedAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from '@/lib/repositories/announcements';
import { listCampuses } from '@/lib/repositories/campuses';
import { listClasses } from '@/lib/repositories/classes';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useSession } from '@/components/providers/SessionProvider';
import { NavIcon } from '@/components/shell/NavIcon';
import { AnnouncementComposerModal } from './AnnouncementComposerModal';

export interface AnnouncementsListViewProps {
  schoolId: string;
  campusId?: string; // If provided, locks view to a specific campus (e.g. Principal portal)
  title?: string;
  subtitle?: string;
}

function formatDate(isoString?: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function AnnouncementsListView({
  schoolId,
  campusId,
  title = 'Announcements',
  subtitle = 'Broadcast and manage community announcements targeted to the school, specific campuses, or classes.',
}: AnnouncementsListViewProps) {
  const { session } = useSession();
  const { showToast } = useToast();

  const [announcements, setAnnouncements] = useState<EnrichedAnnouncement[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [audienceFilter, setAudienceFilter] = useState<'all' | AudienceType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AnnouncementStatus>('all');

  // Modal states
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const scope: Scope = useMemo(() => ({ schoolId, campusId }), [schoolId, campusId]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const filter: AnnouncementFilter = {
        campusId,
        audience: audienceFilter === 'all' ? undefined : audienceFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchQuery.trim() || undefined,
      };

      const [enriched, campusList, classList] = await Promise.all([
        listEnrichedAnnouncements(scope, filter),
        listCampuses(scope),
        listClasses(scope),
      ]);

      setAnnouncements(enriched);
      setCampuses(campusList);
      setClasses(classList);
    } catch (err) {
      console.error('[AnnouncementsListView] Error loading announcements:', err);
      showToast({ type: 'error', title: 'Error', message: 'Failed to load announcements' });
    } finally {
      setIsLoading(false);
    }
  }, [scope, campusId, audienceFilter, statusFilter, searchQuery, showToast]);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore) {
        loadData();
      }
    });
    return () => {
      ignore = true;
    };
  }, [loadData]);

  // Metric counts computed from loaded announcements (or unfiltered)
  const activeCount = announcements.filter((a) => a.status === 'active').length;
  const scheduledCount = announcements.filter((a) => a.status === 'scheduled').length;
  const expiredCount = announcements.filter((a) => a.status === 'expired').length;

  const handleSaveAnnouncement = async (data: {
    title: string;
    body: string;
    audience: AudienceType;
    campusId?: string;
    classId?: string;
    publishAt: string;
    expiresAt?: string;
  }) => {
    const authorId = session?.userId || 'usr_admin';

    if (editingAnnouncement) {
      await updateAnnouncement(editingAnnouncement.id, {
        ...data,
      });
      showToast({
        type: 'success',
        title: 'Announcement updated',
        message: 'Announcement changes have been saved.',
      });
      setEditingAnnouncement(null);
    } else {
      await createAnnouncement({
        schoolId,
        authorId,
        ...data,
      });
      showToast({
        type: 'success',
        title: 'Announcement published',
        message: 'Your announcement has been broadcast successfully.',
      });
    }

    setIsComposerOpen(false);
    await loadData();
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteAnnouncement(deletingId);
      showToast({
        type: 'success',
        title: 'Announcement deleted',
        message: 'The announcement has been permanently removed.',
      });
      setDeletingId(null);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete announcement';
      showToast({ type: 'error', title: 'Error', message: msg });
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
            {title}
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">{subtitle}</p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setEditingAnnouncement(null);
            setIsComposerOpen(true);
          }}
          className="font-bold shadow-xs shrink-0 self-start sm:self-auto"
          leftIcon={<NavIcon name="plus" className="w-4 h-4" />}
        >
          Compose Announcement
        </Button>
      </div>

      {/* KPI Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-neutral-200/80 shadow-2xs">
          <span className="text-xs font-medium text-neutral-500 block">Total Announcements</span>
          <span className="text-xl font-extrabold text-neutral-900 mt-0.5 block">
            {announcements.length}
          </span>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-neutral-200/80 shadow-2xs">
          <span className="text-xs font-medium text-neutral-500 block">Active &amp; Visible</span>
          <span className="text-xl font-extrabold text-emerald-600 mt-0.5 block">
            {activeCount}
          </span>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-neutral-200/80 shadow-2xs">
          <span className="text-xs font-medium text-neutral-500 block">Scheduled</span>
          <span className="text-xl font-extrabold text-amber-600 mt-0.5 block">
            {scheduledCount}
          </span>
        </div>
        <div className="p-4 bg-white rounded-2xl border border-neutral-200/80 shadow-2xs">
          <span className="text-xs font-medium text-neutral-500 block">Expired</span>
          <span className="text-xl font-extrabold text-neutral-500 mt-0.5 block">
            {expiredCount}
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3.5 bg-white rounded-2xl border border-neutral-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative flex-1">
          <svg
            className="w-4 h-4 text-neutral-500 absolute left-3 top-2.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search announcements by title or content..."
            className="w-full pl-9 pr-3 py-2 bg-neutral-50 rounded-xl border border-neutral-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-neutral-800"
          />
        </div>

        {/* Audience Segment Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          <span className="text-neutral-500 font-semibold px-1 shrink-0">Audience:</span>
          {(['all', 'school', 'campus', 'class'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setAudienceFilter(tab)}
              className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors capitalize shrink-0 ${
                audienceFilter === tab
                  ? 'bg-neutral-900 text-white shadow-2xs'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              {tab === 'all' ? 'All Audiences' : tab}
            </button>
          ))}
        </div>

        {/* Status Segment Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          <span className="text-neutral-500 font-semibold px-1 shrink-0">Status:</span>
          {(['all', 'active', 'scheduled', 'expired'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setStatusFilter(tab)}
              className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors capitalize shrink-0 ${
                statusFilter === tab
                  ? 'bg-neutral-900 text-white shadow-2xs'
                  : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              {tab === 'all' ? 'All' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Announcements List */}
      {isLoading ? (
        <div className="py-20 text-center text-xs text-neutral-500 bg-white rounded-2xl border border-neutral-200">
          <div className="inline-block w-6 h-6 border-2 border-neutral-300 border-t-neutral-800 rounded-full animate-spin mb-2" />
          <p>Loading announcements...</p>
        </div>
      ) : announcements.length === 0 ? (
        <div className="py-16 text-center text-xs text-neutral-500 bg-white rounded-2xl border border-neutral-200 space-y-2 p-6">
          <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-500 mb-2">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </div>
          <h3 className="font-bold text-neutral-800 text-sm">No announcements found</h3>
          <p className="max-w-md mx-auto text-neutral-500">
            No announcements match your current filter settings. Click &quot;Compose Announcement&quot; to publish your first update.
          </p>
          <div className="pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSearchQuery('');
                setAudienceFilter('all');
                setStatusFilter('all');
              }}
            >
              Reset Filters
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          {announcements.map((item) => {
            return (
              <div
                key={item.id}
                className="p-5 bg-white rounded-2xl border border-neutral-200/90 shadow-2xs hover:shadow-xs transition-shadow space-y-3"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2.5">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-sm sm:text-base text-neutral-900 break-words">
                        {item.title}
                      </h3>

                      {/* Status Pill */}
                      {item.status === 'active' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                      )}
                      {item.status === 'scheduled' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          Scheduled
                        </span>
                      )}
                      {item.status === 'expired' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-600 border border-neutral-200">
                          Expired
                        </span>
                      )}

                      {/* Audience Badge */}
                      {item.audience === 'school' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          School-Wide
                        </span>
                      )}
                      {item.audience === 'campus' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Campus: {item.campusName || 'Specified Campus'}
                        </span>
                      )}
                      {item.audience === 'class' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                          Class: {item.className || 'Specified Class'}
                        </span>
                      )}

                      {/* Aggregate View Count Badge */}
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-700 border border-neutral-200 inline-flex items-center gap-1">
                        <svg className="w-3 h-3 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

                    <p className="text-xs text-neutral-700 leading-relaxed whitespace-pre-wrap">
                      {item.body}
                    </p>
                  </div>

                  {/* Actions (Edit / Delete) */}
                  <div className="flex items-center gap-1.5 self-end sm:self-start shrink-0 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAnnouncement(item);
                        setIsComposerOpen(true);
                      }}
                      className="px-2.5 py-1 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg font-semibold transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(item.id)}
                      className="px-2.5 py-1 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg font-semibold transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Footer Metadata */}
                <div className="pt-2 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-3 text-[11px] text-neutral-500">
                  <div className="flex items-center gap-3">
                    <span>
                      Published: <strong className="text-neutral-700 font-semibold">{formatDate(item.publishAt)}</strong>
                    </span>
                    {item.expiresAt && (
                      <span>
                        Expires: <strong className="text-neutral-700 font-semibold">{formatDate(item.expiresAt)}</strong>
                      </span>
                    )}
                  </div>
                  <div>
                    Author: <span className="font-semibold text-neutral-700">{item.authorName}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Announcement Composer Modal */}
      <AnnouncementComposerModal
        isOpen={isComposerOpen}
        onClose={() => {
          setIsComposerOpen(false);
          setEditingAnnouncement(null);
        }}
        onSave={handleSaveAnnouncement}
        initialAnnouncement={editingAnnouncement}
        campuses={campuses}
        classes={classes}
        defaultCampusId={campusId}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        title="Delete Announcement"
        description="Are you sure you want to remove this announcement? It will be immediately removed from parent and student feeds."
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
            <NavIcon name="alert-triangle" className="w-4 h-4 shrink-0 text-rose-500" />
            <span>This announcement will be permanently deleted. This action cannot be undone.</span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setDeletingId(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Delete Announcement
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
