'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input, Button, StatusBadge } from '@/components/ui';
import { DEMO_ACCOUNTS, DemoAccount, getRoleDashboardRoute } from '@/lib/auth/auth';
import { useSession } from '@/components/providers/SessionProvider';
import { useBranding } from '@/components/providers/BrandingProvider';
import { Logo } from '@/components/shell/Logo';
import { NavIcon } from '@/components/shell/NavIcon';

const HERO_HIGHLIGHTS: { iconName: string; title: string; description: string }[] = [
  {
    iconName: 'building',
    title: 'Multi-campus network',
    description: 'One login, every campus — students, faculty, and finances in one place.',
  },
  {
    iconName: 'clipboard-check',
    title: 'Live attendance & results',
    description: 'Daily registers, exam marks, and report cards, always up to date.',
  },
  {
    iconName: 'bell',
    title: 'Parents kept in the loop',
    description: 'Announcements and updates reach families the moment they publish.',
  },
];

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
    <main className="h-screen overflow-hidden bg-canvas text-ink-900 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      {/* Left: brand hero panel (desktop only) */}
      <div className="hidden lg:flex relative flex-col overflow-hidden p-10 text-white h-screen"
        style={{ backgroundImage: 'url(/bg-image2.jpeg)', backgroundSize: 'cover', backgroundPosition: 'center 30%' }}>

        {/* Diagonal backdrop-blur — strong at bottom-left, fades to nothing at top-right */}
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden
          style={{
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            maskImage: 'linear-gradient(to top right, black 0%, black 25%, rgba(0,0,0,0.5) 50%, transparent 75%)',
            WebkitMaskImage: 'linear-gradient(to top right, black 0%, black 25%, rgba(0,0,0,0.5) 50%, transparent 75%)',
          }} />

        {/* Diagonal dark overlay — same direction, gives text contrast */}
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden
          style={{ background: 'linear-gradient(to top right, rgba(8,4,1,0.80) 0%, rgba(8,4,1,0.55) 35%, rgba(8,4,1,0.15) 60%, transparent 85%)' }} />

        {/* Subtle top gradient for logo legibility */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 z-0" aria-hidden
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 100%)' }} />


        {/* Logo — top left */}
        <div className="relative z-10 flex items-center gap-3">
          <Logo size="lg" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-white/70">Phase 0 Prototype</p>
            <h1 className="text-xl font-semibold">{schoolName}</h1>
          </div>
        </div>

        {/* Main content — pushed to bottom with mt-auto */}
        <div className="relative z-10 mt-auto space-y-6 max-w-md pb-10">
          <div>
            <h2 className="text-3xl font-semibold leading-tight">
              Everything your school runs on, in one portal.
            </h2>
            <p className="mt-3 text-white/80 text-body-custom">
              Institutional management for campuses, classrooms, and families — built for the people who run them.
            </p>
          </div>

          <ul className="space-y-5">
            {HERO_HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-brand-600">
                  <NavIcon name={item.iconName} className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white">{item.title}</p>
                  <p className="text-white/75 text-secondary-meta mt-0.5">{item.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer — bottom right */}
        <p className="absolute bottom-10 right-10 z-10 text-white/60 text-secondary-meta text-right">
          Institutional record system prototype · offline-first
        </p>
      </div>

      {/* Right: open sign-in area (no boxed card — full-width, breathing room) */}
      <div className="login-scroll relative flex flex-col items-center justify-center p-5 sm:p-8 lg:p-14 overflow-y-auto h-full">
        {/* Ambient accents (mobile / narrow layouts) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden lg:hidden" aria-hidden>
          <div className="absolute -top-32 -left-24 h-72 w-72 rounded-full bg-brand-700/10 blur-3xl" />
          <div className="absolute -bottom-32 -right-24 h-72 w-72 rounded-full bg-brand-600/10 blur-3xl" />
        </div>

        <div className="relative w-full max-w-2xl space-y-7">
          {/* Brand lockup (mobile only — desktop shows the hero panel instead) */}
          <div className="flex flex-col items-center text-center gap-2 lg:hidden">
            <Logo size="lg" />
            <h1 className="text-page-title text-ink-900">{schoolName}</h1>
            <p className="text-secondary-meta text-ink-500">Institutional management portal</p>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-page-title text-ink-900">Sign In</h2>
              <p className="text-secondary-meta text-ink-600 mt-1">
                Enter credentials or select a seeded demo role below to explore the portal.
              </p>
            </div>
            <span className="hidden sm:inline-flex shrink-0 items-center rounded-control bg-brand-100 px-2.5 py-1 text-secondary-meta font-medium text-brand-700">
              Phase 0 Prototype
            </span>
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
          <form onSubmit={handleSubmit} className="space-y-4 sm:flex sm:items-end sm:gap-3 sm:space-y-0">
            <div className="sm:flex-1">
              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. admin@abcschool.pk"
                required
                autoComplete="email"
              />
            </div>

            <div className="sm:flex-1">
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isLoading}
              className="w-full sm:w-auto shrink-0"
            >
              Sign In
            </Button>
          </form>

          {/* Demo Accounts Panel */}
          <div className="pt-6 border-t border-rule space-y-3">
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
                  className="p-3 text-left rounded-card bg-surface border border-rule hover:border-brand-600/50 hover:bg-brand-100/20 transition-all cursor-pointer group flex flex-col justify-between"
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
      </div>
    </main>
  );
}
