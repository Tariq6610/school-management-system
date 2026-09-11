'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  AuditThreadSummary,
  Campus,
  ID,
  MessageAuditFilter,
  MessageAuditStats,
} from '@/types';
import { getAuditMessageThreads } from '@/lib/repositories/messages';
import { listCampuses } from '@/lib/repositories/campuses';
import { Button } from '@/components/ui/Button';

export interface MessageAuditViewProps {
  schoolId: ID;
  initialCampusId?: ID;
  isPrincipalScoped?: boolean;
}

function formatAuditTimestamp(isoString: string): string {
  if (!isoString) return '—';
  const date = new Date(isoString);
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatRelativeTime(isoString: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function MessageAuditView({
  schoolId,
  initialCampusId,
  isPrincipalScoped = false,
}: MessageAuditViewProps) {
  const [threads, setThreads] = useState<AuditThreadSummary[]>([]);
  const [stats, setStats] = useState<MessageAuditStats>({
    totalThreads: 0,
    totalMessages: 0,
    participatingTeachers: 0,
    participatingParents: 0,
  });
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [selectedCampusId, setSelectedCampusId] = useState<ID | undefined>(initialCampusId);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<'all' | '7d' | '30d'>('all');
  const [activeThreadId, setActiveThreadId] = useState<ID | null>(null);
  const [loading, setLoading] = useState(true);

  // Load campuses
  useEffect(() => {
    let isMounted = true;
    async function loadCampusesList() {
      try {
        const cmps = await listCampuses({ schoolId });
        if (isMounted) {
          setCampuses(cmps);
        }
      } catch (err) {
        console.error('[MessageAuditView] Failed to load campuses:', err);
      }
    }
    loadCampusesList();
    return () => {
      isMounted = false;
    };
  }, [schoolId]);

  // Load audit threads & stats
  useEffect(() => {
    let isMounted = true;

    async function loadAuditData() {
      try {
        setLoading(true);
        const filter: MessageAuditFilter = {
          campusId: selectedCampusId,
          search: searchQuery.trim() || undefined,
          dateRange,
        };
        const result = await getAuditMessageThreads({ schoolId }, filter);

        if (isMounted) {
          setThreads(result.threads);
          setStats(result.stats);

          // Select first thread if none active or previous selection no longer in list
          if (
            result.threads.length > 0 &&
            (!activeThreadId || !result.threads.some((t) => t.threadId === activeThreadId))
          ) {
            setActiveThreadId(result.threads[0].threadId);
          } else if (result.threads.length === 0) {
            setActiveThreadId(null);
          }
        }
      } catch (err) {
        console.error('[MessageAuditView] Error loading audit threads:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadAuditData();

    return () => {
      isMounted = false;
    };
  }, [schoolId, selectedCampusId, searchQuery, dateRange, activeThreadId]);

  const activeThread = useMemo(() => {
    if (!activeThreadId) return null;
    return threads.find((t) => t.threadId === activeThreadId) || null;
  }, [activeThreadId, threads]);

  const handlePrintAudit = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Mandatory Safeguarding Compliance Banner */}
      <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-5 shadow-2xs">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-800 flex items-center justify-center text-xl shrink-0">
            🛡️
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-amber-950">
                Student Safeguarding &amp; Compliance Audit Trail
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-200/60 text-amber-900 uppercase tracking-wide">
                Read-Only Audit Mode
              </span>
            </div>
            <p className="text-xs text-amber-800/90 leading-relaxed">
              This administrative register maintains an immutable, read-only oversight record of
              all teacher–parent communications. In accordance with student safeguarding and child
              protection mandates, all message contents, timestamps, and read receipts are
              preserved for administrative review, pastoral care, and compliance audits.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            Monitored Threads
          </span>
          <div className="text-2xl font-black text-neutral-900 mt-1 font-mono">
            {stats.totalThreads}
          </div>
          <span className="text-[10px] text-neutral-500 mt-0.5 block">
            Across selected parameters
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            Total Messages
          </span>
          <div className="text-2xl font-black text-purple-700 mt-1 font-mono">
            {stats.totalMessages}
          </div>
          <span className="text-[10px] text-neutral-500 mt-0.5 block">Logged communications</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            Active Teachers
          </span>
          <div className="text-2xl font-black text-indigo-700 mt-1 font-mono">
            {stats.participatingTeachers}
          </div>
          <span className="text-[10px] text-neutral-500 mt-0.5 block">Faculty in discussions</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            Active Parents
          </span>
          <div className="text-2xl font-black text-emerald-700 mt-1 font-mono">
            {stats.participatingParents}
          </div>
          <span className="text-[10px] text-neutral-500 mt-0.5 block">Engaged guardians</span>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search teacher, parent, student, or message body..."
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all placeholder:text-neutral-500"
            />
          </div>

          {/* Campus Selector (Only if not principal scoped) */}
          {!isPrincipalScoped && (
            <select
              value={selectedCampusId || ''}
              onChange={(e) => setSelectedCampusId(e.target.value ? e.target.value : undefined)}
              className="px-3 py-2 text-xs rounded-xl border border-neutral-300 bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
            >
              <option value="">All Campuses</option>
              {campuses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          {/* Date Range Tabs */}
          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setDateRange('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                dateRange === 'all'
                  ? 'bg-white text-neutral-900 shadow-2xs font-bold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => setDateRange('30d')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                dateRange === '30d'
                  ? 'bg-white text-neutral-900 shadow-2xs font-bold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Past 30 Days
            </button>
            <button
              type="button"
              onClick={() => setDateRange('7d')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                dateRange === '7d'
                  ? 'bg-white text-neutral-900 shadow-2xs font-bold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Past 7 Days
            </button>
          </div>
        </div>

        {/* Print / Export Button */}
        <Button
          variant="secondary"
          size="sm"
          onClick={handlePrintAudit}
          disabled={!activeThread}
          className="shadow-2xs text-xs"
        >
          <span>🖨️ Print Audit Record</span>
        </Button>
      </div>

      {/* 4. Master-Detail Layout */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-2xs overflow-hidden h-[620px] flex flex-col lg:flex-row">
        {/* Left Pane: Thread List */}
        <div className="w-full lg:w-88 xl:w-96 shrink-0 h-full border-r border-neutral-200/80 flex flex-col bg-neutral-50/40">
          <div className="p-3.5 border-b border-neutral-200/80 bg-white flex items-center justify-between">
            <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
              Audit Threads ({threads.length})
            </h3>
            <span className="text-[10px] text-neutral-500">Newest activity first</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
            {loading ? (
              <div className="p-8 text-center text-xs text-neutral-500">
                <div className="inline-block w-5 h-5 border-2 border-neutral-300 border-t-purple-600 rounded-full animate-spin mb-2" />
                <p>Loading audit index...</p>
              </div>
            ) : threads.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500">
                No threads match the selected audit criteria.
              </div>
            ) : (
              threads.map((t) => {
                const isSelected = t.threadId === activeThreadId;
                return (
                  <button
                    key={t.threadId}
                    type="button"
                    onClick={() => setActiveThreadId(t.threadId)}
                    className={`w-full text-left p-4 transition-all flex flex-col gap-2 ${
                      isSelected
                        ? 'bg-purple-50/80 border-l-4 border-l-purple-600'
                        : 'hover:bg-white border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-900 truncate">
                          <span>{t.teacherUser.name}</span>
                          <span className="text-neutral-500 font-normal">↔</span>
                          <span>{t.parentUser.name}</span>
                        </div>
                        {t.studentName && (
                          <div className="text-[11px] text-neutral-500 truncate mt-0.5">
                            Student:{' '}
                            <strong className="text-neutral-700 font-medium">
                              {t.studentName}
                            </strong>
                            {t.className && (
                              <span className="text-neutral-500 ml-1">({t.className})</span>
                            )}
                          </div>
                        )}
                      </div>

                      <span className="text-[10px] text-neutral-500 font-mono shrink-0">
                        {formatRelativeTime(t.lastMessageAt)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <div className="flex items-center gap-1.5">
                        {t.campusName && (
                          <span className="px-1.5 py-0.5 rounded bg-neutral-200/60 text-neutral-700 text-[10px] font-medium">
                            {t.campusName}
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] font-mono font-semibold text-purple-700 bg-purple-100/70 px-1.5 py-0.5 rounded">
                        {t.messageCount} msg{t.messageCount === 1 ? '' : 's'}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Pane: Read-Only Audit Transcript */}
        <div className="flex-1 h-full min-w-0 flex flex-col bg-white">
          {!activeThread ? (
            <div className="h-full flex flex-col items-center justify-center p-8 text-neutral-500">
              <span className="text-4xl mb-2">🛡️</span>
              <p className="text-sm font-bold text-neutral-700">No thread selected</p>
              <p className="text-xs text-neutral-500 mt-1">
                Select an audit thread from the list to review the complete transcript.
              </p>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {/* Transcript Header & Watermark */}
              <div className="p-4 border-b border-neutral-200/80 bg-neutral-50/50 space-y-3 shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-neutral-500 bg-neutral-200 px-2 py-0.5 rounded">
                      ID: {activeThread.threadId}
                    </span>
                    <span className="text-xs font-bold text-neutral-900">
                      Transcript: {activeThread.teacherUser.name} &amp; {activeThread.parentUser.name}
                    </span>
                  </div>

                  <span className="text-[10px] text-neutral-500 font-medium">
                    Archived from {formatAuditTimestamp(activeThread.firstMessageAt)} to{' '}
                    {formatAuditTimestamp(activeThread.lastMessageAt)}
                  </span>
                </div>

                {/* Participant Metadata Card */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-white border border-neutral-200/80 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-500 block">
                      Teacher
                    </span>
                    <span className="font-bold text-neutral-900">
                      {activeThread.teacherUser.name}
                    </span>
                    <span className="text-[11px] text-neutral-500 block truncate">
                      {activeThread.teacherUser.email}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-500 block">
                      Parent / Guardian
                    </span>
                    <span className="font-bold text-neutral-900">
                      {activeThread.parentUser.name}
                    </span>
                    <span className="text-[11px] text-neutral-500 block truncate">
                      {activeThread.parentUser.email}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-neutral-500 block">
                      Student Context
                    </span>
                    <span className="font-bold text-neutral-900">
                      {activeThread.studentName || 'Not linked'}
                    </span>
                    <span className="text-[11px] text-neutral-500 block truncate">
                      {activeThread.className || 'General'}
                      {activeThread.studentRollNumber ? ` • Roll: ${activeThread.studentRollNumber}` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Message Transcript Stream */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-neutral-50/20">
                {activeThread.messages.map((msg, index) => {
                  const isTeacher = msg.senderId === activeThread.teacherUser.id;
                  const senderName = isTeacher
                    ? activeThread.teacherUser.name
                    : activeThread.parentUser.name;
                  const senderRole = isTeacher ? 'Teacher' : 'Parent';

                  return (
                    <div
                      key={msg.id}
                      className="p-4 rounded-xl bg-white border border-neutral-200/80 shadow-2xs space-y-2"
                    >
                      {/* Message Meta */}
                      <div className="flex items-center justify-between gap-2 border-b border-neutral-100 pb-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isTeacher ? 'bg-indigo-600' : 'bg-purple-600'
                            }`}
                          />
                          <span className="font-bold text-neutral-900">{senderName}</span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-neutral-100 text-neutral-600 capitalize">
                            {senderRole}
                          </span>
                          <span className="text-[10px] text-neutral-500 font-mono">
                            (Index #{index + 1})
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-neutral-500">
                          <span className="font-mono">{formatAuditTimestamp(msg.sentAt)}</span>
                          {msg.readAt ? (
                            <span
                              className="text-emerald-700 font-semibold"
                              title={`Read by recipient at ${formatAuditTimestamp(msg.readAt)}`}
                            >
                              ✓✓ Read: {formatAuditTimestamp(msg.readAt)}
                            </span>
                          ) : (
                            <span className="text-amber-700 font-medium">✓ Unread</span>
                          )}
                        </div>
                      </div>

                      {/* Message Content */}
                      <p className="text-xs text-neutral-800 whitespace-pre-wrap leading-relaxed">
                        {msg.body}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Transcript Footer */}
              <div className="p-3 bg-neutral-100/70 border-t border-neutral-200/80 text-center text-[11px] text-neutral-500">
                End of audited transcript • {activeThread.messages.length} total messages recorded
                under Safeguarding Policy §13
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
