'use client';

import React, { useState } from 'react';
import { Lesson, LessonContentType } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export interface LessonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    title: string;
    contentType: LessonContentType;
    contentUrl?: string;
    body?: string;
    durationMinutes?: number;
  }) => Promise<void>;
  initialLesson?: Lesson | null;
  lessonCount?: number;
}

export function LessonModal({
  isOpen,
  onClose,
  onSave,
  initialLesson,
}: LessonModalProps) {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialLesson ? 'Edit Lesson' : 'Add New Lesson'}
      description="Create or update curriculum unit content. Drag to reorder lessons once created."
      size="lg"
    >
      <LessonForm
        key={initialLesson?.id ?? 'new-lesson'}
        initialLesson={initialLesson}
        onClose={onClose}
        onSave={onSave}
      />
    </Modal>
  );
}

interface LessonFormProps {
  initialLesson?: Lesson | null;
  onClose: () => void;
  onSave: (data: {
    title: string;
    contentType: LessonContentType;
    contentUrl?: string;
    body?: string;
    durationMinutes?: number;
  }) => Promise<void>;
}

function LessonForm({ initialLesson, onClose, onSave }: LessonFormProps) {
  const [title, setTitle] = useState(initialLesson?.title || '');
  const [contentType, setContentType] = useState<LessonContentType>(
    initialLesson?.contentType || 'notes'
  );
  const [durationMinutes, setDurationMinutes] = useState<number | ''>(
    initialLesson?.durationMinutes || 30
  );
  const [contentUrl, setContentUrl] = useState(initialLesson?.contentUrl || '');
  const [body, setBody] = useState(initialLesson?.body || '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Lesson title is required');
      return;
    }

    if (contentType === 'video' && (!durationMinutes || Number(durationMinutes) <= 0)) {
      setError('Please provide a positive video duration in minutes');
      return;
    }

    if (contentType === 'notes' && !body.trim()) {
      setError('Please provide study notes content for this lesson');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSave({
        title: title.trim(),
        contentType,
        contentUrl: contentUrl.trim() || undefined,
        body: body.trim() || undefined,
        durationMinutes:
          contentType === 'video' && typeof durationMinutes === 'number'
            ? durationMinutes
            : undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save lesson');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
            <svg
              className="w-4 h-4 shrink-0 text-rose-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Lesson Title */}
        <div>
          <label className="block text-xs font-semibold text-neutral-800 mb-1">
            Lesson Title <span className="text-rose-600">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Chapter 3: Newton's Laws of Motion & Practice"
            className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 transition-colors"
            required
            autoFocus
          />
        </div>

        {/* Content Type Selector Tabs */}
        <div>
          <label className="block text-xs font-semibold text-neutral-800 mb-2">
            Content Type <span className="text-rose-600">*</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {/* Video Option */}
            <button
              type="button"
              onClick={() => setContentType('video')}
              className={`p-3 rounded-xl border text-left flex flex-col items-start gap-1.5 transition-all ${
                contentType === 'video'
                  ? 'border-purple-600 bg-purple-50/70 text-purple-900 shadow-xs ring-2 ring-purple-600/20'
                  : 'border-neutral-200 hover:border-neutral-300 bg-white text-neutral-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-purple-100 text-purple-700">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </span>
                <span className="text-xs font-bold">Video Lesson</span>
              </div>
              <p className="text-[11px] text-neutral-500 line-clamp-1">
                Player placeholder with duration
              </p>
            </button>

            {/* PDF Option */}
            <button
              type="button"
              onClick={() => setContentType('pdf')}
              className={`p-3 rounded-xl border text-left flex flex-col items-start gap-1.5 transition-all ${
                contentType === 'pdf'
                  ? 'border-rose-600 bg-rose-50/70 text-rose-900 shadow-xs ring-2 ring-rose-600/20'
                  : 'border-neutral-200 hover:border-neutral-300 bg-white text-neutral-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                    />
                  </svg>
                </span>
                <span className="text-xs font-bold">PDF Document</span>
              </div>
              <p className="text-[11px] text-neutral-500 line-clamp-1">
                Document reader placeholder
              </p>
            </button>

            {/* Notes Option */}
            <button
              type="button"
              onClick={() => setContentType('notes')}
              className={`p-3 rounded-xl border text-left flex flex-col items-start gap-1.5 transition-all ${
                contentType === 'notes'
                  ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 shadow-xs ring-2 ring-emerald-600/20'
                  : 'border-neutral-200 hover:border-neutral-300 bg-white text-neutral-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </span>
                <span className="text-xs font-bold">Rich Notes</span>
              </div>
              <p className="text-[11px] text-neutral-500 line-clamp-1">
                Formatted lecture notes & text
              </p>
            </button>
          </div>
        </div>

        {/* Content-Type Specific Details */}
        {contentType === 'video' && (
          <div className="space-y-4 p-4 rounded-xl bg-purple-50/50 border border-purple-100">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-900">
              <span>Video Configuration</span>
              <span className="text-[10px] font-normal text-purple-700 bg-purple-100/80 px-2 py-0.5 rounded-full">
                Player Placeholder
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Duration (minutes) <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="300"
                  value={durationMinutes}
                  onChange={(e) =>
                    setDurationMinutes(e.target.value === '' ? '' : parseInt(e.target.value, 10))
                  }
                  className="w-full text-sm px-3.5 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 transition-colors bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-800 mb-1">
                  Video Stream URL / Embed Link
                </label>
                <input
                  type="text"
                  value={contentUrl}
                  onChange={(e) => setContentUrl(e.target.value)}
                  placeholder="https://example.com/lecture-video.mp4"
                  className="w-full text-sm px-3.5 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 transition-colors bg-white font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-800 mb-1">
                Video Description / Overview
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                placeholder="Key concepts covered in this video lecture and suggested timestamps..."
                className="w-full text-sm px-3.5 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 transition-colors bg-white"
              />
            </div>
          </div>
        )}

        {contentType === 'pdf' && (
          <div className="space-y-4 p-4 rounded-xl bg-rose-50/50 border border-rose-100">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-900">
              <span>PDF Document Attachment</span>
              <span className="text-[10px] font-normal text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-full">
                Document Placeholder
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-800 mb-1">
                PDF Document URL or File Name
              </label>
              <input
                type="text"
                value={contentUrl}
                onChange={(e) => setContentUrl(e.target.value)}
                placeholder="/documents/chapter_syllabus.pdf"
                className="w-full text-sm px-3.5 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-rose-600/30 focus:border-rose-600 transition-colors bg-white font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-800 mb-1">
                Reading Notes / Chapter Guide
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                placeholder="Instructions for students reading this document: which sections to focus on, problem sheets to prepare..."
                className="w-full text-sm px-3.5 py-2 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-rose-600/30 focus:border-rose-600 transition-colors bg-white"
              />
            </div>
          </div>
        )}

        {contentType === 'notes' && (
          <div className="space-y-3 p-4 rounded-xl bg-emerald-50/50 border border-emerald-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                <span>Rich Lecture Notes</span>
                <span className="text-[10px] font-normal text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                  Rich Text Content
                </span>
              </div>
              <span className="text-[11px] text-emerald-700">Supports Markdown syntax</span>
            </div>

            <div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                placeholder="Write comprehensive lecture notes, key definitions, bullet points, and exercises for students..."
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-colors bg-white font-mono text-xs leading-relaxed"
                required
              />
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-200">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : initialLesson ? 'Update Lesson' : 'Create Lesson'}
          </Button>
        </div>
      </form>
  );
}

