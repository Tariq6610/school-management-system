/**
 * Primary storage gateway for the School Management Platform prototype.
 * NOTE: This is the ONLY module in the entire application that directly accesses window.localStorage.
 */

import { StorageQuotaError, isQuotaError } from './errors';
import { STORAGE_KEYS, STORAGE_PREFIX } from './keys';

export { StorageQuotaError, isQuotaError, STORAGE_KEYS, STORAGE_PREFIX };

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

/**
 * Retrieve and parse a JSON item from localStorage.
 * Returns defaultValue if item is not found, or if JSON parsing fails.
 */
export function getItem<T>(key: string): T | null;
export function getItem<T>(key: string, defaultValue: T): T;
export function getItem<T>(key: string, defaultValue: T | null = null): T | null {
  if (!isBrowser()) {
    return defaultValue;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) {
      return defaultValue;
    }
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`[storage] Failed to read/parse key "${key}":`, error);
    return defaultValue;
  }
}

/**
 * Serialize and persist a value to localStorage.
 * Catches QuotaExceededError and throws a typed StorageQuotaError.
 */
export function setItem<T>(key: string, value: T): void {
  if (!isBrowser()) {
    return;
  }

  try {
    const serialized = JSON.stringify(value);
    window.localStorage.setItem(key, serialized);
  } catch (error: unknown) {
    if (isQuotaError(error)) {
      throw new StorageQuotaError(
        `Storage quota exceeded while saving key "${key}". Reset demo data in Settings to free space.`,
        error
      );
    }
    throw error;
  }
}

/**
 * Remove an item by key from localStorage.
 */
export function removeItem(key: string): void {
  if (!isBrowser()) {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn(`[storage] Failed to remove key "${key}":`, error);
  }
}

/**
 * Remove all keys matching the specified prefix (defaults to 'sp:v1:').
 */
export function clearPrefix(prefix: string = STORAGE_PREFIX): void {
  if (!isBrowser()) {
    return;
  }

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      window.localStorage.removeItem(key);
    }
  } catch (error) {
    console.warn(`[storage] Failed to clear prefix "${prefix}":`, error);
  }
}

/**
 * Return all keys currently in localStorage matching a prefix.
 */
export function getAllKeys(prefix: string = STORAGE_PREFIX): string[] {
  if (!isBrowser()) {
    return [];
  }

  const matchingKeys: string[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        matchingKeys.push(key);
      }
    }
  } catch (error) {
    console.warn(`[storage] Failed to list keys with prefix "${prefix}":`, error);
  }
  return matchingKeys;
}

/**
 * Estimate storage consumption in bytes for keys matching prefix.
 */
export function getStorageUsage(prefix: string = STORAGE_PREFIX): { bytes: number; formatted: string } {
  if (!isBrowser()) {
    return { bytes: 0, formatted: '0 KB' };
  }

  let totalBytes = 0;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        const val = window.localStorage.getItem(key) ?? '';
        totalBytes += key.length + val.length; // Serialized string payload (1 char = 1 byte in UTF-8)
      }
    }
  } catch (error) {
    console.warn('[storage] Failed to calculate storage usage:', error);
  }

  const kb = totalBytes / 1024;
  const formatted = kb > 1024 ? `${(kb / 1024).toFixed(2)} MB` : `${kb.toFixed(1)} KB`;

  return { bytes: totalBytes, formatted };
}
