import { getItem, removeItem, setItem, STORAGE_KEYS } from '@/lib/storage';
import { Meta } from '@/types';

export const CURRENT_SCHEMA_VERSION = '1.0.1';

export async function getMeta(): Promise<Meta | null> {
  return getItem<Meta>(STORAGE_KEYS.META);
}

export async function setMeta(meta: Meta): Promise<void> {
  setItem(STORAGE_KEYS.META, meta);
}

export async function clearMeta(): Promise<void> {
  removeItem(STORAGE_KEYS.META);
}
