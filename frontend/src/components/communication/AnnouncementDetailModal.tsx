'use client';

import React, { useEffect, useRef } from 'react';
import { EnrichedAnnouncement } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { incrementAnnouncementViews } from '@/lib/repositories/announcements';

export interface AnnouncementDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  announcement: EnrichedAnnouncement | null;
  onViewIncremented?: (id: string) => void;
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

export function AnnouncementDetailModal({
  isOpen,
  onClose,
  announcement,
  onViewIncremented,
}: AnnouncementDetailModalProps) {
  const incrementedRef = useRef<string | null>(null);

  useEffect(() => {
    if (isOpen && announcement && incrementedRef.current !== announcement.id) {
      incrementedRef.current = announcement.id;
      incrementAnnouncementViews(announcement.id)
        .then(() => {
          if (onViewIncremented) {
            onViewIncremented(announcement.id);
          }
        })
        .catch((err) => {
          console.warn('[AnnouncementDetailModal] Could not increment view count:', err);
        });
    }
  }, [isOpen, announcement, onViewIncremented]);

  if (!isOpen || !announcement) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={announcement.title}
      size="lg"
      className="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Meta Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-neutral-200/80 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Audience Badge */}
            {announcement.audience === 'school' && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                School-Wide Notice
              </span>
            )}
            {announcement.audience === 'campus' && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Campus: {announcement.campusName || 'Campus'}
              </span>
            )}
            {announcement.audience === 'class' && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                Class: {announcement.className || 'Class'}
              </span>
            )}

            {/* Aggregate View Count Pill */}
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
              <span>{announcement.viewCount || 0} views</span>
            </span>
          </div>

          <div className="text-[11px] text-neutral-500">
            Published {formatDate(announcement.publishAt)}
          </div>
        </div>

        {/* Message Body */}
        <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/70 text-neutral-800 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed shadow-2xs max-h-96 overflow-y-auto">
          {announcement.body}
        </div>

        {/* Author Details & Expiry */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-200/80 text-[11px] text-neutral-500">
          <div>
            Broadcasted by: <span className="font-semibold text-neutral-700">{announcement.authorName}</span>
          </div>
          {announcement.expiresAt && (
            <div>
              Valid until: <span className="font-medium text-neutral-600">{formatDate(announcement.expiresAt)}</span>
            </div>
          )}
        </div>

        {/* Modal Close Button */}
        <div className="flex justify-end pt-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close Notice
          </Button>
        </div>
      </div>
    </Modal>
  );
}
