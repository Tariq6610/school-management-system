'use client';

import React from 'react';
import { Lesson } from '@/types';
import { Modal } from '@/components/ui/Modal';

export interface LessonContentPreviewProps {
  lesson: Lesson | null;
  isOpen: boolean;
  onClose: () => void;
}

export function LessonContentPreview({ lesson, isOpen, onClose }: LessonContentPreviewProps) {
  if (!lesson) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={lesson.title}
      description={`Lesson ${lesson.orderIndex + 1} — Content Type: ${lesson.contentType.toUpperCase()}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* Content Type Presentation */}
        {lesson.contentType === 'video' && (
          <div className="space-y-4">
            {/* Mock Video Player Placeholder */}
            <div className="relative aspect-video w-full rounded-2xl bg-neutral-900 overflow-hidden flex flex-col justify-between p-4 sm:p-6 shadow-inner text-white border border-neutral-800">
              {/* Top info overlay */}
              <div className="flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-300">
                    HD 1080p Stream
                  </span>
                </div>
                <span className="text-xs font-mono bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full text-white">
                  {lesson.durationMinutes ?? 30} mins
                </span>
              </div>

              {/* Center Play Button Placeholder */}
              <div className="flex flex-col items-center justify-center gap-3 z-10">
                <div className="w-16 h-16 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform cursor-pointer backdrop-blur-sm border border-white/20">
                  <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
                <span className="text-xs text-neutral-400 font-medium">Click to resume lecture stream</span>
              </div>

              {/* Bottom Controls Placeholder */}
              <div className="space-y-2 z-10">
                <div className="w-full bg-neutral-700/80 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full w-1/3 rounded-full" />
                </div>
                <div className="flex items-center justify-between text-[11px] text-neutral-400 font-mono">
                  <span>10:24</span>
                  <span>{lesson.durationMinutes ?? 30}:00</span>
                </div>
              </div>

              {/* Subtle background glow */}
              <div className="absolute inset-0 bg-radial from-purple-900/20 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* Video Meta Info */}
            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-800">Source Stream / URL</span>
                <span className="text-xs font-mono text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                  {lesson.contentUrl || 'https://lms.academy.internal/stream/mp4-default'}
                </span>
              </div>
              {lesson.body && (
                <div className="pt-2 border-t border-neutral-200/60">
                  <h4 className="text-xs font-bold text-neutral-700 mb-1">Lecture Outline</h4>
                  <p className="text-xs text-neutral-600 whitespace-pre-line leading-relaxed">
                    {lesson.body}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {lesson.contentType === 'pdf' && (
          <div className="space-y-4">
            {/* Mock PDF Document Viewer Placeholder */}
            <div className="rounded-2xl border border-neutral-200 bg-neutral-100 p-6 sm:p-8 flex flex-col items-center justify-center text-center shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-xs mb-3">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-neutral-900">
                {lesson.contentUrl?.split('/').pop() || `${lesson.title}.pdf`}
              </h3>
              <p className="text-xs text-neutral-500 mt-1 max-w-sm">
                Document viewer placeholder. Real PDF files are not stored in prototype mode per specification.
              </p>

              <div className="mt-4 flex items-center gap-3">
                <span className="text-xs font-mono bg-white px-3 py-1 rounded-lg border border-neutral-300 text-neutral-700 shadow-2xs">
                  Format: Adobe PDF (1.4 MB)
                </span>
                <span className="text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-lg border border-rose-200">
                  Document Ready
                </span>
              </div>
            </div>

            {/* Accompanying reading guide */}
            {lesson.body && (
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1">
                <h4 className="text-xs font-bold text-neutral-800">Reading Guidance</h4>
                <p className="text-xs text-neutral-600 whitespace-pre-line leading-relaxed">
                  {lesson.body}
                </p>
              </div>
            )}
          </div>
        )}

        {lesson.contentType === 'notes' && (
          <div className="space-y-4">
            {/* Rich Text Notes Viewer */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-neutral-100 text-xs font-semibold text-neutral-500">
                <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span>Curriculum Study Document & Markdown Render</span>
              </div>

              <div className="prose prose-sm max-w-none text-neutral-800 leading-relaxed space-y-3">
                <div className="whitespace-pre-line font-normal text-xs sm:text-sm text-neutral-700">
                  {lesson.body || 'No rich text notes added for this lesson.'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
