import assert from 'node:assert';

// Mock localStorage in node environment
const store = new Map<string, string>();
const mockStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => {
    store.set(key, String(value));
  },
  removeItem: (key: string) => {
    store.delete(key);
  },
  clear: () => {
    store.clear();
  },
  get length() {
    return store.size;
  },
  key: (index: number) => Array.from(store.keys())[index] ?? null,
};

Object.defineProperty(globalThis, 'localStorage', {
  value: mockStorage,
  writable: true,
});
Object.defineProperty(globalThis, 'window', {
  value: { localStorage: mockStorage },
  writable: true,
});

// Import seed routines and repositories
import { ensureSeeded, forceReseed } from '../boot';
import { CURRENT_SCHEMA_VERSION, getMeta } from '../../repositories/meta';
import { getItem, setItem, STORAGE_KEYS, getStorageUsage } from '../../storage';
import { Meta } from '@/types';

async function runTests() {
  console.log('--- TEST 1: Initial Boot on Empty Storage ---');
  store.clear();
  assert.strictEqual(store.size, 0, 'Storage must start empty');
  
  const res1 = await ensureSeeded();
  assert.strictEqual(res1.reseeded, true, 'Initial boot must trigger seed');
  assert.strictEqual(res1.meta.schemaVersion, CURRENT_SCHEMA_VERSION, 'Schema version must match 1.0.0');
  assert.strictEqual(res1.meta.seedProfile, 'demo-network');
  assert(res1.usage.bytes > 1_000_000, 'Payload must be non-trivial (> 1MB)');
  assert(res1.usage.bytes < 2_000_000, `Payload must stay under 2MB ceiling (got ${res1.usage.bytes} bytes)`);
  console.log(`✓ Initial boot seeded ${res1.usage.formatted} (${res1.usage.bytes} bytes)`);

  console.log('--- TEST 2: Second Boot with Matching Schema (Idempotent) ---');
  const res2 = await ensureSeeded();
  assert.strictEqual(res2.reseeded, false, 'Matching schema must NOT trigger reseed');
  assert.strictEqual(res2.meta.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.strictEqual(res2.meta.seededAt, res1.meta.seededAt, 'Seed timestamp should be preserved');
  console.log('✓ Idempotent boot verified: reseeded = false, seed preserved');

  console.log('--- TEST 3: Schema Version Mismatch (e.g. 0.8.0) Triggers Wipe & Reseed ---');
  // Inject an old schema version
  const oldMeta: Meta = {
    schemaVersion: '0.8.0',
    seededAt: '2026-01-01T00:00:00.000Z',
    seedProfile: 'legacy-profile',
  };
  setItem(STORAGE_KEYS.META, oldMeta);
  // Also inject a stale key that should be wiped
  setItem('sp:v1:legacy_stale_data', { garbage: true });
  assert.notStrictEqual(getItem('sp:v1:legacy_stale_data'), null);

  const res3 = await ensureSeeded();
  assert.strictEqual(res3.reseeded, true, 'Version mismatch must trigger reseed');
  assert.strictEqual(res3.meta.schemaVersion, CURRENT_SCHEMA_VERSION, 'Schema version must be upgraded to 1.0.0');
  assert.strictEqual(getItem('sp:v1:legacy_stale_data'), null, 'Stale keys must be wiped during reseed');
  console.log('✓ Schema version mismatch wiped storage and cleanly reseeded');

  console.log('--- TEST 4: Force Reseed (Settings / Prototype Reset Button) ---');
  const res4 = await forceReseed();
  assert.strictEqual(res4.reseeded, true, 'forceReseed() must unconditionally reseed');
  assert.strictEqual(res4.meta.schemaVersion, CURRENT_SCHEMA_VERSION);
  console.log('✓ Force reseed succeeded');

  console.log('--- TEST 5: Storage Footprint Strict Under 2MB ---');
  const finalUsage = getStorageUsage();
  console.log(`Storage usage: ${finalUsage.formatted} (${finalUsage.bytes} bytes)`);
  assert(finalUsage.bytes < 2_000_000, `Storage usage must strictly be < 2MB (got ${finalUsage.bytes} bytes)`);
  console.log('✓ Storage payload strictly under 2,000,000 bytes (< 2MB)');

  console.log('--- TEST 6: Meta Repository Integration ---');
  const storedMeta = await getMeta();
  assert(storedMeta !== null, 'getMeta() must return stored metadata');
  assert.strictEqual(storedMeta.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.strictEqual(storedMeta.seedProfile, 'demo-network');
  console.log('✓ Meta repository successfully queries stored schema metadata');

  console.log('\n========================================');
  console.log('ALL 6 BOOT & RESEED TESTS PASSED! ✅');
  console.log('========================================');
}

runTests().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
