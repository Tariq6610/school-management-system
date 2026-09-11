import { STORAGE_KEYS } from '@/lib/storage';
import { ID, NewNotification, Notification, Scope } from '@/types';
import {
  createCollectionItem,
  deleteCollectionItem,
  getCollectionItem,
  listCollection,
  updateCollectionItem,
} from './base';

export async function listNotifications(
  scope: Scope,
  recipientId: ID
): Promise<Notification[]> {
  const notes = await listCollection<Notification>(
    STORAGE_KEYS.NOTIFICATIONS,
    scope,
    (n) => n.recipientId === recipientId
  );
  return notes.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getNotification(id: ID): Promise<Notification | null> {
  return getCollectionItem<Notification>(STORAGE_KEYS.NOTIFICATIONS, id);
}

export async function createNotification(input: NewNotification): Promise<Notification> {
  const payload = {
    ...input,
    createdAt: input.createdAt || new Date().toISOString(),
  };
  return createCollectionItem<Notification>(STORAGE_KEYS.NOTIFICATIONS, payload, 'ntf');
}

export async function markNotificationAsRead(id: ID): Promise<Notification> {
  return updateCollectionItem<Notification>(STORAGE_KEYS.NOTIFICATIONS, id, {
    readAt: new Date().toISOString(),
  });
}

export async function markNotificationAsUnread(id: ID): Promise<Notification> {
  return updateCollectionItem<Notification>(STORAGE_KEYS.NOTIFICATIONS, id, {
    readAt: undefined,
  });
}

export async function markAllNotificationsAsRead(
  scope: Scope,
  recipientId: ID
): Promise<number> {
  const unreadNotes = await listCollection<Notification>(
    STORAGE_KEYS.NOTIFICATIONS,
    scope,
    (n) => n.recipientId === recipientId && !n.readAt
  );

  const now = new Date().toISOString();
  for (const n of unreadNotes) {
    await updateCollectionItem<Notification>(STORAGE_KEYS.NOTIFICATIONS, n.id, {
      readAt: now,
    });
  }

  return unreadNotes.length;
}

export async function getUnreadNotificationCount(
  scope: Scope,
  recipientId: ID
): Promise<number> {
  const unreadNotes = await listCollection<Notification>(
    STORAGE_KEYS.NOTIFICATIONS,
    scope,
    (n) => n.recipientId === recipientId && !n.readAt
  );
  return unreadNotes.length;
}

export async function deleteNotification(id: ID): Promise<void> {
  return deleteCollectionItem<Notification>(STORAGE_KEYS.NOTIFICATIONS, id);
}
