/**
 * Seed Boot Check and Schema Version Reset
 * Reference: DATA_MODELS.md §1 & §6
 */

import { getMeta, CURRENT_SCHEMA_VERSION } from '@/lib/repositories/meta';
import { getStorageUsage } from '@/lib/storage';
import { Meta } from '@/types';
import { seedDemoNetwork } from './index';

export interface BootResult {
  reseeded: boolean;
  meta: Meta;
  usage: {
    bytes: number;
    formatted: string;
  };
}

/**
 * Ensures the demo dataset is seeded and schema version matches CURRENT_SCHEMA_VERSION.
 * If sp:v1:meta is missing, corrupt, or schemaVersion does not match,
 * wipes existing prototype storage and cleanly reseeds the demo network.
 */
export async function ensureSeeded(options?: { force?: boolean }): Promise<BootResult> {
  const existingMeta = await getMeta();
  const needsReseed =
    options?.force === true ||
    !existingMeta ||
    existingMeta.schemaVersion !== CURRENT_SCHEMA_VERSION;

  if (needsReseed) {
    const usage = await seedDemoNetwork();
    const updatedMeta = await getMeta();

    return {
      reseeded: true,
      meta: updatedMeta ?? {
        schemaVersion: CURRENT_SCHEMA_VERSION,
        seededAt: new Date().toISOString(),
        seedProfile: 'demo-network',
      },
      usage,
    };
  }

  return {
    reseeded: false,
    meta: existingMeta,
    usage: getStorageUsage(),
  };
}

/**
 * Explicitly wipe and reseed the prototype storage.
 * Used by Settings and prototype demo reset controls.
 */
export async function forceReseed(): Promise<BootResult> {
  return ensureSeeded({ force: true });
}
