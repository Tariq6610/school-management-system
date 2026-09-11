'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { ensureSeeded, forceReseed } from '@/lib/seed';
import { CURRENT_SCHEMA_VERSION } from '@/lib/repositories/meta';

interface StorageUsage {
  bytes: number;
  formatted: string;
}

interface BootContextValue {
  isReady: boolean;
  isSeeding: boolean;
  schemaVersion: string;
  seededAt: string | null;
  storageUsage: StorageUsage | null;
  resetData: () => Promise<void>;
  error: string | null;
}

const BootContext = createContext<BootContextValue | undefined>(undefined);

export function BootProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isSeeding, setIsSeeding] = useState(true);
  const [schemaVersion, setSchemaVersion] = useState(CURRENT_SCHEMA_VERSION);
  const [seededAt, setSeededAt] = useState<string | null>(null);
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    ensureSeeded()
      .then((result) => {
        if (!active) return;
        setSchemaVersion(result.meta.schemaVersion);
        setSeededAt(result.meta.seededAt);
        setStorageUsage(result.usage);
        setIsReady(true);
        setIsSeeding(false);
      })
      .catch((err) => {
        if (!active) return;
        console.error('Failed to initialize seed storage:', err);
        setError(err instanceof Error ? err.message : 'Unknown storage error');
        setIsReady(true);
        setIsSeeding(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const resetData = async () => {
    setIsSeeding(true);
    setError(null);
    try {
      const result = await forceReseed();
      setSchemaVersion(result.meta.schemaVersion);
      setSeededAt(result.meta.seededAt);
      setStorageUsage(result.usage);
      setIsSeeding(false);
    } catch (err) {
      console.error('Failed to reset demo storage:', err);
      setError(err instanceof Error ? err.message : 'Unknown storage error');
      setIsSeeding(false);
    }
  };

  const contextValue: BootContextValue = {
    isReady,
    isSeeding,
    schemaVersion,
    seededAt,
    storageUsage,
    resetData,
    error,
  };

  if (!isReady) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-100 p-6 z-50">
        <div className="w-full max-w-sm flex flex-col items-center text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-xs font-semibold uppercase tracking-wider text-indigo-300">
            School Management Platform
          </div>

          <div className="relative flex items-center justify-center w-12 h-12">
            <div className="w-10 h-10 border-3 border-indigo-500/30 border-t-indigo-400 rounded-full animate-spin" />
          </div>

          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-100">
              Initializing Demo Network
            </h2>
            <p className="text-xs text-slate-400">
              Verifying schema version {CURRENT_SCHEMA_VERSION} and offline dataset...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <BootContext.Provider value={contextValue}>
      {children}
    </BootContext.Provider>
  );
}

export function useBoot(): BootContextValue {
  const context = useContext(BootContext);
  if (!context) {
    throw new Error('useBoot must be used within a BootProvider');
  }
  return context;
}
