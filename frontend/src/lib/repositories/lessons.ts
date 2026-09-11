import { getItem, setItem, STORAGE_KEYS } from '@/lib/storage';
import { ID, Lesson, NewLesson, Scope } from '@/types';
import {
  createCollectionItem,
  deleteCollectionItem,
  getCollectionItem,
  listCollection,
  updateCollectionItem,
} from './base';

export async function listLessons(scope: Scope, courseId: ID): Promise<Lesson[]> {
  const lessons = await listCollection<Lesson>(
    STORAGE_KEYS.LESSONS,
    scope,
    (lesson) => lesson.courseId === courseId
  );
  return lessons.sort((a, b) => a.orderIndex - b.orderIndex);
}

export async function getLesson(id: ID): Promise<Lesson | null> {
  return getCollectionItem<Lesson>(STORAGE_KEYS.LESSONS, id);
}

export async function createLesson(input: NewLesson): Promise<Lesson> {
  if (!input.title || !input.title.trim()) {
    throw new Error('Lesson title is required');
  }
  if (!input.courseId) {
    throw new Error('Lesson must belong to a course');
  }
  if (!['video', 'pdf', 'notes'].includes(input.contentType)) {
    throw new Error('Lesson content type must be video, pdf, or notes');
  }

  // Determine sequential orderIndex if not explicitly provided or invalid
  const allLessons = getItem<Lesson[]>(STORAGE_KEYS.LESSONS, []) ?? [];
  const courseLessons = allLessons.filter((l) => l.courseId === input.courseId);
  const nextOrderIndex =
    typeof input.orderIndex === 'number' && input.orderIndex >= 0
      ? input.orderIndex
      : courseLessons.length;

  const payload: Omit<Lesson, 'id'> = {
    ...input,
    title: input.title.trim(),
    orderIndex: nextOrderIndex,
    body: input.body?.trim() || '',
    contentUrl: input.contentUrl?.trim() || undefined,
    durationMinutes: input.durationMinutes ? Math.max(1, input.durationMinutes) : undefined,
  };

  return createCollectionItem<Lesson>(STORAGE_KEYS.LESSONS, payload, 'lsn');
}

export async function updateLesson(id: ID, patch: Partial<Lesson>): Promise<Lesson> {
  if (patch.title !== undefined && !patch.title.trim()) {
    throw new Error('Lesson title cannot be empty');
  }
  if (patch.contentType !== undefined && !['video', 'pdf', 'notes'].includes(patch.contentType)) {
    throw new Error('Invalid lesson content type');
  }

  return updateCollectionItem<Lesson>(STORAGE_KEYS.LESSONS, id, {
    ...patch,
    ...(patch.title ? { title: patch.title.trim() } : {}),
  });
}

export async function reorderLessons(
  courseId: ID,
  orderedLessonIds: ID[]
): Promise<Lesson[]> {
  const allLessons = getItem<Lesson[]>(STORAGE_KEYS.LESSONS, []) ?? [];
  const updated: Lesson[] = [];

  for (let i = 0; i < orderedLessonIds.length; i++) {
    const lId = orderedLessonIds[i];
    const index = allLessons.findIndex((l) => l.id === lId && l.courseId === courseId);
    if (index >= 0) {
      allLessons[index] = { ...allLessons[index], orderIndex: i };
      updated.push(allLessons[index]);
    }
  }

  setItem(STORAGE_KEYS.LESSONS, allLessons);
  return updated.sort((a, b) => a.orderIndex - b.orderIndex);
}

/**
 * Moves a lesson up or down in the sequence.
 */
export async function moveLesson(
  courseId: ID,
  lessonId: ID,
  direction: 'up' | 'down'
): Promise<Lesson[]> {
  const allLessons = getItem<Lesson[]>(STORAGE_KEYS.LESSONS, []) ?? [];
  const courseLessons = allLessons
    .filter((l) => l.courseId === courseId)
    .sort((a, b) => a.orderIndex - b.orderIndex);

  const currentIndex = courseLessons.findIndex((l) => l.id === lessonId);
  if (currentIndex === -1) return courseLessons;

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= courseLessons.length) {
    return courseLessons;
  }

  // Swap order
  const newOrderedIds = courseLessons.map((l) => l.id);
  const [removed] = newOrderedIds.splice(currentIndex, 1);
  newOrderedIds.splice(targetIndex, 0, removed);

  return reorderLessons(courseId, newOrderedIds);
}

export async function deleteLesson(id: ID): Promise<void> {
  return deleteCollectionItem<Lesson>(STORAGE_KEYS.LESSONS, id);
}
