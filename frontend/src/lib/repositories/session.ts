import { getItem, removeItem, setItem, STORAGE_KEYS } from '@/lib/storage';
import { Session } from '@/types';

export async function getSession(): Promise<Session | null> {
  return getItem<Session>(STORAGE_KEYS.SESSION);
}

export async function setSession(session: Session): Promise<void> {
  setItem(STORAGE_KEYS.SESSION, session);
}

export async function clearSession(): Promise<void> {
  removeItem(STORAGE_KEYS.SESSION);
}
