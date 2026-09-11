import { STORAGE_KEYS } from '@/lib/storage';
import {
  Announcement,
  AnnouncementFilter,
  AnnouncementStatus,
  EnrichedAnnouncement,
  ID,
  NewAnnouncement,
  Scope,
} from '@/types';
import {
  createCollectionItem,
  deleteCollectionItem,
  getCollectionItem,
  listCollection,
  updateCollectionItem,
} from './base';
import { listCampuses } from './campuses';
import { listClasses } from './classes';
import { listUsers } from './users';
import { logWhatsAppMessage } from './whatsappLog';
import { getSettings } from './settings';

/**
 * Computes the temporal status of an announcement (active, scheduled, or expired).
 */
export function getAnnouncementStatus(
  announcement: Announcement,
  now: Date = new Date()
): AnnouncementStatus {
  const nowMs = now.getTime();
  const publishMs = new Date(announcement.publishAt).getTime();

  if (announcement.expiresAt) {
    const expireMs = new Date(announcement.expiresAt).getTime();
    if (nowMs > expireMs) {
      return 'expired';
    }
  }

  if (nowMs < publishMs) {
    return 'scheduled';
  }

  return 'active';
}

/**
 * Validates announcement input data ensuring audience targeting and date rules are respected.
 */
function validateAnnouncement(input: Partial<NewAnnouncement>): void {
  if (!input.title || !input.title.trim()) {
    throw new Error('Announcement title is required');
  }
  if (!input.body || !input.body.trim()) {
    throw new Error('Announcement message body is required');
  }
  if (!input.audience || !['school', 'campus', 'class'].includes(input.audience)) {
    throw new Error('Valid target audience (school, campus, or class) is required');
  }

  if (input.audience === 'campus') {
    if (!input.campusId || !input.campusId.trim()) {
      throw new Error('Campus selection is required for campus-targeted announcements');
    }
  }

  if (input.audience === 'class') {
    if (!input.campusId || !input.campusId.trim()) {
      throw new Error('Campus selection is required for class-targeted announcements');
    }
    if (!input.classId || !input.classId.trim()) {
      throw new Error('Class selection is required for class-targeted announcements');
    }
  }

  if (!input.publishAt || isNaN(Date.parse(input.publishAt))) {
    throw new Error('A valid publish date and time is required');
  }

  if (input.expiresAt && input.expiresAt.trim()) {
    if (isNaN(Date.parse(input.expiresAt))) {
      throw new Error('Expiry date must be a valid date and time');
    }
    const publishMs = new Date(input.publishAt).getTime();
    const expireMs = new Date(input.expiresAt).getTime();
    if (expireMs <= publishMs) {
      throw new Error('Expiry date must be after the publication date');
    }
  }
}

export async function listAnnouncements(
  scope: Scope,
  filter?: AnnouncementFilter
): Promise<Announcement[]> {
  return listCollection<Announcement>(STORAGE_KEYS.ANNOUNCEMENTS, scope, (item) => {
    if (filter?.audience && item.audience !== filter.audience) return false;
    if (filter?.campusId && item.campusId !== filter.campusId) return false;
    if (filter?.classId && item.classId !== filter.classId) return false;
    if (filter?.search) {
      const q = filter.search.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchBody = item.body.toLowerCase().includes(q);
      if (!matchTitle && !matchBody) return false;
    }
    return true;
  });
}

export async function getAnnouncement(id: ID): Promise<Announcement | null> {
  return getCollectionItem<Announcement>(STORAGE_KEYS.ANNOUNCEMENTS, id);
}

/**
 * Creates a new announcement with audience targeting (school, campus, or class).
 * If published immediately (publishAt <= now), automatically logs to WhatsApp mock log
 * per FEATURE_SPECIFICATIONS.md §13 & §16.
 */
export async function createAnnouncement(input: NewAnnouncement): Promise<Announcement> {
  validateAnnouncement(input);

  const payload: Omit<Announcement, 'id'> = {
    schoolId: input.schoolId,
    campusId: input.audience === 'school' ? undefined : input.campusId,
    classId: input.audience === 'class' ? input.classId : undefined,
    title: input.title.trim(),
    body: input.body.trim(),
    authorId: input.authorId,
    audience: input.audience,
    publishAt: new Date(input.publishAt).toISOString(),
    expiresAt: input.expiresAt && input.expiresAt.trim() ? new Date(input.expiresAt).toISOString() : undefined,
    viewCount: 0,
  };

  const created = await createCollectionItem<Announcement>(
    STORAGE_KEYS.ANNOUNCEMENTS,
    payload,
    'anc'
  );

  // If published immediately or in past, append to WhatsApp mock log
  const now = new Date();
  const publishDate = new Date(created.publishAt);
  if (publishDate.getTime() <= now.getTime()) {
    try {
      const settings = await getSettings({ schoolId: created.schoolId });
      const campuses = await listCampuses({ schoolId: created.schoolId });
      const targetCampus = created.campusId
        ? campuses.find((c) => c.id === created.campusId)
        : null;
      const campusLabel = targetCampus ? targetCampus.name : (settings.branding.schoolName || 'ABC School Network');

      await logWhatsAppMessage({
        schoolId: created.schoolId,
        recipientPhone: '+923001234567',
        recipientName: 'All Registered Parents',
        template: '{title}\n\n{body}\n— {campus}',
        body: `${created.title}\n\n${created.body}\n— ${campusLabel}`,
        trigger: 'Announcement',
        sentAt: now.toISOString(),
        status: 'delivered',
      });
    } catch (err) {
      console.warn('[Announcements] Failed to append to WhatsApp mock log:', err);
    }
  }

  return created;
}

