'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input, Button, StatusBadge } from '@/components/ui';
import { DEMO_ACCOUNTS, DemoAccount, getRoleDashboardRoute } from '@/lib/auth/auth';
import { useSession } from '@/components/providers/SessionProvider';
import { useBranding } from '@/components/providers/BrandingProvider';

export default function LoginPage() {
  const router = useRouter();
  const { login, logout, isAuthenticated, user } = useSession();
  const { schoolName } = useBranding();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async (emailToUse: string, passwordToUse: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await login(emailToUse, passwordToUse);

      if (!result.success) {
        setError(result.error ?? 'Authentication failed. Please verify your credentials.');
        setIsLoading(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred during sign in.');
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSignIn(email, password);
  };

  const handleSelectDemoAccount = (acc: DemoAccount) => {
    setEmail(acc.email);
    setPassword('demo-prototype-password');
    handleSignIn(acc.email, 'demo-prototype-password');
  };

  const getRoleBadgeStatus = (role: string) => {
    switch (role) {
      case 'super_admin':
      case 'school_admin':
        return 'active';
      case 'principal':
        return 'published';
      case 'teacher':
        return 'present';
      case 'parent':
        return 'paid';
      case 'student':
        return 'submitted';
      default:
        return 'draft';
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-canvas text-ink-900">
      <div className="w-full max-w-xl space-y-6">
        {/* Card Container */}
        <div className="rounded-card bg-surface p-6 sm:p-8 border border-rule shadow-overlay space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-rule pb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-control bg-brand-700 text-surface flex items-center justify-center font-bold text-sm">
                {schoolName.substring(0, 3).toUpperCase()}
              </div>
              <span className="text-sm font-semibold text-ink-900">{schoolName}</span>
            </div>
            <span className="inline-flex items-center rounded-control bg-brand-100 px-2.5 py-1 text-secondary-meta font-medium text-brand-700">
              Phase 0 Prototype
            </span>
          </div>

          <div>
            <h1 className="text-page-title text-ink-900">Institutional Sign In</h1>
            <p className="text-secondary-meta text-ink-600 mt-1">
              Enter credentials or select a seeded demo role below to explore the portal.
            </p>
          </div>

          {/* Active Session Notice */}
          {isAuthenticated && user && (
            <div className="p-4 rounded-card bg-brand-100/50 border border-brand-700/20 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-xs font-semibold text-brand-700 uppercase tracking-wider">
                  Active Session
                </span>
                <p className="text-sm font-semibold text-ink-900 truncate">{user.name}</p>
                <p className="text-xs text-ink-600 truncate">{user.email}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => router.push(getRoleDashboardRoute(user.role))}
                >
                  Dashboard
                </Button>
                <Button variant="secondary" size="sm" onClick={() => logout()}>
                  Sign Out
                </Button>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div
              role="alert"
              className="p-3.5 rounded-control bg-absent-bg text-absent border border-absent/25 text-sm flex items-start gap-2.5"
            >
              <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. admin@abcschool.pk"
              required
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              isLoading={isLoading}
            >
              Sign In to Portal
            </Button>
          </form>

          {/* Demo Accounts Panel */}
          <div className="pt-5 border-t border-rule space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                Demo accounts
              </span>
              <span className="text-xs text-ink-400">Click to autofill & sign in</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleSelectDemoAccount(acc)}
                  disabled={isLoading}
                  className="p-3 text-left rounded-card bg-canvas border border-rule hover:border-brand-600/50 hover:bg-brand-100/20 transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-1 mb-1.5">
                    <StatusBadge
                      status={getRoleBadgeStatus(acc.role)}
                      label={acc.roleLabel}
                      size="sm"
                    />
                    {acc.campusLabel && (
                      <span className="text-[11px] text-ink-400 truncate max-w-[90px]">
                        {acc.campusLabel}
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-ink-900 group-hover:text-brand-700 transition-colors">
                      {acc.name}
                    </h4>
                    <p className="text-xs text-ink-500 font-mono truncate">{acc.email}</p>
                    <p className="text-secondary-meta text-ink-600 mt-1 line-clamp-2">
                      {acc.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Required Prototype Note per FEATURE_SPECIFICATIONS.md §1 */}
            <div className="pt-2 flex items-center gap-2 text-xs text-ink-500">
              <svg className="w-4 h-4 shrink-0 text-brand-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Prototype: passwords are not checked.</span>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center">
          <Link
            href="/"
            className="text-xs font-medium text-ink-500 hover:text-brand-700 transition-colors"
          >
            ← Return to Prototype Overview & UI Kit Showcase
          </Link>
        </div>
      </div>
    </main>
  );
}
