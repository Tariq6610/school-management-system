'use client';

import React from 'react';
import Link from 'next/link';
import { RouteGuard } from '@/components/auth/RouteGuard';
import { AppShell } from '@/components/shell/AppShell';

export default function AdminReportsPage() {
  return (
    <RouteGuard allowedRoles={['school_admin', 'super_admin']}>
      <AppShell pageTitle="Reports Pack">
        <div className="max-w-7xl space-y-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-ink-900">Reports Pack</h1>
            <p className="mt-1 text-secondary-meta text-ink-600">
              Access standard institutional reports across attendance, fees, and academics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Attendance Reports */}
            <Link
              href="/admin/attendance/reports"
              className="block group rounded-card border border-rule bg-surface p-6 shadow-xs transition-all hover:border-brand-300 hover:shadow-sm"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-100 mb-4">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.35 3.836c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m8.9-4.414c.376.023.75.05 1.124.08 1.131.094 1.976 1.057 1.976 2.192V16.5A2.25 2.25 0 0118 18.75h-2.25m-7.5-10.5H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V18.75m-7.5-10.5h6.375c.621 0 1.125.504 1.125 1.125v9.375m-8.25-3h5.25m-5.25 3h5.25" />
                </svg>
              </div>
              <h3 className="text-body-custom font-semibold text-ink-900 group-hover:text-brand-700">
                Attendance Reports
              </h3>
              <p className="mt-2 text-sm text-ink-600 line-clamp-2">
                Generate daily and monthly attendance reports by class or campus. Export to CSV for audit records.
              </p>
            </Link>

            {/* Fee Defaulters */}
            <Link
              href="/admin/fees/defaulters"
              className="block group rounded-card border border-rule bg-surface p-6 shadow-xs transition-all hover:border-brand-300 hover:shadow-sm"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-100 mb-4">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-body-custom font-semibold text-ink-900 group-hover:text-brand-700">
                Fee Defaulters
              </h3>
              <p className="mt-2 text-sm text-ink-600 line-clamp-2">
                Identify accounts with overdue balances. View ageing summaries and quickly initiate automated payment reminders.
              </p>
            </Link>

            {/* Report Cards */}
            <Link
              href="/admin/results/report-cards"
              className="block group rounded-card border border-rule bg-surface p-6 shadow-xs transition-all hover:border-brand-300 hover:shadow-sm"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-100 mb-4">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                </svg>
              </div>
              <h3 className="text-body-custom font-semibold text-ink-900 group-hover:text-brand-700">
                Academic Report Cards
              </h3>
              <p className="mt-2 text-sm text-ink-600 line-clamp-2">
                Generate, preview, and batch-print formal report cards for completed academic terms.
              </p>
            </Link>
          </div>
        </div>
      </AppShell>
    </RouteGuard>
  );
}
