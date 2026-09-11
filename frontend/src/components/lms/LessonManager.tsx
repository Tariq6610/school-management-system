'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Lesson, Scope, LessonContentType } from '@/types';
import {
  listLessons,
  createLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
  moveLesson,
} from '@/lib/repositories/lessons';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { LessonModal } from './LessonModal';
import { LessonContentPreview } from './LessonContentPreview';

export interface LessonManagerProps {
  courseId: string;
  courseTitle: string;
  schoolId: string;
  campusId?: string;
  initialLessons?: Lesson[];
}

export function LessonManager({
  courseId,
  courseTitle,
  schoolId,
  campusId,
  initialLessons,
}: LessonManagerProps) {
  const { showToast } = useToast();
  const [lessons, setLessons] = useState<Lesson[]>(initialLessons || []);
  const [loading, setLoading] = useState<boolean>(!initialLessons);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [deletingLessonId, setDeletingLessonId] = useState<string | null>(null);
  const [previewLesson, setPreviewLesson] = useState<Lesson | null>(null);

  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  // Load lessons
  const loadLessons = useCallback(async () => {
    try {
      setLoading(true);
      const scope: Scope = { schoolId, campusId };
      const data = await listLessons(scope, courseId);
      setLessons(data);
    } catch (err) {
      console.error('Failed to load lessons', err);
      showToast({ type: 'error', title: 'Error', message: 'Could not load course lessons' });
    } finally {
      setLoading(false);
    }
  }, [courseId, schoolId, campusId, showToast]);

  useEffect(() => {
    let ignore = false;
    Promise.resolve().then(() => {
      if (!ignore && !initialLessons) {
        loadLessons();
      }
    });
    return () => {
      ignore = true;
    };
  }, [initialLessons, loadLessons]);

  // Handle Save (Create or Update)
  const handleSaveLesson = async (data: {
    title: string;
    contentType: LessonContentType;
    contentUrl?: string;
    body?: string;
    durationMinutes?: number;
  }) => {
    if (editingLesson) {
      await updateLesson(editingLesson.id, {
        title: data.title,
        contentType: data.contentType,
        contentUrl: data.contentUrl,
        body: data.body,
        durationMinutes: data.durationMinutes,
      });
      showToast({ type: 'success', title: 'Lesson updated' });
      setEditingLesson(null);
    } else {
      await createLesson({
        schoolId,
        courseId,
        title: data.title,
        contentType: data.contentType,
        orderIndex: lessons.length,
        contentUrl: data.contentUrl,
        body: data.body,
        durationMinutes: data.durationMinutes,
      });
      showToast({ type: 'success', title: 'Lesson created' });
      setIsAddModalOpen(false);
    }
    await loadLessons();
  };

  // Handle Delete
  const handleDeleteLesson = async () => {
    if (!deletingLessonId) return;
    try {
      await deleteLesson(deletingLessonId);
      showToast({ type: 'success', title: 'Lesson deleted' });
      setDeletingLessonId(null);
      await loadLessons();
    } catch (err) {
      console.error('Failed to delete lesson', err);
      showToast({ type: 'error', title: 'Failed to delete lesson' });
    }
  };

  // Handle accessible Move Up / Move Down
  const handleMove = async (lessonId: string, direction: 'up' | 'down') => {
    try {
      setIsReordering(true);
      const updated = await moveLesson(courseId, lessonId, direction);
      setLessons(updated);
      showToast({ type: 'success', title: `Lesson moved ${direction}` });
    } catch (err) {
      console.error('Failed to move lesson', err);
      showToast({ type: 'error', title: 'Failed to reorder lessons' });
    } finally {
      setIsReordering(false);
    }
  };

  // HTML5 Drag and drop handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      handleDragEnd();
      return;
    }

    try {
      setIsReordering(true);
      const updated = [...lessons];
      const [draggedItem] = updated.splice(draggedIndex, 1);
      updated.splice(dropIndex, 0, draggedItem);

      // Optimistic state
      setLessons(updated);

      // Persist new order IDs
      const orderedIds = updated.map((l) => l.id);
      const persisted = await reorderLessons(courseId, orderedIds);
      setLessons(persisted);
      showToast({
        type: 'success',
        title: 'Lessons reordered',
        message: 'New curriculum sequence saved.',
      });
    } catch (err) {
      console.error('Failed to reorder lessons', err);
      showToast({ type: 'error', title: 'Failed to persist reordered sequence' });
      await loadLessons();
    } finally {
      handleDragEnd();
      setIsReordering(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-neutral-900">Syllabus Lessons & Units</h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
              {lessons.length} {lessons.length === 1 ? 'Lesson' : 'Lessons'}
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Organizing curriculum units for <span className="font-medium text-neutral-700">{courseTitle}</span>. Drag items using the drag handle to reorder the curriculum sequence, or use accessible Up/Down buttons.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setEditingLesson(null);
            setIsAddModalOpen(true);
          }}
          className="shrink-0"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Lesson</span>
        </Button>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 bg-neutral-100/70 border border-neutral-200 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : lessons.length === 0 ? (
        /* Empty State */
        <div className="bg-white border-2 border-dashed border-neutral-200 rounded-2xl p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900">No lessons created yet</h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
              Structure this course by creating video lectures, PDF attachments, or rich text study notes.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingLesson(null);
              setIsAddModalOpen(true);
            }}
          >
            Create First Lesson
          </Button>
        </div>
      ) : (
        /* Ordered Lessons List with Drag & Drop */
        <div className="space-y-3" role="list" aria-label="Course Lessons List">
          {lessons.map((lesson, index) => {
            const isDragging = draggedIndex === index;
            const isTarget = dragOverIndex === index && draggedIndex !== index;

            return (
              <div
                key={lesson.id}
                role="listitem"
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, index)}
                className={`bg-white border rounded-2xl p-4 transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none ${
                  isDragging
                    ? 'opacity-40 border-purple-500 scale-[0.99] shadow-lg ring-2 ring-purple-500/20'
                    : isTarget
                    ? 'border-purple-600 bg-purple-50/40 translate-y-1 shadow-md'
                    : 'border-neutral-200 hover:border-neutral-300 hover:shadow-xs'
                }`}
              >
                {/* Left section: Grip Handle, Order Index, Type Badge, Title */}
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  {/* Drag Handle */}
                  <div
                    className="cursor-grab active:cursor-grabbing p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-lg transition-colors shrink-0"
                    title="Drag to reorder lesson"
                    aria-label="Drag handle"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 8h16M4 16h16"
                      />
                    </svg>
                  </div>

                  {/* Order Number Badge */}
                  <div className="w-7 h-7 rounded-xl bg-neutral-100 text-neutral-800 font-mono text-xs font-bold flex items-center justify-center shrink-0 border border-neutral-200/80">
                    {index + 1}
                  </div>

                  {/* Content Type Pill Badge */}
                  <div className="shrink-0">
                    {lesson.contentType === 'video' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200/60">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                        <span>Video ({lesson.durationMinutes ?? 30}m)</span>
                      </span>
                    )}

                    {lesson.contentType === 'pdf' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200/60">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                          />
                        </svg>
                        <span>PDF Document</span>
                      </span>
                    )}

                    {lesson.contentType === 'notes' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <span>Rich Notes</span>
                      </span>
                    )}
                  </div>

                  {/* Title & Preview Text */}
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-neutral-900 truncate">
                      {lesson.title}
                    </h3>
                    <p className="text-xs text-neutral-500 truncate max-w-md">
                      {lesson.body || lesson.contentUrl || 'Curriculum unit material'}
                    </p>
                  </div>
                </div>

                {/* Right section: Accessible Reorder Arrows & Action buttons */}
                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-neutral-100">
                  {/* Accessible Up / Down Buttons */}
                  <div className="flex items-center gap-1 bg-neutral-50 p-1 rounded-xl border border-neutral-200/80">
                    <button
                      type="button"
                      disabled={index === 0 || isReordering}
                      onClick={() => handleMove(lesson.id, 'up')}
                      className="p-1 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/80 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                      title="Move up"
                      aria-label={`Move ${lesson.title} up`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      disabled={index === lessons.length - 1 || isReordering}
                      onClick={() => handleMove(lesson.id, 'down')}
                      className="p-1 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/80 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                      title="Move down"
                      aria-label={`Move ${lesson.title} down`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {/* Preview Button */}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setPreviewLesson(lesson)}
                    className="text-xs font-semibold px-2.5 py-1.5"
                    title="Preview player or document placeholder"
                  >
                    Preview
                  </Button>

                  {/* Edit Button */}
                  <button
                    type="button"
                    onClick={() => setEditingLesson(lesson)}
                    className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors text-xs font-semibold"
                    title="Edit lesson details"
                  >
                    Edit
                  </button>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => setDeletingLessonId(lesson.id)}
                    className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors text-xs font-semibold"
                    title="Delete lesson"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lesson Modal (Create / Edit) */}
      <LessonModal
        isOpen={isAddModalOpen || editingLesson !== null}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingLesson(null);
        }}
        onSave={handleSaveLesson}
        initialLesson={editingLesson}
        lessonCount={lessons.length}
      />

      {/* Lesson Content Preview Modal */}
      <LessonContentPreview
        isOpen={previewLesson !== null}
        onClose={() => setPreviewLesson(null)}
        lesson={previewLesson}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deletingLessonId !== null}
        onClose={() => setDeletingLessonId(null)}
        title="Delete Lesson"
        description="Are you sure you want to remove this lesson from the curriculum sequence? This action cannot be undone."
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>The lesson will be permanently deleted and remaining lessons will stay in sequence.</span>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setDeletingLessonId(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleDeleteLesson}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Delete Lesson
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