export async function incrementAnnouncementViews(id: ID): Promise<Announcement> {
  const anc = await getAnnouncement(id);
  if (!anc) {
    throw new Error(`Announcement with id "${id}" not found`);
  }
  return updateCollectionItem<Announcement>(STORAGE_KEYS.ANNOUNCEMENTS, id, {
    viewCount: (anc.viewCount || 0) + 1,
  });
}

export async function updateAnnouncement(
  id: ID,
  patch: Partial<Announcement>
): Promise<Announcement> {
  const current = await getAnnouncement(id);
  if (!current) {
    throw new Error(`Announcement with id "${id}" not found`);
  }

  const merged = { ...current, ...patch };
  validateAnnouncement(merged);

  return updateCollectionItem<Announcement>(STORAGE_KEYS.ANNOUNCEMENTS, id, {
    ...patch,
    ...(patch.title !== undefined ? { title: patch.title.trim() } : {}),
    ...(patch.body !== undefined ? { body: patch.body.trim() } : {}),
    ...(patch.audience === 'school' ? { campusId: undefined, classId: undefined } : {}),
    ...(patch.audience === 'campus' ? { classId: undefined } : {}),
    ...(patch.publishAt !== undefined ? { publishAt: new Date(patch.publishAt).toISOString() } : {}),
    ...(patch.expiresAt !== undefined
      ? { expiresAt: patch.expiresAt && patch.expiresAt.trim() ? new Date(patch.expiresAt).toISOString() : undefined }
      : {}),
  });
}

export async function deleteAnnouncement(id: ID): Promise<void> {
  return deleteCollectionItem<Announcement>(STORAGE_KEYS.ANNOUNCEMENTS, id);
}

/**
 * Returns enriched announcements with author name, campus name, class name,
 * and computed status (active, scheduled, expired), sorted newest first.
 */
export async function listEnrichedAnnouncements(
  scope: Scope,
  filter?: AnnouncementFilter
): Promise<EnrichedAnnouncement[]> {
  const [announcements, campuses, classes, users] = await Promise.all([
    listAnnouncements(scope, filter),
    listCampuses(scope),
    listClasses(scope),
    listUsers(scope),
  ]);

  const campusMap = new Map(campuses.map((c) => [c.id, c.name]));
  const classMap = new Map(classes.map((cls) => [cls.id, `${cls.grade} (${cls.section})`]));
  const userMap = new Map(users.map((u) => [u.id, u.name]));

  const now = new Date();

  const enriched: EnrichedAnnouncement[] = announcements.map((anc) => {
    const status = getAnnouncementStatus(anc, now);
    return {
      ...anc,
      authorName: userMap.get(anc.authorId) || 'School Administrator',
      campusName: anc.campusId ? campusMap.get(anc.campusId) : undefined,
      className: anc.classId ? classMap.get(anc.classId) : undefined,
      status,
    };
  });

  // Filter by status if specified in filter
  const filtered = filter?.status
    ? enriched.filter((e) => e.status === filter.status)
    : enriched;

  // Sort newest publishAt first
  return filtered.sort((a, b) => {
    const dateA = new Date(a.publishAt).getTime();
    const dateB = new Date(b.publishAt).getTime();
    return dateB - dateA;
  });
}

/**
 * Returns published and active announcements tailored to a student/parent context.
 * Filters by audience targeting:
 * - 'school': visible to everyone.
 * - 'campus': visible if matches student's campus.
 * - 'class': visible if matches student's class.
 * Strictly excludes future scheduled announcements and expired announcements.
 * Acceptance criteria: "Aggregate view counts only" (FEATURE_SPECIFICATIONS.md §13 & PRODUCT_REQUIREMENTS.md §5).
 */
export async function getAudienceAnnouncements(
  scope: Scope,
  studentContext?: { campusId?: ID; classId?: ID }
): Promise<EnrichedAnnouncement[]> {
  const allEnriched = await listEnrichedAnnouncements(scope, { status: 'active' });

  return allEnriched.filter((anc) => {
    if (anc.audience === 'school') {
      return true;
    }
    if (anc.audience === 'campus') {
      if (!studentContext?.campusId) return true;
      return anc.campusId === studentContext.campusId;
    }
    if (anc.audience === 'class') {
      if (!studentContext?.classId) return false;
      return anc.classId === studentContext.classId;
    }
    return false;
  });
}

