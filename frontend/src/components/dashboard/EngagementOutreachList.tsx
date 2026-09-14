'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  OutreachCallRecord,
  ParentOutreachPromptItem,
} from '@/lib/repositories/parentOutreach';
import { Button } from '@/components/ui/Button';
import { NavIcon } from '@/components/shell/NavIcon';
import { LogOutreachCallModal } from './LogOutreachCallModal';

export interface EngagementOutreachListProps {
  initialItems: ParentOutreachPromptItem[];
}

export function EngagementOutreachList({ initialItems }: EngagementOutreachListProps) {
  const [items, setItems] = useState<ParentOutreachPromptItem[]>(initialItems);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'needs_call' | 'contacted'>('all');
  const [selectedPrompt, setSelectedPrompt] = useState<ParentOutreachPromptItem | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  // Filter items
  const filtered = items.filter((item) => {
    // Search query matches family title, parent user name, student name, or phone
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const matchFamily = item.familyTitle.toLowerCase().includes(q);
      const matchParent = item.parentUser.name.toLowerCase().includes(q);
      const matchPhone = item.primaryPhone.toLowerCase().includes(q);
      const matchChildren = item.children.some((c) =>
        c.name.toLowerCase().includes(q) || c.className.toLowerCase().includes(q)
      );
      if (!matchFamily && !matchParent && !matchPhone && !matchChildren) return false;
    }

    if (activeFilter === 'needs_call') {
      return !item.lastCallRecord || item.daysSinceLastActivity >= 14;
    }
    if (activeFilter === 'contacted') {
      return Boolean(item.lastCallRecord);
    }
    return true;
  });

  const handleCallSuccess = (newCall: OutreachCallRecord) => {
    setItems((prev) =>
      prev.map((it) =>
        it.parentId === newCall.parentId
          ? {
              ...it,
              lastCallRecord: newCall,
            }
          : it
      )
    );
    setFeedbackMsg(`✓ Outreach call logged successfully for ${newCall.familyTitle}.`);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const totalFamilies = items.length;
  const needFollowUpCount = items.filter(
    (i) => !i.lastCallRecord || i.daysSinceLastActivity >= 14
  ).length;
  const contactedCount = items.filter((i) => Boolean(i.lastCallRecord)).length;

  return (
    <div className="space-y-6">
      {/* 1. Header & Operational Context */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 border border-purple-200 px-2.5 py-0.5 rounded-full">
                Differentiation Screen 3
              </span>
              <span className="text-xs text-neutral-500 font-medium">
                Admin-Facing Parent Engagement Prompt List
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-neutral-900">
              Parent Engagement &amp; Outreach
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Prompt list identifying families with unread communications or inactivity. Sorted by days since last interaction.
            </p>
          </div>

          {/* Quick Metrics (Operational counters, strictly no scores) */}
          <div className="flex items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-neutral-50 border border-neutral-200 text-center">
              <span className="text-[10px] text-neutral-500 uppercase font-bold block">Total Families</span>
              <span className="text-base font-black text-neutral-900 font-mono">{totalFamilies}</span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-amber-50 border border-amber-200 text-center">
              <span className="text-[10px] text-amber-700 uppercase font-bold block">Action Prompts</span>
              <span className="text-base font-black text-amber-800 font-mono">{needFollowUpCount}</span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
              <span className="text-[10px] text-emerald-700 uppercase font-bold block">Contacted</span>
              <span className="text-base font-black text-emerald-800 font-mono">{contactedCount}</span>
            </div>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold animate-in fade-in">
            {feedbackMsg}
          </div>
        )}
      </div>

      {/* 2. Educational & Humane Design Invariant Banner */}
      <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50/70 via-indigo-50/40 to-white p-4.5 shadow-2xs">
        <div className="flex items-start gap-3">
          <span className="text-xl mt-0.5">ℹ️</span>
          <div className="text-xs text-purple-950 space-y-1">
            <h4 className="font-bold text-neutral-900">
              Human-Centred Operational Prompt List (No Parent Score)
            </h4>
            <p className="text-neutral-600 leading-relaxed">
              Per <strong>FEATURE_SPECIFICATIONS.md §15</strong> and <strong>PRODUCT_REQUIREMENTS.md §5</strong>, this screen deliberately does <em>not</em> calculate or display an engagement score, percentage, or ranked comparison. Digital activity correlates with working hours, device sharing, and connectivity; a score punishes underprivileged families. Instead, this list flags practical communication gaps so the school can reach out proactively.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search family name, student, or phone..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-neutral-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500 bg-neutral-50/50"
          />
          <NavIcon name="search" className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-500" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-neutral-500 hover:text-neutral-700"
              aria-label="Clear search"
            >
              <NavIcon name="x" className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-100 rounded-xl border border-neutral-200">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === 'all'
                ? 'bg-white text-purple-700 shadow-xs border border-neutral-200'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            All Families ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('needs_call')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === 'needs_call'
                ? 'bg-white text-amber-700 shadow-xs border border-neutral-200'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Needs Outreach ({needFollowUpCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('contacted')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === 'contacted'
                ? 'bg-white text-emerald-700 shadow-xs border border-neutral-200'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Logged Calls ({contactedCount})
          </button>
        </div>
      </div>

      {/* 4. Outreach Prompts List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-neutral-500 bg-white rounded-2xl border border-dashed border-neutral-200">
            <NavIcon name="phone" className="w-8 h-8 mx-auto mb-2" />
            <p className="text-sm font-semibold text-neutral-700">No outreach prompts found</p>
            <p className="text-xs text-neutral-500 mt-1">
              {searchQuery
                ? `No families matching "${searchQuery}".`
                : 'All families are actively communicating or up to date.'}
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <div
              key={item.parentId}
              className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs hover:border-purple-300 transition-all space-y-4"
            >
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Family & Student Information */}
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-bold text-neutral-900">
                      {item.familyTitle}
                    </h3>
                    <span className="text-xs text-neutral-500">•</span>
                    <span className="text-xs text-neutral-600 font-medium">
                      Primary Contact: <strong>{item.parentUser.name}</strong>
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-md font-mono bg-neutral-100 text-neutral-600 border border-neutral-200">
                      {item.primaryPhone}
                    </span>
                  </div>

                  {/* Children Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    <span className="text-[11px] font-semibold text-neutral-500">Children:</span>
                    {item.children.length === 0 ? (
                      <span className="text-[11px] text-neutral-500 italic">No linked enrolled records</span>
                    ) : (
                      item.children.map((child) => (
                        <span
                          key={child.studentId}
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/60 font-medium"
                        >
                          <span>{child.name}</span>
                          <span className="text-purple-400">({child.className})</span>
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Inactivity & Notice Gap Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-xl font-bold ${
                      item.daysSinceLastActivity >= 20
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : item.daysSinceLastActivity >= 10
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    {item.daysSinceLastActivity} days inactive
                  </span>

                  <span className="text-xs px-2.5 py-1 rounded-xl font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    {item.unreadNoticesCount} unread notices
                  </span>
                </div>
              </div>

              {/* Specific Prompt Description & Call Log Trigger */}
              <div className="pt-3 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                {/* Prompt Reason Quote */}
                <div className="flex items-center gap-2 text-neutral-700 font-medium">
                  <NavIcon name="message-circle" className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="italic bg-neutral-50 px-3 py-1.5 rounded-xl border border-neutral-200/60">
                    &ldquo;{item.promptReason}&rdquo;
                  </span>
                </div>

                {/* Action Buttons: Log a Call & Quick WhatsApp */}
                <div className="flex items-center gap-2">
                  <Link
                    href="/demo/whatsapp"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold transition-colors"
                  >
                    <NavIcon name="message-circle" className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </Link>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setSelectedPrompt(item)}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
                    leftIcon={<NavIcon name="phone" className="w-3.5 h-3.5" />}
                  >
                    Log a call
                  </Button>
                </div>
              </div>

              {/* Previous Call Log (if any) */}
              {item.lastCallRecord && (
                <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-200/60 text-xs text-neutral-700 space-y-1">
                  <div className="flex items-center justify-between font-semibold text-emerald-900">
                    <span className="flex items-center gap-1.5">
                      <span>✓ Previous Call:</span>
                      <span className="capitalize">
                        {item.lastCallRecord.outcome.replace(/_/g, ' ')}
                      </span>
                      <span>•</span>
                      <span className="text-neutral-500 font-normal">
                        {new Date(item.lastCallRecord.calledAt).toLocaleString()}
                      </span>
                    </span>
                    <span className="text-[11px] text-neutral-500">
                      by {item.lastCallRecord.loggedByName}
                    </span>
                  </div>
                  <p className="text-neutral-600 italic pl-3 border-l-2 border-emerald-300">
                    &ldquo;{item.lastCallRecord.notes}&rdquo;
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* 5. Log Outreach Call Modal */}
      {selectedPrompt && (
        <LogOutreachCallModal
          isOpen={Boolean(selectedPrompt)}
          onClose={() => setSelectedPrompt(null)}
          promptItem={selectedPrompt}
          onSuccess={handleCallSuccess}
        />
      )}
    </div>
  );
}
