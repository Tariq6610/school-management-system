'use client';

import React, { useState, useMemo } from 'react';
import { ID, MessageThreadSummary } from '@/types';
import { Button } from '@/components/ui/Button';

export interface MessageListProps {
  threads: MessageThreadSummary[];
  activeThreadId: ID | null;
  onSelectThread: (threadId: ID) => void;
  onOpenNew: () => void;
  currentUserId: ID;
  loading: boolean;
  role: 'teacher' | 'parent';
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
  if (diffHours < 24) {
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) {
    return date.toLocaleDateString('en-GB', { weekday: 'short' });
  }
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function MessageList({
  threads,
  activeThreadId,
  onSelectThread,
  onOpenNew,
  currentUserId,
  loading,
  role,
}: MessageListProps) {
  const [search, setSearch] = useState('');

  const filteredThreads = useMemo(() => {
    if (!search.trim()) return threads;
    const q = search.toLowerCase();
    return threads.filter((t) => {
      const matchName = t.otherUser.name.toLowerCase().includes(q);
      const matchLastMsg = t.lastMessage.body.toLowerCase().includes(q);
      const matchStudent = t.studentContext?.studentName
        ? t.studentContext.studentName.toLowerCase().includes(q)
        : false;
      const matchClass = t.studentContext?.className
        ? t.studentContext.className.toLowerCase().includes(q)
        : false;
      return matchName || matchLastMsg || matchStudent || matchClass;
    });
  }, [threads, search]);

  return (
    <div className="flex flex-col h-full bg-white border-r border-neutral-200/80">
      {/* List Header */}
      <div className="p-4 border-b border-neutral-100 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-neutral-900">Conversations</h2>
          <p className="text-xs text-neutral-500">
            {role === 'teacher' ? 'Parents of students' : 'Your child’s teachers'}
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={onOpenNew}
          className="shadow-xs shrink-0"
        >
          <span className="text-xs font-semibold">+ New</span>
        </Button>
      </div>

      {/* Search Filter */}
      <div className="p-3 border-b border-neutral-100">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter messages or contacts..."
          className="w-full px-3 py-1.5 text-xs rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all placeholder:text-neutral-400"
        />
      </div>

      {/* Thread Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
        {loading ? (
          <div className="p-8 text-center text-xs text-neutral-400">
            <div className="inline-block w-5 h-5 border-2 border-neutral-300 border-t-purple-600 rounded-full animate-spin mb-2" />
            <p>Loading conversations...</p>
          </div>
        ) : filteredThreads.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-400 space-y-2">
            <p>{search ? 'No conversations match your filter.' : 'No active conversations yet.'}</p>
            {!search && (
              <Button variant="secondary" size="sm" onClick={onOpenNew} className="text-xs">
                Start a conversation
              </Button>
            )}
          </div>
        ) : (
          filteredThreads.map((thread) => {
            const isActive = thread.threadId === activeThreadId;
            const isOutgoing = thread.lastMessage.senderId === currentUserId;
            const initials = thread.otherUser.name
              .split(' ')
              .map((n) => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();

            return (
              <button
                key={thread.threadId}
                type="button"
                onClick={() => onSelectThread(thread.threadId)}
                className={`w-full text-left p-3.5 transition-all flex items-start gap-3 relative ${
                  isActive
                    ? 'bg-purple-50/70 border-l-4 border-l-purple-600'
                    : 'hover:bg-neutral-50/80 border-l-4 border-l-transparent'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-purple-100 text-purple-800'
                  }`}
                >
                  {initials}
                </div>

                {/* Info & Snippet */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span
                      className={`text-xs font-bold truncate ${
                        isActive ? 'text-purple-950' : 'text-neutral-900'
                      }`}
                    >
                      {thread.otherUser.name}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono shrink-0">
                      {formatRelativeTime(thread.lastMessage.sentAt)}
                    </span>
                  </div>

                  {/* Student/Cohort context */}
                  {thread.studentContext && (
                    <div className="text-[11px] text-neutral-500 truncate mb-1">
                      {thread.otherUser.role === 'parent' ? 'Child: ' : 'Student: '}
                      <span className="font-semibold text-neutral-700">
                        {thread.studentContext.studentName}
                      </span>
                      {thread.studentContext.className && (
                        <span className="text-neutral-400 ml-1">
                          ({thread.studentContext.className})
                        </span>
                      )}
                    </div>
                  )}

                  {/* Last message snippet */}
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-xs truncate ${
                        thread.unreadCount > 0
                          ? 'font-semibold text-neutral-900'
                          : 'text-neutral-500'
                      }`}
                    >
                      {isOutgoing && <span className="text-neutral-400 mr-1">You:</span>}
                      {thread.lastMessage.body}
                    </p>

                    {/* Unread badge */}
                    {thread.unreadCount > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full bg-purple-600 text-white text-[10px] font-black shrink-0 shadow-2xs">
                        {thread.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
