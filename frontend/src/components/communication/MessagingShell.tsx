'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  EligibleRecipient,
  ID,
  Message,
  MessageThreadSummary,
} from '@/types';
import {
  getConversationThreads,
  getEligibleRecipients,
  getThreadMessages,
  markThreadAsRead,
  sendDirectMessage,
} from '@/lib/repositories/messages';
import { MessageList } from './MessageList';
import { MessageThread } from './MessageThread';
import { NewConversationModal } from './NewConversationModal';

export interface MessagingShellProps {
  currentUserId: ID;
  role: 'teacher' | 'parent';
  schoolId: ID;
  initialThreadId?: ID;
}

export function MessagingShell({
  currentUserId,
  role,
  schoolId,
  initialThreadId,
}: MessagingShellProps) {
  const [threads, setThreads] = useState<MessageThreadSummary[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<ID | null>(initialThreadId || null);
  const [activeMessages, setActiveMessages] = useState<Message[]>([]);
  const [eligibleRecipients, setEligibleRecipients] = useState<EligibleRecipient[]>([]);

  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [showMobileThread, setShowMobileThread] = useState(Boolean(initialThreadId));

  // Temporary provisional thread for newly initiated conversations without messages yet
  const [provisionalThread, setProvisionalThread] = useState<MessageThreadSummary | null>(null);

  // 1. Load threads
  useEffect(() => {
    let isMounted = true;

    async function initThreads() {
      try {
        const list = await getConversationThreads(currentUserId, { schoolId });
        if (isMounted) {
          setThreads(list);
          if (!activeThreadId && list.length > 0) {
            setActiveThreadId(list[0].threadId);
          }
        }
      } catch (err) {
        console.error('[MessagingShell] Error loading threads:', err);
      } finally {
        if (isMounted) {
          setLoadingThreads(false);
        }
      }
    }

    initThreads();
    return () => {
      isMounted = false;
    };
  }, [currentUserId, schoolId, activeThreadId]);

  // 2. Load eligible contacts for modal
  useEffect(() => {
    let isMounted = true;

    async function initRecipients() {
      try {
        const list = await getEligibleRecipients(currentUserId, role, { schoolId });
        if (isMounted) {
          setEligibleRecipients(list);
        }
      } catch (err) {
        console.error('[MessagingShell] Error loading eligible recipients:', err);
      } finally {
        if (isMounted) {
          setLoadingRecipients(false);
        }
      }
    }

    initRecipients();
    return () => {
      isMounted = false;
    };
  }, [currentUserId, role, schoolId]);

  // 3. Load active thread messages and mark as read
  useEffect(() => {
    let isMounted = true;

    async function loadActiveMessages() {
      if (!activeThreadId) {
        setActiveMessages([]);
        return;
      }

      try {
        setLoadingMessages(true);
        const msgs = await getThreadMessages(activeThreadId);
        if (isMounted) {
          setActiveMessages(msgs);
        }

        // Mark unread messages as read
        const readCount = await markThreadAsRead(activeThreadId, currentUserId);
        if (readCount > 0 && isMounted) {
          setThreads((prev) =>
            prev.map((t) => (t.threadId === activeThreadId ? { ...t, unreadCount: 0 } : t))
          );
        }
      } catch (err) {
        console.error('[MessagingShell] Error loading thread messages:', err);
      } finally {
        if (isMounted) {
          setLoadingMessages(false);
        }
      }
    }

    loadActiveMessages();

    return () => {
      isMounted = false;
    };
  }, [activeThreadId, currentUserId]);

  // Selected thread summary
  const currentThreadSummary = useMemo(() => {
    if (!activeThreadId) return null;
    const found = threads.find((t) => t.threadId === activeThreadId);
    if (found) return found;
    if (provisionalThread && provisionalThread.threadId === activeThreadId) {
      return provisionalThread;
    }
    return null;
  }, [activeThreadId, threads, provisionalThread]);

  // 4. Handle sending a message
  const handleSendMessage = async (body: string) => {
    if (!activeThreadId || !currentThreadSummary) return;

    const recipientId = currentThreadSummary.otherUser.id;
    const sentMsg = await sendDirectMessage({
      schoolId,
      senderId: currentUserId,
      recipientId,
      body,
      threadId: activeThreadId,
    });

    // Optimistically append message
    setActiveMessages((prev) => [...prev, sentMsg]);

    // Clear provisional thread if active
    if (provisionalThread?.threadId === activeThreadId) {
      setProvisionalThread(null);
    }

    // Refresh threads in background
    const refreshed = await getConversationThreads(currentUserId, { schoolId });
    setThreads(refreshed);
  };

  // 5. Handle recipient selected from new conversation modal
  const handleSelectRecipient = (recipient: EligibleRecipient) => {
    // Check if an existing thread already exists with this user
    const existing = threads.find((t) => t.otherUser.id === recipient.userId);
    if (existing) {
      setActiveThreadId(existing.threadId);
      setShowMobileThread(true);
      return;
    }

    // Otherwise create a provisional thread
    const sorted = [currentUserId, recipient.userId].sort();
    const newThreadId = `th_${sorted[0]}_${sorted[1]}`;

    const provisional: MessageThreadSummary = {
      threadId: newThreadId,
      otherUser: recipient.user,
      lastMessage: {
        id: 'msg_temp',
        schoolId,
        threadId: newThreadId,
        senderId: currentUserId,
        recipientId: recipient.userId,
        body: 'Start conversation',
        sentAt: new Date().toISOString(),
      },
      unreadCount: 0,
      studentContext: recipient.studentName
        ? {
            studentName: recipient.studentName,
            className: recipient.className,
            subjectNames: recipient.subjectNames,
          }
        : undefined,
    };

    setProvisionalThread(provisional);
    setActiveThreadId(newThreadId);
    setActiveMessages([]);
    setShowMobileThread(true);
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-2xs overflow-hidden h-[calc(100vh-12rem)] min-h-[500px] flex">
      {/* Left Column: Thread List */}
      <div
        className={`w-full lg:w-80 xl:w-96 shrink-0 h-full ${
          showMobileThread ? 'hidden lg:block' : 'block'
        }`}
      >
        <MessageList
          threads={threads}
          activeThreadId={activeThreadId}
          onSelectThread={(id) => {
            setActiveThreadId(id);
            setShowMobileThread(true);
          }}
          onOpenNew={() => setIsNewModalOpen(true)}
          currentUserId={currentUserId}
          loading={loadingThreads}
          role={role}
        />
      </div>

      {/* Right Column: Message Thread */}
      <div
        className={`flex-1 h-full min-w-0 ${
          showMobileThread ? 'block' : 'hidden lg:block'
        }`}
      >
        <MessageThread
          thread={currentThreadSummary}
          messages={activeMessages}
          currentUserId={currentUserId}
          onSendMessage={handleSendMessage}
          onBack={() => setShowMobileThread(false)}
          loading={loadingMessages}
        />
      </div>

      {/* New Conversation Modal */}
      <NewConversationModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        recipients={eligibleRecipients}
        loading={loadingRecipients}
        onSelectRecipient={handleSelectRecipient}
        currentUserRole={role}
      />
    </div>
  );
}
