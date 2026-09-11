'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ID, Role, Session, User } from '@/types';
import { getSession, setSession } from '@/lib/repositories/session';
import { getUser } from '@/lib/repositories/users';
import { signIn as authSignIn, signOut as authSignOut, SignInResult } from '@/lib/auth/auth';
import { useToast } from '@/components/ui/Toast';

export interface SessionContextValue {
  session: Session | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  role: Role | null;
  activeCampusId: ID | null;
  activeChildId: ID | null;
  login: (email: string, password?: string) => Promise<SignInResult>;
  logout: () => Promise<void>;
  switchCampus: (campusId: ID) => Promise<void>;
  switchChild: (childId: ID) => Promise<void>;
  refreshSession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { showToast } = useToast();

  const [session, setSessionState] = useState<Session | null>(null);
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate session from localStorage on initial mount
  useEffect(() => {
    let active = true;

    getSession()
      .then(async (storedSession) => {
        if (!active) return;
        if (storedSession) {
          const userRecord = await getUser(storedSession.userId);
          if (!active) return;
          setSessionState(storedSession);
          setUserState(userRecord);
        } else {
          setSessionState(null);
          setUserState(null);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        console.warn('[SessionProvider] Error hydrating session:', err);
        setSessionState(null);
        setUserState(null);
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const storedSession = await getSession();
      if (storedSession) {
        setSessionState(storedSession);
        const userRecord = await getUser(storedSession.userId);
        setUserState(userRecord);
      } else {
        setSessionState(null);
        setUserState(null);
      }
    } catch (err) {
      console.warn('[SessionProvider] Error refreshing session:', err);
    }
  }, []);

  const login = useCallback(
    async (email: string, password?: string): Promise<SignInResult> => {
      const result = await authSignIn(email, password);
      if (result.success && result.session) {
        setSessionState(result.session);
        const userRecord = await getUser(result.session.userId);
        setUserState(userRecord);

        showToast({
          type: 'success',
          title: 'Signed in successfully',
          message: `Welcome back, ${userRecord?.name ?? 'User'}!`,
        });

        if (result.redirectTo) {
          router.push(result.redirectTo);
        }
      }
      return result;
    },
    [router, showToast]
  );

  const logout = useCallback(async () => {
    await authSignOut();
    setSessionState(null);
    setUserState(null);

    showToast({
      type: 'info',
      title: 'Signed out',
      message: 'You have been safely signed out of the session.',
    });

    router.push('/login');
  }, [router, showToast]);

  const switchCampus = useCallback(
    async (campusId: ID) => {
      if (!session) return;
      const updated: Session = { ...session, campusId };
      await setSession(updated);
      setSessionState(updated);
    },
    [session]
  );

  const switchChild = useCallback(
    async (childId: ID) => {
      if (!session) return;
      const updated: Session = { ...session, activeChildId: childId };
      await setSession(updated);
      setSessionState(updated);
    },
    [session]
  );

  const value: SessionContextValue = {
    session,
    user,
    isAuthenticated: session !== null,
    isLoading,
    role: session?.role ?? null,
    activeCampusId: session?.campusId ?? null,
    activeChildId: session?.activeChildId ?? null,
    login,
    logout,
    switchCampus,
    switchChild,
    refreshSession,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

export function useOptionalSession(): SessionContextValue | null {
  return useContext(SessionContext);
}
