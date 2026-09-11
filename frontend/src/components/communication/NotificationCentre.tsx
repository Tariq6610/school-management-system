'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { ID, Notification, NotificationType, Scope } from '@/types';
import {
  deleteNotification,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  markNotificationAsUnread,
} from '@/lib/repositories/notifications';

export interface NotificationCentreProps {
  recipientId: ID;
  schoolId: ID;
  role?: string;
  isDropdown?: boolean;
  onCloseDropdown?: () => void;
}

function formatNotificationTime(isoString: string): string {
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

interface TypeMeta {
  icon: string;
  label: string;
  bgClass: string;
  textClass: string;
}

const TYPE_METAS: Record<NotificationType, TypeMeta> = {
  attendance: {
    icon: '📅',
    label: 'Attendance',
    bgClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/60',
    textClass: 'text-emerald-700',
  },
  fee: {
    icon: '💳',
    label: 'Fees',
    bgClass: 'bg-amber-50 text-amber-700 border-amber-200/60',
    textClass: 'text-amber-700',
  },
  homework: {
    icon: '📚',
    label: 'LMS / Work',
    bgClass: 'bg-blue-50 text-blue-700 border-blue-200/60',
    textClass: 'text-blue-700',
  },
  exam: {
    icon: '🏆',
    label: 'Exams',
    bgClass: 'bg-purple-50 text-purple-700 border-purple-200/60',
    textClass: 'text-purple-700',
  },
  announcement: {
    icon: '📢',
    label: 'Notice',
    bgClass: 'bg-rose-50 text-rose-700 border-rose-200/60',
    textClass: 'text-rose-700',
  },
};

function getDeepLink(type: NotificationType, role?: string): string | null {
  if (role === 'parent') {
    switch (type) {
      case 'attendance':
        return '/parent/attendance';
      case 'fee':
        return '/parent/fees';
      case 'announcement':
        return '/parent/announcements';
      case 'exam':
        return '/parent/results';
      default:
        return '/parent/dashboard';
    }
  } else if (role === 'student') {
    switch (type) {
      case 'homework':
        return '/student/courses';
      case 'exam':
        return '/student/results';
      case 'announcement':
        return '/student/dashboard';
      default:
        return '/student/dashboard';
    }
  } else if (role === 'teacher') {
    switch (type) {
      case 'attendance':
        return '/teacher/classes';
      case 'homework':
        return '/teacher/courses';
      default:
        return '/teacher/dashboard';
    }
  }
  return null;
}

export function NotificationCentre({
  recipientId,
  schoolId,
  role,
  isDropdown = false,
  onCloseDropdown,
}: NotificationCentreProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<'all' | 'unread'>('all');
  const [selectedType, setSelectedType] = useState<NotificationType | 'all'>('all');

  const scope: Scope = useMemo(() => ({ schoolId }), [schoolId]);

  useEffect(() => {
    let isMounted = true;
    async function fetchNotifications() {
      try {
        const items = await listNotifications(scope, recipientId);
        if (isMounted) {
          setNotifications(items);
        }
      } catch (err) {
        console.error('[NotificationCentre] Error loading notifications:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    fetchNotifications();
    return () => {
      isMounted = false;
    };
  }, [scope, recipientId]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.readAt).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (filterMode === 'unread' && n.readAt) return false;
      if (selectedType !== 'all' && n.type !== selectedType) return false;
      return true;
    });
  }, [notifications, filterMode, selectedType]);

  const handleToggleRead = async (notification: Notification) => {
    try {
      if (notification.readAt) {
        const updated = await markNotificationAsUnread(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? updated : n))
        );
      } else {
        const updated = await markNotificationAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? updated : n))
        );
      }
    } catch (err) {
      console.error('[NotificationCentre] Error toggling read state:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead(scope, recipientId);
      const now = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((n) => (!n.readAt ? { ...n, readAt: now } : n))
      );
    } catch (err) {
      console.error('[NotificationCentre] Error marking all as read:', err);
    }
  };

  const handleDelete = async (id: ID) => {
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('[NotificationCentre] Error deleting notification:', err);
    }
  };

  return (
    <div
      className={`flex flex-col bg-white ${
        isDropdown
          ? 'w-88 sm:w-96 max-h-[540px] rounded-2xl border border-neutral-200/90 shadow-xl overflow-hidden'
          : 'w-full rounded-2xl border border-neutral-200/80 shadow-2xs'
      }`}
    >
      {/* 1. Header with Stats and Mark All Read */}
      <div className="p-3.5 border-b border-neutral-100 flex items-center justify-between gap-2 bg-neutral-50/50 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-base">🔔</span>
          <h3 className="text-sm font-bold text-neutral-900">Notifications</h3>
          {unreadCount > 0 ? (
            <span className="px-2 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-black tracking-tight">
              {unreadCount} new
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-full bg-neutral-200 text-neutral-600 text-[10px] font-medium">
              All caught up
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 transition-colors"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* 2. Filter Controls (Read/Unread Toggle & Category Chips) */}
      <div className="p-2.5 border-b border-neutral-100 bg-white space-y-2 shrink-0">
        {/* Read vs Unread toggle */}
        <div className="flex items-center gap-1 bg-neutral-100/80 p-1 rounded-xl text-xs">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`flex-1 py-1 rounded-lg font-medium transition-all ${
              filterMode === 'all'
                ? 'bg-white text-neutral-900 shadow-2xs font-bold'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('unread')}
            className={`flex-1 py-1 rounded-lg font-medium transition-all ${
              filterMode === 'unread'
                ? 'bg-white text-neutral-900 shadow-2xs font-bold'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            Unread ({unreadCount})
          </button>
        </div>

        {/* Category filter chips */}
        <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[11px] no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedType('all')}
            className={`px-2 py-0.5 rounded-lg border font-medium shrink-0 transition-colors ${
              selectedType === 'all'
                ? 'bg-neutral-800 text-white border-neutral-800'
                : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
            }`}
          >
            All Types
          </button>

          {(['attendance', 'fee', 'homework', 'exam', 'announcement'] as NotificationType[]).map(
            (type) => {
              const meta = TYPE_METAS[type];
              const isSel = selectedType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSelectedType(type)}
                  className={`px-2 py-0.5 rounded-lg border font-medium shrink-0 transition-colors flex items-center gap-1 ${
                    isSel
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  <span>{meta.icon}</span>
                  <span>{meta.label}</span>
                </button>
              );
            }
          )}
        </div>
      </div>

      {/* 3. Notification List Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 min-h-[160px]">
        {loading ? (
          <div className="p-8 text-center text-xs text-neutral-400">
            <div className="inline-block w-5 h-5 border-2 border-neutral-300 border-t-purple-600 rounded-full animate-spin mb-2" />
            <p>Loading notification feed...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-400 space-y-1">
            <span className="text-2xl block mb-1">✨</span>
            <p className="font-semibold text-neutral-700">No notifications found</p>
            <p className="text-[11px] text-neutral-400">
              {filterMode === 'unread'
                ? 'You have zero unread alerts. All caught up!'
                : 'No notices matching the selected filter criteria.'}
            </p>
          </div>
        ) : (
          filteredNotifications.map((n) => {
            const meta = TYPE_METAS[n.type] || {
              icon: '📌',
              label: 'Notice',
              bgClass: 'bg-neutral-100 text-neutral-700 border-neutral-200',
              textClass: 'text-neutral-700',
            };
            const isUnread = !n.readAt;
            const deepLink = getDeepLink(n.type, role);

            return (
              <div
                key={n.id}
                className={`p-3.5 transition-colors flex items-start gap-3 relative group ${
                  isUnread ? 'bg-purple-50/40' : 'hover:bg-neutral-50/70'
                }`}
              >
                {/* Unread indicator dot */}
                {isUnread && (
                  <span
                    className="w-2 h-2 rounded-full bg-purple-600 shrink-0 mt-1.5 shadow-xs"
                    title="Unread notification"
                  />
                )}

                {/* Category Icon Badge */}
                <div
                  className={`w-8 h-8 rounded-xl border flex items-center justify-center text-sm shrink-0 shadow-2xs ${meta.bgClass}`}
                >
                  {meta.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1.5 mb-0.5">
                    <h4
                      className={`text-xs leading-snug break-words ${
                        isUnread ? 'font-bold text-neutral-900' : 'font-medium text-neutral-700'
                      }`}
                    >
                      {n.title}
                    </h4>

                    <span className="text-[10px] text-neutral-400 font-mono shrink-0">
                      {formatNotificationTime(n.createdAt)}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-600 leading-relaxed break-words mb-2">
                    {n.body}
                  </p>

                  {/* Actions & Links */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                    <div className="flex items-center gap-2">
                      {/* Deep Link if applicable */}
                      {deepLink && (
                        <Link
                          href={deepLink}
                          onClick={onCloseDropdown}
                          className="text-[11px] font-semibold text-purple-700 hover:text-purple-900 transition-colors"
                        >
                          View Details →
                        </Link>
                      )}

                      {/* Toggle Read/Unread */}
                      <button
                        type="button"
                        onClick={() => handleToggleRead(n)}
                        className="text-[11px] text-neutral-500 hover:text-neutral-900 font-medium transition-colors"
                      >
                        {isUnread ? 'Mark read' : 'Mark unread'}
                      </button>
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleDelete(n.id)}
                      className="text-[10px] text-neutral-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Dismiss notification"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. Footer */}
      {isDropdown && (
        <div className="p-2 border-t border-neutral-100 bg-neutral-50/50 text-center shrink-0">
          <Link
            href="/notifications"
            onClick={onCloseDropdown}
            className="text-xs font-semibold text-purple-700 hover:text-purple-900 block py-1"
          >
            Open Full Notification Centre →
          </Link>
        </div>
      )}
    </div>
  );
}

/**
 * TopBar Bell Trigger with unread counter badge and flyout popup.
 */
export function NotificationBellTrigger({
  recipientId,
  schoolId,
  role,
}: {
  recipientId: ID;
  schoolId: ID;
  role?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const scope: Scope = useMemo(() => ({ schoolId }), [schoolId]);

  // Initial and recurring unread count check
  useEffect(() => {
    let isMounted = true;
    async function checkUnread() {
      try {
        const notes = await listNotifications(scope, recipientId);
        if (isMounted) {
          setUnreadCount(notes.filter((n) => !n.readAt).length);
        }
      } catch (err) {
        console.error('[NotificationBellTrigger] Failed to check unread count:', err);
      }
    }

    checkUnread();
    const interval = setInterval(checkUnread, 15000); // Check every 15s

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [scope, recipientId]);

  // Outside click dismiss
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Open notifications"
        aria-expanded={isOpen}
        className="relative p-1.5 text-neutral-600 hover:text-neutral-900 rounded-xl hover:bg-neutral-100 transition-colors"
      >
        <span className="text-lg">🔔</span>

        {/* Dynamic Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center shadow-xs animate-in zoom-in">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 z-50 animate-in fade-in slide-in-from-top-1">
          <NotificationCentre
            recipientId={recipientId}
            schoolId={schoolId}
            role={role}
            isDropdown={true}
            onCloseDropdown={() => setIsOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
